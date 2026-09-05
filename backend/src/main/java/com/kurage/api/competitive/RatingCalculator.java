package com.kurage.api.competitive;

import com.kurage.api.competitive.CompetitiveScales.RoundReferences;
import com.kurage.api.competitive.CompetitiveScales.Side;
import com.kurage.api.domain.GameMode;

import java.util.Map;

/**
 * Rating: o quanto o jogador contribui.
 *
 * <p>O documento 20 §1 separa as duas medidas do sistema. O ELO mede sucesso —
 * o jogador vence? O Rating mede contribuição — o quanto ele produz para o
 * resultado acontecer. São calculados de fontes diferentes justamente para que
 * possam divergir: quem carrega times que perdem tem Rating alto e ELO baixo, e
 * a leitura das duas juntas é o que informa.
 *
 * <p>Por isso este cálculo <strong>não olha para vitória</strong> em nenhum
 * momento. Ele olha para produção individual.
 *
 * <p>Duas famílias de modo: retake e 5v5 são medidos por round; deathmatch é
 * medido por minuto, porque não tem round. A normalização é a mesma nas duas —
 * cada componente dividido pela sua referência, pesos somando 1, de forma que o
 * desempenho de referência dá exatamente 1.00.
 */
public final class RatingCalculator {

    private RatingCalculator() {
    }

    /** Produção de um jogador em um lado, dentro de uma unidade por round. */
    public record SideProduction(
            int rounds,
            int kills,
            int deaths,
            int damage,
            int roundsWithKast,
            int roundsWithMultiKill
    ) {
        public SideProduction {
            if (rounds < 0) throw new IllegalArgumentException("rounds negativo");
        }

        int survived() {
            return Math.max(0, rounds - deaths);
        }
    }

    /** Produção de um jogador numa sessão de deathmatch. */
    public record DeathmatchProduction(
            int seconds,
            int kills,
            int deaths,
            int damage,
            int headshots
    ) {
    }

    /**
     * Rating de uma unidade por round, combinando os lados jogados.
     *
     * <p>A combinação é ponderada pelos rounds de cada lado, para que um jogador
     * que caiu mais vezes de um lado não seja premiado nem punido por isso.
     */
    public static double forRoundBasedUnit(GameMode mode, Map<Side, SideProduction> bySide) {
        int totalRounds = bySide.values().stream().mapToInt(SideProduction::rounds).sum();
        if (totalRounds <= 0) {
            throw new IllegalArgumentException("uma unidade precisa de pelo menos um round");
        }

        double weighted = 0;
        for (Map.Entry<Side, SideProduction> entry : bySide.entrySet()) {
            SideProduction production = entry.getValue();
            if (production.rounds() <= 0) continue;
            double sideRating = forSide(mode, entry.getKey(), production);
            weighted += sideRating * production.rounds();
        }
        return clamp(weighted / totalRounds);
    }

    private static double forSide(GameMode mode, Side side, SideProduction production) {
        RoundReferences reference = CompetitiveScales.referencesFor(mode, side);
        double rounds = production.rounds();

        double kpr = production.kills() / rounds;
        double adr = production.damage() / rounds;
        double kast = production.roundsWithKast() / rounds;
        double spr = production.survived() / rounds;
        double mk = production.roundsWithMultiKill() / rounds;

        return CompetitiveScales.W_KPR * (kpr / reference.kpr())
                + CompetitiveScales.W_ADR * (adr / reference.adr())
                + CompetitiveScales.W_KAST * (kast / reference.kast())
                + CompetitiveScales.W_SPR * (spr / reference.spr())
                + CompetitiveScales.W_MK * (mk / reference.mk());
    }

    /**
     * Rating de uma sessão de deathmatch, medido por minuto.
     *
     * <p>Mortes por minuto entram invertidas, porque morrer menos é melhor, com
     * um piso no denominador para que uma sessão sem mortes não produza um
     * número infinito.
     */
    public static double forDeathmatchSession(DeathmatchProduction production) {
        if (production.seconds() <= 0) {
            throw new IllegalArgumentException("uma sessão precisa de duração");
        }
        double minutes = production.seconds() / 60.0;

        double kpm = production.kills() / minutes;
        double damagePerMinute = production.damage() / minutes;
        double dpm = Math.max(production.deaths() / minutes, CompetitiveScales.DM_MIN_DPM);
        double headshotShare = production.kills() > 0
                ? (double) production.headshots() / production.kills()
                : 0.0;

        double rating = CompetitiveScales.W_DM_KPM * (kpm / CompetitiveScales.DM_KPM_REF)
                + CompetitiveScales.W_DM_DMG * (damagePerMinute / CompetitiveScales.DM_DAMAGE_PER_MINUTE_REF)
                + CompetitiveScales.W_DM_DPM * (CompetitiveScales.DM_DPM_REF / dpm)
                + CompetitiveScales.W_DM_HS * (headshotShare / CompetitiveScales.DM_HEADSHOT_REF);
        return clamp(rating);
    }

    /**
     * Puxa o Rating para a base enquanto a amostra é pequena.
     *
     * <p>Sem isso, uma única unidade excepcional colocaria alguém no topo. Com
     * isso, chegar ao topo exige repetir o desempenho, e não é preciso inventar
     * um corte mínimo arbitrário.
     */
    public static double shrinkTowardBaseline(double rating, int units) {
        if (units <= 0) return 1.0;
        int k = CompetitiveScales.SHRINKAGE_UNITS;
        return (units * rating + k * 1.0) / (units + k);
    }

    /**
     * Rating geral: média ponderada dos modos, por peso do modo e confiança da
     * amostra.
     *
     * <p>Um modo sem amostra sai das duas somas — ele não entra como zero. É o
     * que permite ao especialista em retake disputar o topo geral sem ser
     * obrigado a jogar todos os modos.
     *
     * @return o Rating geral, ou {@code null} quando não há nenhuma amostra
     *         válida. Ausência é um estado, não um número.
     */
    public static Double aggregate(Map<GameMode, ModeSample> samples) {
        double numerator = 0;
        double denominator = 0;
        for (Map.Entry<GameMode, ModeSample> entry : samples.entrySet()) {
            ModeSample sample = entry.getValue();
            if (sample == null || sample.units() <= 0) continue;

            double weight = CompetitiveScales.modeWeight(entry.getKey());
            if (weight <= 0) continue;

            double confidence = (double) sample.units()
                    / (sample.units() + CompetitiveScales.SHRINKAGE_UNITS);
            numerator += weight * sample.rating() * confidence;
            denominator += weight * confidence;
        }
        if (denominator <= 0) return null;
        return clamp(numerator / denominator);
    }

    /** Rating já encolhido de um modo, com o número de unidades da janela. */
    public record ModeSample(double rating, int units) {
    }

    private static double clamp(double rating) {
        if (rating < 0) return 0;
        return Math.min(rating, CompetitiveScales.RATING_CEILING);
    }
}
