package com.blogging.platform.service;

import com.blogging.platform.dto.request.BlogRequest;
import com.blogging.platform.model.BlogPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Map;

public interface BlogPostService {
    BlogPost createPost(String username, BlogRequest request);
    Page<BlogPost> getAllPosts(Long categoryId, Long userId, String status, String query, String tag, Pageable pageable);
    BlogPost getPostById(Long id);
    BlogPost getPostById(String username, Long id);
    BlogPost updatePost(String username, Long id, BlogRequest request);
    void deletePost(String username, Long id);
    BlogPost publishPost(String username, Long id);
    Map<String, Object> toggleLikePost(String username, Long postId);
    Map<String, Object> getLikeStatus(String username, Long postId);
}
