# Skill: Commit Conventions

## Purpose
Standardize commit messages and branch naming for this project. Enables auto-generated changelogs, semantic versioning, and clear project history. Based on Conventional Commits 1.0.0.

## Commit Message Format
```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

### Types
| Type | Usage | Release effect |
|------|-------|---------------|
| `feat` | A new feature | MINOR |
| `fix` | A bug fix | PATCH |
| `perf` | Performance improvement | PATCH |
| `refactor` | Code change with no feature/fix | — |
| `test` | Adding or updating tests | — |
| `docs` | Documentation only | — |
| `style` | Formatting, linting (no logic change) | — |
| `build` | Build system, dependencies, Docker | — |
| `ci` | CI/CD pipeline changes | — |
| `chore` | Maintenance, config, tooling | — |

### Scope (Project-Specific)
| Scope | Area |
|-------|------|
| `notifications` | Notification module |
| `templates` | Template module |
| `channels` | Delivery channel adapters |
| `auth` | Authentication & authorization |
| `users` | User management |
| `api` | API configuration, middleware |
| `db` | Database schema, migrations |
| `infra` | Docker, CI/CD, deployment |
| `deps` | Dependency updates |

### Examples
```
feat(notifications): add email delivery channel with SendGrid integration

fix(auth): validate refresh token expiry before rotation

refactor(api): extract pagination logic into reusable pipe

docs(api): document rate limiting headers in OpenAPI spec

ci(infra): add Trivy security scan to CI pipeline

chore(deps): upgrade @nestjs/core from 10.3.0 to 10.4.1
```

### Breaking Changes
Add `!` after type/scope and include `BREAKING CHANGE` in footer:
```
feat(api)!: change pagination response format

BREAKING CHANGE: Pagination response now uses { data, meta: { page, totalPages } }
instead of { results, count }.
```

## Branch Naming
```
<type>/<short-description>
```

### Examples
- `feat/email-delivery-channel`
- `fix/refresh-token-validation`
- `refactor/extract-pagination-pipe`
- `docs/swagger-auth-examples`
- `ci/add-trivy-scan`

### Branch Name Rules
- Use kebab-case for the description
- Keep descriptions under 50 characters
- Reference the issue number at the end if applicable: `feat/email-delivery-channel-#42`
- Delete branch after merge (GitHub can auto-configure this)

## Pull Request Title
Follow the same `<type>(<scope>): <summary>` format as commit messages. The PR title will become the commit message when squash-merging.

## Anti-Patterns
- `WIP`, `fix stuff`, `update`, `changes` as commit messages
- Multiple unrelated changes in a single commit (violates single-responsibility per commit)
- Committing generated files (dist, node_modules, coverage) — use `.gitignore` and `.dockerignore`
- Re-writing published git history on shared branches (force push without understanding the consequences)
- Mixing `feat` and `fix` in the same branch (create separate branches)
- Commit messages that exceed 72 characters for the first line (truncated in many git tools)

## Tools
- **Commitlint**: enforce commit message format with a husky hook
- **Lint-staged**: run linters only on staged files in the pre-commit hook
- **Standard Version** or **semantic-release**: auto-version and changelog from conventional commits
- **gitmoji-cli** (optional, team preference): add emoji to commits for visual scanning

## Quality Criteria
- Every commit message answers "why" this change exists, not just "what" changed
- A developer can read `git log --oneline` and understand the project's evolution
- The changelog generated from these commits is useful for end users (not cluttered with chore commits)
- Breaking changes are clearly documented and easy to find in the history
- The project's `.gitconfig` or `husky` configuration enforces these conventions
