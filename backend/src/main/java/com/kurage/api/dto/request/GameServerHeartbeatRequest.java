package com.kurage.api.dto.request;

import com.kurage.api.domain.GameMode;
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

    private GameMode gameMode;

    private List<ServerPlayerDto> players;
}
