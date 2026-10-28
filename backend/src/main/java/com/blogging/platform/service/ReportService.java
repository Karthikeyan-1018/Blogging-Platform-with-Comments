package com.blogging.platform.service;

import com.blogging.platform.dto.request.ReportRequest;
import com.blogging.platform.model.Report;

import java.util.List;

public interface ReportService {
    Report submitReport(String username, ReportRequest request);
    List<Report> getAllReports(String username);
    Report updateReportStatus(String username, Long reportId, String status);
    Report hideReportedContent(String username, Long reportId);
}
