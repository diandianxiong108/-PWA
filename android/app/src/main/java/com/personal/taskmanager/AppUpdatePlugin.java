package com.personal.taskmanager;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.pm.PackageInfoCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {
    @PluginMethod
    public void getAppInfo(PluginCall call) {
        try {
            PackageManager manager = getContext().getPackageManager();
            PackageInfo info = manager.getPackageInfo(getContext().getPackageName(), 0);
            JSObject result = new JSObject();
            result.put("packageName", info.packageName);
            result.put("versionName", info.versionName);
            result.put("versionCode", PackageInfoCompat.getLongVersionCode(info));
            result.put("canRequestPackageInstalls", Build.VERSION.SDK_INT < Build.VERSION_CODES.O || manager.canRequestPackageInstalls());
            call.resolve(result);
        } catch (Exception error) {
            call.reject("APP_INFO_UNAVAILABLE", error);
        }
    }

    @PluginMethod
    public void openInstallUnknownSourcesSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        String fileName = call.getString("fileName", "task-manager-update.apk");
        String title = call.getString("title", "任务管家更新");
        if (url == null || !url.startsWith("http")) {
            call.reject("INVALID_UPDATE_URL");
            return;
        }
        if (!fileName.toLowerCase().endsWith(".apk")) fileName = fileName + ".apk";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
            call.reject("INSTALL_UNKNOWN_APPS_PERMISSION_REQUIRED");
            return;
        }
        long downloadId = AppUpdateManager.enqueueDownload(getContext(), url, fileName, title);
        JSObject result = new JSObject();
        result.put("downloadId", downloadId);
        call.resolve(result);
    }
}
