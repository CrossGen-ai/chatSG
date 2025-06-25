#!/usr/bin/env node

/**
 * Agent Development Environment Setup
 * 
 * This script sets up isolated development environments for individual agents
 * and agencies, enabling focused development without affecting other components.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color utilities
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

class AgentDevEnvironment {
    constructor() {
        this.baseDir = path.join(__dirname, '..');
        this.agentsDir = path.join(this.baseDir, 'src', 'agents');
    }

    /**
     * Set up development environment for an agent
     */
    async setupAgent(agentPath, agentType) {
        const agentName = path.basename(agentPath);
        console.log(colorize(`🔧 Setting up development environment for ${agentName}...`, 'cyan'));

        try {
            // Create package.json if it doesn't exist
            await this.ensurePackageJson(agentPath, agentName, agentType);
            
            // Create TypeScript config if it doesn't exist
            await this.ensureTypeScriptConfig(agentPath, agentType);
            
            // Create VS Code settings if they don't exist
            await this.ensureVSCodeSettings(agentPath, agentName, agentType);
            
            // Create Jest configuration if it doesn't exist
            await this.ensureJestConfig(agentPath, agentType);
            
            // Create environment file
            await this.ensureEnvironmentFile(agentPath, agentName);
            
            // Create mock services
            await this.createMockServices(agentPath);
            
            console.log(colorize(`✅ Development environment ready for ${agentName}`, 'green'));
            console.log(colorize(`📁 Location: ${agentPath}`, 'blue'));
            
            return true;
            
        } catch (error) {
            console.error(colorize(`❌ Failed to setup environment for ${agentName}:`, 'red'), error.message);
            return false;
        }
    }

    /**
     * Ensure package.json exists with proper structure
     */
    async ensurePackageJson(agentPath, agentName, agentType) {
        const packagePath = path.join(agentPath, 'package.json');
        
        if (!fs.existsSync(packagePath)) {
            console.log(colorize(`  📦 Creating package.json...`, 'yellow'));
            
            const packageJson = {
                name: `@chatsg/${agentName.toLowerCase()}-${agentType}`,
                version: '1.0.0',
                description: `${agentName} ${agentType} - Isolated development environment`,
                main: agentType === 'agent' ? 'dist/agent.js' : 'dist/agency.js',
                types: agentType === 'agent' ? 'dist/agent.d.ts' : 'dist/agency.d.ts',
                private: true,
                scripts: {
                    build: 'tsc',
                    'build:watch': 'tsc --watch',
                    dev: `ts-node-dev --respawn --transpile-only ${agentType}.ts`,
                    test: 'jest --config jest.config.js',
                    'test:watch': 'jest --config jest.config.js --watch',
                    'test:coverage': 'jest --config jest.config.js --coverage',
                    lint: 'eslint . --ext .ts --fix',
                    'type-check': 'tsc --noEmit',
                    clean: 'rimraf dist',
                    validate: 'npm run type-check && npm run lint && npm run test',
                    'mock:shared': 'node ../../../scripts/mock-shared-services.js',
                    'dev:isolated': 'npm run mock:shared && npm run dev',
                    'test:isolated': 'npm run mock:shared && npm run test',
                    debug: `node --inspect-brk -r ts-node/register ${agentType}.ts`
                },
                dependencies: {
                    '@langchain/core': '^0.3.21',
                    '@langchain/openai': '^0.3.14',
                    'zod': '^3.22.0'
                },
                devDependencies: {
                    '@types/jest': '^29.5.0',
                    '@types/node': '^20.10.0',
                    '@typescript-eslint/eslint-plugin': '^6.0.0',
                    '@typescript-eslint/parser': '^6.0.0',
                    eslint: '^8.40.0',
                    jest: '^29.5.0',
                    rimraf: '^5.0.0',
                    'ts-jest': '^29.1.0',
                    'ts-node': '^10.9.0',
                    'ts-node-dev': '^2.0.0',
                    typescript: '^5.3.0'
                },
                peerDependencies: {
                    '@chatsg/core': 'workspace:*',
                    '@chatsg/shared': 'workspace:*'
                }
            };
            
            if (agentType === 'agency') {
                packageJson.dependencies['@langchain/langgraph'] = '^0.2.19';
            }
            
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
        }
    }

    /**
     * Ensure TypeScript configuration exists
     */
    async ensureTypeScriptConfig(agentPath, agentType) {
        const tsconfigPath = path.join(agentPath, 'tsconfig.json');
        
        if (!fs.existsSync(tsconfigPath)) {
            console.log(colorize(`  🔧 Creating TypeScript configuration...`, 'yellow'));
            
            const tsconfig = {
                extends: '../../../../tsconfig.json',
                compilerOptions: {
                    outDir: './dist',
                    rootDir: '.',
                    baseUrl: '.',
                    paths: {
                        '@core/*': ['../../../core/*'],
                        '@shared/*': ['../../../shared/*'],
                        [`@${path.basename(agentPath)}/*`]: ['./*']
                    },
                    isolatedModules: true,
                    declaration: true,
                    declarationMap: true,
                    sourceMap: true,
                    removeComments: false,
                    preserveConstEnums: true,
                    experimentalDecorators: true,
                    emitDecoratorMetadata: true,
                    incremental: true,
                    tsBuildInfoFile: './dist/.tsbuildinfo'
                },
                include: [
                    './**/*.ts',
                    '../../../core/**/*.ts',
                    '../../../shared/**/*.ts'
                ],
                exclude: [
                    agentType === 'agent' ? '../../../agencies/**/*' : '../../../individual/**/*',
                    '../../../orchestrator/**/*',
                    '../../../wrappers/**/*',
                    '../../../state/**/*',
                    '../../../config/**/*',
                    '../../../tools/examples/**/*',
                    '../../../types/**/*',
                    './dist',
                    './node_modules',
                    './**/*.test.ts',
                    './**/*.spec.ts'
                ],
                references: [
                    { path: '../../../core' },
                    { path: '../../../shared' }
                ]
            };
            
            if (agentType === 'agency') {
                tsconfig.include.push('../../../individual/**/*.ts');
            }
            
            fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
        }
    }

    /**
     * Ensure VS Code settings exist
     */
    async ensureVSCodeSettings(agentPath, agentName, agentType) {
        const vscodeDir = path.join(agentPath, '.vscode');
        const settingsPath = path.join(vscodeDir, 'settings.json');
        
        if (!fs.existsSync(settingsPath)) {
            console.log(colorize(`  🎨 Creating VS Code settings...`, 'yellow'));
            
            if (!fs.existsSync(vscodeDir)) {
                fs.mkdirSync(vscodeDir, { recursive: true });
            }
            
            const icon = agentType === 'agent' ? '🤖' : '🏢';
            const color = agentType === 'agent' ? '#2d5016' : '#1a365d';
            
            const settings = {
                'typescript.preferences.includePackageJsonAutoImports': 'on',
                'typescript.suggest.autoImports': true,
                'files.exclude': {
                    '**/node_modules': true,
                    '**/dist': true,
                    '**/.git': true,
                    '../../../core': false,
                    '../../../shared': false
                },
                'search.exclude': {
                    '../../../orchestrator': true,
                    '../../../wrappers': true,
                    '../../../state': true,
                    '../../../config': true,
                    '../../../tools': true,
                    '../../../types': true
                },
                'explorer.fileNesting.enabled': true,
                'typescript.preferences.importModuleSpecifier': 'relative',
                'editor.codeActionsOnSave': {
                    'source.organizeImports': 'explicit',
                    'source.fixAll': 'explicit'
                },
                'editor.formatOnSave': true,
                'workbench.colorCustomizations': {
                    'titleBar.activeBackground': color,
                    'titleBar.activeForeground': '#e7e7e7',
                    'titleBar.inactiveBackground': `${color}99`,
                    'titleBar.inactiveForeground': '#e7e7e799'
                },
                'window.title': `${icon} ${agentName} ${agentType === 'agent' ? 'Agent' : 'Agency'} - \${activeEditorShort}\${separator}\${rootName}`
            };
            
            if (agentType === 'agent') {
                settings['files.exclude']['../../../agencies'] = true;
                settings['search.exclude']['../../../agencies'] = true;
            } else {
                settings['files.exclude']['../../../individual'] = false;
            }
            
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        }
    }

    /**
     * Ensure Jest configuration exists
     */
    async ensureJestConfig(agentPath, agentType) {
        const jestConfigPath = path.join(agentPath, 'jest.config.js');
        const jestSetupPath = path.join(agentPath, 'jest.setup.js');
        
        if (!fs.existsSync(jestConfigPath)) {
            console.log(colorize(`  🧪 Creating Jest configuration...`, 'yellow'));
            
            const jestConfig = `/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: [
    '<rootDir>/**/*.test.ts',
    '<rootDir>/**/*.spec.ts'
  ],
  collectCoverageFrom: [
    '<rootDir>/**/*.ts',
    '!<rootDir>/**/*.d.ts',
    '!<rootDir>/**/*.test.ts',
    '!<rootDir>/**/*.spec.ts',
    '!<rootDir>/dist/**',
    '!<rootDir>/node_modules/**'
  ],
  coverageDirectory: '<rootDir>/coverage',
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js'
  ],
  moduleNameMapping: {
    '^@core/(.*)$': '<rootDir>/../../../core/$1',
    '^@shared/(.*)$': '<rootDir>/__mocks__/shared/$1',
    '^@${path.basename(agentPath)}/(.*)$': '<rootDir>/$1'
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
      isolatedModules: true
    }]
  },
  verbose: true,
  testTimeout: 10000
};`;
            
            fs.writeFileSync(jestConfigPath, jestConfig);
        }
        
        if (!fs.existsSync(jestSetupPath)) {
            const setupContent = fs.readFileSync(
                path.join(__dirname, '..', 'src', 'agents', 'individual', 'analytical', 'jest.setup.js'),
                'utf8'
            );
            fs.writeFileSync(jestSetupPath, setupContent);
        }
    }

    /**
     * Create environment file for agent-specific configuration
     */
    async ensureEnvironmentFile(agentPath, agentName) {
        const envPath = path.join(agentPath, '.env.local');
        
        if (!fs.existsSync(envPath)) {
            console.log(colorize(`  🌍 Creating environment file...`, 'yellow'));
            
            const envContent = `# ${agentName} Development Environment
NODE_ENV=development
LOG_LEVEL=debug
AGENT_NAME=${agentName}
ISOLATED_MODE=true

# Mock service endpoints (for isolated development)
MOCK_LLM_ENDPOINT=http://localhost:3001/mock-llm
MOCK_EMBEDDING_ENDPOINT=http://localhost:3001/mock-embedding
MOCK_DATABASE_ENDPOINT=http://localhost:3001/mock-database

# Development database (if needed)
DEV_DATABASE_URL=sqlite:./dev.db

# Debug settings
DEBUG_MEMORY=true
DEBUG_TOOLS=true
DEBUG_WORKFLOW=true
`;
            
            fs.writeFileSync(envPath, envContent);
        }
    }

    /**
     * Create mock services directory
     */
    async createMockServices(agentPath) {
        const mocksDir = path.join(agentPath, '__mocks__');
        const sharedMocksDir = path.join(mocksDir, 'shared');
        
        if (!fs.existsSync(sharedMocksDir)) {
            console.log(colorize(`  🎭 Creating mock services...`, 'yellow'));
            fs.mkdirSync(sharedMocksDir, { recursive: true });
            
            // Create mock implementations
            const mockFiles = [
                'tools/WebSearchTool.ts',
                'tools/DatabaseTool.ts', 
                'memory/EmbeddingService.ts'
            ];
            
            for (const mockFile of mockFiles) {
                const mockPath = path.join(sharedMocksDir, mockFile);
                const mockDir = path.dirname(mockPath);
                
                if (!fs.existsSync(mockDir)) {
                    fs.mkdirSync(mockDir, { recursive: true });
                }
                
                if (!fs.existsSync(mockPath)) {
                    const mockContent = this.generateMockContent(mockFile);
                    fs.writeFileSync(mockPath, mockContent);
                }
            }
        }
    }

    /**
     * Generate mock content for different services
     */
    generateMockContent(filePath) {
        const filename = path.basename(filePath, '.ts');
        
        switch (filename) {
            case 'WebSearchTool':
                return `export class WebSearchTool {
  async search(query: string) {
    return [{ title: 'Mock Result', url: 'https://mock.com', snippet: 'Mock snippet' }];
  }
  isHealthy() { return true; }
  getStats() { return { requestCount: 0, errorCount: 0 }; }
}`;
            
            case 'DatabaseTool':
                return `export class DatabaseTool {
  async query(sql: string) { return []; }
  async insert(table: string, data: any) { return { id: 'mock-id' }; }
  async update(table: string, data: any) { return { affectedRows: 1 }; }
  async delete(table: string, id: string) { return { affectedRows: 1 }; }
  isHealthy() { return true; }
  getStats() { return { queryCount: 0, errorCount: 0 }; }
}`;
            
            case 'EmbeddingService':
                return `export class EmbeddingService {
  static getInstance() {
    return {
      generateEmbedding: async (text: string) => [0.1, 0.2, 0.3],
      generateEmbeddings: async (texts: string[]) => [[0.1, 0.2, 0.3]],
      isHealthy: () => true,
      getStats: () => ({ requestCount: 0, errorCount: 0 })
    };
  }
}`;
            
            default:
                return `// Mock implementation for ${filename}`;
        }
    }

    /**
     * List available agents for development setup
     */
    listAgents() {
        console.log(colorize('📋 Available agents for development setup:', 'cyan'));
        
        const individualPath = path.join(this.agentsDir, 'individual');
        const agenciesPath = path.join(this.agentsDir, 'agencies');
        
        if (fs.existsSync(individualPath)) {
            console.log(colorize('\n🤖 Individual Agents:', 'yellow'));
            const individuals = fs.readdirSync(individualPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            
            individuals.forEach(agent => {
                console.log(`  • ${agent}`);
            });
        }
        
        if (fs.existsSync(agenciesPath)) {
            console.log(colorize('\n🏢 Agencies:', 'yellow'));
            const agencies = fs.readdirSync(agenciesPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            
            agencies.forEach(agency => {
                console.log(`  • ${agency}`);
            });
        }
    }
}

// CLI Interface
function printUsage() {
    console.log(colorize('Agent Development Environment Setup', 'bright'));
    console.log('');
    console.log(colorize('Usage:', 'cyan'));
    console.log('  node dev-agent.js [command] [agent-name]');
    console.log('');
    console.log(colorize('Commands:', 'cyan'));
    console.log('  setup <agent-name>  Set up development environment for agent');
    console.log('  list                List available agents');
    console.log('  help                Show this help message');
    console.log('');
    console.log(colorize('Examples:', 'cyan'));
    console.log('  node dev-agent.js setup analytical');
    console.log('  node dev-agent.js setup customer-support');
    console.log('  node dev-agent.js list');
}

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const agentName = args[1];
    
    const devEnv = new AgentDevEnvironment();
    
    switch (command) {
        case 'setup':
            if (!agentName) {
                console.error(colorize('❌ Agent name is required', 'red'));
                printUsage();
                process.exit(1);
            }
            
            // Determine agent type and path
            const individualPath = path.join(devEnv.agentsDir, 'individual', agentName);
            const agencyPath = path.join(devEnv.agentsDir, 'agencies', agentName);
            
            if (fs.existsSync(individualPath)) {
                await devEnv.setupAgent(individualPath, 'agent');
            } else if (fs.existsSync(agencyPath)) {
                await devEnv.setupAgent(agencyPath, 'agency');
            } else {
                console.error(colorize(`❌ Agent '${agentName}' not found`, 'red'));
                process.exit(1);
            }
            break;
            
        case 'list':
            devEnv.listAgents();
            break;
            
        case 'help':
        default:
            printUsage();
            break;
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error(colorize('❌ Error:', 'red'), error.message);
        process.exit(1);
    });
}

module.exports = { AgentDevEnvironment };