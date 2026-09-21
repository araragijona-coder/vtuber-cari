#!/usr/bin/env python3
"""Cari V1 Blender -> VRM 1.0 authoring pipeline.

Run in Blender:
  blender --background --python cari_vrm_pipeline.py -- --input C:/assets/cari.fbx --output C:/exports/cari.vrm

The script audits the imported FBX, repairs unsafe skinning, creates stable
facial shape-key names, configures VRM 1.0 Humanoid/metadata/MToon when the
VRM Add-on is available, exports VRM, and reimports the result for verification.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import traceback
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import bpy


DEFAULT_CONFIG = {
    "schema_version": 1,
    "asset_id": "cari-base-v1",
    "import": {
        "use_anim": True,
        "use_image_search": True,
        "automatic_bone_orientation": False,
        "ignore_leaf_bones": True,
        "global_scale": 1.0,
        "axis_forward": "-Z",
        "axis_up": "Y",
    },
    "cleanup": {
        "apply_mesh_rotation": True,
        "apply_mesh_scale": True,
        "repair_zero_weight_vertices": True,
        "normalize_weights": True,
        "max_deform_influences": 4,
    },
    "shape_keys": {
        "enabled": True,
        "create_placeholders": True,
        "target_mesh_name_tokens": ["head", "face", "body"],
        "names": [
            "cari_mouth_open",
            "cari_blink_l",
            "cari_blink_r",
            "cari_happy",
            "cari_angry",
            "cari_sad",
            "cari_surprised",
            "cari_embarrassed",
            "cari_sleepy",
            "cari_talking",
        ],
    },
    "materials": {
        "enable_mtoon": True,
        "toony_factor": 0.85,
        "outline_mode": "none",
        "outline_width": 0.0,
    },
    "humanoid": {
        "required": {
            "hips": ["hips", "pelvis"],
            "spine": ["spine", "spine1", "spine_01"],
            "head": ["head"],
            "left_upper_arm": ["leftUpperArm", "upper_arm.L", "upperarm_l", "arm_l"],
            "right_upper_arm": ["rightUpperArm", "upper_arm.R", "upperarm_r", "arm_r"],
            "left_lower_arm": ["leftLowerArm", "lower_arm.L", "lowerarm_l", "forearm_l"],
            "right_lower_arm": ["rightLowerArm", "lower_arm.R", "lowerarm_r", "forearm_r"],
            "left_hand": ["leftHand", "hand.L", "hand_l"],
            "right_hand": ["rightHand", "hand.R", "hand_r"],
            "left_upper_leg": ["leftUpperLeg", "thigh.L", "thigh_l"],
            "right_upper_leg": ["rightUpperLeg", "thigh.R", "thigh_r"],
            "left_lower_leg": ["leftLowerLeg", "calf.L", "calf_l"],
            "right_lower_leg": ["rightLowerLeg", "calf.R", "calf_r"],
            "left_foot": ["leftFoot", "foot.L", "foot_l"],
            "right_foot": ["rightFoot", "foot.R", "foot_r"],
        },
        "optional": {
            "chest": ["chest", "Chest"],
            "neck": ["neck", "Neck"],
            "left_shoulder": ["leftShoulder", "shoulder.L", "shoulder_l"],
            "right_shoulder": ["rightShoulder", "shoulder.R", "shoulder_r"],
            "left_toes": ["leftToes", "toes.L", "toes_l"],
            "right_toes": ["rightToes", "toes.R", "toes_r"],
        },
    },
    "vrm": {
        "name": "Cari V1",
        "version": "1.0.0",
        "authors": ["Cari Studio"],
        "copyright_information": "",
        "contact_information": "",
        "references": [],
        "third_party_licenses": "See assets/cari/ASSET_LICENSE.md.",
        "avatar_permission": "onlyAuthor",
        "commercial_usage": "personalProfit",
        "credit_notation": "required",
        "allow_redistribution": False,
        "modification": "allowModification",
        "other_license_url": "",
        "allow_excessively_violent_usage": False,
        "allow_excessively_sexual_usage": False,
        "allow_political_or_religious_usage": False,
        "allow_antisocial_or_hate_usage": False,
    },
    "pipeline": {
        "clean_scene_first": True,
        "save_staging_blend": True,
        "staging_blend_name": "cari_vrm_pipeline_staging.blend",
        "write_report": True,
        "reimport_audit": True,
        "export_vrm": True,
    },
}


@dataclass
class Issue:
    severity: str
    code: str
    message: str
    object_name: str | None = None


@dataclass
class Report:
    started_at: str
    finished_at: str | None = None
    blender_version: str = bpy.app.version_string
    input_path: str | None = None
    output_path: str | None = None
    status: str = "RUNNING"
    vrm_addon_available: bool = False
    armature: str | None = None
    mesh_count: int = 0
    material_count: int = 0
    issues: list[Issue] = field(default_factory=list)
    metrics: dict[str, Any] = field(default_factory=dict)
    actions: list[str] = field(default_factory=list)

    def add(self, severity: str, code: str, message: str, object_name: str | None = None) -> None:
        self.issues.append(Issue(severity, code, message, object_name))

    def note(self, message: str) -> None:
        self.actions.append(message)

    @property
    def errors(self) -> list[Issue]:
        return [item for item in self.issues if item.severity == "ERROR"]

    def to_dict(self) -> dict[str, Any]:
        return {
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "blender_version": self.blender_version,
            "input_path": self.input_path,
            "output_path": self.output_path,
            "status": self.status,
            "vrm_addon_available": self.vrm_addon_available,
            "armature": self.armature,
            "mesh_count": self.mesh_count,
            "material_count": self.material_count,
            "issues": [item.__dict__ for item in self.issues],
            "metrics": self.metrics,
            "actions": self.actions,
        }


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def deep_merge(base: dict[str, Any], incoming: dict[str, Any]) -> None:
    for key, value in incoming.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            deep_merge(base[key], value)
        else:
            base[key] = value


def load_config(path: Path | None) -> dict[str, Any]:
    config = json.loads(json.dumps(DEFAULT_CONFIG))
    if path is not None:
        with path.open("r", encoding="utf-8") as handle:
            deep_merge(config, json.load(handle))
    return config


def clear_scene() -> None:
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def vrm_api_available() -> bool:
    return hasattr(bpy.ops.import_scene, "vrm") and hasattr(bpy.ops.export_scene, "vrm")


def import_fbx(path: Path, config: dict[str, Any], report: Report) -> None:
    result = bpy.ops.import_scene.fbx(filepath=str(path), **config["import"])
    if "FINISHED" not in result:
        raise RuntimeError(f"FBX import failed: {result}")
    report.note(f"FBX imported: {path}")


def meshes() -> list[bpy.types.Object]:
    return [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]


def armatures() -> list[bpy.types.Object]:
    return [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]


def choose_armature(report: Report) -> bpy.types.Object | None:
    candidates = armatures()
    if not candidates:
        report.add("ERROR", "NO_ARMATURE", "No Armature was imported.")
        return None

    scored = [
        (sum(1 for bone in obj.data.bones if bone.use_deform), obj)
        for obj in candidates
    ]
    selected = max(scored, key=lambda item: item[0])[1]
    report.armature = selected.name
    report.metrics["armature_deform_bones"] = sum(
        1 for bone in selected.data.bones if bone.use_deform
    )

    if len(candidates) > 1:
        report.add(
            "WARNING",
            "MULTIPLE_ARMATURES",
            f"{len(candidates)} Armatures found; selected the one with the most deform bones.",
            selected.name,
        )
    return selected


def audit_geometry(armature: bpy.types.Object | None, report: Report) -> None:
    objects = meshes()
    report.mesh_count = len(objects)
    report.material_count = len({
        material.name
        for obj in objects
        for material in obj.data.materials
        if material is not None
    })

    if not objects:
        report.add("ERROR", "NO_MESHES", "No mesh objects were imported.")
        return

    vertices = 0
    polygons = 0
    uv_layers = 0
    linked = 0
    for obj in objects:
        vertices += len(obj.data.vertices)
        polygons += len(obj.data.polygons)
        uv_layers += len(obj.data.uv_layers)

        if armature and any(
            modifier.type == "ARMATURE" and modifier.object == armature
            for modifier in obj.modifiers
        ):
            linked += 1
        elif armature:
            report.add(
                "WARNING",
                "MESH_NOT_SKINNED_TO_ARMATURE",
                "Mesh has no Armature modifier targeting the selected Armature.",
                obj.name,
            )

        if not obj.data.vertices:
            report.add("WARNING", "EMPTY_MESH", "Mesh contains no vertices.", obj.name)

    report.metrics.update({
        "mesh_vertices": vertices,
        "mesh_polygons": polygons,
        "uv_layers": uv_layers,
        "armature_linked_meshes": linked,
    })


def normalize_name(name: str) -> str:
    value = name.casefold()
    value = value.replace("left", "l").replace("right", "r")
    return "".join(ch for ch in value if ch.isalnum())


def bone_lookup(armature: bpy.types.Object) -> dict[str, str]:
    return {
        normalize_name(bone.name): bone.name
        for bone in armature.data.bones
    }


def find_bone(lookup: dict[str, str], aliases: Iterable[str]) -> str | None:
    for alias in aliases:
        match = lookup.get(normalize_name(alias))
        if match:
            return match
    return None


def configure_humanoid(
    armature: bpy.types.Object | None,
    config: dict[str, Any],
    report: Report,
) -> dict[str, str]:
    if armature is None:
        return {}

    extension = getattr(armature.data, "vrm_addon_extension", None)
    if extension is None:
        report.add(
            "ERROR",
            "VRM_EXTENSION_MISSING",
            "VRM Add-on extension missing from Armature.",
            armature.name,
        )
        return {}

    extension.spec_version = "1.0"
    humanoid = extension.vrm1.humanoid
    slots = humanoid.human_bones
    lookup = bone_lookup(armature)
    mapped: dict[str, str] = {}

    for human_bone, aliases in config["humanoid"]["required"].items():
        actual = find_bone(lookup, aliases)
        if actual is None:
            report.add(
                "ERROR",
                "MISSING_REQUIRED_HUMANOID_BONE",
                f"Missing required VRM 1.0 human bone: {human_bone}",
                armature.name,
            )
            continue
        try:
            getattr(slots, human_bone).node.bone_name = actual
            mapped[human_bone] = actual
        except Exception as exc:
            report.add(
                "ERROR",
                "HUMANOID_ASSIGNMENT_FAILED",
                f"Could not assign {human_bone}: {exc}",
                armature.name,
            )

    for human_bone, aliases in config["humanoid"]["optional"].items():
        actual = find_bone(lookup, aliases)
        if actual is None:
            continue
        try:
            getattr(slots, human_bone).node.bone_name = actual
            mapped[human_bone] = actual
        except Exception as exc:
            report.add(
                "WARNING",
                "OPTIONAL_HUMANOID_ASSIGNMENT_FAILED",
                f"Could not assign optional {human_bone}: {exc}",
                armature.name,
            )

    report.metrics["humanoid_mapped"] = len(mapped)
    report.note(f"Mapped {len(mapped)} VRM humanoid bones.")
    return mapped


def repair_weights(
    armature: bpy.types.Object | None,
    config: dict[str, Any],
    report: Report,
) -> None:
    if armature is None:
        return

    deform_bones = {
        bone.name for bone in armature.data.bones if bone.use_deform
    }
    max_influences = int(config["cleanup"]["max_deform_influences"])
    zero_count = 0
    trimmed_count = 0
    normalized_count = 0

    bone_positions = [
        (bone.name, armature.matrix_world @ bone.head_local)
        for bone in armature.data.bones
        if bone.use_deform
    ]

    for obj in meshes():
        if not any(
            modifier.type == "ARMATURE" and modifier.object == armature
            for modifier in obj.modifiers
        ):
            continue

        group_by_index = {group.index: group for group in obj.vertex_groups}

        for vertex in obj.data.vertices:
            entries: list[list[Any]] = []
            for assignment in vertex.groups:
                group = group_by_index.get(assignment.group)
                if group is None or group.name not in deform_bones:
                    continue
                try:
                    value = obj.vertex_groups[group.index].weight(vertex.index)
                except RuntimeError:
                    continue
                if value > 0:
                    entries.append([group.name, float(value)])

            if not entries:
                zero_count += 1
                if not config["cleanup"]["repair_zero_weight_vertices"] or not bone_positions:
                    continue

                world_vertex = obj.matrix_world @ vertex.co
                selected_bone, _ = min(
                    bone_positions,
                    key=lambda item: (item[1] - world_vertex).length,
                )
                group = obj.vertex_groups.get(selected_bone)
                if group is None:
                    group = obj.vertex_groups.new(name=selected_bone)
                group.add([vertex.index], 1.0, "REPLACE")
                entries = [[selected_bone, 1.0]]

            entries.sort(key=lambda item: item[1], reverse=True)
            if len(entries) > max_influences:
                for bone_name, _ in entries[max_influences:]:
                    group = obj.vertex_groups.get(bone_name)
                    if group is not None:
                        group.remove([vertex.index])
                entries = entries[:max_influences]
                trimmed_count += 1

            total = sum(value for _, value in entries)
            if (
                config["cleanup"]["normalize_weights"]
                and total > 0
                and not math.isclose(total, 1.0, rel_tol=1e-5, abs_tol=1e-6)
            ):
                for bone_name, value in entries:
                    group = obj.vertex_groups.get(bone_name)
                    if group is not None:
                        group.add([vertex.index], value / total, "REPLACE")
                normalized_count += 1

    report.metrics.update({
        "zero_weight_vertices": zero_count,
        "trimmed_influence_vertices": trimmed_count,
        "normalized_weight_vertices": normalized_count,
    })

    if zero_count:
        report.add(
            "WARNING",
            "ZERO_WEIGHT_VERTICES",
            f"Detected {zero_count} vertices without deform influences before repair.",
        )


def apply_mesh_transforms(report: Report, config: dict[str, Any]) -> None:
    rotation = bool(config["cleanup"]["apply_mesh_rotation"])
    scale = bool(config["cleanup"]["apply_mesh_scale"])
    if not rotation and not scale:
        return

    active = bpy.context.view_layer.objects.active
    selected = list(bpy.context.selected_objects)

    try:
        for obj in meshes():
            bpy.ops.object.select_all(action="DESELECT")
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.transform_apply(
                location=False,
                rotation=rotation,
                scale=scale,
            )
            report.note(f"Applied mesh transforms: {obj.name}")
    finally:
        bpy.ops.object.select_all(action="DESELECT")
        for obj in selected:
            if obj.name in bpy.context.scene.objects:
                obj.select_set(True)
        if active and active.name in bpy.context.scene.objects:
            bpy.context.view_layer.objects.active = active


def choose_face_mesh(config: dict[str, Any]) -> bpy.types.Object | None:
    tokens = [token.casefold() for token in config["shape_keys"]["target_mesh_name_tokens"]]
    scored = []
    for obj in meshes():
        score = sum(token in obj.name.casefold() for token in tokens)
        scored.append((score, obj))
    if not scored:
        return None
    return max(scored, key=lambda item: item[0])[1]


def ensure_shape_keys(config: dict[str, Any], report: Report) -> None:
    settings = config["shape_keys"]
    if not settings["enabled"]:
        return

    target = choose_face_mesh(config)
    if target is None:
        report.add("ERROR", "NO_FACIAL_MESH", "No candidate facial mesh exists.")
        return

    if not target.data.shape_keys:
        target.shape_key_add(name="Basis")

    mapping = {
        "cari_mouth_open": "mouth.open",
        "cari_blink_l": "eye.blink.L",
        "cari_blink_r": "eye.blink.R",
        "cari_happy": "expression.happy",
        "cari_angry": "expression.angry",
        "cari_sad": "expression.sad",
        "cari_surprised": "expression.surprised",
        "cari_embarrassed": "expression.embarrassed",
        "cari_sleepy": "expression.sleepy",
        "cari_talking": "expression.talking",
    }

    created = 0
    placeholders = 0
    existing = {key.name for key in target.data.shape_keys.key_blocks}

    for name in settings["names"]:
        if name not in existing and settings["create_placeholders"]:
            key = target.shape_key_add(name=name)
            key["cari_pipeline_placeholder"] = True
            key["cari_expression_status"] = "PLACEHOLDER"
            created += 1

    for key in target.data.shape_keys.key_blocks:
        backend_id = mapping.get(key.name)
        if backend_id:
            key["cari_backend_parameter"] = backend_id
        if key.get("cari_pipeline_placeholder"):
            placeholders += 1

    report.metrics.update({
        "shape_key_mesh": target.name,
        "shape_keys_created": created,
        "shape_key_placeholders": placeholders,
    })

    if placeholders:
        report.add(
            "WARNING",
            "PLACEHOLDER_SHAPE_KEYS",
            "Facial shape keys exist as named placeholders but contain no authored deformation.",
            target.name,
        )


def safe_set(root: Any, path: str, value: Any) -> bool:
    current = root
    pieces = path.split(".")
    try:
        for piece in pieces[:-1]:
            current = getattr(current, piece)
        setattr(current, pieces[-1], value)
        return True
    except Exception:
        return False


def configure_mtoon(config: dict[str, Any], report: Report) -> None:
    if not config["materials"]["enable_mtoon"]:
        return

    enabled = 0
    for material in bpy.data.materials:
        extension = getattr(material, "vrm_addon_extension", None)
        if extension is None:
            report.add(
                "WARNING",
                "MTOON_EXTENSION_MISSING",
                "Material has no VRM Add-on extension.",
                material.name,
            )
            continue

        try:
            mtoon1 = extension.mtoon1
            mtoon1.enabled = True
            color = tuple(float(value) for value in material.diffuse_color)
            safe_set(mtoon1, "pbr_metallic_roughness.base_color_factor", color)
            safe_set(
                mtoon1.extensions.vrmc_materials_mtoon,
                "shading_toony_factor",
                float(config["materials"]["toony_factor"]),
            )
            safe_set(
                mtoon1.extensions.vrmc_materials_mtoon,
                "outline_width_mode",
                str(config["materials"]["outline_mode"]),
            )
            safe_set(
                mtoon1.extensions.vrmc_materials_mtoon,
                "outline_width_factor",
                float(config["materials"]["outline_width"]),
            )
            material["cari_material_pipeline"] = "MTOON1"
            enabled += 1
        except Exception as exc:
            report.add(
                "WARNING",
                "MTOON_CONFIGURATION_FAILED",
                f"MToon configuration failed: {exc}",
                material.name,
            )

    report.metrics["mtoon_materials_enabled"] = enabled


def configure_metadata(
    armature: bpy.types.Object | None,
    config: dict[str, Any],
    report: Report,
) -> None:
    if armature is None:
        return
    extension = getattr(armature.data, "vrm_addon_extension", None)
    if extension is None:
        return

    extension.spec_version = "1.0"
    meta = extension.vrm1.meta
    source = config["vrm"]

    meta.vrm_name = str(source["name"])
    meta.version = str(source["version"])
    meta.copyright_information = str(source["copyright_information"])
    meta.contact_information = str(source["contact_information"])
    meta.third_party_licenses = str(source["third_party_licenses"])
    meta.avatar_permission = str(source["avatar_permission"])
    meta.commercial_usage = str(source["commercial_usage"])
    meta.credit_notation = str(source["credit_notation"])
    meta.allow_redistribution = bool(source["allow_redistribution"])
    meta.modification = str(source["modification"])
    meta.other_license_url = str(source["other_license_url"])
    meta.allow_excessively_violent_usage = bool(source["allow_excessively_violent_usage"])
    meta.allow_excessively_sexual_usage = bool(source["allow_excessively_sexual_usage"])
    meta.allow_political_or_religious_usage = bool(source["allow_political_or_religious_usage"])
    meta.allow_antisocial_or_hate_usage = bool(source["allow_antisocial_or_hate_usage"])

    while len(meta.authors):
        meta.authors.remove(len(meta.authors) - 1)
    for author in source["authors"]:
        meta.authors.add().value = str(author)

    while len(meta.references):
        meta.references.remove(len(meta.references) - 1)
    for reference in source["references"]:
        meta.references.add().value = str(reference)

    report.note("Configured VRM 1.0 metadata.")


def export_vrm(output: Path, report: Report) -> bool:
    if not vrm_api_available():
        report.add(
            "ERROR",
            "VRM_EXPORT_API_MISSING",
            "VRM Add-on export API is unavailable.",
        )
        return False

    output.parent.mkdir(parents=True, exist_ok=True)
    result = bpy.ops.export_scene.vrm(filepath=str(output))
    if "FINISHED" not in result:
        report.add("ERROR", "VRM_EXPORT_FAILED", f"Export returned {result}.")
        return False
    if not output.exists() or output.stat().st_size == 0:
        report.add("ERROR", "VRM_OUTPUT_MISSING", "VRM file was not created.")
        return False

    report.note(f"VRM exported: {output}")
    return True


def snapshot_objects() -> set[str]:
    return {obj.name for obj in bpy.context.scene.objects}


def remove_new_objects(before: set[str]) -> None:
    new_objects = [
        obj for obj in bpy.context.scene.objects
        if obj.name not in before
    ]
    bpy.ops.object.select_all(action="DESELECT")
    for obj in new_objects:
        obj.select_set(True)
    if new_objects:
        bpy.ops.object.delete(use_global=False)


def reimport_audit(output: Path, report: Report) -> None:
    before = snapshot_objects()
    result = bpy.ops.import_scene.vrm(filepath=str(output))
    if "FINISHED" not in result:
        report.add("ERROR", "VRM_REIMPORT_FAILED", f"Reimport returned {result}.")
        return

    imported = [obj for obj in bpy.context.scene.objects if obj.name not in before]
    imported_armatures = [obj for obj in imported if obj.type == "ARMATURE"]
    imported_meshes = [obj for obj in imported if obj.type == "MESH"]

    report.metrics.update({
        "reimport_objects": len(imported),
        "reimport_armatures": len(imported_armatures),
        "reimport_meshes": len(imported_meshes),
    })

    if not imported_armatures:
        report.add("ERROR", "REIMPORT_NO_ARMATURE", "Reimported VRM has no Armature.")
    if not imported_meshes:
        report.add("ERROR", "REIMPORT_NO_MESHES", "Reimported VRM has no mesh.")

    if imported_armatures:
        imported_armature = imported_armatures[0]
        extension = getattr(imported_armature.data, "vrm_addon_extension", None)
        if extension is None:
            report.add(
                "ERROR",
                "REIMPORT_NO_VRM_EXTENSION",
                "Reimported Armature has no VRM Add-on extension.",
                imported_armature.name,
            )
        elif extension.spec_version != "1.0":
            report.add(
                "ERROR",
                "REIMPORT_WRONG_VRM_VERSION",
                f"Reimported VRM reports spec_version={extension.spec_version!r}.",
                imported_armature.name,
            )
        else:
            report.note("Reimport audit confirms VRM 1.0.")

    remove_new_objects(before)


def write_report(path: Path, report: Report) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(report.to_dict(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Cari V1 FBX to VRM 1.0 pipeline")
    parser.add_argument("--input", required=True, help="Source FBX")
    parser.add_argument("--output", required=True, help="Target VRM")
    parser.add_argument("--config", default=None, help="Pipeline JSON config")
    parser.add_argument("--report", default=None, help="Report JSON path")
    parser.add_argument("--keep-imported-scene", action="store_true")
    return parser.parse_args()


def run(args: argparse.Namespace) -> int:
    report = Report(started_at=now_utc())
    report.input_path = str(Path(args.input).resolve())
    report.output_path = str(Path(args.output).resolve())

    config = load_config(Path(args.config).resolve() if args.config else None)
    source = Path(args.input).resolve()
    output = Path(args.output).resolve()
    report_path = (
        Path(args.report).resolve()
        if args.report
        else output.with_name(output.stem + ".pipeline-report.json")
    )

    try:
        if not source.exists():
            raise FileNotFoundError(f"FBX not found: {source}")

        report.vrm_addon_available = vrm_api_available()
        if not report.vrm_addon_available:
            report.add(
                "WARNING",
                "VRM_ADDON_UNAVAILABLE",
                "FBX audit can run, but Humanoid/MToon/export/reimport need the VRM Add-on.",
            )

        if config["pipeline"]["clean_scene_first"] and not args.keep_imported_scene:
            clear_scene()

        import_fbx(source, config, report)
        armature = choose_armature(report)
        audit_geometry(armature, report)
        repair_weights(armature, config, report)
        apply_mesh_transforms(report, config)
        ensure_shape_keys(config, report)

        if report.vrm_addon_available:
            configure_humanoid(armature, config, report)
            configure_mtoon(config, report)
            configure_metadata(armature, config, report)

        if report.errors:
            report.status = "BLOCKED_BY_AUDIT_ERRORS"
        elif not config["pipeline"]["export_vrm"]:
            report.status = "AUDIT_ONLY"
        elif export_vrm(output, report):
            if config["pipeline"]["reimport_audit"]:
                reimport_audit(output, report)
                report.status = "PASS" if not report.errors else "FAIL_REIMPORT_AUDIT"
            else:
                report.status = "EXPORTED_NOT_REIMPORTED"
        else:
            report.status = "EXPORT_FAILED"

        if config["pipeline"]["save_staging_blend"]:
            staging = output.with_name(config["pipeline"]["staging_blend_name"])
            staging.parent.mkdir(parents=True, exist_ok=True)
            bpy.ops.wm.save_as_mainfile(filepath=str(staging))
            report.note(f"Saved staging blend: {staging}")

        report.finished_at = now_utc()
        if config["pipeline"]["write_report"]:
            write_report(report_path, report)

        print(json.dumps(report.to_dict(), ensure_ascii=False, indent=2))
        return 0 if report.status in {"PASS", "AUDIT_ONLY", "EXPORTED_NOT_REIMPORTED"} else 2

    except Exception as exc:
        report.status = "CRASHED"
        report.add("ERROR", "UNHANDLED_EXCEPTION", f"{type(exc).__name__}: {exc}")
        report.metrics["traceback"] = traceback.format_exc()
        report.finished_at = now_utc()
        try:
            write_report(report_path, report)
        except Exception:
            pass
        traceback.print_exc(file=sys.stderr)
        return 1


def main() -> int:
    return run(parse_args())


if __name__ == "__main__":
    raise SystemExit(main())
