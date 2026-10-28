package com.blogging.platform.service.impl;

import com.blogging.platform.model.BlogPost;
import com.blogging.platform.model.Comment;
import com.blogging.platform.model.User;
import com.blogging.platform.model.enums.BlogStatus;
import com.blogging.platform.model.enums.CommentStatus;
import com.blogging.platform.model.enums.Visibility;
import com.blogging.platform.repository.BlogPostRepository;
import com.blogging.platform.repository.CommentRepository;
import com.blogging.platform.repository.UserRepository;
import com.blogging.platform.service.HomeService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class HomeServiceImpl implements HomeService {

    private static final int TRENDING_LIMIT = 5;
    private static final int CONTRIBUTOR_LIMIT = 5;
    private static final int RECENT_AUTHOR_LIMIT = 6;
    private static final int RECENT_COMMENT_LIMIT = 6;

    private final BlogPostRepository blogPostRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;

    public HomeServiceImpl(BlogPostRepository blogPostRepository,
                           CommentRepository commentRepository,
                           UserRepository userRepository) {
        this.blogPostRepository = blogPostRepository;
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
    }

    @Override
    public List<Map<String, Object>> getTrendingPosts() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (BlogPost post : blogPostRepository.findTop5ByStatusAndVisibilityOrderByViewCountDesc(
                BlogStatus.PUBLISHED, Visibility.PUBLIC)) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", post.getId());
            item.put("title", post.getTitle());
            item.put("slug", post.getSlug());
            item.put("views", post.getViewCount());
            item.put("premium", post.isPremium());
            item.put("category", post.getCategory() != null ? post.getCategory().getName() : null);
            result.add(item);
        }
        return result;
    }

    @Override
    public List<Map<String, Object>> getTopContributors() {
        return authorsBy(Comparator.comparingLong((UserStats s) -> s.count).reversed(), CONTRIBUTOR_LIMIT, true);
    }

    @Override
    public List<Map<String, Object>> getRecentAuthors() {
        return authorsBy(
                Comparator.comparing((UserStats s) -> s.lastPublishedAt, Comparator.nullsLast(Comparator.reverseOrder())),
                RECENT_AUTHOR_LIMIT, false);
    }

    private List<Map<String, Object>> authorsBy(Comparator<UserStats> comparator, int limit, boolean includeCount) {
        List<UserStats> stats = new ArrayList<>();
        for (Object[] row : blogPostRepository.aggregatePostsByUser(BlogStatus.PUBLISHED)) {
            Long userId = ((Number) row[0]).longValue();
            Long count = ((Number) row[1]).longValue();
            Object publishedRaw = row[2];
            stats.add(new UserStats(userId, count, publishedRaw instanceof LocalDateTime ? (LocalDateTime) publishedRaw : null));
        }
        stats.sort(comparator);

        List<Map<String, Object>> result = new ArrayList<>();
        for (UserStats stat : stats.subList(0, Math.min(limit, stats.size()))) {
            User author = userRepository.findById(stat.userId).orElse(null);
            if (author == null) continue;
            Map<String, Object> item = new HashMap<>();
            item.put("id", author.getId());
            item.put("username", author.getUsername());
            item.put("fullName", author.getFullName());
            item.put("profileImage", author.getProfileImage());
            item.put("postCount", stat.count);
            item.put("lastPublishedAt", stat.lastPublishedAt != null ? stat.lastPublishedAt.toString() : null);
            if (!includeCount) {
                item.remove("postCount");
            }
            result.add(item);
        }
        return result;
    }

    @Override
    public List<Map<String, Object>> getRecentComments() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Comment comment : commentRepository.findTop6ByStatusOrderByIdDesc(CommentStatus.ACTIVE)) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", comment.getId());

            String content = comment.getContent();
            String snippet = content != null && content.length() > 110
                    ? content.substring(0, 110) + "..."
                    : content;
            item.put("content", snippet);

            BlogPost post = comment.getBlogPost();
            item.put("postId", post != null ? post.getId() : null);
            item.put("postTitle", post != null ? post.getTitle() : null);
            item.put("postSlug", post != null ? post.getSlug() : null);

            User commenter = comment.getUser();
            Map<String, Object> userMap = new HashMap<>();
            if (commenter != null) {
                userMap.put("id", commenter.getId());
                userMap.put("username", commenter.getUsername());
                userMap.put("fullName", commenter.getFullName());
                userMap.put("profileImage", commenter.getProfileImage());
            }
            item.put("commenter", userMap);
            item.put("createdAt", comment.getCreatedAt() != null ? comment.getCreatedAt().toString() : null);
            result.add(item);
        }
        return result;
    }

    private static class UserStats {
        final Long userId;
        final Long count;
        final LocalDateTime lastPublishedAt;

        UserStats(Long userId, Long count, LocalDateTime lastPublishedAt) {
            this.userId = userId;
            this.count = count;
            this.lastPublishedAt = lastPublishedAt;
        }
    }
}