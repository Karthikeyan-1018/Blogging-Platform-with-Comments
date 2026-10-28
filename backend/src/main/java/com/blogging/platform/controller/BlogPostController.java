package com.blogging.platform.controller;

import com.blogging.platform.dto.request.BlogRequest;
import com.blogging.platform.model.BlogPost;
import com.blogging.platform.service.BlogPostService;
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
@RequestMapping("/api/posts")
public class BlogPostController {

    @Autowired
    private BlogPostService blogPostService;

    @PostMapping
    public ResponseEntity<BlogPost> createPost(Principal principal, @Valid @RequestBody BlogRequest request) {
        BlogPost post = blogPostService.createPost(principal.getName(), request);
        return new ResponseEntity<>(post, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<Page<BlogPost>> getAllPosts(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String tag,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String direction
    ) {
        Sort sort = direction.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<BlogPost> posts = blogPostService.getAllPosts(categoryId, userId, status, query, tag, pageable);
        return ResponseEntity.ok(posts);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BlogPost> getPostById(Principal principal, @PathVariable Long id) {
        String username = principal != null ? principal.getName() : null;
        BlogPost post = username != null ? blogPostService.getPostById(username, id) : blogPostService.getPostById(id);
        return ResponseEntity.ok(post);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BlogPost> updatePost(Principal principal, @PathVariable Long id, @Valid @RequestBody BlogRequest request) {
        BlogPost updated = blogPostService.updatePost(principal.getName(), id, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deletePost(Principal principal, @PathVariable Long id) {
        blogPostService.deletePost(principal.getName(), id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Blog post deleted successfully");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<BlogPost> publishPost(Principal principal, @PathVariable Long id) {
        BlogPost published = blogPostService.publishPost(principal.getName(), id);
        return ResponseEntity.ok(published);
    }

    @PostMapping("/{id}/like")
    public ResponseEntity<Map<String, Object>> toggleLike(Principal principal, @PathVariable Long id) {
        return ResponseEntity.ok(blogPostService.toggleLikePost(principal.getName(), id));
    }

    @GetMapping("/{id}/like-status")
    public ResponseEntity<Map<String, Object>> getLikeStatus(
            Principal principal, @PathVariable Long id) {
        String username = principal != null ? principal.getName() : null;
        return ResponseEntity.ok(blogPostService.getLikeStatus(username, id));
    }
}
