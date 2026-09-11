from __future__ import annotations

import unittest

from app.monitor.usage import UsageStats


class UsageStatsTests(unittest.TestCase):
    def test_records_provider_counts(self) -> None:
        stats = UsageStats()
        stats.record("local")
        stats.record("ollama", 123.0)
        stats.record("api", 456.0, success=False)
        snapshot = stats.snapshot()
        self.assertEqual(snapshot["local"], 1)
        self.assertEqual(snapshot["ollama"], 1)
        self.assertEqual(snapshot["api"], 1)
        self.assertEqual(snapshot["failures"], 1)
        self.assertEqual(snapshot["last"], "api")
        self.assertEqual(snapshot["latency_ms"], 456.0)
        self.assertGreaterEqual(snapshot["cpu_percent"], 0.0)


if __name__ == "__main__":
    unittest.main()
