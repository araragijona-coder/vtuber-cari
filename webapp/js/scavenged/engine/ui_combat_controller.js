(() => {
  "use strict";

  const DEFAULTS = Object.freeze({
    actionSelector: [
      "[data-combat-action]",
      "[data-action]",
      ".combat-action"
    ].join(","),
    containerSelector: [
      "[data-combat-container]",
      ".combat-game",
      "#combat"
    ].join(","),
    hpBarSelector: [
      "[data-hp-bar]",
      ".hp-bar-fill",
      ".hp-fill"
    ].join(","),
    hpValueSelector: [
      "[data-hp-value]",
      ".hp-value"
    ].join(","),
    combatantSelector: [
      "[data-combatant-id]",
      "[data-team][data-slot]",
      "[data-combatant]"
    ].join(","),
    hpLerpEpsilon: 0.05,
    hpLerpFactor: 0.22,
    floatingDurationMs: 780,
    floatingRisePx: 72,
    shakeDurationMs: 280,
    glitchDurationMs: 640,
    dodgeDurationMs: 220
  });

  const controllerState = {
    combat: null,
    busy: false,
    boundButtons: false,
    boundEvents: new Set(),
    options: DEFAULTS,
    actionCards: [],
    cardByButton: new WeakMap(),
    rafId: null,
    hpAnimations: new Map(),
    floatingTexts: new Set(),
    initialized: false
  };

  function isObject(value) {
    return value !== null && typeof value === "object";
  }

  function numberOrNull(value) {
    return typeof value === "number" && Number.isFinite(value)
      ? value
      : null;
  }

  function stringOrNull(value) {
    if (typeof value !== "string") return null;
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function injectStyles() {
    if (document.getElementById("cari-combat-ui-controller-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "cari-combat-ui-controller-styles";
    style.textContent = [
      ".cari-screen-shake{animation:cari-screen-shake .28s cubic-bezier(.36,.07,.19,.97);will-change:transform}",
      ".cari-crt-glitch{position:relative;isolation:isolate}",
      ".cari-crt-glitch::before,.cari-crt-glitch::after{content:\"\";position:absolute;inset:0;pointer-events:none;z-index:9999;mix-blend-mode:screen}",
      ".cari-crt-glitch::before{background:repeating-linear-gradient(to bottom,rgba(139,0,255,.0) 0,rgba(139,0,255,.0) 3px,rgba(139,0,255,.35) 4px,rgba(139,0,255,.0) 7px);animation:cari-crt-lines .13s steps(2,end) infinite}",
      ".cari-crt-glitch::after{background:linear-gradient(90deg,rgba(139,0,255,0),rgba(139,0,255,.36),rgba(139,0,255,0));opacity:.0;animation:cari-crt-flash .22s steps(2,end) infinite}",
      ".cari-floating-combat-text{position:absolute;z-index:10000;pointer-events:none;user-select:none;white-space:nowrap;font:800 24px/1 system-ui,sans-serif;text-shadow:0 2px 0 rgba(0,0,0,.5),0 0 14px currentColor;transform:translate3d(0,0,0) scale(1);opacity:1;will-change:transform,opacity}",
      ".cari-floating-combat-text.cari-critical-text{font-size:36px;color:#ff1a1a;animation:cari-critical-wobble .18s steps(2,end) infinite}",
      ".cari-floating-combat-text.cari-normal-text{color:#fff}",
      ".cari-dodge-active{animation:cari-dodge-blink .22s steps(4,end)}",
      ".cari-action-pending{opacity:.58;cursor:wait!important}",
      "#action-dashboard,.cari-action-dashboard{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;width:100%;margin-top:8px}",
      ".cari-action-card{position:relative;display:flex;flex-direction:column;align-items:stretch;gap:6px;min-height:96px;padding:8px;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:linear-gradient(155deg,rgba(18,23,39,.96),rgba(8,12,23,.98));color:#fff;text-align:left;cursor:pointer;touch-action:manipulation;overflow:hidden}",
      ".cari-action-card:hover:not(:disabled){border-color:rgba(117,200,255,.7);transform:translateY(-1px)}",
      ".cari-action-card:disabled{opacity:.48;cursor:not-allowed}",
      ".cari-action-card.cari-ultimate-card{border-color:rgba(57,255,20,.62);box-shadow:0 0 12px rgba(57,255,20,.12) inset}",
      ".cari-action-art{display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:9px;background:rgba(255,255,255,.08);overflow:hidden}",
      ".cari-action-art img{width:100%;height:100%;object-fit:cover;image-rendering:pixelated;image-rendering:crisp-edges}",
      ".cari-action-art-placeholder{font:800 10px/1 monospace;color:rgba(255,255,255,.5);text-align:center;padding:3px}",
      ".cari-action-name{font:800 12px/1.1 system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".cari-action-meta{font:600 10px/1.1 system-ui,sans-serif;color:rgba(255,255,255,.58)}",
      ".cari-action-energy{display:flex;justify-content:space-between;align-items:center;font:800 11px/1 monospace;color:#39ff14}",
      "@media (max-width:720px){#action-dashboard,.cari-action-dashboard{grid-template-columns:repeat(2,minmax(0,1fr))}}",
      "@media (max-width:400px){#action-dashboard,.cari-action-dashboard{grid-template-columns:repeat(2,minmax(0,1fr))}.cari-action-card{min-height:88px}}",
      "@keyframes cari-screen-shake{0%,100%{transform:translate3d(0,0,0)}20%{transform:translate3d(-7px,3px,0)}40%{transform:translate3d(6px,-4px,0)}60%{transform:translate3d(-4px,-2px,0)}80%{transform:translate3d(4px,3px,0)}}",
      "@keyframes cari-crt-lines{0%{transform:translate3d(-2px,0,0);filter:hue-rotate(0deg)}50%{transform:translate3d(3px,0,0);filter:hue-rotate(35deg)}100%{transform:translate3d(-1px,0,0);filter:hue-rotate(-20deg)}}",
      "@keyframes cari-crt-flash{0%,100%{opacity:0}50%{opacity:1}}",
      "@keyframes cari-critical-wobble{0%{transform:translate3d(-2px,0,0) scale(1.02) rotate(-1deg)}50%{transform:translate3d(3px,-1px,0) scale(1.08) rotate(1deg)}100%{transform:translate3d(-1px,1px,0) scale(1.02) rotate(0)}}",
      "@keyframes cari-dodge-blink{0%{opacity:1;filter:brightness(1)}25%{opacity:.20;filter:brightness(1.8)}50%{opacity:.72;filter:brightness(1.35)}75%{opacity:.16;filter:brightness(2)}100%{opacity:1;filter:brightness(1)}}",
      "@media (prefers-reduced-motion:reduce){.cari-screen-shake,.cari-crt-glitch::before,.cari-crt-glitch::after,.cari-critical-wobble,.cari-dodge-active{animation-duration:.01ms!important;animation-iteration-count:1!important}.cari-floating-combat-text{transition:none!important}}"
    ].join("");
    document.head.appendChild(style);
  }

  function resolveContainer(options) {
    return document.querySelector(options.containerSelector) ||
      document.body;
  }

  function resolveNetwork() {
    if (window.CariApi?.sendCombatAction) {
      return {
        send: (payload, options) =>
          window.CariApi.sendCombatAction(payload, options)
      };
    }

    if (window.CariNetwork?.sendCombatAction) {
      return {
        send: (payload, options) =>
          window.CariNetwork.sendCombatAction(payload, options)
      };
    }

    return null;
  }

  function readEventDetail(event, fallback) {
    if (isObject(event) && "detail" in event && isObject(event.detail)) {
      return event.detail;
    }
    return isObject(fallback) ? fallback : {};
  }

  function subscribeEvent(combat, eventName, handler) {
    if (!combat) return false;

    const wrapped = (...args) => {
      const first = args[0];
      const payload = first instanceof Event
        ? readEventDetail(first, args[1])
        : (isObject(first) ? first : {});
      handler(payload);
    };

    if (typeof combat.on === "function") {
      const result = combat.on(eventName, wrapped);
      controllerState.boundEvents.add(() => {
        if (typeof combat.off === "function") {
          combat.off(eventName, wrapped);
        } else if (typeof combat.removeListener === "function") {
          combat.removeListener(eventName, wrapped);
        }
      });
      return result !== false;
    }

    if (typeof combat.addEventListener === "function") {
      combat.addEventListener(eventName, wrapped);
      controllerState.boundEvents.add(() =>
        combat.removeEventListener?.(eventName, wrapped)
      );
      return true;
    }

    return false;
  }

  function bindStateMachineEvents() {
    const combat = controllerState.combat;
    if (!combat) return;

    subscribeEvent(combat, "damage_taken", handleDamageTaken);
    subscribeEvent(combat, "critical_hit", handleCriticalHit);
    subscribeEvent(combat, "dodge_activated", handleDodge);
    subscribeEvent(combat, "correction", handleCorrection);
  }

  function getActionFromButton(button) {
    return stringOrNull(
      button?.dataset?.combatAction ||
      button?.dataset?.action ||
      button?.getAttribute("data-combat-action") ||
      button?.getAttribute("data-action")
    );
  }

  function resolveActionDashboard() {
    return document.querySelector(
      "[data-action-dashboard], #action-dashboard, .cari-action-dashboard"
    );
  }

  function readEquippedDeck() {
    const profile = window.CariAppBootstrap?.getProfile?.();
    const providers = [
      profile?.equippedCards,
      profile?.equipped_cards,
      profile?.deck?.cards,
      profile?.deck,
      window.CariCombatDeck?.getEquippedCards?.(),
      window.CariCombatDeck?.getState?.()?.equippedCards,
      controllerState.combat?.getEquippedCards?.(),
      controllerState.combat?.getDeck?.(),
      controllerState.combat?.deck
    ];

    for (const value of providers) {
      if (Array.isArray(value) && value.length) return value.slice();
    }

    return [
      { id: "basic_attack", actionType: "basic_attack", name: "Golpe Rápido", cost: 10, icon: "" },
      { id: "heavy_attack", actionType: "heavy_attack", name: "Martillazo", cost: 25, icon: "" },
      { id: "ally_skill", actionType: "ally_skill", name: "Apoyo Chibi", cooldown: 3, icon: "" },
      {
        id: "ultimate_demo",
        actionType: "ultimate",
        name: "ULTIMATE",
        ultimate: true,
        energyRequired: 100,
        cinematicUrl: "",
        icon: ""
      }
    ];
  }

  function normalizeActionCard(raw, index) {
    const source = isObject(raw) ? raw : {};
    const nested = isObject(source.card) ? source.card : source;
    const ultimate = Boolean(
      nested.ultimate ??
      nested.isUltimate ??
      nested.is_ultimate ??
      String(nested.type || "").toLowerCase() === "ultimate" ||
      String(nested.actionType || "").toLowerCase() === "ultimate"
    );

    return {
      id: stringOrNull(nested.id ?? nested.cardId ?? nested.card_id) || "card-" + String(index + 1),
      actionType: stringOrNull(
        nested.actionType ??
        nested.action_type ??
        nested.type ??
        nested.action ??
        nested.skill
      ) || (ultimate ? "ultimate" : "basic_attack"),
      name: stringOrNull(nested.name ?? nested.skillName ?? nested.skill_name) ||
        (ultimate ? "ULTIMATE" : "HABILIDAD"),
      icon: stringOrNull(
        nested.icon ??
        nested.iconUrl ??
        nested.icon_url ??
        nested.art ??
        nested.artUrl ??
        nested.art_url ??
        nested.image ??
        nested.imageUrl
      ) || "",
      cost: Number.isFinite(Number(nested.cost)) ? Number(nested.cost) : null,
      cooldown: Number.isFinite(Number(nested.cooldown)) ? Number(nested.cooldown) : null,
      ultimate,
      energyRequired: Number.isFinite(Number(nested.energyRequired))
        ? Number(nested.energyRequired)
        : 100,
      cinematicUrl: stringOrNull(
        nested.cinematicUrl ??
        nested.cinematic_url ??
        nested.cutInUrl ??
        nested.cut_in_url ??
        nested.webm ??
        nested.gif
      ) || ""
    };
  }

  function getActionCards() {
    const normalized = readEquippedDeck().map(normalizeActionCard);
    const ultimates = normalized.filter((card) => card.ultimate);
    const normals = normalized.filter((card) => !card.ultimate);

    const selected = [
      ...normals.slice(0, 3),
      ...(ultimates.length ? [ultimates[0]] : [])
    ];

    while (selected.length < 3) {
      selected.push(normalizeActionCard({
        id: "fallback-" + selected.length,
        actionType: "basic_attack",
        name: "Golpe Rápido"
      }, selected.length));
    }

    if (selected.length < 4) {
      selected.push(normalizeActionCard({
        id: "fallback-ultimate",
        actionType: "ultimate",
        name: "ULTIMATE",
        ultimate: true,
        energyRequired: 100
      }, 3));
    }

    return selected.slice(0, 4);
  }

  function currentUltimateEnergy() {
    const candidates = [
      controllerState.combat?.getUltimateEnergy?.(),
      controllerState.combat?.ultimateEnergy,
      controllerState.combat?.ultimate_energy,
      controllerState.combat?.getState?.()?.ultimateEnergy,
      controllerState.combat?.getState?.()?.ultimate_energy,
      window.CombatStateMachine?.instance?.ultimateEnergy,
      window.CombatStateMachine?.instance?.ultimate_energy,
      window.CariCombat?.getUltimateEnergy?.()
    ];

    return Math.max(
      0,
      Math.min(
        100,
        candidates.find((value) => typeof value === "number" && Number.isFinite(value)) ?? 0
      )
    );
  }

  function renderActionDashboard() {
    const container = resolveActionDashboard();
    if (!container) return;

    controllerState.actionCards = getActionCards();
    controllerState.cardByButton = new WeakMap();
    container.replaceChildren();

    const fragment = document.createDocumentFragment();
    const energy = currentUltimateEnergy();

    controllerState.actionCards.forEach((card) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className =
        "cari-action-card" + (card.ultimate ? " cari-ultimate-card" : "");
      button.dataset.combatAction = card.actionType;
      button.dataset.combatCardId = card.id;
      if (card.ultimate) button.dataset.combatUltimate = "true";
      if (card.cinematicUrl) button.dataset.cinematicUrl = card.cinematicUrl;
      button.setAttribute("aria-label", card.name);

      const art = document.createElement("span");
      art.className = "cari-action-art";

      if (card.icon) {
        const image = document.createElement("img");
        image.src = card.icon;
        image.alt = "";
        image.loading = "lazy";
        image.decoding = "async";
        art.appendChild(image);
      } else {
        const placeholder = document.createElement("span");
        placeholder.className = "cari-action-art-placeholder";
        placeholder.textContent = card.ultimate ? "ULTI" : "CARD";
        art.appendChild(placeholder);
      }

      const name = document.createElement("span");
      name.className = "cari-action-name";
      name.textContent = card.name;

      const meta = document.createElement("span");
      meta.className = "cari-action-meta";
      if (card.ultimate) {
        meta.textContent = "ENERGÍA " + Math.round(energy) + "% / " + Math.round(card.energyRequired) + "%";
      } else if (card.cooldown !== null) {
        meta.textContent = "CD " + String(card.cooldown);
      } else if (card.cost !== null) {
        meta.textContent = "COSTO " + String(card.cost);
      } else {
        meta.textContent = "LISTO";
      }

      button.append(art, name, meta);

      if (card.ultimate && energy < card.energyRequired) {
        button.disabled = true;
        button.title = "Ultimate requiere " + Math.round(card.energyRequired) + "% de energía.";
      }

      controllerState.cardByButton.set(button, card);
      fragment.appendChild(button);
    });

    container.appendChild(fragment);

    try {
      window.dispatchEvent(new CustomEvent("cari:action-dashboard-updated", {
        detail: {
          cards: controllerState.actionCards.map((card) => ({ ...card })),
          ultimateEnergy: energy
        }
      }));
    } catch (_error) {
      // Optional DOM integration.
    }
  }

  function actionCardForButton(button) {
    const stored = controllerState.cardByButton.get(button);
    if (stored) return stored;

    return normalizeActionCard({
      id: button?.dataset?.combatCardId,
      actionType: getActionFromButton(button),
      ultimate: button?.dataset?.combatUltimate === "true",
      cinematicUrl: button?.dataset?.cinematicUrl
    }, 0);
  }

  function isUltimateReady(combat, card) {
    if (!card?.ultimate) return true;
    const energy = currentUltimateEnergy();
    return energy >= Number(card.energyRequired || 100) &&
      (typeof combat?.canUseUltimate !== "function" || combat.canUseUltimate());
  }

  function setButtonsBusy(container, busy, activeButton) {
    const buttons = container.querySelectorAll(controllerState.options.actionSelector);
    buttons.forEach((button) => {
      if (!(button instanceof HTMLElement)) return;
      button.classList.toggle("cari-action-pending", busy);

      if (busy) {
        button.disabled = button !== activeButton;
        return;
      }

      const card = actionCardForButton(button);
      button.disabled = Boolean(
        card.ultimate && currentUltimateEnergy() < Number(card.energyRequired || 100)
      );
    });

    if (activeButton instanceof HTMLButtonElement && busy) {
      activeButton.disabled = true;
    }
  }

  function resolveUltimateTarget(response) {
    const targetId = response?.serverState?.target?.id;
    const combatState = window.CariCombat?.getState?.()?.combatInit;

    if (typeof targetId === "string" &&
        isObject(combatState)) {
      for (const teamName of ["player_team", "enemy_team"]) {
        const team = Array.isArray(combatState[teamName]) ? combatState[teamName] : [];
        const found = team.find((combatant) => combatant.character_id === targetId);
        if (found) {
          return {
            team: teamName === "player_team" ? "player" : "enemy",
            slot: found.slot
          };
        }
      }
    }

    const lastTarget = window.CariCombat?.getState?.()?.turnResult?.target;
    return lastTarget || { team: "enemy", slot: 0 };
  }

  async function playUltimateCutIn(card, response) {
    if (!card?.ultimate || typeof window.CariUltimateCutIn?.play !== "function") {
      return;
    }

    const target = resolveUltimateTarget(response);
    const damage = Number(response?.resolution?.damage) || 0;

    await window.CariUltimateCutIn.play({
      mediaUrl: card.cinematicUrl,
      alt: card.name,
      durationMs: 1500,
      onImpact: () => {
        try {
          window.CariCombat?.resolveUltimateImpact?.({
            target,
            damage
          });
        } catch (error) {
          console.warn("[CariCombatUI] Ultimate canvas impact failed:", error);
        }
      }
    });
  }

  async function handleAction(button, action) {
    if (controllerState.busy) return;
    if (!controllerState.combat) {
      console.warn("[CariCombatUI] CombatStateMachine is not attached.");
      return;
    }

    const combat = controllerState.combat;
    const card = actionCardForButton(button);

    if (!isUltimateReady(combat, card)) {
      setControllerStatus("ULTIMATE requiere 100% de energía.");
      return;
    }

    const network = resolveNetwork();
    if (!network) {
      console.error("[CariCombatUI] NetworkBridge/CariApi is not available.");
      return;
    }

    if (typeof combat.playerAction !== "function" ||
        typeof combat.toBackendPayload !== "function") {
      console.error(
        "[CariCombatUI] CombatStateMachine must expose playerAction() and toBackendPayload()."
      );
      return;
    }

    const container = resolveContainer(controllerState.options);
    controllerState.busy = true;
    setButtonsBusy(container, true, button);

    try {
      await combat.playerAction(action);

      const payload = combat.toBackendPayload();
      if (!isObject(payload)) {
        throw new Error("CombatStateMachine.toBackendPayload() must return an object");
      }

      const response = await network.send(payload);

      syncFromServer(response?.serverState, response);

      if (card.ultimate) {
        await playUltimateCutIn(card, response);
      }

      const outcome = response?.resolution?.outcome;
      if (outcome === "VICTORY" || outcome === "DEFEAT") {
        try {
          window.dispatchEvent(new CustomEvent("cari:combat-result", {
            detail: {
              outcome,
              response: structuredClone(response),
              payload: structuredClone(payload)
            }
          }));
        } catch (_error) {
          // Optional DOM bridge for the bootstrap/hardware layer.
        }
      }

      if (response?.replayed) {
        setControllerStatus("Acción confirmada por el servidor · replay seguro.");
      } else if (!controllerState.lastCorrection) {
        setControllerStatus("Acción confirmada.");
      }

      return response;
    } catch (error) {
      const status = numberOrNull(error?.status);

      if (status === 400) {
        setControllerStatus("Acción rechazada por la autoridad de combate.");
      } else if (status === 409) {
        setControllerStatus("Anomalía de acción detectada · ID reutilizado con datos distintos.");
      } else {
        setControllerStatus("Red no disponible · no se pudo confirmar la acción.");
      }

      console.error("[CariCombatUI] action failed:", error);
      throw error;
    } finally {
      controllerState.busy = false;
      setButtonsBusy(container, false, button);
      renderActionDashboard();
    }
  }

  function bindActionButtons(options) {
    if (controllerState.boundButtons) return;

    const container = resolveContainer(options);
    controllerState.options = options;

    container.addEventListener("click", (event) => {
      const target = event.target?.closest?.(options.actionSelector);
      if (!(target instanceof HTMLElement)) return;

      event.preventDefault();
      const action = getActionFromButton(target);
      if (!action) return;

      handleAction(target, action).catch(() => {});
    });

    controllerState.boundButtons = true;
  }

  function bindProfileDashboard() {
    if (controllerState.profileListenerBound) return;
    if (typeof window.addEventListener !== "function") return;

    window.addEventListener("cari:profile-updated", renderActionDashboard);
    window.addEventListener("cari:ultimate-energy", renderActionDashboard);
    controllerState.profileListenerBound = true;
  }

  function setControllerStatus(message) {
    const statusEl = document.querySelector(
      "[data-combat-status], #combat-status, .combat-status"
    );
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  function getTargetElement(detail) {
    const combatContainer = resolveContainer(DEFAULTS);
    if (!detail) return combatContainer;

    const directElement = detail.element;
    if (directElement instanceof HTMLElement) {
      return directElement;
    }

    const ids = [
      detail.targetId,
      detail.target_id,
      detail.combatantId,
      detail.combatant_id,
      detail.entityId,
      detail.entity_id
    ];

    for (const id of ids) {
      const normalized = stringOrNull(id);
      if (!normalized) continue;

      const escaped = CSS.escape(normalized);
      const element = combatContainer.querySelector(
        "[data-combatant-id=\"" + escaped + "\"]"
      );
      if (element) return element;
    }

    const team = stringOrNull(detail.team);
    const slot = numberOrNull(detail.slot);
    if (team && slot !== null) {
      const escapedTeam = CSS.escape(team);
      const element = combatContainer.querySelector(
        "[data-team=\"" + escapedTeam + "\"][data-slot=\"" + String(slot) + "\"]"
      );
      if (element) return element;
    }

    return combatContainer;
  }

  function getDamage(detail) {
    return numberOrNull(
      detail?.damage ??
      detail?.amount ??
      detail?.value ??
      detail?.combat_math?.damage ??
      detail?.combat_math?.damage_dealt
    );
  }

  function getFloatingPoint(target, detail) {
    const container = resolveContainer(DEFAULTS);
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const anchorX = numberOrNull(detail?.x);
    const anchorY = numberOrNull(detail?.y);

    return {
      x: anchorX !== null
        ? anchorX
        : targetRect.left - containerRect.left + targetRect.width / 2,
      y: anchorY !== null
        ? anchorY
        : targetRect.top - containerRect.top + Math.max(8, targetRect.height * 0.18)
    };
  }

  function createFloatingCombatText(detail, critical) {
    const damage = getDamage(detail);
    if (damage === null) return;

    const container = resolveContainer(DEFAULTS);
    const target = getTargetElement(detail);
    const point = getFloatingPoint(target, detail);

    const element = document.createElement("div");
    element.className =
      "cari-floating-combat-text " +
      (critical ? "cari-critical-text" : "cari-normal-text");
    element.textContent = critical
      ? "CRÍTICO -" + Math.round(Math.max(0, damage))
      : "-" + Math.round(Math.max(0, damage));
    element.style.left = String(point.x) + "px";
    element.style.top = String(point.y) + "px";

    container.appendChild(element);
    controllerState.floatingTexts.add(element);

    const startedAt = performance.now();
    const duration = DEFAULTS.floatingDurationMs;
    const rise = DEFAULTS.floatingRisePx;

    function frame(now) {
      if (!element.isConnected) {
        controllerState.floatingTexts.delete(element);
        return;
      }

      const progress = clamp((now - startedAt) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const wobble = critical
        ? Math.sin(progress * Math.PI * 14) * 3 * (1 - progress)
        : 0;

      element.style.transform =
        "translate3d(" +
        String(wobble) +
        "px," +
        String(-rise * eased) +
        "px,0) scale(" +
        String(critical ? 1 + Math.sin(progress * Math.PI) * 0.12 : 1) +
        ")";
      element.style.opacity = String(1 - progress);

      if (progress >= 1) {
        controllerState.floatingTexts.delete(element);
        element.remove();
        return;
      }

      window.requestAnimationFrame(frame);
    }

    window.requestAnimationFrame(frame);
  }

  function applyShake(container) {
    container.classList.remove("cari-screen-shake");
    void container.offsetWidth;
    container.classList.add("cari-screen-shake");

    window.setTimeout(
      () => container.classList.remove("cari-screen-shake"),
      DEFAULTS.shakeDurationMs
    );
  }

  function applyGlitch(container) {
    container.classList.remove("cari-crt-glitch");
    void container.offsetWidth;
    container.classList.add("cari-crt-glitch");

    setControllerStatus("⚠ ANOMALÍA DETECTADA · CORRECCIÓN DEL SERVIDOR");

    window.setTimeout(
      () => container.classList.remove("cari-crt-glitch"),
      DEFAULTS.glitchDurationMs
    );
  }

  function applyDodge(element) {
    element.classList.remove("cari-dodge-active");
    void element.offsetWidth;
    element.classList.add("cari-dodge-active");

    window.setTimeout(
      () => element.classList.remove("cari-dodge-active"),
      DEFAULTS.dodgeDurationMs
    );
  }

  function handleDamageTaken(detail) {
    try {
      if (detail?.team && Number.isInteger(detail?.slot)) {
        window.CariCombat?.setCombatantAnimation?.(detail.team, detail.slot, "HIT", 250);
      }
    } catch (_error) {
      // Sprite animation is optional.
    }

    const container = resolveContainer(controllerState.options);
    applyShake(container);
    createFloatingCombatText(detail, false);
  }

  function handleCriticalHit(detail) {
    try {
      if (detail?.team && Number.isInteger(detail?.slot)) {
        window.CariCombat?.setCombatantAnimation?.(detail.team, detail.slot, "HIT", 250);
      }
    } catch (_error) {
      // Sprite animation is optional.
    }

    const container = resolveContainer(controllerState.options);
    applyShake(container);
    createFloatingCombatText(detail, true);
  }

  function handleDodge(detail) {
    try {
      if (detail?.team && Number.isInteger(detail?.slot)) {
        window.CariCombat?.setCombatantAnimation?.(detail.team, detail.slot, "DODGE", 260);
      }
    } catch (_error) {
      // Sprite animation is optional.
    }

    const element = getTargetElement(detail);
    applyDodge(element);
  }

  function handleCorrection(detail) {
    const container = resolveContainer(DEFAULTS);
    applyGlitch(container);
    syncFromServer(detail?.serverState, detail?.response || detail);
  }

  function collectCombatants(serverState) {
    const values = [];

    if (Array.isArray(serverState?.combatants)) {
      values.push(...serverState.combatants);
    }

    if (Array.isArray(serverState?.player_team)) {
      values.push(
        ...serverState.player_team.map((value) => ({
          ...value,
          team: "player"
        }))
      );
    }

    if (Array.isArray(serverState?.enemy_team)) {
      values.push(
        ...serverState.enemy_team.map((value) => ({
          ...value,
          team: "enemy"
        }))
      );
    }

    if (isObject(serverState?.attacker)) {
      values.push({
        ...serverState.attacker,
        role: "attacker"
      });
    }

    if (isObject(serverState?.target)) {
      values.push({
        ...serverState.target,
        role: "target"
      });
    }

    return values;
  }

  function findBar(combatant) {
    const container = resolveContainer(DEFAULTS);
    const id = stringOrNull(
      combatant.id ??
      combatant.character_id ??
      combatant.characterId ??
      combatant.combatantId
    );

    if (id) {
      const escaped = CSS.escape(id);
      const entity = container.querySelector(
        "[data-combatant-id=\"" + escaped + "\"]"
      );
      if (entity) {
        return entity.querySelector(DEFAULTS.hpBarSelector);
      }

      const bar = container.querySelector(
        "[data-hp-bar-for=\"" + escaped + "\"]"
      );
      if (bar) return bar;
    }

    const team = stringOrNull(combatant.team);
    const slot = numberOrNull(combatant.slot);
    if (team && slot !== null) {
      const escapedTeam = CSS.escape(team);
      const entity = container.querySelector(
        "[data-team=\"" + escapedTeam + "\"][data-slot=\"" + String(slot) + "\"]"
      );
      return entity?.querySelector(DEFAULTS.hpBarSelector) || null;
    }

    return null;
  }

  function findHpValueElement(bar, combatant) {
    const entity = bar?.closest(DEFAULTS.combatantSelector);
    if (entity) {
      return entity.querySelector(DEFAULTS.hpValueSelector);
    }

    const id = stringOrNull(
      combatant.id ??
      combatant.character_id ??
      combatant.characterId ??
      combatant.combatantId
    );

    if (!id) return null;

    const escaped = CSS.escape(id);
    return document.querySelector(
      "[data-hp-value-for=\"" + escaped + "\"]"
    );
  }

  function animateHp(bar, hp, maxHp) {
    if (!(bar instanceof HTMLElement)) return;

    const safeMax = Math.max(1, Number(maxHp) || 1);
    const target = clamp(Number(hp) || 0, 0, safeMax);

    const existing = controllerState.hpAnimations.get(bar);
    if (existing) {
      existing.target = target;
      existing.max = safeMax;
      return;
    }

    const currentFromStyle = numberOrNull(
      Number.parseFloat(bar.dataset.currentHp || "")
    );
    const start = currentFromStyle !== null
      ? currentFromStyle
      : target;

    const animation = {
      current: start,
      target,
      max: safeMax
    };
    controllerState.hpAnimations.set(bar, animation);

    const tick = () => {
      if (!bar.isConnected) {
        controllerState.hpAnimations.delete(bar);
        return;
      }

      animation.current +=
        (animation.target - animation.current) * DEFAULTS.hpLerpFactor;

      if (Math.abs(animation.target - animation.current) <= DEFAULTS.hpLerpEpsilon) {
        animation.current = animation.target;
      }

      const ratio = clamp(animation.current / animation.max, 0, 1);
      bar.style.width = String(ratio * 100) + "%";
      bar.dataset.currentHp = String(animation.current);

      const valueEl = findHpValueElement(bar, {
        id: bar.dataset.combatantId,
        combatantId: bar.dataset.combatantId
      });
      if (valueEl) {
        valueEl.textContent =
          Math.round(animation.current) + " / " + Math.round(animation.max);
      }

      if (animation.current === animation.target) {
        controllerState.hpAnimations.delete(bar);
        return;
      }

      window.requestAnimationFrame(tick);
    };

    window.requestAnimationFrame(tick);
  }

  function syncFromServer(serverState, response) {
    if (!isObject(serverState)) return;

    const combat = controllerState.combat;
    const syncMethod =
      combat?.syncAuthoritativeState ||
      combat?.applyAuthoritativeState ||
      combat?.syncFromServerState;

    if (typeof syncMethod === "function") {
      try {
        syncMethod.call(combat, structuredClone(serverState));
      } catch (error) {
        console.warn("[CariCombatUI] State machine sync hook failed:", error);
      }
    }

    const combatants = collectCombatants(serverState);
    for (const combatant of combatants) {
      const hp = numberOrNull(combatant.hp);
      const maxHp = numberOrNull(
        combatant.max_hp ??
        combatant.maxHp
      );

      if (hp === null || maxHp === null) continue;

      const bar = findBar(combatant);
      if (bar) {
        animateHp(bar, hp, maxHp);
      }
    }

    if (Number.isInteger(serverState.turn)) {
      const turnElements = document.querySelectorAll(
        "[data-combat-turn], #combat-turn, .combat-turn"
      );
      turnElements.forEach((element) => {
        element.textContent = "TURNO " + String(serverState.turn);
      });
    }

    if (response?.resolution) {
      const correction = response.resolution;
      const local = response.localResolution;
      if (local && numberOrNull(local.damage) !== null &&
          numberOrNull(correction.damage) !== null &&
          local.damage !== correction.damage) {
        handleCorrection({
          serverState,
          response
        });
      }
    }
  }

  function attachNetworkHooks() {
    if (window.CariNetwork?.configure) {
      window.CariNetwork.configure({
        onServerState: (serverState, response) => {
          syncFromServer(serverState, response);
        },
        onCorrection: (correction, response) => {
          handleCorrection({
            ...correction,
            response
          });
        }
      });
    }
  }

  function setCombat(combat) {
    controllerState.combat = combat || null;
    controllerState.boundEvents.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (_error) {
        // Best-effort cleanup.
      }
    });
    controllerState.boundEvents.clear();
    bindStateMachineEvents();

    try {
      window.dispatchEvent(new CustomEvent("cari:combat-ready", {
        detail: { combat: controllerState.combat }
      }));
    } catch (_error) {
      // CustomEvent is optional for standalone/browser preview usage.
    }

    return controllerState.combat;
  }

  function configure(options = {}) {
    const merged = {
      ...DEFAULTS,
      ...options
    };

    injectStyles();

    if (options.combat) {
      setCombat(options.combat);
    }

    if (!controllerState.combat) {
      setCombat(
        window.combat ||
        window.CombatStateMachine?.instance ||
        null
      );
    }

    bindActionButtons(merged);
    bindProfileDashboard();
    renderActionDashboard();
    attachNetworkHooks();
    controllerState.initialized = true;

    return api;
  }

  function getState() {
    return {
      combat: controllerState.combat,
      busy: controllerState.busy,
      initialized: controllerState.initialized,
      floatingTexts: controllerState.floatingTexts.size,
      animatedBars: controllerState.hpAnimations.size
    };
  }

  const api = Object.freeze({
    configure,
    setCombat,
    getState,
    syncFromServer,
    handleCorrection
  });

  function autoInit() {
    configure();
  }

  window.CariCombatUI = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit, { once: true });
  } else {
    autoInit();
  }
})();
