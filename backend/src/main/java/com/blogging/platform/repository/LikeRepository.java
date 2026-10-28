package com.blogging.platform.repository;

import com.blogging.platform.model.Like;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LikeRepository extends JpaRepository<Like, Long> {
    Optional<Like> findByUserIdAndBlogPostId(Long userId, Long blogPostId);
    boolean existsByUserIdAndBlogPostId(Long userId, Long blogPostId);
    long countByBlogPostId(Long blogPostId);
    Optional<Like> findByUserIdAndCommentId(Long userId, Long commentId);
    boolean existsByUserIdAndCommentId(Long userId, Long commentId);
    long countByCommentId(Long commentId);
    void deleteByCommentId(Long commentId);
}
