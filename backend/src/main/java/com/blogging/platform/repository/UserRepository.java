package com.blogging.platform.repository;

import com.blogging.platform.model.User;
import com.blogging.platform.model.enums.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    List<User> findByUsernameContainingIgnoreCaseAndStatusOrderByIdAsc(String username, UserStatus status);
}
