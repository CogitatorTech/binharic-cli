# Workflow Templates Documentation

**Last Updated**: October 14, 2025

## Overview

Binharic includes 12 comprehensive workflow templates that guide you through complex multi-step tasks. Each workflow provides detailed, phase-by-phase instructions in the sacred Mechanicus style.

---

## 🎯 Quick Reference

| Workflow               | Purpose                       | Best For                   | Complexity |
| ---------------------- | ----------------------------- | -------------------------- | ---------- |
| `code-review`          | Comprehensive code inspection | PR reviews, quality audits | ⭐⭐⭐⭐   |
| `security-audit`       | Find vulnerabilities          | Security assessments       | ⭐⭐⭐⭐⭐ |
| `performance-optimize` | Speed up code                 | Performance issues         | ⭐⭐⭐⭐   |
| `test-coverage`        | Improve test coverage         | Reaching coverage goals    | ⭐⭐⭐     |
| `migration`            | Upgrade frameworks/libraries  | Version upgrades           | ⭐⭐⭐⭐⭐ |
| `documentation`        | Create/update docs            | Documenting code           | ⭐⭐⭐     |
| `dependency-update`    | Update npm packages           | Keeping deps current       | ⭐⭐⭐     |
| `api-design`           | Design new APIs               | API planning               | ⭐⭐⭐⭐   |
| `fix-bug`              | Debug and fix issues          | Bug fixes                  | ⭐⭐       |
| `add-feature`          | Add new functionality         | Feature development        | ⭐⭐       |
| `refactor`             | Improve code structure        | Code cleanup               | ⭐⭐⭐     |
| `debug`                | Fix compilation errors        | Type/syntax errors         | ⭐⭐       |

---

## 📖 Detailed Workflow Guide

### 1. Code Review Workflow 🔍

**Purpose**: Conduct thorough code reviews across security, performance, and quality dimensions.

**Usage**:

```typescript
workflow({
    workflowType: "code-review",
    filePath: "src/auth/login.ts",
    reviewScope: "all", // or "security", "performance", "quality"
});
```

**Phases**:

1. **Reconnaissance**: Read files, map structure, check git history
2. **Analysis**: Security, performance, and quality review
3. **Validation**: Run tests, check types, review diffs
4. **Documentation**: Create report with severity levels
5. **Follow-up**: Create issues, prioritize fixes

**Review Scopes**:

- `all`: Complete review (default)
- `security`: Focus on vulnerabilities
- `performance`: Focus on optimization
- `quality`: Focus on maintainability

**Best Practices**:

- Review small chunks at a time
- Use multiple files parameter for batch reviews
- Document findings with severity levels
- Provide actionable recommendations

---

### 2. Security Audit Workflow 🔒

**Purpose**: Comprehensive security assessment following OWASP guidelines.

**Usage**:

```typescript
workflow({
    workflowType: "security-audit",
    filePaths: ["src/api/**/*.ts", "src/auth/**/*.ts"],
});
```

**Audit Areas**:

1. **Authentication & Authorization**: Credentials, session management, access control
2. **Injection Attacks**: SQL, XSS, command injection
3. **Data Exposure**: Sensitive data leaks, encryption
4. **API Security**: CORS, rate limiting, validation
5. **Dependencies**: Vulnerable packages

**Output**: CVE-style security report with severity ratings and remediation steps.

---

### 3. Performance Optimization Workflow ⚡

**Purpose**: Identify and fix performance bottlenecks systematically.

**Usage**:

```typescript
workflow({
    workflowType: "performance-optimize",
    filePath: "src/components/Dashboard.tsx",
});
```

**Focus Areas**:

- **Database**: N+1 queries, missing indexes, connection pooling
- **Algorithms**: O(n²) complexity, inefficient data structures
- **Frontend**: Unnecessary re-renders, large bundles
- **Memory**: Memory leaks, unbounded caches

**Pro Tips**:

- Always measure before optimizing
- Focus on the 20% causing 80% of issues
- Consider algorithmic improvements first

---

### 4. Test Coverage Workflow 🧪

