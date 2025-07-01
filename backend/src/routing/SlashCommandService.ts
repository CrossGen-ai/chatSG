/**
 * Slash Command Service
 * 
 * Service for managing slash command configuration, validation, and processing.
 * Provides methods to load commands from config, validate them, and resolve aliases.
 */

import * as fs from 'fs';
import * as path from 'path';

// Types for slash command configuration
export interface SlashCommand {
    name: string;
    description: string;
    agentType: string;
    category: string;
    aliases: string[];
    enabled: boolean;
    priority: number;
    path?: string; // Optional webhook URL for webhook-category commands
}

export interface SlashCommandConfig {
    version: string;
    description: string;
    lastUpdated: string;
    commands: SlashCommand[];
    settings: {
        maxAliasLength: number;
        caseSensitive: boolean;
        requireExactMatch: boolean;
        enablePartialMatching: boolean;
    };
}

export interface SlashCommandResult {
    success: boolean;
    command?: SlashCommand;
    error?: string;
    suggestions?: string[];
}

/**
 * Service class for managing slash commands
 */
export class SlashCommandService {
    private config: SlashCommandConfig | null = null;
    private configPath: string;
    private commandMap: Map<string, SlashCommand> = new Map();
    private aliasMap: Map<string, SlashCommand> = new Map();
    private lastLoadTime: number = 0;

    constructor(configPath?: string) {
        this.configPath = configPath || path.join(__dirname, '../../config/slash-commands.json');
        console.log(`[SlashCommandService] Initialized with config path: ${this.configPath}`);
    }

    /**
     * Load slash commands configuration from file
     */
    public async loadConfiguration(): Promise<boolean> {
        try {
            if (!fs.existsSync(this.configPath)) {
                console.error(`[SlashCommandService] Configuration file not found: ${this.configPath}`);
                return false;
            }

            const configData = fs.readFileSync(this.configPath, 'utf-8');
            const config = JSON.parse(configData) as SlashCommandConfig;

            // Validate configuration structure
            if (!this.validateConfiguration(config)) {
                console.error('[SlashCommandService] Invalid configuration structure');
                return false;
            }

            this.config = config;
            this.buildCommandMaps();
            this.lastLoadTime = Date.now();

            console.log(`[SlashCommandService] Loaded ${config.commands.length} slash commands`);
            return true;

        } catch (error) {
            console.error('[SlashCommandService] Failed to load configuration:', error);
            return false;
        }
    }

    /**
     * Get all available slash commands
     */
    public getCommands(): SlashCommand[] {
        if (!this.config) {
            return [];
        }
        return this.config.commands.filter(cmd => cmd.enabled);
    }

    /**
     * Get commands by category
     */
    public getCommandsByCategory(category: string): SlashCommand[] {
        return this.getCommands().filter(cmd => cmd.category === category);
    }

    /**
     * Resolve a command by name or alias
     */
    public resolveCommand(input: string): SlashCommandResult {
        if (!this.config) {
            return {
                success: false,
                error: 'Configuration not loaded'
            };
        }

        const normalizedInput = this.config.settings.caseSensitive 
            ? input 
            : input.toLowerCase();

        // Try exact match first
        let command = this.commandMap.get(normalizedInput) || this.aliasMap.get(normalizedInput);

        if (command) {
            return {
                success: true,
                command
            };
        }

        // Try partial matching if enabled
        if (this.config.settings.enablePartialMatching) {
            const suggestions = this.findPartialMatches(normalizedInput);
            if (suggestions.length === 1) {
                // Single partial match, return it
                command = this.commandMap.get(suggestions[0]) || this.aliasMap.get(suggestions[0]);
                if (command) {
                    return {
                        success: true,
                        command
                    };
                }
            } else if (suggestions.length > 1) {
                // Multiple matches, return suggestions
                return {
                    success: false,
                    error: 'Ambiguous command',
                    suggestions
                };
            }
        }

        // No match found
        const allCommands = Array.from(this.commandMap.keys());
        return {
            success: false,
            error: 'Command not found',
            suggestions: this.findSimilarCommands(normalizedInput, allCommands)
        };
    }

