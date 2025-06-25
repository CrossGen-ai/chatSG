# Agent Generation CLI Tool

The Agent Generation CLI Tool (`generate-agent.js`) is a powerful command-line utility that enables rapid creation of new individual agents and agencies using established templates. This tool automates the entire process of agent creation, from file generation to system integration.

## Features

- ✅ **Template-based Generation**: Creates agents from proven templates
- ✅ **Automatic Integration**: Updates AgentFactory, indexes, and registries  
- ✅ **Smart Naming**: Handles PascalCase, camelCase, and kebab-case conversions
- ✅ **Test Generation**: Creates test files with proper structure
- ✅ **Validation**: Input validation and error handling
- ✅ **NPM Integration**: Provides convenient npm scripts
- ✅ **Pattern Compliance**: Follows established coding patterns

## Installation

No additional installation required. The tool uses Node.js built-in modules.

## Usage

### Basic Command Structure

```bash
node scripts/generate-agent.js [command] [options]
```

### NPM Scripts (Recommended)

```bash
# Generate with npm scripts (recommended)
npm run generate:individual -- --name MyAgent --description "Description"
npm run generate:agency -- --name MyWorkflow --description "Description"

# Short alias
npm run gen -- individual --name QuickAgent --description "Quick agent"
```

### Commands

#### Individual Agent Generation

Create a new individual agent with specialized capabilities:

```bash
node scripts/generate-agent.js individual --name ContentCreator --description "AI agent for content creation"

# With custom tools
node scripts/generate-agent.js individual --name Translator --description "Language translation agent" --tools "translation,language-detection"
```

#### Agency Generation  

Create a new multi-agent workflow using LangGraph:

```bash
node scripts/generate-agent.js agency --name DataAnalysis --description "Multi-agent data analysis workflow"

# With workflow type
node scripts/generate-agent.js agency --name SimpleWorkflow --description "Simple workflow" --workflow simple
```

### Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `--name` | string | ✅ | Agent/agency name (PascalCase recommended) |
| `--description` | string | ✅ | Descriptive explanation of capabilities |
| `--tools` | string | ❌ | Comma-separated list of tools (individual agents only) |
| `--workflow` | string | ❌ | Workflow type: `default` or `simple` (agencies only) |

## Generated Structure

### Individual Agent

Creates a complete agent structure:

```
src/agents/individual/{agent-name}/
├── agent.ts           # Main agent class
├── index.ts           # Clean exports
├── memory.ts          # Agent-specific memory
├── tools.ts           # Agent-specific tools
├── config.json        # Configuration
└── ui/                # UI components (future)
```

### Agency

Creates a multi-agent workflow structure:

```
src/agents/agencies/{agency-name}/
├── agency.ts          # Main agency class
├── workflow.ts        # LangGraph workflow
└── ui/                # Workflow visualization
    └── WorkflowVisualization.tsx
```

## System Integration

The CLI tool automatically handles:

### AgentFactory Updates
- Adds case statements for new agent names
- Creates agent instantiation methods  
- Updates available agents list
- Adds agent availability checks

### Index File Maintenance
- Updates `individual/index.ts` for individual agents
- Updates `agencies/index.ts` for agencies
- Maintains clean export structure

### Test File Generation
- Creates comprehensive test files
- Includes basic functionality tests
- Follows established test patterns

## Template Processing

The tool performs intelligent template substitution:

### Naming Conventions
- **PascalCase**: `ContentCreator` → `ContentCreatorAgent`
- **camelCase**: `contentCreator` → `contentCreatorAgent`  
- **kebab-case**: `content-creator` → File paths and IDs

### Description Replacement
- Replaces template descriptions with provided description
- Maintains contextual formatting
- Updates comments and documentation

### Configuration Updates
- Updates JSON configuration files
- Replaces capability definitions
- Adjusts memory and tool settings

## Validation & Error Handling

### Input Validation
- Agent name format validation
- Reserved name checking
- Duplicate name detection
- Description requirement enforcement

### Error Messages
- Clear error descriptions
- Helpful troubleshooting hints
- Validation failure details

### Conflict Prevention
- Checks for existing directories
- Prevents overwriting existing agents
- Validates agent name uniqueness

## Examples

### Content Creation Agent

```bash
npm run generate:individual -- \
  --name ContentCreator \
  --description "AI agent specialized in creating blog posts, articles, and marketing content" \
  --tools "content-generation,seo-optimization,grammar-check"
```

Generated capabilities:
- Blog post creation
- SEO optimization
- Grammar checking
- Content templates

### Data Analysis Workflow

```bash
npm run generate:agency -- \
  --name DataAnalysis \
  --description "Multi-stage data analysis workflow with visualization and reporting"
```

Generated workflow stages:
- Data ingestion
- Analysis processing  
- Visualization generation
- Report compilation

### Quick Test Agent

```bash
npm run gen -- individual --name TestBot --description "Simple test agent for experimentation"
```

## Advanced Usage

### Custom Tools Integration

When specifying tools, the CLI creates placeholders for:
- Tool initialization
- Capability definitions
- Method implementations
- Configuration options

### Workflow Customization

Agencies support different workflow types:
- **default**: Full multi-stage workflow with LangGraph
- **simple**: Simplified workflow for basic use cases

### Development Integration

Generated agents integrate seamlessly with:
- VS Code IntelliSense
- TypeScript compilation
- Existing test framework
- Development tooling

## Troubleshooting

### Common Issues

**"Agent name is required"**
- Ensure `--name` parameter is provided
- Check name format (letters, numbers, hyphens, underscores only)

**"Agent directory already exists"**
- Choose a different agent name
- Remove existing directory if replacing

**"Template directory not found"**
- Ensure you're running from the backend directory
- Verify template agents exist

### File Permissions
- Ensure write permissions in `src/agents/` directory
- Check file system permissions for script execution

### TypeScript Compilation
- Run `npm run build` after generation
- Check for TypeScript errors in generated files

## Integration Testing

Test generated agents:

```bash
# Test individual agent
node test-{agent-name}-individual.js

# Test agency  
node test-{agency-name}-agency.js

# Run full test suite
npm test
```

## Best Practices

### Naming
- Use descriptive, clear names
- Follow PascalCase convention
- Avoid abbreviations when possible

### Descriptions
- Be specific about capabilities
- Mention key features
- Include use case context

### Tool Selection
- Choose relevant tools for agent purpose
- Consider shared vs. agent-specific tools
- Plan tool dependencies

### Testing
- Run generated test files immediately
- Verify agent functionality
- Check integration with existing system

## Next Steps

After generating an agent:

1. **Review Generated Files**: Check all generated files for accuracy
2. **Customize Implementation**: Add specific logic and capabilities  
3. **Run Tests**: Execute generated test file
4. **Integration**: Add to main orchestrator
5. **Documentation**: Update agent-specific documentation

The CLI tool provides a solid foundation - customize the generated code to meet specific requirements while maintaining system consistency and patterns. 