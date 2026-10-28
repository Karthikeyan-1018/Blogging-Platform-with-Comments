package com.blogging.platform.dto.response;

import com.blogging.platform.model.User;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PublicUserResponse {
    private Long id;
    private String username;
    private String fullName;
    private String bio;
    private String profileImage;

    public static PublicUserResponse from(User user) {
        if (user == null) {
            return null;
        }
        return new PublicUserResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getBio(),
                user.getProfileImage()
        );
    }
}
