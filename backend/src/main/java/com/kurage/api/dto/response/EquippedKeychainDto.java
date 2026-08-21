package com.kurage.api.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class EquippedKeychainDto {

    @JsonProperty("slot")
    private Byte slot;

    @JsonProperty("def")
    private Integer def;

    @JsonProperty("seed")
    private Integer seed;

    @JsonProperty("x")
    private Float x;

    @JsonProperty("y")
    private Float y;

    @JsonProperty("z")
    private Float z;
}
