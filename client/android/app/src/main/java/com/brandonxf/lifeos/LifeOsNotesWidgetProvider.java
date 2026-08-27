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

import org.json.JSONArray;
import org.json.JSONObject;

/** Widget de notas: pinta hasta 3 notas (fijadas primero, luego recientes)
 *  con su color y un snippet del contenido. Comparte el SharedPreferences
 *  con los demás widgets; los datos llegan como JSON vía WidgetBridgePlugin
 *  porque SharedPreferences no soporta listas de objetos. */
public class LifeOsNotesWidgetProvider extends AppWidgetProvider {

    private static final int[] ROW_IDS = { R.id.note1_row, R.id.note2_row, R.id.note3_row };
    private static final int[] DOT_IDS = { R.id.note1_dot, R.id.note2_dot, R.id.note3_dot };
    private static final int[] TITLE_IDS = { R.id.note1_title, R.id.note2_title, R.id.note3_title };
    private static final int[] SNIPPET_IDS = { R.id.note1_snippet, R.id.note2_snippet, R.id.note3_snippet };

    static void updateAppWidget(Context context, AppWidgetManager manager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(LifeOsWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
        String notesJson = prefs.getString("notesJson", "[]");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_life_os_notes);

        JSONArray notes;
        try {
            notes = new JSONArray(notesJson);
        } catch (Exception e) {
            notes = new JSONArray();
        }

        views.setViewVisibility(R.id.notes_empty, notes.length() == 0 ? android.view.View.VISIBLE : android.view.View.GONE);

        for (int i = 0; i < ROW_IDS.length; i++) {
            if (i < notes.length()) {
                JSONObject note = notes.optJSONObject(i);
                views.setViewVisibility(ROW_IDS[i], android.view.View.VISIBLE);
                views.setTextViewText(TITLE_IDS[i], note != null ? note.optString("title", "Sin título") : "Sin título");
                views.setTextViewText(SNIPPET_IDS[i], note != null ? note.optString("snippet", "") : "");
                int color;
                try {
                    color = Color.parseColor(note != null ? note.optString("color", "#37E779") : "#37E779");
                } catch (Exception e) {
                    color = Color.parseColor("#37E779");
                }
                views.setInt(DOT_IDS[i], "setColorFilter", color);
            } else {
                views.setViewVisibility(ROW_IDS[i], android.view.View.GONE);
            }
        }

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

    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName provider = new ComponentName(context, LifeOsNotesWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(provider);
        for (int id : ids) {
            updateAppWidget(context, manager, id);
        }
    }
}
