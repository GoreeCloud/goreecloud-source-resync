(() => {
  const STATE = { running: false, floatingButton: null };
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const SOURCE_READY_TIMEOUT_MS = 45000;
  const SOURCE_STABLE_POLLS = 3;

  function isVisible(el) {
    if (!(el instanceof Element)) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
  }

  function isSourcesPage() {
    const url = new URL(location.href);
    return url.origin === "https://chatgpt.com"
      && url.pathname.includes("/project")
      && url.searchParams.get("tab") === "sources";
  }

  function sourceMarkerElements() {
    return [...document.querySelectorAll("body *")].filter(el => {
      if (!isVisible(el) || el.children.length > 3) return false;
      return /Google Drive (Folder|File)/i.test((el.textContent || "").trim());
    });
  }

  function findCardFromMarker(marker) {
    let node = marker;
    for (let depth = 0; depth < 8 && node; depth += 1, node = node.parentElement) {
      const rect = node.getBoundingClientRect();
      const buttons = [...node.querySelectorAll("button")].filter(isVisible);
      if (rect.width > 300 && rect.height >= 35 && rect.height <= 160 && buttons.length > 0) return node;
    }
    return null;
  }

  function findSourceCards() {
    const seen = new Set();
    const cards = [];
    for (const marker of sourceMarkerElements()) {
      const card = findCardFromMarker(marker);
      if (!card || seen.has(card)) continue;
      seen.add(card);
      const lines = (card.innerText || "").split("\n").map(v => v.trim()).filter(Boolean);
      const name = lines.find(v => !/^Google Drive (Folder|File)/i.test(v) && !/^Last synced/i.test(v) && v !== "Syncing") || "Google Drive source";
      cards.push({ card, name });
    }
    return cards;
  }

  async function waitForSourceCards(timeoutMs = SOURCE_READY_TIMEOUT_MS) {
    const startedAt = Date.now();
    let lastCount = -1;
    let stablePolls = 0;

    while (Date.now() - startedAt < timeoutMs) {
      if (!isSourcesPage()) return [];

      const cards = findSourceCards();
      const count = cards.length;

      if (count > 0 && count === lastCount) {
        stablePolls += 1;
        if (stablePolls >= SOURCE_STABLE_POLLS) return cards;
      } else {
        stablePolls = count > 0 ? 1 : 0;
        lastCount = count;
      }

      await sleep(500);
    }

    return findSourceCards();
  }

  function menuButtonForCard(card) {
    const buttons = [...card.querySelectorAll("button")].filter(isVisible);
    const scored = buttons.map(button => {
      const aria = (button.getAttribute("aria-label") || "").toLowerCase();
      const title = (button.getAttribute("title") || "").toLowerCase();
      const text = (button.textContent || "").trim();
      let score = 0;
      if (/more|menu|options|actions/.test(`${aria} ${title}`)) score += 5;
      if (text === "…" || text === "⋯" || text === "...") score += 4;
      const rect = button.getBoundingClientRect();
      if (rect.width <= 48 && rect.height <= 48) score += 1;
      return { button, score };
    }).sort((a, b) => b.score - a.score);
    return scored[0]?.button || buttons.at(-1) || null;
  }

  function visibleResyncControl() {
    const selectors = ["[role='menuitem']", "[role='option']", "button", "a", "div[tabindex='0']"];
    const candidates = [...document.querySelectorAll(selectors.join(","))].filter(isVisible);
    return candidates.find(el => /^resync$/i.test((el.textContent || "").trim())) || null;
  }

  async function clickResyncOnCard(card) {
    const menuButton = menuButtonForCard(card);
    if (!menuButton) throw new Error("Could not find the source menu button.");

    menuButton.click();
    for (let i = 0; i < 24; i += 1) {
      await sleep(100);
      const resync = visibleResyncControl();
      if (resync) {
        resync.click();
        await sleep(300);
        return;
      }
    }

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    throw new Error("The source menu opened, but no Resync action was found.");
  }

  async function resyncAll() {
    if (STATE.running) return { ok: false, count: 0, total: 0, failures: [], message: "A resync run is already in progress." };
    STATE.running = true;
    updateFloatingButton("running");

    const failures = [];
    let count = 0;
    try {
      const initial = await waitForSourceCards();
      const names = initial.map(item => item.name);
      if (!names.length) {
        return {
          ok: false,
          count: 0,
          total: 0,
          failures: [],
          message: "The Sources page loaded, but Google Drive sources did not finish rendering within 45 seconds."
        };
      }

      for (let index = 0; index < names.length; index += 1) {
        const sourceName = names[index];
        const current = findSourceCards();
        const target = current.find(item => item.name === sourceName) || current[index];
        if (!target?.card) {
          failures.push({ source: sourceName, error: "Source card could not be found after the page updated." });
          continue;
        }
        try {
          await clickResyncOnCard(target.card);
          count += 1;
        } catch (error) {
          failures.push({ source: sourceName, error: error?.message || String(error) });
        }
        await sleep(225);
      }

      const ok = count === names.length && failures.length === 0;
      return {
        ok,
        count,
        total: names.length,
        failures,
        message: failures.length
          ? `Requested resync for ${count} of ${names.length} source(s); ${failures.length} failed.`
          : `Requested resync for all ${count} source(s).`
      };
    } finally {
      STATE.running = false;
      updateFloatingButton("idle");
    }
  }

  function updateFloatingButton(state) {
    const button = STATE.floatingButton;
    if (!button) return;
    button.disabled = state === "running";
    button.dataset.state = state;
    button.querySelector("span:last-child").textContent = state === "running" ? "Resyncing…" : "Resync all";
  }

  function mountFloatingButton() {
    if (!isSourcesPage()) {
      STATE.floatingButton?.remove();
      STATE.floatingButton = null;
      return;
    }
    if (STATE.floatingButton && document.contains(STATE.floatingButton)) return;

    const button = document.createElement("button");
    button.id = "goreecloud-resync-all";
    button.type = "button";
    button.setAttribute("aria-label", "Resync all Google Drive project sources");
    button.innerHTML = `<span class="gc-resync-icon" aria-hidden="true">↻</span><span>Resync all</span>`;
    button.addEventListener("click", async () => {
      const result = await resyncAll();
      showToast(result.message, result.failures.length ? "warning" : result.ok ? "success" : "warning");
    });
    document.body.appendChild(button);
    STATE.floatingButton = button;
  }

  function showToast(message, type = "success") {
    document.getElementById("goreecloud-resync-toast")?.remove();
    const toast = document.createElement("div");
    toast.id = "goreecloud-resync-toast";
    toast.dataset.type = type;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }

  browser.runtime.onMessage.addListener(async message => {
    if (message?.type === "GOREECLOUD_RESYNC_ALL") {
      if (!isSourcesPage()) return { ok: false, count: 0, total: 0, failures: [], message: "The active ChatGPT page is not a Project Sources page." };
      return resyncAll();
    }
  });

  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) lastUrl = location.href;
    mountFloatingButton();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  mountFloatingButton();
})();
