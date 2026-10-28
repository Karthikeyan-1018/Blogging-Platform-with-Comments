package com.blogging.platform.service;

import com.blogging.platform.model.Notification;
import com.blogging.platform.model.enums.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface NotificationService {
    void create(Long userId, String title, String message, NotificationType type);
    Page<Notification> getUserNotifications(String username, Pageable pageable);
    long getUnreadCount(String username);
    void markAsRead(String username, Long notificationId);
    void markAllAsRead(String username);
}