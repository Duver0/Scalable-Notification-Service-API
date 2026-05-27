# Skill: PostgreSQL Schema Design

## Purpose
Define the conventions, patterns, and constraints for database schema design in this project. Ensures schemas are performant, maintainable, and aligned with the application's domain model.

## Rules

### Naming Conventions
- **Tables**: `snake_case`, plural (`notifications`, `notification_templates`)
- **Columns**: `snake_case`, singular (`created_at`, `user_id`)
- **Primary keys**: `id` (UUID type, not serial)
- **Foreign keys**: `<singular_table>_id` (`user_id`, `notification_id`)
- **Indexes**: `idx_<table>_<column>` (`idx_notifications_user_id`)
- **Unique constraints**: `uq_<table>_<column>` (`uq_users_email`)
- **Enums**: `snake_case`, singular (`notification_status`, `delivery_channel`)

### Column Type Guidelines
| Domain | Type | Reason |
|--------|------|--------|
| Primary/Foreign Keys | `UUID` | Distributed-safe, no enumeration |
| Timestamps | `TIMESTAMPTZ` | Timezone-aware, stored as UTC |
| Monetary values | `NUMERIC(12,4)` | Exact precision, no floating-point errors |
| Status codes | Custom ENUM or `VARCHAR(50)` | Readable, constrained |
| Large text | `TEXT` | No arbitrary length limits |
| JSON payloads | `JSONB` | Indexable, binary storage, no whitespace |
| Counters | `INTEGER` or `BIGINT` | Sufficient for most use cases |

### Required Columns on Every Table
```sql
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
```

- Use a trigger or application-level logic to update `updated_at` on every write

### Indexing Strategy
1. Index every foreign key column (for JOIN performance)
2. Index columns used in `WHERE`, `ORDER BY`, and `GROUP BY` clauses
3. Use composite indexes when filtering by multiple columns in a predictable order
4. Use partial indexes for common filtered queries: `CREATE INDEX idx_active_users ON users(is_active) WHERE is_active = true`
5. Use covering indexes for frequently accessed read queries: `CREATE INDEX idx_covering ON notifications(user_id) INCLUDE (title, created_at)`
6. Avoid over-indexing: each index adds write overhead

## Anti-Patterns
- Using `SERIAL` or `BIGSERIAL` for primary keys (hard to merge across distributed systems)
- Storing JSONB where a normalized table is appropriate
- Missing foreign key constraints (the database should enforce referential integrity, not just the app)
- Using `VARCHAR(255)` as a default without considering actual data size
- Storing money as `FLOAT` or `DOUBLE PRECISION` (inexact)
- Soft deletes without a well-defined strategy (they break unique constraints and accumulate dead rows)

## Best Practices
- Use `EXPLAIN ANALYZE` before writing code that queries a new or modified schema
- Prefer `BETWEEN` or range types over `>=` and `<=` for date range queries (more readable, index-friendly)
- Set `default` values at the database level, not just in the application
- Use `ENUM` types for statuses with a small, stable set of values; use `VARCHAR` for extensible statuses
- Always add a comment to columns that have non-obvious semantics: `COMMENT ON COLUMN users.status IS 'active | suspended | deleted'`
- For full-text search, use `tsvector` with a `GIN` index, not `LIKE '%term%'`
- Partition large tables (millions of rows) by time or tenant ID
