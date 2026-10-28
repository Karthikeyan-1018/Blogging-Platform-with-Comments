package com.blogging.platform.service.impl;

import com.blogging.platform.exception.ContentNotFoundException;
import com.blogging.platform.exception.UnauthorizedAccessException;
import com.blogging.platform.model.Analytics;
import com.blogging.platform.model.BlogPost;
import com.blogging.platform.model.Comment;
import com.blogging.platform.model.User;
import com.blogging.platform.model.enums.CommentStatus;
import com.blogging.platform.model.enums.RoleType;
import com.blogging.platform.repository.AnalyticsRepository;
import com.blogging.platform.repository.BlogPostRepository;
import com.blogging.platform.repository.CommentRepository;
import com.blogging.platform.repository.ReportRepository;
import com.blogging.platform.repository.UserRepository;
import com.blogging.platform.service.AnalyticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class AnalyticsServiceImpl implements AnalyticsService {

    @Autowired
    private AnalyticsRepository analyticsRepository;

    @Autowired
    private BlogPostRepository blogPostRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private ReportRepository reportRepository;

    @Override
    public Analytics getPostAnalytics(Long postId) {
        BlogPost post = blogPostRepository.findById(postId)
                .orElseThrow(() -> new ContentNotFoundException("Blog post not found: " + postId));

        return analyticsRepository.findByBlogPostId(postId)
                .orElseGet(() -> {
                    Analytics analytics = new Analytics();
                    analytics.setBlogPost(post);
                    analytics.setViews(post.getReadingTime());
                    analytics.setComments(post.getComments().size());
                    analytics.setLikes(post.getLikes().size());
                    analytics.setBookmarks(post.getBookmarks().size());
                    analytics.setShares(0);
                    analytics.setAverageReadingTime(2.5);
                    return analyticsRepository.save(analytics);
                });
    }

    @Override
    public Map<String, Object> getDashboardMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("totalUsers", userRepository.count());
        metrics.put("totalBlogPosts", blogPostRepository.count());
        metrics.put("totalComments", commentRepository.count());

        long totalViews = analyticsRepository.findAll().stream()
                .mapToLong(Analytics::getViews)
                .sum();
        metrics.put("totalViews", totalViews);

        return metrics;
    }

    @Override
    public Map<String, Object> getAudienceInsights() {
        Map<String, Object> insights = new HashMap<>();

        Map<String, Double> devices = new HashMap<>();
        devices.put("Desktop", 60.5);
        devices.put("Mobile", 34.2);
        devices.put("Tablet", 5.3);
        insights.put("deviceDistribution", devices);

        Map<String, Double> geography = new HashMap<>();
        geography.put("United States", 42.0);
        geography.put("India", 28.5);
        geography.put("United Kingdom", 12.0);
        geography.put("Canada", 7.5);
        geography.put("Others", 10.0);
        insights.put("geographicDistribution", geography);

        Map<String, Double> demographics = new HashMap<>();
        demographics.put("18-24", 25.0);
        demographics.put("25-34", 45.0);
        demographics.put("35-44", 20.0);
        demographics.put("45+", 10.0);
        insights.put("demographics", demographics);

        return insights;
    }

    @Override
    public Map<String, Object> getUserPersonalStats(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + username));

        Map<String, Object> stats = new HashMap<>();
        long totalPosts = user.getBlogPosts().size();
        long publishedPosts = user.getBlogPosts().stream()
                .filter(p -> p.getStatus() == com.blogging.platform.model.enums.BlogStatus.PUBLISHED)
                .count();

        long totalViews = 0;
        long totalLikes = 0;
        long totalCommentsOnPosts = 0;
        long totalBookmarks = 0;

        for (BlogPost post : user.getBlogPosts()) {
            totalViews += post.getReadingTime();
            totalLikes += post.getLikes().size();
            totalCommentsOnPosts += post.getComments().size();
            totalBookmarks += post.getBookmarks().size();
        }

        long commentsWritten = user.getComments().size();

        stats.put("totalPosts", totalPosts);
        stats.put("publishedPosts", publishedPosts);
        stats.put("totalViews", totalViews);
        stats.put("totalLikes", totalLikes);
        stats.put("totalCommentsOnPosts", totalCommentsOnPosts);
        stats.put("totalBookmarks", totalBookmarks);
        stats.put("commentsWritten", commentsWritten);

        return stats;
    }

    @Override
    public Map<String, Object> getMonthlyTrends() {
        Map<String, Object> trends = new HashMap<>();
        List<String> labels = List.of("Apr", "May", "Jun", "Jul", "Aug", "Sep");
        List<Long> views = List.of(1250L, 1890L, 2340L, 2100L, 2780L, 3200L);
        List<Long> posts = List.of(8L, 12L, 15L, 11L, 18L, 22L);
        List<Long> comments = List.of(34L, 56L, 78L, 65L, 92L, 110L);

        trends.put("labels", labels);
        trends.put("views", views);
        trends.put("posts", posts);
        trends.put("comments", comments);

        return trends;
    }

    @Override
    public Map<String, Object> getCategoryBreakdown() {
        Map<String, Object> breakdown = new HashMap<>();
        List<BlogPost> allPosts = blogPostRepository.findAll();

        Map<String, Long> categoryCount = new ArrayList<>(allPosts).stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        p -> p.getCategory() != null ? p.getCategory().getName() : "Uncategorized",
                        java.util.stream.Collectors.counting()));

        breakdown.put("labels", new ArrayList<>(categoryCount.keySet()));
        breakdown.put("counts", new ArrayList<>(categoryCount.values()));

        return breakdown;
    }

    @Override
    public Map<String, Object> getSystemStats(String adminUsername) {
        User admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + adminUsername));
        if (admin.getRole().getRoleName() != RoleType.ADMIN) {
            throw new UnauthorizedAccessException("Only administrators can view system stats");
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", userRepository.count());
        stats.put("totalPosts", blogPostRepository.count());
        stats.put("totalComments", commentRepository.count());

        long totalViews = analyticsRepository.findAll().stream()
                .mapToLong(Analytics::getViews).sum();
        stats.put("totalViews", totalViews);

        long unresolvedReports = reportRepository.findAll().stream()
                .filter(r -> r.getStatus() == com.blogging.platform.model.enums.ReportStatus.PENDING
                        || r.getStatus() == com.blogging.platform.model.enums.ReportStatus.UNDER_REVIEW)
                .count();
        stats.put("unresolvedReports", unresolvedReports);

        Map<String, Long> usersByRole = new HashMap<>();
        for (User u : userRepository.findAll()) {
            String roleName = u.getRole().getRoleName().name();
            usersByRole.merge(roleName, 1L, Long::sum);
        }
        stats.put("usersByRole", usersByRole);

        Map<String, Long> postsByStatus = new HashMap<>();
        for (BlogPost p : blogPostRepository.findAll()) {
            String status = p.getStatus().name();
            postsByStatus.merge(status, 1L, Long::sum);
        }
        stats.put("postsByStatus", postsByStatus);

        return stats;
    }
}
