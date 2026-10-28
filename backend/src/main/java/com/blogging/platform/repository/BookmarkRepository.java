package com.blogging.platform.repository;

import com.blogging.platform.model.Bookmark;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {
    Optional<Bookmark> findByUserIdAndBlogPostId(Long userId, Long blogPostId);
    Page<Bookmark> findByUserId(Long userId, Pageable pageable);
    boolean existsByUserIdAndBlogPostId(Long userId, Long blogPostId);
}
