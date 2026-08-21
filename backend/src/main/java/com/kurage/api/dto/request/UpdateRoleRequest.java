package com.kurage.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UpdateRoleRequest(
        @NotBlank(message = "A role não pode ser vazia")
        @Pattern(regexp = "^(USER|ADMIN)$", message = "A role deve ser USER ou ADMIN")
        String role
) {}
