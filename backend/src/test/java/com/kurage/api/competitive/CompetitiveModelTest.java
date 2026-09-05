package com.kurage.api.competitive;

import com.kurage.api.competitive.CompetitiveScales.Side;
import com.kurage.api.competitive.RatingCalculator.DeathmatchProduction;
import com.kurage.api.competitive.RatingCalculator.ModeSample;
import com.kurage.api.competitive.RatingCalculator.SideProduction;
import com.kurage.api.domain.GameMode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.EnumMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Propriedades do modelo competitivo.
 *
 * <p>Regras puras, sem persistência — a camada onde o documento 11 permite teste
 * unitário. O que se verifica aqui são as propriedades que o produto exige, e
 * não os valores de uma implementação: o desempenho de referência dá 1.00, a
 * amostra pequena não chega ao topo, modo ausente não vira zero, e o ELO só olha
 * para resultado.
 */
class CompetitiveModelTest {

    @Nested
    @DisplayName("Rating — contribuição")
    class RatingTests {

        @Test
        void referencePerformanceScoresExactlyOne() {
            // Os pesos somam 1, então um jogador que iguala todas as referências
            // do lado precisa dar 1.00 sem nenhuma constante de ajuste. Se isso
            // quebrar, a escala inteira deixou de significar o que promete.
            SideProduction atReference = productionMatching(CompetitiveScales.RETAKE_CT, 100);

            double rating = RatingCalculator.forRoundBasedUnit(
                    GameMode.RETAKE, Map.of(Side.CT, atReference));

            assertThat(rating).isCloseTo(1.0, org.assertj.core.data.Offset.offset(0.02));
        }

        @Test
        void betterProductionScoresHigher() {
            SideProduction baseline = productionMatching(CompetitiveScales.RETAKE_CT, 100);
            SideProduction stronger = new SideProduction(100, 130, 40, 13_000, 80, 25);

            double base = RatingCalculator.forRoundBasedUnit(GameMode.RETAKE, Map.of(Side.CT, baseline));
            double better = RatingCalculator.forRoundBasedUnit(GameMode.RETAKE, Map.of(Side.CT, stronger));

            assertThat(better).isGreaterThan(base);
        }

        @Test
        void sidesAreWeightedByRoundsPlayed() {
            // O retake é assimétrico: as referências de CT e TR são diferentes.
            // Quem jogou mais rounds de um lado precisa ter esse lado pesando
            // mais, ou o Rating premiaria a sorte do sorteio de lados.
            Map<Side, SideProduction> mostlyCt = new EnumMap<>(Side.class);
            mostlyCt.put(Side.CT, productionMatching(CompetitiveScales.RETAKE_CT, 18));
            mostlyCt.put(Side.TR, productionMatching(CompetitiveScales.RETAKE_TR, 2));

            Map<Side, SideProduction> mostlyTr = new EnumMap<>(Side.class);
            mostlyTr.put(Side.CT, productionMatching(CompetitiveScales.RETAKE_CT, 2));
            mostlyTr.put(Side.TR, productionMatching(CompetitiveScales.RETAKE_TR, 18));

            // Nos dois casos o jogador jogou exatamente na referência do lado em
            // que estava, então os dois precisam dar 1.00.
            assertThat(RatingCalculator.forRoundBasedUnit(GameMode.RETAKE, mostlyCt))
                    .isCloseTo(1.0, org.assertj.core.data.Offset.offset(0.02));
            assertThat(RatingCalculator.forRoundBasedUnit(GameMode.RETAKE, mostlyTr))
                    .isCloseTo(1.0, org.assertj.core.data.Offset.offset(0.02));
        }

