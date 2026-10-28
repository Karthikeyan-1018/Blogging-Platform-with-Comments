package com.blogging.platform;

import com.blogging.platform.dto.request.BlogRequest;
import com.blogging.platform.dto.request.CommentRequest;
import com.blogging.platform.dto.request.LoginRequest;
import com.blogging.platform.dto.request.RegisterRequest;
import com.blogging.platform.dto.request.ReportRequest;
import com.blogging.platform.model.Category;
import com.blogging.platform.repository.BlogPostRepository;
import com.blogging.platform.repository.CategoryRepository;
import com.blogging.platform.repository.CommentRepository;
import com.blogging.platform.repository.DailyViewRepository;
import com.blogging.platform.repository.LikeRepository;
import com.blogging.platform.repository.ReportRepository;
import com.blogging.platform.repository.RoleRepository;
import com.blogging.platform.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.context.TestPropertySource;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "spring.datasource.url=jdbc:mysql://127.0.0.1:3306/demo_test?createDatabaseIfNotExist=true")
public class BloggingPlatformApplicationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private RoleRepository roleRepo;

    @Autowired
    private BlogPostRepository blogPostRepo;

    @Autowired
    private CommentRepository commentRepo;

    @Autowired
    private ReportRepository reportRepo;

    @Autowired
    private LikeRepository likeRepo;

    @Autowired
    private CategoryRepository categoryRepo;

    @Autowired
    private DailyViewRepository dailyViewRepo;

    @Autowired
    private ObjectMapper objectMapper;

    private Category testCategory;

    @BeforeEach
    public void setup() {
        reportRepo.deleteAll();
        likeRepo.deleteAll();
        commentRepo.deleteAll();
        dailyViewRepo.deleteAll();
        blogPostRepo.deleteAll();
        userRepo.deleteAll();
        categoryRepo.deleteAll();

        // Setup test category
        Category category = new Category();
        category.setName("Technology");
        category.setSlug("technology");
        category.setDescription("Tech news and tutorials");
        testCategory = categoryRepo.save(category);
    }

    @Test
    public void testUserRegistrationAndLogin_WithPasswordComplexity() throws Exception {
        // 1. Register with a simple password (should fail security validation)
        RegisterRequest badRequest = new RegisterRequest();
        badRequest.setUsername("testuser");
        badRequest.setFullName("Test User");
        badRequest.setEmail("test@example.com");
        badRequest.setPassword("simple123"); // missing uppercase, special char
        badRequest.setRole("READER");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Password must meet security requirements"));

        // 2. Register with a strong password (should succeed)
        RegisterRequest goodRequest = new RegisterRequest();
        goodRequest.setUsername("testuser");
        goodRequest.setFullName("Test User");
        goodRequest.setEmail("test@example.com");
        goodRequest.setPassword("StrongPass123!"); // 8+ chars, upper, lower, digit, special
        goodRequest.setRole("READER");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(goodRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("testuser"));

        // 3. Login and obtain JWT token
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("testuser");
        loginRequest.setPassword("StrongPass123!");

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.role").value("READER"))
                .andReturn();

        String responseContent = result.getResponse().getContentAsString();
        Map<?, ?> responseMap = objectMapper.readValue(responseContent, Map.class);
        String token = (String) responseMap.get("token");
        assertThat(token).isNotEmpty();

        // 4. Fetch profile with Bearer Token
        mockMvc.perform(get("/api/users/profile")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.email").value("test@example.com"));
    }

    @Test
    public void testBlogPostCRUDWorkflow() throws Exception {
        // Register blogger user
        RegisterRequest register = new RegisterRequest();
        register.setUsername("blogger1");
        register.setFullName("Jane Doe");
        register.setEmail("jane@example.com");
        register.setPassword("BloggerPass123!");
        register.setRole("BLOGGER");
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(register)))
                .andExpect(status().isCreated());

        // Login to get token
        LoginRequest login = new LoginRequest();
        login.setUsername("blogger1");
        login.setPassword("BloggerPass123!");
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andReturn();
        Map<?, ?> loginMap = objectMapper.readValue(loginResult.getResponse().getContentAsString(), Map.class);
        String token = (String) loginMap.get("token");

        // 1. Create a blog post (should fail with invalid title)
        BlogRequest invalidPost = new BlogRequest();
        invalidPost.setTitle("Tiny"); // Too short
        invalidPost.setContent("Short content that must be at least fifty characters long to pass content check validation.");
        invalidPost.setCategoryId(testCategory.getId());

        mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidPost)))
                .andExpect(status().isBadRequest());

        // 2. Create a valid blog post
        BlogRequest validPost = new BlogRequest();
        validPost.setTitle("Working with Spring Boot 3");
        validPost.setContent("This is an in-depth tutorial on building beautiful REST APIs with Spring Boot 3.3.1. We will cover JWT security, JPA associations, DTO validations, and much more.");
        validPost.setSummary("A great tutorial about Spring Boot.");
        validPost.setCategoryId(testCategory.getId());
        validPost.setTags(List.of("spring", "java"));
        validPost.setStatus("PUBLISHED");

        MvcResult postResult = mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validPost)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Working with Spring Boot 3"))
                .andExpect(jsonPath("$.slug").value("working-with-spring-boot-3"))
                .andReturn();

        Map<?, ?> createdPostMap = objectMapper.readValue(postResult.getResponse().getContentAsString(), Map.class);
        Integer postId = (Integer) createdPostMap.get("id");

        // 3. Update the blog post
        BlogRequest updateRequest = new BlogRequest();
        updateRequest.setTitle("Working with Spring Boot 3 & Security");
        updateRequest.setContent("Updated in-depth tutorial on building beautiful REST APIs with Spring Boot 3.3.1. We will cover JWT security, JPA associations, DTO validations, and much more.");
        updateRequest.setCategoryId(testCategory.getId());

        mockMvc.perform(put("/api/posts/" + postId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Working with Spring Boot 3 & Security"));

        // 4. Retrieve post list (Pagination & Filtering)
        mockMvc.perform(get("/api/posts")
                        .header("Authorization", "Bearer " + token)
                        .param("categoryId", testCategory.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].title").value("Working with Spring Boot 3 & Security"));
    }

    @Test
    public void testCommentsAndReports() throws Exception {
        // Register reader
        RegisterRequest registerReader = new RegisterRequest();
        registerReader.setUsername("reader1");
        registerReader.setFullName("Bob Reader");
        registerReader.setEmail("bob@example.com");
        registerReader.setPassword("BobPass123!");
        registerReader.setRole("READER");
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerReader)))
                .andExpect(status().isCreated());

        // Login reader
        LoginRequest loginReader = new LoginRequest();
        loginReader.setUsername("reader1");
        loginReader.setPassword("BobPass123!");
        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginReader)))
                .andExpect(status().isOk())
                .andReturn();
        Map<?, ?> loginMap = objectMapper.readValue(loginResult.getResponse().getContentAsString(), Map.class);
        String token = (String) loginMap.get("token");

        // Register Admin by promoting reader1 directly (admin/moderator self-registration is blocked)
        com.blogging.platform.model.User adminUser = userRepo.findByUsername("reader1").orElseThrow();
        com.blogging.platform.model.Role adminRole = roleRepo.findByRoleName(com.blogging.platform.model.enums.RoleType.ADMIN)
                .orElseThrow();
        adminUser.setRole(adminRole);
        userRepo.save(adminUser);

        // Login Admin (reader1 now has the ADMIN role)
        LoginRequest loginAdmin = new LoginRequest();
        loginAdmin.setUsername("reader1");
        loginAdmin.setPassword("BobPass123!");
        MvcResult adminLoginResult = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginAdmin)))
                .andExpect(status().isOk())
                .andReturn();
        Map<?, ?> adminLoginMap = objectMapper.readValue(adminLoginResult.getResponse().getContentAsString(), Map.class);
        String adminToken = (String) adminLoginMap.get("token");

        // Create a blog post by Admin so we have a post to comment on
        BlogRequest postRequest = new BlogRequest();
        postRequest.setTitle("Admin Blog Post");
        postRequest.setContent("This is content written by admin. It meets content requirements easily because it's long enough.");
        postRequest.setCategoryId(testCategory.getId());
        postRequest.setStatus("PUBLISHED");
        MvcResult postResult = mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(postRequest)))
                .andExpect(status().isCreated())
                .andReturn();
        Map<?, ?> postMap = objectMapper.readValue(postResult.getResponse().getContentAsString(), Map.class);
        Integer postId = (Integer) postMap.get("id");

        // 1. Submit a comment
        CommentRequest commentRequest = new CommentRequest();
        commentRequest.setContent("This is an insightful post! Thanks for sharing.");
        commentRequest.setBlogPostId(postId.longValue());

        MvcResult commentResult = mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(commentRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("This is an insightful post! Thanks for sharing."))
                .andReturn();
        Map<?, ?> commentMap = objectMapper.readValue(commentResult.getResponse().getContentAsString(), Map.class);
        Integer commentId = (Integer) commentMap.get("id");

        // 2. Reply to the comment
        CommentRequest replyRequest = new CommentRequest();
        replyRequest.setContent("I agree with Bob, very nice post!");
        replyRequest.setBlogPostId(postId.longValue());
        replyRequest.setParentCommentId(commentId.longValue());

        MvcResult replyResult = mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(replyRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        // 3. Verify reply via the replies endpoint
        mockMvc.perform(get("/api/comments/" + commentId + "/replies")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].content").value("I agree with Bob, very nice post!"));

        // 4. Like comment
        mockMvc.perform(post("/api/comments/" + commentId + "/like")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Comment liked successfully"));

        // 4. Submit content report
        ReportRequest reportRequest = new ReportRequest();
        reportRequest.setReason("SPAM");
        reportRequest.setDescription("Self promotion links included in comments.");
        reportRequest.setCommentId(commentId.longValue());

        mockMvc.perform(post("/api/reports")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reportRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reason").value("SPAM"))
                .andExpect(jsonPath("$.description").value("Self promotion links included in comments."));

        // 5. Get reports (only allowed for admins)
        mockMvc.perform(get("/api/reports")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].reason").value("SPAM"));
    }
}
