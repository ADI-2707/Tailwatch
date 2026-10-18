import sqlite3
import os
from typing import List, Dict, Any, Tuple

class ChaosLedger:
    def __init__(self, db_path: str = "chaos_ledger.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS ledger_events (
                    id TEXT PRIMARY KEY,
                    batch_id TEXT,
                    service TEXT,
                    level TEXT,
                    scenario TEXT,
                    created_at TEXT
                )
            """)
            conn.commit()

    def record_events(self, batch_id: str, scenario: str, events: List[Dict[str, Any]]):
        records = [
            (
                e.get("fields", {}).get("event_id") or e.get("id"),
                batch_id,
                e.get("service"),
                e.get("level"),
                scenario,
                e.get("ts")
            )
            for e in events
        ]
        with sqlite3.connect(self.db_path) as conn:
            conn.executemany("""
                INSERT OR IGNORE INTO ledger_events (id, batch_id, service, level, scenario, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, records)
            conn.commit()

    def get_summary(self) -> Dict[str, Any]:
        with sqlite3.connect(self.db_path) as conn:
            cur = conn.cursor()
            cur.execute("SELECT count(*), count(DISTINCT batch_id) FROM ledger_events")
            total_events, total_batches = cur.fetchone()
            
            cur.execute("SELECT level, count(*) FROM ledger_events GROUP BY level")
            by_level = dict(cur.fetchall())
            
            cur.execute("SELECT service, count(*) FROM ledger_events GROUP BY service")
            by_service = dict(cur.fetchall())

            return {
                "total_events": total_events,
                "total_batches": total_batches,
                "by_level": by_level,
                "by_service": by_service
            }

    def get_all_ids(self) -> List[str]:
        with sqlite3.connect(self.db_path) as conn:
            cur = conn.cursor()
            cur.execute("SELECT id FROM ledger_events")
            return [r[0] for r in cur.fetchall()]
