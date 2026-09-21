import tempfile
import unittest
from pathlib import Path

from tools.verify_bitacora import ValidationError, validate


class VerifyBitacoraTests(unittest.TestCase):
    def make_root(self, bitacora: str, status: tuple[int, int, int] = (71, 58, 65)) -> Path:
        root = Path(tempfile.mkdtemp(prefix="cari-bitacora-test-"))
        studio = root / "experimental" / "studio"
        studio.mkdir(parents=True)
        (studio / "BITACORA.md").write_text(bitacora, encoding="utf-8")
        engineering, product, tracking = status
        (studio / "PROJECT_STATUS.md").write_text(
            "\n".join([
                f"- Ingeniería canónica actual: **{engineering}**%.",
                f"- Producto usable/end-user: **{product}**%.",
                f"- Seguimiento global: **{tracking}**%.",
            ]),
            encoding="utf-8",
        )
        (studio / "ENGINEERING_LOG.md").write_text(
            "# Log\n\nFuente canónica de continuidad: experimental/studio/BITACORA.md\n",
            encoding="utf-8",
        )
        return root

    def valid_bitacora(self, head: str = "abcdef123456") -> str:
        return """# Cari Studio — Bitácora maestra de ingeniería

## Estado actual
- Ingeniería canónica actual: **71**%.
- Producto usable/end-user: **58**%.
- Seguimiento global: **65**%.
- Último head auditado: abcdef123456

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

    def test_valid_memory(self) -> None:
        root = self.make_root(self.valid_bitacora())
        result = validate(root, expected_head="abcdef123456")
        self.assertEqual(result["last_log"], 2)
        self.assertEqual(result["percentages"], {"engineering": 71, "product": 58, "tracking": 65})

    def test_rejects_duplicate_log_id(self) -> None:
        root = self.make_root(self.valid_bitacora().replace("## LOG-002", "## LOG-001"))
        with self.assertRaises(ValidationError):
            validate(root)

    def test_rejects_percentage_drift(self) -> None:
        root = self.make_root(self.valid_bitacora(), status=(70, 58, 65))
        with self.assertRaises(ValidationError):
            validate(root)

    def test_rejects_head_mismatch(self) -> None:
        root = self.make_root(self.valid_bitacora())
        with self.assertRaises(ValidationError):
            validate(root, expected_head="deadbeef123456")


if __name__ == "__main__":
    unittest.main()
