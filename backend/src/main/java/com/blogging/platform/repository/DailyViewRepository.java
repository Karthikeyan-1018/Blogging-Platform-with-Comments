package com.blogging.platform.repository;

import com.blogging.platform.model.DailyView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailyViewRepository extends JpaRepository<DailyView, Long> {

    Optional<DailyView> findByBlogPostIdAndDate(Long blogPostId, LocalDate date);

    @Query("SELECT d.date, SUM(d.views) FROM DailyView d JOIN d.blogPost b " +
            "WHERE b.user.id = :userId AND d.date >= :since " +
            "GROUP BY d.date ORDER BY d.date")
    List<Object[]> sumViewsByDateForUser(@Param("userId") Long userId, @Param("since") LocalDate since);
}