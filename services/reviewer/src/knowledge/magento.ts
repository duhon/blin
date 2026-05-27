export default `
# Magento 2 Knowledge Pack

## Architecture

### Dependency Injection
- Always inject dependencies via constructor, never use ObjectManager directly (except in factories and proxies)
- Use virtual types in di.xml for configuration instead of creating new classes
- Prefer interfaces over concrete classes in constructor arguments

### Plugins (Interceptors)
- Use before/after plugins instead of around when possible — around plugins are expensive and block parallelism
- Never throw exceptions in around plugins without calling \$proceed
- Plugin classes must be in Plugin/ directory and follow {ClassName}Plugin naming

### Observers
- Observers must be stateless — never store state in observer properties
- Use asynchronous observers (async="true") for non-critical operations
- Never use resource models directly inside observers — can cause deadlocks

### Service Contracts
- Business logic must go through service contracts (interfaces in Api/)
- Repository pattern: use repositories for CRUD, never direct resource model access from outside module
- Data interfaces in Api/Data/ must only have getters/setters

## Database

### Queries
- Never use raw SQL — always use Magento DB adapter or ORM
- Always add indexes for columns used in WHERE/JOIN
- Avoid SELECT * — always specify columns
- Use batch processing for bulk operations, never load full collections in memory

### Schema
- Use declarative schema (db_schema.xml) for all table definitions
- Always add foreign key constraints and proper column types
- Use db_schema_whitelist.json to track schema

## Security

### Input Validation
- Never trust user input — always validate and sanitize
- Use escapeHtml() / escapeUrl() in templates, never echo raw data
- ACL resources must be defined for every admin action

### CSRF & XSS
- All forms must have CSRF validation (uiComponent forms handle this automatically)
- Use \`$block->escapeHtml()\` for all output in .phtml templates
- Never use \`$$_GET\`, \`$$_POST\` directly — use request object

## Performance

### Caching
- Tag caches properly with cache tags for correct invalidation
- Use \`Magento\\Framework\\Cache\\FrontendInterface\` not low-level cache directly
- Avoid cache operations in loops

### Collections
- Never load full collection to get count — use \`getSize()\`
- Use \`addFieldToFilter\` instead of PHP-side filtering
- Always add \`setPageSize\` to avoid loading entire tables

### Indexing
- Mutable data that's queried often should have an indexer
- Partial reindex must be supported — implement \`executeList()\` not just \`executeFull()\`

## Code Quality

### PHP Conventions
- All public methods must have return type declarations
- Use strict_types=1 in all PHP files
- No static methods except in helper/utility classes and factories
- Classes must be final unless designed for extension

### Testing
- Unit tests for business logic (no Magento framework dependencies)
- Integration tests for repository/resource model layer
- MFTF for end-to-end admin/frontend flows

### Common Anti-patterns to Flag
- \`ObjectManager::getInstance()\` outside of factories — hard to test, bypasses DI
- \`$collection->load()\` inside loops — N+1 query problem
- Direct table access bypassing repositories
- Missing \`@api\` annotation on public service contract interfaces
- \`sleep()\` or \`usleep()\` in production code
- Hardcoded store IDs or website IDs
`.trim();
