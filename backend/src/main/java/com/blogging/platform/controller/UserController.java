package com.blogging.platform.controller;

import com.blogging.platform.dto.response.PublicUserResponse;
import com.blogging.platform.model.User;
import com.blogging.platform.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
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
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/profile")
    public ResponseEntity<User> getProfile(Principal principal) {
        User profile = userService.getCurrentUserProfile(principal.getName());
        return ResponseEntity.ok(profile);
    }

    @PutMapping("/profile")
    public ResponseEntity<User> updateProfile(Principal principal, @RequestBody User profileUpdate) {
        User updated = userService.updateUserProfile(principal.getName(), profileUpdate);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{id}/follow")
    public ResponseEntity<Map<String, String>> followUnfollow(Principal principal, @PathVariable Long id) {
        String message = userService.followUnfollowUser(principal.getName(), id);
        Map<String, String> response = new HashMap<>();
        response.put("message", message);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    public ResponseEntity<List<PublicUserResponse>> searchUsers(@RequestParam("username") String username) {
        return ResponseEntity.ok(userService.searchUsersByUsername(username));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<PublicUserResponse> getUserPublicProfile(@PathVariable Long userId) {
        return ResponseEntity.ok(userService.getUserPublicProfile(userId));
    }

    @GetMapping("/admin/all")
    public ResponseEntity<List<Map<String, Object>>> getAllUsers(Principal principal) {
        return ResponseEntity.ok(userService.getAllUsersTrimmed(principal.getName()));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Map<String, String>> toggleUserStatus(
            Principal principal, @PathVariable Long id, @RequestParam String status) {
        userService.toggleUserStatus(principal.getName(), id, status);
        Map<String, String> response = new HashMap<>();
        response.put("message", "User status updated to " + status);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/role")
    public ResponseEntity<Map<String, String>> changeUserRole(
            Principal principal, @PathVariable Long id, @RequestParam String role) {
        userService.changeUserRole(principal.getName(), id, role);
        Map<String, String> response = new HashMap<>();
        response.put("message", "User role updated to " + role);
        return ResponseEntity.ok(response);
    }
}
