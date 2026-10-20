package br.com.aumm.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "EmergencyMessenger")
public class EmergencyMessengerPlugin extends Plugin {
    @PluginMethod
    public void compose(PluginCall call) {
        String phone = call.getString("phone", "");
        String message = call.getString("message", "");
        if (!phone.matches("\\+55[1-9]{2}[0-9]{8,9}") || message.isEmpty() || message.length() > 1500) {
            call.reject("Contato ou mensagem inválidos.");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:" + phone));
        intent.putExtra("sms_body", message);
        getActivity().runOnUiThread(() -> {
            try {
                getActivity().startActivity(intent);
                call.resolve();
            } catch (ActivityNotFoundException error) {
                call.reject("Nenhum aplicativo de SMS disponível.", "NO_SMS_APP", error);
            } catch (Exception error) {
                call.reject("Não foi possível abrir a mensagem.", "SMS_OPEN_FAILED", error);
            }
        });
    }
}
