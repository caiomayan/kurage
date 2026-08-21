package com.kurage.api.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServerPlayerDto implements Serializable {
    private String steamId64;
    private String username;
    private String team; // "CT", "TR", "SPEC"
    private Integer kills;
    private Integer deaths;
    private Integer ping;
    private Boolean isAlive;
}
