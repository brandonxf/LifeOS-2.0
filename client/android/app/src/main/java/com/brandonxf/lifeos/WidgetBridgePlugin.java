package com.brandonxf.lifeos;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Puente JS -> widget nativo: la app llama a esto cada vez que carga datos
 *  frescos de tareas/hábitos, y el widget del home screen se repinta con
 *  ese último snapshot. Ver LifeOsWidgetProvider. */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void updateWidget(PluginCall call) {
        int pendingTasks = call.getInt("pendingTasks", 0);
        int habitsDone = call.getInt("habitsDone", 0);
        int habitsTotal = call.getInt("habitsTotal", 0);
        String updatedAt = call.getString("updatedAt", "");

        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(LifeOsWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
            .putInt("pendingTasks", pendingTasks)
            .putInt("habitsDone", habitsDone)
            .putInt("habitsTotal", habitsTotal)
            .putString("updatedAt", updatedAt)
            .apply();

        LifeOsWidgetProvider.refreshAll(context);

        JSObject ret = new JSObject();
        ret.put("ok", true);
        call.resolve(ret);
    }
}
