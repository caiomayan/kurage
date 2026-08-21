package com.kurage.api.repository;

import com.kurage.api.domain.User;
import com.kurage.api.domain.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findBySteamId64(String steamId64);

    Optional<User> findByKurageId(Long kurageId);

    Optional<User> findByUsernameIgnoreCase(String username);

    boolean existsByKurageId(Long kurageId);

    List<User> findTop8ByUsernameContainingIgnoreCaseOrSteamId64ContainingIgnoreCase(String username, String steamId64);

    @Query("SELECT u FROM User u WHERE LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')) OR u.steamId64 LIKE CONCAT('%', :query, '%')")
    Page<User> searchUsers(@Param("query") String query, Pageable pageable);

    @Query("SELECT u FROM User u WHERE LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')) OR u.steamId64 LIKE CONCAT('%', :query, '%') ORDER BY CASE WHEN LOWER(u.username) = LOWER(:query) THEN 0 WHEN LOWER(u.username) LIKE LOWER(CONCAT(:query, '%')) THEN 1 ELSE 2 END, u.username ASC")
    Page<User> searchUsersOrdered(@Param("query") String query, Pageable pageable);

    @Query("SELECT u FROM User u WHERE LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')) OR u.steamId64 LIKE CONCAT('%', :query, '%') ORDER BY CASE WHEN LOWER(u.username) = LOWER(:query) THEN 0 WHEN LOWER(u.username) LIKE LOWER(CONCAT(:query, '%')) THEN 1 ELSE 2 END, u.username ASC")
    List<User> findTopUsersOrdered(@Param("query") String query, Pageable pageable);

    @Query(value = "SELECT nextval('kurage_id_internal_seq')", nativeQuery = true)
    Long getNextKurageIdSequence();

    @Query(value = "SELECT generate_next_kurage_id()", nativeQuery = true)
    Long generateNextKurageId();

    @Query(value = "SELECT COALESCE(MAX(kurage_id), 1000) FROM users", nativeQuery = true)
    Long findMaxKurageId();

    long countByRole(UserRole role);
    long countBySteamId64IsNotNull();
}
