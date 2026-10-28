package com.blogging.platform.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "analytics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Analytics extends BaseEntity {

    private long views = 0;
    private long likes = 0;
    private long shares = 0;
    private long comments = 0;
    private long bookmarks = 0;
    private double averageReadingTime = 0.0;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blog_post_id", nullable = false)
    @JsonBackReference(value = "blog-analytics")
    private BlogPost blogPost;
}
