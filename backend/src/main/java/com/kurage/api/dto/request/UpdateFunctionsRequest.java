package com.kurage.api.dto.request;

import com.kurage.api.domain.PlayerFunction;

public record UpdateFunctionsRequest(
        PlayerFunction primaryFunction,
        PlayerFunction secondaryFunction
) {}
