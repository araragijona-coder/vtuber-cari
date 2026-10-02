(() => {
  "use strict";

  function finite(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  }

  function positiveFinite(value, fallback = 1) {
    const result = finite(value, fallback);
    return result > 0 ? result : fallback;
  }

  function positiveInteger(value, fallback = 1) {
    const result = Math.floor(Number(value));
    return Number.isFinite(result) && result >= 1 ? result : fallback;
  }

  function normalizePoint(point = {}) {
    return {
      x: finite(point.x),
      y: finite(point.y)
    };
  }

  function copyPoints(points) {
    return points.map(normalizePoint);
  }

  function zeroOffsets(count) {
    return Array.from({ length: count }, () => ({ x: 0, y: 0 }));
  }

  function normalizeOffsets(offsets, count) {
    if (offsets === undefined) return zeroOffsets(count);
    if (!Array.isArray(offsets) || offsets.length !== count) {
      throw new RangeError("Mesh deformation offsets must match vertex count");
    }
    return offsets.map(normalizePoint);
  }

  function generateGrid(width, height, subdivisions) {
    const vertices = [];
    for (let y = 0; y <= subdivisions.y; y += 1) {
      for (let x = 0; x <= subdivisions.x; x += 1) {
        vertices.push({
          x: width * (x / subdivisions.x),
          y: height * (y / subdivisions.y)
        });
      }
    }
    return vertices;
  }

  function create(spec = {}) {
    const width = positiveFinite(spec.width, 1);
    const height = positiveFinite(spec.height, 1);
    const subdivisions = Object.freeze({
      x: positiveInteger(spec.subdivisions?.x, 2),
      y: positiveInteger(spec.subdivisions?.y, 2)
    });
    const expectedVertexCount = (subdivisions.x + 1) * (subdivisions.y + 1);
    const customVertices = Array.isArray(spec.vertices) && spec.vertices.length > 0;
    const baseVertices = customVertices
      ? copyPoints(spec.vertices)
      : generateGrid(width, height, subdivisions);
    const initialOffsets = normalizeOffsets(spec.deformation?.offsets, baseVertices.length);
    const meshEnabled = spec.enabled === true;
    let deformationEnabled = spec.deformation?.enabled !== false;
    let currentOffsets = initialOffsets;

    if (!customVertices && baseVertices.length !== expectedVertexCount) {
      throw new RangeError("Generated mesh vertex count mismatch");
    }

    function getBaseVertices() {
      return copyPoints(baseVertices);
    }

    function getDeformationOffsets() {
      return copyPoints(currentOffsets);
    }

    function setDeformationOffsets(nextOffsets = []) {
      currentOffsets = normalizeOffsets(nextOffsets, baseVertices.length);
      return getDeformationOffsets();
    }

    function getVertices() {
      if (!meshEnabled || !deformationEnabled) return getBaseVertices();
      return baseVertices.map((base, index) => ({
        x: base.x + currentOffsets[index].x,
        y: base.y + currentOffsets[index].y
      }));
    }

    function resetDeformation() {
      currentOffsets = zeroOffsets(baseVertices.length);
      return getVertices();
    }

    function getSnapshot() {
      return {
        enabled: meshEnabled,
        width,
        height,
        subdivisions: { ...subdivisions },
        vertices: getBaseVertices(),
        deformation: {
          enabled: deformationEnabled,
          offsets: getDeformationOffsets()
        }
      };
    }

    function setDeformationEnabled(enabled) {
      deformationEnabled = Boolean(enabled);
      return deformationEnabled;
    }

    return Object.freeze({
      enabled: meshEnabled,
      width,
      height,
      subdivisions,
      getBaseVertices,
      getDeformationOffsets,
      setDeformationOffsets,
      getVertices,
      resetDeformation,
      setDeformationEnabled,
      getSnapshot
    });
  }

  window.MachGirlsMeshDeformation = Object.freeze({ create });
})();
