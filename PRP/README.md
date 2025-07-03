# PRP (Project Requirements Plan) Templates

## What is a PRP?

A PRP (Project Requirements Plan) is a structured document template designed to provide AI agents with all the necessary context, patterns, and validation steps needed to successfully implement features in a codebase. Think of it as a comprehensive instruction manual that enables AI to write production-ready code.

## Available Templates

### 1. `prp-template.md` (Python)
- Original Python-focused template
- Uses Python tooling (pytest, mypy, ruff, etc.)
- Good example of the structure and principles

### 2. `prp-template-nodejs.md` (Node.js/TypeScript)
- Adapted for Node.js and TypeScript projects
- Specifically tailored for this ChatSG codebase
- Includes both backend (Express) and frontend (React) patterns
- Uses project-specific conventions and tools

## How to Use PRP Templates

1. **Copy the appropriate template** based on your technology stack
2. **Fill in all sections** with specific details about your feature:
   - Replace all `[placeholder]` text with actual requirements
   - Include real file paths and code examples from your project
   - Be explicit about success criteria and validation steps

3. **Provide the filled PRP to an AI agent** along with:
   - Access to the codebase
   - Ability to run commands and tests
   - Clear instructions to follow the PRP

4. **Let the AI iterate** through the validation loops until all tests pass

## Key Principles

1. **Context is King**: More context = better results
2. **Validation Loops**: AI should test and fix iteratively
3. **Pattern Matching**: Use existing codebase patterns
4. **Progressive Enhancement**: Start simple, validate, then add complexity
5. **Explicit Anti-patterns**: Tell AI what NOT to do

## Example Usage

```markdown
# My Feature PRP

## Goal
Add a user profile page that displays user information and allows editing

## Why
- Users need to manage their profile information
- Integrates with existing authentication system
- Solves the problem of users not being able to update their display name

[... continue filling out all sections ...]
```

## Tips for Writing Good PRPs

1. **Be Specific**: Vague requirements lead to incorrect implementations
2. **Include Examples**: Show code patterns from your actual codebase
3. **List All Dependencies**: What packages, APIs, or services are needed?
4. **Define Success**: How will you know when the feature is complete?
5. **Anticipate Issues**: What errors might occur? How should they be handled?

## When to Use PRPs

PRPs are most effective for:
- ✅ New feature development
- ✅ Complex refactoring
- ✅ Integration of third-party services
- ✅ Creating new API endpoints
- ✅ Building new UI components

PRPs are less useful for:
- ❌ Simple bug fixes
- ❌ Minor text changes
- ❌ Configuration updates
- ❌ One-line code changes

## Contributing

If you create a new template for a different technology stack or improve existing templates, please:
1. Follow the same structure and principles
2. Include technology-specific patterns and tools
3. Test the template with an actual AI implementation
4. Add it to this README 