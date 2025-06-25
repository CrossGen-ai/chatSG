/**
 * Shared Agent UI Interfaces
 * 
 * TypeScript interfaces for agent UI components that can be used
 * by the frontend to maintain consistency across agent displays.
 */

export interface AgentStatus {
  id: string;
  name: string;
  type: 'individual' | 'agency';
  status: 'active' | 'idle' | 'error' | 'loading';
  lastActivity?: Date;
  capabilities?: string[];
  memoryUsage?: {
    conversations: number;
    semantic: number;
    total: number;
  };
  toolsAvailable?: string[];
  healthStatus?: {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    tools: Record<string, any>;
    memory: Record<string, any>;
  };
}

export interface AgentCardProps {
  agent: AgentStatus;
  onSelect?: (agentId: string) => void;
  onAction?: (agentId: string, action: string) => void;
  compact?: boolean;
  showDetails?: boolean;
}

export interface AgentConfigurationUI {
  agentId: string;
  sections: AgentConfigSection[];
}

export interface AgentConfigSection {
  id: string;
  title: string;
  description?: string;
  fields: AgentConfigField[];
}

export interface AgentConfigField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'json';
  value: any;
  options?: Array<{ label: string; value: any }>;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
  description?: string;
}

export interface ChatInterfaceProps {
  agentId: string;
  sessionId?: string;
  initialMessage?: string;
  onMessage?: (message: string, response: string) => void;
  tools?: string[];
  memoryEnabled?: boolean;
}

export interface ToolUsageInfo {
  toolName: string;
  category: string;
  lastUsed?: Date;
  usageCount: number;
  averageExecutionTime: number;
  successRate: number;
}

export interface MemoryUsageInfo {
  type: 'conversation' | 'semantic' | 'episodic' | 'working';
  entries: number;
  maxEntries: number;
  memoryUsage: number;
  lastCleanup?: Date;
}

export interface AgentMetrics {
  agentId: string;
  uptime: number;
  totalMessages: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTime: number;
  toolUsage: ToolUsageInfo[];
  memoryUsage: MemoryUsageInfo[];
  lastActivity: Date;
}

export interface AgentCreationWizard {
  steps: AgentCreationStep[];
  currentStep: number;
  canProceed: boolean;
  canGoBack: boolean;
}

export interface AgentCreationStep {
  id: string;
  title: string;
  description?: string;
  component: 'basic-info' | 'capabilities' | 'tools' | 'memory' | 'review';
  data: Record<string, any>;
  validation?: {
    required: string[];
    rules: Record<string, any>;
  };
}

/**
 * UI Event interfaces for agent interactions
 */
export interface AgentUIEvent {
  type: 'select' | 'configure' | 'chat' | 'delete' | 'clone' | 'export';
  agentId: string;
  data?: any;
  timestamp: Date;
}

export interface AgentUIState {
  selectedAgent?: string;
  activeConfig?: string;
  activeChatSession?: string;
  viewMode: 'grid' | 'list' | 'detailed';
  filters: {
    type?: 'individual' | 'agency';
    status?: 'active' | 'idle' | 'error' | 'loading';
    capabilities?: string[];
  };
  sortBy: 'name' | 'lastActivity' | 'status' | 'type';
  sortOrder: 'asc' | 'desc';
}

/**
 * Theme and styling interfaces
 */
export interface AgentTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

export interface AgentUIConfig {
  theme: AgentTheme;
  animations: boolean;
  compactMode: boolean;
  showAdvancedFeatures: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
} 