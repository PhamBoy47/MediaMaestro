package database

import (
    "database/sql"
    "fmt"

    _ "modernc.org/sqlite"
)

type DB struct {
    db *sql.DB
}

func New(path string) (*DB, error) {
    db, err := sql.Open("sqlite", path+"?_journal_mode=WAL&_foreign_keys=on")
    if err != nil {
        return nil, fmt.Errorf("failed to open database: %w", err)
    }

    d := &DB{db: db}
    if err := d.migrate(); err != nil {
        return nil, fmt.Errorf("migration failed: %w", err)
    }

    return d, nil
}

func (d *DB) migrate() error {
    migrations := []string{
        `CREATE TABLE IF NOT EXISTS media_items (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            media_type TEXT NOT NULL CHECK(media_type IN ('video', 'audio')),
            file_path TEXT NOT NULL UNIQUE,
            cover_path TEXT,
            metadata TEXT DEFAULT '{}',
            play_count INTEGER DEFAULT 0,
            last_played TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS subtitle_cache (
            id TEXT PRIMARY KEY,
            media_path TEXT NOT NULL,
            language TEXT NOT NULL,
            subtitle_path TEXT NOT NULL,
            source TEXT NOT NULL DEFAULT 'opensubtitles',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS watch_progress (
            id TEXT PRIMARY KEY,
            media_path TEXT NOT NULL UNIQUE,
            position REAL NOT NULL DEFAULT 0,
            duration REAL NOT NULL DEFAULT 0,
            completed INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,
        `CREATE TABLE IF NOT EXISTS libraries (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            path TEXT NOT NULL UNIQUE,
            media_type TEXT NOT NULL,
            auto_scan INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,
        `CREATE INDEX IF NOT EXISTS idx_media_type ON media_items(media_type)`,
        `CREATE INDEX IF NOT EXISTS idx_subtitle_media ON subtitle_cache(media_path)`,
        `CREATE INDEX IF NOT EXISTS idx_progress_media ON watch_progress(media_path)`,
    }

    for _, m := range migrations {
        if _, err := d.db.Exec(m); err != nil {
            return err
        }
    }
    return nil
}

func (d *DB) Close() error {
    return d.db.Close()
}

func (d *DB) DB() *sql.DB {
    return d.db
}