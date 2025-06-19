/**
 * Text Processor Tool
 * 
 * A comprehensive text processing tool that provides various text manipulation
 * capabilities including formatting, analysis, and transformation.
 */

import { BaseTool, ToolSchema, ToolParams, ToolResult, ToolContext } from '../Tool';

export class TextProcessorTool extends BaseTool {
    constructor() {
        super(
            'text-processor',
            '1.0.0',
            'Advanced text processing tool with formatting, analysis, and transformation capabilities',
            { 
                enabled: true, 
                timeout: 10000,
                cacheResults: true,
                cacheTTL: 300000 // 5 minutes
            },
            {
                author: 'ChatSG Tool System',
                category: 'text',
                tags: ['text', 'processing', 'analysis', 'formatting']
            }
        );
    }

    getSchema(): ToolSchema {
        return {
            name: this.name,
            description: this.description,
            parameters: [
                {
                    name: 'text',
                    type: 'string',
                    description: 'The input text to process',
                    required: true
                },
                {
                    name: 'operation',
                    type: 'string',
                    description: 'The operation to perform on the text',
                    required: true,
                    enum: [
                        'uppercase',
                        'lowercase',
                        'capitalize',
                        'reverse',
                        'count-words',
                        'count-chars',
                        'count-lines',
                        'remove-whitespace',
                        'normalize-whitespace',
                        'extract-emails',
                        'extract-urls',
                        'extract-numbers',
                        'sentiment-analysis',
                        'readability-score',
                        'word-frequency'
                    ]
                },
                {
                    name: 'options',
                    type: 'object',
                    description: 'Additional options for the operation',
                    required: false,
                    properties: {
                        preserveNewlines: {
                            name: 'preserveNewlines',
                            type: 'boolean',
                            description: 'Whether to preserve newlines in processing',
                            required: false
                        },
                        caseSensitive: {
                            name: 'caseSensitive',
                            type: 'boolean',
                            description: 'Whether to perform case-sensitive operations',
                            required: false
                        },
                        limit: {
                            name: 'limit',
                            type: 'number',
                            description: 'Limit the number of results returned',
                            required: false,
                            minimum: 1
                        }
                    }
                }
            ],
            returns: {
                type: 'object',
                description: 'Processed text result',
                properties: {
                    result: 'string | number | object',
                    operation: 'string',
                    originalLength: 'number',
                    processedLength: 'number',
                    metadata: 'object'
                }
            },
            examples: [
                {
                    input: {
                        text: 'Hello World!',
                        operation: 'uppercase'
                    },
                    output: {
                        result: 'HELLO WORLD!',
                        operation: 'uppercase',
                        originalLength: 12,
                        processedLength: 12
                    },
                    description: 'Convert text to uppercase'
                },
                {
                    input: {
                        text: 'The quick brown fox jumps over the lazy dog.',
                        operation: 'count-words'
                    },
                    output: {
                        result: 9,
                        operation: 'count-words',
                        originalLength: 44,
                        processedLength: 44
                    },
                    description: 'Count words in text'
                }
            ]
        };
    }

    async execute(params: ToolParams, context?: ToolContext): Promise<ToolResult> {
        const startTime = Date.now();

        try {
            const { text, operation, options = {} } = params;
            const originalLength = text.length;

            let result: any;
            let metadata: any = {};

            switch (operation) {
                case 'uppercase':
                    result = text.toUpperCase();
                    break;

                case 'lowercase':
                    result = text.toLowerCase();
                    break;

                case 'capitalize':
                    result = this.capitalizeText(text);
                    break;

                case 'reverse':
                    result = text.split('').reverse().join('');
                    break;

                case 'count-words':
                    result = this.countWords(text);
                    metadata.words = this.getWords(text);
                    break;

                case 'count-chars':
                    result = options.includeSpaces !== false ? text.length : text.replace(/\s/g, '').length;
                    metadata.withSpaces = text.length;
                    metadata.withoutSpaces = text.replace(/\s/g, '').length;
                    break;

                case 'count-lines':
                    result = text.split('\n').length;
                    metadata.emptyLines = text.split('\n').filter((line: string) => line.trim() === '').length;
                    break;

                case 'remove-whitespace':
                    result = text.replace(/\s+/g, '');
                    break;

                case 'normalize-whitespace':
                    result = text.replace(/\s+/g, ' ').trim();
                    break;

                case 'extract-emails':
                    result = this.extractEmails(text, options.limit);
                    metadata.count = result.length;
                    break;

                case 'extract-urls':
                    result = this.extractUrls(text, options.limit);
                    metadata.count = result.length;
                    break;

                case 'extract-numbers':
                    result = this.extractNumbers(text, options.limit);
                    metadata.count = result.length;
                    break;

                case 'sentiment-analysis':
                    result = this.analyzeSentiment(text);
                    break;

                case 'readability-score':
                    result = this.calculateReadabilityScore(text);
                    break;

                case 'word-frequency':
                    result = this.calculateWordFrequency(text, options.caseSensitive, options.limit);
                    break;

                default:
                    return this.createErrorResult(`Unknown operation: ${operation}`);
            }

            const processedLength = typeof result === 'string' ? result.length : originalLength;
            const executionTime = Date.now() - startTime;

            return this.createSuccessResult({
                result,
                operation,
                originalLength,
                processedLength,
                metadata
            }, `Text processing completed: ${operation}`, {
                executionTime
            });

        } catch (error) {
            return this.createErrorResult(`Text processing failed: ${(error as Error).message}`);
        }
    }

