package com.blogging.platform.service;

import java.util.Map;

public interface SubscriptionService {
    Map<String, Object> subscribe(String username, Long authorId);
    Map<String, Object> unsubscribe(String username, Long authorId);
    Map<String, Object> subscriptionStatus(String username, Long authorId);
    long subscriberCount(Long authorId);
}