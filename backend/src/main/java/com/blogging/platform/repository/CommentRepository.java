package com.blogging.platform.repository;

import com.blogging.platform.model.Comment;
import com.blogging.platform.model.enums.CommentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    Page<Comment> findByBlogPostIdAndStatusAndParentCommentIsNull(Long blogPostId, CommentStatus status, Pageable pageable);
    Page<Comment> findByParentCommentIdAndStatus(Long parentCommentId, CommentStatus status, Pageable pageable);
    long countByStatus(CommentStatus status);
    Page<Comment> findByStatus(CommentStatus status, Pageable pageable);
    List<Comment> findTop6ByStatusOrderByIdDesc(CommentStatus status);
}
