package com.blogging.platform.repository;

import com.blogging.platform.model.BlogPost;
import com.blogging.platform.model.enums.BlogStatus;
import com.blogging.platform.model.enums.Visibility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BlogPostRepository extends JpaRepository<BlogPost, Long> {

    Optional<BlogPost> findBySlug(String slug);

    Page<BlogPost> findByStatusAndVisibility(BlogStatus status, Visibility visibility, Pageable pageable);

    Page<BlogPost> findByUserId(Long userId, Pageable pageable);

    Page<BlogPost> findByCategoryIdAndStatusAndVisibility(Long categoryId, BlogStatus status, Visibility visibility, Pageable pageable);

    List<BlogPost> findTop5ByStatusAndVisibilityOrderByViewCountDesc(BlogStatus status, Visibility visibility);

    @Query("SELECT b.user.id, COUNT(b), MAX(b.publishedAt) FROM BlogPost b " +
            "WHERE b.status = :status GROUP BY b.user.id")
    List<Object[]> aggregatePostsByUser(@Param("status") BlogStatus status);

    @Query("SELECT b FROM BlogPost b WHERE b.status = :status AND b.visibility = :visibility AND " +
            "(LOWER(b.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(b.summary) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(b.content) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<BlogPost> searchPosts(
            @Param("query") String query,
            @Param("status") BlogStatus status,
            @Param("visibility") Visibility visibility,
            Pageable pageable
    );

    @Query("SELECT b FROM BlogPost b WHERE b.status = :status AND b.visibility = :visibility AND " +
            "(:categoryId IS NULL OR b.category.id = :categoryId) AND " +
            "(:userId IS NULL OR b.user.id = :userId)")
    Page<BlogPost> filterPosts(
            @Param("categoryId") Long categoryId,
            @Param("userId") Long userId,
            @Param("status") BlogStatus status,
            @Param("visibility") Visibility visibility,
            Pageable pageable
    );

    @Query("SELECT DISTINCT b FROM BlogPost b JOIN b.tags t WHERE LOWER(t.name) = LOWER(:tag) AND " +
            "b.status = :status AND b.visibility = :visibility")
    Page<BlogPost> searchByTag(
            @Param("tag") String tag,
            @Param("status") BlogStatus status,
            @Param("visibility") Visibility visibility,
            Pageable pageable
    );

    @Modifying
    @Query("UPDATE BlogPost b SET b.viewCount = b.viewCount + 1 WHERE b.id = :id")
    void incrementViewCount(@Param("id") Long id);
}