    /**
     * Validate command name format
     */
    public validateCommandName(name: string): boolean {
        if (!name || name.length === 0) {
            return false;
        }

        // Remove leading slash if present
        const commandName = name.startsWith('/') ? name.slice(1) : name;
        
        // Check for valid characters (alphanumeric, hyphens, underscores)
        const validPattern = /^[a-zA-Z0-9\-_]+$/;
        return validPattern.test(commandName);
    }

    /**
     * Get configuration metadata
     */
    public getMetadata(): { version: string; lastUpdated: string; commandCount: number } {
        if (!this.config) {
            return {
                version: '0.0.0',
                lastUpdated: new Date().toISOString(),
                commandCount: 0
            };
        }

        return {
            version: this.config.version,
            lastUpdated: this.config.lastUpdated,
            commandCount: this.config.commands.filter(cmd => cmd.enabled).length
        };
    }

    /**
     * Validate configuration structure
     */
    private validateConfiguration(config: any): boolean {
        try {
            // Check required top-level fields
            if (!config.version || !config.commands || !Array.isArray(config.commands)) {
                return false;
            }

            // Validate each command
            for (const command of config.commands) {
                if (!command.name || !command.agentType || !command.category) {
                    return false;
                }
                
                if (!Array.isArray(command.aliases)) {
                    return false;
                }
                
                // Validate webhook path if present
                if (command.path && !this.isValidUrl(command.path)) {
                    console.warn(`[SlashCommandService] Invalid webhook URL for command ${command.name}: ${command.path}`);
                    return false;
                }
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Build internal command and alias maps for fast lookup
     */
    private buildCommandMaps(): void {
        if (!this.config) return;

        this.commandMap.clear();
        this.aliasMap.clear();

        for (const command of this.config.commands) {
            if (!command.enabled) continue;

            const commandKey = this.config.settings.caseSensitive 
                ? command.name 
                : command.name.toLowerCase();
            
            this.commandMap.set(commandKey, command);

            // Add aliases
            for (const alias of command.aliases) {
                const aliasKey = this.config.settings.caseSensitive 
                    ? alias 
                    : alias.toLowerCase();
                
                this.aliasMap.set(aliasKey, command);
            }
        }

        console.log(`[SlashCommandService] Built maps: ${this.commandMap.size} commands, ${this.aliasMap.size} aliases`);
    }

    /**
     * Find partial matches for a given input
     */
    private findPartialMatches(input: string): string[] {
        const matches: string[] = [];
        
        // Check command names
        for (const [key, command] of this.commandMap.entries()) {
            if (key.startsWith(input)) {
                matches.push(key);
            }
        }

        // Check aliases
        for (const [key, command] of this.aliasMap.entries()) {
            if (key.startsWith(input) && !matches.includes(command.name)) {
                matches.push(command.name);
            }
        }

        return matches.slice(0, 5); // Limit suggestions
    }

    /**
     * Find similar commands using simple string similarity
     */
    private findSimilarCommands(input: string, commands: string[]): string[] {
        // Simple similarity check based on common characters
        const similar = commands
            .map(cmd => ({
                name: cmd,
                similarity: this.calculateSimilarity(input, cmd)
            }))
            .filter(item => item.similarity > 0.3)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3)
            .map(item => item.name);

        return similar;
    }

    /**
     * Calculate simple string similarity
     */
    private calculateSimilarity(str1: string, str2: string): number {
        const len1 = str1.length;
        const len2 = str2.length;
        
        if (len1 === 0 || len2 === 0) return 0;

        let matches = 0;
        const maxLen = Math.max(len1, len2);
        
        for (let i = 0; i < Math.min(len1, len2); i++) {
            if (str1[i] === str2[i]) {
                matches++;
            }
        }

        return matches / maxLen;
    }

    /**
     * Validate if a string is a valid URL
     */
    private isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
}

// Singleton instance
let slashCommandService: SlashCommandService | null = null;

/**
 * Get the singleton slash command service instance
 */
export function getSlashCommandService(): SlashCommandService {
    if (!slashCommandService) {
        slashCommandService = new SlashCommandService();
    }
    return slashCommandService;
}

export default SlashCommandService; 