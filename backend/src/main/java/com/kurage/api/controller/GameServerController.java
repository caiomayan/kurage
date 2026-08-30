package com.kurage.api.controller;

import com.kurage.api.domain.GameMode;
import com.kurage.api.dto.request.GameServerHeartbeatRequest;
import com.kurage.api.dto.response.GameServerResponse;
import com.kurage.api.service.GameServerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/servers")
@RequiredArgsConstructor
public class GameServerController {

    private final GameServerService gameServerService;

    @GetMapping
    public ResponseEntity<List<GameServerResponse>> getServers(@RequestParam(required = false) GameMode mode) {
        if (mode != null) {
            return ResponseEntity.ok(gameServerService.getByMode(mode));
        }
        return ResponseEntity.ok(gameServerService.getAllServers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<GameServerResponse> getServerById(@PathVariable UUID id) {
        return ResponseEntity.ok(gameServerService.getById(id));
    }

    @PostMapping("/{id}/heartbeat")
    public ResponseEntity<GameServerResponse> processHeartbeat(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Server-Api-Key", required = false) String apiKey,
            @Valid @RequestBody GameServerHeartbeatRequest request) {

        GameServerResponse response = gameServerService.processAuthenticatedHeartbeat(id, apiKey, request);
        return ResponseEntity.ok(response);
    }
}
