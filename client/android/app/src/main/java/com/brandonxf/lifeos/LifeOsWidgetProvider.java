package com.brandonxf.lifeos;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.widget.RemoteViews;

/**
 * Widget de solo lectura: no llama a la API directamente (el token vive en
 * el almacenamiento de la WebView, no accesible desde el proceso nativo del
 * widget). En su lugar pinta la última foto de datos que la app guardó en
 * SharedPreferences cada vez que algo cambió (ver WidgetBridgePlugin). El
 * botón de recarga abre la app brevemente para forzar esa sincronización y
 * la manda de vuelta al home screen sola (ver MainActivity/WidgetBridgePlugin).
 */
public class LifeOsWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "life_os_widget";

    private static final int GREEN = Color.parseColor("#37E779");
    private static final int AMBER = Color.parseColor("#F5A623");
    private static final int RED = Color.parseColor("#F26161");
    private static final int GRAY = Color.parseColor("#8A968A");

    static void updateAppWidget(Context context, AppWidgetManager manager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        int pendingTasks = prefs.getInt("pendingTasks", -1);
        int habitsDone = prefs.getInt("habitsDone", 0);
        int habitsTotal = prefs.getInt("habitsTotal", 0);
        int bestStreak = prefs.getInt("bestStreak", 0);
        String nextTaskText = prefs.getString("nextTaskText", "");
        String balanceText = prefs.getString("balanceText", "");
        boolean balancePositive = prefs.getBoolean("balancePositive", true);
        String updatedAt = prefs.getString("updatedAt", "");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_life_os);
        boolean hasData = pendingTasks >= 0;

        // Tareas: número grande + color del ícono según urgencia.
        views.setTextViewText(R.id.tasks_count, hasData ? String.valueOf(pendingTasks) : "--");
        views.setTextViewText(
            R.id.tasks_label,
            !hasData ? "abre la app" : (pendingTasks == 0 ? "¡al día!" : "pendiente" + (pendingTasks == 1 ? "" : "s"))
        );
        int tasksColor = !hasData ? GRAY : (pendingTasks == 0 ? GREEN : (pendingTasks >= 5 ? RED : AMBER));
        views.setInt(R.id.tasks_icon, "setColorFilter", tasksColor);

        // Hábitos: progreso del día como barra + número "hecho/total".
        views.setTextViewText(R.id.habits_count, hasData ? (habitsDone + "/" + habitsTotal) : "--");
        views.setInt(R.id.habits_icon, "setColorFilter", hasData && habitsTotal > 0 && habitsDone == habitsTotal ? GREEN : AMBER);
        int pct = hasData && habitsTotal > 0 ? Math.round((habitsDone * 100f) / habitsTotal) : 0;
        views.setProgressBar(R.id.habits_progress, 100, pct, false);

        // Racha: mejor racha activa entre todos los hábitos.
        views.setTextViewText(R.id.mini_streak_count, hasData ? String.valueOf(bestStreak) : "--");
        views.setInt(R.id.mini_streak_icon, "setColorFilter", hasData && bestStreak > 0 ? AMBER : GRAY);

        // Próximo pendiente.
        views.setTextViewText(R.id.next_task_text, hasData ? nextTaskText : "Abre la app para sincronizar");

        // Balance del mes, con triángulo de tendencia rotado según signo.
        views.setTextViewText(R.id.balance_text, hasData ? balanceText : "");
        views.setInt(R.id.balance_icon, "setColorFilter", balancePositive ? GREEN : RED);
        views.setFloat(R.id.balance_icon, "setRotation", balancePositive ? 0f : 180f);

        views.setTextViewText(R.id.widget_updated_at, updatedAt.isEmpty() ? "" : updatedAt);

        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent != null) {
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            PendingIntent openIntent = PendingIntent.getActivity(
                context,
                appWidgetId * 10,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(android.R.id.background, openIntent);

            Intent refreshIntent = (Intent) launchIntent.clone();
            refreshIntent.putExtra(MainActivity.EXTRA_WIDGET_REFRESH, true);
            PendingIntent refreshPendingIntent = PendingIntent.getActivity(
                context,
                appWidgetId * 10 + 1,
                refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_refresh, refreshPendingIntent);
        }

        manager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    /** Fuerza el redibujado de todas las instancias del widget (llamado desde WidgetBridgePlugin). */
    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName provider = new ComponentName(context, LifeOsWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(provider);
        for (int id : ids) {
            updateAppWidget(context, manager, id);
        }
    }
}
