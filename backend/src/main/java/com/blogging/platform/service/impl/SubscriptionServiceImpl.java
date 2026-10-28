package com.blogging.platform.service.impl;

import com.blogging.platform.exception.ContentNotFoundException;
import com.blogging.platform.exception.InvalidContentException;
import com.blogging.platform.model.Subscription;
import com.blogging.platform.model.User;
import com.blogging.platform.model.enums.NotificationType;
import com.blogging.platform.repository.SubscriptionRepository;
import com.blogging.platform.repository.UserRepository;
import com.blogging.platform.service.NotificationService;
import com.blogging.platform.service.SubscriptionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
@Transactional
public class SubscriptionServiceImpl implements SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public SubscriptionServiceImpl(SubscriptionRepository subscriptionRepository,
                                   UserRepository userRepository,
                                   NotificationService notificationService) {
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @Override
    public Map<String, Object> subscribe(String username, Long authorId) {
        User subscriber = userRepository.findByUsername(username)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + username));
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new ContentNotFoundException("Author not found: " + authorId));

        if (subscriber.getId().equals(author.getId())) {
            throw new InvalidContentException("You cannot subscribe to yourself");
        }

        Map<String, Object> response = new HashMap<>();
        if (subscriptionRepository.existsBySubscriberIdAndAuthorId(subscriber.getId(), authorId)) {
            response.put("subscribed", true);
            response.put("message", "You are already subscribed to this author");
            return response;
        }

        Subscription subscription = new Subscription();
        subscription.setSubscriber(subscriber);
        subscription.setAuthor(author);
        subscriptionRepository.save(subscription);

        notificationService.create(
                author.getId(),
                "New subscriber",
                subscriber.getUsername() + " subscribed to your premium content",
                NotificationType.SYSTEM
        );

        response.put("subscribed", true);
        response.put("message", "Subscribed successfully. Premium content unlocked!");
        return response;
    }

    @Override
    public Map<String, Object> unsubscribe(String username, Long authorId) {
        User subscriber = userRepository.findByUsername(username)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + username));

        Subscription subscription = subscriptionRepository
                .findBySubscriberIdAndAuthorId(subscriber.getId(), authorId)
                .orElseThrow(() -> new InvalidContentException("You are not subscribed to this author"));

        subscriptionRepository.delete(subscription);

        Map<String, Object> response = new HashMap<>();
        response.put("subscribed", false);
        response.put("message", "Unsubscribed successfully");
        return response;
    }

    @Override
    public Map<String, Object> subscriptionStatus(String username, Long authorId) {
        Map<String, Object> response = new HashMap<>();
        response.put("subscribed", false);
        response.put("subscriberCount", subscriptionRepository.countByAuthorId(authorId));
        if (username != null) {
            userRepository.findByUsername(username).ifPresent(user ->
                    response.put("subscribed", subscriptionRepository.existsBySubscriberIdAndAuthorId(user.getId(), authorId)));
        }
        return response;
    }

    @Override
    public long subscriberCount(Long authorId) {
        return subscriptionRepository.countByAuthorId(authorId);
    }
}