package br.com.aumm.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.ResultReceiver;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Sessão iniciada por ação explícita, com GPS e envio independentes do WebView. */
public class LiveLocationService extends Service implements LocationListener {
    static final String STOP = "br.com.aumm.app.STOP_LIVE_LOCATION";
    private static final String CHANNEL = "aumm-live-location";
    private static final int NOTICE = 4101;
    static volatile boolean active = false, closing = false;
    static volatile String shareId = "", error = "";
    static volatile long expiresAt = 0, updatedAt = 0;
    private String project = "", idToken = "";
    private long lastAttempt = 0;
    private boolean sending = false;
    private LocationManager locations;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ExecutorService network = Executors.newSingleThreadExecutor();

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) { stopSelf(); return START_NOT_STICKY; }
        if (STOP.equals(intent.getAction())) { beginClose(); return START_NOT_STICKY; }
        if (active) return START_NOT_STICKY;
        ResultReceiver receiver = intent.getParcelableExtra("receiver");
        project = intent.getStringExtra("projectId");
        String id = intent.getStringExtra("shareId");
        idToken = intent.getStringExtra("idToken");
        long expiry = intent.getLongExtra("expiresAt", 0);
        try {
            if (project == null || id == null || idToken == null || !LiveLocationPolicy.validSession(project, id, idToken, expiry, System.currentTimeMillis())) throw new IllegalArgumentException();
            shareId = id; expiresAt = expiry; closing = false; error = ""; updatedAt = 0;
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) manager.createNotificationChannel(new NotificationChannel(CHANNEL, "Compartilhamento de localização", NotificationManager.IMPORTANCE_LOW));
            ServiceCompat.startForeground(this, NOTICE, notice("Localização ao vivo ativa · toque para abrir"), ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            active = true;
            locations = (LocationManager) getSystemService(LOCATION_SERVICE);
            boolean fine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
            boolean coarse = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
            if (!fine && !coarse) throw new SecurityException();
            boolean subscribed = false;
            if (fine && locations.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locations.requestLocationUpdates(LocationManager.GPS_PROVIDER, 10_000, 0, this, Looper.getMainLooper());
                subscribed = true;
            }
            if (locations.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locations.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 10_000, 0, this, Looper.getMainLooper());
                subscribed = true;
            }
            if (!subscribed) throw new IllegalStateException();
            handler.postDelayed(this::beginClose, Math.max(0, expiry - System.currentTimeMillis()));
            if (receiver != null) receiver.send(1, Bundle.EMPTY);
        } catch (Exception exception) {
            error = "Não foi possível iniciar o GPS. Ative a localização e tente novamente.";
            if (receiver != null) receiver.send(0, Bundle.EMPTY);
            stopSelf();
        }
        // Não reiniciar sem consentimento após reinício do aparelho ou encerramento pelo Android.
        return START_NOT_STICKY;
    }

    private android.app.Notification notice(String text) {
        PendingIntent open = PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent stop = PendingIntent.getService(this, 1, new Intent(this, LiveLocationService.class).setAction(STOP), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this, CHANNEL).setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("AUMM · compartilhando localização").setContentText(text).setContentIntent(open)
            .setOngoing(true).setOnlyAlertOnce(true).setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .addAction(android.R.drawable.ic_media_pause, "Encerrar", stop).build();
    }
    private void show(String text) { getSystemService(NotificationManager.class).notify(NOTICE, notice(text)); }

    @Override public void onLocationChanged(Location position) {
        long now = System.currentTimeMillis();
        if (!active || closing) return;
        if (now >= expiresAt) { beginClose(); return; }
        if (!LiveLocationPolicy.freshPosition(position.getLatitude(), position.getLongitude(), position.getAccuracy(), position.getTime(), now) || sending || now - lastAttempt < 10_000) return;
        lastAttempt = now; sending = true;
        String body = LocationCommit.position(project, shareId, position.getLatitude(), position.getLongitude(), position.getAccuracy(), position.getTime());
        network.execute(() -> {
            int status = commit(body);
            handler.post(() -> {
                sending = false;
                if (!active || closing) return;
                if (status >= 200 && status < 300) {
                    updatedAt = System.currentTimeMillis(); error = "";
                    show("Localização ao vivo ativa · toque para abrir");
                } else if (status == 401 || status == 403 || status == 404) {
                    error = "Compartilhamento encerrado ou acesso revogado. Abra o app para iniciar outro.";
                    stopSelf();
                } else {
                    error = "Sem conexão para enviar. O envio será retomado quando a conexão voltar.";
                    show("Sem conexão · aguardando para retomar o envio");
                }
            });
        });
    }
    private int commit(String body) {
        HttpURLConnection connection = null;
        PowerManager.WakeLock lock = ((PowerManager) getSystemService(POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "AUMM:LocationUpload");
        try {
            lock.acquire(25_000);
            connection = (HttpURLConnection) new URL("https://firestore.googleapis.com/v1/projects/" + project + "/databases/(default)/documents:commit").openConnection();
            connection.setConnectTimeout(10_000); connection.setReadTimeout(10_000);
            connection.setInstanceFollowRedirects(false);
            connection.setRequestMethod("POST"); connection.setDoOutput(true);
            connection.setRequestProperty("Authorization", "Bearer " + idToken);
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            connection.setFixedLengthStreamingMode(bytes.length);
            try (java.io.OutputStream output = connection.getOutputStream()) { output.write(bytes); }
            return connection.getResponseCode();
        } catch (Exception exception) { return 0; }
        finally { if (connection != null) connection.disconnect(); if (lock.isHeld()) lock.release(); }
    }
    private void beginClose() {
        if (!active) { stopSelf(); return; }
        if (closing) return;
        closing = true;
        if (locations != null) locations.removeUpdates(this);
        show("GPS desligado · encerrando o link…");
        revoke();
    }
    private void revoke() {
        if (!active) return;
        network.execute(() -> {
            int status = commit(LocationCommit.revoke(project, shareId));
            handler.post(() -> {
                if (!active) return;
                if (status >= 200 && status < 300 || status == 401 || status == 403 || System.currentTimeMillis() >= expiresAt) {
                    stopSelf();
                } else {
                    error = "GPS desligado. Reconecte à internet para encerrar o link; ele também expira automaticamente.";
                    show("GPS desligado · reconecte para encerrar o link");
                    handler.postDelayed(this::revoke, 15_000);
                }
            });
        });
    }
    @Override public void onProviderDisabled(String provider) {
        error = "GPS indisponível. Ative a localização do aparelho.";
        show("GPS indisponível · confira a localização do aparelho");
    }
    @Override public void onProviderEnabled(String provider) { }
    @Override public void onStatusChanged(String provider, int status, Bundle extras) { }
    @Override public void onDestroy() {
        if (locations != null) locations.removeUpdates(this);
        handler.removeCallbacksAndMessages(null);
        network.shutdownNow();
        active = false; closing = false; shareId = ""; expiresAt = 0; idToken = "";
        stopForeground(STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }
}
