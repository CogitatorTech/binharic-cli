## Feature Roadmap

This document outlines the roadmap for the Binharic coding agent.
It includes planned features, improvements, and their current implementation status.

> [!IMPORTANT]
> This roadmap is a work in progress and is subject to change without notice.

### 1. Core Agentic Capabilities

- **LLM Provider Support**
    - [x] OpenAI models (GPT-4o, GPT-4o-mini, and GPT-5 series)
    - [x] Anthropic models (Claude 4 Sonnet and Claude 4.5 Sonnet)
    - [x] Google AI models (Gemini 2.5 Pro and Gemini 2.5 Flash)
    - [x] Ollama for local model execution
    - [ ] Support for Azure OpenAI endpoints
    - [ ] Support for additional model providers (Cohere and Mistral)
- **Context Management**
    - [x] Token-based context window management
    - [x] Automatic context trimming for long conversations
    - [x] History preservation across sessions
    - [ ] Adaptive context management with prepareStep callbacks
    - [x] Tool result summarization for longer agentic loops
    - [ ] Intelligent context compression
    - [ ] Semantic context pruning
- **Multi-Step Execution**
    - [x] Multi-step tool calling with retry logic
    - [x] Transient error handling with exponential backoff
    - [x] Tool execution confirmation flow
    - [ ] AI SDK 5 Agent class integration (currently using AI SDK streaming plus tool calling directly)
    - [ ] Automatic loop control with stopWhen conditions
    - [ ] Budget-based stopping conditions
    - [x] Error threshold conditions
    - [ ] Validation-based stopping
    - [x] Completion detection conditions
    - [ ] Parallel tool execution for independent operations
    - [ ] Automatic tool dependency resolution
- **Specialized Agents**
    - [x] Main Binharic Agent (Tech-Priest persona)
    - [x] Code Analysis Agent
    - [x] Security Audit Agent
    - [x] Test Generation Agent
    - [x] Documentation Agent
    - [x] Refactoring Agent
    - [ ] Debug Agent
    - [ ] Performance Optimization Agent
    - [ ] Migration Agent

### 2. Tool System

- **File Operations**
    - [x] Read files with tracking
    - [x] Create new files
    - [x] Smart file editing with diff application
    - [x] List directory contents
    - [x] File search capabilities
    - [x] Integrated with AI SDK tool calling
    - [x] Automatic file tracking for edits (no manual read required)
    - [x] File staleness detection
    - [x] Memory-efficient file tracking (1000 file limit)
    - [x] File comparison and diffing
    - [ ] Bulk file operations
    - [ ] File watching for changes
- **Code Intelligence**
    - [x] TypeScript/JavaScript error detection
    - [x] Syntax validation
    - [x] AI-powered code analysis
    - [x] Structured refactoring suggestion
    - [x] Automatic test generation
    - [x] Security vulnerability detection
    - [ ] Code navigation (go to definition, find references)
    - [ ] Code formatting integration
    - [ ] Linting integration
- **Shell Integration**
    - [x] Bash command execution
    - [x] Terminal session management with persistent state
    - [x] Command timeout handling
    - [ ] Interactive shell support
    - [ ] Command history and replay
    - [ ] Environment variable management
- **Web and Network**
    - [x] URL fetching with HTML-to-text conversion
    - [x] Content markup stripping
    - [ ] API integration templates
    - [ ] Web scraping capabilities
    - [ ] Webhook support
- **Model Context Protocol (MCP)**
    - [x] MCP server integration
    - [x] Dynamic tool discovery
    - [x] Stdio transport support
    - [ ] HTTP transport support
    - [ ] MCP tool caching
    - [ ] Custom MCP server templates

### 3. User Interface

- **Terminal UI (TUI)**
    - [x] Rich terminal interface with Ink
    - [x] Real-time streaming responses
    - [x] Tool execution confirmation prompts
    - [x] Command history navigation (up/down arrows)
    - [x] Help menu
    - [x] File search with @ mention
    - [x] Non-blocking UI during LLM responses
    - [x] Command syntax highlighting (partial match in yellow, full match in cyan)
    - [x] Colored help menu items\*\*
    - [x] Clean message display (no "Binharic:" prefix)
    - [x] Dynamic username from system (not hardcoded)
    - [x] Tool results hidden from UI (only failures shown)
    - [x] Git branch display in footer
    - [ ] Syntax highlighting for code blocks
    - [ ] Multi-pane view for side-by-side comparison
    - [ ] Terminal themes support
- **User Experience**
    - [x] Graceful error handling
    - [x] Status indicators (idle, responding, tool-request, executing-tool, and error)
    - [x] Git branch display
    - [x] Responsive input field (non-blocking)
    - [x] Clear error messages for tool failures
    - [ ] Progress bars for long operations
    - [ ] Notification system
    - [ ] Undo/redo for file operations
    - [ ] Session saving and loading

### 4. Configuration and Customization

