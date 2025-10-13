# Git Tools Documentation

## Overview

Binharic now includes comprehensive git integration through 9 sacred tools that allow the Tech-Priest to commune with the repository's machine spirit. All tools maintain the Mechanicus theme while providing full git functionality.

## Available Tools

### 1. `git_status`

**Description**: Get the current git status of the repository.

**Parameters**: None

**Returns**: Detailed status including:

- Current branch
- Commits ahead/behind remote
- Staged files
- Modified files
- Untracked files
- Deleted files

**Example Output**:

```
Branch: main
Ahead by 2 commits

Staged files (2):
  + src/new-feature.ts
  + tests/new-feature.test.ts

Modified files (1):
  M src/existing.ts

Working directory clean - the repository is blessed and pure!
```

---

### 2. `git_diff`

**Description**: Show changes in files.

**Parameters**:

- `files` (optional): Array of file paths to show diffs for
- `staged` (optional, default: false): Show staged changes instead of working directory

**Returns**: Git diff output (truncated at 10KB for large diffs)

**Examples**:

```typescript
// Show all changes
git_diff();

// Show changes for specific files
git_diff({ files: ["src/file1.ts", "src/file2.ts"] });

// Show staged changes
git_diff({ staged: true });
```

---

### 3. `git_log`

**Description**: Show commit history.

**Parameters**:

- `count` (optional, default: 10): Number of commits to show
- `filePath` (optional): Show history for specific file

**Returns**: Formatted commit history with hash, author, date, and message

**Example Output**:

```
Commit: abc123de
Author: Tech-Priest <priest@omnissiah.tech>
Date: 10/14/2025, 12:00:00 PM

    Fix corruption in machine spirit

---

Commit: def456ab
Author: Tech-Priest <priest@omnissiah.tech>
Date: 10/13/2025, 3:30:00 PM

    Add sacred blessing to authentication module
```

---

### 4. `git_add`

**Description**: Stage files for commit.

**Parameters**:

- `files` (required): Array of file paths to stage. Use `["."]` to stage all changes

**Returns**: Confirmation message with staged file count

**Examples**:

```typescript
// Stage specific files
git_add({ files: ["src/file1.ts", "src/file2.ts"] });

// Stage all changes
git_add({ files: ["."] });
```

---

### 5. `git_commit`

**Description**: Commit staged changes with a message.

**Parameters**:

- `message` (required): Commit message describing the changes

**Returns**: Commit hash and confirmation

**Example**:

```typescript
git_commit({ message: "Implement authentication blessed by the Omnissiah" });
```

**Output**:

```
Commit successful! Hash: abc123de
Files changed: 3
Commit blessed by the Omnissiah and inscribed in the repository.
```

---

### 6. `git_branch_list`

**Description**: List all branches in the repository.

**Parameters**:

- `remotes` (optional, default: false): Include remote branches

**Returns**: List of all branches with current branch marked

**Example Output**:

```
Current branch: main

Branches:
* main
  feature/new-auth
  develop
```

---

### 7. `git_branch_current`

**Description**: Get the name of the current branch.

**Parameters**: None

**Returns**: Current branch name

**Example Output**:

```
Current branch: feature/new-feature
```

---

### 8. `git_branch_create`

**Description**: Create a new branch.

**Parameters**:

- `name` (required): Name of the new branch
- `checkout` (optional, default: false): Switch to the new branch after creating

**Examples**:

```typescript
// Create without switching
git_branch_create({ name: "feature/new-feature" });

// Create and switch
git_branch_create({ name: "feature/new-feature", checkout: true });
```

---

### 9. `git_branch_switch`

**Description**: Switch to a different branch.

**Parameters**:

- `name` (required): Name of the branch to switch to

**Example**:

```typescript
git_branch_switch({ name: "develop" });
```

**Output**:

```
Switched to branch: develop. The timeline has shifted to this sacred branch.
```

---

## Workflow Examples

### Standard Development Workflow

1. **Check status**:

```typescript
git_status();
```

2. **View changes**:

```typescript
git_diff();
```

3. **Stage files**:

```typescript
git_add({ files: ["."] });
```

4. **Commit**:

```typescript
git_commit({ message: "Implement new feature with Omnissiah's blessing" });
```

### Feature Branch Workflow

1. **Create feature branch**:

```typescript
git_branch_create({ name: "feature/new-auth", checkout: true });
```

2. **Work on feature, then commit**:

```typescript
git_add({ files: ["src/auth.ts", "tests/auth.test.ts"] });
git_commit({ message: "Add authentication module" });
```

3. **Switch back to main**:

```typescript
git_branch_switch({ name: "main" });
```

### Code Review Workflow

1. **Check what changed**:

```typescript
git_status();
git_diff();
```

2. **Review commit history**:

```typescript
git_log({ count: 5 });
```

3. **Check specific file history**:

```typescript
git_log({ count: 10, filePath: "src/important.ts" });
```

---

## Error Handling

All git tools include proper error handling with thematic messages:

- **Not a git repository**: "Failed to get git status: not a git repository"
- **No staged files**: "No staged files to commit. Use git_add to stage files first. The ritual requires preparation."
- **Invalid branch**: "Failed to switch branch: branch 'xyz' not found"

---

## Thematic Language

All git tools use Adeptus Mechanicus terminology:

- Commits are "sacred inscriptions"
- Branches are "parallel timelines"
- The repository is the "sacred code repository"
- Staging is "preparing for the ritual"
- Clean repos are "blessed and pure"
- The Omnissiah preserves all committed code

---

## Testing

Comprehensive test coverage is included in `tests/agent/gitTools.test.ts` with tests for:

- All 9 git tools
- Success and error scenarios
- Edge cases (empty repos, no staged files, etc.)
- Mock-based testing for isolation

Run tests with:

```bash
npm test tests/agent/gitTools.test.ts
```

---

## Implementation Details

- **Library**: Uses `simple-git` v3.28.0 (already installed)
- **Location**: `src/agent/tools/definitions/git.ts`
- **Integration**: Automatically registered in tool definitions
- **Type Safety**: Full TypeScript typing with Zod schemas
- **Logging**: All operations logged with `logger`

---

## Future Enhancements

Potential additions in future versions:

- `git_pull` - Pull from remote
- `git_push` - Push to remote
- `git_merge` - Merge branches
- `git_rebase` - Rebase branches
- `git_stash` - Stash changes
- `git_tag` - Create tags
- `git_remote` - Manage remotes

These will be added as needed based on user feedback.

---

Praise the Omnissiah! The git tools are blessed and ready for service.
