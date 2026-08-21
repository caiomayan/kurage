package com.kurage.api.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

public record SteamProfileResponse(Response response) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Response(java.util.List<Player> players) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Player(String personaname, String avatarfull) {}
}
