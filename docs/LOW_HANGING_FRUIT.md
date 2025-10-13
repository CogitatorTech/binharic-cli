# Low-Hanging Fruit Features for Binharic

Features that can be implemented quickly with high impact, sorted by ease of implementation.

## 🍇 **Easiest (1-2 days each)**

### 1. Basic Git Tools ⭐⭐⭐

**Effort**: 1-2 days
**Impact**: HIGH
**Why Easy**: `simple-git` is already installed, just needs wrapper tools

**Tools to Add**:

```typescript
// src/agent/tools/definitions/git.ts
- git_status() - Show current status
- git_diff(files?) - Show changes
- git_log(count?) - Show commit history
- git_add(files) - Stage files
- git_commit(message) - Commit changes
- git_branch_list() - List branches
- git_branch_current() - Get current branch
```

**Why This Wins**:

- Most requested feature from comparison
- Library already installed (simple-git v3.28.0)
- Basic git wrapper is straightforward
- Closes major gap with Claude immediately

---

### 2. Activate Existing Checkpoint System ⭐⭐

**Effort**: 1 day
**Impact**: MEDIUM
**Why Easy**: System is already fully coded in `src/agent/checkpoints.ts`

**What to Do**:

- Hook checkpoint system into tool execution flow
- Add UI for checkpoint approval (similar to ToolConfirmation)
- Integrate with high-risk file operations

**Files to Modify**:

- `src/agent/state.ts` - Add checkpoint checks before tool execution
- `src/ui/` - Create CheckpointConfirmation component (copy ToolConfirmation pattern)

**Why This Wins**:

- Code already exists, just needs wiring
- Immediate safety improvement
- Unique feature Claude doesn't have

---

### 3. File Diff Tool ⭐

**Effort**: 1 day
**Impact**: MEDIUM
**Why Easy**: Simple wrapper around git or diff command

**Tool to Add**:

```typescript
// Add to existing tools or create new file
diff_files(file1, file2) - Compare two files
diff_show(file) - Show uncommitted changes
```

**Why This Wins**:

- Helps with code review workflows
- Simple implementation
- Works with existing file tracker

---

### 4. Improved Error Messages with Suggestions ⭐

**Effort**: 1 day
**Impact**: MEDIUM
**Why Easy**: Just enhancing existing error handling

**What to Add**:

- Parse common error patterns
- Suggest fixes for TypeScript errors
- Add "did you mean?" for typos
- Link to documentation

**Files to Modify**:

- `src/agent/errorHandling.ts` - Add error pattern matching
- `src/agent/tools/definitions/getErrors.ts` - Add suggestions to output

**Why This Wins**:

- Better UX immediately
- No new dependencies needed
- Differentiator from other tools

---

### 5. Workflow Templates ⭐

**Effort**: 1-2 days
**Impact**: MEDIUM
**Why Easy**: Workflow tool already exists

**Templates to Add**:

```typescript
// In src/agent/tools/definitions/workflow.ts
- "fix-bug": read_file → analyze → edit → test → validate
- "add-feature": create → edit → test → validate
- "refactor": read → analyze → edit multiple → test
- "debug": get_errors → read relevant → fix → validate
```

**Why This Wins**:

- Makes agent smarter without new tools
- Reuses existing capabilities
- Easy to add more templates

---

## 🍊 **Easy (2-3 days each)**

### 6. Command History Search ⭐⭐

**Effort**: 2 days
**Impact**: LOW-MEDIUM
**Why Easy**: History already stored, just add search

**Features**:

- `/history search <term>` - Search command history
- `/history export` - Export to file
- Fuzzy search through past commands

**Files to Modify**:

- `src/agent/state.ts` - Add search methods
- `src/ui/UserInput.tsx` - Add /history command

---

### 7. File Templates ⭐⭐

**Effort**: 2 days
**Impact**: MEDIUM
**Why Easy**: Just predefined content strings

**Templates**:

```typescript
create_from_template(template, filename)
Templates:
- "react-component" - React/TSX component boilerplate
- "test-file" - Vitest test boilerplate
- "api-route" - Express/Next.js route
- "typescript-class" - Class with proper typing
```

**Why This Wins**:

- Speeds up common tasks
- No complex logic needed
- Extensible via config

---

### 8. Multi-File Read ⭐⭐

**Effort**: 2 days
**Impact**: MEDIUM
**Why Easy**: Just batching existing read_file tool

**Tool to Add**:

```typescript
read_multiple_files(paths: string[])
// Returns concatenated content with file separators
```

**Why This Wins**:

- Helps with context gathering
- Reduces tool call overhead
- Simple implementation

---

### 9. Code Snippet Library ⭐

**Effort**: 2-3 days
**Impact**: LOW-MEDIUM
**Why Easy**: Just CRUD operations on snippets

**Features**:

- Save code snippets with tags
- Search and retrieve snippets
- Insert snippets into files
- Store in `~/.config/binharic/snippets.json`

**Tools**:

```typescript
snippet_save(name, code, tags);
snippet_search(query);
snippet_insert(name, file, location);
```

---

### 10. Smart File Listing ⭐

**Effort**: 2 days
**Impact**: LOW-MEDIUM
**Why Easy**: Enhancement of existing list tool

**Improvements to list tool**:

- Filter by extension: `list_files(pattern="*.ts")`
- Show file sizes
- Show last modified dates
- Sort options
- Exclude patterns (node_modules, dist, etc.)

**Files to Modify**:

- `src/agent/tools/definitions/list.ts`

---

## 📊 **Priority Ranking (by ROI)**

| Feature                      | Effort   | Impact  | ROI        | Priority     |
| ---------------------------- | -------- | ------- | ---------- | ------------ |
| 1. Basic Git Tools           | 1-2 days | HIGH    | ⭐⭐⭐⭐⭐ | **DO FIRST** |
| 2. Activate Checkpoints      | 1 day    | MEDIUM  | ⭐⭐⭐⭐⭐ | **DO FIRST** |
| 3. File Diff Tool            | 1 day    | MEDIUM  | ⭐⭐⭐⭐   | High         |
| 4. Error Message Suggestions | 1 day    | MEDIUM  | ⭐⭐⭐⭐   | High         |
| 5. Workflow Templates        | 1-2 days | MEDIUM  | ⭐⭐⭐⭐   | High         |
| 6. Multi-File Read           | 2 days   | MEDIUM  | ⭐⭐⭐     | Medium       |
| 7. File Templates            | 2 days   | MEDIUM  | ⭐⭐⭐     | Medium       |
| 8. Smart File Listing        | 2 days   | LOW-MED | ⭐⭐⭐     | Medium       |
| 9. Command History Search    | 2 days   | LOW-MED | ⭐⭐       | Low          |
| 10. Code Snippet Library     | 2-3 days | LOW-MED | ⭐⭐       | Low          |

## 🎯 **Recommended Sprint (1 Week)**

**Days 1-2**: Basic Git Tools

- Biggest gap closer
- Highest user demand
- Library already installed

**Day 3**: Activate Checkpoint System

- Code already exists
- Safety improvement
- Unique feature

**Days 4-5**: File Diff + Error Suggestions

- Quick wins
- Improves daily workflow
- No new dependencies

This gives you **4 meaningful features in 1 week** that close significant gaps!

## 💡 **Quick Wins Summary**

Total effort for top 5 features: **5-7 days**
Total impact: Closes ~30% of the gap with Claude Agent

These features are:
✅ Already partially implemented (git, checkpoints)
✅ No major new dependencies needed
✅ High user value
✅ Easy to test
✅ Maintain Mechanicus theme

Start with git tools - it's the #1 complaint and easiest to implement!
