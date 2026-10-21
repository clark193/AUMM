package br.com.aumm.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Handler;
import android.os.Looper;
import android.os.ResultReceiver;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BackgroundLocation")
public class BackgroundLocationPlugin extends Plugin {
    static JSObject snapshot() {
        JSObject result = new JSObject();
        result.put("active", LiveLocationService.active);
        result.put("shareId", LiveLocationService.shareId);
        result.put("expiresAt", LiveLocationService.expiresAt);
        result.put("updatedAt", LiveLocationService.updatedAt);
        result.put("closing", LiveLocationService.closing);
        result.put("error", LiveLocationService.error);
        return result;
    }

    @PluginMethod
    public void status(PluginCall call) { call.resolve(snapshot()); }

    @PluginMethod
    public void start(PluginCall call) {
        String project = call.getString("projectId", "");
        String id = call.getString("shareId", "");
        String token = call.getString("idToken", "");
        Long expiry = call.getLong("expiresAt", 0L);
        if (!LiveLocationPolicy.validSession(project, id, token, expiry, System.currentTimeMillis())) {
            call.reject("Sessão de localização inválida ou expirada.");
            return;
        }
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED
                && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            call.reject("Permita o acesso à localização antes de iniciar.");
            return;
        }
        getActivity().runOnUiThread(() -> {
            if (LiveLocationService.active) {
                call.reject("Encerre o compartilhamento atual antes de iniciar outro.");
                return;
            }
            Intent intent = new Intent(getContext(), LiveLocationService.class);
            intent.putExtra("projectId", project);
            intent.putExtra("shareId", id);
            intent.putExtra("idToken", token);
            intent.putExtra("expiresAt", expiry);
            intent.putExtra("receiver", new ResultReceiver(new Handler(Looper.getMainLooper())) {
                @Override protected void onReceiveResult(int code, android.os.Bundle data) {
                    if (code == 1) call.resolve(snapshot());
                    else call.reject("Não foi possível iniciar o GPS. Verifique as permissões e abra o app para tentar novamente.");
                }
            });
            try { ContextCompat.startForegroundService(getContext(), intent); }
            catch (Exception exception) { call.reject("Abra o aplicativo e permita a localização para iniciar o compartilhamento."); }
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (LiveLocationService.active) {
            getContext().startService(new Intent(getContext(), LiveLocationService.class).setAction(LiveLocationService.STOP));
        }
        call.resolve();
    }
}
