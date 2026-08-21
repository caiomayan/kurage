package com.kurage.api.repository;

import com.kurage.api.domain.UserFaceit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;

@Repository
public interface UserFaceitRepository extends JpaRepository<UserFaceit, UUID> {
    
    @EntityGraph(attributePaths = {"user"})
    Page<UserFaceit> findAllByOrderByEloDesc(Pageable pageable);
}
