package com.personal.taskmanager;

import android.content.Intent;
import android.provider.CalendarContract;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

@CapacitorPlugin(name = "TaskCalendar")
public class TaskCalendarPlugin extends Plugin {
    @PluginMethod
    public void openInsert(PluginCall call) {
        String title = call.getString("title", "任务提醒");
        String startIso = call.getString("startIso");
        String endIso = call.getString("endIso");
        String description = call.getString("description", "");

        if (startIso == null || endIso == null) {
            call.reject("INVALID_EVENT");
            return;
        }

        long beginTime = parseLocalIso(startIso);
        long endTime = parseLocalIso(endIso);
        if (beginTime <= 0L || endTime <= 0L) {
            call.reject("INVALID_EVENT_TIME");
            return;
        }

        Intent intent = new Intent(Intent.ACTION_INSERT)
            .setData(CalendarContract.Events.CONTENT_URI)
            .putExtra(CalendarContract.Events.TITLE, title)
            .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, beginTime)
            .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, endTime)
            .putExtra(CalendarContract.Events.DESCRIPTION, description)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        getContext().startActivity(intent);
        call.resolve();
    }

    private long parseLocalIso(String value) {
        try {
            SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault());
            format.setTimeZone(TimeZone.getDefault());
            Date date = format.parse(value);
            return date != null ? date.getTime() : -1L;
        } catch (Exception error) {
            return -1L;
        }
    }
}
