package com.blogging.platform.service.impl;

import com.blogging.platform.exception.ContentNotFoundException;
import com.blogging.platform.exception.UnauthorizedAccessException;
import com.blogging.platform.model.PlatformSetting;
import com.blogging.platform.model.User;
import com.blogging.platform.model.enums.RoleType;
import com.blogging.platform.repository.PlatformSettingRepository;
import com.blogging.platform.repository.UserRepository;
import com.blogging.platform.service.AuditService;
import com.blogging.platform.service.SettingsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class SettingsServiceImpl implements SettingsService {

    private final PlatformSettingRepository platformSettingRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public SettingsServiceImpl(PlatformSettingRepository platformSettingRepository, UserRepository userRepository,
                               AuditService auditService) {
        this.platformSettingRepository = platformSettingRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @Override
    public Map<String, Object> getSettings() {
        Map<String, Object> settings = new HashMap<>();
        List<PlatformSetting> all = platformSettingRepository.findAll();
        for (PlatformSetting setting : all) {
            String value = setting.getSettingValue();
            if (value.equalsIgnoreCase("true") || value.equalsIgnoreCase("false")) {
                settings.put(setting.getSettingKey(), Boolean.parseBoolean(value));
            } else {
                settings.put(setting.getSettingKey(), value);
            }
        }
        settings.put("defaultSettings", getDefaultSettings());
        return settings;
    }

    @Override
    public void updateSetting(String adminUsername, String key, String value) {
        User admin = userRepository.findByUsername(adminUsername)
                .orElseThrow(() -> new ContentNotFoundException("User not found: " + adminUsername));
        if (admin.getRole().getRoleName() != RoleType.ADMIN) {
            throw new UnauthorizedAccessException("Only administrators can change platform settings");
        }

        PlatformSetting setting = platformSettingRepository.findBySettingKey(key)
                .orElseGet(() -> {
                    PlatformSetting s = new PlatformSetting();
                    s.setSettingKey(key);
                    return s;
                });
        setting.setSettingValue(value);
        setting.setDescription(getDefaultSettings().getOrDefault(key, "Platform configuration"));
        platformSettingRepository.save(setting);
        auditService.log(adminUsername, "SETTING_CHANGED", "PlatformSetting", key, key + " changed to " + value);
    }

    @Override
    public boolean isRegistrationOpen() {
        return getBooleanSetting("registrationOpen", true);
    }

    @Override
    public boolean isPreModerationEnabled() {
        return getBooleanSetting("preModerationEnabled", false);
    }

    @Override
    public boolean isMaintenanceMode() {
        return getBooleanSetting("maintenanceMode", false);
    }

    private boolean getBooleanSetting(String key, boolean defaultValue) {
        return platformSettingRepository.findBySettingKey(key)
                .map(s -> Boolean.parseBoolean(s.getSettingValue()))
                .orElse(defaultValue);
    }

    private Map<String, String> getDefaultSettings() {
        Map<String, String> defaults = new HashMap<>();
        defaults.put("registrationOpen", "true");
        defaults.put("preModerationEnabled", "false");
        defaults.put("maintenanceMode", "false");
        return defaults;
    }
}