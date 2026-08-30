package com.kurage.api.controller;

import com.kurage.api.domain.User;
import com.kurage.api.dto.request.UpdateInventoryRequest;
import com.kurage.api.dto.response.EquippedV5Response;
import com.kurage.api.service.InventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.JsonNode;

@RestController
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping({"/inventory/me", "/api/inventory/me", "/api/cstrike/inventory/me"})
    public ResponseEntity<JsonNode> getMyInventory(@AuthenticationPrincipal User user) {
        JsonNode items = inventoryService.getInventoryByUser(user);
        return ResponseEntity.ok(items);
    }

    @GetMapping({"/inventory/{steamId64}", "/api/inventory/{steamId64}", "/api/cstrike/inventory/{steamId64}"})
    public ResponseEntity<JsonNode> getInventoryBySteamId(@PathVariable String steamId64) {
        JsonNode items = inventoryService.getInventoryBySteamId(steamId64);
        return ResponseEntity.ok(items);
    }

    @GetMapping({
            "/api/equipped/v5/{steamId}",
            "/api/equipped/v5/{steamId}.json",
            "/equipped/v5/{steamId}",
            "/equipped/v5/{steamId}.json"
    })
    public ResponseEntity<EquippedV5Response> getEquippedInventory(@PathVariable String steamId) {
        String cleanSteamId = steamId.replace(".json", "");
        EquippedV5Response response = inventoryService.getEquippedInventoryBySteamId(cleanSteamId);
        return ResponseEntity.ok(response);
    }

    @PutMapping({"/inventory/me", "/api/inventory/me", "/api/cstrike/inventory/me"})
    public ResponseEntity<JsonNode> updateInventory(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody UpdateInventoryRequest request) {
        JsonNode confirmedInventory = inventoryService.updateInventory(user, request.getItems());
        return ResponseEntity.ok(confirmedInventory);
    }
}
