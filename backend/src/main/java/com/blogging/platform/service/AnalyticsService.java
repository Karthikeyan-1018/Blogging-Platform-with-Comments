package com.blogging.platform.service;

import com.blogging.platform.model.Analytics;

import java.util.Map;

public interface AnalyticsService {
    Analytics getPostAnalytics(Long postId);
    Map<String, Object> getDashboardMetrics();
    Map<String, Object> getAudienceInsights();
    Map<String, Object> getUserPersonalStats(String username);
    Map<String, Object> getMonthlyTrends();
    Map<String, Object> getCategoryBreakdown();
    Map<String, Object> getSystemStats(String adminUsername);
}
