/**
 * Creative Agent Module
 * Exports the creative agent implementation
 */

// Main agent export
export { CreativeAgent } from './agent';

// Note: Config can be imported separately if needed
// import CreativeConfig from './config.json';

// Basic placeholder types until proper tools and memory are implemented
export interface WritingResults {
    content: string;
    style: string;
    wordCount: number;
}

export interface CreativeOptions {
    genre?: string;
    tone?: string;
    length?: number;
}

export interface StoryConfig {
    setting: string;
    characters: string[];
    plotType: string;
}

export interface BrainstormingResult {
    ideas: string[];
    themes: string[];
    keywords: string[];
}

export interface CreativeMemoryEntry {
    id: string;
    content: string;
    type: string;
    timestamp: Date;
}

export interface CreativeSearchOptions {
    query: string;
    categories?: string[];
    dateRange?: { start: Date; end: Date };
} 