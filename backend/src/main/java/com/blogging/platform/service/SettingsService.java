package com.blogging.platform.service;

import java.util.Map;

public interface SettingsService {
    Map<String, Object> getSettings();
    void updateSetting(String adminUsername, String key, String value);
    boolean isRegistrationOpen();
    boolean isPreModerationEnabled();
    boolean isMaintenanceMode();
}