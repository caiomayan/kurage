package com.kurage.api.repository;

import com.kurage.api.domain.LevelSGrant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface LevelSGrantRepository extends JpaRepository<LevelSGrant, LevelSGrant.LevelSGrantId> {

    boolean existsByIdSnapshotDateAndIdUserId(LocalDate snapshotDate, UUID userId);

    @Query("SELECT g FROM LevelSGrant g JOIN FETCH g.user "
            + "WHERE g.id.snapshotDate = :date ORDER BY g.position ASC")
    List<LevelSGrant> findByDateOrderByPosition(@Param("date") LocalDate date);

    /**
     * Limpa as concessões de uma data antes de regravá-las.
     *
     * <p>É o que torna o job diário idempotente: reexecutar depois de um
     * reinício regrava exatamente o mesmo dia em vez de duplicar linhas ou
     * violar a unicidade da posição.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM LevelSGrant g WHERE g.id.snapshotDate = :date")
    int deleteByDate(@Param("date") LocalDate date);

    @Query("SELECT COUNT(g) FROM LevelSGrant g WHERE g.id.snapshotDate = :date")
    long countByDate(@Param("date") LocalDate date);
}
