package com.kurage.api.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Allows the expired state to commit while still returning HTTP 410. */
public class ExpiredInviteException extends ResponseStatusException {
    public ExpiredInviteException(String reason) {
        super(HttpStatus.GONE, reason);
    }
}
