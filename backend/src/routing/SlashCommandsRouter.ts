/**
 * Slash Commands Router
 * 
 * Express router for serving slash commands configuration to the frontend.
 * Provides RESTful API endpoints for command discovery and validation.
 */

import { Router, Request, Response } from 'express';
import { getSlashCommandService, SlashCommand } from './SlashCommandService';

// Router instance
const router = Router();

// Response interfaces
interface SlashCommandsResponse {
    success: boolean;
    commands: SlashCommand[];
    metadata: {
        version: string;
        lastUpdated: string;
        commandCount: number;
        serverTimestamp: string;
    };
}

interface SlashCommandValidationResponse {
    success: boolean;
    valid: boolean;
    command?: SlashCommand;
    error?: string;
    suggestions?: string[];
}

interface ErrorResponse {
    success: false;
    error: string;
    code?: string;
}

/**
 * GET /api/slash-commands
 * Get all available slash commands
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const service = getSlashCommandService();
        
        // Ensure configuration is loaded
        const loaded = await service.loadConfiguration();
        if (!loaded) {
            return res.status(500).json({
                success: false,
                error: 'Failed to load slash commands configuration',
                code: 'CONFIG_LOAD_ERROR'
            } as ErrorResponse);
        }

        // Get commands and metadata
        const commands = service.getCommands();
        const metadata = service.getMetadata();

        const response: SlashCommandsResponse = {
            success: true,
            commands,
            metadata: {
                ...metadata,
                serverTimestamp: new Date().toISOString()
            }
        };

        // Set caching headers for performance
        res.set({
            'Cache-Control': 'public, max-age=300', // 5 minutes cache
            'ETag': `"${metadata.version}-${metadata.commandCount}"`
        });

        res.json(response);
        
        console.log(`[SlashCommandsRouter] Served ${commands.length} commands to client`);
        return;

    } catch (error) {
        console.error('[SlashCommandsRouter] Error serving commands:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while fetching commands',
            code: 'INTERNAL_ERROR'
        } as ErrorResponse);
        return;
    }
});

/**
 * GET /api/slash-commands/validate/:command
 * Validate a specific command and get resolution details
 */
router.get('/validate/:command', async (req: Request, res: Response) => {
    try {
        const { command } = req.params;
        
        if (!command) {
            return res.status(400).json({
                success: false,
                error: 'Command parameter is required',
                code: 'MISSING_COMMAND'
            } as ErrorResponse);
        }

        const service = getSlashCommandService();
        
        // Ensure configuration is loaded
        const loaded = await service.loadConfiguration();
        if (!loaded) {
            return res.status(500).json({
                success: false,
                error: 'Failed to load slash commands configuration',
                code: 'CONFIG_LOAD_ERROR'
            } as ErrorResponse);
        }

        // Remove leading slash if present
        const cleanCommand = command.startsWith('/') ? command.slice(1) : command;
        
        // Validate command name format
        const isValidFormat = service.validateCommandName(cleanCommand);
        if (!isValidFormat) {
            return res.json({
                success: true,
                valid: false,
                error: 'Invalid command format. Commands must contain only letters, numbers, hyphens, and underscores.',
                suggestions: []
            } as SlashCommandValidationResponse);
        }

        // Resolve command
        const result = service.resolveCommand(cleanCommand);
        
        const response: SlashCommandValidationResponse = {
            success: true,
            valid: result.success,
            command: result.command,
            error: result.error,
            suggestions: result.suggestions || []
        };

        res.json(response);
        
        console.log(`[SlashCommandsRouter] Validated command: ${cleanCommand} → ${result.success ? 'valid' : 'invalid'}`);
        return;

    } catch (error) {
        console.error('[SlashCommandsRouter] Error validating command:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while validating command',
            code: 'INTERNAL_ERROR'
        } as ErrorResponse);
        return;
    }
});

/**
 * GET /api/slash-commands/categories/:category
 * Get commands by category
 */
router.get('/categories/:category', async (req: Request, res: Response) => {
    try {
        const { category } = req.params;
        
        if (!category) {
            return res.status(400).json({
                success: false,
                error: 'Category parameter is required',
                code: 'MISSING_CATEGORY'
            } as ErrorResponse);
        }

        const service = getSlashCommandService();
        
        // Ensure configuration is loaded
        const loaded = await service.loadConfiguration();
        if (!loaded) {
            return res.status(500).json({
                success: false,
                error: 'Failed to load slash commands configuration',
                code: 'CONFIG_LOAD_ERROR'
            } as ErrorResponse);
        }

        const commands = service.getCommandsByCategory(category);
        const metadata = service.getMetadata();

        const response = {
            success: true,
            category,
            commands,
            metadata: {
                ...metadata,
                serverTimestamp: new Date().toISOString()
            }
        };

        res.json(response);
        
        console.log(`[SlashCommandsRouter] Served ${commands.length} commands for category: ${category}`);
        return;

    } catch (error) {
        console.error('[SlashCommandsRouter] Error serving category commands:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while fetching category commands',
            code: 'INTERNAL_ERROR'
        } as ErrorResponse);
        return;
    }
});

/**
 * GET /api/slash-commands/health
 * Health check endpoint for slash commands service
 */
router.get('/health', async (req: Request, res: Response) => {
    try {
        const service = getSlashCommandService();
        const loaded = await service.loadConfiguration();
        
        const health = {
            success: true,
            status: loaded ? 'healthy' : 'degraded',
            configLoaded: loaded,
            timestamp: new Date().toISOString()
        };

        if (loaded) {
            const metadata = service.getMetadata();
            health['commandCount'] = metadata.commandCount;
            health['version'] = metadata.version;
        }

        res.json(health);

    } catch (error) {
        console.error('[SlashCommandsRouter] Health check failed:', error);
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Error handling middleware for slash commands routes
 */
router.use((error: Error, req: Request, res: Response, next: any) => {
    console.error('[SlashCommandsRouter] Unhandled error:', error);
    
    res.status(500).json({
        success: false,
        error: 'Internal server error in slash commands router',
        code: 'ROUTER_ERROR'
    } as ErrorResponse);
});

export default router; 