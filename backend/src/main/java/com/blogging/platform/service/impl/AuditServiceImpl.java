package com.blogging.platform.service.impl;

import com.blogging.platform.exception.ContentNotFoundException;
import com.blogging.platform.exception.UnauthorizedAccessException;
import com.blogging.platform.model.AuditLog;
import com.blogging.platform.model.User;
import com.blogging.platform.model.enums.RoleType;
import com.blogging.platform.repository.AuditLogRepository;
import com.blogging.platform.repository.UserRepository;
import com.blogging.platform.service.AuditService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class AuditServiceImpl implements AuditService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public AuditServiceImpl(AuditLogRepository auditLogRepository, UserRepository userRepository) {
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    @Override
    public void log(String actor, String action, String targetType, String targetId, String details) {
        try {
            AuditLog entry = new AuditLog();
            entry.setActor(actor);
            entry.setAction(action);
            entry.setTargetType(targetType);
            entry.setTargetId(targetId);
            entry.setDetails(details);
            auditLogRepository.save(entry);
        } catch (Exception ex) {
            // Auditing must never break a business operation
            org.slf4j.LoggerFactory.getLogger(AuditServiceImpl.class)
                    .error("Failed to write audit log", ex);
        }
    }

    @Override
    public Page<AuditLog> getAdminLogs(String adminUsername, Pageable pageable) {
        requireAdmin(adminUsername);
        return auditLogRepository.findAll(pageable);
    }

    @Override
    public List<AuditLog> getAllLogs() {
        return auditLogRepository.findAll();
    }

    private void requireAdmin(String username) {
        User admin = userRepository.findByUsername(username)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + username));
        if (admin.getRole().getRoleName() != RoleType.ADMIN) {
            throw new UnauthorizedAccessException("Only administrators can view audit logs");
        }
    }
}