import { merkle, SyncProtoBuf, Timestamp } from '@actual-app/crdt';

import { openDatabase } from './db';

async function addMessages(db, messages, groupId) {
  return db.transaction(async txDb => {
    let trie = await getMerkle(txDb, groupId);

    if (messages.length > 0) {
      for (const msg of messages) {
        const info = await txDb.mutate(
          `INSERT INTO messages_binary (group_id, timestamp, is_encrypted, content)
             VALUES (?, ?, ?, ?) ON CONFLICT (group_id, timestamp) DO NOTHING`,
          [
            groupId,
            msg.getTimestamp(),
            msg.getIsencrypted() ? 1 : 0,
            Buffer.from(msg.getContent()),
          ],
        );

        if (info.changes > 0) {
          trie = merkle.insert(trie, Timestamp.parse(msg.getTimestamp()));
        }
      }
    }

    trie = merkle.prune(trie);

    await txDb.mutate(
      'INSERT INTO messages_merkles (group_id, merkle) VALUES (?, ?) ON CONFLICT (group_id) DO UPDATE SET merkle = EXCLUDED.merkle',
      [groupId, JSON.stringify(trie)],
    );

    return trie;
  });
}

async function getMerkle(db, groupId) {
  const rows = await db.all('SELECT * FROM messages_merkles WHERE group_id = ?', [groupId]);

  if (rows.length > 0) {
    return JSON.parse(rows[0].merkle);
  } else {
    // No merkle trie exists yet (first sync of the app), so create a
    // default one.
    return {};
  }
}

export async function sync(messages, since, groupId) {
  const db = openDatabase();
  const newMessages = await db.all(
    `SELECT * FROM messages_binary
         WHERE group_id = ? AND timestamp > ?
         ORDER BY timestamp`,
    [groupId, since],
  );

  const trie = await addMessages(db, messages, groupId);

  return {
    trie,
    newMessages: newMessages.map(msg => {
      const envelopePb = new SyncProtoBuf.MessageEnvelope();
      envelopePb.setTimestamp(msg.timestamp);
      envelopePb.setIsencrypted(msg.is_encrypted);
      envelopePb.setContent(msg.content);
      return envelopePb;
    }),
  };
}
