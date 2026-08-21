package com.kurage.api.repository;

import com.kurage.api.domain.UserInventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserInventoryRepository extends JpaRepository<UserInventory, UUID> {
    Optional<UserInventory> findByUserId(UUID userId);
    
    // Spring Data JPA custom queries can be added here if needed
}
