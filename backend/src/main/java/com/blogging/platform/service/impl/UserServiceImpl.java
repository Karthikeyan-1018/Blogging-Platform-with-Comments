package com.blogging.platform.service.impl;

import com.blogging.platform.dto.request.RegisterRequest;
import com.blogging.platform.dto.request.LoginRequest;
import com.blogging.platform.dto.response.PublicUserResponse;
import com.blogging.platform.exception.InvalidContentException;
import com.blogging.platform.exception.UnauthorizedAccessException;
import com.blogging.platform.model.Role;
import com.blogging.platform.model.User;
import com.blogging.platform.model.enums.NotificationType;
import com.blogging.platform.model.enums.RoleType;
import com.blogging.platform.model.enums.UserStatus;
import com.blogging.platform.repository.RoleRepository;
import com.blogging.platform.repository.UserRepository;
import com.blogging.platform.security.JwtTokenUtil;
import com.blogging.platform.security.TokenBlacklistService;
import com.blogging.platform.service.NotificationService;
import com.blogging.platform.service.SettingsService;
import com.blogging.platform.service.UserService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenUtil jwtTokenUtil;
    private final TokenBlacklistService tokenBlacklistService;
    private final SettingsService settingsService;
    private final com.blogging.platform.service.AuditService auditService;
    private final NotificationService notificationService;

    public UserServiceImpl(UserRepository userRepository, RoleRepository roleRepository,
                          PasswordEncoder passwordEncoder, JwtTokenUtil jwtTokenUtil,
                          TokenBlacklistService tokenBlacklistService, SettingsService settingsService,
                          com.blogging.platform.service.AuditService auditService,
                          NotificationService notificationService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenUtil = jwtTokenUtil;
        this.tokenBlacklistService = tokenBlacklistService;
        this.settingsService = settingsService;
        this.auditService = auditService;
        this.notificationService = notificationService;
    }

    @Override
    public User registerUser(RegisterRequest request) {
        if (!settingsService.isRegistrationOpen()) {
            throw new InvalidContentException("New registrations are currently closed by the platform administrator");
        }
        if (request.getRole() != null &&
                (request.getRole().equalsIgnoreCase("ADMIN") || request.getRole().equalsIgnoreCase("MODERATOR"))) {
            throw new InvalidContentException("Administrator and Moderator accounts cannot be self-registered. Contact the platform admin.");
        }
        if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
            throw new InvalidContentException("Username is required");
        }
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new InvalidContentException("Please enter a valid email address");
        }
        if (request.getPassword() == null || request.getPassword().length() < 8) {
            throw new InvalidContentException("Password must meet security requirements");
        }
        if (!isPasswordComplex(request.getPassword())) {
            throw new InvalidContentException("Password must meet security requirements");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new InvalidContentException("Username is already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new InvalidContentException("Email is already in use");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setStatus(UserStatus.ACTIVE);
        user.setEnabled(true);
        user.setEmailVerified(false);

        // Fetch or create role - all five roles can self-register on this demo platform
        String requestedRoleName = request.getRole() != null ? request.getRole().toUpperCase() : "READER";
        RoleType roleType;
        try {
            roleType = RoleType.valueOf(requestedRoleName);
        } catch (IllegalArgumentException e) {
            roleType = RoleType.READER;
        }

        RoleType finalRoleType = roleType;
        Role role = roleRepository.findByRoleName(roleType)
                .orElseGet(() -> {
                    Role newRole = new Role();
                    newRole.setRoleName(finalRoleType);
                    newRole.setDescription(finalRoleType.name() + " Role");
                    return roleRepository.save(newRole);
                });
        user.setRole(role);

        return userRepository.save(user);
    }

    @Override
    public Map<String, Object> loginUser(LoginRequest request) {
        String username = request.getUsername();
        checkLoginLocked(username);

        User user = userRepository.findByUsername(username)
                .orElseGet(() -> userRepository.findByEmail(username)
                        .orElseThrow(() -> new UnauthorizedAccessException("Invalid username/email or password")));

        if (settingsService.isMaintenanceMode() && user.getRole().getRoleName() != RoleType.ADMIN) {
            throw new UnauthorizedAccessException("The platform is currently under maintenance. Please try again later.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            recordLoginFailure(username);
            throw new UnauthorizedAccessException("Invalid username/email or password");
        }
        recordLoginSuccess(username);

        String token = jwtTokenUtil.generateToken(user);
        String refreshToken = jwtTokenUtil.generateRefreshToken(user);

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("refreshToken", refreshToken);
        response.put("role", user.getRole().getRoleName().name());
        response.put("username", user.getUsername());
        response.put("profileImage", user.getProfileImage());
        response.put("fullName", user.getFullName());
        
        return response;
    }

    // --- Login rate limiting / lockout (in-memory, per-username) ---

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCKOUT_DURATION_MINUTES = 15;

    private static class LoginAttempt {
        private int failedCount;
        private LocalDateTime lockedUntil;
    }

    private final Map<String, LoginAttempt> loginAttempts = new ConcurrentHashMap<>();

    private void checkLoginLocked(String username) {
        if (username == null) return;
        LoginAttempt attempt = loginAttempts.get(username.toLowerCase());
        if (attempt != null && attempt.lockedUntil != null && LocalDateTime.now().isBefore(attempt.lockedUntil)) {
            long minutes = Duration.between(LocalDateTime.now(), attempt.lockedUntil).toMinutes() + 1;
            throw new UnauthorizedAccessException("Too many failed login attempts. Account temporarily locked. Please try again in " + minutes + " minutes.");
        }
    }

    private void recordLoginFailure(String username) {
        if (username == null) return;
        String key = username.toLowerCase();
        LoginAttempt attempt = loginAttempts.computeIfAbsent(key, k -> new LoginAttempt());
        attempt.failedCount++;
        attempt.lockedUntil = null;
        if (attempt.failedCount >= MAX_FAILED_ATTEMPTS) {
            attempt.lockedUntil = LocalDateTime.now().plusMinutes(LOCKOUT_DURATION_MINUTES);
        }
    }

    private void recordLoginSuccess(String username) {
        if (username != null) {
            loginAttempts.remove(username.toLowerCase());
        }
    }

    @Override
    public User getCurrentUserProfile(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new InvalidContentException("User not found: " + username));
    }

    @Override
    public User updateUserProfile(String username, User profileUpdate) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new InvalidContentException("User not found: " + username));

        if (profileUpdate.getFullName() != null) user.setFullName(profileUpdate.getFullName());
        if (profileUpdate.getBio() != null) user.setBio(profileUpdate.getBio());
        if (profileUpdate.getProfileImage() != null) user.setProfileImage(profileUpdate.getProfileImage());
        if (profileUpdate.getWebsite() != null) user.setWebsite(profileUpdate.getWebsite());
        if (profileUpdate.getTwitter() != null) user.setTwitter(profileUpdate.getTwitter());
        if (profileUpdate.getGithub() != null) user.setGithub(profileUpdate.getGithub());
        if (profileUpdate.getLinkedin() != null) user.setLinkedin(profileUpdate.getLinkedin());
        if (profileUpdate.getThemePreference() != null) user.setThemePreference(profileUpdate.getThemePreference());

        return userRepository.save(user);
    }

    @Override
    public void logoutUser(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        tokenBlacklistService.blacklistToken(token);
    }

    @Override
    public String followUnfollowUser(String username, Long followingId) {
        User follower = userRepository.findByUsername(username)
                .orElseThrow(() -> new InvalidContentException("User not found: " + username));
        User following = userRepository.findById(followingId)
                .orElseThrow(() -> new InvalidContentException("User to follow not found with ID: " + followingId));

        if (follower.getId().equals(following.getId())) {
            throw new InvalidContentException("You cannot follow yourself");
        }

        if (follower.getFollowing().contains(following)) {
            follower.getFollowing().remove(following);
            userRepository.save(follower);
            return "Unfollowed user successfully";
        } else {
            follower.getFollowing().add(following);
            userRepository.save(follower);
            notificationService.create(
                    following.getId(),
                    "You have a new follower",
                    follower.getUsername() + " started following you",
                    NotificationType.FOLLOW
            );
            return "Followed user successfully";
        }
    }

    @Override
    public List<PublicUserResponse> searchUsersByUsername(String username) {
        if (username == null || username.trim().isEmpty()) {
            return new ArrayList<>();
        }
        return userRepository.findByUsernameContainingIgnoreCaseAndStatusOrderByIdAsc(username.trim(), UserStatus.ACTIVE)
                .stream()
                .limit(10)
                .map(PublicUserResponse::from)
                .collect(Collectors.toList());
    }

    @Override
    public PublicUserResponse getUserPublicProfile(Long userId) {
        User user = userRepository.findById(userId)
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .orElseThrow(() -> new InvalidContentException("User not found with ID: " + userId));
        return PublicUserResponse.from(user);
    }

    @Override
    public List<User> getAllUsers(String adminUsername) {
        User admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new InvalidContentException("User not found: " + adminUsername));
        if (admin.getRole().getRoleName() != RoleType.ADMIN) {
            throw new UnauthorizedAccessException("Only administrators can view all users");
        }
        return userRepository.findAll();
    }

    @Override
    public User toggleUserStatus(String adminUsername, Long userId, String status) {
        User admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new InvalidContentException("User not found: " + adminUsername));
        if (admin.getRole().getRoleName() != RoleType.ADMIN) {
            throw new UnauthorizedAccessException("Only administrators can change user status");
        }

        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidContentException("User not found with ID: " + userId));

        UserStatus userStatus;
        try {
            userStatus = UserStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidContentException("Invalid status: " + status);
        }

        targetUser.setStatus(userStatus);
        targetUser.setEnabled(userStatus == UserStatus.ACTIVE);
        User saved = userRepository.save(targetUser);
        auditService.log(adminUsername, "USER_STATUS_CHANGED", "User", String.valueOf(userId),
                "Status changed to " + userStatus.name() + " for user " + targetUser.getUsername());
        return saved;
    }

    @Override
    public User changeUserRole(String adminUsername, Long userId, String roleName) {
        User admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new InvalidContentException("User not found: " + adminUsername));
        if (admin.getRole().getRoleName() != RoleType.ADMIN) {
            throw new UnauthorizedAccessException("Only administrators can change user roles");
        }

        User targetUser = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidContentException("User not found with ID: " + userId));

        RoleType roleType;
        try {
            roleType = RoleType.valueOf(roleName.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new InvalidContentException("Invalid role: " + roleName);
        }

        RoleType finalRoleType = roleType;
        Role newRole = roleRepository.findByRoleName(roleType)
                .orElseGet(() -> {
                    Role newR = new Role();
                    newR.setRoleName(finalRoleType);
                    newR.setDescription(finalRoleType.name() + " Role");
                    return roleRepository.save(newR);
                });

        targetUser.setRole(newRole);
        User saved = userRepository.save(targetUser);
        auditService.log(adminUsername, "USER_ROLE_CHANGED", "User", String.valueOf(userId),
                "Role changed to " + roleType.name() + " for user " + targetUser.getUsername());
        return saved;
    }

    @Override
    public List<Map<String, Object>> getAllUsersTrimmed(String adminUsername) {
        getAllUsers(adminUsername);
        return userRepository.findAll().stream().map(user -> {
            Map<String, Object> slim = new HashMap<>();
            slim.put("id", user.getId());
            slim.put("username", user.getUsername());
            slim.put("fullName", user.getFullName());
            slim.put("email", user.getEmail());
            slim.put("status", user.getStatus() != null ? user.getStatus().name() : null);
            slim.put("enabled", user.isEnabled());
            slim.put("role", user.getRole() != null && user.getRole().getRoleName() != null
                    ? user.getRole().getRoleName().name() : null);
            slim.put("profileImage", user.getProfileImage());
            slim.put("createdAt", user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);
            return slim;
        }).collect(Collectors.toList());
    }

    @Override
    public Map<String, String> forgotPassword(String usernameOrEmail) {
        User user = userRepository.findByUsername(usernameOrEmail)
                .orElseGet(() -> userRepository.findByEmail(usernameOrEmail)
                        .orElseThrow(() -> new InvalidContentException("No account found for that username/email")));

        String token = UUID.randomUUID().toString().replace("-", "");
        user.setResetTokenHash(passwordEncoder.encode(token));
        user.setResetTokenExpiry(LocalDateTime.now().plusHours(24));
        userRepository.save(user);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Password reset token generated. It is valid for 24 hours.");
        response.put("resetToken", token);
        return response;
    }

    @Override
    public void resetPassword(String token, String newPassword) {
        User user = userRepository.findAll().stream()
                .filter(u -> u.getResetTokenHash() != null)
                .filter(u -> passwordEncoder.matches(token, u.getResetTokenHash()))
                .findFirst()
                .orElseThrow(() -> new InvalidContentException("Invalid or expired reset token"));

        if (user.getResetTokenExpiry() == null || LocalDateTime.now().isAfter(user.getResetTokenExpiry())) {
            throw new InvalidContentException("This reset token has expired. Please request a new one.");
        }
        if (!isPasswordComplex(newPassword)) {
            throw new InvalidContentException("Password must be at least 8 characters long and contain uppercase, lowercase, number and special character.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetTokenHash(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);
    }

    @Override
    public void changePassword(String username, String currentPassword, String newPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new InvalidContentException("User not found: " + username));
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new InvalidContentException("Current password is incorrect");
        }
        if (!isPasswordComplex(newPassword)) {
            throw new InvalidContentException("Password must be at least 8 characters long and contain uppercase, lowercase, number and special character.");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    private boolean isPasswordComplex(String password) {
        if (password == null || password.length() < 8) return false;
        boolean hasUpper = false, hasLower = false, hasDigit = false, hasSpecial = false;
        for (char c : password.toCharArray()) {
            if (Character.isUpperCase(c)) hasUpper = true;
            else if (Character.isLowerCase(c)) hasLower = true;
            else if (Character.isDigit(c)) hasDigit = true;
            else hasSpecial = true; // non-alphanumeric/special char
        }
        return hasUpper && hasLower && hasDigit && hasSpecial;
    }
}