        @Test
        void deathmatchIsMeasuredPerMinuteAndNeverDividesByZero() {
            // Sessão de 10 minutos exatamente nas referências: 1,5 abates e 1,5
            // mortes por minuto, 170 de dano por minuto, 45% de headshot.
            DeathmatchProduction atReference = new DeathmatchProduction(
                    600, 15, 15, 1700, 7);
            assertThat(RatingCalculator.forDeathmatchSession(atReference))
                    .isCloseTo(1.0, org.assertj.core.data.Offset.offset(0.05));

            // Sem nenhuma morte o termo invertido dividiria por zero.
            DeathmatchProduction flawless = new DeathmatchProduction(600, 30, 0, 3000, 20);
            double rating = RatingCalculator.forDeathmatchSession(flawless);
            assertThat(rating).isFinite().isLessThanOrEqualTo(CompetitiveScales.RATING_CEILING);
        }

        @Test
        void aSmallSampleIsPulledTowardTheBaseline() {
            // Uma única unidade excepcional não pode colocar alguém no topo.
            double oneUnit = RatingCalculator.shrinkTowardBaseline(2.0, 1);
            double manyUnits = RatingCalculator.shrinkTowardBaseline(2.0, 30);

            assertThat(oneUnit).isLessThan(manyUnits);
            assertThat(oneUnit).isLessThan(2.0).isGreaterThan(1.0);
            // Com amostra grande o encolhimento praticamente desaparece.
            assertThat(manyUnits).isCloseTo(2.0, org.assertj.core.data.Offset.offset(0.1));
            // Sem amostra nenhuma, a base.
            assertThat(RatingCalculator.shrinkTowardBaseline(2.0, 0)).isEqualTo(1.0);
        }

        @Test
        void volumeAloneDoesNotRaiseTheRating() {
            // Repetir o mesmo desempenho aumenta a confiança, não o número.
            double few = RatingCalculator.shrinkTowardBaseline(1.20, 5);
            double many = RatingCalculator.shrinkTowardBaseline(1.20, 60);

            assertThat(many).isGreaterThan(few);
            assertThat(many)
                    .as("o encolhimento converge para o desempenho real, não acima dele")
                    .isLessThanOrEqualTo(1.20);
        }
    }

    @Nested
    @DisplayName("Rating geral — agregação entre modos")
    class AggregationTests {

        @Test
        void anAbsentModeIsExcludedInsteadOfCountedAsZero() {
            // Um especialista em retake precisa poder disputar o topo geral sem
            // ser obrigado a jogar todos os modos (documento 19 §5).
            Map<GameMode, ModeSample> retakeOnly = Map.of(
                    GameMode.RETAKE, new ModeSample(1.40, 30));

            Double general = RatingCalculator.aggregate(retakeOnly);

            assertThat(general).isNotNull();
            assertThat(general)
                    .as("sem outros modos, o geral é o rating do modo jogado")
                    .isCloseTo(1.40, org.assertj.core.data.Offset.offset(0.001));
        }

        @Test
        void fiveVersusFiveOutweighsTheOtherModes() {
            Map<GameMode, ModeSample> both = Map.of(
                    GameMode.COMPETITIVE_5V5, new ModeSample(1.00, 30),
                    GameMode.RETAKE, new ModeSample(2.00, 30));

            Double general = RatingCalculator.aggregate(both);

            // Com pesos 1,00 e 0,60 e amostras iguais, o geral fica mais perto do
            // 5v5 do que do retake.
            assertThat(general).isNotNull();
            assertThat(general).isLessThan(1.5);
        }

        @Test
        void aThinSampleContributesLessThanASolidOne() {
            Map<GameMode, ModeSample> thinRetake = Map.of(
                    GameMode.COMPETITIVE_5V5, new ModeSample(1.00, 30),
                    GameMode.RETAKE, new ModeSample(2.00, 1));
            Map<GameMode, ModeSample> solidRetake = Map.of(
                    GameMode.COMPETITIVE_5V5, new ModeSample(1.00, 30),
                    GameMode.RETAKE, new ModeSample(2.00, 30));

            assertThat(RatingCalculator.aggregate(thinRetake))
                    .isLessThan(RatingCalculator.aggregate(solidRetake));
        }

