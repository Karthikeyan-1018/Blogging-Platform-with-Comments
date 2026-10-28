package com.blogging.platform;

import com.blogging.platform.dto.request.BlogRequest;
import com.blogging.platform.dto.request.LoginRequest;
import com.blogging.platform.dto.request.RegisterRequest;
import com.blogging.platform.model.Category;
import com.blogging.platform.model.Role;
import com.blogging.platform.model.User;
import com.blogging.platform.model.enums.RoleType;
import com.blogging.platform.model.enums.UserStatus;
import com.blogging.platform.repository.AnalyticsRepository;
import com.blogging.platform.repository.AuditLogRepository;
import com.blogging.platform.repository.BlogPostRepository;
import com.blogging.platform.repository.BookmarkRepository;
import com.blogging.platform.repository.CategoryRepository;
import com.blogging.platform.repository.CommentRepository;
import com.blogging.platform.repository.DailyViewRepository;
import com.blogging.platform.repository.LikeRepository;
import com.blogging.platform.repository.ReportRepository;
import com.blogging.platform.repository.RoleRepository;
import com.blogging.platform.repository.SubscriptionRepository;
import com.blogging.platform.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.context.TestPropertySource;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "spring.datasource.url=jdbc:mysql://127.0.0.1:3306/demo_test?createDatabaseIfNotExist=true")
public class PremiumAndSecurityIntegrationTest {

    private static final String SECRET_LINE = "SECRET_PREMIUM_LINE_SUBSCRIBER_ONLY_VISIBLE";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private RoleRepository roleRepo;

    @Autowired
    private CategoryRepository categoryRepo;

    @Autowired
    private BlogPostRepository blogPostRepo;

    @Autowired
    private SubscriptionRepository subscriptionRepo;

    @Autowired
    private CommentRepository commentRepo;

    @Autowired
    private LikeRepository likeRepo;

    @Autowired
    private ReportRepository reportRepo;

    @Autowired
    private BookmarkRepository bookmarkRepo;

    @Autowired
    private AnalyticsRepository analyticsRepo;

    @Autowired
    private AuditLogRepository auditLogRepo;

    @Autowired
    private DailyViewRepository dailyViewRepo;

    private Category category;

    @BeforeEach
    public void setup() {
        reportRepo.deleteAll();
        likeRepo.deleteAll();
        commentRepo.deleteAll();
        bookmarkRepo.deleteAll();
        analyticsRepo.deleteAll();
        subscriptionRepo.deleteAll();
        dailyViewRepo.deleteAll();
        blogPostRepo.deleteAll();

        category = categoryRepo.findByName("Technology").orElseGet(() -> {
            Category c = new Category();
            c.setName("Technology");
            c.setSlug("technology");
            c.setDescription("Tech news and tutorials");
            return categoryRepo.save(c);
        });

        ensureSeededUser("admin", "admin123", "admin@bloghub.com", "Platform Admin", RoleType.ADMIN);
        ensureSeededUser("premium_blogger", "premium123", "premium@bloghub.com", "Premium Writer", RoleType.PREMIUM_BLOGGER);
        ensureSeededUser("reader_user", "reader123", "reader@bloghub.com", "Avid Reader", RoleType.READER);
    }

    private void ensureSeededUser(String username, String password, String email, String fullName, RoleType roleType) {
        User user = userRepo.findByUsername(username).orElseGet(User::new);
        if (user.getId() == null) {
            user.setUsername(username);
            user.setEmail(email);
            user.setFullName(fullName);
        }
        Role role = roleRepo.findByRoleName(roleType).orElseThrow();
        user.setRole(role);
        user.setPassword(passwordEncoder.encode(password));
        user.setStatus(UserStatus.ACTIVE);
        user.setEnabled(true);
        user.setEmailVerified(true);
        userRepo.save(user);
    }

