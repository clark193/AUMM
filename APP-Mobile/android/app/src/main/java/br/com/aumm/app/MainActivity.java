package br.com.aumm.app;

import android.os.Bundle;
import android.view.View;
import android.graphics.Color;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NavigationChooserPlugin.class);
        registerPlugin(EmergencyMessengerPlugin.class);
        registerPlugin(BackgroundLocationPlugin.class);
        super.onCreate(savedInstanceState);
        // SystemBars reserva os espaços nativos; o fundo mantém os ícones legíveis.
        getWindow().getDecorView().setBackgroundColor(Color.rgb(25, 29, 37));
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setVerticalScrollBarEnabled(false);
            getBridge().getWebView().setHorizontalScrollBarEnabled(false);
            getBridge().getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
        }
    }
}
