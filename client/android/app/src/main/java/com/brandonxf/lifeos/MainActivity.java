package com.brandonxf.lifeos;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /** true si la Activity se abrió desde el botón de recarga de un widget
     *  (en vez de un toque normal del usuario). WidgetBridgePlugin lo
     *  consume una sola vez desde JS para saber si debe "devolver" la app
     *  al home screen automáticamente después de sincronizar. */
    static volatile boolean pendingWidgetRefresh = false;

    static final String EXTRA_WIDGET_REFRESH = "widgetRefresh";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);
        readWidgetRefreshExtra(getIntent());
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        readWidgetRefreshExtra(intent);
    }

    private void readWidgetRefreshExtra(Intent intent) {
        if (intent != null && intent.getBooleanExtra(EXTRA_WIDGET_REFRESH, false)) {
            pendingWidgetRefresh = true;
        }
    }
}
