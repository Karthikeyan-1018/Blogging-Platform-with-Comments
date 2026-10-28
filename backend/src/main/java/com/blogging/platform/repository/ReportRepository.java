package com.blogging.platform.repository;

import com.blogging.platform.model.Report;
import com.blogging.platform.model.enums.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportRepository extends JpaRepository<Report, Long> {
    Page<Report> findByStatus(ReportStatus status, Pageable pageable);
    Page<Report> findByBlogPostId(Long blogPostId, Pageable pageable);
    Page<Report> findByCommentId(Long commentId, Pageable pageable);
}
