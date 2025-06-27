/**
 * Slash Command Processor
 * 
 * Utility for processing chat messages to detect, extract, and validate slash commands.
 * Separates slash commands from message content and provides metadata for routing.
 */

import { getSlashCommandService, SlashCommand } from './SlashCommandService';

export interface SlashCommandProcessingResult {
    // Processing success status
    success: boolean;
    
    // Original message content
    originalMessage: string;
    
    // Clean message content (without slash command)
    cleanMessage: string;
    
    // Detected slash command information
    slashCommand?: {
        command: SlashCommand;
        rawCommand: string;
        isValid: boolean;
    };
    
    // Routing metadata for forced agent selection
    routingMetadata?: {
        forceAgent: string;
        agentType: string;
        commandName: string;
        confidence: number;
    };
    
    // Error information if processing failed
    error?: string;
    suggestions?: string[];
}

/**
 * Slash Command Processor Class
 */
export class SlashCommandProcessor {
    private slashCommandService;
    private isInitialized: boolean = false;

    constructor() {
        this.slashCommandService = getSlashCommandService();
    }

    /**
     * Initialize the processor by loading slash command configuration
     */
    public async initialize(): Promise<boolean> {
        try {
            const loaded = await this.slashCommandService.loadConfiguration();
            this.isInitialized = loaded;
            
            if (loaded) {
                console.log('[SlashCommandProcessor] Initialized successfully');
            } else {
                console.error('[SlashCommandProcessor] Failed to load configuration');
            }
            
            return loaded;
        } catch (error) {
            console.error('[SlashCommandProcessor] Initialization error:', error);
            this.isInitialized = false;
            return false;
        }
    }

    /**
     * Process a chat message to detect and extract slash commands
     */
    public async processMessage(message: string): Promise<SlashCommandProcessingResult> {
        const result: SlashCommandProcessingResult = {
            success: false,
            originalMessage: message,
            cleanMessage: message
        };

        try {
            // Ensure processor is initialized
            if (!this.isInitialized) {
                const initialized = await this.initialize();
                if (!initialized) {
                    result.error = 'Slash command processor not initialized';
                    return result;
                }
            }

            // Check if message starts with slash command
            if (!this.hasSlashCommand(message)) {
                // No slash command detected - return original message as-is
                result.success = true;
                result.cleanMessage = message;
                return result;
            }

            // Extract slash command from message
            const extractionResult = this.extractSlashCommand(message);
            
            if (!extractionResult.commandText) {
                // Invalid slash command format
                result.success = true; // Still success, just no valid command
                result.cleanMessage = message;
                result.error = 'Invalid slash command format';
                return result;
            }

            // Validate the extracted command
            const validationResult = this.slashCommandService.resolveCommand(extractionResult.commandText);
            
            if (validationResult.success && validationResult.command) {
                // Valid slash command found
                result.success = true;
                result.cleanMessage = extractionResult.remainingMessage.trim();
                result.slashCommand = {
                    command: validationResult.command,
                    rawCommand: extractionResult.rawCommand,
                    isValid: true
                };
                
                // Create routing metadata for forced agent selection
                result.routingMetadata = {
                    forceAgent: validationResult.command.name,
                    agentType: validationResult.command.agentType,
                    commandName: validationResult.command.name,
                    confidence: 1.0 // High confidence for explicit slash commands
                };
                
                console.log(`[SlashCommandProcessor] Detected valid command: /${validationResult.command.name} → ${validationResult.command.agentType}`);
                
            } else {
                // Invalid slash command - provide suggestions
                result.success = true; // Still success, just invalid command
                result.cleanMessage = message; // Keep original message since command is invalid
                result.slashCommand = {
                    command: null as any,
                    rawCommand: extractionResult.rawCommand,
                    isValid: false
                };
                result.error = validationResult.error || 'Unknown command';
                result.suggestions = validationResult.suggestions || [];
                
                console.log(`[SlashCommandProcessor] Invalid command: ${extractionResult.commandText} - ${result.error}`);
            }

            return result;

        } catch (error) {
            console.error('[SlashCommandProcessor] Processing error:', error);
            result.error = error instanceof Error ? error.message : 'Unknown processing error';
            return result;
        }
    }

    /**
     * Check if a message starts with a slash command
     */
    private hasSlashCommand(message: string): boolean {
        if (!message || message.length === 0) {
            return false;
        }
        
        const trimmed = message.trim();
        return trimmed.startsWith('/') && trimmed.length > 1;
    }

    /**
     * Extract slash command and remaining message content
     */
    private extractSlashCommand(message: string): {
        rawCommand: string;
        commandText: string;
        remainingMessage: string;
    } {
        const trimmed = message.trim();
        
        // Find the end of the command (first space or end of string)
        const spaceIndex = trimmed.indexOf(' ');
        
        if (spaceIndex === -1) {
            // Entire message is the command
            return {
                rawCommand: trimmed,
                commandText: trimmed.slice(1), // Remove leading slash
                remainingMessage: ''
            };
        } else {
            // Command followed by message content
            const rawCommand = trimmed.substring(0, spaceIndex);
            const commandText = rawCommand.slice(1); // Remove leading slash
            const remainingMessage = trimmed.substring(spaceIndex + 1);
            
            return {
                rawCommand,
                commandText,
                remainingMessage
            };
        }
    }

    /**
     * Get available slash commands for autocomplete
     */
    public async getAvailableCommands(): Promise<SlashCommand[]> {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            
            return this.slashCommandService.getCommands();
        } catch (error) {
            console.error('[SlashCommandProcessor] Error getting commands:', error);
            return [];
        }
    }

    /**
     * Validate a command name without processing a full message
     */
    public async validateCommand(commandName: string): Promise<{
        valid: boolean;
        command?: SlashCommand;
        error?: string;
        suggestions?: string[];
    }> {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            
            const result = this.slashCommandService.resolveCommand(commandName);
            
            return {
                valid: result.success,
                command: result.command,
                error: result.error,
                suggestions: result.suggestions
            };
        } catch (error) {
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Unknown validation error'
            };
        }
    }

    /**
     * Get processor status and configuration info
     */
    public getStatus(): {
        initialized: boolean;
        commandCount: number;
        version: string;
    } {
        if (!this.isInitialized) {
            return {
                initialized: false,
                commandCount: 0,
                version: '0.0.0'
            };
        }

        const metadata = this.slashCommandService.getMetadata();
        return {
            initialized: true,
            commandCount: metadata.commandCount,
            version: metadata.version
        };
    }
}

// Singleton instance
let slashCommandProcessor: SlashCommandProcessor | null = null;

/**
 * Get the singleton slash command processor instance
 */
export function getSlashCommandProcessor(): SlashCommandProcessor {
    if (!slashCommandProcessor) {
        slashCommandProcessor = new SlashCommandProcessor();
    }
    return slashCommandProcessor;
}

export default SlashCommandProcessor; 