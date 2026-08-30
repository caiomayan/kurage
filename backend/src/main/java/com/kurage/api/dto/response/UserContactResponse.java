package com.kurage.api.dto.response;

import com.kurage.api.domain.User;

/** Private response, available only to the authenticated account owner. */
public record UserContactResponse(String email, String phoneNumber) {

    public static UserContactResponse from(User user) {
        return new UserContactResponse(user.getEmail(), user.getPhoneE164());
    }
}
