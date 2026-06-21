package com.personal.taskmanager;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;

public class AlarmReceiver extends BroadcastReceiver {
    static final String CHANNEL="important-native-alarm";
    @Override public void onReceive(Context c,Intent source){
        int id=source.getIntExtra("alarmId",1);String title=source.getStringExtra("title"),itemId=source.getStringExtra("itemId"),date=source.getStringExtra("date");
        Intent alarm=new Intent(c,AlarmActivity.class).putExtra("alarmId",id).putExtra("title",title).putExtra("itemId",itemId).putExtra("date",date).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent full=PendingIntent.getActivity(c,id,alarm,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        NotificationManager manager=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
        if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.O){NotificationChannel channel=new NotificationChannel(CHANNEL,"重要任务闹钟",NotificationManager.IMPORTANCE_HIGH);channel.setDescription("必须处理的重要任务");channel.enableVibration(true);channel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build());manager.createNotificationChannel(channel);}
        Notification n=new NotificationCompat.Builder(c,CHANNEL).setSmallIcon(R.mipmap.ic_launcher).setContentTitle("重要任务").setContentText(title).setCategory(NotificationCompat.CATEGORY_ALARM).setPriority(NotificationCompat.PRIORITY_MAX).setVisibility(NotificationCompat.VISIBILITY_PUBLIC).setOngoing(true).setAutoCancel(false).setFullScreenIntent(full,true).setContentIntent(full).build();
        manager.notify(id,n);
    }
}
