package com.kurage.api.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Um round relatado pelo servidor de jogo.
 *
 * <p>Contrato do documento 20 §7. A validação é estrita de propósito: um evento
 * inválido é recusado inteiro na entrada e nunca aplicado pela metade.
 */
public record RoundEventRequest(

        @NotNull(message = "sessionId é obrigatório")
        UUID sessionId,

        /** Monotônico dentro da sessão; detecta buraco e reordenação. */
        @NotNull(message = "sequence é obrigatório")
        @Min(value = 1, message = "sequence começa em 1")
        Long sequence,

        /** Única por round. É o que torna o reenvio seguro. */
        @NotNull(message = "idempotencyKey é obrigatório")
        UUID idempotencyKey,

        @Size(max = 50)
        String map,

        @NotNull(message = "endedAt é obrigatório")
        Instant endedAt,

        @NotBlank(message = "gameMode é obrigatório")
        @Size(max = 20)
        String gameMode,

        @Pattern(regexp = "CT|TR", message = "winningSide deve ser CT ou TR")
        String winningSide,

        @NotEmpty(message = "um round precisa de participantes")
        @Valid
        List<PlayerRound> players
) {

    /** O que um jogador fez no round. */
    public record PlayerRound(

            @NotBlank(message = "steamId64 é obrigatório")
            @Pattern(regexp = "\\d{17}", message = "steamId64 deve ter 17 dígitos")
            String steamId64,

            @NotNull
            @Pattern(regexp = "CT|TR", message = "side deve ser CT ou TR")
            String side,

            @PositiveOrZero int kills,
            @PositiveOrZero int deaths,
            @PositiveOrZero int assists,
            @PositiveOrZero int damage,

            boolean survived,
            /** Morreu, mas a morte foi vingada. Entra no KAST. */
            boolean wasTraded,
            boolean openingKill,
            boolean openingDeath
    ) {
    }
}
