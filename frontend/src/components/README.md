# ChatSG Frontend Components

This directory contains all React components for the ChatSG application. Each component is designed with glassmorphism aesthetics and follows a modular, reusable pattern.

## Component Overview

### Core Chat Components

#### ChatUI.tsx
The main chat interface component that displays the conversation.

**Features:**
- Message display with user/bot differentiation
- Real-time typing indicators
- Progressive message loading with skeleton states
- Agent avatar display with dynamic agent indicators
- Cross-session memory status display
- Message timestamps and sync status
- Smooth animations for new messages
- Responsive layout with Tailwind CSS

**Props:**
- `sessionId?: string` - The current chat session ID

**Key Functionality:**
- Loads messages progressively from backend
- Handles sending new messages
- Displays loading states and errors
- Auto-scrolls to latest message
- Shows agent-specific avatars and indicators

#### ChatSidebar.tsx
The left sidebar showing chat history and session management.

**Features:**
- List of all chat sessions
- New chat creation button
- Chat deletion with confirmation
- Active chat highlighting
- Message count display
- Blue dot notification for unread messages
- Agent type indicators
- Search/filter functionality (planned)
- Last message preview

**Key Functionality:**
- Fetches chat list from backend
- Manages chat switching
- Handles chat creation/deletion
- Shows loading states during operations
- Displays agent history for each chat
- Shows blue dot for chats with new messages

### UI Control Components

#### ChatSettingsToggles.tsx
Container for chat-specific settings toggles.

**Features:**
- Cross-session memory toggle
- Agent lock toggle
- Grouped toggle layout
- Loading states during updates

**Usage:**
```tsx
<ChatSettingsToggles className="flex items-center space-x-2" />
```

**Managed Settings:**
- `crossSessionMemory`: Share context across chat sessions
- `agentLock`: Lock conversation to current agent

#### ChatToggle.tsx
Reusable toggle button component with glassmorphism styling.

**Props:**
- `label: string` - Primary label text
- `description?: string` - Secondary description text
- `icon: string` - Emoji or icon to display
- `enabled: boolean` - Toggle state
- `loading?: boolean` - Loading state
- `onChange: (enabled: boolean) => void` - Change handler
- `className?: string` - Additional CSS classes

**Features:**
- Animated state transitions
- Loading state support
- Accessible button implementation
- Glassmorphism design with backdrop blur
- Hover and active states

#### ThemeSwitcher.tsx
Theme selection component with multiple color schemes.

**Available Themes:**
- Light ( ) - Default light theme
- Dark (<) - Dark mode
- Blue (=�) - Blue accent theme
- Emerald (=�) - Green accent theme
- Rose (<9) - Pink accent theme

**Features:**
- Dropdown theme selector
- Theme persistence in localStorage
- Smooth theme transitions
- Preview gradients for each theme
- Click-outside-to-close functionality

### Loading & Skeleton Components

#### SkeletonLoader.tsx
Versatile skeleton loading component for different UI elements.

**Variants:**
- `message` - Chat message skeleton
- `chat-list-item` - Sidebar chat item skeleton
- `settings-toggle` - Settings toggle skeleton
- `text` - Generic text skeleton
- `avatar` - Avatar placeholder skeleton

**Props:**
- `variant?: SkeletonVariant` - Type of skeleton to render
- `className?: string` - Additional CSS classes
- `count?: number` - Number of skeletons to render

**Usage Examples:**
```tsx
// Loading messages
<SkeletonLoader variant="message" count={3} />

// Loading chat list
<SkeletonLoader variant="chat-list-item" count={5} />

// Loading settings
<SkeletonLoader variant="settings-toggle" count={2} />
```

## Key Features

### Blue Dot Notification System

The blue dot notification feature shows when a chat receives a response while the user is viewing a different chat.

**How it works:**
1. When a message arrives for a non-active chat, a blue pulsing dot appears next to the message count
2. The dot is cleared when the user clicks on that chat
3. The state persists across browser sessions via backend storage

