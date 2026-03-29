-- ================================================================
--  Primetrade Task Manager — MySQL 8 Schema
--  Run once to initialise the database:
--    mysql -u root -p < scripts/schema.sql
-- ================================================================

CREATE DATABASE IF NOT EXISTS primetrade_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE primetrade_db;

-- ── users ─────────────────────────────────────────────────────────
-- Stores all registered accounts (both user and admin roles).
-- email is UNIQUE — used as the login identifier.
-- password_hash is a bcrypt hash (never store plaintext passwords).

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)     NOT NULL,
  email         VARCHAR(255)     NOT NULL,
  password_hash VARCHAR(255)     NOT NULL,
  role          ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE  KEY uq_users_email (email),
  INDEX   idx_users_role (role)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ── tasks ─────────────────────────────────────────────────────────
-- Each task belongs to exactly one user (via user_id FK).
-- Cascade delete: removing a user automatically removes their tasks.
-- status  : workflow column — todo → in_progress → done
-- priority: urgency indicator — low / medium / high

CREATE TABLE IF NOT EXISTS tasks (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  status      ENUM('todo', 'in_progress', 'done') NOT NULL DEFAULT 'todo',
  priority    ENUM('low', 'medium', 'high')        NOT NULL DEFAULT 'medium',
  due_date    DATETIME,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_tasks_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  -- Indexes to speed up common query patterns
  INDEX idx_tasks_user_id  (user_id),          -- fetch all tasks for a user
  INDEX idx_tasks_status   (status),            -- filter by status
  INDEX idx_tasks_priority (priority),          -- filter by priority
  INDEX idx_tasks_due_date (due_date)           -- sort/filter by due date
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;
