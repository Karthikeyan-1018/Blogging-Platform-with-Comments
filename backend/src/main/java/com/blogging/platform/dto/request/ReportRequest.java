package com.blogging.platform.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReportRequest {

    @NotBlank(message = "Report reason is required")
    private String reason; // matches ReportReason enum name

    @NotBlank(message = "Report description is required")
    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;

    private Long blogPostId; // optional if reporting a blog post

    private Long commentId; // optional if reporting a comment
}
