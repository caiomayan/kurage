package com.kurage.api.dto.response;

import com.kurage.api.domain.Team;

import java.io.Serializable;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public record TeamResponse(
        UUID id,
        String name,
        String tag,
        String logoUrl,
        String country,
        Integer teamElo,
        UserResponse owner,
        Instant createdAt,
        List<TeamMemberResponse> members
) implements Serializable {
    public static TeamResponse create(Team team) {
        if (team == null) return null;
        return new TeamResponse(
                team.getId(),
                team.getName(),
                team.getTag(),
                team.getLogoUrl(),
                team.getCountry(),
                team.getTeamElo(),
                UserResponse.create(team.getOwner()),
                team.getCreatedAt(),
                team.getMembers() != null ? team.getMembers().stream()
                        .map(TeamMemberResponse::create)
                        .collect(Collectors.toList()) : List.of()
        );
    }
}
