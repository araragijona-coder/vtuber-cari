import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
PIPELINE_DIR = ROOT / "avatar-blender"

class BlenderPipelineContractTests(unittest.TestCase):
    def test_config_has_cari_contract(self):
        config = json.loads(
            (PIPELINE_DIR / "cari_v1_vrm_pipeline.json").read_text(encoding="utf-8")
        )
        self.assertEqual(config["schema_version"], 1)
        self.assertEqual(config["asset_id"], "cari-base-v1")
        self.assertIn("humanoid", config)
        self.assertIn("vrm", config)
        self.assertEqual(config["vrm"]["version"], "1.0.0")
        self.assertIn("cari_mouth_open", config["shape_keys"]["names"])
        self.assertIn("cari_talking", config["shape_keys"]["names"])

    def test_pipeline_contains_all_gates(self):
        source = (PIPELINE_DIR / "cari_vrm_pipeline.py").read_text(encoding="utf-8")
        for marker in (
            "import_fbx",
            "audit_geometry",
            "repair_weights",
            "ensure_shape_keys",
            "configure_humanoid",
            "configure_mtoon",
            "configure_metadata",
            "export_vrm",
            "reimport_audit",
        ):
            self.assertIn(marker, source)

    def test_wrapper_and_docs_exist(self):
        self.assertTrue((PIPELINE_DIR / "run-cari-vrm-pipeline.ps1").is_file())
        self.assertTrue((PIPELINE_DIR / "README.md").is_file())
        self.assertTrue((PIPELINE_DIR / "CARI_VRM_PIPELINE_SPEC.md").is_file())

if __name__ == "__main__":
    unittest.main()
