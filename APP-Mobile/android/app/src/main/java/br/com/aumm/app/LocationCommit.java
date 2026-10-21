package br.com.aumm.app;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

// Campos e identificadores validados antes de serializar; nenhum dado pessoal no documento público.
final class LocationCommit {
    static String timestamp(long millis) {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format.format(new Date(millis));
    }
    static String path(String project, String collection, String id) {
        return "projects/" + project + "/databases/(default)/documents/" + collection + "/" + id;
    }
    static String position(String project, String id, double lat, double lng, float accuracy, long sample) {
        return "{\"writes\":[{\"update\":{\"name\":\"" + path(project, "liveLocations", id)
            + "\",\"fields\":{\"lat\":{\"doubleValue\":" + lat + "},\"lng\":{\"doubleValue\":" + lng
            + "},\"accuracy\":{\"doubleValue\":" + accuracy + "},\"sampledAt\":{\"timestampValue\":\"" + timestamp(sample)
            + "\"}}},\"updateMask\":{\"fieldPaths\":[\"lat\",\"lng\",\"accuracy\",\"sampledAt\"]},"
            + "\"updateTransforms\":[{\"fieldPath\":\"updatedAt\",\"setToServerValue\":\"REQUEST_TIME\"}],\"currentDocument\":{\"exists\":true}}]}";
    }
    static String revoke(String project, String id) {
        return "{\"writes\":[{\"delete\":\"" + path(project, "liveLocations", id)
            + "\"},{\"delete\":\"" + path(project, "locationShareOwners", id) + "\"}]}";
    }
}
