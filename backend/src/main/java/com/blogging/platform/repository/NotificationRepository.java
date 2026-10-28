package com.blogging.platform.repository;

import com.blogging.platform.model.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Page<Notification> findByUserId(Long userId, Pageable pageable);
    Page<Notification> findByUserIdAndIsRead(Long userId, boolean isRead, Pageable pageable);
    long countByUserIdAndIsRead(Long userId, boolean isRead);
    java.util.List<Notification> findAllByUserIdAndIsRead(Long userId, boolean isRead);
    List<Notification> findTop10ByUserIdOrderByIdDesc(Long userId);
}
