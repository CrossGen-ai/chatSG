## Theme Support
- The app supports 5 themes: Light, Dark, Blue, Emerald, Rose.
- Theme selection is persisted in localStorage.
- All UI components must support all themes using Tailwind and theme classes.
- Use the ThemeSwitcher component for theme selection.

## Webhook Chat Flow
- Frontend sends user messages to /api/chat (POST).
- Backend proxies the request to the webhook URL from the WEBHOOK_URL env variable.
- The webhook returns a JSON object with an 'output' field, which is displayed as the bot reply.
- All errors must be handled gracefully and shown to the user as bot messages. 