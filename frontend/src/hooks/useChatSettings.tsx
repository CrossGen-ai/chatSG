import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getChatSettings, updateChatSettings, ChatSettings } from '../api/chat';

interface ChatSettingsContextType {
  settings: ChatSettings;
  isLoading: boolean;
  updateSetting: (key: keyof ChatSettings, value: any) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const ChatSettingsContext = createContext<ChatSettingsContextType | undefined>(undefined);

interface ChatSettingsProviderProps {
  children: ReactNode;
  sessionId: string;
}

export const ChatSettingsProvider: React.FC<ChatSettingsProviderProps> = ({ 
  children, 
  sessionId 
}) => {
  const [settings, setSettings] = useState<ChatSettings>({
    crossSessionMemory: false,
    agentLock: false,
    preferredAgent: undefined,
    lastAgentUsed: undefined,
    agentLockTimestamp: undefined
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load settings from localStorage first (for immediate UI response)
  const loadLocalSettings = (sessionId: string): ChatSettings => {
    try {
      const saved = localStorage.getItem(`chat-settings-${sessionId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        if (parsed.agentLockTimestamp) {
          parsed.agentLockTimestamp = new Date(parsed.agentLockTimestamp);
        }
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
    }
    return {
      crossSessionMemory: false,
      agentLock: false,
      preferredAgent: undefined,
      lastAgentUsed: undefined,
      agentLockTimestamp: undefined
    };
  };

  // Save settings to localStorage
  const saveLocalSettings = (sessionId: string, settings: ChatSettings) => {
    try {
      localStorage.setItem(`chat-settings-${sessionId}`, JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save settings to localStorage:', error);
    }
  };

  // Load settings from API and sync with localStorage
  const refreshSettings = async () => {
    if (!sessionId) return;
    
    setIsLoading(true);
    try {
      const response = await getChatSettings(sessionId);
      const newSettings = response.settings;
      
      // Update state and localStorage
      setSettings(newSettings);
      saveLocalSettings(sessionId, newSettings);
      
      console.log(`[ChatSettings] Loaded settings for session ${sessionId}:`, newSettings);
    } catch (error) {
      console.warn(`[ChatSettings] Failed to load settings for session ${sessionId}:`, error);
      // Fall back to localStorage settings if API fails
      const localSettings = loadLocalSettings(sessionId);
      setSettings(localSettings);
    } finally {
      setIsLoading(false);
    }
  };

  // Update a specific setting
  const updateSetting = async (key: keyof ChatSettings, value: any) => {
    if (!sessionId) return;

    const newSettings = { ...settings, [key]: value };
    
    // Update local state immediately for responsive UI
    setSettings(newSettings);
    saveLocalSettings(sessionId, newSettings);
    
    // Sync with API in background
    try {
      await updateChatSettings(sessionId, { [key]: value });
      console.log(`[ChatSettings] Updated ${key} to ${value} for session ${sessionId}`);
    } catch (error) {
      console.warn(`[ChatSettings] Failed to sync ${key} setting:`, error);
      // Revert local state if API fails
      setSettings(settings);
      saveLocalSettings(sessionId, settings);
    }
  };

  // Load settings when sessionId changes
  useEffect(() => {
    if (sessionId) {
      // Load from localStorage immediately for responsive UI
      const localSettings = loadLocalSettings(sessionId);
      setSettings(localSettings);
      
      // Then refresh from API
      refreshSettings();
    }
  }, [sessionId]);

  return (
    <ChatSettingsContext.Provider value={{
      settings,
      isLoading,
      updateSetting,
      refreshSettings
    }}>
      {children}
    </ChatSettingsContext.Provider>
  );
};

export const useChatSettings = (): ChatSettingsContextType => {
  const context = useContext(ChatSettingsContext);
  if (context === undefined) {
    throw new Error('useChatSettings must be used within a ChatSettingsProvider');
  }
  return context;
}; 