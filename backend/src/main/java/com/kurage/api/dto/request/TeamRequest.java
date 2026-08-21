package com.kurage.api.dto.request;

import com.kurage.api.domain.TeamRole;
import jakarta.validation.constraints.NotNull;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TeamRequest(
        @NotBlank @Size(min = 3, max = 32) String name,
        @NotBlank @Size(min = 2, max = 4) String tag,
        @NotNull TeamRole ownerRole,
        @Size(max = 2) String country
) {}
