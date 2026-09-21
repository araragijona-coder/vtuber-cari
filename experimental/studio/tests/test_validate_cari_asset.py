from __future__ import annotations

import json
import unittest
from pathlib import Path
import importlib.util

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "tools" / "validate_cari_asset.py"

spec = importlib.util.spec_from_file_location("validate_cari_asset", SCRIPT)
module = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(module)

class CariAssetManifestTests(unittest.TestCase):
    def test_manifests_exist(self):
        self.assertTrue(module.MANIFEST.exists())
        self.assertTrue(module.PARAMETERS.exists())

    def test_required_layer_contract(self):
        data = json.loads(module.MANIFEST.read_text(encoding="utf-8"))
        self.assertEqual(data["asset_id"], "cari-base-v1")
        self.assertEqual(len(data["required_parts"]), len(set(data["required_parts"])))
        self.assertIn("nose_bandage", data["required_parts"])
        self.assertIn("ponytail", data["required_parts"])

    def test_parameter_ids_unique(self):
        data = json.loads(module.PARAMETERS.read_text(encoding="utf-8"))
        ids = [entry["id"] for entry in data["parameters"]]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertIn("head.yaw", ids)
        self.assertIn("mouth.open", ids)

if __name__ == "__main__":
    unittest.main()
