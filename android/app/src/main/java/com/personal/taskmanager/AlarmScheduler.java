package com.personal.taskmanager;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

final class AlarmScheduler {
    private static final String PREFS = "task_alarm_store";
    private static final String ACTIONS = "pending_actions";
    private static PendingIntent alarmIntent(Context c, int id, String title, String itemId, String date) {
        Intent intent = new Intent(c, AlarmReceiver.class).setAction("task-alarm-" + id)
            .putExtra("alarmId", id).putExtra("title", title).putExtra("itemId", itemId).putExtra("date", date);
        return PendingIntent.getBroadcast(c, id, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    static void schedule(Context c, int id, String title, String itemId, String date, long atMillis) {
        AlarmManager manager = (AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        PendingIntent operation = alarmIntent(c,id,title,itemId,date);
        Intent open = new Intent(c, MainActivity.class);
        PendingIntent show = PendingIntent.getActivity(c,id,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) manager.setAlarmClock(new AlarmManager.AlarmClockInfo(atMillis,show),operation);
        else manager.setExact(AlarmManager.RTC_WAKEUP,atMillis,operation);
        try { JSONObject data=new JSONObject().put("id",id).put("title",title).put("itemId",itemId).put("date",date).put("atMillis",atMillis);prefs(c).edit().putString("alarm_"+id,data.toString()).apply(); } catch(Exception ignored) {}
    }
    static void cancel(Context c,int id){
        ((AlarmManager)c.getSystemService(Context.ALARM_SERVICE)).cancel(alarmIntent(c,id,"","",""));
        prefs(c).edit().remove("alarm_"+id).apply();
    }
    static void rescheduleStored(Context c){
        long now=System.currentTimeMillis();
        for(Map.Entry<String,?> entry:prefs(c).getAll().entrySet())if(entry.getKey().startsWith("alarm_")&&entry.getValue() instanceof String)try{
            JSONObject d=new JSONObject((String)entry.getValue());long at=d.getLong("atMillis");if(at>now)schedule(c,d.getInt("id"),d.optString("title"),d.optString("itemId"),d.optString("date"),at);
        }catch(Exception ignored){}
    }
    static synchronized void recordAction(Context c,String itemId,String date,String action){try{
        JSONArray list=new JSONArray(prefs(c).getString(ACTIONS,"[]"));list.put(new JSONObject().put("itemId",itemId).put("date",date).put("action",action));prefs(c).edit().putString(ACTIONS,list.toString()).apply();
    }catch(Exception ignored){}}
    static synchronized List<JSObjectCompat> consumeActions(Context c){
        List<JSObjectCompat> result=new ArrayList<>();try{JSONArray list=new JSONArray(prefs(c).getString(ACTIONS,"[]"));for(int i=0;i<list.length();i++)result.add(new JSObjectCompat(list.getJSONObject(i)));}catch(Exception ignored){}prefs(c).edit().remove(ACTIONS).apply();return result;
    }
    static SharedPreferences prefs(Context c){return c.getSharedPreferences(PREFS,Context.MODE_PRIVATE);}
    static final class JSObjectCompat extends JSONObject { JSObjectCompat(JSONObject source){super();try{put("itemId",source.optString("itemId"));put("date",source.optString("date"));put("action",source.optString("action"));}catch(Exception ignored){}} }
    private AlarmScheduler(){}
}
