package com.blogging.platform.service.impl;

import com.blogging.platform.dto.request.BlogRequest;
import com.blogging.platform.exception.ContentNotFoundException;
import com.blogging.platform.exception.InvalidContentException;
import com.blogging.platform.exception.UnauthorizedAccessException;
import com.blogging.platform.model.BlogPost;
import com.blogging.platform.model.Category;
import com.blogging.platform.model.DailyView;
import com.blogging.platform.model.Like;
import com.blogging.platform.model.Tag;
import com.blogging.platform.model.User;
import com.blogging.platform.model.enums.BlogStatus;
import com.blogging.platform.model.enums.NotificationType;
import com.blogging.platform.model.enums.RoleType;
import com.blogging.platform.model.enums.Visibility;
import com.blogging.platform.repository.BlogPostRepository;
import com.blogging.platform.repository.CategoryRepository;
import com.blogging.platform.repository.DailyViewRepository;
import com.blogging.platform.repository.LikeRepository;
import com.blogging.platform.repository.SubscriptionRepository;
import com.blogging.platform.repository.TagRepository;
import com.blogging.platform.repository.UserRepository;
import com.blogging.platform.service.AuditService;
import com.blogging.platform.service.BlogPostService;
import com.blogging.platform.service.NotificationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional
public class BlogPostServiceImpl implements BlogPostService {

    private final BlogPostRepository blogPostRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final TagRepository tagRepository;
    private final LikeRepository likeRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final DailyViewRepository dailyViewRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    public BlogPostServiceImpl(BlogPostRepository blogPostRepository, UserRepository userRepository,
                              CategoryRepository categoryRepository, TagRepository tagRepository,
                              LikeRepository likeRepository, SubscriptionRepository subscriptionRepository,
                              DailyViewRepository dailyViewRepository,
                              NotificationService notificationService, AuditService auditService) {
        this.blogPostRepository = blogPostRepository;
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.tagRepository = tagRepository;
        this.likeRepository = likeRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.dailyViewRepository = dailyViewRepository;
        this.notificationService = notificationService;
        this.auditService = auditService;
    }

