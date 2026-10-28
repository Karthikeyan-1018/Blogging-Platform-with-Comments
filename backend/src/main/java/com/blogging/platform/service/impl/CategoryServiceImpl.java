package com.blogging.platform.service.impl;

import com.blogging.platform.dto.request.CategoryRequest;
import com.blogging.platform.exception.ContentNotFoundException;
import com.blogging.platform.exception.InvalidContentException;
import com.blogging.platform.model.Category;
import com.blogging.platform.repository.CategoryRepository;
import com.blogging.platform.service.CategoryService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryServiceImpl(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Override
    public Category createCategory(CategoryRequest request) {
        if (request.getName() == null || request.getName().trim().length() < 2 || request.getName().trim().length() > 50) {
            throw new InvalidContentException("Category name must be between 2 and 50 characters");
        }

        if (categoryRepository.findByName(request.getName().trim().toLowerCase()).isPresent()) {
            throw new InvalidContentException("Category name already exists");
        }

        Category category = new Category();
        category.setName(request.getName().trim());
        category.setDescription(request.getDescription());
        category.setSlug(request.getName().trim().toLowerCase().replaceAll("\\s+", "-"));
        return categoryRepository.save(category);
    }

    @Override
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    @Override
    public Category getCategoryById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ContentNotFoundException("Category not found with ID: " + id));
    }
}
