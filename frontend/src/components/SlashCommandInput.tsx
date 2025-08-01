import React, { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import clsx from 'clsx';
import { useSlashCommands, SlashCommand } from '../hooks/useSlashCommands';
import { SlashCommandDropdown } from './SlashCommandDropdown';

interface SlashCommandInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSlashCommand?: (command: SlashCommand, cleanMessage: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Enhanced input component with slash command support
 * Provides autocomplete dropdown, ghost text preview, and tab completion
 */
export const SlashCommandInput = forwardRef<HTMLInputElement, SlashCommandInputProps>(({
  value,
  onChange,
  onSubmit,
  onSlashCommand,
  disabled = false,
  placeholder = "Type your message...",
  className
}, ref) => {
  // Slash commands hook
  const { commands, filterCommands, findBestMatch } = useSlashCommands();
  
  // Local state
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [ghostText, setGhostText] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Forward ref
  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') {
        ref(inputRef.current);
      } else {
        ref.current = inputRef.current;
      }
    }
  }, [ref]);

  // Detect slash commands and filter
  const filteredCommands = value.startsWith('/') ? filterCommands(value) : [];
  
  // Update dropdown position
  const updateDropdownPosition = useCallback(() => {
    if (inputRef.current && containerRef.current) {
      const inputRect = inputRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      
      setDropdownPosition({
        top: inputRect.bottom + 4, // 4px gap below input, using screen coordinates
        left: containerRect.left,
        width: containerRect.width
      });
    }
  }, []);

  // Update dropdown visibility and position
  useEffect(() => {
    const shouldShow = value.startsWith('/') && filteredCommands.length > 0 && !disabled;
    setShowDropdown(shouldShow);
    
    if (shouldShow) {
      updateDropdownPosition();
    }
    
    // Reset selected index when commands change
    setSelectedCommandIndex(0);
  }, [value, filteredCommands.length, disabled, updateDropdownPosition]);

  // Update position on scroll/resize
  useEffect(() => {
    if (showDropdown) {
      const handleReposition = () => updateDropdownPosition();
      
      window.addEventListener('scroll', handleReposition, true);
      window.addEventListener('resize', handleReposition);
      
      return () => {
        window.removeEventListener('scroll', handleReposition, true);
        window.removeEventListener('resize', handleReposition);
      };
    }
  }, [showDropdown, updateDropdownPosition]);

  // Update ghost text for tab completion
  useEffect(() => {
    if (value.startsWith('/') && value.length > 1) {
      const bestMatch = findBestMatch(value);
      if (bestMatch) {
        const query = value.slice(1).toLowerCase();
        const commandName = bestMatch.name.toLowerCase();
        
        if (commandName.startsWith(query) && commandName !== query) {
          const completion = commandName.slice(query.length);
          setGhostText(completion);
        } else {
          setGhostText('');
        }
      } else {
        setGhostText('');
      }
    } else {
      setGhostText('');
    }
  }, [value, findBestMatch]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showDropdown && filteredCommands.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedCommandIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedCommandIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedCommandIndex]) {
            handleCommandSelect(filteredCommands[selectedCommandIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowDropdown(false);
          break;
        case 'Tab':
          e.preventDefault();
          handleTabCompletion();
          break;
        default:
          // Allow other keys to propagate normally
          break;
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      // Check if the input starts with a slash command
      if (value.startsWith('/')) {
        const spaceIndex = value.indexOf(' ');
        if (spaceIndex > 0) {
          const commandName = value.slice(1, spaceIndex);
          const message = value.slice(spaceIndex + 1).trim();
          
          // Find the command in the available commands
          const command = commands.find(cmd => 
            cmd.name === commandName || cmd.aliases.includes(commandName)
          );
          
          if (command && message) {
            // Valid slash command with message - process it
            console.log('[SlashCommandInput] Parsed slash command on Enter:', commandName, 'Message:', message);
            onChange(message);
            if (onSlashCommand) {
              onSlashCommand(command, message);
            }
            setTimeout(() => onSubmit(), 0);
            return;
          }
        }
      }
      
      // No valid slash command found, submit as is
      onSubmit();
    }
  }, [showDropdown, filteredCommands, selectedCommandIndex, onSubmit, value, commands, onChange, onSlashCommand]);

  // Handle tab completion
  const handleTabCompletion = useCallback(() => {
    if (value.startsWith('/') && ghostText) {
      const newValue = value + ghostText + ' ';
      onChange(newValue);
      setGhostText('');
      setShowDropdown(false);
    } else if (showDropdown && filteredCommands[selectedCommandIndex]) {
      handleCommandSelect(filteredCommands[selectedCommandIndex]);
    }
  }, [value, ghostText, showDropdown, filteredCommands, selectedCommandIndex, onChange]);

  // Handle command selection
  const handleCommandSelect = useCallback((command: SlashCommand) => {
    const commandText = `/${command.name} `;
    const remainingText = value.startsWith('/') ? 
      value.slice(value.indexOf(' ') + 1) : 
      value;
    
    const newValue = commandText + (remainingText.trim() || '');
    onChange(newValue);
    setShowDropdown(false);
    setGhostText('');
    
    // Notify parent about slash command selection
    if (onSlashCommand) {
      onSlashCommand(command, remainingText.trim());
    }
    
    // Focus back to input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, [value, onChange, onSlashCommand]);

  // Handle dropdown navigation
  const handleDropdownNavigate = useCallback((direction: 'up' | 'down') => {
    if (direction === 'down') {
      setSelectedCommandIndex(prev => 
        prev < filteredCommands.length - 1 ? prev + 1 : 0
      );
    } else {
      setSelectedCommandIndex(prev => 
        prev > 0 ? prev - 1 : filteredCommands.length - 1
      );
    }
  }, [filteredCommands.length]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  // Handle dropdown close
  const handleDropdownClose = useCallback(() => {
    setShowDropdown(false);
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1">
        {/* Input container with ghost text overlay */}
        <div className="relative">
        <input
          ref={inputRef}
          className={clsx(
            'w-full px-4 py-3 rounded-2xl',
            'bg-white text-black', // Always white background with black text
            'border border-gray-300',
            'placeholder-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50',
            'transition-all duration-200',
            // Highlight when slash command is detected
            value.startsWith('/') && 'ring-2 ring-purple-500/30 border-purple-500/50',
            className
          )}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          spellCheck="false"
        />
        
        {/* Ghost text overlay */}
        {ghostText && (
          <div
            className="absolute inset-0 px-4 py-3 pointer-events-none rounded-2xl"
            style={{
              color: 'transparent',
              backgroundColor: 'transparent',
              border: 'transparent',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: 'inherit'
            }}
          >
            <span style={{ visibility: 'hidden' }}>{value}</span>
            <span className="theme-text-secondary opacity-50">{ghostText}</span>
          </div>
        )}
        
        {/* Slash command indicator */}
        {value.startsWith('/') && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="flex items-center space-x-1">
              {filteredCommands.length > 0 && (
                <span className="text-xs theme-text-secondary bg-purple-500/20 px-2 py-1 rounded-full">
                  {filteredCommands.length} match{filteredCommands.length !== 1 ? 'es' : ''}
                </span>
              )}
              <span className="text-purple-500" title="Slash command detected">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Dropdown */}
      <SlashCommandDropdown
        commands={filteredCommands}
        selectedIndex={selectedCommandIndex}
        onSelect={handleCommandSelect}
        onClose={handleDropdownClose}
        onNavigate={handleDropdownNavigate}
        isVisible={showDropdown}
        position={dropdownPosition}
      />
    </div>
  );
});

SlashCommandInput.displayName = 'SlashCommandInput'; 