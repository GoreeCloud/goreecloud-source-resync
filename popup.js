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

const $ = id => document.getElementById(id);

function formatMode(reason) {
  if (reason === "scheduled") return "Automatic";
  if (reason === "popup") return "Manual";
  return reason || "Manual";
}

function render(settings, runtime = {}) {
  $("projectUrl").textContent = settings.projectUrl || "No Sources page saved.";
  $("version").textContent = `v${browser.runtime.getManifest().version}`;

  if (!settings.lastResult) {
    $("status").textContent = "Not run yet.";
    $("runDetails").textContent = "";
    $("lastRunAt").textContent = "";
  } else {
    const result = settings.lastResult;
    $("status").textContent = result.message || "Run completed.";
    const parts = [formatMode(result.reason)];
    if (result.total) parts.push(`${result.count || 0}/${result.total} requested`);
    if (Number.isFinite(result.durationMs)) parts.push(`${(result.durationMs / 1000).toFixed(1)}s`);
    if (result.failures?.length) parts.push(`${result.failures.length} failed`);
    $("runDetails").textContent = parts.join(" · ");
    $("lastRunAt").textContent = settings.lastRunAt ? `Completed: ${new Date(settings.lastRunAt).toLocaleString()}` : "";
  }

  $("nextRunAt").textContent = settings.enabled && runtime.nextRunAt
    ? `Next automatic run: ${new Date(runtime.nextRunAt).toLocaleString()}`
    : settings.enabled ? "Automatic resync is enabled." : "Automatic resync is off.";
}

async function load() {
  const settings = { ...DEFAULTS, ...(await browser.storage.local.get(DEFAULTS)) };
  $("enabled").checked = settings.enabled;
  $("intervalMinutes").value = String(settings.intervalMinutes);
  $("openTabWhenNeeded").checked = settings.openTabWhenNeeded;
  $("closeAutoOpenedTab").checked = settings.closeAutoOpenedTab;
  const runtime = await browser.runtime.sendMessage({ type: "GOREECLOUD_GET_STATUS" }).catch(() => ({}));
  render(settings, runtime);
}

async function saveSettings() {
  const next = {
    enabled: $("enabled").checked,
    intervalMinutes: Number($("intervalMinutes").value),
    openTabWhenNeeded: $("openTabWhenNeeded").checked,
    closeAutoOpenedTab: $("closeAutoOpenedTab").checked
  };
  await browser.storage.local.set(next);
  await browser.runtime.sendMessage({ type: "GOREECLOUD_SETTINGS_CHANGED" });
  await load();
}

for (const id of ["enabled", "intervalMinutes", "openTabWhenNeeded", "closeAutoOpenedTab"]) {
  $(id).addEventListener("change", saveSettings);
}

$("captureUrl").addEventListener("click", async () => {
  const result = await browser.runtime.sendMessage({ type: "GOREECLOUD_CAPTURE_CURRENT_URL" });
  if (!result?.ok) {
    $("status").textContent = result?.message || "Could not save the current page.";
    return;
  }
  await load();
  $("status").textContent = "Saved the current ChatGPT Sources page.";
});

$("runNow").addEventListener("click", async () => {
  const button = $("runNow");
  button.disabled = true;
  button.textContent = "Resyncing…";
  try {
    const result = await browser.runtime.sendMessage({ type: "GOREECLOUD_RUN_NOW" });
    if (!result?.ok && !result?.count) $("status").textContent = result?.message || "Run failed.";
    await load();
  } catch (error) {
    $("status").textContent = error?.message || String(error);
  } finally {
    button.disabled = false;
    button.textContent = "Resync all now";
  }
});

browser.storage.onChanged.addListener(() => load());
load();
