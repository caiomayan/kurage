package com.kurage.api.competitive;

import com.kurage.api.domain.GameMode;

/**
 * Pesos, referências e constantes do modelo competitivo.
 *
 * <p>Tudo que é número de produto vive aqui, junto da versão do algoritmo, para
 * que recalibrar o modelo seja trocar esta tabela e publicar uma versão nova —
 * nunca editar valores já calculados. O documento 20 §8 exige que toda linha
 * calculada carregue a versão que a produziu.
 *
 * <p><strong>As referências são um ponto de partida, não uma medida.</strong>
 * Elas precisam ser recalibradas sobre dados reais antes da ativação pública, e
 * as de 5v5 e deathmatch só podem ser fixadas quando esses modos existirem. É
 * por isso que elas moram numa constante versionada e não numa migração.
 */
public final class CompetitiveScales {

    private CompetitiveScales() {
    }

    /**
     * Versão do algoritmo, gravada em toda unidade calculada. Muda sempre que um
     * peso, uma referência ou a forma da fórmula mudar.
     */
    public static final String ALGORITHM_VERSION = "kurage-competitive-1.0.0";

    // ---------------------------------------------------------------- Rating

    /**
     * Pesos dos modos por round: retake e 5v5. Somam exatamente 1, então o
     * desempenho de referência produz Rating 1.00 sem constante de ajuste.
     */
    public static final double W_KPR = 0.35;
    public static final double W_ADR = 0.20;
    public static final double W_KAST = 0.20;
    public static final double W_SPR = 0.15;
    public static final double W_MK = 0.10;

    /** Pesos do deathmatch, medido por minuto. Também somam 1. */
    public static final double W_DM_KPM = 0.40;
    public static final double W_DM_DMG = 0.25;
    public static final double W_DM_DPM = 0.25;
    public static final double W_DM_HS = 0.10;

    /**
     * Teto do Rating. Uma amostra pequena com desempenho atípico não pode
     * produzir um número absurdo; o encolhimento já cobre a maior parte disso, e
     * o teto fecha a borda.
     */
    public static final double RATING_CEILING = 3.0;

    /**
     * Unidades equivalentes de base no encolhimento. Com as 5 unidades mínimas
     * da calibração, o peso da amostra própria fica em 5/8.
     */
    public static final int SHRINKAGE_UNITS = 3;

    /** Tamanho da janela deslizante, em unidades, por modo. */
    public static final int ROLLING_WINDOW = 30;

    /** Referências por round, específicas de modo e lado. */
    public record RoundReferences(double kpr, double adr, double kast, double spr, double mk) {
    }

    /**
     * Retake é assimétrico: o CT retoma o bombsite sob pressão de tempo e o TR
     * ancora com a bomba plantada. O mesmo KPR significa coisas diferentes de
     * cada lado, então cada um tem sua referência.
     */
    public static final RoundReferences RETAKE_CT = new RoundReferences(0.95, 105, 0.68, 0.34, 0.15);
    public static final RoundReferences RETAKE_TR = new RoundReferences(0.75, 88, 0.72, 0.50, 0.10);

    /** 5v5 ainda não existe; estes valores serão fixados com dados do modo. */
    public static final RoundReferences FIVE_V_FIVE = new RoundReferences(0.68, 78, 0.72, 0.32, 0.10);

    /** Deathmatch, por minuto. Também provisório. */
    public static final double DM_KPM_REF = 1.60;
    public static final double DM_DAMAGE_PER_MINUTE_REF = 165;
    public static final double DM_DPM_REF = 1.30;
    public static final double DM_HEADSHOT_REF = 0.45;

    /**
     * Piso de mortes por minuto no deathmatch. O termo entra invertido, então um
     * jogador sem nenhuma morte dividiria por zero e receberia um Rating
     * infinito.
     */
    public static final double DM_MIN_DPM = 0.10;

    public static RoundReferences referencesFor(GameMode mode, Side side) {
        return switch (mode) {
            case RETAKE -> side == Side.CT ? RETAKE_CT : RETAKE_TR;
            case COMPETITIVE_5V5, FIVE_V_FIVE -> FIVE_V_FIVE;
            default -> throw new IllegalArgumentException(
                    "Modo sem referências por round: " + mode);
        };
    }

    // ------------------------------------------------------------------- ELO

    /**
     * Escala logística do ELO. Numa faixa de 0 a 1000 com níveis de 100 pontos,
     * 200 faz uma vantagem de um nível e meio valer cerca de 76% de expectativa.
     */
    public static final double ELO_SCALE = 200.0;

    public static final int ELO_FLOOR = 0;
    public static final int ELO_CEILING = 1000;

    /** K alto enquanto a amostra é pequena, para a calibração convergir rápido. */
    public static final int K_CALIBRATING = 32;
    public static final int K_ESTABLISHED = 16;

    /** Acima disso o topo estabiliza e uma sessão ruim não derruba a posição. */
    public static final int K_TOP_THRESHOLD = 700;
    public static final int K_TOP = 8;

    // ------------------------------------------------------- Peso entre modos

    /**
     * Peso de cada modo no Rating geral. O 5v5 é o modo mais completo e pesa
     * mais; o deathmatch não tem objetivo nem jogo coletivo e pesa menos.
     *
     * <p>Um modo sem amostra sai das duas somas da média ponderada, e não entra
     * como zero — é isso que permite ao especialista em retake disputar o topo
     * geral, como o documento 19 §5 exige.
     */
    public static double modeWeight(GameMode mode) {
        return switch (mode) {
            case COMPETITIVE_5V5, FIVE_V_FIVE -> 1.00;
            case RETAKE -> 0.60;
            case DEATHMATCH, DM -> 0.30;
            case PRACTICE -> 0.0;
        };
    }

    /** Rounds que fecham uma unidade válida num modo por round. */
    public static final int RETAKE_BLOCK_ROUNDS = 20;

    /** Lados de um round. */
    public enum Side {
        CT,
        TR
    }
}
