package com.kurage.api.dto.request;

import com.kurage.api.domain.InGameFunction;
import jakarta.validation.constraints.NotNull;

public record UpdateTeamFunctionRequest(
        @NotNull InGameFunction function
) {}
