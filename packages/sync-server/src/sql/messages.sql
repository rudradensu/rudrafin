CREATE TABLE IF NOT EXISTS messages_binary
  (group_id TEXT NOT NULL,
   timestamp TEXT NOT NULL,
   is_encrypted BOOLEAN,
   content BYTEA,
   PRIMARY KEY (group_id, timestamp));

CREATE TABLE IF NOT EXISTS messages_merkles
  (group_id TEXT PRIMARY KEY,
   merkle TEXT);