    private capitalizeText(text: string): string {
        return text.replace(/\b\w/g, char => char.toUpperCase());
    }

    private countWords(text: string): number {
        return this.getWords(text).length;
    }

    private getWords(text: string): string[] {
        return text.trim().split(/\s+/).filter(word => word.length > 0);
    }

    private extractEmails(text: string, limit?: number): string[] {
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const matches = text.match(emailRegex) || [];
        return limit ? matches.slice(0, limit) : matches;
    }

    private extractUrls(text: string, limit?: number): string[] {
        const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
        const matches = text.match(urlRegex) || [];
        return limit ? matches.slice(0, limit) : matches;
    }

    private extractNumbers(text: string, limit?: number): number[] {
        const numberRegex = /-?\d+\.?\d*/g;
        const matches = text.match(numberRegex) || [];
        const numbers = matches.map(match => parseFloat(match)).filter(num => !isNaN(num));
        return limit ? numbers.slice(0, limit) : numbers;
    }

    private analyzeSentiment(text: string): { score: number; sentiment: string; confidence: number } {
        // Simple sentiment analysis based on positive/negative word counts
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'pleased'];
        const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'sad', 'angry', 'disappointed', 'frustrated'];

        const words = this.getWords(text.toLowerCase());
        let positiveCount = 0;
        let negativeCount = 0;

        for (const word of words) {
            if (positiveWords.includes(word)) positiveCount++;
            if (negativeWords.includes(word)) negativeCount++;
        }

        const totalSentimentWords = positiveCount + negativeCount;
        const score = totalSentimentWords > 0 ? (positiveCount - negativeCount) / totalSentimentWords : 0;

        let sentiment: string;
        if (score > 0.1) sentiment = 'positive';
        else if (score < -0.1) sentiment = 'negative';
        else sentiment = 'neutral';

        const confidence = totalSentimentWords > 0 ? Math.min(totalSentimentWords / words.length * 2, 1) : 0;

        return { score, sentiment, confidence };
    }

    private calculateReadabilityScore(text: string): { score: number; level: string; details: any } {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = this.getWords(text);
        const syllables = words.reduce((total, word) => total + this.countSyllables(word), 0);

        if (sentences.length === 0 || words.length === 0) {
            return { score: 0, level: 'unreadable', details: {} };
        }

        // Flesch Reading Ease Score
        const avgSentenceLength = words.length / sentences.length;
        const avgSyllablesPerWord = syllables / words.length;
        const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);

        let level: string;
        if (score >= 90) level = 'very easy';
        else if (score >= 80) level = 'easy';
        else if (score >= 70) level = 'fairly easy';
        else if (score >= 60) level = 'standard';
        else if (score >= 50) level = 'fairly difficult';
        else if (score >= 30) level = 'difficult';
        else level = 'very difficult';

        return {
            score: Math.round(score * 100) / 100,
            level,
            details: {
                sentences: sentences.length,
                words: words.length,
                syllables,
                avgSentenceLength: Math.round(avgSentenceLength * 100) / 100,
                avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100
            }
        };
    }

    private countSyllables(word: string): number {
        // Simple syllable counting algorithm
        word = word.toLowerCase();
        if (word.length <= 3) return 1;
        
        const vowels = 'aeiouy';
        let syllableCount = 0;
        let previousWasVowel = false;

        for (let i = 0; i < word.length; i++) {
            const isVowel = vowels.includes(word[i]);
            if (isVowel && !previousWasVowel) {
                syllableCount++;
            }
            previousWasVowel = isVowel;
        }

        // Handle silent 'e'
        if (word.endsWith('e') && syllableCount > 1) {
            syllableCount--;
        }

        return Math.max(1, syllableCount);
    }

    private calculateWordFrequency(text: string, caseSensitive: boolean = false, limit?: number): Array<{ word: string; count: number; frequency: number }> {
        const processedText = caseSensitive ? text : text.toLowerCase();
        const words = this.getWords(processedText);
        const wordCounts: Record<string, number> = {};

        // Count word occurrences
        for (const word of words) {
            const cleanWord = word.replace(/[^\w]/g, '');
            if (cleanWord.length > 0) {
                wordCounts[cleanWord] = (wordCounts[cleanWord] || 0) + 1;
            }
        }

        // Convert to array and calculate frequencies
        const totalWords = words.length;
        const frequencies = Object.entries(wordCounts)
            .map(([word, count]) => ({
                word,
                count,
                frequency: Math.round((count / totalWords) * 10000) / 100 // Percentage with 2 decimal places
            }))
            .sort((a, b) => b.count - a.count);

        return limit ? frequencies.slice(0, limit) : frequencies;
    }
} 