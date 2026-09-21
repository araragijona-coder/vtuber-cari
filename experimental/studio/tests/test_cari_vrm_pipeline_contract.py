from __future__ import annotations

import ast
import json
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
PIPELINE = ROOT / "avatar-blender" / "cari_vrm_pipeline.py"
CONFIG = ROOT / "avatar-blender" / "cari_v1_vrm_pipeline.json"
BINDING = ROOT / "avatar-blender" / "cari_vrm_binding.json"


class CariVrmPipelineContractTests(unittest.TestCase):
    def test_pipeline_is_valid_python_and_exposes_required_stages(self) -> None:
        source = PIPELINE.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(PIPELINE))
        functions = {
            node.name
            for node in ast.walk(tree)
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        }

        required = {
            "import_fbx",
            "choose_armature",
            "audit_geometry",
            "repair_weights",
            "ensure_shape_keys",
            "configure_humanoid",
            "configure_expressions",
            "configure_mtoon",
            "configure_metadata",
            "export_vrm",
            "reimport_audit",
            "run",
            "main",
        }
        self.assertTrue(required.issubset(functions))
        self.assertIn("bpy.ops.wm.fbx_import", source)
        self.assertIn("bpy.ops.import_scene.fbx", source)
        self.assertIn("--preflight", source)
        self.assertIn("PREFLIGHT_PASS", source)

    def test_config_and_binding_contracts_are_consistent(self) -> None:
        config = json.loads(CONFIG.read_text(encoding="utf-8"))
        binding = json.loads(BINDING.read_text(encoding="utf-8"))

        self.assertEqual(config["schema_version"], 1)
        self.assertEqual(config["vrm"]["version"], "1.0.0")
        self.assertEqual(binding["vrm_version"], "1.0")

        shape_keys = set(config["shape_keys"]["names"])
        binding_keys = set(binding["expressions"].values())
        self.assertTrue(binding_keys.issubset(shape_keys))

        required_humanoid = set(config["humanoid"]["required"])
        expected_required = {
            "hips",
            "spine",
            "head",
            "left_upper_arm",
            "right_upper_arm",
            "left_lower_arm",
            "right_lower_arm",
            "left_hand",
            "right_hand",
            "left_upper_leg",
            "right_upper_leg",
            "left_lower_leg",
            "right_lower_leg",
            "left_foot",
            "right_foot",
        }
        self.assertEqual(required_humanoid, expected_required)

    def test_no_second_blender_pipeline_exists(self) -> None:
        candidates = sorted(
            path.name
            for path in (ROOT / "avatar-blender").glob("*pipeline*.py")
        )
        self.assertEqual(candidates, ["cari_vrm_pipeline.py"])


if __name__ == "__main__":
    unittest.main()
