package com.personal.taskmanager;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Environment;

import androidx.core.content.FileProvider;

import java.io.File;

public class AppUpdateManager {
    private static final String PREFS = "task_manager_update";
    private static final String KEY_DOWNLOAD_ID = "download_id";
    private static final String KEY_FILE_NAME = "file_name";

    public static long enqueueDownload(Context context, String url, String fileName, String title) {
        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
        request.setTitle(title == null || title.isEmpty() ? "任务管家更新" : title);
        request.setDescription("下载完成后将自动弹出安装");
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        request.setMimeType("application/vnd.android.package-archive");
        request.setAllowedOverMetered(true);
        request.setAllowedOverRoaming(true);
        request.setDestinationInExternalFilesDir(context, Environment.DIRECTORY_DOWNLOADS, fileName);

        DownloadManager manager = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        long downloadId = manager.enqueue(request);
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putLong(KEY_DOWNLOAD_ID, downloadId)
            .putString(KEY_FILE_NAME, fileName)
            .apply();
        return downloadId;
    }

    public static void handleDownloadComplete(Context context, long downloadId) {
        long expectedId = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getLong(KEY_DOWNLOAD_ID, -1L);
        if (expectedId <= 0L || expectedId != downloadId) return;

        DownloadManager manager = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        DownloadManager.Query query = new DownloadManager.Query().setFilterById(downloadId);
        try (Cursor cursor = manager.query(query)) {
            if (cursor == null || !cursor.moveToFirst()) return;
            int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
            if (status != DownloadManager.STATUS_SUCCESSFUL) {
                clear(context);
                return;
            }
        }

        Uri apkUri = manager.getUriForDownloadedFile(downloadId);
        if (apkUri == null) {
            String fileName = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_FILE_NAME, "task-manager-update.apk");
            File file = new File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), fileName);
            apkUri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", file);
        }

        Intent intent = new Intent(Intent.ACTION_VIEW)
            .setDataAndType(apkUri, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        context.startActivity(intent);
        clear(context);
    }

    private static void clear(Context context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .remove(KEY_DOWNLOAD_ID)
            .remove(KEY_FILE_NAME)
            .apply();
    }
}
