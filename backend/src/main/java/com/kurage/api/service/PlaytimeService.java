package com.kurage.api.service;

import com.kurage.api.dto.response.GameServerResponse;
import com.kurage.api.repository.PlayerStatsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Acumula o tempo que a plataforma observou um jogador em servidores Kurage.
 *
 * <p>O documento 19 §6 usa "menos horas jogadas" como terceiro critério de
 * desempate do ranking, então esse tempo precisa ser um dado persistido. Como
 * ainda não existe motor de partida, a única evidência disponível é a presença
 * reportada pelo heartbeat, que chega a cada dez segundos ou mais com a lista de
 * jogadores conectados.
 *
 * <p>A medida é deliberadamente conservadora. Cada heartbeat credita apenas o
 * intervalo desde o avistamento anterior, limitado à janela de validade do
 * heartbeat: se o servidor ficou mudo por dez minutos, esses dez minutos não
 * viram tempo jogado. Um jogador sem avistamento anterior não recebe nada, só
 * passa a ser observado. Espectador não acumula e ainda quebra a corrente, para
 * que o tempo assistindo não seja creditado quando ele voltar a jogar.
 *
 * <p>O Redis guarda apenas o último avistamento, que é presença efêmera — o uso
 * que a invariante 4 permite. O total acumulado vive no PostgreSQL.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PlaytimeService {

    private static final String PRESENCE_PREFIX = "presence:server:";

    /**
     * Teto de crédito por heartbeat. É a mesma janela em que a telemetria do
     * servidor é considerada válida: além dela a instância é tratada como
     * offline, então também não há por que creditar tempo.
     */
    public static final Duration MAX_CREDIT = GameServerResponse.HEARTBEAT_STALE_AFTER;

    private final StringRedisTemplate redisTemplate;
    private final PlayerStatsRepository playerStatsRepository;

    /**
     * Registra a presença de um jogador vinculado e credita o tempo decorrido.
     *
     * @param team time reportado pelo heartbeat; {@code SPEC}, nulo ou vazio não
     *             acumulam
     * @return segundos creditados nesta chamada, zero quando não há o que creditar
     */
    public long recordPresence(UUID serverId, String steamId64, UUID userId, String team) {
        if (serverId == null || steamId64 == null || steamId64.isBlank() || userId == null) {
            return 0L;
        }

        String key = PRESENCE_PREFIX + serverId + ":player:" + steamId64;

        if (!isPlaying(team)) {
            // Assistir não é jogar, e o intervalo de espectador não pode ser
            // creditado depois que o jogador entrar em um time.
            forget(key);
            return 0L;
        }

        Instant now = Instant.now();
        Instant lastSeen = readLastSeen(key);
        remember(key, now);

        if (lastSeen == null) {
            // Primeiro avistamento, ou a chave expirou porque o servidor ficou
            // mudo além da janela. Nada a creditar: começamos a medir agora.
            return 0L;
        }

        long elapsed = Duration.between(lastSeen, now).getSeconds();
        if (elapsed <= 0) {
            // Relógio para trás ou dois heartbeats no mesmo segundo.
            return 0L;
        }

        long credited = Math.min(elapsed, MAX_CREDIT.getSeconds());
        playerStatsRepository.addPlaytimeSeconds(userId, credited);
        return credited;
    }

    private boolean isPlaying(String team) {
        if (team == null || team.isBlank()) return false;
        String normalized = team.trim().toUpperCase();
        return normalized.equals("CT") || normalized.equals("TR") || normalized.equals("T");
    }

    private Instant readLastSeen(String key) {
        try {
            String raw = redisTemplate.opsForValue().get(key);
            if (raw == null || raw.isBlank()) return null;
            return Instant.ofEpochSecond(Long.parseLong(raw.trim()));
        } catch (Exception e) {
            // Sem Redis não há como medir o intervalo. Tempo jogado é uma métrica,
            // não uma fronteira de segurança: deixar de creditar é preferível a
            // recusar o heartbeat.
            log.debug("Redis unavailable while reading presence: {}", e.getMessage());
            return null;
        }
    }

    private void remember(String key, Instant now) {
        try {
            redisTemplate.opsForValue().set(key, Long.toString(now.getEpochSecond()), MAX_CREDIT);
        } catch (Exception e) {
            log.debug("Redis unavailable while writing presence: {}", e.getMessage());
        }
    }

    private void forget(String key) {
        try {
            redisTemplate.delete(key);
        } catch (Exception e) {
            log.debug("Redis unavailable while clearing presence: {}", e.getMessage());
        }
    }
}
