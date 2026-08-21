package com.kurage.api.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EquippedV5Response {

    @Builder.Default
    @JsonProperty("agents")
    private Map<String, EquippedItemDto> agents = new HashMap<>();

    @JsonProperty("collectible")
    private EquippedItemDto collectible;

    @Builder.Default
    @JsonProperty("ctWeapons")
    private Map<String, EquippedItemDto> ctWeapons = new HashMap<>();

    @Builder.Default
    @JsonProperty("tWeapons")
    private Map<String, EquippedItemDto> tWeapons = new HashMap<>();

    @Builder.Default
    @JsonProperty("gloves")
    private Map<String, EquippedItemDto> gloves = new HashMap<>();

    @Builder.Default
    @JsonProperty("knives")
    private Map<String, EquippedItemDto> knives = new HashMap<>();

    @JsonProperty("graffiti")
    private EquippedItemDto graffiti;

    @JsonProperty("musicKit")
    private EquippedItemDto musicKit;
}
