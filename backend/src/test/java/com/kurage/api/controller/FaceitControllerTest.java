package com.kurage.api.controller;

import com.kurage.api.domain.User;
import com.kurage.api.domain.UserFaceit;
import com.kurage.api.dto.response.FaceitResponse;
import com.kurage.api.repository.UserFaceitRepository;
import com.kurage.api.repository.UserRepository;
import com.kurage.api.service.FaceitService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class FaceitControllerTest {

    private static final String STEAM_ID = "76561199095180322";
    private static final UUID USER_ID = UUID.fromString("01234567-89ab-cdef-0123-456789abcdef");
    private static final String RESPONSE_CACHE_KEY = "cache:faceit:steam:" + STEAM_ID;
    private static final String NOT_FOUND_CACHE_KEY = "faceit:notfound:" + STEAM_ID;

    private UserRepository userRepository;
    private UserFaceitRepository userFaceitRepository;
    private FaceitService faceitService;
    private StringRedisTemplate redisTemplate;
    private ValueOperations<String, String> valueOperations;
    private FaceitController controller;
    private User user;
    private UserFaceit persistedFaceit;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        userFaceitRepository = mock(UserFaceitRepository.class);
        faceitService = mock(FaceitService.class);
        redisTemplate = mock(StringRedisTemplate.class);
        valueOperations = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        controller = new FaceitController(userRepository, userFaceitRepository, faceitService, redisTemplate);
        ReflectionTestUtils.setField(controller, "faceitCacheDurationMs", 60_000L);

        user = User.builder()
                .id(USER_ID)
                .steamId64(STEAM_ID)
                .username("tensai")
                .faceitUsername("tensai")
                .build();
        persistedFaceit = UserFaceit.builder()
                .userId(USER_ID)
                .user(user)
                .faceitId(STEAM_ID)
                .level(7)
                .elo(1502)
                .kdRatio(new BigDecimal("1.48"))
                .winRate(55)
                .matches(312)
                .build();
        persistedFaceit.setUpdatedAt(Instant.now().minus(Duration.ofHours(1)));

        when(userRepository.findBySteamId64(STEAM_ID)).thenReturn(Optional.of(user));
        when(valueOperations.get(RESPONSE_CACHE_KEY)).thenReturn(null);
        when(userFaceitRepository.findById(USER_ID)).thenReturn(Optional.of(persistedFaceit));
    }

    @Test
    void returnsPersistedStatsEvenWhenNegativeLookupCacheExists() {
        when(redisTemplate.hasKey(NOT_FOUND_CACHE_KEY)).thenReturn(true);

        var response = controller.getFaceitData(STEAM_ID);

        assertPersistedFaceit(response.getBody());
        verifyNoInteractions(faceitService);
    }

    @Test
    void fallsBackToPersistedStatsWhenRefreshDoesNotFindPlayer() {
        when(redisTemplate.hasKey(NOT_FOUND_CACHE_KEY)).thenReturn(false);
        when(faceitService.getFaceitDataBySteamId(STEAM_ID)).thenReturn(Optional.empty());

        var response = controller.getFaceitData(STEAM_ID);

        assertPersistedFaceit(response.getBody());
        verify(faceitService).getFaceitDataBySteamId(STEAM_ID);
        verify(valueOperations).set(NOT_FOUND_CACHE_KEY, "true", Duration.ofHours(24));
    }

    private void assertPersistedFaceit(FaceitResponse response) {
        assertNotNull(response);
        assertEquals("tensai", response.username());
        assertEquals(7, response.level());
        assertEquals(1502, response.elo());
        assertEquals(new BigDecimal("1.48"), response.kdRatio());
        assertEquals(55, response.winRate());
        assertEquals(312, response.matches());
    }
}
