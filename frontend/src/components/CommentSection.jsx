import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import { useAlert } from '../context/AlertContext';
import { FaHeart, FaReply, FaTrashAlt, FaEdit, FaEyeSlash, FaTimesCircle, FaCheckCircle } from 'react-icons/fa';
import '../styles/Comments.css';

const CommentCard = ({ comment, postId, postAuthorUsername, onCommentUpdated, depth = 1 }) => {
  const { user, isAdmin, isModerator, isBlogger } = useAuth();
  const { showAlert } = useAlert();
  const [replies, setReplies] = useState([]);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [repliesPage, setRepliesPage] = useState(0);
  const [hasMoreReplies, setHasMoreReplies] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likesCount || 0);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [savingEdit, setSavingEdit] = useState(false);

  const authorName = comment.user?.fullName || comment.user?.username || 'Anonymous';
  const avatarUrl = comment.user?.profileImage;

  // Fetch replies on component mount if comment is top level and has child elements
  useEffect(() => {
    fetchReplies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comment.id]);

  const fetchReplies = async (loadPage = 0) => {
    try {
      const response = await api.get(`/api/comments/${comment.id}/replies`, {
        params: { page: loadPage, size: 5 }
      });
      const newReplies = response.data.content || [];
      if (loadPage === 0) {
        setReplies(newReplies);
      } else {
        setReplies((prev) => [...prev, ...newReplies]);
      }
      setHasMoreReplies(loadPage < response.data.totalPages - 1);
      setRepliesPage(loadPage);
    } catch (e) {
      console.error('Error fetching replies:', e);
    }
  };

  const handleLike = async () => {
    if (!user) {
      showAlert('Please log in to like comments', 'warning');
      return;
    }
    try {
      const response = await api.post(`/api/comments/${comment.id}/like`);
      const msg = response.data.message || '';
      if (msg.includes('liked')) {
        setLiked(true);
        setLikeCount((prev) => prev + 1);
        showAlert('Comment liked successfully', 'success');
      } else {
        setLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
        showAlert('Comment unliked successfully', 'info');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      const response = await api.post(`/api/posts/${postId}/comments`, {
        content: replyText,
        parentCommentId: comment.id,
        blogPostId: parseInt(postId, 10)
      });
      setReplies((prev) => [...prev, response.data]);
      setReplyText('');
      setShowReplyBox(false);
      showAlert('Reply posted successfully!', 'success');
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error replying to comment', 'error');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await api.delete(`/api/comments/${comment.id}`);
      onCommentUpdated();
      showAlert('Comment deleted successfully', 'success');
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error deleting comment', 'error');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const trimmed = editText.trim();
    if (!trimmed) {
      showAlert('Comment cannot be empty', 'warning');
      return;
    }
    setSavingEdit(true);
    try {
      await api.put(`/api/comments/${comment.id}`, { content: trimmed });
      setEditing(false);
      showAlert('Comment updated successfully', 'success');
      onCommentUpdated();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error updating comment', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleHide = async () => {
    try {
      await api.put(`/api/comments/${comment.id}/hide`);
      onCommentUpdated();
      showAlert('Comment hidden successfully', 'success');
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error hiding comment', 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Just now';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isCommentOwner = user && user.username === comment.user?.username;
  const isPostAuthor = user && postAuthorUsername && user.username === postAuthorUsername;
  const showModeratorTools = isAdmin || isModerator || isCommentOwner || (isBlogger && isPostAuthor);

  return (
    <div className="comment-card">
      <div className="comment-header">
        <div className="comment-author">
          <div className="comment-avatar">
            {avatarUrl && !avatarFailed ? (
              <img
                src={avatarUrl}
                alt={authorName}
                className="comment-avatar-img"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              authorName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="comment-name">
              {authorName}
            </div>
            <div className="comment-date">{formatDate(comment.createdAt)}</div>
          </div>
        </div>
        
        {showModeratorTools && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {isCommentOwner && !editing && (
              <button className="btn-report" onClick={() => { setEditText(comment.content); setEditing(true); }} title="Edit comment" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)' }}>
                <FaEdit />
              </button>
            )}
            {(isAdmin || isModerator || isPostAuthor) && !isCommentOwner && (
              <button className="btn-report" onClick={handleHide} title="Hide comment" style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>
                <FaEyeSlash />
              </button>
            )}
            <button className="btn-report" onClick={handleDelete} title="Delete comment" style={{ fontSize: '0.8rem' }}>
              <FaTrashAlt />
            </button>
          </div>
        )}
      </div>

      <div className="comment-body">
        {editing ? (
          <form onSubmit={handleEditSubmit}>
            <textarea
              className="comment-textarea"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" className="pagination-btn" onClick={() => { setEditing(false); setEditText(comment.content); }} disabled={savingEdit} style={{ height: '32px', fontSize: '0.8rem' }}>
                <FaTimesCircle /> Cancel
              </button>
              <button type="submit" className="btn-submit" disabled={savingEdit} style={{ width: 'auto', padding: '0 15px', height: '32px', fontSize: '0.8rem', marginTop: 0 }}>
                <FaCheckCircle /> {savingEdit ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        ) : (
          comment.content
        )}
      </div>

      <div className="comment-actions">
        <div className={`comment-action-item ${liked ? 'liked' : ''}`} onClick={handleLike}>
          <FaHeart /> <span>{likeCount} Likes</span>
        </div>
        {user && depth < 5 && (
          <div className="comment-action-item" onClick={() => setShowReplyBox(!showReplyBox)}>
            <FaReply /> <span>Reply</span>
          </div>
        )}
      </div>

      {showReplyBox && (
        <form className="reply-editor" onSubmit={handleReplySubmit}>
          <input
            type="text"
            className="comment-textarea"
            placeholder="Write a reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            style={{ minHeight: '40px', padding: '10px' }}
          />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              className="pagination-btn" 
              onClick={() => setShowReplyBox(false)}
              style={{ height: '32px', fontSize: '0.8rem' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-submit"
              style={{ width: 'auto', padding: '0 15px', height: '32px', fontSize: '0.8rem', marginTop: 0 }}
            >
              Reply
            </button>
          </div>
        </form>
      )}

      {/* Render Nested Replies */}
      {replies.length > 0 && (
        <div className="replies-container">
          {replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              postId={postId}
              onCommentUpdated={fetchReplies}
              depth={depth + 1}
            />
          ))}
          {hasMoreReplies && (
            <button 
              className="btn-load-more" 
              onClick={() => fetchReplies(repliesPage + 1)}
              style={{ margin: '5px 0' }}
            >
              Show more replies
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const CommentSection = ({ postId }) => {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const fetchComments = async (loadPage = 0) => {
    setLoading(true);
    try {
      const response = await api.get(`/api/posts/${postId}/comments`, {
        params: { page: loadPage, size: 10 }
      });
      const data = response.data.content || [];
      if (loadPage === 0) {
        setComments(data);
      } else {
        setComments((prev) => [...prev, ...data]);
      }
      setTotalPages(response.data.totalPages || 0);
      setPage(loadPage);
    } catch (e) {
      console.error('Error fetching comments:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const response = await api.post(`/api/posts/${postId}/comments`, {
        content: commentText,
        blogPostId: parseInt(postId, 10)
      });
      setComments((prev) => [response.data, ...prev]);
      setCommentText('');
      showAlert('Comment posted successfully!', 'success');
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error posting comment', 'error');
    }
  };

  const handleLoadMore = () => {
    if (page < totalPages - 1) {
      fetchComments(page + 1);
    }
  };

  return (
    <div className="comments-section glass-card" style={{ padding: '30px', marginTop: '40px' }}>
      <h3 className="comments-header">Discussion ({comments.length})</h3>

      {user ? (
        <form className="comment-input-area" onSubmit={handleCommentSubmit}>
          <textarea
            className="comment-textarea"
            placeholder="Add to the discussion..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <button 
            type="submit" 
            className="btn-submit" 
            style={{ width: 'auto', alignSelf: 'flex-end', marginTop: 0, padding: '10px 24px' }}
          >
            Submit Comment
          </button>
        </form>
      ) : (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '20px 0' }}>
          Please log in to post a comment.
        </div>
      )}

      {loading && comments.length === 0 ? (
        <div>Loading comments...</div>
      ) : (
        <div className="comment-list">
          {comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              postId={postId}
              postAuthorUsername={null}
              onCommentUpdated={() => fetchComments(0)}
            />
          ))}
          {page < totalPages - 1 && (
            <button className="btn-load-more" onClick={handleLoadMore}>
              Load More Comments
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CommentSection;