**Implementation Details:**

**Backend Integration:**
- Backend tracks `unreadCount` and `lastReadAt` for each session
- When a response arrives, backend checks if it's for the active session
- Only increments unread count for background (non-active) sessions

**Frontend State Management:**
- Uses `hasNewMessages` boolean flag in chat state
- `markChatNewMessage` function handles the state update
- Passes current `activeChatId` to avoid React closure issues

**Race Condition Prevention:**
- Uses `activeChatIdRef` to track the current active chat in async operations
- Critical for handling responses that arrive after user switches chats
- Prevents messages from being marked as "new" for the chat you're currently viewing

**Visual Design:**
```jsx
// Blue dot appears next to message count
{chat.hasNewMessages && (
  <span className="ml-2 inline-block w-3 h-3 bg-blue-500 rounded-full animate-pulse border border-white"></span>
)}
```

**Key Variables:**
- `activeChatId` - The currently active chat (state variable)
- `activeChatIdRef` - Ref to get current value in async callbacks
- `hasNewMessages` - Boolean flag for showing the blue dot
- `unreadCount` - Number of unread messages (tracked by backend)

### Advanced Scrolling System

The chat UI implements a sophisticated scrolling system that provides smooth, intuitive behavior across different scenarios.

**Key Features:**
1. **Instant Bottom Position on Chat Switch**
   - No visible jump from top to bottom
   - Messages start hidden with `opacity: 0`
   - Scroll position set before content becomes visible
   - Smooth fade-in after scroll is positioned

2. **Progressive Message Loading**
   - Initially displays only the last 50 messages
   - "Load earlier messages" button for longer chats
   - Prevents rendering thousands of messages at once
   - Maintains scroll position when loading more

3. **Smart Auto-Scroll for New Messages**
   - Always scrolls when user sends a message
   - Auto-scrolls if user is near bottom (within 200px)
   - Smooth animation for new message arrival
   - Respects user's reading position if scrolled up

4. **Typing Indicator Behavior**
   - Automatically scrolls to show typing indicator
   - Smooth transition when indicator appears
   - Maintains position when response arrives

**Implementation Details:**

**Key State Variables:**
```tsx
const [isScrollReady, setIsScrollReady] = useState(false); // Controls visibility
const [isInitialLoad, setIsInitialLoad] = useState(true);  // Prevents animations
const [wasLoading, setWasLoading] = useState(false);       // Tracks typing state
```

**Chat Switch Behavior:**
```tsx
// 1. Hide content and reset scroll
setIsScrollReady(false);
messagesContainerRef.current.scrollTop = 0;

// 2. Load messages
const messages = await loadMessages();

// 3. Set scroll after DOM update
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight;
    setIsScrollReady(true); // Show content
  });
});
```

**Container Key Reset:**
```tsx
<div 
  key={effectiveActiveChatId} // Forces React to recreate element
  ref={messagesContainerRef}
  className={clsx(
    "flex-1 overflow-y-auto",
    isScrollReady ? "opacity-100" : "opacity-0 pointer-events-none"
  )}
/>
```

**Auto-Scroll Logic:**
```tsx
// Only auto-scroll if:
// 1. User just sent a message (last message is from user)
// 2. User is near the bottom of the chat
if (isAtBottom || messages[messages.length - 1]?.sender === 'user') {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}
```

**Performance Optimizations:**
1. **Memoized Components**: `MessageItem` wrapped with `React.memo`
2. **No Staggered Animations**: Removed delays on chat switch
3. **Conditional Animations**: Only animate truly new messages
4. **Reduced Re-renders**: Strategic useEffect dependencies

**Scroll Behavior Modes:**
- `scrollBehavior: 'auto'` - Instant scroll on chat switch
- `scrollBehavior: 'smooth'` - Smooth scroll for new messages

