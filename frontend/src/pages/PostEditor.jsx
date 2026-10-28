import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import { useAlert } from '../context/AlertContext';
import { FaCheckCircle, FaTimesCircle, FaSave, FaPaperPlane, FaBold, FaItalic, FaHeading, FaQuoteLeft, FaListUl, FaImage, FaLink, FaUpload, FaStar, FaSpinner } from 'react-icons/fa';
import '../styles/PostEditor.css';

const PostEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isReader, isModerator, isAdmin } = useAuth();
  const { showAlert } = useAlert();
  
  const [activeTab, setActiveTab] = useState('write');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  
  // Post Fields
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [premium, setPremium] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const contentImageRef = useRef(null);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const contentRef = useRef(null);

  // Protect route: redirect readers and moderators
  useEffect(() => {
    if (isReader || isModerator) {
      navigate('/');
    }
  }, [isReader, isModerator, navigate]);

  // Fetch Categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/api/categories');
        setCategories(response.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch Post for Editing
  useEffect(() => {
    if (id) {
      const fetchPost = async () => {
        try {
          const response = await api.get(`/api/posts/${id}`);
          const post = response.data;
          
          // Verify ownership (admin can edit any post)
          if (user && post.user?.username !== user.username && !isAdmin) {
            showAlert('You do not have permission to edit this post.', 'error');
            navigate('/');
            return;
          }

          setTitle(post.title || '');
          setSummary(post.summary || '');
          setContent(post.content || '');
          setCategoryId(post.category?.id || '');
          setFeaturedImage(post.featuredImage || '');
          setPremium(!!post.premium);
          setTags(post.tags?.map((t) => t.name) || []);
        } catch (err) {
          console.error(err);
          showAlert('Error loading blog post for editing.', 'error');
          navigate('/dashboard');
        }
      };
      fetchPost();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user, isAdmin, navigate]);

  // SEO Score calculation (0 to 100)
  const seoChecklist = {
    titleLength: title.length >= 5 && title.length <= 200,
    contentLength: content.replace(/<[^>]*>/g, '').length >= 50,
    hasCategory: categoryId !== '',
    hasExcerpt: summary.trim().length > 0,
    hasTags: tags.length >= 1,
    hasImage: featuredImage.trim().length > 0
  };

  const getSeoScore = () => {
    let score = 0;
    if (seoChecklist.titleLength) score += 20;
    if (seoChecklist.contentLength) score += 20;
    if (seoChecklist.hasCategory) score += 20;
    if (seoChecklist.hasExcerpt) score += 20;
    if (seoChecklist.hasTags) score += 10;
    if (seoChecklist.hasImage) score += 10;
    return score;
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (tag && !tags.includes(tag)) {
        setTags([...tags, tag]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (indexToRemove) => {
    setTags(tags.filter((_, index) => index !== indexToRemove));
  };

  const applyFormat = (prefix, suffix, urlPrompt) => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end) || 'text';

    if (urlPrompt) {
      const url = window.prompt(urlPrompt);
      if (!url) return;
      const replacement = `<a href="${url}" target="_blank" rel="noopener noreferrer">${selected}</a>`;
      const newContent = content.substring(0, start) + replacement + content.substring(end);
      setContent(newContent);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(start + replacement.length, start + replacement.length);
      });
      return;
    }

    const replacement = prefix + selected + suffix;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  };

  const insertImage = () => {
    const url = window.prompt('Paste the image URL:');
    if (!url) return;
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const replacement = `<img src="${url}" alt="Image" style="max-width:100%;border-radius:8px;" />`;
    setContent(content.substring(0, start) + replacement + content.substring(end));
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    });
  };

  const handleUpload = async (file) => {
    if (!file) return '/';
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      const response = await api.post('/api/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data.url;
    } catch (err) {
      showAlert(err.response?.data?.error || 'Image upload failed', 'error');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleFeaturedUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await handleUpload(file);
    if (url) {
      setFeaturedImage(url);
      showAlert('Featured image uploaded', 'success');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const insertUploadedImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleUpload(file).then((url) => {
      if (!url) return;
      const textarea = contentRef.current;
      const start = textarea?.selectionStart ?? content.length;
      const end = textarea?.selectionEnd ?? content.length;
      const replacement = `<img src="${url}" alt="Uploaded image" style="max-width:100%;border-radius:8px;" />`;
      setContent(content.substring(0, start) + replacement + content.substring(end));
      requestAnimationFrame(() => {
        textarea?.focus();
        textarea?.setSelectionRange(start + replacement.length, start + replacement.length);
      });
    });
  };

  const toolbarButtons = [
    { icon: <FaBold />, title: 'Bold', action: () => applyFormat('<b>', '</b>') },
    { icon: <FaItalic />, title: 'Italic', action: () => applyFormat('<i>', '</i>') },
    { icon: <FaHeading />, title: 'Heading', action: () => applyFormat('<h2>', '</h2>') },
    { icon: <FaQuoteLeft />, title: 'Blockquote', action: () => applyFormat('<blockquote>', '</blockquote>') },
    { icon: <FaListUl />, title: 'List', action: () => applyFormat('<ul><li>', '</li></ul>') },
    { icon: <FaImage />, title: 'Insert image', action: insertImage },
    { icon: <FaLink />, title: 'Add link', action: () => applyFormat('', '', 'Paste the link URL:') }
  ];

  const handleSave = async (status) => {
    if (!title.trim()) {
      showAlert('Title is required', 'warning');
      return;
    }
    if (title.length < 5 || title.length > 200) {
      showAlert('Title must be between 5 and 200 characters', 'warning');
      return;
    }
    const cleanContent = content.replace(/<[^>]*>/g, '');
    if (cleanContent.length < 50) {
      showAlert('Content must be at least 50 characters long', 'warning');
      return;
    }
    if (!categoryId) {
      showAlert('Please choose a category', 'warning');
      return;
    }

    setLoading(true);
    const postData = {
      title,
      summary,
      content,
      categoryId: parseInt(categoryId, 10),
      featuredImage,
      tags,
      premium,
      status
    };

    try {
      if (id) {
        // Edit existing post
        await api.put(`/api/posts/${id}`, postData);
        showAlert(`Blog post saved as ${status.toLowerCase()} successfully!`, 'success');
      } else {
        // Create new post
        await api.post('/api/posts', postData);
        showAlert(`Blog post created as ${status.toLowerCase()} successfully!`, 'success');
      }
      navigate('/dashboard');
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error saving blog post', 'error');
    } finally {
      setLoading(false);
    }
  };

  const seoScore = getSeoScore();

  return (
    <div className="container editor-container animate-fade-in">
      {/* Left Column: Form & WYSIWYG Writer */}
      <main className="editor-card glass-card">
        <div className="editor-tabs">
          <button 
            className={`editor-tab ${activeTab === 'write' ? 'active' : ''}`}
            onClick={() => setActiveTab('write')}
          >
            Write Post
          </button>
          <button 
            className={`editor-tab ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            Preview Story
          </button>
        </div>

        {activeTab === 'write' ? (
          <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
            <div className="form-group">
              <label className="form-label">Blog Title</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Working with Spring Boot 3"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                id="post-title-input"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-input"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={loading}
                  style={{ background: 'var(--bg-secondary)', color: 'white' }}
                  id="post-category-select"
                >
                  <option value="">-- Choose Category --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Featured Image URL</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://example.com/banner.jpg"
                    value={featuredImage}
                    onChange={(e) => setFeaturedImage(e.target.value)}
                    disabled={loading}
                    id="post-image-input"
                  />
                  <button
                    type="button"
                    className="toolbar-btn"
                    disabled={uploading || loading}
                    title="Upload featured image"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ flexShrink: 0, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {uploading ? <FaSpinner className="spinner-icon" /> : <><FaUpload /> Upload</>}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFeaturedUpload}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Summary / Excerpt</label>
              <input
                type="text"
                className="form-input"
                placeholder="Write a brief, one-sentence excerpt of this article..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                disabled={loading}
                id="post-summary-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Article Body (Rich Text)</label>
              <div className="editor-toolbar">
                {toolbarButtons.map((btn, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="toolbar-btn"
                    title={btn.title}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={btn.action}
                    disabled={loading}
                  >
                    {btn.icon}
                  </button>
                ))}
                <button
                  type="button"
                  className="toolbar-btn"
                  disabled={uploading || loading}
                  title="Upload and insert image"
                  onClick={() => contentImageRef.current?.click()}
                >
                  {uploading ? <FaSpinner className="spinner-icon" /> : <FaUpload />}
                </button>
                <input
                  ref={contentImageRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={insertUploadedImage}
                />
              </div>
              <div className="content-editor-wrapper">
                <textarea
                  className="editor-textarea"
                  placeholder="Start typing your story here... (Minimum 50 characters required)"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={loading}
                  rows={12}
                  ref={contentRef}
                  id="post-content-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tags (Type and press Enter or comma)</label>
              <div className="tags-input-wrapper">
                {tags.map((tag, idx) => (
                  <span key={idx} className="tag-badge">
                    #{tag}
                    <button type="button" className="btn-tag-remove" onClick={() => handleRemoveTag(idx)}>
                      &times;
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  className="tags-input"
                  placeholder={tags.length === 0 ? "Add tags..." : ""}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  disabled={loading}
                  id="post-tags-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Premium story</label>
              <label className="premium-toggle" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={premium}
                  onChange={(e) => setPremium(e.target.checked)}
                  disabled={loading}
                  style={{ width: '18px', height: '18px', accentColor: '#fbbf24' }}
                  id="post-premium-toggle"
                />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <FaStar style={{ color: '#fbbf24', marginRight: 6 }} />
                  Mark as premium — content is locked for non-subscribers of your profile.
                </span>
              </label>
            </div>

            <div className="editor-actions">
              <button 
                type="button" 
                className="btn-draft" 
                disabled={loading} 
                onClick={() => handleSave('DRAFT')}
              >
                <FaSave /> Save Draft
              </button>
              <button 
                type="button" 
                className="btn-submit" 
                style={{ width: 'auto', marginTop: 0 }}
                disabled={loading} 
                onClick={() => handleSave('PUBLISHED')}
              >
                <FaPaperPlane /> Publish Story
              </button>
            </div>
          </form>
        ) : (
          /* Preview Tab View */
          <div className="post-content" style={{ marginTop: '20px' }}>
            <h1 className="post-title" style={{ marginBottom: '20px' }}>{title || 'Story Title Placeholder'}</h1>
            {featuredImage && (
              <div 
                className="post-featured-image" 
                style={{ backgroundImage: `url(${featuredImage})`, height: '300px' }}
              />
            )}
            <div dangerouslySetInnerHTML={{ __html: content || '<p>Start writing to see the HTML preview here...</p>' }} />
          </div>
        )}
      </main>

      {/* Right Column: SEO Panel Checker */}
      <aside className="seo-panel glass-card">
        <div className="seo-header">
          <h3 className="footer-links-title" style={{ color: 'var(--text-primary)', marginBottom: 0 }}>
            SEO Optimizer
          </h3>
          <div className={`seo-score-gauge ${seoScore >= 80 ? 'good' : seoScore >= 50 ? 'medium' : ''}`}>
            {seoScore}%
          </div>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          Follow these guidelines to optimize your article visibility and meet platform validation rules:
        </p>

        <ul className="seo-checklist">
          <li className={`seo-item ${seoChecklist.titleLength ? 'passed' : ''}`}>
            {seoChecklist.titleLength ? <FaCheckCircle className="seo-icon" /> : <FaTimesCircle className="seo-icon" />}
            Title length between 5 - 200 chars
          </li>
          <li className={`seo-item ${seoChecklist.contentLength ? 'passed' : ''}`}>
            {seoChecklist.contentLength ? <FaCheckCircle className="seo-icon" /> : <FaTimesCircle className="seo-icon" />}
            Content length >= 50 characters
          </li>
          <li className={`seo-item ${seoChecklist.hasCategory ? 'passed' : ''}`}>
            {seoChecklist.hasCategory ? <FaCheckCircle className="seo-icon" /> : <FaTimesCircle className="seo-icon" />}
            Chosen a Category topic
          </li>
          <li className={`seo-item ${seoChecklist.hasExcerpt ? 'passed' : ''}`}>
            {seoChecklist.hasExcerpt ? <FaCheckCircle className="seo-icon" /> : <FaTimesCircle className="seo-icon" />}
            Added excerpt summary
          </li>
          <li className={`seo-item ${seoChecklist.hasTags ? 'passed' : ''}`}>
            {seoChecklist.hasTags ? <FaCheckCircle className="seo-icon" /> : <FaTimesCircle className="seo-icon" />}
            Added at least 1 tag topic
          </li>
          <li className={`seo-item ${seoChecklist.hasImage ? 'passed' : ''}`}>
            {seoChecklist.hasImage ? <FaCheckCircle className="seo-icon" /> : <FaTimesCircle className="seo-icon" />}
            Uploaded featured image
          </li>
        </ul>
      </aside>
    </div>
  );
};

export default PostEditor;
