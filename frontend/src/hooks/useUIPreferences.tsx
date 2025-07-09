import { useState, useEffect, useCallback } from 'react';

interface UIPreferences {
  theme: string;
  sidebarOpen: boolean;
  sidebarPinned: boolean;
  memoryPanelOpen: boolean;
  memoryPanelPinned: boolean;
  performancePanelOpen: boolean;
  performancePanelPinned: boolean;
  currentView: 'chat' | 'memory' | 'performance';
  // Future preferences can be added here:
  // fontSize?: 'small' | 'medium' | 'large';
  // compactMode?: boolean;
  // notificationSound?: boolean;
}

const STORAGE_KEY = 'chatsg-ui-preferences';

const defaultPreferences: UIPreferences = {
  theme: 'light',
  sidebarOpen: false,
  sidebarPinned: false,
  memoryPanelOpen: false,
  memoryPanelPinned: false,
  performancePanelOpen: false,
  performancePanelPinned: false,
  currentView: 'chat',
};

export function useUIPreferences() {
  // Initialize from localStorage or defaults
  const [preferences, setPreferences] = useState<UIPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultPreferences, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load UI preferences:', error);
    }
    return defaultPreferences;
  });

  // Save to localStorage whenever preferences change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save UI preferences:', error);
    }
  }, [preferences]);

  // Update a single preference
  const updatePreference = useCallback(<K extends keyof UIPreferences>(
    key: K,
    value: UIPreferences[K]
  ) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Update multiple preferences at once
  const updatePreferences = useCallback((updates: Partial<UIPreferences>) => {
    setPreferences(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  // Reset to defaults
  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences);
  }, []);

  return {
    preferences,
    updatePreference,
    updatePreferences,
    resetPreferences,
  };
}