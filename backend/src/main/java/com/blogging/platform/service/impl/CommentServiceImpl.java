package com.blogging.platform.service.impl;

import com.blogging.platform.dto.request.CommentRequest;
import com.blogging.platform.exception.ContentNotFoundException;
import com.blogging.platform.exception.InvalidContentException;
import com.blogging.platform.exception.UnauthorizedAccessException;
import com.blogging.platform.model.BlogPost;
import com.blogging.platform.model.Comment;
import com.blogging.platform.model.Like;
import com.blogging.platform.model.User;
import com.blogging.platform.model.enums.CommentStatus;
import com.blogging.platform.model.enums.NotificationType;
import com.blogging.platform.model.enums.RoleType;
import com.blogging.platform.repository.BlogPostRepository;
import com.blogging.platform.repository.CommentRepository;
import com.blogging.platform.repository.LikeRepository;
import com.blogging.platform.repository.UserRepository;
import com.blogging.platform.service.AuditService;
import com.blogging.platform.service.CommentService;
import com.blogging.platform.service.NotificationService;
import com.blogging.platform.service.SettingsService;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@Transactional
public class CommentServiceImpl implements CommentService {

    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final BlogPostRepository blogPostRepository;
    private final LikeRepository likeRepository;
    private final NotificationService notificationService;
    private final SettingsService settingsService;
    private final AuditService auditService;

    public CommentServiceImpl(CommentRepository commentRepository, UserRepository userRepository,
                             BlogPostRepository blogPostRepository, LikeRepository likeRepository,
                             NotificationService notificationService, SettingsService settingsService,
                             AuditService auditService) {
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
        this.blogPostRepository = blogPostRepository;
        this.likeRepository = likeRepository;
        this.notificationService = notificationService;
        this.settingsService = settingsService;
        this.auditService = auditService;
    }

