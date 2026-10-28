package com.blogging.platform.controller;

import com.blogging.platform.dto.request.ReportRequest;
import com.blogging.platform.model.Report;
import com.blogging.platform.service.ReportService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    @Autowired
    private ReportService reportService;

    @PostMapping
    public ResponseEntity<Report> submitReport(Principal principal, @Valid @RequestBody ReportRequest request) {
        Report report = reportService.submitReport(principal.getName(), request);
        return new ResponseEntity<>(report, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<Report>> getAllReports(Principal principal) {
        List<Report> reports = reportService.getAllReports(principal.getName());
        return ResponseEntity.ok(reports);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Report> updateStatus(Principal principal, @PathVariable Long id, @RequestParam String status) {
        Report updated = reportService.updateReportStatus(principal.getName(), id, status);
        return ResponseEntity.ok(updated);
    }

    @PutMapping("/{id}/hide")
    public ResponseEntity<Map<String, String>> hideReportedContent(Principal principal, @PathVariable Long id) {
        reportService.hideReportedContent(principal.getName(), id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Reported content has been hidden and report resolved");
        return ResponseEntity.ok(response);
    }
}
