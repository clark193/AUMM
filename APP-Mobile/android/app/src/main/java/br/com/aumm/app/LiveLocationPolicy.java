package br.com.aumm.app;

final class LiveLocationPolicy {
    static final long MAX_DURATION = 55 * 60 * 1000L;
    static boolean validSession(String project, String id, String token, long expiry, long now) {
        return project.matches("[a-z][a-z0-9-]{4,62}") && id.matches("[a-f0-9]{32}")
            && token.length() >= 100 && token.length() <= 8192 && !token.contains("\n") && !token.contains("\r")
            && expiry > now && expiry <= now + MAX_DURATION + 5000;
    }
    static boolean freshPosition(double lat, double lng, float accuracy, long sampledAt, long now) {
        return Double.isFinite(lat) && Double.isFinite(lng) && Float.isFinite(accuracy)
            && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && accuracy >= 0
            && sampledAt > now - 90_000 && sampledAt < now + 30_000;
    }
}
