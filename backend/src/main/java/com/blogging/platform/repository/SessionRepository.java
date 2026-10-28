package com.blogging.platform.repository;

import com.blogging.platform.model.Session;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SessionRepository extends JpaRepository<Session, Long> {
    Optional<Session> findByToken(String token);
    List<Session> findByUserId(Long userId);
}
