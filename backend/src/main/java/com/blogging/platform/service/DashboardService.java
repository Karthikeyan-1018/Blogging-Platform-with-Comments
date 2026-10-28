package com.blogging.platform.service;

import java.util.List;
import java.util.Map;

public interface DashboardService {
    Map<String, Object> getStats(String username);
    List<Map<String, Object>> getActivity(String username);
    List<Map<String, Object>> getTopPosts(String username);
    List<Map<String, Object>> getDrafts(String username);
}