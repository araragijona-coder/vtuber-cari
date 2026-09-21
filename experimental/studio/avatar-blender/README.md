# Cari V1 - Blender to VRM 1.0

Pipeline automatizado para una entrega FBX real de Cari. No contiene el modelo final ni runtimes propietarios.

## Flujo

FBX -> audit -> cleanup -> facial keys -> Humanoid -> MToon -> metadata -> VRM -> reimport audit

## Ejecucion

PowerShell:

blender.exe --background --python experimental/studio/avatar-blender/cari_vrm_pipeline.py -- --input C:\Assets\Cari\cari_base.fbx --output C:\Assets\Cari\exports\cari_v1.vrm --config experimental/studio/avatar-blender/cari_v1_vrm_pipeline.json

Wrapper:

powershell -ExecutionPolicy Bypass -File experimental/studio/avatar-blender/run-cari-vrm-pipeline.ps1 -InputFbx C:\Assets\Cari\cari_base.fbx -OutputVrm C:\Assets\Cari\exports\cari_v1.vrm

## Dependencia

Requiere el VRM Add-on for Blender para Humanoid VRM 1.0, MToon, export y reimport. La documentacion oficial actual expone esos operadores y APIs.

## Shape Keys

Los nombres cari_* se crean como placeholders cuando falta el rig facial real. El script no inventa deformaciones: los marca como PLACEHOLDER para el rigger.

## Auditoria

El reporte JSON registra geometria, UV, armature, weights, shape keys, Humanoid, MToon, metadata, export y reimport.

## Produccion

VRM_PIPELINE_READY requiere auditoria + export + reimport correctos.
VRM_PRODUCTION_READY requiere arte V1 aprobado, rig facial real, tracking, lip-sync, compositor y validacion Windows/hardware.

## Integracion Cari Studio

Blender -> VRM/GLB -> ThreeAvatarRenderer -> FaceTrackingBridge -> compositor Cari Studio

El namespace de actuacion continua siendo backend-neutral y se comparte con el manifest de parametros de Cari.

## Licencias

No se distribuyen Cubism Core, el VRM Add-on ni assets finales de terceros dentro del repositorio. Registrar la procedencia final en assets/cari/ASSET_LICENSE.md.