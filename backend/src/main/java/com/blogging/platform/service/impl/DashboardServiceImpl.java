package com.blogging.platform.service.impl;

import com.blogging.platform.exception.ContentNotFoundException;
import com.blogging.platform.model.BlogPost;
import com.blogging.platform.model.Notification;
import com.blogging.platform.model.User;
import com.blogging.platform.model.enums.BlogStatus;
import com.blogging.platform.repository.DailyViewRepository;
import com.blogging.platform.repository.NotificationRepository;
import com.blogging.platform.repository.UserRepository;
import com.blogging.platform.service.DashboardService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class DashboardServiceImpl implements DashboardService {

    private final UserRepository userRepository;
    private final DailyViewRepository dailyViewRepository;
    private final NotificationRepository notificationRepository;

    public DashboardServiceImpl(UserRepository userRepository,
                                DailyViewRepository dailyViewRepository,
                                NotificationRepository notificationRepository) {
        this.userRepository = userRepository;
        this.dailyViewRepository = dailyViewRepository;
        this.notificationRepository = notificationRepository;
    }

    private User requireUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + username));
    }

    @Override
    public Map<String, Object> getStats(String username) {
        User user = requireUser(username);

        long totalPosts = user.getBlogPosts().size();
        long publishedPosts = user.getBlogPosts().stream()
                .filter(p -> p.getStatus() == BlogStatus.PUBLISHED)
                .count();
        long totalViews = 0;
        long totalLikes = 0;
        long totalComments = 0;
        long totalBookmarks = 0;

        for (BlogPost post : user.getBlogPosts()) {
            totalViews += post.getViewCount();
            totalLikes += post.getLikes().size();
            totalComments += post.getComments().size();
            totalBookmarks += post.getBookmarks().size();
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalPosts", totalPosts);
        stats.put("publishedPosts", publishedPosts);
        stats.put("totalViews", totalViews);
        stats.put("totalLikes", totalLikes);
        stats.put("totalComments", totalComments);
        stats.put("totalBookmarks", totalBookmarks);
        stats.put("viewsTrend", buildViewsTrend(user.getId()));
        return stats;
    }

    private List<Map<String, Object>> buildViewsTrend(Long userId) {
        LocalDate today = LocalDate.now();
        LocalDate since = today.minusDays(29);

        Map<LocalDate, Long> sums = new LinkedHashMap<>();
        for (int i = 0; i < 30; i++) {
            sums.put(since.plusDays(i), 0L);
        }

        for (Object[] row : dailyViewRepository.sumViewsByDateForUser(userId, since)) {
            LocalDate date = (LocalDate) row[0];
            Long views = (Long) row[1];
            if (sums.containsKey(date)) {
                sums.put(date, views);
            }
        }

        List<Map<String, Object>> trend = new ArrayList<>();
        for (Map.Entry<LocalDate, Long> entry : sums.entrySet()) {
            Map<String, Object> point = new HashMap<>();
            point.put("date", entry.getKey().toString());
            point.put("views", entry.getValue());
            trend.add(point);
        }
        return trend;
    }

    @Override
    public List<Map<String, Object>> getActivity(String username) {
        User user = requireUser(username);

        List<Map<String, Object>> activities = new ArrayList<>();
        for (Notification notification : notificationRepository.findTop10ByUserIdOrderByIdDesc(user.getId())) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", notification.getId());
            item.put("type", notification.getType());
            item.put("title", notification.getTitle());
            item.put("message", notification.getMessage());
            item.put("createdAt", notification.getCreatedAt() != null ? notification.getCreatedAt().toString() : null);
            activities.add(item);
        }
        return activities;
    }

    @Override
    public List<Map<String, Object>> getTopPosts(String username) {
        User user = requireUser(username);

        List<BlogPost> posts = user.getBlogPosts().stream()
                .sorted(Comparator.comparingLong(BlogPost::getViewCount)
                        .thenComparingLong(p -> p.getLikes().size())
                        .reversed())
                .limit(5)
                .collect(Collectors.toList());

        List<Map<String, Object>> result = new ArrayList<>();
        int rank = 1;
        for (BlogPost post : posts) {
            Map<String, Object> item = new HashMap<>();
            item.put("rank", rank++);
            item.put("id", post.getId());
            item.put("title", post.getTitle());
            item.put("slug", post.getSlug());
            item.put("views", post.getViewCount());
            item.put("likes", post.getLikes().size());
            item.put("comments", post.getComments().size());
            item.put("premium", post.isPremium());
            item.put("featuredImage", post.getFeaturedImage());
            item.put("publishedAt", post.getPublishedAt() != null ? post.getPublishedAt().toString() : null);
            result.add(item);
        }
        return result;
    }

    @Override
    public List<Map<String, Object>> getDrafts(String username) {
        User user = requireUser(username);

        List<BlogPost> drafts = user.getBlogPosts().stream()
                .filter(p -> p.getStatus() == BlogStatus.DRAFT)
                .sorted(Comparator.comparing(BlogPost::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());

        List<Map<String, Object>> result = new ArrayList<>();
        for (BlogPost post : drafts) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", post.getId());
            item.put("title", post.getTitle());
            item.put("summary", post.getSummary());
            item.put("category", post.getCategory() != null ? post.getCategory().getName() : null);
            item.put("readingTime", post.getReadingTime());
            item.put("premium", post.isPremium());
            item.put("featuredImage", post.getFeaturedImage());
            item.put("tags", post.getTags() != null
                    ? post.getTags().stream().map(t -> t.getName()).collect(Collectors.toList())
                    : List.of());
            item.put("updatedAt", post.getUpdatedAt() != null ? post.getUpdatedAt().toString() : null);
            result.add(item);
        }
        return result;
    }
}