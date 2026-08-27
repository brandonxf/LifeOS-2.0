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

/** Widget compacto: solo la mejor racha de hábitos, bien grande y llamativa.
 *  Comparte el mismo SharedPreferences que LifeOsWidgetProvider. */
public class LifeOsStreakWidgetProvider extends AppWidgetProvider {

    private static final int AMBER = Color.parseColor("#F5A623");
    private static final int GRAY = Color.parseColor("#8A968A");

    static void updateAppWidget(Context context, AppWidgetManager manager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(LifeOsWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
        int bestStreak = prefs.getInt("bestStreak", -1);
        int activeStreakHabits = prefs.getInt("activeStreakHabits", 0);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_life_os_streak);
        boolean hasData = bestStreak >= 0;

        views.setTextViewText(R.id.streak_number, hasData ? String.valueOf(bestStreak) : "--");
        views.setTextViewText(R.id.streak_label, hasData ? (bestStreak == 1 ? "día de racha" : "días de racha") : "abre la app");
        views.setInt(R.id.streak_icon, "setColorFilter", hasData && bestStreak > 0 ? AMBER : GRAY);
        views.setTextViewText(
            R.id.streak_sublabel,
            hasData && activeStreakHabits > 0
                ? activeStreakHabits + " hábito" + (activeStreakHabits == 1 ? "" : "s") + " con racha activa"
                : ""
        );

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
        ComponentName provider = new ComponentName(context, LifeOsStreakWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(provider);
        for (int id : ids) {
            updateAppWidget(context, manager, id);
        }
    }
}
