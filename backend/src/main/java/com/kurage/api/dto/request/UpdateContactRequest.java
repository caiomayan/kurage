package com.kurage.api.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

/**
 * Optional private contact details. A null or blank field clears that channel.
 * Phone numbers are normalized by the service and persisted in E.164 format.
 */
public record UpdateContactRequest(
        @Email(message = "Informe um e-mail válido.")
        @Size(max = 254, message = "O e-mail deve ter no máximo 254 caracteres.")
        String email,

        @Size(max = 40, message = "O telefone informado é muito longo.")
        String phoneNumber
) {
}
