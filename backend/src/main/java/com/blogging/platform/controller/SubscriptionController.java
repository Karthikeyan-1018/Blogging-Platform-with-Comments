package com.blogging.platform.controller;

import com.blogging.platform.service.SubscriptionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {

    @Autowired
    private SubscriptionService subscriptionService;

    @PostMapping("/{authorId}/subscribe")
    public ResponseEntity<Map<String, Object>> subscribe(Principal principal, @PathVariable Long authorId) {
        return ResponseEntity.ok(subscriptionService.subscribe(principal.getName(), authorId));
    }

    @PostMapping("/{authorId}/unsubscribe")
    public ResponseEntity<Map<String, Object>> unsubscribe(Principal principal, @PathVariable Long authorId) {
        return ResponseEntity.ok(subscriptionService.unsubscribe(principal.getName(), authorId));
    }

    @GetMapping("/{authorId}/status")
    public ResponseEntity<Map<String, Object>> status(Principal principal, @PathVariable Long authorId) {
        String username = principal != null ? principal.getName() : null;
        return ResponseEntity.ok(subscriptionService.subscriptionStatus(username, authorId));
    }
}