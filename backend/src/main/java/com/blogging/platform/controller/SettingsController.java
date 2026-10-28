package com.blogging.platform.controller;

import com.blogging.platform.service.SettingsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    @Autowired
    private SettingsService settingsService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getSettings() {
        return ResponseEntity.ok(settingsService.getSettings());
    }

    @PutMapping("/{key}")
    public ResponseEntity<Map<String, String>> updateSetting(
            Principal principal, @PathVariable String key, @RequestParam String value) {
        settingsService.updateSetting(principal.getName(), key, value);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Setting updated successfully");
        response.put("key", key);
        return ResponseEntity.ok(response);
    }
}