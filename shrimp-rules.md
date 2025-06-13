# Development Guidelines

## Project Structure
- Frontend: React app using Vite, Tailwind CSS, and chadcn UI (in /frontend)
- Backend: Node.js server (server.js)
- No static HTML UI in project root
- All new UI code must be in React components

## Directory Layout
- /frontend: React app source
  - /src/components: All UI components (ChatUI, ThemeSwitcher, etc.)
  - /src/api: API utilities (chat.ts)
- /shrimp-rules.md: Project standards
- /server.js: Node.js backend

## Code Style & Naming
- Use TypeScript for all React code
- Use camelCase for variables, functions, and component names
- Use PascalCase for React component files
- Use kebab-case for CSS class names (via Tailwind)
- All code must be commented for clarity

## UI & Component Standards
- Use chadcn UI and Tailwind CSS for all UI
- All UI must be responsive and accessible
- Use Tailwind utility classes for layout, spacing, and color
- Use chadcn UI for chat bubbles, inputs, and controls
- No direct DOM manipulation; use React state and props

## Theme & Animation
- Support 5 themes: Light, Dark, Blue, Emerald, Rose
- Use ThemeSwitcher component for theme selection
- Persist theme in localStorage
- All UI components must support all themes using Tailwind and theme classes
- Use Tailwind transitions and animations for message entry/exit

## Webhook Chat Flow
- Frontend sends user messages to /api/chat (POST)
- Backend proxies the request to the webhook URL from the WEBHOOK_URL env variable
- Webhook returns a JSON object with an 'output' field, which is displayed as the bot reply
- All errors must be handled gracefully and shown to the user as bot messages

## Prohibited Actions
- Do not add static HTML files to the project root
- Do not use inline styles; use Tailwind and chadcn only
- Do not bypass the backend for chat logic
- Do not hardcode webhook URLs; always use the env variable

## Example: Adding a New UI Feature
- Create a new React component in /src/components
- Use Tailwind and chadcn for all styling and UI
- Ensure the component supports all themes
- Document the feature and update shrimp-rules.md if new standards are needed 