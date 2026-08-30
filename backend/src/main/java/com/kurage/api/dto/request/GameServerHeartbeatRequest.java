package com.kurage.api.dto.request;

import com.kurage.api.domain.GameMode;
import com.kurage.api.domain.GameServerKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameServerHeartbeatRequest {

    @NotBlank(message = "Current map is required")
    private String currentMap;

    @NotNull(message = "Current players count is required")
    @PositiveOrZero(message = "Current players count must be non-negative")
    private Integer currentPlayers;

    @PositiveOrZero(message = "Max players count must be non-negative")
    private Integer maxPlayers;

    @PositiveOrZero(message = "CT score must be non-negative")
    private Integer ctScore;

    @PositiveOrZero(message = "TR score must be non-negative")
    private Integer trScore;

    private GameMode gameMode;

    private GameServerKind serverKind;

    private List<ServerPlayerDto> players;
}
