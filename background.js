const DEFAULTS = {
  lastRunAt: null,
  lastResult: null,
  runHistory: []
};

let runInProgress = false;

async function getSettings() {
  return { ...DEFAULTS, ...(await browser.storage.local.get(DEFAULTS)) };
}

function validSourcesUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.origin === "https://chatgpt.com"
      && parsed.pathname.includes("/project")
      && parsed.searchParams.get("tab") === "sources";
  } catch {
    return false;
  }
}

async function recordResult(result) {
  const settings = await getSettings();
  const timestamp = new Date().toISOString();
  const entry = { ...result, at: timestamp };
  const runHistory = [entry, ...(settings.runHistory || [])].slice(0, 10);
  await browser.storage.local.set({
    lastRunAt: timestamp,
    lastResult: result,
    runHistory
  });
}

async function sendResync(tabId) {
  if (runInProgress) {
    return {
      ok: false,
      count: 0,
      total: 0,
      failures: [],
      message: "A resync run is already in progress.",
      durationMs: 0,
      reason: "manual"
    };
  }

  runInProgress = true;
  const startedAt = Date.now();
  try {
    const response = await browser.tabs.sendMessage(tabId, {
      type: "GOREECLOUD_RESYNC_ALL",
      reason: "manual"
    });

    const result = {
      ok: Boolean(response?.ok),
      count: response?.count || 0,
      total: response?.total || response?.count || 0,
      failures: response?.failures || [],
      message: response?.message || "No result returned.",
      durationMs: Date.now() - startedAt,
      reason: "manual"
    };

    await recordResult(result);
    return result;
  } catch (error) {
    const result = {
      ok: false,
      count: 0,
      total: 0,
      failures: [],
      message: error?.message || String(error),
      durationMs: Date.now() - startedAt,
      reason: "manual"
    };
    await recordResult(result);
    return result;
  } finally {
    runInProgress = false;
  }
}

async function getRuntimeStatus() {
  return {
    ok: true,
    running: runInProgress,
    settings: await getSettings()
  };
}

browser.runtime.onInstalled.addListener(async () => {
  const existing = await browser.storage.local.get();
  await browser.storage.local.set({ ...DEFAULTS, ...existing });
  await browser.storage.local.remove([
    "enabled",
    "intervalMinutes",
    "projectUrl",
    "openTabWhenNeeded",
    "closeAutoOpenedTab"
  ]);
});

browser.runtime.onMessage.addListener(async message => {
  if (message?.type === "GOREECLOUD_GET_STATUS") {
    return getRuntimeStatus();
  }

  if (message?.type === "GOREECLOUD_RUN_NOW") {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !validSourcesUrl(tab.url || "")) {
      return {
        ok: false,
        count: 0,
        total: 0,
        failures: [],
        message: "Open a ChatGPT Project Sources page first."
      };
    }
    return sendResync(tab.id);
  }
});
