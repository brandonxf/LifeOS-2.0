package com.brandonxf.lifeos;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/**
 * Widget de solo lectura: no llama a la API directamente (el token vive en
 * el almacenamiento de la WebView, no accesible desde el proceso nativo del
 * widget). En su lugar pinta la última foto de datos que la app guardó en
 * SharedPreferences cada vez que se abrió (ver WidgetBridgePlugin).
 */
public class LifeOsWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "life_os_widget";

    static void updateAppWidget(Context context, AppWidgetManager manager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        int pendingTasks = prefs.getInt("pendingTasks", -1);
        int habitsDone = prefs.getInt("habitsDone", 0);
        int habitsTotal = prefs.getInt("habitsTotal", 0);
        String updatedAt = prefs.getString("updatedAt", "");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_life_os);

        String tasksLine = pendingTasks < 0
            ? "Abre la app para sincronizar"
            : (pendingTasks == 0 ? "Sin tareas pendientes" : pendingTasks + " tarea" + (pendingTasks == 1 ? "" : "s") + " pendiente" + (pendingTasks == 1 ? "" : "s"));
        views.setTextViewText(R.id.widget_tasks_line, tasksLine);

        if (pendingTasks >= 0) {
            views.setTextViewText(R.id.widget_habits_line, habitsDone + "/" + habitsTotal + " hábitos hoy");
        } else {
            views.setTextViewText(R.id.widget_habits_line, "");
        }
        views.setTextViewText(R.id.widget_updated_at, updatedAt.isEmpty() ? "" : "Actualizado " + updatedAt);

        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent != null) {
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_title, pendingIntent);
            views.setOnClickPendingIntent(R.id.widget_tasks_line, pendingIntent);
            views.setOnClickPendingIntent(R.id.widget_habits_line, pendingIntent);
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
