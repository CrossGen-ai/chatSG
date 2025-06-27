import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Interface definitions matching backend SlashCommand structure
export interface SlashCommand {
  name: string;
  description: string;
  agentType: string;
  category: string;
  aliases: string[];
  enabled: boolean;
  priority: number;
}

export interface SlashCommandsResponse {
  success: boolean;
  commands: SlashCommand[];
  metadata: {
    version: string;
    lastUpdated: string;
    commandCount: number;
    serverTimestamp: string;
  };
}

export interface SlashCommandValidationResponse {
  success: boolean;
  valid: boolean;
  command?: SlashCommand;
  error?: string;
  suggestions?: string[];
}

interface SlashCommandHookState {
  commands: SlashCommand[];
  isLoading: boolean;
  error: string | null;
  lastFetch: number;
}

interface UseSlashCommandsOptions {
  autoFetch?: boolean;
  cacheTimeout?: number; // in milliseconds
}

// Cache key for localStorage
const CACHE_KEY = 'slash-commands-cache';
const DEFAULT_CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

/**
 * Custom hook for managing slash commands
 * Provides API integration, caching, and command processing functionality
 */
export const useSlashCommands = (options: UseSlashCommandsOptions = {}) => {
  const {
    autoFetch = true,
    cacheTimeout = DEFAULT_CACHE_TIMEOUT
  } = options;

  const [state, setState] = useState<SlashCommandHookState>({
    commands: [],
    isLoading: false,
    error: null,
    lastFetch: 0
  });

  // Load commands from localStorage cache
  const loadFromCache = useCallback((): SlashCommand[] | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { commands, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > cacheTimeout;
        
        if (!isExpired && Array.isArray(commands)) {
          console.log('[useSlashCommands] Loaded commands from cache:', commands.length);
          return commands;
        }
      }
    } catch (error) {
      console.warn('[useSlashCommands] Failed to load from cache:', error);
    }
    return null;
  }, [cacheTimeout]);

  // Save commands to localStorage cache
  const saveToCache = useCallback((commands: SlashCommand[]) => {
    try {
      const cacheData = {
        commands,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('[useSlashCommands] Saved commands to cache:', commands.length);
    } catch (error) {
      console.warn('[useSlashCommands] Failed to save to cache:', error);
    }
  }, []);

  // Fetch commands from API
  const fetchCommands = useCallback(async (): Promise<SlashCommand[]> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('[useSlashCommands] Fetching commands from API...');
      const response = await axios.get<SlashCommandsResponse>('/api/slash-commands');
      
      if (response.data.success) {
        const commands = response.data.commands;
        console.log('[useSlashCommands] Fetched commands:', commands.length);
        
        // Save to cache
        saveToCache(commands);
        
        // Update state
        setState(prev => ({
          ...prev,
          commands,
          isLoading: false,
          lastFetch: Date.now()
        }));
        
        return commands;
      } else {
        throw new Error('Failed to fetch commands');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch commands';
      console.error('[useSlashCommands] Error fetching commands:', errorMessage);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      
      return [];
    }
  }, [saveToCache]);

  // Refresh commands (force fetch from API)
  const refreshCommands = useCallback(async (): Promise<void> => {
    await fetchCommands();
  }, [fetchCommands]);

  // Filter commands based on input
  const filterCommands = useCallback((input: string): SlashCommand[] => {
    if (!input || !input.startsWith('/')) {
      return [];
    }

    const query = input.slice(1).toLowerCase(); // Remove leading slash
    if (query.length === 0) {
      return state.commands.slice(0, 5); // Return first 5 commands for empty query
    }

    const filtered = state.commands.filter(command => {
      // Check command name
      if (command.name.toLowerCase().includes(query)) {
        return true;
      }
      
      // Check aliases
      return command.aliases.some(alias => 
        alias.toLowerCase().includes(query)
      );
    });

    // Sort by relevance (exact matches first, then partial matches)
    return filtered.sort((a, b) => {
      const aExact = a.name.toLowerCase() === query || a.aliases.some(alias => alias.toLowerCase() === query);
      const bExact = b.name.toLowerCase() === query || b.aliases.some(alias => alias.toLowerCase() === query);
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Then by priority
      return b.priority - a.priority;
    }).slice(0, 8); // Limit to 8 suggestions
  }, [state.commands]);

  // Validate a specific command
  const validateCommand = useCallback(async (commandName: string): Promise<SlashCommandValidationResponse> => {
    try {
      // Remove leading slash if present
      const cleanCommand = commandName.startsWith('/') ? commandName.slice(1) : commandName;
      
      console.log('[useSlashCommands] Validating command:', cleanCommand);
      const response = await axios.get<SlashCommandValidationResponse>(
        `/api/slash-commands/validate/${encodeURIComponent(cleanCommand)}`
      );
      
      return response.data;
    } catch (error: any) {
      console.error('[useSlashCommands] Error validating command:', error);
      return {
        success: false,
        valid: false,
        error: error.response?.data?.error || error.message || 'Validation failed'
      };
    }
  }, []);

  // Find best match for tab completion
  const findBestMatch = useCallback((input: string): SlashCommand | null => {
    if (!input || !input.startsWith('/')) {
      return null;
    }

    const query = input.slice(1).toLowerCase();
    if (query.length === 0) {
      return null;
    }

    // Find exact matches first
    const exactMatch = state.commands.find(command => 
      command.name.toLowerCase() === query ||
      command.aliases.some(alias => alias.toLowerCase() === query)
    );
    
    if (exactMatch) {
      return exactMatch;
    }

    // Find partial matches
    const partialMatches = state.commands.filter(command => 
      command.name.toLowerCase().startsWith(query) ||
      command.aliases.some(alias => alias.toLowerCase().startsWith(query))
    );

    if (partialMatches.length === 1) {
      return partialMatches[0];
    }

    return null;
  }, [state.commands]);

  // Get command by name
  const getCommand = useCallback((name: string): SlashCommand | null => {
    return state.commands.find(command => 
      command.name === name ||
      command.aliases.includes(name)
    ) || null;
  }, [state.commands]);

  // Initialize hook
  useEffect(() => {
    if (autoFetch) {
      // Try to load from cache first
      const cachedCommands = loadFromCache();
      if (cachedCommands && cachedCommands.length > 0) {
        setState(prev => ({
          ...prev,
          commands: cachedCommands,
          lastFetch: Date.now()
        }));
      }

      // Then fetch fresh data from API
      fetchCommands();
    }
  }, [autoFetch, loadFromCache, fetchCommands]);

  return {
    // State
    commands: state.commands,
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    refreshCommands,
    filterCommands,
    validateCommand,
    findBestMatch,
    getCommand,
    
    // Metadata
    commandCount: state.commands.length,
    lastFetch: state.lastFetch
  };
}; 