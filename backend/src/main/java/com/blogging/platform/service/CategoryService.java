package com.blogging.platform.service;

import com.blogging.platform.dto.request.CategoryRequest;
import com.blogging.platform.model.Category;

import java.util.List;

public interface CategoryService {
    Category createCategory(CategoryRequest request);
    List<Category> getAllCategories();
    Category getCategoryById(Long id);
}
