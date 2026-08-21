package com.kurage.api.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class EquippedItemDto {

    @JsonProperty("uid")
    private Integer uid;

    @JsonProperty("def")
    private Integer def;

    @JsonProperty("paint")
    private Integer paint;

    @JsonProperty("seed")
    private Integer seed;

    @JsonProperty("wear")
    private Float wear;

    @JsonProperty("nametag")
    private String nametag;

    @JsonProperty("stattrak")
    private Integer stattrak;

    @JsonProperty("stickers")
    private List<EquippedStickerDto> stickers;

    @JsonProperty("keychains")
    private List<EquippedKeychainDto> keychains;
}
