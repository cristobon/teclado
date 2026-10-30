export interface Migration {
  version: number
  sql: string
}

/** Migraciones en orden. Nunca modificar una ya publicada: añadir una nueva. */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE songs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT,
        file_name TEXT,
        midi BLOB NOT NULL,
        duration REAL NOT NULL,
        bpm REAL NOT NULL,
        note_count INTEGER NOT NULL,
        track_count INTEGER NOT NULL,
        difficulty INTEGER NOT NULL,
        is_demo INTEGER NOT NULL DEFAULT 0,
        track_overrides TEXT NOT NULL DEFAULT '{}',
        split_point INTEGER,
        created_at TEXT NOT NULL,
        last_opened_at TEXT
      );
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `
  }
]
