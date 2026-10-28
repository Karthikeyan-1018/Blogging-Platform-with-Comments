package com.blogging.platform.controller;

import com.blogging.platform.service.HomeService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/home")
public class HomeController {

    private final HomeService homeService;

    public HomeController(HomeService homeService) {
        this.homeService = homeService;
    }

    @GetMapping("/trending")
    public List<Map<String, Object>> getTrendingPosts() {
        return homeService.getTrendingPosts();
    }

    @GetMapping("/top-contributors")
    public List<Map<String, Object>> getTopContributors() {
        return homeService.getTopContributors();
    }

    @GetMapping("/recent-authors")
    public List<Map<String, Object>> getRecentAuthors() {
        return homeService.getRecentAuthors();
    }

    @GetMapping("/recent-comments")
    public List<Map<String, Object>> getRecentComments() {
        return homeService.getRecentComments();
    }
}