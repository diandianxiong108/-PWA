package com.personal.taskmanager;

import android.app.NotificationManager;
import android.content.Intent;
import android.graphics.Color;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

public class AlarmActivity extends AppCompatActivity {
    private MediaPlayer player;private int id;private String title,itemId,date;
    @Override protected void onCreate(Bundle state){super.onCreate(state);getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON|WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON|WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED);id=getIntent().getIntExtra("alarmId",1);title=getIntent().getStringExtra("title");itemId=getIntent().getStringExtra("itemId");date=getIntent().getStringExtra("date");buildView();startSound();}
    private void buildView(){LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setGravity(Gravity.CENTER);root.setPadding(42,42,42,42);root.setBackgroundColor(Color.rgb(245,249,244));TextView icon=new TextView(this);icon.setText("⏰");icon.setTextSize(54);icon.setGravity(Gravity.CENTER);TextView heading=new TextView(this);heading.setText("重要任务");heading.setTextSize(18);heading.setTextColor(Color.rgb(90,158,94));heading.setGravity(Gravity.CENTER);TextView task=new TextView(this);task.setText(title);task.setTextSize(24);task.setTextColor(Color.rgb(44,62,45));task.setGravity(Gravity.CENTER);task.setPadding(0,24,0,36);Button done=new Button(this);done.setText("完成任务");done.setOnClickListener(v->complete());Button snooze=new Button(this);snooze.setText("稍后10分钟");snooze.setOnClickListener(v->snooze());root.addView(icon);root.addView(heading);root.addView(task);root.addView(done,new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT));root.addView(snooze,new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT));setContentView(root);}
    private void startSound(){try{player=MediaPlayer.create(this,RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM));player.setLooping(true);player.start();}catch(Exception ignored){}}
    private void stopSound(){if(player!=null){try{player.stop();player.release();}catch(Exception ignored){}player=null;}}
    private void complete(){AlarmScheduler.recordAction(this,itemId,date,"complete");AlarmScheduler.cancel(this,id);closeAndOpen();}
    private void snooze(){AlarmScheduler.schedule(this,id,title,itemId,date,System.currentTimeMillis()+10*60*1000L);closeAndOpen();}
    private void closeAndOpen(){stopSound();((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).cancel(id);startActivity(new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP));finish();}
    @Override protected void onDestroy(){stopSound();super.onDestroy();}
}
