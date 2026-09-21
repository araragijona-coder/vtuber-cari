import importlib.util
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "tools" / "verify_bitacora.py"


def load_validator():
    spec = importlib.util.spec_from_file_location("verify_bitacora", MODULE)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load validator: {MODULE}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class VerifyBitacoraTests(unittest.TestCase):
    def valid_memory(self, head: str = "abcdef123456") -> str:
        return f"""# Cari Studio — Bitácora maestra de ingeniería

## Estado actual
- Ingeniería canónica actual: **71%**.
- Producto usable/end-user: **58%**.
- Seguimiento global: **65%**.
- Último head auditado: {head}.

## Estados de trabajo
- IMPLEMENTADO

# NO REPETIR
- WGC ya investigado.

## LOG-001 — test
Estado: IMPLEMENTADO

### NO REPETIR
- No repetir WGC.

### Siguiente acción
Validar Windows.

## LOG-002 — test
Estado: VERIFICADO

### NO REPETIR
- No repetir scheduler.

### Siguiente acción
Validar hardware.
"""

    def make_root(self, bitacora: str, status=(71, 58, 65)) -> Path:
        root = Path(tempfile.mkdtemp(prefix="cari-bitacora-test-"))
        studio = root / "experimental" / "studio"
        studio.mkdir(parents=True)
        (studio / "BITACORA.md").write_text(bitacora, encoding="utf-8")
        engineering, product, tracking = status
        (studio / "PROJECT_STATUS.md").write_text(
            "\n".join((
                f"- Ingeniería canónica actual: **{engineering}%**.",
                f"- Producto usable/end-user: **{product}%**.",
                f"- Seguimiento global: **{tracking}%**.",
            )),
            encoding="utf-8",
        )
        (studio / "ENGINEERING_LOG.md").write_text(
            """# Log

Fuente canónica de continuidad: experimental/studio/BITACORA.md

## LOG-002
Estado: VERIFICADO
### NO REPETIR
- no repetir
### Siguiente acción
- validar
""",
            encoding="utf-8",
        )
        (studio / "CHANGELOG_ENGINEERING.md").write_text(
            "No usar cantidad de commits como medida de progreso.\n",
            encoding="utf-8",
        )
        return root

    def test_valid_memory(self):
        module = load_validator()
        root = self.make_root(self.valid_memory())
        result = module.validate(root, expected_head="abcdef123456")
        self.assertEqual(result["last_log"], 2)
        self.assertEqual(
            result["percentages"],
            {"engineering": 71, "product": 58, "tracking": 65},
        )

    def test_duplicate_ids_rejected(self):
        module = load_validator()
        root = self.make_root(
            self.valid_memory().replace("## LOG-002", "## LOG-001")
        )
        with self.assertRaises(module.ValidationError):
            module.validate(root)

    def test_percentage_drift_rejected(self):
        module = load_validator()
        root = self.make_root(self.valid_memory(), status=(70, 58, 65))
        with self.assertRaises(module.ValidationError):
            module.validate(root)

    def test_head_drift_rejected(self):
        module = load_validator()
        root = self.make_root(self.valid_memory())
        with self.assertRaises(module.ValidationError):
            module.validate(root, expected_head="deadbeef123456")


if __name__ == "__main__":
    unittest.main()