    private String login(String username, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", username,
                                "password", password))))
                .andExpect(status().isOk())
                .andReturn();
        Map<?, ?> map = objectMapper.readValue(result.getResponse().getContentAsString(), Map.class);
        return (String) map.get("token");
    }

    private Integer createPublishedPost(String token, boolean premium) throws Exception {
        BlogRequest request = new BlogRequest();
        request.setTitle("Premium gate integration test post");
        request.setContent(SECRET_LINE + " This is a full length article body so the content length validation passes without any trouble at all.");
        request.setSummary("Integration test summary");
        request.setCategoryId(category.getId());
        request.setTags(java.util.List.of("premium", "test"));
        request.setPremium(premium);
        request.setStatus("PUBLISHED");

        MvcResult result = mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();
        Map<?, ?> map = objectMapper.readValue(result.getResponse().getContentAsString(), Map.class);
        return (Integer) map.get("id");
    }

    @Test
    public void testAdminAndModeratorSelfRegistrationIsRejected() throws Exception {
        String suffix = String.valueOf(System.nanoTime());
        RegisterRequest adminReq = new RegisterRequest();
        adminReq.setUsername("sneaky_admin_" + suffix);
        adminReq.setFullName("Sneaky");
        adminReq.setEmail("sneaky" + suffix + "@example.com");
        adminReq.setPassword("AdminPass123!");
        adminReq.setRole("ADMIN");
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adminReq)))
                .andExpect(status().isBadRequest());

        RegisterRequest modReq = new RegisterRequest();
        modReq.setUsername("sneaky_mod_" + suffix);
        modReq.setFullName("Sneaky Mod");
        modReq.setEmail("sneaky2" + suffix + "@example.com");
        modReq.setPassword("ModPass123!");
        modReq.setRole("MODERATOR");
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(modReq)))
                .andExpect(status().isBadRequest());

        // A reader can still self-register
        RegisterRequest readerReq = new RegisterRequest();
        readerReq.setUsername("legit_reader_" + suffix);
        readerReq.setFullName("Legit Reader");
        readerReq.setEmail("legit" + suffix + "@example.com");
        readerReq.setPassword("ReaderPass123!");
        readerReq.setRole("READER");
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(readerReq)))
                .andExpect(status().isCreated());
    }

    @Test
    public void testForgotAndResetPasswordFlow() throws Exception {
        String username = "reset_user_" + System.nanoTime();
        RegisterRequest reg = new RegisterRequest();
        reg.setUsername(username);
        reg.setFullName("Reset User");
        reg.setEmail(username + "@example.com");
        reg.setPassword("OldPass123!");
        reg.setRole("READER");
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reg)))
                .andExpect(status().isCreated());

        // Request reset token
        MvcResult forgotResult = mockMvc.perform(post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("usernameOrEmail", username))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resetToken").exists())
                .andReturn();
        Map<?, ?> forgotMap = objectMapper.readValue(forgotResult.getResponse().getContentAsString(), Map.class);
        String token = (String) forgotMap.get("resetToken");
        assertThat(token).hasSize(32);

        // Weak password rejected
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("token", token, "newPassword", "weak"))))
                .andExpect(status().isBadRequest());

        // Strong password accepted
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("token", token, "newPassword", "BrandNewPass123!"))))
                .andExpect(status().isOk());

        // New password works
        LoginRequest login = new LoginRequest();
        login.setUsername(username);
        login.setPassword("BrandNewPass123!");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk());

        // Token cannot be reused
        mockMvc.perform(post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("token", token, "newPassword", "AnotherPass123!"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    public void testPremiumGatingSubscribeUnsubscribeAndDBNotCorrupted() throws Exception {
        String authorToken = login("premium_blogger", "premium123");
        String readerToken = login("reader_user", "reader123");
        String adminToken = login("admin", "admin123");

        Integer postId = createPublishedPost(authorToken, true);

        // Non-subscriber reader sees masked content and is marked locked
        MvcResult lockedResult = mockMvc.perform(get("/api/posts/" + postId)
                        .header("Authorization", "Bearer " + readerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.premium").value(true))
                .andExpect(jsonPath("$.premiumLocked").value(true))
                .andExpect(jsonPath("$.authorId").exists())
                .andReturn();
        Map<?, ?> lockedMap = objectMapper.readValue(lockedResult.getResponse().getContentAsString(), Map.class);
        assertThat((String) lockedMap.get("content")).doesNotContain(SECRET_LINE);

        // DB content is never overwritten by the masking logic
        assertThat(blogPostRepo.findById(postId.longValue()).orElseThrow().getContent()).contains(SECRET_LINE);

        long authorId = ((Number) lockedMap.get("authorId")).longValue();

        // Subscribe -> content unlocks
        mockMvc.perform(post("/api/subscriptions/" + authorId + "/subscribe")
                        .header("Authorization", "Bearer " + readerToken))
                .andExpect(status().isOk());
        MvcResult unlockedResult = mockMvc.perform(get("/api/posts/" + postId)
                        .header("Authorization", "Bearer " + readerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.premiumLocked").doesNotExist())
                .andReturn();
        Map<?, ?> unlockedMap = objectMapper.readValue(unlockedResult.getResponse().getContentAsString(), Map.class);
        assertThat((String) unlockedMap.get("content")).contains(SECRET_LINE);

        // Status endpoint reflects the subscription
        mockMvc.perform(get("/api/subscriptions/" + authorId + "/status")
                        .header("Authorization", "Bearer " + readerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subscribed").value(true));

        // Unsubscribe -> locked again
        mockMvc.perform(post("/api/subscriptions/" + authorId + "/unsubscribe")
                        .header("Authorization", "Bearer " + readerToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/posts/" + postId)
                        .header("Authorization", "Bearer " + readerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.premiumLocked").value(true));

        // Author and admin always see full content
        mockMvc.perform(get("/api/posts/" + postId)
                        .header("Authorization", "Bearer " + authorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.premiumLocked").doesNotExist());
        mockMvc.perform(get("/api/posts/" + postId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.premiumLocked").doesNotExist());
    }

    @Test
    public void testAuditLogOnRoleChange() throws Exception {
        String adminToken = login("admin", "admin123");
        User reader = userRepo.findByUsername("reader_user").orElseThrow();

        mockMvc.perform(put("/api/users/" + reader.getId() + "/role")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("role", "PREMIUM_BLOGGER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("User role updated to PREMIUM_BLOGGER"));

        // Audit log entry must exist for the role change
        assertThat(auditLogRepo.findAll())
                .anyMatch(log -> "USER_ROLE_CHANGED".equals(log.getAction())
                        && String.valueOf(reader.getId()).equals(log.getTargetId()));

        // Admin can fetch audit log via the endpoint
        mockMvc.perform(get("/api/admin/audit-logs")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].action").isArray());

        // A regular user cannot access the audit log
        String readerToken = login("reader_user", "reader123");
        mockMvc.perform(get("/api/admin/audit-logs")
                        .header("Authorization", "Bearer " + readerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    public void testDashboardEndpointsReturnDataForLoggedInUser() throws Exception {
        String authorToken = login("premium_blogger", "premium123");
        Integer postId = createPublishedPost(authorToken, true);

        // A view on the post feeds both viewCount and the daily view log
        mockMvc.perform(get("/api/posts/" + postId)
                        .header("Authorization", "Bearer " + authorToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/dashboard/stats")
                        .header("Authorization", "Bearer " + authorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalPosts").value(1))
                .andExpect(jsonPath("$.publishedPosts").value(1))
                .andExpect(jsonPath("$.totalViews").value(1))
                .andExpect(jsonPath("$.totalLikes").exists())
                .andExpect(jsonPath("$.totalComments").exists())
                .andExpect(jsonPath("$.viewsTrend").isArray())
                .andExpect(jsonPath("$.viewsTrend.length()").value(30));

        mockMvc.perform(get("/api/dashboard/activity")
                        .header("Authorization", "Bearer " + authorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        mockMvc.perform(get("/api/dashboard/top-posts")
                        .header("Authorization", "Bearer " + authorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(postId))
                .andExpect(jsonPath("$[0].views").value(1));

        mockMvc.perform(get("/api/dashboard/drafts")
                        .header("Authorization", "Bearer " + authorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        // Unauthenticated access is rejected
        mockMvc.perform(get("/api/dashboard/stats"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    public void testHomeEndpointsArePublicAndReturnData() throws Exception {
        // Public endpoints require no auth (the Home page is public)
        mockMvc.perform(get("/api/home/trending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
        mockMvc.perform(get("/api/home/top-contributors"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
        mockMvc.perform(get("/api/home/recent-authors"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
        mockMvc.perform(get("/api/home/recent-comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        // After creating a published post + comment, the widgets return content
        String authorToken = login("premium_blogger", "premium123");
        String readerToken = login("reader_user", "reader123");
        Integer postId = createPublishedPost(authorToken, false);

        mockMvc.perform(get("/api/home/trending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(postId))
                .andExpect(jsonPath("$[0].title").exists())
                .andExpect(jsonPath("$[0].views").value(0));

        mockMvc.perform(get("/api/home/top-contributors"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].postCount").value(1));

        mockMvc.perform(get("/api/home/recent-authors"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").exists());

        mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .header("Authorization", "Bearer " + readerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "content", "Nice recent comment for the home feed",
                                "blogPostId", postId.longValue()))))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/home/recent-comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content").exists())
                .andExpect(jsonPath("$[0].postTitle").exists())
                .andExpect(jsonPath("$[0].commenter.username").exists());
    }
}