package com.blogging.platform.service;

import java.util.List;
import java.util.Map;

public interface HomeService {
    List<Map<String, Object>> getTrendingPosts();
    List<Map<String, Object>> getTopContributors();
    List<Map<String, Object>> getRecentAuthors();
    List<Map<String, Object>> getRecentComments();
}