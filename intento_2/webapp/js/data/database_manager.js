(() => {
  "use strict";

  const STORAGE_KEY = "bosozoku_admin_db";
  const RECOVERY_PREFIX = `${STORAGE_KEY}_recovery_`;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  const DatabaseManager = {
    STORAGE_KEY,

    db: {
      schemaVersion: window.CURRENT_SCHEMA_VERSION || 2,
      waifus: [],
      cards: []
    },

    lastLoadReport: null,

    init(defaultDb = null) {
      let rawData = null;

      try {
        rawData = window.localStorage.getItem(STORAGE_KEY);
      } catch (error) {
        console.error("[Bosozoku Storage] No se pudo acceder a localStorage:", error);
      }

      if (rawData !== null) {
        try {
          const parsed = JSON.parse(rawData);
          const report = window.SchemaValidator.validatePayload(parsed);
          this.lastLoadReport = report;

          if (report.valid) {
            const requiresRecoverySnapshot =
              report.rejectedWaifus > 0
              || report.rejectedCards > 0
              || report.sourceSchemaVersion !== report.schemaVersion;

            if (requiresRecoverySnapshot) {
              this.backupCorruptedData(
                rawData,
                report.rejectedWaifus || report.rejectedCards
                  ? "sanitizacion_parcial"
                  : "migracion_esquema",
                report.errors
              );

              console.warn(
                "[Bosozoku Storage] Migración/sanitización aplicada:",
                {
                  fromVersion: report.sourceSchemaVersion,
                  toVersion: report.schemaVersion,
                  rejectedWaifus: report.rejectedWaifus,
                  rejectedCards: report.rejectedCards,
                  errors: report.errors
                }
              );
            }

            this.db = window.SchemaValidator.toDatabase(report);

            try {
              this.savePhysical();
            } catch (saveError) {
              console.warn(
                "[Bosozoku Storage] Datos válidos cargados en memoria, pero falló su persistencia física:",
                saveError
              );
            }

            return {
              success: true,
              source: "localStorage",
              migrated: report.sourceSchemaVersion !== report.schemaVersion,
              report
            };
          }

          this.backupCorruptedData(rawData, "validacion_fallida", report.errors);
        } catch (parseError) {
          this.backupCorruptedData(rawData, "json_malformado", [parseError.message]);
        }
      }

      return this.seed(defaultDb);
    },

    backupCorruptedData(rawContent, reason, errors = []) {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const suffix = typeof window.generateUUID === "function"
        ? window.generateUUID().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 12)
        : String(Date.now());

      const recoveryKey = `${RECOVERY_PREFIX}${stamp}_${suffix}`;

      try {
        window.localStorage.setItem(
          recoveryKey,
          JSON.stringify({
            reason,
            timestamp: new Date().toISOString(),
            errors,
            payload: rawContent
          })
        );

        console.warn("[Bosozoku Storage] Snapshot de recuperación creado:", recoveryKey);
        return recoveryKey;
      } catch (error) {
        console.error("[Bosozoku Storage] No se pudo crear el snapshot de recuperación:", error);
        return null;
      }
    },

    seed(defaultDb = null) {
      if (defaultDb) {
        const report = window.SchemaValidator.validatePayload(defaultDb);

        if (!report.valid) {
          console.error("[Bosozoku Storage] DefaultDatabase inválida:", report.errors);
          this.db = {
            schemaVersion: window.CURRENT_SCHEMA_VERSION || 2,
            waifus: [],
            cards: []
          };
        } else {
          this.db = window.SchemaValidator.toDatabase(report);
        }
      } else {
        this.db = {
          schemaVersion: window.CURRENT_SCHEMA_VERSION || 2,
          waifus: [],
          cards: []
        };
      }

      let persisted = true;

      try {
        this.savePhysical();
      } catch (error) {
        persisted = false;
        console.warn(
          "[Bosozoku Storage] Semilla disponible en memoria, pero no pudo persistirse:",
          error
        );
      }

      return {
        success: true,
        source: "defaults",
        persisted,
        db: this.snapshot()
      };
    },

    resetToDefaults(defaultDb = null) {
      if (!defaultDb) {
        return {
          success: false,
          error: "Base por defecto no provista."
        };
      }

      const result = this.seed(defaultDb);
      return {
        ...result,
        reset: true
      };
    },

    savePhysical() {
      const payload = JSON.stringify(this.db);
      window.localStorage.setItem(STORAGE_KEY, payload);
    },

    transaction(mutationFn) {
      if (typeof mutationFn !== "function") {
        return {
          success: false,
          error: "MutationFn debe ser una función."
        };
      }

      const backupInMemory = clone(this.db);

      try {
        const draft = clone(this.db);
        mutationFn(draft);

        const report = window.SchemaValidator.validatePayload(draft);

        if (
          !report.valid
          || report.rejectedWaifus > 0
          || report.rejectedCards > 0
        ) {
          throw new Error(
            `Transacción rechazada: ${report.rejectedWaifus} Waifus y ${report.rejectedCards} Cartas rechazadas.`
          );
        }

        const nextDb = window.SchemaValidator.toDatabase(report);
        this.db = nextDb;

        try {
          this.savePhysical();
        } catch (persistError) {
          this.db = backupInMemory;
          throw persistError;
        }

        return {
          success: true,
          report: {
            ...report,
            persisted: true
          }
        };
      } catch (error) {
        this.db = backupInMemory;
        console.error("[Bosozoku Storage] Transacción abortada:", error);

        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    },

    addOrUpdateWaifu(waifuRaw) {
      const normalized = window.SchemaValidator.normalizeWaifu(waifuRaw);

      if (!normalized) {
        return {
          success: false,
          error: "Waifu no cumple con las restricciones de dominio."
        };
      }

      return this.transaction((draft) => {
        const index = draft.waifus.findIndex((waifu) => waifu.id === normalized.id);

        if (index >= 0) {
          draft.waifus[index] = normalized;
        } else {
          draft.waifus.push(normalized);
        }
      });
    },

    addOrUpdateCard(cardRaw) {
      const validWaifuIds = new Set(this.db.waifus.map((waifu) => waifu.id));
      const normalized = window.SchemaValidator.normalizeCard(cardRaw, validWaifuIds);

      if (!normalized) {
        return {
          success: false,
          error: "Carta inválida o asignada a una Waifu inexistente."
        };
      }

      return this.transaction((draft) => {
        const index = draft.cards.findIndex((card) => card.id === normalized.id);

        if (index >= 0) {
          draft.cards[index] = normalized;
        } else {
          draft.cards.push(normalized);
        }
      });
    },

    deleteWaifu(waifuId) {
      const normalizedId = typeof waifuId === "string" ? waifuId.trim() : "";

      if (!normalizedId) {
        return {
          success: false,
          error: "ID de Waifu no válido."
        };
      }

      return this.transaction((draft) => {
        draft.waifus = draft.waifus.filter((waifu) => waifu.id !== normalizedId);
        draft.cards = draft.cards.filter((card) => card.waifuOwnerId !== normalizedId);
      });
    },

    importJSON(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        const report = window.SchemaValidator.validatePayload(parsed);

        if (!report.valid) {
          return {
            success: false,
            error: report.errors.join(" ") || "Payload inválido.",
            report
          };
        }

        if (report.waifus.length === 0 && report.cards.length === 0) {
          return {
            success: false,
            error: "El JSON no contiene registros válidos.",
            report
          };
        }

        const result = this.transaction((draft) => {
          draft.waifus = report.waifus;
          draft.cards = report.cards;
        });

        return {
          ...result,
          rejectedCount: report.rejectedWaifus + report.rejectedCards,
          report
        };
      } catch (error) {
        return {
          success: false,
          error: "Formato JSON malformado."
        };
      }
    },

    exportJSON() {
      return JSON.stringify(this.db, null, 2);
    },

    downloadExport(filename = "bosozoku_database.json") {
      if (
        typeof Blob === "undefined"
        || typeof URL === "undefined"
        || typeof URL.createObjectURL !== "function"
        || typeof document === "undefined"
      ) {
        return {
          success: false,
          error: "Exportación por descarga no disponible en este entorno."
        };
      }

      const blob = new Blob([this.exportJSON()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = filename;
      anchor.style.display = "none";
      document.body.appendChild(anchor);

      try {
        anchor.click();
      } finally {
        anchor.remove();
        URL.revokeObjectURL(url);
      }

      return { success: true, filename };
    },

    snapshot() {
      return clone(this.db);
    }
  };

  window.DatabaseManager = DatabaseManager;
})();