    @Override
    public BlogPost createPost(String username, BlogRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + username));

        if (user.getRole().getRoleName() == RoleType.MODERATOR) {
            throw new UnauthorizedAccessException("Moderators cannot create blog posts");
        }

        if (request.getTitle() == null || request.getTitle().trim().length() < 5 || request.getTitle().trim().length() > 200) {
            throw new InvalidContentException("Title must be between 5 and 200 characters");
        }
        if (request.getContent() == null || request.getContent().trim().length() < 50) {
            throw new InvalidContentException("Content must be at least 50 characters");
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new InvalidContentException("Please select a category"));

        BlogPost post = new BlogPost();
        post.setTitle(request.getTitle());
        post.setContent(request.getContent());
        post.setSummary(request.getSummary());
        post.setUser(user);
        post.setCategory(category);
        post.setFeaturedImage(request.getFeaturedImage());
        post.setReadingTime(estimateReadingTime(request.getContent()));

        // Premium flag - only PREMIUM_BLOGGER (or ADMIN) may mark content as premium
        boolean premium = Boolean.TRUE.equals(request.getPremium());
        RoleType role = user.getRole().getRoleName();
        if (premium && role != RoleType.PREMIUM_BLOGGER && role != RoleType.ADMIN) {
            throw new UnauthorizedAccessException("Only premium bloggers can publish premium content");
        }
        post.setPremium(premium);

        // Generate unique slug
        String baseSlug = request.getTitle().toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-");
        String slug = baseSlug;
        int count = 1;
        while (blogPostRepository.findBySlug(slug).isPresent()) {
            slug = baseSlug + "-" + count++;
        }
        post.setSlug(slug);

        // Status
        BlogStatus status = BlogStatus.DRAFT;
        if (request.getStatus() != null) {
            try {
                status = BlogStatus.valueOf(request.getStatus().toUpperCase());
            } catch (IllegalArgumentException e) {
                status = BlogStatus.DRAFT;
            }
        }
        post.setStatus(status);
        if (status == BlogStatus.PUBLISHED) {
            post.setPublishedAt(LocalDateTime.now());
        }

        // Visibility
        Visibility visibility = Visibility.PUBLIC;
        if (request.getVisibility() != null) {
            try {
                visibility = Visibility.valueOf(request.getVisibility().toUpperCase());
            } catch (IllegalArgumentException e) {
                visibility = Visibility.PUBLIC;
            }
        }
        post.setVisibility(visibility);

        // Tags
        List<Tag> tags = new ArrayList<>();
        if (request.getTags() != null) {
            for (String tagName : request.getTags()) {
                String normalizedTag = tagName.trim().toLowerCase();
                Tag tag = tagRepository.findByName(normalizedTag)
                        .orElseGet(() -> {
                            Tag newTag = new Tag();
                            newTag.setName(normalizedTag);
                            newTag.setSlug(normalizedTag.replaceAll("\\s+", "-"));
                            newTag.setUsageCount(0);
                            return tagRepository.save(newTag);
                        });
                tag.setUsageCount(tag.getUsageCount() + 1);
                tagRepository.save(tag);
                tags.add(tag);
            }
        }
        post.setTags(tags);

        return blogPostRepository.save(post);
    }

    @Override
    public Page<BlogPost> getAllPosts(Long categoryId, Long userId, String status, String query, String tag, Pageable pageable) {
        BlogStatus blogStatus = null;
        if (status != null) {
            try {
                blogStatus = BlogStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                blogStatus = BlogStatus.PUBLISHED;
            }
        } else {
            blogStatus = BlogStatus.PUBLISHED;
        }

        Page<BlogPost> result;
        if (query != null && !query.trim().isEmpty()) {
            result = blogPostRepository.searchPosts(query, blogStatus, Visibility.PUBLIC, pageable);
        } else if (tag != null && !tag.trim().isEmpty()) {
            result = blogPostRepository.searchByTag(tag.trim().toLowerCase(), blogStatus, Visibility.PUBLIC, pageable);
        } else {
            result = blogPostRepository.filterPosts(categoryId, userId, blogStatus, Visibility.PUBLIC, pageable);
        }

        // Mask premium content in feed listings (never mutate persisted entities)
        List<BlogPost> content = new ArrayList<>(result.getContent().size());
        for (BlogPost post : result.getContent()) {
            if (post.getUser() != null) {
                post.setAuthorId(post.getUser().getId());
                post.setAuthorUsername(post.getUser().getUsername());
            }
            if (post.isPremium()) {
                content.add(maskedCopy(post));
            } else {
                content.add(post);
            }
        }
        return new PageImpl<>(content, pageable, result.getTotalElements());
    }

    @Override
    public BlogPost getPostById(Long id) {
        return getPostById(null, id);
    }

    @Override
    public BlogPost getPostById(String username, Long id) {
        BlogPost post = blogPostRepository.findById(id)
                .orElseThrow(() -> new ContentNotFoundException("Blog post not found with ID: " + id));

        blogPostRepository.incrementViewCount(id);
        recordDailyView(id);

        if (post.getUser() != null) {
            post.setAuthorId(post.getUser().getId());
            post.setAuthorUsername(post.getUser().getUsername());
        }

        if (post.isPremium() && !canViewPremium(username, post)) {
            return maskedCopy(post);
        }
        return post;
    }

    private BlogPost maskedCopy(BlogPost post) {
        String teaser = post.getSummary() != null && !post.getSummary().isBlank()
                ? post.getSummary()
                : "This is a premium story. Subscribe to read the full article.";
        BlogPost masked = new BlogPost();
        masked.setId(post.getId());
        masked.setTitle(post.getTitle());
        masked.setSlug(post.getSlug());
        masked.setSummary(post.getSummary());
        masked.setFeaturedImage(post.getFeaturedImage());
        masked.setStatus(post.getStatus());
        masked.setVisibility(post.getVisibility());
        masked.setPremium(true);
        masked.setPremiumLocked(true);
        if (post.getUser() != null) {
            masked.setAuthorId(post.getUser().getId());
            masked.setAuthorUsername(post.getUser().getUsername());
        }
        masked.setReadingTime(post.getReadingTime());
        masked.setViewCount(post.getViewCount());
        masked.setCreatedAt(post.getCreatedAt());
        masked.setUpdatedAt(post.getUpdatedAt());
        masked.setPublishedAt(post.getPublishedAt());
        masked.setContent("<p>" + teaser + "</p>");
        return masked;
    }

    private void recordDailyView(Long postId) {
        LocalDate today = LocalDate.now();
        DailyView dailyView = dailyViewRepository.findByBlogPostIdAndDate(postId, today)
                .orElseGet(() -> {
                    DailyView dv = new DailyView();
                    dv.setBlogPost(blogPostRepository.getReferenceById(postId));
                    dv.setDate(today);
                    dv.setViews(0);
                    return dv;
                });
        dailyView.setViews(dailyView.getViews() + 1);
        dailyViewRepository.save(dailyView);
    }

    private int estimateReadingTime(String content) {
        if (content == null || content.isBlank()) return 1;
        String plain = content.replaceAll("<[^>]*>", " ");
        int words = plain.trim().isEmpty() ? 0 : plain.trim().split("\\s+").length;
        return Math.max(1, (words + 199) / 200);
    }

    private boolean canViewPremium(String username, BlogPost post) {
        if (username == null) return false;
        return userRepository.findByUsername(username).map(user -> {
            if (post.getUser() != null && post.getUser().getId().equals(user.getId())) return true;
            RoleType role = user.getRole().getRoleName();
            if (role == RoleType.ADMIN || role == RoleType.MODERATOR) return true;
            if (role == RoleType.PREMIUM_BLOGGER) return true;
            return subscriptionRepository.existsBySubscriberIdAndAuthorId(user.getId(), post.getUser().getId());
        }).orElse(false);
    }

    @Override
    public BlogPost updatePost(String username, Long id, BlogRequest request) {
        BlogPost post = blogPostRepository.findById(id)
                .orElseThrow(() -> new ContentNotFoundException("Blog post not found with ID: " + id));

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + username));

        // Check ownership and permissions
        boolean isOwner = post.getUser().getUsername().equals(username);
        boolean isAdmin = user.getRole().getRoleName() == RoleType.ADMIN;
        boolean isModerator = user.getRole().getRoleName() == RoleType.MODERATOR;

        if (isModerator) {
            throw new UnauthorizedAccessException("Moderators cannot edit blog posts");
        }
        if (!isOwner && !isAdmin) {
            throw new UnauthorizedAccessException("You do not have permission to modify this post");
        }

        if (request.getTitle() != null) {
            if (request.getTitle().trim().length() < 5 || request.getTitle().trim().length() > 200) {
                throw new InvalidContentException("Title must be between 5 and 200 characters");
            }
            post.setTitle(request.getTitle());
        }
        if (request.getContent() != null) {
            if (request.getContent().trim().length() < 50) {
                throw new InvalidContentException("Content must be at least 50 characters");
            }
            post.setContent(request.getContent());
            post.setReadingTime(estimateReadingTime(request.getContent()));
        }
        if (request.getSummary() != null) {
            post.setSummary(request.getSummary());
        }
        if (request.getFeaturedImage() != null) {
            post.setFeaturedImage(request.getFeaturedImage());
        }

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new InvalidContentException("Please select a category"));
            post.setCategory(category);
        }

        if (request.getStatus() != null) {
            try {
                BlogStatus status = BlogStatus.valueOf(request.getStatus().toUpperCase());
                post.setStatus(status);
                if (status == BlogStatus.PUBLISHED && post.getPublishedAt() == null) {
                    post.setPublishedAt(LocalDateTime.now());
                }
            } catch (IllegalArgumentException ignored) {}
        }

        if (request.getVisibility() != null) {
            try {
                Visibility visibility = Visibility.valueOf(request.getVisibility().toUpperCase());
                post.setVisibility(visibility);
            } catch (IllegalArgumentException ignored) {}
        }

        // Premium flag updates - only premium bloggers (or admins) may set it
        if (request.getPremium() != null) {
            RoleType role = user.getRole().getRoleName();
            boolean premium = request.getPremium();
            if (premium && role != RoleType.PREMIUM_BLOGGER && role != RoleType.ADMIN) {
                throw new UnauthorizedAccessException("Only premium bloggers can publish premium content");
            }
            post.setPremium(premium);
        }

        // Tags update
        if (request.getTags() != null) {
            // Decrement usage for old tags
            for (Tag tag : post.getTags()) {
                tag.setUsageCount(Math.max(0, tag.getUsageCount() - 1));
                tagRepository.save(tag);
            }

            List<Tag> newTags = new ArrayList<>();
            for (String tagName : request.getTags()) {
                String normalizedTag = tagName.trim().toLowerCase();
                Tag tag = tagRepository.findByName(normalizedTag)
                        .orElseGet(() -> {
                            Tag newTag = new Tag();
                            newTag.setName(normalizedTag);
                            newTag.setSlug(normalizedTag.replaceAll("\\s+", "-"));
                            newTag.setUsageCount(0);
                            return tagRepository.save(newTag);
                        });
                tag.setUsageCount(tag.getUsageCount() + 1);
                tagRepository.save(tag);
                newTags.add(tag);
            }
            post.setTags(newTags);
        }

        return blogPostRepository.save(post);
    }

    @Override
    public void deletePost(String username, Long id) {
        BlogPost post = blogPostRepository.findById(id)
                .orElseThrow(() -> new ContentNotFoundException("Blog post not found with ID: " + id));

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + username));

        // Check ownership and permissions
        boolean isOwner = post.getUser().getUsername().equals(username);
        boolean isAdmin = user.getRole().getRoleName() == RoleType.ADMIN;
        boolean isModerator = user.getRole().getRoleName() == RoleType.MODERATOR;

        if (isModerator) {
            throw new UnauthorizedAccessException("Moderators cannot delete blog posts");
        }
        if (!isOwner && !isAdmin) {
            throw new UnauthorizedAccessException("You do not have permission to delete this post");
        }

        // Decrement usage count of tags
        for (Tag tag : post.getTags()) {
            tag.setUsageCount(Math.max(0, tag.getUsageCount() - 1));
            tagRepository.save(tag);
        }

        blogPostRepository.delete(post);
        auditService.log(username, "POST_DELETED", "BlogPost", String.valueOf(id), "Deleted post \"" + post.getTitle() + "\"");
    }

    @Override
    public BlogPost publishPost(String username, Long id) {
        BlogPost post = blogPostRepository.findById(id)
                .orElseThrow(() -> new ContentNotFoundException("Blog post not found with ID: " + id));

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + username));

        if (user.getRole().getRoleName() == RoleType.MODERATOR) {
            throw new UnauthorizedAccessException("Moderators cannot publish blog posts");
        }

        if (!post.getUser().getUsername().equals(username) && user.getRole().getRoleName() != RoleType.ADMIN) {
            throw new UnauthorizedAccessException("You do not have permission to publish this post");
        }

        post.setStatus(BlogStatus.PUBLISHED);
        post.setPublishedAt(LocalDateTime.now());
        return blogPostRepository.save(post);
    }

    @Override
    public Map<String, Object> toggleLikePost(String username, Long postId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + username));
        BlogPost post = blogPostRepository.findById(postId)
                .orElseThrow(() -> new ContentNotFoundException("Blog post not found: " + postId));

        Optional<Like> existingLike = likeRepository.findByUserIdAndBlogPostId(user.getId(), postId);
        boolean liked;

        if (existingLike.isPresent()) {
            likeRepository.delete(existingLike.get());
            liked = false;
        } else {
            Like newLike = new Like();
            newLike.setUser(user);
            newLike.setBlogPost(post);
            likeRepository.save(newLike);
            liked = true;

            User author = post.getUser();
            if (author != null && !author.getId().equals(user.getId())) {
                notificationService.create(
                        author.getId(),
                        "Your article received a like",
                        user.getUsername() + " liked \"" + post.getTitle() + "\"",
                        NotificationType.LIKE
                );
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("message", liked ? "Post liked successfully" : "Post unliked successfully");
        response.put("liked", liked);
        response.put("likeCount", likeRepository.countByBlogPostId(postId));
        return response;
    }

    @Override
    public Map<String, Object> getLikeStatus(String username, Long postId) {
        Map<String, Object> response = new HashMap<>();
        response.put("likeCount", likeRepository.countByBlogPostId(postId));

        if (username != null) {
            userRepository.findByUsername(username).ifPresent(user ->
                    response.put("liked", likeRepository.existsByUserIdAndBlogPostId(user.getId(), postId)));
        }
        if (!response.containsKey("liked")) {
            response.put("liked", false);
        }
        return response;
    }
}
