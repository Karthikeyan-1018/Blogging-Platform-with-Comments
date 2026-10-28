package com.blogging.platform.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class BlogRequest {

    @NotBlank(message = "Title is required")
    @Size(min = 5, max = 200, message = "Title must be between 5 and 200 characters")
    private String title;

    @NotBlank(message = "Content is required")
    @Size(min = 50, message = "Content must be at least 50 characters")
    private String content;

    @Size(max = 500, message = "Summary cannot exceed 500 characters")
    private String summary;

    @NotNull(message = "Category ID is required")
    private Long categoryId;

    private List<String> tags;

    private String status; // DRAFT or PUBLISHED

    private String visibility; // PUBLIC, PRIVATE, FOLLOWERS_ONLY

    private String featuredImage;

    private Boolean premium; // PREMIUM_BLOGGER only - marks post as premium (gated content)
}
