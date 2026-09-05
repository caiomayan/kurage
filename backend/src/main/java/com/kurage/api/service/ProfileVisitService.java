package com.kurage.api.service;

import com.kurage.api.config.TransactionHooks;
import com.kurage.api.domain.ProfileVisit;
import com.kurage.api.domain.User;
import com.kurage.api.dto.response.ProfileVisitorResponse;
import com.kurage.api.repository.ProfileVisitRepository;
import com.kurage.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProfileVisitService {

    private final ProfileVisitRepository profileVisitRepository;
    private final UserRepository userRepository;
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
            log.warn("Redis unavailable for profile visit debounce; checking PostgreSQL: {}", e.getMessage());
            Instant oneHourAgo = Instant.now().minus(Duration.ofHours(1));
            if (profileVisitRepository.existsByVisitedUserIdAndVisitorUserIdAndVisitedAtGreaterThanEqual(
                    visitedUser.getId(), visitorUser.getId(), oneHourAgo)) {
                return;
            }
        }

        ProfileVisit visit = ProfileVisit.builder()
                .visitedUser(visitedUser)
                .visitorUser(visitorUser)
                .build();
        profileVisitRepository.save(visit);
    }

    @Transactional
    public void recordVisitByKurageId(Long visitedKurageId, User visitorUser) {
        if (visitorUser == null) {
            throw new AccessDeniedException("User must be authenticated");
        }
        User visitedUser = findUser(visitedKurageId);
        recordVisit(visitedUser, visitorUser);
    }

    @Transactional(readOnly = true)
    public List<ProfileVisitorResponse> getRecentVisitors(User viewer, Long visitedKurageId, int limit) {
        if (viewer == null) {
            throw new AccessDeniedException("User must be authenticated");
        }

        if (!permissionService.hasFeature(viewer, "PROFILE_VISITORS")) {
            throw new AccessDeniedException("Recurso disponível para assinantes Maré.");
        }

        User visitedUser = findUser(visitedKurageId);
        int pageSize = Math.min(Math.max(limit, 1), 20);
        List<ProfileVisit> visits = profileVisitRepository.findRecentVisitors(
                visitedUser.getId(), PageRequest.of(0, pageSize));

        return visits.stream()
                .map(pv -> new ProfileVisitorResponse(
                        pv.getVisitorUser().getId(),
                        pv.getVisitorUser().getKurageId(),
                        pv.getVisitorUser().getUsername(),
                        pv.getVisitorUser().getAvatarUrl(),
                        pv.getVisitedAt()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProfileVisitorResponse> getRecentVisitors(User viewer, int limit) {
        return getRecentVisitors(viewer, viewer.getKurageId(), limit);
    }

    private User findUser(Long kurageId) {
        if (kurageId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kurage ID is required");
        }
        return userRepository.findByKurageId(kurageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Perfil não encontrado."));
    }
}
