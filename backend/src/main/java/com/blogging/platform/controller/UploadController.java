package com.blogging.platform.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/uploads")
public class UploadController {

    private static final long MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

    @PostMapping
    public ResponseEntity<Map<String, Object>> uploadImage(@RequestParam("file") MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No file uploaded"));
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            return ResponseEntity.badRequest().body(Map.of("error", "File exceeds 5 MB limit"));
        }

        String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "image";
        String extension = "";
        int dotIndex = original.lastIndexOf('.');
        if (dotIndex >= 0) {
            extension = original.substring(dotIndex).toLowerCase();
        }
        if (!extension.matches("\\.(png|jpe?g|gif|webp|bmp|svg)")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Unsupported image type: " + extension));
        }

        String filename = UUID.randomUUID() + extension;
        Path uploadDir = Paths.get("uploads").toAbsolutePath().normalize();
        Files.createDirectories(uploadDir);
        Path target = uploadDir.resolve(filename);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);

        Map<String, Object> response = new HashMap<>();
        response.put("url", "/uploads/" + filename);
        response.put("fileName", filename);
        return ResponseEntity.ok(response);
    }
}