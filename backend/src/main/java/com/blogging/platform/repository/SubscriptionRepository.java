package com.blogging.platform.repository;

import com.blogging.platform.model.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    Optional<Subscription> findBySubscriberIdAndAuthorId(Long subscriberId, Long authorId);
    boolean existsBySubscriberIdAndAuthorId(Long subscriberId, Long authorId);
    long countByAuthorId(Long authorId);
    List<Subscription> findBySubscriberId(Long subscriberId);
}