const SUPPORTED_EXTENSIONS = Object.freeze(["glb", "gltf"]);
const MAX_MODEL_BYTES = 64 * 1024 * 1024;

export function normalizeAvatarAsset(input) {
  if (!input || typeof input !== "object") {
    return null;
  }

  const url = typeof input.url === "string" && input.url.trim()
    ? input.url.trim()
    : null;
  const path = typeof input.path === "string" && input.path.trim()
    ? input.path.trim()
    : null;
  const name = typeof input.name === "string" && input.name.trim()
    ? input.name.trim()
    : inferName(path || url);

  const extension = normalizeExtension(
    typeof input.extension === "string" ? input.extension : extensionFrom(name)
  );
  const sizeBytes = Number.isFinite(Number(input.sizeBytes))
    ? Number(input.sizeBytes)
    : null;

  if (!url && !path) return null;
  if (!SUPPORTED_EXTENSIONS.includes(extension)) return null;
  if (sizeBytes != null && (sizeBytes < 0 || sizeBytes > MAX_MODEL_BYTES)) {
    return null;
  }

  return Object.freeze({
    kind: "avatar-model",
    format: extension,
    name,
    url,
    path,
    sizeBytes
  });
}

export function validateAvatarAsset(asset) {
  if (!asset || typeof asset !== "object") {
    return { valid: false, error: "asset missing" };
  }

  if (!SUPPORTED_EXTENSIONS.includes(normalizeExtension(asset.format))) {
    return { valid: false, error: "unsupported avatar format" };
  }

  if (
    typeof asset.url !== "string" &&
    typeof asset.path !== "string"
  ) {
    return { valid: false, error: "asset needs url or path" };
  }

  const sizeBytes = asset.sizeBytes == null ? null : Number(asset.sizeBytes);
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0 || sizeBytes > MAX_MODEL_BYTES) {
    return { valid: false, error: "avatar asset size exceeds local safety limit" };
  }

  return { valid: true, error: null };
}

export function supportedAvatarExtensions() {
  return [...SUPPORTED_EXTENSIONS];
}

export const AVATAR_MODEL_MAX_BYTES = MAX_MODEL_BYTES;

function extensionFrom(value) {
  const normalized = String(value || "").split(/[?#]/, 1)[0];
  const match = normalized.match(/\.([^.\\/]+)$/);
  return match ? match[1].toLowerCase() : "";
}

function normalizeExtension(value) {
  return String(value || "")
    .replace(/^\./, "")
    .toLowerCase();
}

function inferName(value) {
  const normalized = String(value || "").split(/[?#]/, 1)[0];
  const parts = normalized.split(/[\\/]/);
  return parts[parts.length - 1] || "avatar";
}
