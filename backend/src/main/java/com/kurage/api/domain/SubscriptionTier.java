package com.kurage.api.domain;

public enum SubscriptionTier {
    FREE,
    MARE;

    public boolean has(String feature) {
        if (feature == null) return false;
        if (this != MARE) return false;

        return switch (feature) {
            case "MARE_BADGE",
                    "PROFILE_VISITORS",
                    "ADVANCED_STATS",
                    "RANKING_FILTERS",
                    "SERVER_PRIORITY",
                    "PROFILE_HIGHLIGHT",
                    "EARLY_ACCESS" -> true;
            default -> false;
        };
    }
}
