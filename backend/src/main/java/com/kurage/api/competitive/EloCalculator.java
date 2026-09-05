package com.kurage.api.competitive;

/**
 * ELO: o quanto o jogador vence.
 *
 * <p>Contraparte do {@link RatingCalculator}. Enquanto o Rating mede produção
 * individual, o ELO olha <strong>apenas para o resultado</strong> e para a força
 * de quem estava do outro lado. Ele não sabe quantos abates o jogador fez, e é
 * exatamente por isso que as duas medidas podem divergir — o documento 20 §1
 * trata essa divergência como informação, não como inconsistência.
 *
 * <p>Uma formulação serve aos três modos porque todos se reduzem ao mesmo par:
 * um score obtido entre 0 e 1 e a força média do adversário.
 *
 * <ul>
 *   <li><strong>5v5:</strong> 1 vitória, 0 derrota, 0,5 empate;</li>
 *   <li><strong>Retake:</strong> rounds vencidos dividido pelos rounds jogados
 *       no bloco;</li>
 *   <li><strong>Deathmatch:</strong> colocação normalizada na sessão.</li>
 * </ul>
 */
public final class EloCalculator {

    private EloCalculator() {
    }

    /**
     * Expectativa de score contra um adversário de determinada força.
     *
     * <p>Curva logística padrão do Elo. Com a escala de 200, uma vantagem de 200
     * pontos — um nível e meio — vale cerca de 76% de expectativa.
     */
    public static double expectedScore(int elo, double opponentElo) {
        return 1.0 / (1.0 + Math.pow(10, (opponentElo - elo) / CompetitiveScales.ELO_SCALE));
    }

    /**
     * O K de um jogador: alto durante a calibração para convergir rápido, baixo
     * depois, e mais baixo ainda no topo, onde uma sessão ruim não deve derrubar
     * a posição construída.
     */
    public static int kFactor(int elo, int unitsPlayed, int calibrationUnits) {
        if (unitsPlayed < calibrationUnits) return CompetitiveScales.K_CALIBRATING;
        if (elo >= CompetitiveScales.K_TOP_THRESHOLD) return CompetitiveScales.K_TOP;
        return CompetitiveScales.K_ESTABLISHED;
    }

    /**
     * Novo ELO após uma unidade válida.
     *
     * @param score score obtido entre 0 e 1
     * @param opponentElo força média do adversário enfrentado
     */
    public static int nextElo(int elo, double opponentElo, double score, int kFactor) {
        if (score < 0 || score > 1) {
            throw new IllegalArgumentException("score fora de [0,1]: " + score);
        }
        double expected = expectedScore(elo, opponentElo);
        long next = Math.round(elo + kFactor * (score - expected));
        return (int) Math.max(CompetitiveScales.ELO_FLOOR,
                Math.min(CompetitiveScales.ELO_CEILING, next));
    }

    /**
     * Colocação de deathmatch normalizada para um score entre 0 e 1.
     *
     * <p>O primeiro colocado faz 1, o último faz 0, e quem fica no meio faz perto
     * de 0,5 — o resultado neutro. Assim participar de uma sessão não premia nem
     * pune por si só.
     *
     * @param rank posição, sendo 1 o melhor
     * @param participants total de participantes da sessão
     */
    public static double placementScore(int rank, int participants) {
        if (participants < 2) {
            // Sem ninguém para comparar não há sucesso nem fracasso a medir.
            return 0.5;
        }
        int bounded = Math.max(1, Math.min(rank, participants));
        return (double) (participants - bounded) / (participants - 1);
    }

    /**
     * Score de um bloco por round: a fração de rounds que o lado do jogador
     * venceu enquanto ele estava jogando.
     */
    public static double roundShareScore(int roundsWon, int roundsPlayed) {
        if (roundsPlayed <= 0) {
            throw new IllegalArgumentException("um bloco precisa de rounds jogados");
        }
        return Math.max(0, Math.min(1, (double) roundsWon / roundsPlayed));
    }
}
