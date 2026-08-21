package com.kurage.api.controller;

import com.kurage.api.domain.User;
import com.kurage.api.domain.UserInventory;
import com.kurage.api.repository.UserInventoryRepository;
import com.kurage.api.repository.UserRepository;
import com.kurage.api.service.InventoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.ObjectMapper;

import java.util.Optional;
import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class InventoryControllerTest {

    private static final String STEAM_ID = "76561198000000000";

    private UserInventoryRepository inventoryRepository;
    private UserRepository userRepository;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        inventoryRepository = mock(UserInventoryRepository.class);
        userRepository = mock(UserRepository.class);
        InventoryService inventoryService = new InventoryService(
                inventoryRepository,
                userRepository,
                new ObjectMapper()
        );
        mockMvc = MockMvcBuilders
                .standaloneSetup(new InventoryController(inventoryService))
                .build();
    }

    @Test
    void missingInventorySerializesAsAnEmptyJsonObject() throws Exception {
        when(userRepository.findBySteamId64(STEAM_ID)).thenReturn(Optional.empty());

        mockMvc.perform(get("/inventory/{steamId64}", STEAM_ID))
                .andExpect(status().isOk())
                .andExpect(content().json("{}"));
    }

    @Test
    void persistedInventorySerializesItsJsonContentInsteadOfJsonNodeMetadata() throws Exception {
        UUID userId = UUID.randomUUID();
        User user = mock(User.class);
        when(user.getId()).thenReturn(userId);
        when(userRepository.findBySteamId64(STEAM_ID)).thenReturn(Optional.of(user));

        var persistedItems = new com.fasterxml.jackson.databind.ObjectMapper().readTree("""
                {
                  "730": {"name": "AK-47", "equipped": true},
                  "version": 2
                }
                """);
        UserInventory inventory = UserInventory.builder()
                .userId(userId)
                .user(user)
                .items(persistedItems)
                .build();
        when(inventoryRepository.findByUserId(userId)).thenReturn(Optional.of(inventory));

        mockMvc.perform(get("/inventory/{steamId64}", STEAM_ID))
                .andExpect(status().isOk())
                .andExpect(content().json("""
                        {
                          "730": {"name": "AK-47", "equipped": true},
                          "version": 2
                        }
                        """));
    }
}
