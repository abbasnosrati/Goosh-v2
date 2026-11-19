package net.goosh.studio;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.print.PrintAttributes;
import android.print.PrintManager;
import androidx.core.content.FileProvider;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "EtudeFiles")
public class EtudeFiles extends Plugin {
    @PluginMethod
    public void share(PluginCall call) {
        try {
            String name = call.getString("name", "Etude").replaceAll("[^\\p{L}\\p{N} _-]", "_");
            File dir = new File(getContext().getCacheDir(), "etudes");
            if (!dir.isDirectory() && !dir.mkdirs()) throw new java.io.IOException();
            File file = new File(dir, name.substring(0, Math.min(name.length(), 100)) + ".goosh");
            try (FileOutputStream out = new FileOutputStream(file)) {
                out.write(call.getString("content", "").getBytes(StandardCharsets.UTF_8));
            }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
            Intent intent = new Intent(Intent.ACTION_SEND).setType("application/json")
                .putExtra(Intent.EXTRA_STREAM, uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(Intent.createChooser(intent, null));
            call.resolve();
        } catch (Exception err) {
            call.reject("Unable to share etude", err);
        }
    }

    @PluginMethod
    public void printScore(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                String title = call.getString("name", "Etude");
                PrintManager printer = (PrintManager) getContext().getSystemService(Context.PRINT_SERVICE);
                printer.print(title, getBridge().getWebView().createPrintDocumentAdapter(title),
                    new PrintAttributes.Builder().build());
                call.resolve();
            } catch (Exception err) {
                call.reject("Unable to print score", err);
            }
        });
    }
}
