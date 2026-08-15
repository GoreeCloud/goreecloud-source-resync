const DEFAULTS = {
  enabled: false,
  intervalMinutes: 5,
  projectUrl: "",
  openTabWhenNeeded: true,
  closeAutoOpenedTab: true,
  lastRunAt: null,
  lastResult: null,
  runHistory: []
};

const ALARM_NAME = "goreecloud-source-resync";
let runInProgress = false;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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

async function scheduleFromSettings() {
  const settings = await getSettings();
  await browser.alarms.clear(ALARM_NAME);
  if (!settings.enabled || !validSourcesUrl(settings.projectUrl)) return;

  const interval = Math.max(5, Number(settings.intervalMinutes) || 5);
  await browser.alarms.create(ALARM_NAME, {
    delayInMinutes: interval,
    periodInMinutes: interval
  });
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

async function waitForTabComplete(tabId, timeoutMs = 30000) {
  const existing = await browser.tabs.get(tabId).catch(() => null);
  if (existing?.status === "complete") return;

  await new Promise((resolve, reject) => {
    let finished = false;
    const timer = setTimeout(() => finish(new Error("Timed out waiting for the Sources page to load.")), timeoutMs);

    function finish(error) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      browser.tabs.onUpdated.removeListener(onUpdated);
      error ? reject(error) : resolve();
    }

    function onUpdated(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === "complete") finish();
    }

    browser.tabs.onUpdated.addListener(onUpdated);
  });
}

async function sendResync(tabId, reason = "manual") {
  if (runInProgress) {
    return {
      ok: false,
      count: 0,
      total: 0,
      failures: [],
      message: "A resync run is already in progress.",
      durationMs: 0,
      reason
    };
  }

  runInProgress = true;
  const startedAt = Date.now();
  try {
    let response;
    let attempts = 0;

    while (attempts < 10) {
      attempts += 1;
      try {
        response = await browser.tabs.sendMessage(tabId, {
          type: "GOREECLOUD_RESYNC_ALL",
          reason
        });
        if (response) break;
      } catch (error) {
        if (attempts >= 10) throw error;
      }
      await sleep(750);
    }

    const result = {
      ok: Boolean(response?.ok),
      count: response?.count || 0,
      total: response?.total || response?.count || 0,
      failures: response?.failures || [],
      message: response?.message || "No result returned.",
      durationMs: Date.now() - startedAt,
      reason
    };

    await recordResult(result);
    return result;
  } finally {
    runInProgress = false;
  }
}

async function findTargetTab(projectUrl) {
  const normalizedUrl = projectUrl.split("#")[0];
  const tabs = await browser.tabs.query({ url: "https://chatgpt.com/*" });
  return tabs.find(t => (t.url || "").split("#")[0] === normalizedUrl)
    || tabs.find(t => validSourcesUrl(t.url || ""))
    || null;
}

async function runScheduledResync() {
  const settings = await getSettings();
  if (!settings.enabled || !validSourcesUrl(settings.projectUrl)) return;

  let tab = await findTargetTab(settings.projectUrl);
  let autoOpened = false;

  try {
    if (!tab && settings.openTabWhenNeeded) {
      tab = await browser.tabs.create({ url: settings.projectUrl, active: false });
      autoOpened = true;
      await waitForTabComplete(tab.id);
      await sleep(2500);
    }

    if (!tab) {
      await recordResult({
        ok: false,
        count: 0,
        total: 0,
        failures: [],
        message: "No matching ChatGPT Sources tab was open.",
        durationMs: 0,
        reason: "scheduled"
      });
      return;
    }

    await sendResync(tab.id, "scheduled");
  } catch (error) {
    await recordResult({
      ok: false,
      count: 0,
      total: 0,
      failures: [],
      message: error?.message || String(error),
      durationMs: 0,
      reason: "scheduled"
    });
  } finally {
    if (autoOpened && settings.closeAutoOpenedTab && tab?.id) {
      await sleep(1500);
      await browser.tabs.remove(tab.id).catch(() => {});
    }
  }
}

async function getRuntimeStatus() {
  const settings = await getSettings();
  const alarm = await browser.alarms.get(ALARM_NAME);
  return {
    ok: true,
    running: runInProgress,
    nextRunAt: alarm?.scheduledTime ? new Date(alarm.scheduledTime).toISOString() : null,
    settings
  };
}

browser.runtime.onInstalled.addListener(async () => {
  const existing = await browser.storage.local.get();
  await browser.storage.local.set({ ...DEFAULTS, ...existing });
  await scheduleFromSettings();
});

browser.runtime.onStartup.addListener(scheduleFromSettings);

browser.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_NAME) runScheduledResync();
});

browser.runtime.onMessage.addListener(async message => {
  if (message?.type === "GOREECLOUD_SETTINGS_CHANGED") {
    await scheduleFromSettings();
    return getRuntimeStatus();
  }
  if (message?.type === "GOREECLOUD_GET_STATUS") {
    return getRuntimeStatus();
  }
  if (message?.type === "GOREECLOUD_RUN_NOW") {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !validSourcesUrl(tab.url || "")) {
      return { ok: false, message: "Open the saved ChatGPT Project Sources page first." };
    }
    return sendResync(tab.id, "popup");
  }
  if (message?.type === "GOREECLOUD_CAPTURE_CURRENT_URL") {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!validSourcesUrl(tab?.url || "")) {
      return { ok: false, message: "Open a ChatGPT Project Sources page first." };
    }
    await browser.storage.local.set({ projectUrl: tab.url });
    await scheduleFromSettings();
    return { ok: true, projectUrl: tab.url };
  }
});
