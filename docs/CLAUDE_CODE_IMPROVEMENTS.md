# Improvements Inspired by Claude Code

This document outlines improvements to Binharic CLI inspired by the architecture and design principles of Anthropic's Claude Code.

## Key Principles Adopted

### 1. Simplicity First
Following Claude Code's philosophy, we minimize business logic and let the model do the heavy lifting. The codebase focuses on:
- Lightweight shell around the LLM
- Minimal scaffolding and UI clutter
- Letting the model feel as "raw" as possible
- Deleting code when model capabilities improve

### 2. "On Distribution" Technology Stack
We use TypeScript and React (via Ink) because:
- Claude models excel at TypeScript
- The model can effectively build and improve the codebase itself
- Approximately 90% of Binharic is now buildable using Binharic itself

## New Features Implemented

### 1. Output Styles
Location: `src/agent/core/outputStyles.ts`

Inspired by Claude Code's interaction modes, we now support multiple output styles:

- **default**: Standard interaction mode
- **explanatory**: Educational mode that explains WHY choices are made, discusses alternatives, and references best practices
- **learning**: Collaborative mode where the agent breaks tasks into steps and asks users to implement simpler parts themselves
- **concise**: Minimal output focused on getting work done quickly
- **verbose**: Detailed comprehensive explanations and documentation

**Usage in config:**
```json5
{
  "outputStyle": "learning",
  // ... other config
}
```

**Benefits:**
- New users can use "learning" mode to understand code as they work
- Experienced users can use "concise" mode for faster iteration
- Educational contexts benefit from "explanatory" mode

### 2. Enhanced Permissions System
Location: `src/agent/core/permissionsManager.ts`

A multi-tiered permissions system similar to Claude Code:

**Features:**
- Whitelist/blacklist commands and file paths
- Session-based permissions (one-time grants)
- Project-level permissions (stored in `.binharic/permissions.json`)
- Global permissions (stored in `~/.config/binharic/permissions.json`)
- Auto-approve safe read operations
- Pattern matching for flexible rules
- Dangerous command detection

**Permission Levels:**
- `allow`: Execute without prompting
- `deny`: Block the operation
- `prompt`: Ask user for permission

**Example permissions.json:**
```json
{
  "allowedCommands": [
    "npm test",
    "npm run build",
    "git status",
    "git log"
  ],
  "blockedCommands": [
    "rm -rf /",
    "dd if=*"
  ],
  "autoApprove": {
    "readOperations": true,
    "safeCommands": true
  }
}
```

### 3. Visual Progress Tracking (Todo List)
Location: `src/ui/TodoList.tsx`

Visual feedback component showing agent progress through tasks:

**Features:**
- Real-time status updates (pending, in-progress, completed, failed)
- Compact and expanded views
- Shows current step out of total steps
- Animated spinners for active tasks
- Collapsible when not needed

**States:**
- ○ Pending (gray)
- ● In Progress (cyan with spinner)
- ✓ Completed (green)
- ✗ Failed (red)

## Architecture Improvements

### 1. Simplified System Prompt Generation
The system prompt now dynamically incorporates output styles, reducing the need for complex prompting logic.

### 2. Progressive Disclosure
The agent breaks complex tasks into clear steps and executes them one at a time, similar to Claude Code's approach.

### 3. Verification-First Approach
After any state-changing operation, the agent verifies results before proceeding.

## Rapid Prototyping Philosophy

Inspired by Claude Code's development process where they built 20+ prototypes in 2 days:

1. **Use the tool to build itself**: Binharic should be used to improve Binharic
2. **Quick iterations**: Don't be afraid to throw away prototypes
3. **Feel-based development**: If something doesn't feel right, rebuild it
4. **Share early**: Get feedback on prototypes from colleagues/community

## Configuration Enhancements

### Output Style Configuration
Add to your `~/.config/binharic/config.json5`:

```json5
{
  "outputStyle": "explanatory", // or "learning", "concise", "verbose"
  "defaultModel": "your-model",
  // ... rest of config
}
```

### Project-Level Permissions
Create `.binharic/permissions.json` in your project:

```json
{
  "allowedCommands": ["npm *", "git *"],
  "allowedPaths": ["/path/to/project"],
  "autoApprove": {
    "readOperations": true
  }
}
```

## Testing Improvements

Following Claude Code's approach:
- Test the tool using the tool itself
- Focus on integration tests that verify end-to-end behavior
- Keep test organization mirroring source structure

## Future Improvements to Consider

Based on Claude Code's architecture:

1. **Background Tasks**: Similar to Claude Code's background task pill for long-running operations
2. **Interactive Drawer UI**: Sliding panels for additional context
3. **Animated Transitions**: Smooth UI transitions for better UX
4. **Custom Hooks**: Allow users to define shell commands for the agent
5. **Team Settings**: Share configuration across teams
6. **Analytics Dashboard**: Track usage patterns (enterprise feature)

## Design Decisions

### Why These Improvements?

1. **Output Styles**: Different users have different needs - beginners want to learn, experts want speed
2. **Permissions**: Safety without sacrificing flexibility
3. **Visual Progress**: Users need to see what the agent is doing, especially on long-running tasks
4. **Simplicity**: Less code means fewer bugs and easier maintenance

### What We Didn't Adopt

1. **Virtualization/Sandboxing**: Chose simplicity over isolation (same as Claude Code)
2. **Complex Business Logic**: Let the model handle complexity
3. **Heavy UI Framework**: Stick with Ink for terminal-native feel

## Metrics to Track

Similar to Anthropic's approach:
- Pull requests per engineer
- Feature velocity
- Tool usage patterns
- Error rates by output style
- Permission grant/deny rates

## Contributing

When adding features inspired by Claude Code:
1. Start with the simplest possible implementation
2. Test using Binharic itself
3. Get feedback early
4. Be willing to throw away code if it doesn't feel right
5. Document the "why" behind decisions

## References

- [How Claude Code is Built](https://www.pragmaticengineer.com/how-claude-code-is-built/) - The Pragmatic Engineer
- [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) - Anthropic
- [AI SDK Documentation](https://sdk.vercel.ai/docs) - Vercel

## Migration Guide

### Existing Users

No breaking changes. New features are opt-in:

1. **To use output styles**: Add `"outputStyle": "learning"` to your config
2. **To use permissions**: Create a permissions.json file (optional)
3. **Todo lists**: Automatically shown when agent executes multi-step tasks

### New Users

All features work out of the box with sensible defaults.

