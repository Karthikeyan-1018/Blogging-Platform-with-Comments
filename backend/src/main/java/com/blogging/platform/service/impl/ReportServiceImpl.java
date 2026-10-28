package com.blogging.platform.service.impl;

import com.blogging.platform.dto.request.ReportRequest;
import com.blogging.platform.exception.ContentNotFoundException;
import com.blogging.platform.exception.InvalidContentException;
import com.blogging.platform.exception.UnauthorizedAccessException;
import com.blogging.platform.model.BlogPost;
import com.blogging.platform.model.Comment;
import com.blogging.platform.model.Report;
import com.blogging.platform.model.User;
import com.blogging.platform.model.enums.NotificationType;
import com.blogging.platform.model.enums.ReportReason;
import com.blogging.platform.model.enums.ReportStatus;
import com.blogging.platform.model.enums.RoleType;
import com.blogging.platform.repository.BlogPostRepository;
import com.blogging.platform.repository.CommentRepository;
import com.blogging.platform.repository.ReportRepository;
import com.blogging.platform.repository.UserRepository;
import com.blogging.platform.service.AuditService;
import com.blogging.platform.service.NotificationService;
import com.blogging.platform.service.ReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class ReportServiceImpl implements ReportService {

    @Autowired
    private ReportRepository reportRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogPostRepository blogPostRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private AuditService auditService;

    @Override
    public Report submitReport(String username, ReportRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + username));

        if (request.getReason() == null) {
            throw new InvalidContentException("Report reason is required");
        }

        ReportReason reason;
        try {
            reason = ReportReason.valueOf(request.getReason().toUpperCase());
        } catch (IllegalArgumentException e) {
            reason = ReportReason.OTHER;
        }

        if (request.getDescription() == null || request.getDescription().trim().isEmpty() || request.getDescription().trim().length() > 1000) {
            throw new InvalidContentException("Description must be between 1 and 1000 characters");
        }

        Report report = new Report();
        report.setUser(user);
        report.setReason(reason);
        report.setDescription(request.getDescription());
        report.setStatus(ReportStatus.PENDING);

        if (request.getBlogPostId() != null) {
            BlogPost post = blogPostRepository.findById(request.getBlogPostId())
                    .orElseThrow(() -> new ContentNotFoundException("Blog post not found: " + request.getBlogPostId()));
            report.setBlogPost(post);
        }

        if (request.getCommentId() != null) {
            Comment comment = commentRepository.findById(request.getCommentId())
                    .orElseThrow(() -> new ContentNotFoundException("Comment not found: " + request.getCommentId()));
            report.setComment(comment);
        }

        if (request.getBlogPostId() == null && request.getCommentId() == null) {
            throw new InvalidContentException("Either blogPostId or commentId must be reported");
        }

        Report saved = reportRepository.save(report);

        // Notify the content owner that their content was reported
        if (report.getBlogPost() != null && report.getBlogPost().getUser() != null
                && !report.getBlogPost().getUser().getId().equals(user.getId())) {
            notificationService.create(
                    report.getBlogPost().getUser().getId(),
                    "Your article was reported",
                    "Your article \"" + report.getBlogPost().getTitle() + "\" has been reported for " + reason.name().toLowerCase().replace('_', ' ') + ". Our moderation team will review it.",
                    NotificationType.REPORT
            );
        }
        if (report.getComment() != null && report.getComment().getUser() != null
                && !report.getComment().getUser().getId().equals(user.getId())) {
            notificationService.create(
                    report.getComment().getUser().getId(),
                    "Your comment was reported",
                    "Your comment on \"" + report.getComment().getBlogPost().getTitle() + "\" has been reported for " + reason.name().toLowerCase().replace('_', ' ') + ".",
                    NotificationType.REPORT
            );
        }

        return saved;
    }

    @Override
    public List<Report> getAllReports(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + username));

        if (user.getRole().getRoleName() != RoleType.ADMIN && user.getRole().getRoleName() != RoleType.MODERATOR) {
            throw new UnauthorizedAccessException("You do not have permission to view reports");
        }

        return reportRepository.findAll();
    }

    @Override
    public Report updateReportStatus(String username, Long reportId, String status) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + username));

        if (user.getRole().getRoleName() != RoleType.ADMIN && user.getRole().getRoleName() != RoleType.MODERATOR) {
            throw new UnauthorizedAccessException("You do not have permission to update report status");
        }

        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ContentNotFoundException("Report not found with ID: " + reportId));

        try {
            ReportStatus reportStatus = ReportStatus.valueOf(status.toUpperCase());
            report.setStatus(reportStatus);
        } catch (IllegalArgumentException e) {
            throw new InvalidContentException("Invalid report status: " + status);
        }

        Report saved = reportRepository.save(report);
        auditService.log(username, "REPORT_STATUS_CHANGED", "Report", String.valueOf(reportId),
                "Report status changed to " + saved.getStatus().name());
        return saved;
    }

    @Override
    public Report hideReportedContent(String username, Long reportId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + username));

        if (user.getRole().getRoleName() != RoleType.ADMIN && user.getRole().getRoleName() != RoleType.MODERATOR) {
            throw new UnauthorizedAccessException("You do not have permission to hide reported content");
        }

        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ContentNotFoundException("Report not found with ID: " + reportId));

        if (report.getBlogPost() != null) {
            report.getBlogPost().setVisibility(com.blogging.platform.model.enums.Visibility.PRIVATE);
            blogPostRepository.save(report.getBlogPost());
        }

        if (report.getComment() != null) {
            report.getComment().setStatus(com.blogging.platform.model.enums.CommentStatus.HIDDEN);
            commentRepository.save(report.getComment());
        }

        report.setStatus(ReportStatus.RESOLVED);
        Report saved = reportRepository.save(report);
        auditService.log(username, "REPORT_CONTENT_HIDDEN", "Report", String.valueOf(reportId),
                "Reported content hidden (post or comment)");
        return saved;
    }
}
