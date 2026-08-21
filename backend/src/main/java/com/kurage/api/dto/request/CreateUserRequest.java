package com.kurage.api.dto.request;

import jakarta.validation.constraints.*;

public record CreateUserRequest(
        @NotBlank @Size(min = 3, max = 30)
        @Pattern(
                regexp = "^(?!^\\.)(?!.*\\.$)(?!.*\\.{2})[a-z0-9_.]{3,30}$",
                message = "O username deve conter apenas letras minúsculas, números, '.' ou '_', ter entre 3 e 30 caracteres, e não pode começar, terminar ou conter pontos consecutivos."
        )
        String username,
        @Pattern(
                regexp = "^[0-9]{17}$",
                message = "O SteamID64 deve conter exatamente 17 dígitos numéricos."
        )
        @NotBlank @Size(max = 100) String steamId64
) {
}
