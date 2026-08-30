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
            return emptyInventory();
        }

        return inventoryRepository.findByUserId(userOpt.get().getId())
                .map(UserInventory::getItems)
                .map(this::toCanonicalApiInventory)
                .orElseGet(this::emptyInventory);
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

        Iterator<Map.Entry<String, com.fasterxml.jackson.databind.JsonNode>> fields = itemsNode.properties().iterator();
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
                    .stickers(toEquippedStickers(itemNode))
                    .keychains(toEquippedKeychains(itemNode))
                    .build();

            if ("musickit".equalsIgnoreCase(type)) {
                // A music kit is a single global slot, not a CT/TR loadout item.
                response.setMusicKit(dto);
            } else if ("melee".equalsIgnoreCase(type)) {
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

    /**
     * Converts Kurage's economy item IDs stored in PostgreSQL to the CS2 sticker
     * kit identifiers required by Inventory Simulator's equipped v5 endpoint.
     */
    private List<EquippedStickerDto> toEquippedStickers(com.fasterxml.jackson.databind.JsonNode itemNode) {
        com.fasterxml.jackson.databind.JsonNode stickersNode = itemNode.get("stickers");
        if (stickersNode == null || !stickersNode.isObject()) {
            return null;
        }

        List<EquippedStickerDto> stickers = new ArrayList<>();
        Iterator<Map.Entry<String, com.fasterxml.jackson.databind.JsonNode>> fields = stickersNode.properties().iterator();
        while (fields.hasNext()) {
            Map.Entry<String, com.fasterxml.jackson.databind.JsonNode> entry = fields.next();
            Byte slot = toSlot(entry.getKey());
            com.fasterxml.jackson.databind.JsonNode stickerNode = entry.getValue();
            ItemMeta meta = itemLookupMap.get(optionalInteger(stickerNode, "id"));

            if (slot == null || meta == null || meta.getPaint() == null) {
                continue;
            }

            stickers.add(EquippedStickerDto.builder()
                    .slot(slot)
                    .def(meta.getPaint())
                    .schema(optionalInteger(stickerNode, "schema"))
                    .wear(optionalFloat(stickerNode, "wear"))
                    .rotation(optionalFloat(stickerNode, "rotation"))
                    .x(optionalFloat(stickerNode, "x"))
                    .y(optionalFloat(stickerNode, "y"))
                    .build());
        }

        return stickers.isEmpty() ? null : stickers;
    }

    private List<EquippedKeychainDto> toEquippedKeychains(com.fasterxml.jackson.databind.JsonNode itemNode) {
        com.fasterxml.jackson.databind.JsonNode keychainsNode = itemNode.get("keychains");
        if (keychainsNode == null || !keychainsNode.isObject()) {
            return null;
        }

        List<EquippedKeychainDto> keychains = new ArrayList<>();
        Iterator<Map.Entry<String, com.fasterxml.jackson.databind.JsonNode>> fields = keychainsNode.properties().iterator();
        while (fields.hasNext()) {
            Map.Entry<String, com.fasterxml.jackson.databind.JsonNode> entry = fields.next();
            Byte slot = toSlot(entry.getKey());
            com.fasterxml.jackson.databind.JsonNode keychainNode = entry.getValue();
            ItemMeta meta = itemLookupMap.get(optionalInteger(keychainNode, "id"));

            if (slot == null || meta == null || meta.getPaint() == null) {
                continue;
            }

            keychains.add(EquippedKeychainDto.builder()
                    .slot(slot)
                    .def(meta.getPaint())
                    .seed(optionalInteger(keychainNode, "seed"))
                    .sticker(optionalInteger(keychainNode, "sticker"))
                    .x(optionalFloat(keychainNode, "x"))
                    .y(optionalFloat(keychainNode, "y"))
                    .z(optionalFloat(keychainNode, "z"))
                    .build());
        }

        return keychains.isEmpty() ? null : keychains;
    }

    private Byte toSlot(String value) {
        try {
            int slot = Integer.parseInt(value);
            return slot >= 0 && slot <= Byte.MAX_VALUE ? (byte) slot : null;
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private Integer optionalInteger(com.fasterxml.jackson.databind.JsonNode node, String field) {
        com.fasterxml.jackson.databind.JsonNode value = node.get(field);
        return value != null && value.isIntegralNumber() ? value.intValue() : null;
    }

    private Float optionalFloat(com.fasterxml.jackson.databind.JsonNode node, String field) {
        com.fasterxml.jackson.databind.JsonNode value = node.get(field);
        return value != null && value.isNumber() ? value.floatValue() : null;
    }

    @Transactional(readOnly = true)
    public JsonNode getInventoryByUser(User user) {
        if (user == null || user.getId() == null) {
            return emptyInventory();
        }

        return inventoryRepository.findByUserId(user.getId())
                .map(UserInventory::getItems)
                .map(this::toCanonicalApiInventory)
                .orElseGet(this::emptyInventory);
    }

    @Transactional
    public JsonNode updateInventory(User user, JsonNode items) {
        if (user == null || user.getId() == null) {
            throw new IllegalArgumentException("Authenticated user must have a valid ID");
        }

        UUID userId = user.getId();
        UserInventory inventory = inventoryRepository.findByUserId(userId)
                .orElseGet(() -> UserInventory.builder()
                        .userId(userId)
                        .build());

        JsonNode canonicalInventory = requireCanonicalInventory(items);
        inventory.setItems(toPersistenceJson(canonicalInventory));
        UserInventory persistedInventory = inventoryRepository.saveAndFlush(inventory);
        log.info("Inventory updated for user ID: {}", userId);
        return toCanonicalApiInventory(persistedInventory.getItems());
    }

    /**
     * The browser library requires this exact envelope even when the player has
     * no custom items. Returning {} made a newly authenticated inventory fail
     * validation until the first successful PUT happened to create the envelope.
     */
    private JsonNode emptyInventory() {
        var inventory = objectMapper.createObjectNode();
        inventory.set("items", objectMapper.createObjectNode());
        inventory.put("version", 2);
        return inventory;
    }

    private JsonNode toCanonicalApiInventory(com.fasterxml.jackson.databind.JsonNode persistedItems) {
        JsonNode inventory = toApiJson(persistedItems);
        if (!isCanonicalInventory(inventory)) {
            log.warn("Ignoring malformed persisted inventory payload and returning an empty canonical inventory");
            return emptyInventory();
        }
        return inventory;
    }

    private JsonNode requireCanonicalInventory(JsonNode inventory) {
        if (!isCanonicalInventory(inventory)) {
            throw new IllegalArgumentException("Inventory must contain an object 'items' and a numeric 'version'");
        }
        requireSingleMusicKit(inventory);
        return inventory;
    }

    private void requireSingleMusicKit(JsonNode inventory) {
        int musicKitCount = 0;
        for (JsonNode itemNode : inventory.path("items")) {
            ItemMeta meta = itemLookupMap.get(itemNode.path("id").asInt(-1));
            if (meta != null && "musickit".equalsIgnoreCase(meta.getType()) && ++musicKitCount > 1) {
                throw new IllegalArgumentException("Inventory supports only one music kit slot");
            }
        }
    }

    private boolean isCanonicalInventory(JsonNode inventory) {
        return inventory != null
                && inventory.isObject()
                && inventory.path("items").isObject()
                && inventory.path("version").isNumber();
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
