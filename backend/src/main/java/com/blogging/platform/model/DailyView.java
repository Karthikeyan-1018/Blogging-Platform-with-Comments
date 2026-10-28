package com.blogging.platform.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(
        name = "daily_views",
        uniqueConstraints = @UniqueConstraint(columnNames = {"blog_post_id", "view_date"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DailyView extends BaseEntity {

    @Column(name = "view_date", nullable = false)
    private LocalDate date;

    private long views;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blog_post_id", nullable = false)
    private BlogPost blogPost;
}