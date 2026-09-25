(() => {
  "use strict";

  const CURRENT_SCHEMA_VERSION = 2;

  const SchemaValidator = {
    CURRENT_VERSION: CURRENT_SCHEMA_VERSION,

    LIMITS: {
      HP: { MIN: 1, MAX: 9999 },
      ATK: { MIN: 0, MAX: 999 },
      DEF: { MIN: 0, MAX: 999 },
      SPEED: { MIN: 0, MAX: 999 },
      ENERGY_COST: { MIN: 1, MAX: 3 },
      NITRO_GAIN: { MIN: 0, MAX: 100 },
      ULT_DAMAGE: { MIN: 0, MAX: 9999 },
      ULT_COST: { MIN: 0, MAX: 100 }
    },

    ALLOWED_RARITIES: new Set(["SSR", "SR", "R", "Common"]),
    ALLOWED_ELEMENTS: new Set(["FIRE", "WATER", "WIND", "LIGHT", "DARK", "NEUTRAL"]),
    ALLOWED_EFFECTS: new Set(["DAMAGE", "SHIELD", "NITRO_BOOST"]),

    normalizeWaifu(waifu) {
      if (!waifu || typeof waifu !== "object") {
        return null;
      }

      const id = typeof waifu.id === "string" ? waifu.id.trim() : "";
      const name = typeof waifu.name === "string" ? waifu.name.trim() : "";

      if (!id || !name) {
        return null;
      }

      const rawRarity = typeof waifu.rarity === "string"
        ? waifu.rarity.trim()
        : "Common";
      const rarity = this.ALLOWED_RARITIES.has(rawRarity)
        ? rawRarity
        : "Common";

      const rawElement = typeof waifu.element === "string"
        ? waifu.element.toUpperCase().trim()
        : "NEUTRAL";
      const element = this.ALLOWED_ELEMENTS.has(rawElement)
        ? rawElement
        : "NEUTRAL";

      const rawStats = waifu.baseStats && typeof waifu.baseStats === "object"
        ? waifu.baseStats
        : {};

      const hp = Number.isFinite(rawStats.hp)
        && rawStats.hp >= this.LIMITS.HP.MIN
        && rawStats.hp <= this.LIMITS.HP.MAX
        ? rawStats.hp
        : null;

      const atk = Number.isFinite(rawStats.atk)
        && rawStats.atk >= this.LIMITS.ATK.MIN
        && rawStats.atk <= this.LIMITS.ATK.MAX
        ? rawStats.atk
        : null;

      if (hp === null || atk === null) {
        return null;
      }

      const def = Number.isFinite(rawStats.def)
        && rawStats.def >= this.LIMITS.DEF.MIN
        && rawStats.def <= this.LIMITS.DEF.MAX
        ? rawStats.def
        : 0;

      const speed = Number.isFinite(rawStats.speed)
        && rawStats.speed >= this.LIMITS.SPEED.MIN
        && rawStats.speed <= this.LIMITS.SPEED.MAX
        ? rawStats.speed
        : 10;

      const rawUltimate = waifu.ultimate && typeof waifu.ultimate === "object"
        ? waifu.ultimate
        : {};

      const ultimate = {
        name: typeof rawUltimate.name === "string" && rawUltimate.name.trim() !== ""
          ? rawUltimate.name.trim()
          : "Overclock",
        damage: Number.isFinite(rawUltimate.damage)
          && rawUltimate.damage >= this.LIMITS.ULT_DAMAGE.MIN
          && rawUltimate.damage <= this.LIMITS.ULT_DAMAGE.MAX
          ? rawUltimate.damage
          : 50,
        costNitro: Number.isFinite(rawUltimate.costNitro)
          && rawUltimate.costNitro >= this.LIMITS.ULT_COST.MIN
          && rawUltimate.costNitro <= this.LIMITS.ULT_COST.MAX
          ? rawUltimate.costNitro
          : 100
      };

      const rawAssets = waifu.assets && typeof waifu.assets === "object"
        ? waifu.assets
        : {};

      const assets = {
        avatar: typeof rawAssets.avatar === "string" ? rawAssets.avatar : "",
        sprite: typeof rawAssets.sprite === "string" ? rawAssets.sprite : "",
        icon: typeof rawAssets.icon === "string" ? rawAssets.icon : "",
        cutin: typeof rawAssets.cutin === "string" ? rawAssets.cutin : ""
      };

      return {
        id,
        name,
        rarity,
        element,
        baseStats: { hp, atk, def, speed },
        ultimate,
        assets
      };
    },

    normalizeCard(card, validWaifuIds) {
      if (!card || typeof card !== "object") {
        return null;
      }

      const id = typeof card.id === "string" ? card.id.trim() : "";
      const title = typeof card.title === "string"
        ? card.title.trim()
        : (typeof card.name === "string" ? card.name.trim() : "");
      const waifuOwnerId = typeof card.waifuOwnerId === "string"
        ? card.waifuOwnerId.trim()
        : "";

      if (!id || !title || !waifuOwnerId || !validWaifuIds.has(waifuOwnerId)) {
        return null;
      }

      const energyCost = Number.isFinite(card.energyCost)
        && card.energyCost >= this.LIMITS.ENERGY_COST.MIN
        && card.energyCost <= this.LIMITS.ENERGY_COST.MAX
        ? card.energyCost
        : 1;

      const nitroGain = Number.isFinite(card.nitroGain)
        && card.nitroGain >= this.LIMITS.NITRO_GAIN.MIN
        && card.nitroGain <= this.LIMITS.NITRO_GAIN.MAX
        ? card.nitroGain
        : 10;

      const rawEffect = typeof card.effectType === "string"
        ? card.effectType.toUpperCase()
        : "DAMAGE";

      const effectType = this.ALLOWED_EFFECTS.has(rawEffect)
        ? rawEffect
        : "DAMAGE";

      const icon = typeof card.icon === "string" ? card.icon : "🎴";

      return {
        id,
        title,
        energyCost,
        nitroGain,
        effectType,
        waifuOwnerId,
        icon
      };
    },

    validatePayload(rawData) {
      const report = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        sourceSchemaVersion: null,
        waifus: [],
        cards: [],
        rejectedWaifus: 0,
        rejectedCards: 0,
        errors: [],
        valid: false
      };

      if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
        report.errors.push("Payload no es un objeto válido.");
        return report;
      }

      const inputVersion = Number.isInteger(rawData.schemaVersion)
        ? rawData.schemaVersion
        : 1;

      report.sourceSchemaVersion = inputVersion;

      if (inputVersion < 1) {
        report.errors.push(`Versión de esquema inválida: v${inputVersion}.`);
        return report;
      }

      if (inputVersion > CURRENT_SCHEMA_VERSION) {
        report.errors.push(`Versión de esquema no soportada: v${inputVersion}.`);
        return report;
      }

      const seenWaifuIds = new Set();
      const rawWaifus = Array.isArray(rawData.waifus) ? rawData.waifus : [];

      for (const rawWaifu of rawWaifus) {
        const normalized = this.normalizeWaifu(rawWaifu);

        if (!normalized) {
          report.rejectedWaifus += 1;
          continue;
        }

        if (seenWaifuIds.has(normalized.id)) {
          report.rejectedWaifus += 1;
          report.errors.push(`ID Waifu duplicado: ${normalized.id}`);
          continue;
        }

        seenWaifuIds.add(normalized.id);
        report.waifus.push(normalized);
      }

      const validWaifuIds = new Set(report.waifus.map((waifu) => waifu.id));
      const seenCardIds = new Set();
      const rawCards = Array.isArray(rawData.cards) ? rawData.cards : [];

      for (const rawCard of rawCards) {
        const normalized = this.normalizeCard(rawCard, validWaifuIds);

        if (!normalized) {
          report.rejectedCards += 1;
          continue;
        }

        if (seenCardIds.has(normalized.id)) {
          report.rejectedCards += 1;
          report.errors.push(`ID Carta duplicado: ${normalized.id}`);
          continue;
        }

        seenCardIds.add(normalized.id);
        report.cards.push(normalized);
      }

      report.valid = true;
      return report;
    },

    toDatabase(report) {
      if (!report || !report.valid) {
        throw new Error("No se puede construir la base desde un reporte inválido.");
      }

      return {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        waifus: report.waifus.map((waifu) => ({ ...waifu })),
        cards: report.cards.map((card) => ({ ...card }))
      };
    }
  };

  window.SchemaValidator = SchemaValidator;
  window.CURRENT_SCHEMA_VERSION = CURRENT_SCHEMA_VERSION;
})();
