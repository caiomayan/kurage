package com.kurage.api.domain;

public enum SubscriptionTier {
    FREE,
    PLUS,
    PRO,
    MAX;

    public boolean has(String feature) {
        if (feature == null) return false;
        return switch (feature) {
            case "PROFILE_VISITORS", "PLUS_BADGE" -> ordinal() >= PLUS.ordinal();
            case "ADVANCED_STATS", "RANKING_FILTERS", "PRO_BADGE" -> ordinal() >= PRO.ordinal();
            case "MAX_BADGE", "SERVER_PRIORITY", "PROFILE_HIGHLIGHT" -> this == MAX;
            default -> false;
        };
    }
}
