package br.com.aumm.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.List;

@CapacitorPlugin(name = "NavigationChooser")
public class NavigationChooserPlugin extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        Double latitude = call.getDouble("latitude");
        Double longitude = call.getDouble("longitude");
        if (latitude == null || longitude == null || !Double.isFinite(latitude) || !Double.isFinite(longitude)
            || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
            call.reject("Localização inválida.", "INVALID_LOCATION");
            return;
        }
        String coordinates = Double.toString(latitude) + "," + Double.toString(longitude);
        Intent geo = new Intent(Intent.ACTION_VIEW, Uri.parse("geo:" + coordinates + "?q=" + Uri.encode(coordinates + " (Apoio AUMM)")));
        Intent waze = new Intent(Intent.ACTION_VIEW, Uri.parse("waze://?ll=" + coordinates + "&navigate=yes")).setPackage("com.waze");
        PackageManager manager = getContext().getPackageManager();
        List<ResolveInfo> maps = manager.queryIntentActivities(geo, PackageManager.MATCH_DEFAULT_ONLY);
        boolean hasWaze = waze.resolveActivity(manager) != null;
        if (maps.isEmpty() && !hasWaze) {
            call.reject("Nenhum aplicativo de GPS disponível.", "NO_MAP_APP");
            return;
        }
        Intent chooser = Intent.createChooser(maps.isEmpty() ? waze : geo, "Abrir localização com");
        // Inclui o Waze pelo deep link caso ele não responda ao endereço geo.
        boolean wazeInMaps = false;
        for (ResolveInfo map : maps) {
            if ("com.waze".equals(map.activityInfo.packageName)) wazeInMaps = true;
        }
        if (!maps.isEmpty() && hasWaze && !wazeInMaps) chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[] { waze });
        getActivity().runOnUiThread(() -> {
            try {
                getActivity().startActivity(chooser);
                call.resolve();
            } catch (ActivityNotFoundException exception) {
                call.reject("Nenhum aplicativo de GPS disponível.", "NO_MAP_APP", exception);
            } catch (Exception exception) {
                call.reject("Não foi possível abrir o GPS.", "NAVIGATION_FAILED", exception);
            }
        });
    }
}