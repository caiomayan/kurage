package com.kurage.api.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UserServiceTest {

    @Test
    void acceptsOnlyReliableIsoCountryFromTrustedEdge() {
        assertThat(UserService.normalizeEdgeCountry(" br ")).isEqualTo("BR");
        assertThat(UserService.normalizeEdgeCountry("US")).isEqualTo("US");
        assertThat(UserService.normalizeEdgeCountry(null)).isNull();
        assertThat(UserService.normalizeEdgeCountry("XX")).isNull();
        assertThat(UserService.normalizeEdgeCountry("T1")).isNull();
        assertThat(UserService.normalizeEdgeCountry("BRA")).isNull();
    }
}
