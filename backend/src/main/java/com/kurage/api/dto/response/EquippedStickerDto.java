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
public class EquippedStickerDto {

    @JsonProperty("slot")
    private Byte slot;

    @JsonProperty("def")
    private Integer def;

    @JsonProperty("schema")
    private Integer schema;

    @JsonProperty("wear")
    private Float wear;

    @JsonProperty("rotation")
    private Float rotation;

    @JsonProperty("x")
    private Float x;

    @JsonProperty("y")
    private Float y;
}
