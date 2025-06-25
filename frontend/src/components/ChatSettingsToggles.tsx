import React from 'react';
import clsx from 'clsx';
import { useChatSettings } from '../hooks/useChatSettings';
import { ChatToggle } from './ChatToggle';

interface ChatSettingsTogglesProps {
  className?: string;
}

export const ChatSettingsToggles: React.FC<ChatSettingsTogglesProps> = ({ 
  className 
}) => {
  const { settings, isLoading, updateSetting } = useChatSettings();

  const handleCrossSessionMemoryToggle = async (enabled: boolean) => {
    await updateSetting('crossSessionMemory', enabled);
  };

  const handleAgentLockToggle = async (enabled: boolean) => {
    if (enabled) {
      // When enabling agent lock, set the timestamp
      await updateSetting('agentLock', true);
      await updateSetting('agentLockTimestamp', new Date());
    } else {
      // When disabling, clear both lock and timestamp
      await updateSetting('agentLock', false);
      await updateSetting('agentLockTimestamp', undefined);
    }
  };

  return (
    <div className={clsx('flex items-center space-x-2', className)}>
      <ChatToggle
        label="Memory"
        description="Cross-session"
        icon="🧠"
        enabled={settings.crossSessionMemory}
        loading={isLoading}
        onChange={handleCrossSessionMemoryToggle}
      />
      <ChatToggle
        label="Agent"
        description={settings.lastAgentUsed ? `Lock ${settings.lastAgentUsed}` : 'Lock current'}
        icon="🔒"
        enabled={settings.agentLock}
        loading={isLoading}
        onChange={handleAgentLockToggle}
      />
    </div>
  );
}; 