package com.blogging.platform.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tags")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Tag extends BaseEntity {

    @Column(unique = true, nullable = false)
    private String name;

    @Column(unique = true)
    private String slug;

    @Column(columnDefinition = "int default 0")
    private int usageCount = 0;

    @ManyToMany(mappedBy = "tags")
    @JsonIgnore
    private List<BlogPost> blogPosts = new ArrayList<>();
}
