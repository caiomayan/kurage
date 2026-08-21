package com.kurage.api.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.kurage.api.domain.User;
import com.kurage.api.domain.UserInventory;
import com.kurage.api.dto.response.EquippedItemDto;
import com.kurage.api.dto.response.EquippedKeychainDto;
import com.kurage.api.dto.response.EquippedStickerDto;
import com.kurage.api.dto.response.EquippedV5Response;
import com.kurage.api.repository.UserInventoryRepository;
import com.kurage.api.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.InputStream;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryService {

    private final UserInventoryRepository inventoryRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final com.fasterxml.jackson.databind.ObjectMapper persistenceObjectMapper =
            new com.fasterxml.jackson.databind.ObjectMapper();

    private final Map<Integer, ItemMeta> itemLookupMap = new HashMap<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemMeta {
        private Integer def;
        private Integer paint;
        private String type;
    }

    @PostConstruct
    public void initItemLookup() {
        try {
            ClassPathResource resource = new ClassPathResource("cs2_items_lookup.json");
            if (resource.exists()) {
                try (InputStream is = resource.getInputStream()) {
                    Map<String, ItemMeta> rawMap = persistenceObjectMapper.readValue(
                            is, new TypeReference<Map<String, ItemMeta>>() {}
                    );
                    for (Map.Entry<String, ItemMeta> entry : rawMap.entrySet()) {
                        try {
                            itemLookupMap.put(Integer.parseInt(entry.getKey()), entry.getValue());
                        } catch (NumberFormatException ignored) {}
                    }
                    log.info("Successfully loaded {} CS2 item definitions into memory for in-game skin engine", itemLookupMap.size());
                }
            } else {
                log.warn("cs2_items_lookup.json resource not found. CS2 item definition resolution will be limited.");
            }
        } catch (Exception e) {
            log.error("Failed to load cs2_items_lookup.json: {}", e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public JsonNode getInventoryBySteamId(String steamId64) {
        Optional<User> userOpt = userRepository.findBySteamId64(steamId64);
        if (userOpt.isEmpty()) {
            return objectMapper.createObjectNode();
        }

        return inventoryRepository.findByUserId(userOpt.get().getId())
                .map(UserInventory::getItems)
                .map(this::toApiJson)
                .orElseGet(objectMapper::createObjectNode);
    }

    @Transactional(readOnly = true)
    public EquippedV5Response getEquippedInventoryBySteamId(String steamId64) {
        EquippedV5Response response = EquippedV5Response.builder().build();

        Optional<User> userOpt = userRepository.findBySteamId64(steamId64);
        if (userOpt.isEmpty()) {
            return response;
        }

        Optional<UserInventory> inventoryOpt = inventoryRepository.findByUserId(userOpt.get().getId());
        if (inventoryOpt.isEmpty() || inventoryOpt.get().getItems() == null) {
            return response;
        }

        com.fasterxml.jackson.databind.JsonNode rootNode = inventoryOpt.get().getItems();
        com.fasterxml.jackson.databind.JsonNode itemsNode = rootNode.has("items") ? rootNode.get("items") : rootNode;

        if (itemsNode == null || !itemsNode.isObject()) {
            return response;
        }

        Iterator<Map.Entry<String, com.fasterxml.jackson.databind.JsonNode>> fields = itemsNode.fields();
        int uidCounter = 0;

        while (fields.hasNext()) {
            Map.Entry<String, com.fasterxml.jackson.databind.JsonNode> entry = fields.next();
            com.fasterxml.jackson.databind.JsonNode itemNode = entry.getValue();

            int itemId = itemNode.has("id") ? itemNode.get("id").asInt() : -1;
            if (itemId < 0) continue;

            ItemMeta meta = itemLookupMap.get(itemId);
            Integer def = meta != null ? meta.getDef() : null;
            Integer paint = meta != null ? meta.getPaint() : null;
            String type = meta != null ? meta.getType() : "weapon";

            int seed = itemNode.has("seed") ? itemNode.get("seed").asInt() : 0;
            float wear = itemNode.has("wear") ? (float) itemNode.get("wear").asDouble() : 0.0f;
            String nametag = itemNode.has("nameTag") ? itemNode.get("nameTag").asText() : null;
            int statTrak = itemNode.has("statTrak") ? itemNode.get("statTrak").asInt() : -1;

            boolean equippedCT = itemNode.has("equippedCT") && itemNode.get("equippedCT").asBoolean();
            boolean equippedT = itemNode.has("equippedT") && itemNode.get("equippedT").asBoolean();

            EquippedItemDto dto = EquippedItemDto.builder()
                    .uid(uidCounter++)
                    .def(def)
                    .paint(paint)
                    .seed(seed)
                    .wear(wear)
                    .nametag(nametag)
                    .stattrak(statTrak)
                    .build();

            if ("melee".equalsIgnoreCase(type)) {
                if (equippedCT) response.getKnives().put("3", dto);
                if (equippedT) response.getKnives().put("2", dto);
            } else if ("glove".equalsIgnoreCase(type)) {
                if (equippedCT) response.getGloves().put("3", dto);
                if (equippedT) response.getGloves().put("2", dto);
            } else if ("agent".equalsIgnoreCase(type)) {
                if (equippedCT) response.getAgents().put("3", dto);
                if (equippedT) response.getAgents().put("2", dto);
            } else if (def != null) {
                if (equippedCT) response.getCtWeapons().put(def.toString(), dto);
                if (equippedT) response.getTWeapons().put(def.toString(), dto);
            }
        }

        return response;
    }

    @Transactional(readOnly = true)
    public JsonNode getInventoryByUser(User user) {
        if (user == null || user.getId() == null) {
            return objectMapper.createObjectNode();
        }

        return inventoryRepository.findByUserId(user.getId())
                .map(UserInventory::getItems)
                .map(this::toApiJson)
                .orElseGet(objectMapper::createObjectNode);
    }

    @Transactional
    public void updateInventory(User user, JsonNode items) {
        if (user == null || user.getId() == null) {
            throw new IllegalArgumentException("Authenticated user must have a valid ID");
        }

        UUID userId = user.getId();
        UserInventory inventory = inventoryRepository.findByUserId(userId)
                .orElseGet(() -> UserInventory.builder()
                        .userId(userId)
                        .build());

        inventory.setItems(toPersistenceJson(items));
        inventoryRepository.save(inventory);
        log.info("Inventory updated for user ID: {}", userId);
    }

    private JsonNode toApiJson(com.fasterxml.jackson.databind.JsonNode items) {
        try {
            return objectMapper.readTree(items.toString());
        } catch (JacksonException exception) {
            throw new IllegalStateException("Could not convert persisted inventory JSON", exception);
        }
    }

    private com.fasterxml.jackson.databind.JsonNode toPersistenceJson(JsonNode items) {
        try {
            return persistenceObjectMapper.readTree(items.toString());
        } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
            throw new IllegalArgumentException("Inventory items must be valid JSON", exception);
        }
    }
}
