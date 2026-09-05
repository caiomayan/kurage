package com.kurage.api.controller;

import com.kurage.api.dto.request.RoundEventRequest;
import com.kurage.api.service.RoundIngestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * API do plugin de jogo, versionada em {@code /plugin/v1}.
 *
 * <p>A auditoria registrou como risco P1 que os contratos consumidos pelo plugin
 * não eram versionados. Este nasce versionado para que um servidor com plugin
 * antigo continue funcionando quando o contrato evoluir.
 *
 * <p>Autenticação é a credencial por servidor já existente, no cabeçalho
 * {@code X-Server-Api-Key}, com hash SHA-256 e comparação em tempo constante.
 */
@Slf4j
@RestController
@RequestMapping("/plugin/v1")
@RequiredArgsConstructor
public class PluginRoundController {

    private final RoundIngestionService roundIngestionService;

    /**
     * Registra um round concluído.
     *
     * @return {@code 202} quando o round foi aceito, {@code 200} quando é o
     *         reenvio de um round já registrado — que é comportamento esperado
     *         de um plugin que perdeu a resposta, e não um erro
     */
    @PostMapping("/servers/{serverId}/rounds")
    public ResponseEntity<Void> ingestRound(
            @PathVariable UUID serverId,
            @RequestHeader(value = "X-Server-Api-Key", required = false) String apiKey,
            @Valid @RequestBody RoundEventRequest request) {

        RoundIngestionService.Outcome outcome =
                roundIngestionService.ingest(serverId, apiKey, request);

        return outcome == RoundIngestionService.Outcome.ACCEPTED
                ? ResponseEntity.accepted().build()
                : ResponseEntity.status(HttpStatus.OK).build();
    }
}
