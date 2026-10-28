package com.blogging.platform.controller;

import com.blogging.platform.dto.request.CommentRequest;
import com.blogging.platform.model.Comment;
import com.blogging.platform.service.CommentService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class CommentController {

    @Autowired
    private CommentService commentService;

    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<Comment> addComment(
            Principal principal,
            @PathVariable Long postId,
            @Valid @RequestBody CommentRequest request
    ) {
        request.setBlogPostId(postId);
        Comment comment = commentService.addComment(principal.getName(), request);
        return new ResponseEntity<>(comment, HttpStatus.CREATED);
    }

    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<Page<Comment>> getComments(
            @PathVariable Long postId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Comment> comments = commentService.getCommentsByPostId(postId, pageable);
        return ResponseEntity.ok(comments);
    }

    @GetMapping("/comments/{commentId}/replies")
    public ResponseEntity<Page<Comment>> getReplies(
            @PathVariable Long commentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").ascending());
        Page<Comment> replies = commentService.getRepliesByCommentId(commentId, pageable);
        return ResponseEntity.ok(replies);
    }

    @PutMapping("/comments/{id}")
    public ResponseEntity<Comment> updateComment(
            Principal principal,
            @PathVariable Long id,
            @Valid @RequestBody CommentRequest request
    ) {
        Comment updated = commentService.updateComment(principal.getName(), id, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Map<String, String>> deleteComment(Principal principal, @PathVariable Long id) {
        commentService.deleteComment(principal.getName(), id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Comment deleted successfully");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/comments/{id}/like")
    public ResponseEntity<Map<String, String>> toggleLike(Principal principal, @PathVariable Long id) {
        String message = commentService.toggleLikeComment(principal.getName(), id);
        Map<String, String> response = new HashMap<>();
        response.put("message", message);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/comments/{id}/hide")
    public ResponseEntity<Map<String, String>> hideComment(Principal principal, @PathVariable Long id) {
        commentService.hideComment(principal.getName(), id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Comment hidden successfully");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/moderation/comments/pending")
    public ResponseEntity<Page<Comment>> getPendingComments(
            Principal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").ascending());
        return ResponseEntity.ok(commentService.getPendingComments(principal.getName(), pageable));
    }

    @PostMapping("/comments/{id}/approve")
    public ResponseEntity<Map<String, String>> approveComment(Principal principal, @PathVariable Long id) {
        commentService.approveComment(principal.getName(), id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Comment approved successfully");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/comments/{id}/reject")
    public ResponseEntity<Map<String, String>> rejectComment(Principal principal, @PathVariable Long id) {
        commentService.rejectComment(principal.getName(), id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Comment rejected successfully");
        return ResponseEntity.ok(response);
    }
}
