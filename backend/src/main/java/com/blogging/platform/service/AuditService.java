package com.blogging.platform.service;

import com.blogging.platform.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface AuditService {
    void log(String actor, String action, String targetType, String targetId, String details);
    Page<AuditLog> getAdminLogs(String adminUsername, Pageable pageable);
    List<AuditLog> getAllLogs();
}