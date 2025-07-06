/**
 * Agent Avatar Service
 * 
 * Provides dynamic visual representation for different agent types.
 * Maps agent types to specific icons, colors, and gradients that match
 * the application's theme system.
 */

export interface AgentAvatarConfig {
  icon: string;
  emoji: string;
  gradient: string;
  color: string;
  name: string;
  description: string;
}

export interface AgentThemeColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
}

/**
 * Agent type definitions with visual representations
 */
export const AGENT_AVATAR_CONFIGS: Record<string, AgentAvatarConfig> = {
  'analytical-agent': {
    icon: 'chart-bar',
    emoji: '📊',
    gradient: 'from-blue-500 to-blue-700',
    color: 'bg-blue-600',
    name: 'Analytical Agent',
    description: 'Data analysis and insights specialist'
  },
  'analytical': {
    icon: 'chart-bar',
    emoji: '📊',
    gradient: 'from-blue-500 to-blue-700',
    color: 'bg-blue-600',
    name: 'Analytical Agent',
    description: 'Data analysis and insights specialist'
  },
  'creative-agent': {
    icon: 'color-swatch',
    emoji: '🎨',
    gradient: 'from-purple-500 to-pink-600',
    color: 'bg-purple-600',
    name: 'Creative Agent',
    description: 'Creative content and design specialist'
  },
  'creative': {
    icon: 'color-swatch',
    emoji: '🎨',
    gradient: 'from-purple-500 to-pink-600',
    color: 'bg-purple-600',
    name: 'Creative Agent',
    description: 'Creative content and design specialist'
  },
  'technical-agent': {
    icon: 'cog',
    emoji: '⚙️',
    gradient: 'from-green-500 to-emerald-600',
    color: 'bg-green-600',
    name: 'Technical Agent',
    description: 'Technical solutions and development specialist'
  },
  'technical': {
    icon: 'cog',
    emoji: '⚙️',
    gradient: 'from-green-500 to-emerald-600',
    color: 'bg-green-600',
    name: 'Technical Agent',
    description: 'Technical solutions and development specialist'
  },
  'customer-support-agent': {
    icon: 'headphones',
    emoji: '🎧',
    gradient: 'from-orange-500 to-red-500',
    color: 'bg-orange-600',
    name: 'Customer Support Agent',
    description: 'Customer service and support specialist'
  },
  'customer-support': {
    icon: 'headphones',
    emoji: '🎧',
    gradient: 'from-orange-500 to-red-500',
    color: 'bg-orange-600',
    name: 'Customer Support Agent',
    description: 'Customer service and support specialist'
  },
  'financial-agent': {
    icon: 'dollar-sign',
    emoji: '💲',
    gradient: 'from-yellow-500 to-amber-600',
    color: 'bg-yellow-600',
    name: 'Financial Agent',
    description: 'Financial analysis and investment specialist'
  },
  'financial': {
    icon: 'dollar-sign',
    emoji: '💲',
    gradient: 'from-yellow-500 to-amber-600',
    color: 'bg-yellow-600',
    name: 'Financial Agent',
    description: 'Financial analysis and investment specialist'
  },
  'financialagent': {
    icon: 'dollar-sign',
    emoji: '💲',
    gradient: 'from-yellow-500 to-amber-600',
    color: 'bg-yellow-600',
    name: 'Financial Agent',
    description: 'Financial analysis and investment specialist'
  },
  'default': {
    icon: 'cpu-chip',
    emoji: '🤖',
    gradient: 'theme-accent',
    color: 'theme-accent',
    name: 'AI Assistant',
    description: 'General-purpose AI assistant'
  }
};

/**
 * SVG icon paths for different agent types
 */
export const AGENT_ICON_PATHS: Record<string, string> = {
  'chart-bar': 'M3 13l4-4 4 4 4-4 4 4v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM3 13l4-4 4 4 4-4 4 4',
  'color-swatch': 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM7 3H5v12a2 2 0 002 2 2 2 0 002-2V3zM19 3h-2v12a4 4 0 01-4 4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4z',
  'cog': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  'headphones': 'M4 13h2a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4a2 2 0 012-2zM16 13h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4a2 2 0 012-2zM12 2a6 6 0 016 6v3h-2V8a4 4 0 00-8 0v3H6V8a6 6 0 016-6z',
  'dollar-sign': 'M12 2v2m0 16v2m-4-8H6a2 2 0 010-4h4m4 0h2a2 2 0 100 4h-4m-2-6v12',
  'cpu-chip': 'M9 3v1H8a1 1 0 00-1 1v1H6V4a3 3 0 013-3h1zM15 3h1a3 3 0 013 3v2h-1V6a1 1 0 00-1-1h-1V3zM6 9H5V8a1 1 0 011-1h1v2zM18 9h1v1a1 1 0 01-1 1h-1V9zM6 15H5v-1a1 1 0 011-1h1v2zM18 15h1v1a1 1 0 01-1 1h-1v-2zM9 21v-1H8a1 1 0 01-1-1v-1H6v2a3 3 0 003 3h1zM15 21h1a3 3 0 003-3v-2h-1v1a1 1 0 01-1 1h-1v1z'
};

