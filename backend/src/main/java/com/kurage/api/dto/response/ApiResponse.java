package com.kurage.api.dto.response;

public record ApiResponse(
        Integer status,
        String message
) {
    public static ApiResponse create(Integer status, String message) {
        return new ApiResponse(status, message);
    }
}
