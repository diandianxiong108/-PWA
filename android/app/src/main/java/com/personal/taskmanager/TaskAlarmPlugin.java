package com.personal.taskmanager;

import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "TaskAlarm")
public class TaskAlarmPlugin extends Plugin {
    @PluginMethod
    public void schedule(PluginCall call) {
        int id = call.getInt("id", 0);
        long atMillis = call.getLong("atMillis", 0L);
        String title = call.getString("title", "重要任务");
        String itemId = call.getString("itemId", "");
        String date = call.getString("date", "");
        if (id == 0 || atMillis <= System.currentTimeMillis()) { call.reject("INVALID_ALARM"); return; }
        AlarmManager manager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !manager.canScheduleExactAlarms()) { call.reject("EXACT_ALARM_PERMISSION_REQUIRED"); return; }
        AlarmScheduler.schedule(getContext(), id, title, itemId, date, atMillis);
        call.resolve();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        AlarmScheduler.cancel(getContext(), call.getInt("id", 0));
        call.resolve();
    }

    @PluginMethod
    public void getPendingActions(PluginCall call) {
        JSObject result = new JSObject();
        result.put("actions", new JSArray(AlarmScheduler.consumeActions(getContext())));
        call.resolve(result);
    }

    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }
}
