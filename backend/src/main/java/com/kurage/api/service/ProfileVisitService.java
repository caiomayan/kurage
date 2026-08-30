package com.kurage.api.service;

import com.kurage.api.config.TransactionHooks;
import com.kurage.api.domain.ProfileVisit;
import com.kurage.api.domain.User;
import com.kurage.api.dto.response.ProfileVisitorResponse;
import com.kurage.api.repository.ProfileVisitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProfileVisitService {

    private final ProfileVisitRepository profileVisitRepository;
    private final PermissionService permissionService;
    private final StringRedisTemplate redisTemplate;

    @Transactional
    public void recordVisit(User visitedUser, User visitorUser) {
        if (visitedUser == null || visitorUser == null) {
            return;
        }

        // Não registra auto-visitas
        if (visitedUser.getId().equals(visitorUser.getId())) {
            return;
        }

        String rateLimitKey = "ratelimit:visit:" + visitorUser.getId() + ":" + visitedUser.getId();
        try {
            Boolean wasSet = redisTemplate.opsForValue().setIfAbsent(rateLimitKey, "1", Duration.ofHours(1));

            // Se já existia registro no Redis na última hora, não grava de novo
            if (Boolean.FALSE.equals(wasSet)) {
                return;
            }
            TransactionHooks.afterRollback(() -> {
                try {
                    redisTemplate.delete(rateLimitKey);
                } catch (Exception rollbackCleanupException) {
                    log.warn("Redis unavailable while releasing rolled-back profile visit debounce: {}",
                            rollbackCleanupException.getMessage());
                }
            });
        } catch (Exception e) {
            log.warn("Redis unavailable for profile visit rate limit debounce (proceeding with db save): {}", e.getMessage());
        }

        ProfileVisit visit = ProfileVisit.builder()
                .visitedUser(visitedUser)
                .visitorUser(visitorUser)
                .build();
        profileVisitRepository.save(visit);
    }

    @Transactional(readOnly = true)
    public List<ProfileVisitorResponse> getRecentVisitors(User user, int limit) {
        if (user == null) {
            throw new AccessDeniedException("User must be authenticated");
        }

        if (!permissionService.hasFeature(user, "PROFILE_VISITORS")) {
            throw new AccessDeniedException("Recurso disponível para assinantes Maré.");
        }

        int pageSize = Math.min(Math.max(limit, 1), 50);
        List<ProfileVisit> visits = profileVisitRepository.findRecentVisitors(user.getId(), PageRequest.of(0, pageSize));

        return visits.stream()
                .map(pv -> {
                    User visitor = pv.getVisitorUser();
                    int level = 1;
                    int elo = 200;
                    if (visitor.getPlayerStats() != null) {
                        elo = visitor.getPlayerStats().getKurageElo() != null ? visitor.getPlayerStats().getKurageElo() : 200;
                        level = visitor.getPlayerStats().getKurageLevel();
                    }
                    return new ProfileVisitorResponse(
                            visitor.getId(),
                            visitor.getKurageId(),
                            visitor.getUsername(),
                            visitor.getAvatarUrl(),
                            visitor.getCountry(),
                            level,
                            elo,
                            visitor.isVerifiedPro(),
                            pv.getVisitedAt()
                    );
                })
                .collect(Collectors.toList());
    }
}
