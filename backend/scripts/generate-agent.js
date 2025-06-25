#!/usr/bin/env node

/**
 * Agent Generation CLI Tool
 * 
 * Automatically generates new individual agents or agencies using established templates.
 * Handles file copying, template substitution, and system integration.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color utilities for console output
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

// CLI argument parsing
class CLIParser {
    constructor() {
        this.args = process.argv.slice(2);
        this.options = {};
        this.commands = [];
    }

    parse() {
        for (let i = 0; i < this.args.length; i++) {
            const arg = this.args[i];
            
            if (arg.startsWith('--')) {
                const key = arg.slice(2);
                const value = this.args[i + 1];
                this.options[key] = value;
                i++; // Skip the value
            } else if (arg.startsWith('-')) {
                const key = arg.slice(1);
                this.options[key] = true;
            } else {
                this.commands.push(arg);
            }
        }
        
        return {
            commands: this.commands,
            options: this.options
        };
    }
}

// Template processor for replacing placeholders
class TemplateProcessor {
    constructor(replacements) {
        this.replacements = replacements;
    }

    process(content) {
        let processed = content;
        
        for (const [placeholder, replacement] of Object.entries(this.replacements)) {
            const regex = new RegExp(placeholder, 'g');
            processed = processed.replace(regex, replacement);
        }
        
        return processed;
    }
}

// Main agent generator class
class AgentGenerator {
    constructor() {
        this.baseDir = path.join(__dirname, '..');
        this.templatesDir = path.join(this.baseDir, 'src', 'agents');
    }

    /**
     * Generate a new individual agent
     */
    async generateIndividualAgent(name, description, tools = []) {
        console.log(colorize(`🤖 Generating individual agent: ${name}`, 'cyan'));
        
        // Validate agent name
        this.validateAgentName(name);
        
        // Create agent directory
        const agentDir = path.join(this.templatesDir, 'individual', name.toLowerCase());
        
        if (fs.existsSync(agentDir)) {
            throw new Error(`Agent directory already exists: ${agentDir}`);
        }
        
        fs.mkdirSync(agentDir, { recursive: true });
        fs.mkdirSync(path.join(agentDir, 'ui'), { recursive: true });
        
        // Generate replacements
        const replacements = this.createIndividualAgentReplacements(name, description, tools);
        const processor = new TemplateProcessor(replacements);
        
        // Copy and process template files
        await this.copyTemplateFiles('individual/analytical', agentDir, processor);
        
        // Update system integration
        await this.updateSystemIntegration('individual', name, description);
        
        // Generate test file
        await this.generateTestFile('individual', name);
        
        console.log(colorize(`✅ Individual agent '${name}' generated successfully!`, 'green'));
        console.log(colorize(`📁 Location: ${agentDir}`, 'blue'));
        
        return agentDir;
    }

    /**
     * Generate a new agency
     */
    async generateAgency(name, description, workflow = 'default') {
        console.log(colorize(`🏢 Generating agency: ${name}`, 'cyan'));
        
        // Validate agency name
        this.validateAgentName(name);
        
        // Create agency directory
        const agencyDir = path.join(this.templatesDir, 'agencies', name.toLowerCase());
        
        if (fs.existsSync(agencyDir)) {
            throw new Error(`Agency directory already exists: ${agencyDir}`);
        }
        
        fs.mkdirSync(agencyDir, { recursive: true });
        fs.mkdirSync(path.join(agencyDir, 'ui'), { recursive: true });
        
        // Generate replacements
        const replacements = this.createAgencyReplacements(name, description, workflow);
        const processor = new TemplateProcessor(replacements);
        
        // Copy and process template files
        await this.copyTemplateFiles('agencies/customer-support', agencyDir, processor);
        
        // Update system integration
        await this.updateSystemIntegration('agency', name, description);
        
        // Generate test file
        await this.generateTestFile('agency', name);
        
        console.log(colorize(`✅ Agency '${name}' generated successfully!`, 'green'));
        console.log(colorize(`📁 Location: ${agencyDir}`, 'blue'));
        
        return agencyDir;
    }

    /**
     * Create replacements for individual agent templates
     */
    createIndividualAgentReplacements(name, description, tools) {
        const className = this.toPascalCase(name);
        const kebabName = this.toKebabCase(name);
        const camelName = this.toCamelCase(name);
        
        return {
            'AnalyticalAgent': `${className}Agent`,
            'Analytical Agent': `${className} Agent`,
            'analytical': kebabName,
            'analyticalAgent': `${camelName}Agent`,
            'AnalyticalAgentCapabilities': `${className}AgentCapabilities`,
            'Statistical analysis and data processing capabilities': description,
            'number_analysis': tools.length > 0 ? tools.join('", "') : 'default_capability',
            'data_visualization': `${kebabName}_processing`,
            'statistical_operations': `${kebabName}_operations`,
            'Analytical memory system': `${className} memory system`,
            'analytical-memory': `${kebabName}-memory`,
            'Analytical tools': `${className} tools`,
            'AnalyticalMemory': `${className}Memory`,
            'AnalyticalTools': `${className}Tools`
        };
    }

    /**
     * Create replacements for agency templates
     */
    createAgencyReplacements(name, description, workflow) {
        const className = this.toPascalCase(name);
        const kebabName = this.toKebabCase(name);
        const camelName = this.toCamelCase(name);
        
        return {
            'CustomerSupportAgency': `${className}Agency`,
            'Customer Support Agency': `${className} Agency`,
            'customer-support': kebabName,
            'customersupport': camelName,
            'CustomerSupportWorkflow': `${className}Workflow`,
            'Customer Support Workflow': `${className} Workflow`,
            'CustomerSupportWorkflowState': `${className}WorkflowState`,
            'Multi-agent workflow for comprehensive customer support using LangGraph orchestration': description,
            'customer_support': `${kebabName}_workflow`,
            'issue_resolution': `${kebabName}_resolution`,
            'customer_interaction': `${kebabName}_interaction`,
            'sentiment_analysis': `${kebabName}_analysis`,
            'Customer support': className,
            'customer support': name.toLowerCase(),
            'intake': workflow === 'simple' ? 'process' : 'intake',
            'resolution': workflow === 'simple' ? 'complete' : 'resolution'
        };
    }

    /**
     * Copy template files and process them
     */
    async copyTemplateFiles(templatePath, targetDir, processor) {
        const sourceDir = path.join(this.templatesDir, templatePath);
        
        if (!fs.existsSync(sourceDir)) {
            throw new Error(`Template directory not found: ${sourceDir}`);
        }
        
        const files = this.getAllFiles(sourceDir);
        
        for (const file of files) {
            const relativePath = path.relative(sourceDir, file);
            const targetFile = path.join(targetDir, relativePath);
            
            // Ensure target directory exists
            fs.mkdirSync(path.dirname(targetFile), { recursive: true });
            
            // Read, process, and write file
            if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.json')) {
                const content = fs.readFileSync(file, 'utf8');
                const processedContent = processor.process(content);
                fs.writeFileSync(targetFile, processedContent);
                console.log(colorize(`  📄 Processed: ${relativePath}`, 'yellow'));
            } else {
                fs.copyFileSync(file, targetFile);
                console.log(colorize(`  📄 Copied: ${relativePath}`, 'yellow'));
            }
        }
    }

    /**
     * Update system integration (AgentFactory, Registry, etc.)
     */
    async updateSystemIntegration(type, name, description) {
        console.log(colorize(`🔧 Updating system integration...`, 'cyan'));
        
        if (type === 'individual') {
            await this.updateAgentFactory(name, description);
            await this.updateIndividualAgentsIndex(name);
        } else if (type === 'agency') {
            await this.updateAgentFactory(name, description, true);
            await this.updateAgenciesIndex(name, description);
        }
    }

    /**
     * Update AgentFactory to include new agent
     */
    async updateAgentFactory(name, description, isAgency = false) {
        const factoryPath = path.join(this.templatesDir, 'core', 'AgentFactory.ts');
        const factoryContent = fs.readFileSync(factoryPath, 'utf8');
        
        const className = this.toPascalCase(name);
        const kebabName = this.toKebabCase(name);
        const camelName = this.toCamelCase(name);
        
        let updatedContent = factoryContent;
        
        // Add case to switch statement
        const switchPattern = /case 'customersupportagency':\s*agent = await this\.createCustomerSupportAgency\(config\);\s*break;/;
        const newCase = isAgency 
            ? `case '${kebabName}':\n            case '${camelName}':\n            case '${camelName}agency':\n                agent = await this.create${className}Agency(config);\n                break;`
            : `case '${kebabName}':\n            case '${camelName}':\n            case '${camelName}agent':\n                agent = await this.create${className}Agent(config);\n                break;`;
        
        updatedContent = updatedContent.replace(switchPattern, `$&\n            ${newCase}`);
        
        // Add creation method
        const methodPattern = /private async createCustomerSupportAgency[\s\S]*?}\s*}/;
        const newMethod = isAgency
            ? `
    /**
     * Create ${className} Agency instance
     */
    private async create${className}Agency(config?: any): Promise<BaseAgent> {
        try {
            const { ${className}Agency } = await import('../agencies/${kebabName}/agency');
            const agency = new ${className}Agency();
            if (config) {
                await agency.initialize(config);
            }
            return agency;
        } catch (error) {
            console.error('[AgentFactory] Failed to create ${className}Agency:', error);
            throw new Error(\`Failed to create ${className}Agency: \${(error as Error).message}\`);
        }
    }`
            : `
    /**
     * Create ${className} Agent instance
     */
    private async create${className}Agent(config?: any): Promise<BaseAgent> {
        try {
            const { ${className}Agent } = await import('../individual/${kebabName}/agent');
            const agent = new ${className}Agent();
            if (config) {
                await agent.initialize(config);
            }
            return agent;
        } catch (error) {
            console.error('[AgentFactory] Failed to create ${className}Agent:', error);
            throw new Error(\`Failed to create ${className}Agent: \${(error as Error).message}\`);
        }
    }`;
        
        updatedContent = updatedContent.replace(methodPattern, `$&\n${newMethod}`);
        
        // Update available agents list
        const agentType = isAgency ? `${className}Agency` : `${className}Agent`;
        const availableAgentsPattern = /(const factoryAgents = \[.*?)(]\;)/s;
        updatedContent = updatedContent.replace(availableAgentsPattern, `$1, '${agentType}'$2`);
        
        // Update isAgentAvailable method
        const availabilityPattern = /(lowerName === 'customersupportagency';)/;
        const newAvailability = `lowerName === '${kebabName}' ||\n               lowerName === '${camelName}' ||\n               lowerName === '${camelName}${isAgency ? 'agency' : 'agent'}';`;
        updatedContent = updatedContent.replace(availabilityPattern, `$1 ||\n               ${newAvailability}`);
        
        fs.writeFileSync(factoryPath, updatedContent);
        console.log(colorize(`  ✅ Updated AgentFactory`, 'green'));
    }

    /**
     * Update individual agents index
     */
    async updateIndividualAgentsIndex(name) {
        const indexPath = path.join(this.templatesDir, 'individual', 'index.ts');
        const className = this.toPascalCase(name);
        const kebabName = this.toKebabCase(name);
        
        let indexContent = '';
        if (fs.existsSync(indexPath)) {
            indexContent = fs.readFileSync(indexPath, 'utf8');
        } else {
            indexContent = '/**\n * Individual Agents Exports\n */\n\n';
        }
        
        // Add export
        const exportLine = `export { ${className}Agent } from './${kebabName}/agent';\n`;
        indexContent += exportLine;
        
        fs.writeFileSync(indexPath, indexContent);
        console.log(colorize(`  ✅ Updated individual agents index`, 'green'));
    }

    /**
     * Update agencies index
     */
    async updateAgenciesIndex(name, description) {
        const indexPath = path.join(this.templatesDir, 'agencies', 'index.ts');
        const indexContent = fs.readFileSync(indexPath, 'utf8');
        
        const className = this.toPascalCase(name);
        const kebabName = this.toKebabCase(name);
        
        // Add export
        const exportPattern = /(export \{ CustomerSupportWorkflow \})/;
        const newExport = `export { ${className}Agency } from './${kebabName}/agency';\nexport { ${className}Workflow } from './${kebabName}/workflow';`;
        const updatedContent = indexContent.replace(exportPattern, `$&\n${newExport}`);
        
        // Add to registry
        const registryPattern = /(}\s*\/\/ Future agencies will be registered here)/;
        const newRegistryEntry = `,\n    '${kebabName}': {\n        name: '${className}Agency',\n        type: 'agency',\n        version: '1.0.0',\n        description: '${description}',\n        workflow: 'LangGraph StateGraph',\n        individualAgents: [],\n        features: []\n    }`;
        const finalContent = updatedContent.replace(registryPattern, `${newRegistryEntry}\n    $1`);
        
        fs.writeFileSync(indexPath, finalContent);
        console.log(colorize(`  ✅ Updated agencies index`, 'green'));
    }

    /**
     * Generate test file for new agent/agency
     */
    async generateTestFile(type, name) {
        const className = this.toPascalCase(name);
        const kebabName = this.toKebabCase(name);
        
        const testContent = type === 'individual' 
            ? this.generateIndividualAgentTest(className, kebabName)
            : this.generateAgencyTest(className, kebabName);
        
        const testPath = path.join(this.baseDir, `test-${kebabName}-${type}.js`);
        fs.writeFileSync(testPath, testContent);
        
        console.log(colorize(`  ✅ Generated test file: ${path.basename(testPath)}`, 'green'));
    }

    /**
     * Generate individual agent test template
     */
    generateIndividualAgentTest(className, kebabName) {
        return `/**
 * ${className} Agent Test
 */

const { AgentFactory } = require('./src/agents/core/AgentFactory');

async function test${className}Agent() {
    console.log('=== ${className} Agent Test ===\\n');

    try {
        const factory = AgentFactory.getInstance();
        const agent = await factory.createAgent('${kebabName}');
        
        console.log('✓ Agent created successfully');
        console.log(\`   Name: \${agent.getInfo().name}\`);
        console.log(\`   Type: \${agent.getInfo().type}\\n\`);

        // Test capabilities
        const capabilities = agent.getCapabilities();
        console.log('✓ Agent capabilities:');
        console.log(\`   Features: \${capabilities.features.join(', ')}\`);
        console.log(\`   Input types: \${capabilities.inputTypes.join(', ')}\\n\`);

        // Test message processing
        const response = await agent.processMessage('Test message', 'test-session');
        console.log('✓ Message processing:');
        console.log(\`   Success: \${response.success}\`);
        console.log(\`   Message: "\${response.message}"\\n\`);

        console.log('=== ${className} Agent Test Completed ===');
        
    } catch (error) {
        console.error('✗ Test failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    test${className}Agent();
}

module.exports = { test${className}Agent };`;
    }

    /**
     * Generate agency test template
     */
    generateAgencyTest(className, kebabName) {
        return `/**
 * ${className} Agency Test
 */

const { AgentFactory } = require('./src/agents/core/AgentFactory');

async function test${className}Agency() {
    console.log('=== ${className} Agency Test ===\\n');

    try {
        const factory = AgentFactory.getInstance();
        const agency = await factory.createAgent('${kebabName}');
        
        console.log('✓ Agency created successfully');
        console.log(\`   Name: \${agency.getInfo().name}\`);
        console.log(\`   Type: \${agency.getInfo().type}\\n\`);

        // Test workflow status
        const workflowStatus = agency.getWorkflowStatus();
        console.log('✓ Workflow status:');
        console.log(\`   Initialized: \${workflowStatus.initialized}\`);
        console.log(\`   Available agents: \${JSON.stringify(workflowStatus.availableAgents)}\\n\`);

        // Test message processing
        const response = await agency.processMessage('Test workflow message', 'test-session');
        console.log('✓ Workflow processing:');
        console.log(\`   Success: \${response.success}\`);
        console.log(\`   Message: "\${response.message}"\\n\`);

        console.log('=== ${className} Agency Test Completed ===');
        
    } catch (error) {
        console.error('✗ Test failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    test${className}Agency();
}

module.exports = { test${className}Agency };`;
    }

    /**
     * Utility functions
     */
    validateAgentName(name) {
        if (!name || typeof name !== 'string') {
            throw new Error('Agent name is required and must be a string');
        }
        
        if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(name)) {
            throw new Error('Agent name must start with a letter and contain only letters, numbers, hyphens, and underscores');
        }
        
        const reservedNames = ['core', 'shared', 'test', 'base', 'abstract'];
        if (reservedNames.includes(name.toLowerCase())) {
            throw new Error(`Agent name '${name}' is reserved`);
        }
    }

    toPascalCase(str) {
        return str.replace(/(?:^|[-_])([a-z])/g, (_, char) => char.toUpperCase());
    }

    toKebabCase(str) {
        return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    }

    toCamelCase(str) {
        const pascal = this.toPascalCase(str);
        return pascal.charAt(0).toLowerCase() + pascal.slice(1);
    }

    getAllFiles(dir) {
        const files = [];
        
        function traverse(currentDir) {
            const items = fs.readdirSync(currentDir);
            
            for (const item of items) {
                const fullPath = path.join(currentDir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    traverse(fullPath);
                } else {
                    files.push(fullPath);
                }
            }
        }
        
        traverse(dir);
        return files;
    }
}

