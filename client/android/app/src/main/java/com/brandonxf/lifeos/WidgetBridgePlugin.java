package com.brandonxf.lifeos;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Puente JS -> widgets nativos: la app llama a esto cada vez que carga datos
 *  frescos de tareas/hábitos/finanzas, y los widgets del home screen se
 *  repintan con ese último snapshot. Ver LifeOsWidgetProvider y
 *  LifeOsStreakWidgetProvider. */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void updateWidget(PluginCall call) {
        int pendingTasks = call.getInt("pendingTasks", 0);
        int habitsDone = call.getInt("habitsDone", 0);
        int habitsTotal = call.getInt("habitsTotal", 0);
        int bestStreak = call.getInt("bestStreak", 0);
        int activeStreakHabits = call.getInt("activeStreakHabits", 0);
        String nextTaskText = call.getString("nextTaskText", "");
        String balanceText = call.getString("balanceText", "");
        boolean balancePositive = Boolean.TRUE.equals(call.getBoolean("balancePositive", true));
        String updatedAt = call.getString("updatedAt", "");
        // JSON stringificado en JS: [{title, snippet, color}, ...] (hasta 3 notas).
        String notesJson = call.getString("notesJson", "[]");

        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(LifeOsWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
            .putInt("pendingTasks", pendingTasks)
            .putInt("habitsDone", habitsDone)
            .putInt("habitsTotal", habitsTotal)
            .putInt("bestStreak", bestStreak)
            .putInt("activeStreakHabits", activeStreakHabits)
            .putString("nextTaskText", nextTaskText)
            .putString("balanceText", balanceText)
            .putBoolean("balancePositive", balancePositive)
            .putString("updatedAt", updatedAt)
            .putString("notesJson", notesJson)
            .apply();

        LifeOsWidgetProvider.refreshAll(context);
        LifeOsStreakWidgetProvider.refreshAll(context);
        LifeOsNotesWidgetProvider.refreshAll(context);

        JSObject ret = new JSObject();
        ret.put("ok", true);
        call.resolve(ret);
    }

    /** Lee y resetea (en una sola operación) si esta apertura de la app vino
     *  del botón de recarga de un widget. Se llama una vez al arrancar. */
    @PluginMethod
    public void consumeWidgetRefreshFlag(PluginCall call) {
        boolean isRefresh = MainActivity.pendingWidgetRefresh;
        MainActivity.pendingWidgetRefresh = false;
        JSObject ret = new JSObject();
        ret.put("isRefresh", isRefresh);
        call.resolve(ret);
    }

    /** Manda la app de vuelta al home screen (sin matar el proceso), usado
     *  tras sincronizar el widget cuando la apertura fue por su botón de
     *  recarga: da el efecto de "recargar en el sitio" sin que el usuario
     *  tenga que navegar la app manualmente. */
    @PluginMethod
    public void finishRefresh(PluginCall call) {
        if (getActivity() != null) {
            getActivity().moveTaskToBack(true);
        }
        call.resolve();
    }
}
