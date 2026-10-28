package com.blogging.platform.repository;

import com.blogging.platform.model.Analytics;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AnalyticsRepository extends JpaRepository<Analytics, Long> {
    Optional<Analytics> findByBlogPostId(Long blogPostId);
}