    @Override
    public Comment addComment(String username, CommentRequest request) {
        if (request.getContent() == null || request.getContent().trim().isEmpty() || request.getContent().trim().length() > 1000) {
            throw new InvalidContentException("Comment content must be between 1 and 1000 characters");
        }

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + username));

        BlogPost blogPost = blogPostRepository.findById(request.getBlogPostId())
                .orElseThrow(() -> new ContentNotFoundException("Blog post not found: " + request.getBlogPostId()));

        Comment comment = new Comment();
        comment.setContent(request.getContent());
        comment.setUser(user);
        comment.setBlogPost(blogPost);
        comment.setStatus(settingsService.isPreModerationEnabled()
                ? CommentStatus.PENDING
                : CommentStatus.ACTIVE);

        if (request.getParentCommentId() != null) {
            Comment parent = commentRepository.findById(request.getParentCommentId())
                    .orElseThrow(() -> new InvalidContentException("Parent comment not found: " + request.getParentCommentId()));
            comment.setParentComment(parent);
        }

        Comment saved = commentRepository.save(comment);

        // Notify the post author about new comment activity
        User author = blogPost.getUser();
        if (author != null && !author.getId().equals(user.getId())) {
            String contentPreview = request.getContent().length() > 60
                    ? request.getContent().substring(0, 60) + "..."
                    : request.getContent();
            notificationService.create(
                    author.getId(),
                    "New comment on your article",
                    user.getUsername() + " commented: \"" + contentPreview + "\"",
                    request.getParentCommentId() != null ? NotificationType.REPLY : NotificationType.COMMENT
            );
        }

        return saved;
    }

    @Override
    public Page<Comment> getCommentsByPostId(Long postId, Pageable pageable) {
        if (!blogPostRepository.existsById(postId)) {
            throw new ContentNotFoundException("Blog post not found: " + postId);
        }
        return commentRepository.findByBlogPostIdAndStatusAndParentCommentIsNull(postId, CommentStatus.ACTIVE, pageable);
    }

    @Override
    public Page<Comment> getRepliesByCommentId(Long commentId, Pageable pageable) {
        if (!commentRepository.existsById(commentId)) {
            throw new ContentNotFoundException("Comment not found: " + commentId);
        }
        return commentRepository.findByParentCommentIdAndStatus(commentId, CommentStatus.ACTIVE, pageable);
    }

    @Override
    public Comment updateComment(String username, Long commentId, CommentRequest request) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ContentNotFoundException("Comment not found: " + commentId));

        if (!comment.getUser().getUsername().equals(username)) {
            throw new UnauthorizedAccessException("You do not have permission to edit this comment");
        }

        if (request.getContent() == null || request.getContent().trim().isEmpty() || request.getContent().trim().length() > 1000) {
            throw new InvalidContentException("Comment content must be between 1 and 1000 characters");
        }

        comment.setContent(request.getContent());
        return commentRepository.save(comment);
    }

    @Override
    public void deleteComment(String username, Long commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ContentNotFoundException("Comment not found: " + commentId));

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + username));

        boolean isOwner = comment.getUser().getUsername().equals(username);
        boolean isPostAuthor = comment.getBlogPost().getUser().getUsername().equals(username);
        boolean isAdminOrMod = user.getRole().getRoleName() == RoleType.ADMIN || user.getRole().getRoleName() == RoleType.MODERATOR;

        if (!isOwner && !isPostAuthor && !isAdminOrMod) {
            throw new UnauthorizedAccessException("You do not have permission to delete this comment");
        }

        likeRepository.deleteByCommentId(commentId);
        commentRepository.delete(comment);
        auditService.log(username, "COMMENT_DELETED", "Comment", String.valueOf(commentId),
                "Deleted comment by " + comment.getUser().getUsername());
    }

    @Override
    public Comment hideComment(String username, Long commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ContentNotFoundException("Comment not found: " + commentId));

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + username));

        boolean isOwner = comment.getUser().getUsername().equals(username);
        boolean isPostAuthor = comment.getBlogPost().getUser().getUsername().equals(username);
        boolean isAdmin = user.getRole().getRoleName() == RoleType.ADMIN;
        boolean isModerator = user.getRole().getRoleName() == RoleType.MODERATOR;

        if (!isOwner && !isPostAuthor && !isAdmin && !isModerator) {
            throw new UnauthorizedAccessException("You do not have permission to hide this comment");
        }

        comment.setStatus(CommentStatus.HIDDEN);
        Comment hidden = commentRepository.save(comment);
        auditService.log(username, "COMMENT_HIDDEN", "Comment", String.valueOf(commentId),
                "Hidden comment by " + comment.getUser().getUsername());
        return hidden;
    }

    @Override
    public String toggleLikeComment(String username, Long commentId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + username));
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ContentNotFoundException("Comment not found: " + commentId));

        Optional<Like> existingLike = likeRepository.findByUserIdAndCommentId(user.getId(), commentId);

        if (existingLike.isPresent()) {
            likeRepository.delete(existingLike.get());
            return "Comment unliked successfully";
        } else {
            Like newLike = new Like();
            newLike.setUser(user);
            newLike.setComment(comment);
            likeRepository.save(newLike);

            User author = comment.getUser();
            if (author != null && !author.getId().equals(user.getId())) {
                notificationService.create(
                        author.getId(),
                        "Your comment received a like",
                        user.getUsername() + " liked your comment on \"" + comment.getBlogPost().getTitle() + "\"",
                        NotificationType.LIKE
                );
            }
            return "Comment liked successfully";
        }
    }

    @Override
    public Page<Comment> getPendingComments(String username, Pageable pageable) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + username));
        boolean isAdmin = user.getRole().getRoleName() == RoleType.ADMIN;
        boolean isModerator = user.getRole().getRoleName() == RoleType.MODERATOR;

        if (!isAdmin && !isModerator) {
            throw new UnauthorizedAccessException("Only moderators and administrators can view the moderation queue");
        }

        return commentRepository.findByStatus(CommentStatus.PENDING, pageable);
    }

    @Override
    public Comment approveComment(String username, Long commentId) {
        Comment comment = requireModerator(username, commentId);
        comment.setStatus(CommentStatus.ACTIVE);
        Comment approved = commentRepository.save(comment);
        auditService.log(username, "COMMENT_APPROVED", "Comment", String.valueOf(commentId),
                "Approved pending comment by " + comment.getUser().getUsername());

        notificationService.create(
                comment.getUser().getId(),
                "Your comment was approved",
                "Your comment on \"" + comment.getBlogPost().getTitle() + "\" is now visible",
                NotificationType.SYSTEM
        );
        return approved;
    }

    @Override
    public Comment rejectComment(String username, Long commentId) {
        Comment comment = requireModerator(username, commentId);
        comment.setStatus(CommentStatus.HIDDEN);
        Comment rejected = commentRepository.save(comment);
        auditService.log(username, "COMMENT_REJECTED", "Comment", String.valueOf(commentId),
                "Rejected pending comment by " + comment.getUser().getUsername());

        notificationService.create(
                comment.getUser().getId(),
                "Your comment was rejected",
                "A moderator did not approve your comment on \"" + comment.getBlogPost().getTitle() + "\"",
                NotificationType.SYSTEM
        );
        return rejected;
    }

    private Comment requireModerator(String username, Long commentId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + username));
        boolean isAdmin = user.getRole().getRoleName() == RoleType.ADMIN;
        boolean isModerator = user.getRole().getRoleName() == RoleType.MODERATOR;

        if (!isAdmin && !isModerator) {
            throw new UnauthorizedAccessException("Only moderators and administrators can moderate comments");
        }

        return commentRepository.findById(commentId)
                .orElseThrow(() -> new ContentNotFoundException("Comment not found: " + commentId));
    }
}
