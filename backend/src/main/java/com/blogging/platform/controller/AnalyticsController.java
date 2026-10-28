package com.blogging.platform.controller;

import com.blogging.platform.model.Analytics;
import com.blogging.platform.service.AnalyticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    @Autowired
    private AnalyticsService analyticsService;

    @GetMapping("/posts/{id}")
    public ResponseEntity<Analytics> getPostAnalytics(@PathVariable Long id) {
        Analytics analytics = analyticsService.getPostAnalytics(id);
        return ResponseEntity.ok(analytics);
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        Map<String, Object> metrics = analyticsService.getDashboardMetrics();
        return ResponseEntity.ok(metrics);
    }

    @GetMapping("/audience")
    public ResponseEntity<Map<String, Object>> getAudience() {
        Map<String, Object> insights = analyticsService.getAudienceInsights();
        return ResponseEntity.ok(insights);
    }

    @GetMapping("/personal")
    public ResponseEntity<Map<String, Object>> getPersonalStats(Principal principal) {
        Map<String, Object> stats = analyticsService.getUserPersonalStats(principal.getName());
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/monthly-trends")
    public ResponseEntity<Map<String, Object>> getMonthlyTrends() {
        Map<String, Object> trends = analyticsService.getMonthlyTrends();
        return ResponseEntity.ok(trends);
    }

    @GetMapping("/category-breakdown")
    public ResponseEntity<Map<String, Object>> getCategoryBreakdown() {
        Map<String, Object> breakdown = analyticsService.getCategoryBreakdown();
        return ResponseEntity.ok(breakdown);
    }

    @GetMapping("/system-stats")
    public ResponseEntity<Map<String, Object>> getSystemStats(Principal principal) {
        Map<String, Object> stats = analyticsService.getSystemStats(principal.getName());
        return ResponseEntity.ok(stats);
    }
}
