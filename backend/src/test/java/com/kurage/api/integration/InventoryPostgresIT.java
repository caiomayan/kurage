package com.kurage.api.integration;

import com.kurage.api.domain.User;
import com.kurage.api.dto.response.EquippedItemDto;
import com.kurage.api.dto.response.EquippedV5Response;
import com.kurage.api.repository.UserInventoryRepository;
import com.kurage.api.repository.UserRepository;
import com.kurage.api.service.InventoryService;
import com.kurage.api.service.RateLimitingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class InventoryPostgresIT extends IntegrationTestSupport {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserInventoryRepository userInventoryRepository;

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RateLimitingService rateLimitingService;

    @Test
    void returnsACanonicalEmptyInventoryBeforeTheFirstPersistedItem() {
        User user = userRepository.save(User.builder()
                .kurageId(9_000_004L)
                .username("empty_inventory_user")
                .steamId64("76561198090000004")
                .build());

        JsonNode inventory = inventoryService.getInventoryByUser(user);

        assertThat(inventory.path("version").asInt()).isEqualTo(2);
        assertThat(inventory.path("items").isObject()).isTrue();
        assertThat(inventory.path("items").size()).isZero();
    }

    @Test
    void returnsTheCanonicalInventoryOnlyAfterItHasBeenPersistedInPostgres() throws Exception {
        User user = userRepository.save(User.builder()
                .kurageId(9_000_003L)
                .username("confirmed_inventory_user")
                .steamId64("76561198090000003")
                .build());
        JsonNode requestedInventory = objectMapper.readTree("""
                {"version":2,"items":{"0":{"id":7,"wear":0.12,"equippedCT":true}}}
                """);

        JsonNode confirmedInventory = inventoryService.updateInventory(user, requestedInventory);

        assertThat(confirmedInventory.path("items").path("0").path("id").asInt()).isEqualTo(7);
        assertThat(confirmedInventory.path("items").path("0").path("equippedCT").asBoolean()).isTrue();
        assertThat(userInventoryRepository.findByUserId(user.getId())).isPresent();
        assertThat(inventoryService.getInventoryByUser(user))
                .isEqualTo(confirmedInventory);
    }

    @Test
    void advancesTheOptimisticLockWheneverInventoryChanges() throws Exception {
        User user = userRepository.save(User.builder()
                .kurageId(9_000_009L)
                .username("versioned_inventory_user")
                .steamId64("76561198090000009")
                .build());

        inventoryService.updateInventory(user, objectMapper.readTree(
                "{\"version\":2,\"items\":{\"0\":{\"id\":7}}}"));
        Long initialVersion = userInventoryRepository.findByUserId(user.getId()).orElseThrow().getLockVersion();

        inventoryService.updateInventory(user, objectMapper.readTree(
                "{\"version\":2,\"items\":{\"0\":{\"id\":7,\"wear\":0.2}}}"));
        Long updatedVersion = userInventoryRepository.findByUserId(user.getId()).orElseThrow().getLockVersion();

        assertThat(updatedVersion).isGreaterThan(initialVersion);
    }

    @Test
    void persistsAndReadsBackAKnifeWithWearAndPattern() throws Exception {
        User user = userRepository.save(User.builder()
                .kurageId(9_000_005L)
                .username("knife_inventory_user")
                .steamId64("76561198090000005")
                .build());
        JsonNode requestedInventory = objectMapper.readTree("""
                {"version":2,"items":{"0":{"id":1211,"wear":0.06,"seed":420}}}
                """);

        JsonNode confirmedInventory = inventoryService.updateInventory(user, requestedInventory);

        assertThat(confirmedInventory.path("items").path("0").path("id").asInt()).isEqualTo(1211);
        assertThat(confirmedInventory.path("items").path("0").path("wear").asDouble()).isEqualTo(0.06d);
        assertThat(confirmedInventory.path("items").path("0").path("seed").asInt()).isEqualTo(420);
        assertThat(inventoryService.getInventoryByUser(user)).isEqualTo(confirmedInventory);
    }

    @Test
    void exposesEquippedStickersAndKeychainsUsingCs2SchemaDefinitions() throws Exception {
        User user = userRepository.save(User.builder()
                .kurageId(9_000_006L)
                .username("cosmetic_inventory_user")
                .steamId64("76561198090000006")
                .build());
        JsonNode requestedInventory = objectMapper.readTree("""
                {"version":2,"items":{"0":{"id":7,"equippedCT":true,
                "stickers":{"0":{"id":1847,"schema":17,"wear":0.12,"rotation":15,"x":0.3,"y":-0.1}},
                "keychains":{"0":{"id":13113,"seed":42,"x":1.5,"y":-2.5,"z":3.5}}}}}
                """);

        inventoryService.updateInventory(user, requestedInventory);
        EquippedV5Response equipped = inventoryService.getEquippedInventoryBySteamId(user.getSteamId64());
        EquippedItemDto weapon = equipped.getCtWeapons().get("10");

        assertThat(weapon).isNotNull();
        assertThat(weapon.getStickers()).singleElement().satisfies(sticker -> {
            assertThat(sticker.getSlot()).isZero();
            assertThat(sticker.getDef()).isEqualTo(1);
            assertThat(sticker.getSchema()).isEqualTo(17);
            assertThat(sticker.getWear()).isEqualTo(0.12f);
            assertThat(sticker.getRotation()).isEqualTo(15f);
            assertThat(sticker.getX()).isEqualTo(0.3f);
            assertThat(sticker.getY()).isEqualTo(-0.1f);
        });
        assertThat(weapon.getKeychains()).singleElement().satisfies(keychain -> {
            assertThat(keychain.getSlot()).isZero();
            assertThat(keychain.getDef()).isEqualTo(1);
            assertThat(keychain.getSeed()).isEqualTo(42);
            assertThat(keychain.getX()).isEqualTo(1.5f);
            assertThat(keychain.getY()).isEqualTo(-2.5f);
            assertThat(keychain.getZ()).isEqualTo(3.5f);
        });
    }

    @Test
    void exposesOneMusicKitAsTheGlobalEquippedSlot() throws Exception {
        User user = userRepository.save(User.builder()
                .kurageId(9_000_007L)
                .username("music_kit_inventory_user")
                .steamId64("76561198090000007")
                .build());
        JsonNode requestedInventory = objectMapper.readTree("""
                {"version":2,"items":{"0":{"id":1779,"equipped":true}}}
                """);

        inventoryService.updateInventory(user, requestedInventory);
        EquippedV5Response equipped = inventoryService.getEquippedInventoryBySteamId(user.getSteamId64());

        assertThat(equipped.getMusicKit()).isNotNull();
        assertThat(equipped.getMusicKit().getDef()).isEqualTo(1314);
        assertThat(equipped.getMusicKit().getPaint()).isEqualTo(1);
    }

    @Test
    void rejectsMoreThanOneMusicKitInTheGlobalSlot() throws Exception {
        User user = userRepository.save(User.builder()
                .kurageId(9_000_008L)
                .username("invalid_music_kit_user")
                .steamId64("76561198090000008")
                .build());
        JsonNode requestedInventory = objectMapper.readTree("""
                {"version":2,"items":{"0":{"id":1779,"equipped":true},"1":{"id":1780,"equipped":true}}}
                """);

        assertThatThrownBy(() -> inventoryService.updateInventory(user, requestedInventory))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("only one music kit");
    }

    @Test
    void keepsInventoryMutationsSeparateFromTheSharedIpWindow() {
        String userId = UUID.randomUUID().toString();

        for (int attempt = 0; attempt < 30; attempt++) {
            assertThat(rateLimitingService.allowInventoryMutation(userId)).isTrue();
        }
        assertThat(rateLimitingService.allowInventoryMutation(userId)).isFalse();

        // A mutation cap must not consume the user's read/synchronization quota.
        assertThat(rateLimitingService.allowInventoryRead(userId)).isTrue();
    }
}