- **Configuration Management**
    - [x] JSON5 configuration format
    - [x] Model configuration with context windows
    - [x] Custom system prompts
    - [x] API key management
    - [x] History size limits
    - [ ] Configuration profiles (development, production, etc.)
    - [x] Configuration validation with detailed error messages
    - [ ] Hot-reload configuration changes
- **Personality and Behavior**
    - [x] Adeptus Mechanicus character and terminology
    - [x] Customizable system prompts
    - [ ] Multiple personality presets
    - [ ] Conversation style customization
    - [ ] Output verbosity levels

### 5. Performance and Reliability

- **Error Handling**
    - [x] Categorized errors (Fatal, Transient, Tool)
    - [x] Automatic retry with backoff for transient errors
    - [x] Error logging with Winston
    - [x] Graceful degradation
    - [x] Agent-level error handling
    - [x] Tool call ID tracking and validation (AI SDK 5)
    - [x] History rollback on errors
    - [x] Stream timeout protection (2 minutes)
    - [x] Tool execution timeout protection (10 seconds for autofix)
    - [ ] Error recovery suggestions
    - [ ] Automatic error reporting (opt-in)
- **Optimization**
    - [x] Efficient token counting
    - [x] Context window optimization
    - [x] Agent-based loop optimization
    - [x] Specialized agents for specific tasks
    - [x] Proper AI SDK 5 streamText result handling
    - [x] Tool arguments extraction for both static and dynamic tools
    - [ ] Response caching
    - [ ] Request batching
    - [ ] Streaming optimizations
- **Monitoring**
    - [x] Structured logging
    - [x] Provider availability checks
    - [x] Detailed tool execution logging
    - [x] Autofix attempt tracking
    - [ ] Performance metrics collection
    - [ ] Usage analytics (tokens, costs)
    - [ ] Health checks and diagnostics

### 6. Testing and Quality

- **Test Coverage**
    - [x] Unit tests for core functionality
    - [x] Tool execution tests
    - [x] Error handling tests
    - [x] State management tests
    - [x] UI component tests
    - [x] Comprehensive tool call ID mismatch and history rollback tests
    - [x] Extensive overall test suite (hundreds of passing tests)
    - [ ] Integration tests
    - [ ] End-to-end tests
    - [ ] Performance benchmarks
- **Code Quality**
    - [x] TypeScript strict mode
    - [x] ESLint configuration
    - [x] Prettier formatting
    - [x] Pre-commit hooks
    - [x] Comprehensive error typing
    - [ ] Automated dependency updates
    - [ ] Security scanning
    - [ ] Code complexity metrics

### 7. Documentation

- **User Documentation**
    - [x] README with basic usage
    - [x] API key setup instructions
    - [x] Contributing guidelines
    - [ ] Comprehensive user guide
    - [ ] Video tutorials
    - [ ] FAQ section
- **Developer Documentation**
    - [x] Code of conduct
    - [x] Architecture documentation
    - [x] Bug fix documentation
    - [ ] API reference documentation
    - [ ] Plugin development guide
    - [ ] Deployment guide

### 8. Distribution and Deployment

- **Package Management**
    - [x] NPM package structure
    - [x] TypeScript compilation
    - [ ] NPM registry publication
    - [ ] Semantic versioning
    - [ ] Release automation
- **Installation Methods**
    - [ ] Homebrew formula (macOS)
    - [ ] Snap package (Linux)
    - [ ] Chocolatey package (Windows)
    - [ ] Docker image
    - [ ] Standalone binary releases
- **Cloud and Remote**
    - [ ] Remote execution support
    - [ ] Multi-user deployments
    - [ ] Cloud provider integrations

### 9. Advanced Features

- **Agentic Capabilities**
    - [x] Autonomous task execution
    - [x] Tool chaining
    - [x] File tracking for safe edits
    - [ ] AI SDK 5 Agent class for reusable configurations
    - [x] Multi-step tool execution with automatic loop control
    - [x] Specialized agents with distinct personalities
    - [ ] onStepFinish callbacks for monitoring
    - [ ] prepareStep callbacks for dynamic configuration\*\*
    - [ ] Multiple stopping conditions (step count, budget, errors, validation, completion)
    - [ ] Goal-oriented planning
    - [ ] Task decomposition
    - [ ] Long-term memory
    - [ ] Agent composition (combining multiple agents)
    - [ ] Dynamic agent selection
- **Collaboration**
    - [ ] Team workspaces
    - [ ] Shared conversation history
    - [ ] Code review assistance
    - [ ] Pull request analysis
    - [ ] Multi-agent collaboration
- **Extensions and Plugins**
    - [ ] Plugin system architecture
    - [ ] Custom tool registration
    - [ ] Language-specific plugins
    - [ ] Framework-specific assistants
    - [ ] Custom agent templates

### 10. Security and Privacy

- **Security**
    - [x] API key environment variable support
    - [x] Secure credential storage
    - [ ] Encrypted configuration files
    - [ ] Sandboxed tool execution
    - [ ] Rate limiting
- **Privacy**
    - [x] Local execution option (Ollama)
    - [x] Conversation history stored locally
    - [ ] Data anonymization options
    - [ ] GDPR compliance
    - [ ] Audit logging
