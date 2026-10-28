package com.blogging.platform.service;

import com.blogging.platform.dto.request.CommentRequest;
import com.blogging.platform.model.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CommentService {
    Comment addComment(String username, CommentRequest request);
    Page<Comment> getCommentsByPostId(Long postId, Pageable pageable);
    Page<Comment> getRepliesByCommentId(Long commentId, Pageable pageable);
    Comment updateComment(String username, Long commentId, CommentRequest request);
    void deleteComment(String username, Long commentId);
    Comment hideComment(String username, Long commentId);
    String toggleLikeComment(String username, Long commentId);
    Page<Comment> getPendingComments(String username, Pageable pageable);
    Comment approveComment(String username, Long commentId);
    Comment rejectComment(String username, Long commentId);
}
