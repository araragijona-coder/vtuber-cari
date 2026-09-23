import unittest

from app.studio.metrics import quality_metric, utilization_metric


class StudioMetricsTests(unittest.TestCase):
    def test_utilization_statuses_are_simple(self) -> None:
        self.assertEqual(utilization_metric("CPU", 42).status, "bien")
        self.assertEqual(utilization_metric("GPU", 70).status, "atención")
        self.assertEqual(utilization_metric("RAM", 92).status, "alto")

    def test_quality_statuses_are_simple(self) -> None:
        self.assertEqual(quality_metric("stream", 95).status, "excelente")
        self.assertEqual(quality_metric("stream", 80).status, "bien")
        self.assertEqual(quality_metric("stream", 60).status, "atención")
        self.assertEqual(quality_metric("stream", 20).status, "problema")

    def test_values_are_bounded(self) -> None:
        with self.assertRaises(ValueError):
            utilization_metric("CPU", -1)
        with self.assertRaises(ValueError):
            quality_metric("stream", 101)


if __name__ == "__main__":
    unittest.main()
