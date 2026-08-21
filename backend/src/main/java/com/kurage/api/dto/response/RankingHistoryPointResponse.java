package com.kurage.api.dto.response;

import java.io.Serializable;
import java.time.LocalDate;

public record RankingHistoryPointResponse(
        LocalDate date,
        int position,
        int kurageElo
) implements Serializable {
}
