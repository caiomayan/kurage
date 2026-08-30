package com.kurage.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServerPlayerResponse implements Serializable {
    private Long kurageId;
    private Boolean isKurageMember;
    private String steamId64;
    private String username;
    private String avatarUrl;
    private String team; // "CT", "TR", "SPEC"
    private Integer kurageLevel;
    private Integer kurageElo;
    private Integer faceitLevel;
    private Boolean isVerifiedPro;
    private String clanTag;
    private Integer kills;
    private Integer deaths;
    private Integer ping;
    private Boolean isAlive;
}
