package com.kurage.api.competitive;

import com.kurage.api.competitive.CompetitiveScales.RoundReferences;
import com.kurage.api.competitive.CompetitiveScales.Side;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumMap;
import java.util.Map;

/**
 * Mede as referências do Rating a partir dos rounds que realmente aconteceram.
 *
 * <p>As referências embarcadas em {@link CompetitiveScales} definem o que conta
 * como desempenho 1.00. Elas foram escolhidas antes de existir um único round
 * do Kurage, o que significa que a escala pode estar deslocada: se os jogadores
 * daqui produzem mais do que a referência supõe, todo mundo aparece acima de
 * 1.00 e o número deixa de significar "médio".
 *
 * <p>Isso não se resolve adivinhando melhor, se resolve medindo. Este serviço
 * calcula as referências observadas e as compara com as embarcadas, para que
 * recalibrar seja um procedimento com evidência em vez de uma preocupação em
 * aberto.
 *
 * <p>Ele <strong>não altera nada</strong>. Publicar novas referências é editar
 * {@link CompetitiveScales} e subir a versão do algoritmo, uma decisão
 * deliberada — trocar os números por baixo invalidaria silenciosamente todo
 * Rating já calculado.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReferenceCalibrationService {

    /**
     * Rounds por lado abaixo dos quais o relatório não publica número.
     *
     * <p>Uma média sobre poucos rounds é tão arbitrária quanto o chute que ela
     * pretende substituir. Melhor dizer que a amostra é insuficiente do que
     * oferecer uma precisão que o dado não tem.
     */
    public static final int MINIMUM_ROUNDS_PER_SIDE = 2_000;

    private final JdbcTemplate jdbcTemplate;

    /** Referências observadas de um lado, com o tamanho da amostra. */
    public record Observation(
            Side side,
            long rounds,
            RoundReferences observed,
            RoundReferences shipped,
            boolean sufficientSample
    ) {
        /**
         * Quanto a referência embarcada erra, em proporção. Acima de 15% a
         * escala já está visivelmente deslocada.
         */
        public double kprDrift() {
            return shipped.kpr() == 0 ? 0 : (observed.kpr() - shipped.kpr()) / shipped.kpr();
        }
    }

    /**
     * Calcula as referências observadas por lado para um modo.
     *
     * <p>Lê apenas rounds já absorvidos por uma unidade fechada: rounds soltos
     * pertencem a um bloco em andamento e ainda podem não representar uma
     * amostra completa.
     */
    @Transactional(readOnly = true)
    public Map<Side, Observation> observe(String gameMode) {
        Map<Side, Observation> byside = new EnumMap<>(Side.class);
        for (Side side : Side.values()) {
            byside.put(side, observeSide(gameMode, side));
        }
        return byside;
    }

    private Observation observeSide(String gameMode, Side side) {
        String sql = """
                SELECT COUNT(*)                                             AS rounds,
                       COALESCE(AVG(p.kills), 0)                            AS kpr,
                       COALESCE(AVG(p.damage), 0)                           AS adr,
                       COALESCE(AVG(CASE WHEN p.kills > 0 OR p.assists > 0
                                          OR p.survived OR p.was_traded
                                         THEN 1.0 ELSE 0.0 END), 0)         AS kast,
                       COALESCE(AVG(CASE WHEN p.survived THEN 1.0 ELSE 0.0 END), 0) AS spr,
                       COALESCE(AVG(CASE WHEN p.kills >= 2 THEN 1.0 ELSE 0.0 END), 0) AS mk
                FROM round_participations p
                JOIN round_events e ON e.id = p.round_event_id
                WHERE e.game_mode = ?
                  AND p.side = ?
                  AND p.block_id IS NOT NULL
                """;

        return jdbcTemplate.query(sql, rs -> {
            if (!rs.next()) {
                return empty(side);
            }
            long rounds = rs.getLong("rounds");
            RoundReferences observed = new RoundReferences(
                    rs.getDouble("kpr"),
                    rs.getDouble("adr"),
                    rs.getDouble("kast"),
                    rs.getDouble("spr"),
                    rs.getDouble("mk"));
            return new Observation(
                    side,
                    rounds,
                    observed,
                    CompetitiveScales.referencesFor(
                            com.kurage.api.domain.GameMode.valueOf(gameMode), side),
                    rounds >= MINIMUM_ROUNDS_PER_SIDE);
        }, gameMode, side.name());
    }

    private Observation empty(Side side) {
        return new Observation(
                side, 0, new RoundReferences(0, 0, 0, 0, 0),
                CompetitiveScales.referencesFor(
                        com.kurage.api.domain.GameMode.RETAKE, side),
                false);
    }

    /**
     * Relatório legível do estado da calibração.
     *
     * <p>Serve para responder, com evidência, se as referências embarcadas ainda
     * descrevem o jogo que está acontecendo.
     */
    @Transactional(readOnly = true)
    public String report(String gameMode) {
        StringBuilder out = new StringBuilder();
        out.append("Calibração de referências — modo ").append(gameMode).append('\n');
        out.append("Versão embarcada: ").append(CompetitiveScales.ALGORITHM_VERSION).append('\n');
        out.append("Amostra mínima por lado: ").append(MINIMUM_ROUNDS_PER_SIDE).append(" rounds\n\n");

        observe(gameMode).forEach((side, observation) -> {
            out.append(side).append(": ").append(observation.rounds()).append(" rounds\n");
            if (!observation.sufficientSample()) {
                out.append("  amostra insuficiente — nenhum número publicado\n\n");
                return;
            }
            appendLine(out, "KPR ", observation.observed().kpr(), observation.shipped().kpr());
            appendLine(out, "ADR ", observation.observed().adr(), observation.shipped().adr());
            appendLine(out, "KAST", observation.observed().kast(), observation.shipped().kast());
            appendLine(out, "SPR ", observation.observed().spr(), observation.shipped().spr());
            appendLine(out, "MK  ", observation.observed().mk(), observation.shipped().mk());
            out.append('\n');
        });

        out.append("Este relatório não altera nada. Publicar novas referências é "
                + "editar CompetitiveScales e subir a versão do algoritmo.\n");
        return out.toString();
    }

    private static void appendLine(StringBuilder out, String label, double observed, double shipped) {
        double drift = shipped == 0 ? 0 : (observed - shipped) / shipped * 100;
        out.append(String.format("  %s observado %.3f | embarcado %.3f | desvio %+.1f%%%n",
                label, observed, shipped, drift));
    }
}