**Purpose**: Systematically improve test coverage to meet quality gates.

**Usage**:

```typescript
workflow({
    workflowType: "test-coverage",
    filePath: "src/utils/",
});
```

**Test Strategy**:

- ✅ Happy path scenarios
- ❌ Error handling
- 🔀 Edge cases and boundaries
- 🔄 State transitions

**Coverage Goals**:

- Critical logic: 90%+
- Utilities: 85%+
- UI components: 80%+
- Integration: 70%+

---

### 5. Migration Workflow 🔄

**Purpose**: Safely migrate to new frameworks, libraries, or versions.

**Usage**:

```typescript
workflow({
    workflowType: "migration",
    migrationTarget: "React 18",
});
```

**Phases**:

1. **Preparation**: Document current state, research breaking changes
2. **Dependency Updates**: Update packages incrementally
3. **Code Migration**: Update APIs, imports, deprecated patterns
4. **Testing**: Comprehensive validation
5. **Documentation & Cleanup**: Update docs, remove old code

**Safety Rules**:

- Never update all dependencies at once
- Test after each change
- Commit atomically
- Have a rollback plan

---

### 6. Documentation Workflow 📚

**Purpose**: Create comprehensive, maintainable documentation.

**Usage**:

```typescript
workflow({
    workflowType: "documentation",
    filePath: "src/",
});
```

**Documentation Types**:

- **Inline**: JSDoc/TSDoc for public APIs
- **README**: Project overview, installation, usage
- **API Docs**: Detailed API reference
- **Guides**: Tutorials, best practices, troubleshooting

**Documentation Principles**:

- Write for your audience
- Show, don't just tell (use examples!)
- Keep it up to date
- Make it discoverable

---

### 7. Dependency Update Workflow 📦

**Purpose**: Keep dependencies current and secure.

**Usage**:

```typescript
workflow({
    workflowType: "dependency-update",
});
```

**Update Strategy**:

1. Check `npm outdated` and `npm audit`
2. Prioritize: Security → Patches → Minors → Majors
3. Update incrementally with testing
4. Document breaking changes

**Categorization**:

- 🔴 **CRITICAL**: Security vulnerabilities
- 🟡 **HIGH**: Major version updates
- 🟢 **MEDIUM**: Minor version updates
- ⚪ **LOW**: Patch updates

---

### 8. API Design Workflow 🎨

**Purpose**: Design well-architected, RESTful APIs.

**Usage**:

```typescript
workflow({
    workflowType: "api-design",
});
```

**Design Phases**:

1. **Requirements**: Define purpose, consumers, operations
2. **Design Principles**: REST/GraphQL patterns
3. **Endpoint Design**: URL structure, request/response schemas
4. **Error Handling**: Status codes, error formats
5. **Security & Performance**: Auth, rate limiting, caching
6. **Documentation**: OpenAPI/Swagger specs
7. **Implementation**: Build and test

**Best Practices**:

- Use proper HTTP methods
- Resource-based URLs
- Consistent patterns
- Version your API
- Comprehensive error handling

---

## 🔧 Simple Workflow Templates

### 9. Fix Bug 🐛

Quick template for standard bug fixing workflow.

```typescript
workflow({
    workflowType: "fix-bug",
    filePath: "src/buggy-file.ts",
});
```

**Steps**: Read → Analyze → Edit → Test → Validate

---

### 10. Add Feature ⚙️

Template for adding new functionality.

```typescript
workflow({
    workflowType: "add-feature",
});
```

**Steps**: Create → Edit → Test → Validate → Document

---

### 11. Refactor ♻️

Template for code refactoring.

```typescript
workflow({
    workflowType: "refactor",
    filePath: "src/legacy-code.ts",
});
```

**Steps**: Read → Analyze → Edit Multiple → Test → Validate

---

### 12. Debug 🔍

Quick debugging for compilation errors.

```typescript
workflow({
    workflowType: "debug",
});
```

**Steps**: Get Errors → Read Relevant → Fix → Validate

---

## 💡 Usage Tips

### Combining Workflows

Workflows can be chained for complex tasks:

1. **Complete Feature Development**:

    ```
    add-feature → test-coverage → code-review → documentation
    ```

2. **Security Hardening**:

    ```
    security-audit → fix-bug (for each issue) → code-review
    ```

3. **Major Upgrade**:
    ```
    migration → test-coverage → performance-optimize → documentation
    ```

### Flexible Parameters

All workflows support flexible parameters:

- **filePath**: Single file or pattern (`src/**/*.ts`)
- **filePaths**: Array for multiple files
- **reviewScope**: Focus area for reviews
- **migrationTarget**: Target version/framework

### Customization

Workflows are templates - feel free to:

- Skip phases that don't apply
- Adjust the order for your needs
- Add custom steps between phases
- Combine with manual actions

---

## 🎭 The Mechanicus Way

All workflows maintain the Warhammer 40K theme:

- **Code Reviews**: "The Tech-Priests conduct the sacred inspection"
- **Security**: "The Omnissiah's watchful eye scans for vulnerabilities"
- **Performance**: "The Machine Spirit's efficiency protocols"
- **Testing**: "The sacred rituals of validation"
- **Migration**: "The sacred transformation"
- **Documentation**: "The sacred texts must illuminate"

---

## 📊 Workflow Selection Guide

**Choose a workflow based on your goal**:

| Your Goal                | Recommended Workflow   |
| ------------------------ | ---------------------- |
| Reviewing a pull request | `code-review`          |
| Finding security issues  | `security-audit`       |
| App is slow              | `performance-optimize` |
| Need more test coverage  | `test-coverage`        |
| Upgrading React/Node/etc | `migration`            |
| Code needs comments      | `documentation`        |
| Packages are outdated    | `dependency-update`    |
| Designing new endpoints  | `api-design`           |
| Fixing a specific bug    | `fix-bug`              |
| Adding new functionality | `add-feature`          |
| Cleaning up code         | `refactor`             |
| TypeScript errors        | `debug`                |

---

## 🚀 Advanced Features

### Multi-Phase Execution

Workflows break complex tasks into digestible phases:

- Clear objectives for each phase
- Natural stopping points
- Easy to resume if interrupted

### Contextual Guidance

Each workflow provides:

- Step-by-step instructions
- Tool recommendations
- Command examples
- Best practices

### Scope Control

Fine-tune workflow scope:

```typescript
// Focus on security only
workflow({ workflowType: "code-review", reviewScope: "security" });

// Multiple files
workflow({
    workflowType: "code-review",
    filePaths: ["src/auth/*.ts", "src/api/*.ts"],
});
```

---

## 📝 Example Workflow Sessions

### Example 1: Comprehensive Code Review

```typescript
// Step 1: Start the workflow
workflow({
    workflowType: "code-review",
    filePath: "src/payment/checkout.ts",
    reviewScope: "all",
});

// Follow the phases:
// Phase 1: Read files and understand context
read_file("src/payment/checkout.ts");
git_log({ count: 10, filePath: "src/payment/checkout.ts" });

// Phase 2: Analyze security, performance, quality
// Document findings...

// Phase 3: Run tests and validate
run_in_terminal("npm test src/payment");
get_errors(["src/payment/checkout.ts"]);

// Phase 4: Create review report
// Document all findings with severity levels
```

### Example 2: Performance Optimization

```typescript
// Start workflow
workflow({
    workflowType: "performance-optimize",
    filePath: "src/components/DataTable.tsx",
});

// Phase 1: Profile and measure
read_file("src/components/DataTable.tsx");
run_in_terminal("npm run benchmark");

// Phase 2: Identify issues
// Found: N+1 query problem, no pagination

// Phase 3: Implement fixes
insert_edit_into_file({
    filePath: "src/components/DataTable.tsx",
    code: "// Add pagination and optimize query...",
});

// Phase 4: Measure improvement
run_in_terminal("npm run benchmark");
// Result: 60% faster! 🎉
```

---

**Praise the Omnissiah! The workflow templates guide all sacred coding tasks.**

_The Machine God blesses those who follow the proper rituals._