/**
 * Agent Avatar Service Class
 */
export class AgentAvatarService {
  /**
   * Get avatar configuration for a specific agent type
   */
  static getAvatarConfig(agentType?: string): AgentAvatarConfig {
    if (!agentType) {
      return AGENT_AVATAR_CONFIGS.default;
    }

    // Normalize agent type (handle different naming conventions)
    const normalizedType = agentType.toLowerCase()
      .replace(/agent$/, '')  // Remove 'agent' suffix
      .replace(/-agent$/, '') // Remove '-agent' suffix
      .replace(/_/g, '-');    // Replace underscores with hyphens

    // Try exact match first
    if (AGENT_AVATAR_CONFIGS[agentType]) {
      return AGENT_AVATAR_CONFIGS[agentType];
    }

    // Try normalized match
    if (AGENT_AVATAR_CONFIGS[normalizedType]) {
      return AGENT_AVATAR_CONFIGS[normalizedType];
    }

    // Try with -agent suffix
    const withAgentSuffix = `${normalizedType}-agent`;
    if (AGENT_AVATAR_CONFIGS[withAgentSuffix]) {
      return AGENT_AVATAR_CONFIGS[withAgentSuffix];
    }

    // Return default if no match found
    return AGENT_AVATAR_CONFIGS.default;
  }

  /**
   * Get SVG icon path for a specific icon type
   */
  static getIconPath(iconType: string): string {
    return AGENT_ICON_PATHS[iconType] || AGENT_ICON_PATHS['cpu-chip'];
  }

  /**
   * Get all available agent types
   */
  static getAvailableAgentTypes(): string[] {
    return Object.keys(AGENT_AVATAR_CONFIGS).filter(key => key !== 'default');
  }

  /**
   * Check if an agent type is supported
   */
  static isAgentTypeSupported(agentType: string): boolean {
    const config = this.getAvatarConfig(agentType);
    return config !== AGENT_AVATAR_CONFIGS.default;
  }

  /**
   * Get agent display name
   */
  static getAgentDisplayName(agentType?: string): string {
    const config = this.getAvatarConfig(agentType);
    return config.name;
  }

  /**
   * Get agent description
   */
  static getAgentDescription(agentType?: string): string {
    const config = this.getAvatarConfig(agentType);
    return config.description;
  }

  /**
   * Get theme-aware colors for an agent
   */
  static getThemeColors(agentType?: string): AgentThemeColors {
    const config = this.getAvatarConfig(agentType);
    
    // Map agent gradients to theme-aware colors
    switch (config.gradient) {
      case 'from-blue-500 to-blue-700':
        return {
          primary: '#3b82f6',
          secondary: '#1d4ed8',
          background: 'rgba(59, 130, 246, 0.1)',
          text: '#1e40af'
        };
      case 'from-purple-500 to-pink-600':
        return {
          primary: '#8b5cf6',
          secondary: '#db2777',
          background: 'rgba(139, 92, 246, 0.1)',
          text: '#7c3aed'
        };
      case 'from-green-500 to-emerald-600':
        return {
          primary: '#10b981',
          secondary: '#059669',
          background: 'rgba(16, 185, 129, 0.1)',
          text: '#047857'
        };
      case 'from-orange-500 to-red-500':
        return {
          primary: '#f97316',
          secondary: '#ef4444',
          background: 'rgba(249, 115, 22, 0.1)',
          text: '#ea580c'
        };
      case 'from-yellow-500 to-amber-600':
        return {
          primary: '#eab308',
          secondary: '#d97706',
          background: 'rgba(234, 179, 8, 0.1)',
          text: '#ca8a04'
        };
      default:
        return {
          primary: 'var(--accent-primary)',
          secondary: 'var(--accent-secondary)',
          background: 'var(--orb-1)',
          text: 'var(--text-primary)'
        };
    }
  }
}

export default AgentAvatarService; 