package com.blogging.platform.service;

import com.blogging.platform.dto.request.RegisterRequest;
import com.blogging.platform.dto.request.LoginRequest;
import com.blogging.platform.dto.response.PublicUserResponse;
import com.blogging.platform.model.User;

import java.util.List;
import java.util.Map;

public interface UserService {
    User registerUser(RegisterRequest request);
    Map<String, Object> loginUser(LoginRequest request);
    User getCurrentUserProfile(String username);
    User updateUserProfile(String username, User profileUpdate);
    void logoutUser(String token);
    String followUnfollowUser(String username, Long followingId);
    List<PublicUserResponse> searchUsersByUsername(String username);
    PublicUserResponse getUserPublicProfile(Long userId);
    List<User> getAllUsers(String adminUsername);
    List<Map<String, Object>> getAllUsersTrimmed(String adminUsername);
    User toggleUserStatus(String adminUsername, Long userId, String status);
    User changeUserRole(String adminUsername, Long userId, String roleName);
    Map<String, String> forgotPassword(String usernameOrEmail);
    void resetPassword(String token, String newPassword);
    void changePassword(String username, String currentPassword, String newPassword);
}
