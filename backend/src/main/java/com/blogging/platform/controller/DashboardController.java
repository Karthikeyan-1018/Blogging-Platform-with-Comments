package com.blogging.platform.controller;

import com.blogging.platform.service.DashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/stats")
    public Map<String, Object> getStats(Principal principal) {
        return dashboardService.getStats(principal.getName());
    }

    @GetMapping("/activity")
    public List<Map<String, Object>> getActivity(Principal principal) {
        return dashboardService.getActivity(principal.getName());
    }

    @GetMapping("/top-posts")
    public List<Map<String, Object>> getTopPosts(Principal principal) {
        return dashboardService.getTopPosts(principal.getName());
    }

    @GetMapping("/drafts")
    public List<Map<String, Object>> getDrafts(Principal principal) {
        return dashboardService.getDrafts(principal.getName());
    }
}