**Future Enhancements:**
- Will integrate seamlessly with streaming responses
- Streaming will maintain scroll at bottom as content arrives
- No changes needed to current implementation

## Component Architecture

### Design Patterns

1. **Glassmorphism Design**
   - All components use backdrop-blur effects
   - Semi-transparent backgrounds with borders
   - Consistent shadow and hover states

2. **Responsive Design**
   - Mobile-first approach
   - Flexible layouts using Flexbox/Grid
   - Adaptive text sizes and spacing

3. **State Management**
   - Components use custom hooks for state
   - Context providers for global state
   - Optimistic updates for better UX

4. **Animation**
   - Smooth transitions using Tailwind
   - Entrance animations for new content
   - Loading states with skeletons

### Styling Approach

Components use a combination of:
- **Tailwind CSS** for utility classes
- **clsx** for conditional class names
- **CSS-in-JS** for dynamic styles (theme colors)

Example styling pattern:
```tsx
className={clsx(
  'base-classes',
  condition && 'conditional-classes',
  customClassName
)}
```

### Performance Considerations

1. **Memoization**
   - Components use React.memo where appropriate
   - Callbacks are wrapped in useCallback
   - Heavy computations use useMemo

2. **Lazy Loading**
   - Messages load progressively
   - Skeleton loaders prevent layout shift
   - Images load on demand

3. **Optimistic Updates**
   - UI updates immediately on user action
   - Rollback on error
   - Background sync with server

4. **Scroll Performance**
   - Progressive message loading (50 messages initially)
   - Memoized message components
   - Double requestAnimationFrame for reliable positioning
   - Debounced scroll event handlers

## Component Dependencies

### External Libraries
- **React 18**: Component framework
- **clsx**: Conditional className utility
- **Tailwind CSS**: Utility-first CSS framework
- **axios**: HTTP client (used in API layer)

### Internal Dependencies
- **Hooks**: Custom hooks in `/hooks` directory
- **API**: API functions in `/api` directory
- **Types**: TypeScript types in `/types` directory
- **Services**: Utility services in `/services` directory

## Future Components (Planned)

1. **MessageInput.tsx**
   - Enhanced input with file attachments
   - Voice input support
   - Markdown preview

2. **AgentSelector.tsx**
   - Manual agent selection dropdown
   - Agent capabilities display

3. **ChatExport.tsx**
   - Export chat as PDF/Markdown
   - Share functionality

4. **ChatSearch.tsx**
   - Search within current chat
   - Global search across all chats

5. **UserProfile.tsx**
   - User settings and preferences
   - Account management

## Development Guidelines

### Creating New Components

1. **File Structure**
   ```tsx
   import React from 'react';
   import clsx from 'clsx';
   
   interface ComponentProps {
     // Props definition
   }
   
   export const Component: React.FC<ComponentProps> = ({ 
     // Props destructuring
   }) => {
     // Component logic
     
     return (
       // JSX with Tailwind classes
     );
   };
   ```

2. **Naming Conventions**
   - Components: PascalCase (e.g., `ChatUI.tsx`)
   - Props interfaces: ComponentNameProps
   - Event handlers: handleEventName
   - Boolean props: isLoading, hasError, etc.

3. **Testing**
   - Write tests for complex logic
   - Test accessibility features
   - Verify responsive behavior

### Best Practices

1. **Accessibility**
   - Use semantic HTML elements
   - Include ARIA labels where needed
   - Ensure keyboard navigation works
   - Test with screen readers

2. **Error Handling**
   - Display user-friendly error messages
   - Provide retry mechanisms
   - Log errors for debugging

3. **Loading States**
   - Always show loading indicators
   - Use skeleton loaders for better UX
   - Prevent multiple simultaneous requests

4. **Code Quality**
   - Keep components focused and small
   - Extract reusable logic to hooks
   - Document complex logic with comments
   - Use TypeScript for type safety