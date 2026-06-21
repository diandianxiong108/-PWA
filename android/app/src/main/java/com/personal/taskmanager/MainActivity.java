package com.personal.taskmanager;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TaskAlarmPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