// CLI interface
function printUsage() {
    console.log(colorize('Agent Generation CLI Tool', 'bright'));
    console.log('');
    console.log(colorize('Usage:', 'cyan'));
    console.log('  node generate-agent.js [command] [options]');
    console.log('');
    console.log(colorize('Commands:', 'cyan'));
    console.log('  individual  Generate a new individual agent');
    console.log('  agency      Generate a new agency');
    console.log('  help        Show this help message');
    console.log('');
    console.log(colorize('Options:', 'cyan'));
    console.log('  --name <name>         Agent/agency name (required)');
    console.log('  --description <desc>  Agent/agency description (required)');
    console.log('  --tools <tools>       Comma-separated tools list (individual agents only)');
    console.log('  --workflow <type>     Workflow type: default|simple (agencies only)');
    console.log('');
    console.log(colorize('Examples:', 'cyan'));
    console.log('  node generate-agent.js individual --name ContentCreator --description "AI agent for content creation"');
    console.log('  node generate-agent.js agency --name DataAnalysis --description "Multi-agent data analysis workflow"');
    console.log('  node generate-agent.js individual --name Translator --description "Language translation agent" --tools "translation,language-detection"');
}

async function main() {
    try {
        const parser = new CLIParser();
        const { commands, options } = parser.parse();
        
        if (commands.length === 0 || commands[0] === 'help') {
            printUsage();
            return;
        }
        
        const command = commands[0];
        const { name, description, tools, workflow } = options;
        
        if (!name) {
            throw new Error('Agent name is required (use --name <name>)');
        }
        
        if (!description) {
            throw new Error('Agent description is required (use --description <description>)');
        }
        
        const generator = new AgentGenerator();
        
        switch (command) {
            case 'individual':
                const toolsList = tools ? tools.split(',').map(t => t.trim()) : [];
                await generator.generateIndividualAgent(name, description, toolsList);
                break;
                
            case 'agency':
                const workflowType = workflow || 'default';
                await generator.generateAgency(name, description, workflowType);
                break;
                
            default:
                throw new Error(`Unknown command: ${command}`);
        }
        
        console.log('');
        console.log(colorize('🎉 Generation completed successfully!', 'green'));
        console.log(colorize('💡 Next steps:', 'cyan'));
        console.log('  1. Review the generated files');
        console.log('  2. Customize the implementation as needed');
        console.log('  3. Run the generated test file');
        console.log('  4. Add your agent to the main orchestrator');
        
    } catch (error) {
        console.error(colorize('❌ Error:', 'red'), error.message);
        console.log('');
        console.log(colorize('💡 Use --help for usage information', 'yellow'));
        process.exit(1);
    }
}

// Run CLI if called directly
if (require.main === module) {
    main();
}

module.exports = { AgentGenerator, TemplateProcessor };