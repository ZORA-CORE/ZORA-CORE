# ZORA CORE - Frontend Command Palette v1

**Command Palette v1** | Frontend Feature

This document describes the Command Palette implementation for ZORA CORE, providing keyboard-driven navigation and quick actions across the Nordic Climate OS.

## Overview

The Command Palette is a global keyboard-accessible interface that allows users to quickly navigate, trigger actions, and interact with Nordic agents. It is inspired by modern developer tools and provides a fast, efficient way to interact with ZORA CORE.

## Activation

The Command Palette can be opened using:

- **Mac**: `Cmd + K`
- **Windows/Linux**: `Ctrl + K`

The palette is available across the entire application when the user is logged in.

## Command Categories

Commands are organized into three categories:

### 1. Navigation Commands

Navigate to any page in the ZORA OS:

| Command | Description | Route |
|---------|-------------|-------|
| Go to Desk | Your climate-first command center | `/dashboard` |
| Go to Climate OS | Track your climate impact and missions | `/climate` |
| Go to GOES GREEN | Sustainable energy and green initiatives | `/goes-green` |
| Go to ZORA SHOP | Climate-positive products and mashups | `/zora-shop` |
| Go to Foundation | Climate projects and contributions | `/foundation` |
| Go to Academy | Learn about climate action | `/academy` |
| Go to Agents | View Nordic AI agents | `/agents` |
| Open Dev/Agent Console | System stats, agent activity, and knowledge overview | `/agents/dev-console` |

### 2. Quick Action Commands

Trigger common actions quickly:

| Command | Description | Action |
|---------|-------------|--------|
| Create climate mission | Add a new climate mission to your profile | Navigate to `/climate?action=create-mission` |
| Create GOES GREEN action | Add a new green energy action | Navigate to `/goes-green?action=create` |
| Create foundation project | Start a new foundation project | Navigate to `/foundation?action=create` |
| Create product (ZORA SHOP) | Add a new climate-positive product | Navigate to `/zora-shop?action=create` |
| Open my weekly climate plan | View and manage your weekly climate goals | Navigate to `/climate?view=weekly-plan` |

### 3. Agent Query Commands

Interact with Nordic agents:

| Command | Description | Agent |
|---------|-------------|-------|
| Ask ODIN about my climate strategy | Get strategic climate insights | ODIN |
| Ask FREYA for sustainable campaign ideas | Get storytelling and growth suggestions | FREYA |
| Ask THOR for technical/system status | Get backend and infrastructure insights | THOR |
| Ask HEIMDALL for system health overview | Get observability and monitoring insights | HEIMDALL |
| Ask BALDUR for product design ideas | Get UX and product suggestions | BALDUR |
| Ask TYR for climate integrity check | Verify climate claims and ethics | TYR |
| Ask EIVOR about knowledge history | Search memory and knowledge base | EIVOR |

## Architecture

### Components

The Command Palette consists of two main components:

1. **CommandPalette.tsx** - The UI component that renders the palette overlay
2. **CommandPaletteProvider.tsx** - The context provider that manages state and commands

### File Structure

```
frontend/src/components/
├── CommandPalette.tsx           # UI component
├── CommandPaletteProvider.tsx   # Context provider with commands
```

### Integration

The Command Palette is integrated at the root layout level:

```tsx
// frontend/src/app/layout.tsx
import { CommandPaletteProvider } from "@/components/CommandPaletteProvider";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CommandPaletteProvider>
            {children}
          </CommandPaletteProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

## Adding New Commands

To add new commands, update the `commands` array in `CommandPaletteProvider.tsx`:

```tsx
const commands: Command[] = useMemo(() => {
  const navCommands: Command[] = [
    {
      id: 'nav-new-page',           // Unique identifier
      label: 'Go to New Page',       // Display label
      category: 'navigation',        // Category: 'navigation' | 'action' | 'agent'
      description: 'Description',    // Optional description
      icon: <SomeIcon />,            // Optional icon component
      action: () => navigateTo('/new-page'),  // Action to execute
    },
    // ... more commands
  ];
  
  return [...navCommands, ...actionCommands, ...agentCommands];
}, [navigateTo, isAuthenticated]);
```

### Command Interface

```typescript
interface Command {
  id: string;                    // Unique identifier
  label: string;                 // Display label (searchable)
  category: CommandCategory;     // 'navigation' | 'action' | 'agent'
  description?: string;          // Optional description (searchable)
  icon?: React.ReactNode;        // Optional icon
  shortcut?: string;             // Optional keyboard shortcut hint
  action: () => void;            // Function to execute
}
```

## Keyboard Navigation

Inside the Command Palette:

| Key | Action |
|-----|--------|
| `↑` / `↓` | Navigate through commands |
| `Enter` | Execute selected command |
| `Escape` | Close the palette |
| Type | Filter commands by label/description |

## Styling

The Command Palette follows the Nordic design system:

- Uses CSS variables for theming (`--card-bg`, `--card-border`, `--primary`, etc.)
- Subtle backdrop blur overlay
- Clean, minimal design with clear grouping
- Keyboard hints for navigation

## Future Enhancements

Potential improvements for future iterations:

1. **Recent Commands** - Show recently used commands at the top
2. **Fuzzy Search** - Implement fuzzy matching for better search
3. **Custom Shortcuts** - Allow users to define custom keyboard shortcuts
4. **Command History** - Track and display command usage history
5. **Contextual Commands** - Show different commands based on current page
6. **Voice Commands** - Integration with voice input for accessibility

## Related Documentation

- [FRONTEND_DEV_CONSOLE_V1.md](./FRONTEND_DEV_CONSOLE_V1.md) - Dev/Agent Console documentation
- [AUTH_SYSTEM_V2.md](./AUTH_SYSTEM_V2.md) - Authentication system
- [AGENT_RUNTIME_V1.md](./AGENT_RUNTIME_V1.md) - Agent runtime documentation
