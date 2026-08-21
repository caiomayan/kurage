package com.kurage.api.dto.response;

import java.io.Serializable;
import java.util.UUID;

public record SearchTeamResult(
        UUID id,
        String name,
        String tag,
        String logoUrl,
        String country,
        Integer teamElo,
        int memberCount
) implements Serializable {}
