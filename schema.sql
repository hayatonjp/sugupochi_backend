-- もしテーブルが既に存在すれば削除して作り直す
DROP TABLE IF EXISTS polls;
DROP TABLE IF EXISTS poll_options;

-- pollsテーブル
CREATE TABLE polls (
  uuid TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  expires_at TEXT,
  passcode TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- poll_optionsテーブル
CREATE TABLE poll_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_uuid TEXT NOT NULL,
  text TEXT NOT NULL,
  FOREIGN KEY (poll_uuid) REFERENCES polls (uuid)
);

-- votesテーブル
CREATE TABLE votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    poll_uuid TEXT NOT NULL,
    poll_option_id INTEGER NOT NULL,
    voter_identifier TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (poll_uuid) REFERENCES polls (uuid),
    FOREIGN KEY (poll_option_id) REFERENCES poll_options (id)
);