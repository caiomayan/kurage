package com.kurage.api.service;

import com.kurage.api.repository.PlayerStatsRepository;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

class PlayerStatsServiceTest {

    @Test
    void testCalculateLevel() {
        assertEquals(1, PlayerStatsService.calculateLevel(-50));
        assertEquals(1, PlayerStatsService.calculateLevel(0));
        assertEquals(1, PlayerStatsService.calculateLevel(99));
        assertEquals(2, PlayerStatsService.calculateLevel(100));
        assertEquals(3, PlayerStatsService.calculateLevel(200)); // Default ELO
        assertEquals(3, PlayerStatsService.calculateLevel(299));
        assertEquals(4, PlayerStatsService.calculateLevel(300));
        assertEquals(9, PlayerStatsService.calculateLevel(899));
        assertEquals(10, PlayerStatsService.calculateLevel(900));
        assertEquals(10, PlayerStatsService.calculateLevel(1000));
        assertEquals(10, PlayerStatsService.calculateLevel(1500));
    }
}
