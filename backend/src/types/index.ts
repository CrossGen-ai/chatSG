/**
 * Core Type Definitions for ChatSG Backend Architecture
 * 
 * This file contains all the fundamental interfaces and types used throughout
 * the enhanced ChatSG backend system. These types ensure type safety while
 * maintaining compatibility with existing JavaScript code.
 */

// ============================================================================
// Core Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  _backend?: string;
  _agent?: string;
}

export interface AgentResponse {
  success: boolean;
  message: string;
  sessionId: string;
  timestamp: string;
  llmProvider?: string;
  model?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface LLMConfiguration {
  provider: 'openai' | 'azure';
  environment: string;
  modelName: string;
  openAIApiKey: string;
  configuration: Record<string, any>;
  temperature: number;
  maxTokens: number;
  metadata: Record<string, any>;
}

export interface AgentConfiguration {
  agentInfo: {
    name: string;
    version: string;
    description?: string;
    author?: string;
    created?: string;
    lastModified?: string;
  };
  prompts: {
    system: Record<string, string>;
    customInstructions: Record<string, string>;
    userTemplates: Record<string, string>;
    errorMessages?: Record<string, string>;
  };
  templateVariables: Record<string, {
    description: string;
    example?: string;
    required: boolean;
    default: string;
  }>;
  behavior?: {
    promptSelection?: {
      strategy: string;
      fallback: string;
    };
  };
  metadata: {
    schemaVersion?: string;
    schema_version?: string;
    [key: string]: any;
  };
}

// ============================================================================
// Agent System Types
// ============================================================================

export interface BaseAgent {
  processMessage(input: string, sessionId: string): Promise<AgentResponse>;
  getCapabilities(): AgentCapabilities;
  validateConfig(): ValidationResult;
  getInfo(): {
    name: string;
    version: string;
    description: string;
    type: string;
  };
  getName?(): string;
  getVersion?(): string;
  initialize?(config?: any): Promise<void>;
  cleanup?(): Promise<void>;
  getSessionInfo?(sessionId: string): any;
  clearSession?(sessionId: string): Promise<void>;
}

export interface AgentCapabilities {
  name: string;
  version: string;
  supportedModes: string[];
  features: string[];
  inputTypes: string[];
  outputTypes: string[];
  maxSessionMemory?: number;
  supportsTools?: boolean;
  supportsStateSharing?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

// ============================================================================
// Tool System Types
// ============================================================================

export interface Tool {
  name: string;
  description: string;
  version: string;
  schema: ToolSchema;
  execute(params: ToolParams): Promise<ToolResult>;
  validate(params: any): ValidationResult;
}

export interface ToolSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    description: string;
    required?: boolean;
    default?: any;
    enum?: any[];
  }>;
  required: string[];
}

export interface ToolParams {
  [key: string]: any;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
  executionTime?: number;
}

// ============================================================================
// State Management Types
// ============================================================================

export interface SessionState {
  sessionId: string;
  data: Record<string, any>;
  lastAccessed: Date;
  metadata: Record<string, any>;
}

export interface SharedState {
  key: string;
  value: any;
  scope: 'global' | 'agent' | 'session';
  permissions: {
    read: string[];
    write: string[];
  };
  expiry?: Date;
}

export interface StateManager {
  getSessionState(sessionId: string): Promise<SessionState>;
  setSessionState(sessionId: string, data: Record<string, any>): Promise<void>;
  getSharedState(key: string): Promise<SharedState | null>;
  setSharedState(key: string, value: any, scope: SharedState['scope']): Promise<void>;
  clearExpiredStates(): Promise<void>;
}

// ============================================================================
// Orchestrator Types
// ============================================================================

export interface AgentOrchestrator {
  selectAgent(input: string, context: OrchestrationContext): Promise<AgentSelection>;
  delegateTask(task: Task, targetAgent: string): Promise<TaskResult>;
  handleConversationHandoff(fromAgent: string, toAgent: string, context: HandoffContext): Promise<HandoffResult>;
}

export interface OrchestrationContext {
  sessionId: string;
  userInput: string;
  currentAgent?: string;
  availableAgents: string[];
  conversationHistory?: any[];
  userPreferences?: Record<string, any>;
}

export interface AgentSelection {
  selectedAgent: string;
  confidence: number;
  reason: string;
  fallbackAgents?: string[];
}

export interface Task {
  id: string;
  type: string;
  input: string;
  parameters: Record<string, any>;
  priority: number;
  deadline?: Date;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  result?: any;
  error?: string;
  executedBy: string;
  executionTime: number;
  metadata?: Record<string, any>;
}

export interface HandoffContext {
  sessionId: string;
  reason: string;
  conversationSummary: string;
  userIntent: string;
  metadata: Record<string, any>;
}

export interface HandoffResult {
  success: boolean;
  newAgent: string;
  transitionMessage?: string;
  error?: string;
}

// ============================================================================
// Registry Types
// ============================================================================

export interface AgentRegistry {
  registerAgent(agent: BaseAgent): void;
  getAgent(name: string): BaseAgent | null;
  listAgents(): AgentCapabilities[];
  discoverAgents(): Promise<void>;
}

export interface ToolRegistry {
  registerTool(tool: Tool): void;
  getTool(name: string): Tool | null;
  listTools(): Tool[];
  discoverTools(): Promise<void>;
}

// ============================================================================
// Utility Types
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

export interface ConfigurationManager {
  loadConfiguration<T>(path: string): Promise<T>;
  validateConfiguration<T>(config: T, schema: any): ValidationResult;
  saveConfiguration<T>(path: string, config: T): Promise<void>;
}

// ============================================================================
// Backward Compatibility Types
// ============================================================================

/**
 * These types ensure compatibility with existing JavaScript code
 */
export interface LegacyAgentZero {
  processMessage(userInput: string, sessionId?: string): Promise<AgentResponse>;
  getSessionInfo(sessionId?: string): any;
  clearSession(sessionId?: string): Promise<boolean>;
  sessions: Map<string, any>;
}

export interface LegacyAgentRouter {
  classifyPrompt(userInput: string, targetAgent: string, context?: any): Promise<any>;
  getAvailableVariants(targetAgent: string): string[];
  getInfo(): any;
}

export interface LegacyLLMHelper {
  getConfigInfo(): LLMConfiguration;
  validateConfiguration(): ValidationResult;
  createChatLLM(overrides?: any): any;
  getSystemPrompt(agentTypeOrPath?: string, context?: any): string;
  getAgentPrompt(agentType: string, promptPath: string, context?: any): string;
  loadAgentConfig(agentType: string): AgentConfiguration | null;
}

// ============================================================================
// Export All Types
// ============================================================================

export * from './index'; 