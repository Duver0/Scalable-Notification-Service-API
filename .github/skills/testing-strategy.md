# Skill: Testing Strategy

## Purpose
Define a layered, pragmatic testing approach for the project. Balances speed, confidence, and maintenance cost. Every test serves a purpose; no test exists just to inflate coverage.

## Test Pyramid (Project-Specific)

```
        ╱╲
       ╱ E2E ╲          ← 10% of tests (critical journeys)
      ╱────────╲
     ╱ Integration ╲    ← 30% of tests (repositories, external adapters)
    ╱────────────────╲
   ╱   Unit (Pure)    ╲ ← 60% of tests (domain logic, handlers, value objects)
  ╱──────────────────────╲
```

### Layer 1 — Unit Tests (Vitest / Jest)
- **What**: domain entities, value objects, domain services, command/query handlers in isolation
- **Mocking**: mock only the direct dependency (repository interface, event bus). Do not mock the database.
- **Structure**: one `describe` block per class, one `it` block per behavior/edge case
- **Coverage target**: 90%+ on domain logic, 80%+ on handlers
- **Rules**:
  - No side effects: tests should not write to any external system
  - Freeze time with `vi.useFakeTimers()` for time-sensitive logic
  - Use faker for test data, not hardcoded values
  - Test error states explicitly (not just happy paths)

### Layer 2 — Integration Tests (Vitest + Testcontainers)
- **What**: repository implementations, external API adapters, message broker integration
- **Infrastructure**: use Testcontainers to spin up real PostgreSQL and Redis instances
- **Rules**:
  - Each test file gets its own container or database schema (parallel-safe via random schema names)
  - Start containers once per file (`beforeAll`), clean data between tests (`beforeEach` truncate)
  - Test all CRUD operations including edge cases (duplicate key, not found, constraint violation)
  - Verify the actual database state after each operation, not just the return value

### Layer 3 — E2E Tests (Vitest + Supertest)
- **What**: full HTTP request → response cycle, including auth middleware, guards, pipes, exception filters
- **Infrastructure**: uses the same Testcontainers setup as integration tests
- **Rules**:
  - Test critical paths: register → login → create resource → read → update → delete
  - Test authentication failure modes: missing token, expired token, wrong role
  - Test validation failure modes: missing fields, wrong types, out-of-range values
  - Use the same configuration as production but with isolated test containers
  - Never share state between E2E tests (each test is self-contained)

## General Testing Rules
1. **No test is allowed to depend on another test** (order-independent, parallel-safe)
2. **No test is allowed to access the network** except through controlled test containers
3. **No `describe.only` or `it.only`** in committed code (block in CI)
4. **Test names must describe the expected behavior**: `it('returns 400 when email is invalid')`
5. **One logical assertion per test**: multiple `expect` calls are fine if they all verify the same behavior
6. **Factories over fixtures**: use `@faker-js/faker` to generate realistic data instead of static JSON fixtures

## Anti-Patterns
- Testing implementation details (private methods, internal state) — tests break on refactor
- Over-mocking: an integration test that mocks the database tests nothing meaningful
- Flaky tests that depend on timing, random data without seed, or external services
- Tests that share mutable fixtures (one test accidentally corrupting data for the next)
- Skipping error-path tests because "the happy path covers it"
- 100% coverage obsession that leads to testing trivial getters and setters

## Quality Checklist
- [ ] All domain exceptions have corresponding test(s)
- [ ] All public handler methods have at least one success and one failure test
- [ ] Repository tests verify data is persisted correctly and retrievable
- [ ] E2E tests cover the critical user journeys
- [ ] Test suite runs in <3 minutes
- [ ] No flaky tests (verified over 5 CI runs)
- [ ] Tests use factories, not hardcoded data that will break on schema changes
