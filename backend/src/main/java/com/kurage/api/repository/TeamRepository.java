package com.kurage.api.repository;

import com.kurage.api.domain.Team;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeamRepository extends JpaRepository<Team, UUID> {
    @EntityGraph(attributePaths = {"owner", "members", "members.user"})
    Optional<Team> findById(UUID id);

    @EntityGraph(attributePaths = {"owner", "members", "members.user"})
    Optional<Team> findByTagIgnoreCase(String tag);

    boolean existsByNameIgnoreCase(String name);
    
    boolean existsByTagIgnoreCase(String tag);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM Team t WHERE t.id = :id")
    Optional<Team> findByIdWithLock(@Param("id") UUID id);

    @EntityGraph(attributePaths = {"owner", "members", "members.user"})
    Optional<Team> findByNameIgnoreCase(String name);

    @EntityGraph(attributePaths = {"owner", "members", "members.user"})
    @Query("SELECT t FROM Team t JOIN t.members m WHERE m.user.id = :userId")
    List<Team> findAllByMemberUserId(@Param("userId") UUID userId);

    @Query("SELECT t FROM Team t ORDER BY t.teamElo DESC")
    Page<Team> findAllOrderByTeamEloDesc(Pageable pageable);

    @Query("SELECT t FROM Team t WHERE LOWER(t.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(t.tag) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<Team> searchTeams(@Param("query") String query, Pageable pageable);

    @EntityGraph(attributePaths = {"members"})
    @Query("SELECT t FROM Team t WHERE LOWER(t.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(t.tag) LIKE LOWER(CONCAT('%', :query, '%')) ORDER BY CASE WHEN LOWER(t.tag) = LOWER(:query) THEN 0 WHEN LOWER(t.name) = LOWER(:query) THEN 1 WHEN LOWER(t.name) LIKE LOWER(CONCAT(:query, '%')) THEN 2 ELSE 3 END, t.teamElo DESC")
    Page<Team> searchTeamsOrdered(@Param("query") String query, Pageable pageable);

    @EntityGraph(attributePaths = {"members"})
    @Query("SELECT t FROM Team t WHERE LOWER(t.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(t.tag) LIKE LOWER(CONCAT('%', :query, '%')) ORDER BY CASE WHEN LOWER(t.tag) = LOWER(:query) THEN 0 WHEN LOWER(t.name) = LOWER(:query) THEN 1 WHEN LOWER(t.name) LIKE LOWER(CONCAT(:query, '%')) THEN 2 ELSE 3 END, t.teamElo DESC")
    List<Team> findTopTeamsOrdered(@Param("query") String query, Pageable pageable);

    @Query("SELECT t FROM Team t WHERE LOWER(t.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(t.tag) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Team> findTop8ByNameContainingIgnoreCaseOrTagContainingIgnoreCase(@Param("query") String query);

    @Query("SELECT COUNT(t) + 1 FROM Team t WHERE t.teamElo > :elo")
    Integer findLeaderboardPosition(Integer elo);
}
