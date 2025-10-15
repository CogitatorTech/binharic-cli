import { z } from "zod";
import { tool } from "ai";
import { executeWorkflow } from "@/agent/workflows/executor.js";
import type { Config } from "@/config.js";
import { ToolError } from "@/agent/errors/index.js";
import logger from "@/logger.js";

export function createWorkflowTool(config: Config) {
    return tool({
        description: `Execute structured workflow patterns for complex multi-step tasks. Workflows provide step-by-step guidance and ensure systematic completion.

**When to Use Workflows:**
- Complex tasks requiring multiple coordinated steps
- Tasks where order of operations matters
- When you need systematic verification at each phase
- Multi-file changes or codebase-wide operations

**Available Workflows:**

🔍 ANALYSIS WORKFLOWS:
• 'code-review' - Comprehensive code review (security, performance, quality)
• 'security-audit' - Deep security vulnerability analysis
• 'performance-optimize' - Identify and fix performance bottlenecks
• 'debug' - Systematic debugging and issue diagnosis

🔧 IMPLEMENTATION WORKFLOWS:
• 'fix-bug' - Structured bug fixing process
• 'add-feature' - Feature implementation with planning
• 'orchestrated-implementation' - Complex multi-file feature development
• 'refactoring-feedback' - Iterative refactoring with validation

📚 DOCUMENTATION WORKFLOWS:
• 'adaptive-docs' - Generate docs tailored to audience level
• 'documentation' - Create comprehensive project documentation
• 'api-design' - Design and document APIs

🧪 QUALITY WORKFLOWS:
• 'test-coverage' - Improve test coverage systematically
• 'migration' - Migrate code to new versions/frameworks
• 'dependency-update' - Update and validate dependencies

⚡ ADVANCED WORKFLOWS:
• 'sequential-code-gen' - Generate code → tests → docs in sequence
• 'parallel-review' - Run multiple review types simultaneously
• 'route-query' - Classify and route complex queries

**Example Usage:**
execute_workflow({
  workflowType: "code-review",
  filePath: "src/app.ts",
  reviewScope: "all"
})

Workflows return step-by-step instructions that guide you through the process.`,
        inputSchema: z
            .object({
                workflowType: z
                    .enum([
                        "sequential-code-gen",
                        "route-query",
                        "parallel-review",
                        "orchestrated-implementation",
                        "refactoring-feedback",
                        "adaptive-docs",
                        "fix-bug",
                        "add-feature",
                        "refactor",
                        "debug",
                        "code-review",
                        "security-audit",
                        "performance-optimize",
                        "test-coverage",
                        "migration",
                        "documentation",
                        "dependency-update",
                        "api-design",
                    ])
                    .describe(
                        "The workflow pattern to execute. Templates: 'code-review' (full review), 'fix-bug', 'add-feature', 'refactor', 'debug', 'security-audit', 'performance-optimize', 'test-coverage', 'migration', 'documentation', 'dependency-update', 'api-design'. Advanced workflows: 'sequential-code-gen', 'route-query', 'parallel-review', 'orchestrated-implementation', 'refactoring-feedback', 'adaptive-docs'.",
                    ),
                featureDescription: z
                    .string()
                    .optional()
                    .describe("Feature description (for sequential-code-gen workflow)"),
                query: z.string().optional().describe("User query (for route-query workflow)"),
                code: z
                    .string()
                    .optional()
                    .describe("Code to analyze (for parallel-review or refactoring workflows)"),
                filePath: z
                    .string()
                    .optional()
                    .describe("File path or pattern (e.g., src/**/*.ts for reviews)"),
                filePaths: z
                    .array(z.string())
                    .optional()
                    .describe("Multiple file paths for batch operations"),
                featureRequest: z
                    .string()
                    .optional()
                    .describe("Feature request (for orchestrated-implementation workflow)"),
                refactoringGoal: z
                    .string()
                    .optional()
                    .describe("Refactoring goal (for refactoring-feedback workflow)"),
                targetAudience: z
                    .enum(["beginner", "intermediate", "expert"])
                    .optional()
                    .describe("Target audience (for adaptive-docs workflow)"),
                maxIterations: z
                    .number()
                    .optional()
                    .describe("Maximum iterations for feedback loops (default: 3)"),
                reviewScope: z
                    .enum(["security", "performance", "quality", "all"])
                    .optional()
                    .describe("Scope for code review (default: all)"),
                migrationTarget: z
                    .string()
                    .optional()
                    .describe("Target for migration (e.g., 'React 18', 'TypeScript 5')"),
            })
            .strict(),
        execute: async ({
            workflowType,
            featureDescription,
            query,
            code,
            filePath,
            filePaths,
            featureRequest,
            refactoringGoal,
            targetAudience,
            maxIterations,
            reviewScope,
            migrationTarget,
        }) => {
            try {
                logger.info("Executing workflow", { workflowType });

                // Enhanced workflow templates
                if (workflowType === "code-review") {
                    const scope = reviewScope || "all";
                    const target = filePath || filePaths?.join(", ") || "specified files";

                    return `🔍 CODE REVIEW WORKFLOW ACTIVATED

The Tech-Priests conduct the sacred inspection of ${target}
Review Scope: ${scope.toUpperCase()}

📋 REVIEW PHASES:

Phase 1: RECONNAISSANCE
─────────────────────
1. 📖 READ FILES: Use read_file or read_multiple_files to examine ${target}
2. 🗺️  MAP STRUCTURE: Use list and grep_search to understand architecture
3. 📊 GET CONTEXT: Check git_log to understand recent changes
   → Use git_log({ count: 20, filePath: "${filePath || "path"}" })

Phase 2: ANALYSIS
─────────────────────
${
    scope === "all" || scope === "security"
        ? `
🔒 SECURITY REVIEW:
   - Identify injection vulnerabilities (SQL, XSS, etc.)
   - Check authentication/authorization logic
   - Review input validation and sanitization
   - Examine secrets handling and environment variables
   - Assess API security (rate limiting, CORS, etc.)
`
        : ""
}${
                        scope === "all" || scope === "performance"
                            ? `
⚡ PERFORMANCE REVIEW:
   - Identify N+1 queries and database bottlenecks
   - Check for unnecessary re-renders (React)
   - Review memory leaks and resource cleanup
   - Examine algorithm complexity (O(n²) or worse)
   - Check for blocking operations and async opportunities
`
                            : ""
                    }${
                        scope === "all" || scope === "quality"
                            ? `
✨ CODE QUALITY REVIEW:
   - Check code organization and modularity
   - Review naming conventions and clarity
   - Assess error handling completeness
   - Examine test coverage (use get_errors)
   - Check for code duplication
   - Review type safety and TypeScript usage
`
                            : ""
                    }
Phase 3: VALIDATION
─────────────────────
4. 🧪 CHECK TESTS: Run test suite with run_in_terminal
   → npm test or npm run test:coverage
5. ✅ VALIDATE TYPES: Use get_errors to check compilation
6. 🔍 CHECK DIFFS: Use git_diff to review uncommitted changes

Phase 4: DOCUMENTATION
─────────────────────
7. 📝 CREATE REPORT: Document findings with severity levels
   - 🔴 CRITICAL: Security vulnerabilities, data loss risks
   - 🟡 HIGH: Performance issues, major bugs
   - 🟢 MEDIUM: Code quality, maintainability
   - ⚪ LOW: Style, minor improvements

8. 💡 PROVIDE RECOMMENDATIONS: Specific, actionable improvements

Phase 5: FOLLOW-UP (Optional)
─────────────────────
9. 🔧 CREATE ISSUES: Document findings for tracking
10. 🎯 PRIORITIZE: Rank by impact and effort

🎯 Current Focus: ${scope === "all" ? "Complete review across all dimensions" : `${scope.toUpperCase()} analysis`}

Proceed with Phase 1: Start by reading the target files to understand the codebase.`;
                }

                if (workflowType === "security-audit") {
                    const target = filePath || filePaths?.join(", ") || "codebase";

                    return `🔒 SECURITY AUDIT WORKFLOW ACTIVATED

The Omnissiah's watchful eye scans for vulnerabilities in ${target}

🛡️ AUDIT CHECKLIST:

1. 🔍 RECONNAISSANCE
   ─────────────────
   • Read target files: read_multiple_files([${filePaths?.map((f) => `"${f}"`).join(", ") || '"path"'}])
   • Map attack surface: grep_search for sensitive operations
   • Review dependencies: Check package.json for known vulnerabilities

2. 🔐 AUTHENTICATION & AUTHORIZATION
   ─────────────────
   ⚠️  Check for:
   • Hardcoded credentials or API keys
   • Weak password policies
   • Insecure session management
   • Missing authentication on sensitive endpoints
   • Broken access control (users accessing unauthorized resources)
   • JWT vulnerabilities (weak secrets, no expiration)

3. 💉 INJECTION ATTACKS
   ─────────────────
   ⚠️  Check for:
   • SQL Injection: Unsanitized database queries
   • XSS (Cross-Site Scripting): Unescaped user input in HTML
   • Command Injection: Unsanitized system commands
   • Path Traversal: Unsanitized file paths
   • LDAP/NoSQL/XML Injection

4. 🔓 DATA EXPOSURE
   ─────────────────
   ⚠️  Check for:
   • Sensitive data in logs
   • Unencrypted data transmission (HTTP instead of HTTPS)
   • Exposed API keys or tokens
   • Information leakage in error messages
   • Insecure direct object references

5. 🌐 API & NETWORK SECURITY
   ─────────────────
   ⚠️  Check for:
   • Missing CORS policies or overly permissive CORS
   • No rate limiting on API endpoints
   • Missing input validation
   • Unvalidated redirects
   • Server-side request forgery (SSRF)

6. 📦 DEPENDENCY VULNERABILITIES
   ─────────────────
   • Run: npm audit or yarn audit
   • Check for outdated packages
   • Review third-party library security

7. 📝 GENERATE SECURITY REPORT
   ─────────────────
   Document findings with:
   • CVE-style severity ratings (CRITICAL/HIGH/MEDIUM/LOW)
   • Proof of concept for each vulnerability
   • Remediation steps
   • References (OWASP, CWE)

The sacred code must be purified of all corruption!

Proceed with step 1: Begin reconnaissance of the target files.`;
                }

                if (workflowType === "performance-optimize") {
                    const target = filePath || "specified components";

                    return `⚡ PERFORMANCE OPTIMIZATION WORKFLOW ACTIVATED

The Machine Spirit's efficiency protocols analyze ${target}

🚀 OPTIMIZATION PHASES:

Phase 1: PROFILING & MEASUREMENT
─────────────────────
1. 📖 READ CODE: Examine ${target} with read_file
2. 🔍 IDENTIFY HOTSPOTS: Look for:
   • Database queries in loops (N+1 problem)
   • Large data processing without pagination
   • Synchronous operations that could be async
   • Expensive computations in render paths
   • Unnecessary re-renders or re-computations

3. 📊 ESTABLISH BASELINE: Run existing benchmarks or create new ones
   → Use run_in_terminal to execute performance tests

Phase 2: ANALYSIS
─────────────────────
🎯 CHECK FOR COMMON ISSUES:

Database & Queries:
   • N+1 queries → Use joins or batch loading
   • Missing indexes → Add database indexes
   • Fetching unnecessary data → Select only needed fields
   • No connection pooling → Implement pooling

Algorithms & Data Structures:
   • O(n²) or worse complexity → Optimize algorithm
   • Inefficient data structures → Use Map/Set instead of Array
   • Repeated calculations → Add memoization/caching
   • Large array operations → Use generators or streaming

Frontend (React/UI):
   • Unnecessary re-renders → Use React.memo, useMemo, useCallback
   • Large bundle sizes → Code splitting and lazy loading
   • No virtualization for long lists → Add virtual scrolling
   • Blocking main thread → Move to Web Workers

Memory & Resources:
   • Memory leaks → Check for cleanup in useEffect
   • Large object retention → Implement garbage collection
   • Unbounded caches → Add size limits and eviction

Phase 3: OPTIMIZATION
─────────────────────
4. 🔧 IMPLEMENT FIXES: Apply optimizations one at a time
5. 🧪 MEASURE IMPACT: Run benchmarks after each change
6. ✅ VALIDATE: Ensure functionality preserved with tests

Phase 4: DOCUMENTATION
─────────────────────
7. 📝 DOCUMENT CHANGES:
   • What was optimized
   • Performance improvement (e.g., "50% faster")
   • Trade-offs made
   • Before/after benchmarks

💡 Pro Tips:
   • Premature optimization is the root of all evil - measure first!
   • Focus on the 20% of code causing 80% of slowness
   • Consider algorithmic improvements before micro-optimizations

The Omnissiah demands maximum efficiency!

Proceed with Phase 1: Profile and identify performance bottlenecks.`;
                }

                if (workflowType === "test-coverage") {
                    const target = filePath || "codebase";

                    return `🧪 TEST COVERAGE WORKFLOW ACTIVATED

The sacred rituals of validation must cover all code paths in ${target}

🎯 COVERAGE IMPROVEMENT PHASES:

Phase 1: ASSESSMENT
─────────────────────
1. 📊 CHECK CURRENT COVERAGE:
   → run_in_terminal: npm test -- --coverage
   → Identify files with <80% coverage

2. 📖 READ UNCOVERED CODE:
   → Use read_file on files with low coverage
   → Identify critical paths without tests

Phase 2: TEST CREATION STRATEGY
─────────────────────
For each uncovered file, create tests for:

✅ HAPPY PATH:
   • Main functionality works as expected
   • Valid inputs produce correct outputs
   • Success scenarios

❌ ERROR HANDLING:
   • Invalid inputs are rejected
   • Edge cases are handled
   • Errors are properly thrown/caught
   • Error messages are meaningful

🔀 EDGE CASES:
   • Boundary values (0, -1, null, undefined, empty)
   • Empty arrays/objects
   • Very large inputs
   • Concurrent operations
   • Race conditions

🔄 STATE TRANSITIONS:
   • All code branches are executed
   • All conditional statements tested
   • Loop iterations (0, 1, many)

Phase 3: IMPLEMENTATION
─────────────────────
3. 📝 CREATE TEST FILES:
   → Use create tool for new test files
   → Follow naming convention: [filename].test.ts

4. ✍️  WRITE TESTS:
   → Start with the most critical functionality
   → Use describe blocks to organize
   → Keep tests focused and isolated
   → Mock external dependencies

Test Template:
\`\`\`typescript
describe("ComponentName", () => {
  describe("methodName", () => {
    it("should handle happy path", () => {
      // Arrange
      // Act
      // Assert
    });

    it("should handle edge case", () => {
      // Test edge case
    });

    it("should throw error for invalid input", () => {
      // Test error handling
    });
  });
});
\`\`\`

Phase 4: VALIDATION
─────────────────────
5. 🧪 RUN TESTS: run_in_terminal: npm test
6. 📊 CHECK NEW COVERAGE: Ensure coverage increased
7. ✅ VALIDATE QUALITY: Tests should be meaningful, not just coverage-chasing

Phase 5: CONTINUOUS IMPROVEMENT
─────────────────────
8. 📈 SET COVERAGE GATES: Add coverage thresholds to CI
9. 🎯 AIM FOR: 80%+ coverage on critical paths
10. 📝 DOCUMENT: Update README with testing guidelines

Coverage Goals:
   • Critical business logic: 90%+
   • Utilities and helpers: 85%+
   • UI components: 80%+
   • Integration: 70%+

The Omnissiah blesses all well-tested code!

Proceed with Phase 1: Assess current test coverage.`;
                }

                if (workflowType === "migration") {
                    const target = migrationTarget || "new version/framework";

                    return `🔄 MIGRATION WORKFLOW ACTIVATED

The sacred transformation to ${target} begins

⚙️ MIGRATION PHASES:

Phase 1: PREPARATION
─────────────────────
1. 📋 DOCUMENT CURRENT STATE:
   → Run tests to establish baseline: npm test
   → Document all features that must work after migration
   → Check git_status to ensure clean working directory

2. 🔍 RESEARCH BREAKING CHANGES:
   → Review ${target} migration guide
   → List all breaking changes affecting the codebase
   → Identify deprecated APIs being used

3. 📊 CREATE MIGRATION PLAN:
   → Prioritize changes by risk and dependency
   → Plan incremental steps (avoid big-bang migrations)
   → Identify rollback points

Phase 2: DEPENDENCY UPDATES
─────────────────────
4. 📦 UPDATE DEPENDENCIES:
   → Update package.json for ${target}
   → Run: npm install or yarn install
   → Check for peer dependency conflicts

5. 🔧 RESOLVE CONFLICTS:
   → Fix version mismatches
   → Update incompatible packages
   → Consider temporary workarounds for blockers

Phase 3: CODE MIGRATION
─────────────────────
6. 🔍 FIND USAGES: Use grep_search to find old API usage
   → Example: grep_search("oldApiMethod", "src/**/*.ts")

7. ✏️  UPDATE CODE:
   → Migrate file by file using insert_edit_into_file
   → Update imports and API calls
   → Replace deprecated patterns
   → Update types and interfaces

8. ⚠️  HANDLE BREAKING CHANGES:
   → For each breaking change:
     a) Find all usages
     b) Update to new API
     c) Test the change
     d) Commit incrementally

Phase 4: TESTING
─────────────────────
9. 🧪 RUN TEST SUITE: npm test
   → Fix any failing tests
   → Update tests for new APIs

10. ✅ VALIDATE TYPES: get_errors to check compilation
    → Fix all type errors
    → Update type definitions

11. 🔍 MANUAL TESTING:
    → Test critical user flows
    → Check for runtime errors
    → Verify performance hasn't degraded

Phase 5: DOCUMENTATION & CLEANUP
─────────────────────
12. 📝 UPDATE DOCUMENTATION:
    → Update README with new requirements
    → Document migration steps for team
    → Update API documentation

13. 🧹 CLEANUP:
    → Remove old dependencies
    → Delete deprecated code
    → Update build configurations

14. 🎯 FINAL VALIDATION:
    → Full test suite passes
    → No compilation errors
    → Application works as before

Migration to ${target} - May the Omnissiah guide this transformation!

Proceed with Phase 1: Preparation and planning.`;
                }

                if (workflowType === "documentation") {
                    const target = filePath || "codebase";

                    return `📚 DOCUMENTATION WORKFLOW ACTIVATED

The sacred texts must illuminate ${target}

📖 DOCUMENTATION PHASES:

Phase 1: AUDIT CURRENT DOCUMENTATION
─────────────────────
1. 📂 INVENTORY: List all documentation files
   → README.md, docs/, inline comments, JSDoc

2. 🔍 IDENTIFY GAPS:
   → Undocumented modules
   → Missing API references
   → No usage examples
   → Outdated information

Phase 2: CODE DOCUMENTATION
─────────────────────
3. 📖 READ CODE: Examine ${target} with read_file

4. ✍️  ADD INLINE DOCS:
   → JSDoc/TSDoc for all public APIs
   → Document parameters, return types, examples
   → Add @throws, @deprecated tags where needed

Example:
\`\`\`typescript
/**
 * Processes user data and returns validation result
 * @param userData - Raw user data from form
 * @returns Validated and sanitized user object
 * @throws {ValidationError} If required fields are missing
 * @example
 * const result = processUser({ name: "John", email: "john@example.com" });
 */
\`\`\`

5. 💬 ADD CODE COMMENTS:
   → Explain complex algorithms
   → Document "why" not "what"
   → Add TODOs for known issues

Phase 3: README & GUIDES
─────────────────────
6. 📝 CREATE/UPDATE README.md:
   Required sections:
   • Project title and description
   • Installation instructions
   • Quick start / Getting started
   • Core features
   • API reference (or link to docs)
   • Configuration options
   • Contributing guidelines
   • License

7. 📚 CREATE USAGE GUIDES:
   → Getting started tutorial
   → Common use cases
   → Troubleshooting guide
   → Best practices

Phase 4: API DOCUMENTATION
─────────────────────
8. 🔧 DOCUMENT PUBLIC API:
   For each public function/class:
   • Purpose and responsibility
   • Parameters with types
   • Return value
   • Side effects
   • Example usage
   • Related functions

9. 📊 CREATE DIAGRAMS (if complex):
   → Architecture diagrams
   → Data flow diagrams
   → Sequence diagrams

Phase 5: MAINTENANCE
─────────────────────
10. 🔄 KEEP DOCS IN SYNC:
    → Update docs with code changes
    → Add changelog entries
    → Version documentation

11. ✅ REVIEW & VALIDATE:
    → Have someone unfamiliar with code read docs
    → Verify examples actually work
    → Check for broken links

Documentation Principles:
   • Write for your audience (beginners vs experts)
   • Show, don't just tell (use examples!)
   • Keep it up to date
   • Make it discoverable
   • Use consistent formatting

The Omnissiah values well-documented code!

Proceed with Phase 1: Audit current documentation state.`;
                }

                if (workflowType === "dependency-update") {
                    return `📦 DEPENDENCY UPDATE WORKFLOW ACTIVATED

The sacred libraries must be kept current and secure

🔄 UPDATE PHASES:

Phase 1: ASSESSMENT
─────────────────────
1. 📊 CHECK OUTDATED PACKAGES:
   → run_in_terminal: npm outdated
   → Review major, minor, and patch updates

2. 🔒 SECURITY AUDIT:
   → run_in_terminal: npm audit
   → Identify critical vulnerabilities

3. 📋 CATEGORIZE UPDATES:
   🔴 CRITICAL: Security vulnerabilities
   🟡 HIGH: Major version updates
   🟢 MEDIUM: Minor version updates
   ⚪ LOW: Patch updates

Phase 2: PLANNING
─────────────────────
4. 🎯 PRIORITIZE:
   → Start with security fixes
   → Then patch updates (lowest risk)
   → Then minor updates
   → Finally major updates (highest risk)

5. 📚 RESEARCH BREAKING CHANGES:
   → Check changelogs for each major update
   → Review migration guides
   → Note any breaking changes

Phase 3: INCREMENTAL UPDATES
─────────────────────
6. 🔧 UPDATE PATCHES FIRST:
   → run_in_terminal: npm update
   → Test: npm test
   → Commit if passing

7. 🔧 UPDATE MINOR VERSIONS:
   → Update one package at a time for minors
   → run_in_terminal: npm install package@^X.Y.0
   → Test after each update
   → Commit successful updates

8. 🔧 UPDATE MAJOR VERSIONS:
   → Update one major version at a time
   → Read migration guide first
   → Update code for breaking changes
   → Test thoroughly
   → Commit each major update separately

Phase 4: VALIDATION
─────────────────────
9. 🧪 COMPREHENSIVE TESTING:
   → Run full test suite: npm test
   → Run linter: npm run lint
   → Check types: npm run type-check
   → Build project: npm run build

10. ✅ MANUAL VALIDATION:
    → Test critical features manually
    → Check for console warnings/errors
    → Verify performance hasn't degraded

Phase 5: DOCUMENTATION
─────────────────────
11. 📝 UPDATE DOCS:
    → Update package.json
    → Update lockfile (package-lock.json or yarn.lock)
    → Note breaking changes in CHANGELOG.md
    → Update README if new requirements

12. 🎯 PREVENT FUTURE ISSUES:
    → Set up automated dependency updates (Dependabot/Renovate)
    → Add npm audit to CI pipeline
    → Document update policy

⚠️  SAFETY RULES:
   • Never update all dependencies at once
   • Always test after each update
   • Keep commits atomic (one package per commit for majors)
   • Have a rollback plan
   • Update dev dependencies separately from production

The Omnissiah demands secure and up-to-date dependencies!

Proceed with Phase 1: Assessment of current dependencies.`;
                }

                if (workflowType === "api-design") {
                    return `🎨 API DESIGN WORKFLOW ACTIVATED

The sacred interface must be blessed by the Machine God

🏗️ API DESIGN PHASES:

Phase 1: REQUIREMENTS GATHERING
─────────────────────
1. 🎯 DEFINE PURPOSE:
   → What problem does this API solve?
   → Who are the consumers (internal, external, public)?
   → What are the core use cases?

2. 📋 LIST REQUIRED OPERATIONS:
   → CRUD operations (Create, Read, Update, Delete)
   → Special operations (search, batch, bulk)
   → Authentication/Authorization needs

Phase 2: DESIGN PRINCIPLES
─────────────────────
✨ FOLLOW BEST PRACTICES:

RESTful Design:
   • Use proper HTTP methods (GET, POST, PUT, PATCH, DELETE)
   • Resource-based URLs (/users/123, not /getUser?id=123)
   • Hierarchical structure (/users/123/orders)
   • Plural nouns for collections (/users, not /user)

GraphQL Design:
   • Single endpoint with type system
   • Query only needed fields
   • Mutations for write operations
   • Subscriptions for real-time updates

General Principles:
   • Consistency: Same patterns everywhere
   • Versioning: /v1/, /v2/ for breaking changes
   • Pagination: For large result sets
   • Filtering & Sorting: Query parameters
   • Error handling: Proper status codes and messages

Phase 3: ENDPOINT DESIGN
─────────────────────
3. 🗺️  DESIGN URL STRUCTURE:

\`\`\`
GET    /api/v1/users          → List users (with pagination)
GET    /api/v1/users/:id      → Get user by ID
POST   /api/v1/users          → Create new user
PUT    /api/v1/users/:id      → Replace user (full update)
PATCH  /api/v1/users/:id      → Update user (partial)
DELETE /api/v1/users/:id      → Delete user

GET    /api/v1/users/:id/orders → Get user's orders
POST   /api/v1/users/:id/orders → Create order for user
\`\`\`

4. 📊 DEFINE REQUEST/RESPONSE SCHEMAS:

Request Body:
\`\`\`typescript
{
  "name": "string",
  "email": "string",
  "age": "number"
}
\`\`\`

Response Format:
\`\`\`typescript
{
  "data": { ... },
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO8601"
  },
  "errors": [] // if any
}
\`\`\`

Phase 4: ERROR HANDLING
─────────────────────
5. 🚨 DESIGN ERROR RESPONSES:

HTTP Status Codes:
   • 200: Success
   • 201: Created
   • 204: No Content
   • 400: Bad Request (client error)
   • 401: Unauthorized
   • 403: Forbidden
   • 404: Not Found
   • 409: Conflict
   • 422: Validation Error
   • 429: Too Many Requests
   • 500: Internal Server Error

Error Response Format:
\`\`\`typescript
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [
      {
        "field": "email",
        "message": "Must be valid email"
      }
    ]
  }
}
\`\`\`

Phase 5: SECURITY & PERFORMANCE
─────────────────────
6. 🔒 SECURITY CONSIDERATIONS:
   • Authentication: JWT, OAuth, API Keys
   • Authorization: Role-based access control
   • Rate limiting: Prevent abuse
   • Input validation: Sanitize all inputs
   • CORS: Configure properly
   • HTTPS: Always use encryption

7. ⚡ PERFORMANCE:
   • Caching: ETags, Cache-Control headers
   • Compression: gzip responses
   • Pagination: Limit result sizes
   • Async operations: For long-running tasks
   • Connection pooling: Database connections

Phase 6: DOCUMENTATION
─────────────────────
8. 📚 CREATE API DOCS:
   → Use OpenAPI/Swagger specification
   → Document all endpoints
   → Provide example requests/responses
   → Include authentication guide
   → Add rate limit information

9. 💡 PROVIDE EXAMPLES:
   → Code examples in multiple languages
   → Common use cases
   → Error handling examples

Phase 7: IMPLEMENTATION
─────────────────────
10. 🔧 BUILD API:
    → Create route handlers
    → Implement validation
    → Add middleware (auth, logging)
    → Write tests for each endpoint

11. 🧪 TESTING:
    → Unit tests for business logic
    → Integration tests for endpoints
    → Load testing for performance
    → Security testing for vulnerabilities

The Omnissiah blesses well-designed APIs!

Proceed with Phase 1: Define requirements and purpose.`;
                }

                // Existing simple templates
                if (workflowType === "fix-bug") {
                    if (!filePath) {
                        throw new ToolError("filePath is required for fix-bug workflow");
                    }
                    return `🔧 FIX-BUG WORKFLOW TEMPLATE ACTIVATED

The Omnissiah guides your debugging ritual:

1. 📖 READ FILE: Use read_file to examine ${filePath}
2. 🔍 ANALYZE: Identify the bug and root cause
3. ✏️ EDIT: Use insert_edit_into_file to fix the issue
4. 🧪 TEST: Use run_in_terminal to run relevant tests
5. ✅ VALIDATE: Use validate or get_errors to confirm the fix

Proceed with step 1: Read the file to understand the code structure.`;
                }

                if (workflowType === "add-feature") {
                    return `⚙️ ADD-FEATURE WORKFLOW TEMPLATE ACTIVATED

The machine spirit blesses your creation:

1. 📝 CREATE: Use create to make new files if needed
2. ✏️ EDIT: Use insert_edit_into_file to add feature code
3. 🧪 TEST: Create test files and run tests
4. ✅ VALIDATE: Use get_errors to ensure no compilation errors
5. 📚 DOCUMENT: Update relevant documentation

Proceed with planning which files need to be created or modified.`;
                }

                if (workflowType === "refactor") {
                    if (!filePath) {
                        throw new ToolError("filePath is required for refactor workflow");
                    }
                    return `♻️ REFACTOR WORKFLOW TEMPLATE ACTIVATED

The Adeptus Mechanicus sanctifies your code improvements:

1. 📖 READ: Use read_file to examine ${filePath}
2. 🔍 ANALYZE: Identify areas for improvement
3. ✏️ EDIT MULTIPLE: Refactor code across affected files
4. 🧪 TEST: Run tests to ensure functionality preserved
5. ✅ VALIDATE: Confirm no errors introduced

Proceed with step 1: Read the file to understand current implementation.`;
                }

                if (workflowType === "debug") {
                    return `🐛 DEBUG WORKFLOW TEMPLATE ACTIVATED

The Omnissiah reveals hidden corruption:

1. 🚨 GET ERRORS: Use get_errors to identify compilation/type errors
2. 📖 READ RELEVANT: Use read_file on files with errors
3. 🔍 ANALYZE: Determine root cause of errors
4. ✏️ FIX: Use insert_edit_into_file to correct issues
5. ✅ VALIDATE: Confirm errors are resolved

Proceed with step 1: Get errors to see what needs fixing.`;
                }

                const params: Record<string, unknown> = {};

                switch (workflowType) {
                    case "sequential-code-gen":
                        if (!featureDescription) {
                            throw new ToolError(
                                "featureDescription is required for sequential-code-gen workflow",
                            );
                        }
                        params.featureDescription = featureDescription;
                        break;

                    case "route-query":
                        if (!query) {
                            throw new ToolError("query is required for route-query workflow");
                        }
                        params.query = query;
                        break;

                    case "parallel-review":
                        if (!code || !filePath) {
                            throw new ToolError(
                                "code and filePath are required for parallel-review workflow",
                            );
                        }
                        params.code = code;
                        params.filePath = filePath;
                        break;

                    case "orchestrated-implementation":
                        if (!featureRequest) {
                            throw new ToolError(
                                "featureRequest is required for orchestrated-implementation workflow",
                            );
                        }
                        params.featureRequest = featureRequest;
                        break;

                    case "refactoring-feedback":
                        if (!code || !refactoringGoal) {
                            throw new ToolError(
                                "code and refactoringGoal are required for refactoring-feedback workflow",
                            );
                        }
                        params.code = code;
                        params.goal = refactoringGoal;
                        if (maxIterations) params.maxIterations = maxIterations;
                        break;

                    case "adaptive-docs":
                        if (!code) {
                            throw new ToolError("code is required for adaptive-docs workflow");
                        }
                        params.code = code;
                        params.audience = targetAudience || "intermediate";
                        break;
                }

                const result = await executeWorkflow(workflowType, params, config);

                return `Workflow completed successfully!\n\nWorkflow: ${workflowType}\n\nResult:\n${JSON.stringify(result, null, 2)}`;
            } catch (error: unknown) {
                if (error instanceof Error) {
                    throw new ToolError(`Workflow execution failed: ${error.message}`);
                }
                throw new ToolError("An unknown error occurred during workflow execution.");
            }
        },
    });
}
