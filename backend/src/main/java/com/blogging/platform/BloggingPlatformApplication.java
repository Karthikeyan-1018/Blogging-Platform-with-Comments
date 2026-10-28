package com.blogging.platform;

import com.blogging.platform.model.Category;
import com.blogging.platform.model.PlatformSetting;
import com.blogging.platform.model.Role;
import com.blogging.platform.model.User;
import com.blogging.platform.model.enums.RoleType;
import com.blogging.platform.model.enums.UserStatus;
import com.blogging.platform.repository.CategoryRepository;
import com.blogging.platform.repository.PlatformSettingRepository;
import com.blogging.platform.repository.RoleRepository;
import com.blogging.platform.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Arrays;
import java.util.Map;

@SpringBootApplication
public class BloggingPlatformApplication {
    public static void main(String[] args) {
        SpringApplication.run(BloggingPlatformApplication.class, args);
    }

    @Bean
    public CommandLineRunner initCategories(CategoryRepository categoryRepository) {
        return args -> {
            String[][] defaultCats = {
                {"Technology", "tech-news-and-tutorials", "All about code, software, gadgets, and web development."},
                {"Lifestyle", "lifestyle-tips", "Sharing ideas about productivity, wellness, design, and habits."},
                {"Finance", "personal-finance", "Guides on money management, investment, budgeting, and career development."},
                {"Travel", "travel-diaries", "Exploring beautiful destinations, tips, routes, and cultural stories."},
                {"Health", "health-and-wellness", "Practical ideas for fitness, mental wellbeing, and healthy living."},
                {"Education", "education-and-learning", "Learning resources, study strategies, and ideas for personal growth."},
                {"Food", "food-and-cooking", "Recipes, cooking inspiration, and stories from the world of food."},
                {"Arts & Culture", "arts-and-culture", "Discovering creativity, books, music, film, and cultural perspectives."}
            };
            Arrays.stream(defaultCats).forEach(cat -> {
                if (!categoryRepository.existsByName(cat[0])) {
                    Category category = new Category();
                    category.setName(cat[0]);
                    category.setSlug(cat[1]);
                    category.setDescription(cat[2]);
                    categoryRepository.save(category);
                }
            });
        };
    }

    @Bean
    public CommandLineRunner initRolesAndUsers(
            RoleRepository roleRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        return args -> {
            Map<RoleType, String> roleDescriptions = Map.of(
                RoleType.ADMIN, "Full access - manage users, system config, edit/delete any post, moderate all content",
                RoleType.MODERATOR, "Content moderation - review reports, approve/reject comments, no post creation",
                RoleType.PREMIUM_BLOGGER, "Blog creation + monetization - ad revenue, sponsor payouts, subscriber stats",
                RoleType.BLOGGER, "Standard blog creation - create/edit own posts, analytics dashboard",
                RoleType.READER, "Read-only - browse posts, comment, like, no post creation"
            );

            for (Map.Entry<RoleType, String> entry : roleDescriptions.entrySet()) {
                if (roleRepository.findByRoleName(entry.getKey()).isEmpty()) {
                    Role role = new Role();
                    role.setRoleName(entry.getKey());
                    role.setDescription(entry.getValue());
                    roleRepository.save(role);
                }
            }

            Map<String, String[]> seededUsers = Map.of(
                "admin",           new String[]{"admin123",      "admin@bloghub.com",      "Platform Admin",    "ADMIN"},
                "moderator",       new String[]{"mod123",         "mod@bloghub.com",        "Content Moderator", "MODERATOR"},
                "premium_blogger", new String[]{"premium123",     "premium@bloghub.com",    "Premium Writer",    "PREMIUM_BLOGGER"},
                "blogger_user",    new String[]{"blog123",        "blogger@bloghub.com",    "Blog Author",       "BLOGGER"},
                "reader_user",     new String[]{"reader123",      "reader@bloghub.com",     "Avid Reader",       "READER"}
            );

            for (Map.Entry<String, String[]> entry : seededUsers.entrySet()) {
                if (!userRepository.existsByUsername(entry.getKey())) {
                    String[] details = entry.getValue();
                    RoleType roleType = RoleType.valueOf(details[3]);
                    Role role = roleRepository.findByRoleName(roleType)
                            .orElseThrow(() -> new RuntimeException("Role not found: " + roleType));

                    User user = new User();
                    user.setUsername(entry.getKey());
                    user.setFullName(details[2]);
                    user.setEmail(details[1]);
                    user.setPassword(passwordEncoder.encode(details[0]));
                    user.setStatus(UserStatus.ACTIVE);
                    user.setEnabled(true);
                    user.setEmailVerified(true);
                    user.setRole(role);
                    userRepository.save(user);
                }
            }
        };
    }

    @Bean
    public CommandLineRunner initPlatformSettings(PlatformSettingRepository platformSettingRepository) {
        return args -> {
            Map<String, String> defaultSettings = Map.of(
                "registrationOpen", "true",
                "preModerationEnabled", "false",
                "maintenanceMode", "false"
            );

            for (Map.Entry<String, String> entry : defaultSettings.entrySet()) {
                if (platformSettingRepository.findBySettingKey(entry.getKey()).isEmpty()) {
                    PlatformSetting setting = new PlatformSetting();
                    setting.setSettingKey(entry.getKey());
                    setting.setSettingValue(entry.getValue());
                    setting.setDescription("Platform configuration");
                    platformSettingRepository.save(setting);
                }
            }
        };
    }
}
