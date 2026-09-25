(() => {
  "use strict";

  const AdminUI = {
    renderPreview(containerEl, waifuData) {
      if (!containerEl || !waifuData) {
        return;
      }

      while (containerEl.firstChild) {
        containerEl.removeChild(containerEl.firstChild);
      }

      const cardBox = document.createElement("div");
      cardBox.className = "waifu-card-preview";

      const titleEl = document.createElement("h4");
      titleEl.textContent = `${waifuData.name || "Sin Nombre"} [${waifuData.rarity || "Common"}]`;

      const detailsEl = document.createElement("p");
      const stats = waifuData.baseStats || {};
      detailsEl.textContent =
        `Elemento: ${waifuData.element || "NEUTRAL"} | HP: ${stats.hp ?? 0} | ATK: ${stats.atk ?? 0} | DEF: ${stats.def ?? 0} | SPD: ${stats.speed ?? 0}`;

      const ultimateEl = document.createElement("p");
      const ultimate = waifuData.ultimate || {};
      const ultimateSmall = document.createElement("small");
      ultimateSmall.textContent =
        `Habilidad Ultimate: ${ultimate.name || "Overclock"} (Daño: ${ultimate.damage ?? 0}, Costo Nitro: ${ultimate.costNitro ?? 0})`;

      ultimateEl.appendChild(ultimateSmall);
      cardBox.appendChild(titleEl);
      cardBox.appendChild(detailsEl);
      cardBox.appendChild(ultimateEl);
      containerEl.appendChild(cardBox);
    }
  };

  window.AdminUI = AdminUI;
})();
