import React, { useEffect, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { SlashCommand } from '../hooks/useSlashCommands';

interface SlashCommandDropdownProps {
  commands: SlashCommand[];
  selectedIndex: number;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  onNavigate: (direction: 'up' | 'down') => void;
  isVisible: boolean;
  position?: {
    top: number;
    left: number;
    width: number;
  };
  className?: string;
}

/**
 * Dropdown component for slash command autocomplete
 * Provides keyboard navigation, theme-aware styling, and smooth animations
 */
export const SlashCommandDropdown: React.FC<SlashCommandDropdownProps> = ({
  commands,
  selectedIndex,
  onSelect,
  onClose,
  onNavigate,
  isVisible,
  position,
  className
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isVisible) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        onNavigate('down');
        break;
      case 'ArrowUp':
        e.preventDefault();
        onNavigate('up');
        break;
      case 'Enter':
        e.preventDefault();
        if (commands[selectedIndex]) {
          onSelect(commands[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'Tab':
        // Let parent handle tab completion
        break;
      default:
        // Allow other keys to bubble up to input
        break;
    }
  }, [isVisible, onNavigate, commands, selectedIndex, onSelect, onClose]);

  // Attach keyboard event listeners
  useEffect(() => {
    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, handleKeyDown]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedItemRef.current && isVisible) {
      selectedItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedIndex, isVisible]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, onClose]);

  // Don't render if not visible or no commands
  if (!isVisible || commands.length === 0) {
    return null;
  }

  // Get agent type emoji for visual indication
  const getAgentEmoji = (agentType: string): string => {
    switch (agentType.toLowerCase()) {
      case 'creativetoolsagent':
      case 'creative':
        return '✨';
      case 'analyticaltoolsagent':
      case 'analytical':
        return '📊';
      case 'technicaltoolsagent':
      case 'technical':
        return '🔧';
      default:
        return '🤖';
    }
  };

  // Get category color for visual grouping
  const getCategoryColor = (category: string): string => {
    switch (category.toLowerCase()) {
      case 'creative':
        return 'text-purple-600 dark:text-purple-400';
      case 'analytical':
        return 'text-blue-600 dark:text-blue-400';
      case 'technical':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'theme-text-secondary';
    }
  };

  return (
    <div
      ref={dropdownRef}
      className={clsx(
        'absolute z-50 mt-1 rounded-2xl shadow-2xl border transition-all duration-200',
        'backdrop-blur-md bg-white/80 dark:bg-black/80',
        'border-white/30 dark:border-white/20',
        'animate-in slide-in-from-top-2',
        'max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent',
        className
      )}
      style={{
        top: position?.top,
        left: position?.left,
        width: position?.width || 'auto',
        minWidth: position?.width || '300px'
      }}
    >
      {/* Header */}
      <div className="px-4 py-2 border-b border-white/20 dark:border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium theme-text-secondary">
            Slash Commands ({commands.length})
          </span>
          <span className="text-xs theme-text-secondary">
            ↑↓ navigate • Enter select • Esc close
          </span>
        </div>
      </div>

      {/* Commands list */}
      <div className="py-2">
        {commands.map((command, index) => (
          <div
            key={`${command.name}-${index}`}
            ref={index === selectedIndex ? selectedItemRef : undefined}
            className={clsx(
              'px-4 py-3 cursor-pointer transition-all duration-150',
              'flex items-center space-x-3',
              'hover:bg-white/40 dark:hover:bg-white/10',
              index === selectedIndex && [
                'bg-white/60 dark:bg-white/20',
                'border-l-4 border-blue-500'
              ]
            )}
            onClick={() => onSelect(command)}
            onMouseEnter={() => {
              // Update selected index on hover for keyboard consistency
              if (index !== selectedIndex) {
                // This would need to be handled by parent component
                // For now, we'll rely on keyboard navigation
              }
            }}
          >
            {/* Agent emoji */}
            <div className="flex-shrink-0">
              <span className="text-lg" role="img" aria-label={command.agentType}>
                {getAgentEmoji(command.agentType)}
              </span>
            </div>

            {/* Command info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-medium theme-text-primary">
                  /{command.name}
                </span>
                {command.aliases.length > 0 && (
                  <span className="text-xs theme-text-secondary">
                    ({command.aliases.slice(0, 2).join(', ')})
                  </span>
                )}
              </div>
              <p className="text-sm theme-text-secondary truncate">
                {command.description}
              </p>
            </div>

            {/* Category indicator */}
            <div className="flex-shrink-0">
              <span className={clsx(
                'text-xs font-medium px-2 py-1 rounded-full',
                'bg-white/40 dark:bg-black/40',
                getCategoryColor(command.category)
              )}>
                {command.category}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer with help text */}
      <div className="px-4 py-2 border-t border-white/20 dark:border-white/10">
        <div className="flex items-center justify-between text-xs theme-text-secondary">
          <span>Tab to complete • Enter to select</span>
          <span>
            {selectedIndex + 1} of {commands.length}
          </span>
        </div>
      </div>
    </div>
  );
}; 