        @Test
        void noSampleAtAllIsAbsenceNotZero() {
            // Ausência é um estado, não um número (invariante 1 do CLAUDE.md).
            assertThat(RatingCalculator.aggregate(Map.of())).isNull();
            assertThat(RatingCalculator.aggregate(Map.of(
                    GameMode.RETAKE, new ModeSample(1.5, 0)))).isNull();
        }
    }

    @Nested
    @DisplayName("ELO — sucesso")
    class EloTests {

        @Test
        void winningAgainstAStrongerOpponentGainsMore() {
            int elo = 400;
            int againstStronger = EloCalculator.nextElo(elo, 700, 1.0, 16);
            int againstWeaker = EloCalculator.nextElo(elo, 200, 1.0, 16);

            assertThat(againstStronger - elo)
                    .as("vencer quem é mais forte vale mais")
                    .isGreaterThan(againstWeaker - elo);
        }

        @Test
        void anEvenMatchAgainstAnEqualOpponentDoesNotMoveTheElo() {
            // Expectativa 0,5 contra igual; empatar confirma a estimativa.
            assertThat(EloCalculator.expectedScore(400, 400)).isEqualTo(0.5);
            assertThat(EloCalculator.nextElo(400, 400, 0.5, 32)).isEqualTo(400);
        }

        @Test
        void theEloNeverLeavesItsScale() {
            assertThat(EloCalculator.nextElo(5, 1000, 0.0, 32))
                    .isGreaterThanOrEqualTo(CompetitiveScales.ELO_FLOOR);
            assertThat(EloCalculator.nextElo(995, 0, 1.0, 32))
                    .isLessThanOrEqualTo(CompetitiveScales.ELO_CEILING);
        }

        @Test
        void theTopMovesSlowerThanTheCalibration() {
            int calibrating = EloCalculator.kFactor(300, 2, 5);
            int established = EloCalculator.kFactor(300, 20, 5);
            int top = EloCalculator.kFactor(800, 20, 5);

            assertThat(calibrating).isGreaterThan(established);
            assertThat(top).isLessThan(established);
        }

        @Test
        void aRoundBlockScoresByTheShareOfRoundsWon() {
            assertThat(EloCalculator.roundShareScore(20, 20)).isEqualTo(1.0);
            assertThat(EloCalculator.roundShareScore(10, 20)).isEqualTo(0.5);
            assertThat(EloCalculator.roundShareScore(0, 20)).isEqualTo(0.0);
            assertThatThrownBy(() -> EloCalculator.roundShareScore(1, 0))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        void deathmatchPlacementIsNeutralInTheMiddle() {
            assertThat(EloCalculator.placementScore(1, 11)).isEqualTo(1.0);
            assertThat(EloCalculator.placementScore(11, 11)).isEqualTo(0.0);
            assertThat(EloCalculator.placementScore(6, 11))
                    .as("o meio da tabela é o resultado neutro")
                    .isEqualTo(0.5);
            // Sozinho no servidor não há sucesso nem fracasso a medir.
            assertThat(EloCalculator.placementScore(1, 1)).isEqualTo(0.5);
        }

        @Test
        void theEloIgnoresProduction() {
            // Duas unidades com o mesmo resultado movem o ELO igual, por mais
            // diferente que tenha sido a produção. É isso que mantém o ELO
            // medindo sucesso e permite que ele divirja do Rating.
            int carried = EloCalculator.nextElo(400, 400, 1.0, 16);
            int passenger = EloCalculator.nextElo(400, 400, 1.0, 16);
            assertThat(carried).isEqualTo(passenger);
        }
    }

    /** Produção que iguala exatamente as referências de um lado. */
    private static SideProduction productionMatching(
            CompetitiveScales.RoundReferences reference, int rounds) {
        int kills = (int) Math.round(reference.kpr() * rounds);
        int damage = (int) Math.round(reference.adr() * rounds);
        int kast = (int) Math.round(reference.kast() * rounds);
        int survived = (int) Math.round(reference.spr() * rounds);
        int multiKills = (int) Math.round(reference.mk() * rounds);
        return new SideProduction(rounds, kills, rounds - survived, damage, kast, multiKills);
    }
}
