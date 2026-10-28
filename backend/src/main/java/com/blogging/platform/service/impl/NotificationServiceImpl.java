package com.blogging.platform.service.impl;

import com.blogging.platform.exception.ContentNotFoundException;
import com.blogging.platform.exception.UnauthorizedAccessException;
import com.blogging.platform.model.Notification;
import com.blogging.platform.model.User;
import com.blogging.platform.model.enums.NotificationType;
import com.blogging.platform.repository.NotificationRepository;
import com.blogging.platform.repository.UserRepository;
import com.blogging.platform.service.NotificationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationServiceImpl(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @Override
    public void create(Long userId, String title, String message, NotificationType type) {
        userRepository.findById(userId).ifPresent(user -> {
            Notification notification = new Notification();
            notification.setTitle(title);
            notification.setMessage(message);
            notification.setType(type);
            notification.setRead(false);
            notification.setUser(user);
            notificationRepository.save(notification);
        });
    }

    @Override
    public Page<Notification> getUserNotifications(String username, Pageable pageable) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + username));
        return notificationRepository.findByUserId(user.getId(), pageable);
    }

    @Override
    public long getUnreadCount(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + username));
        return notificationRepository.countByUserIdAndIsRead(user.getId(), false);
    }

    @Override
    public void markAsRead(String username, Long notificationId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + username));

        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ContentNotFoundException("Notification not found: " + notificationId));

        if (!notification.getUser().getId().equals(user.getId())) {
            throw new UnauthorizedAccessException("You do not have permission to view this notification");
        }

        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Override
    public void markAllAsRead(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + username));

        notificationRepository.findAllByUserIdAndIsRead(user.getId(), false).forEach(notification -> {
            notification.setRead(true);
            notificationRepository.save(notification);
        });
    }
}