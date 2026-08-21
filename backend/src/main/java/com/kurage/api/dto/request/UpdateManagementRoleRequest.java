package com.kurage.api.dto.request;

import com.kurage.api.domain.ManagementRole;
import jakarta.validation.constraints.NotNull;

public record UpdateManagementRoleRequest(
        @NotNull ManagementRole managementRole
) {}
