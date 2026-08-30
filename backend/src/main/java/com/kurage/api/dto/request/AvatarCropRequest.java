package com.kurage.api.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

/** Normalized crop data shared by the browser preview and the Steam avatar crop. */
public record AvatarCropRequest(
        @NotNull @DecimalMin("1.0") @DecimalMax("3.0") Double zoom,
        @NotNull @DecimalMin("-1.0") @DecimalMax("1.0") Double positionX,
        @NotNull @DecimalMin("-1.0") @DecimalMax("1.0") Double positionY
) {
}
