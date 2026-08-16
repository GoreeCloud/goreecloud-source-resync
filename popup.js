const DEFAULTS = {
  lastRunAt: null,
  lastResult: null,
  runHistory: []
};

const $ = id => document.getElementById(id);
let requestPending = false;
let statusPoll = null;

function render(settings) {
  $("version").textContent = `v${browser.runtime.getManifest().version}`;

  if (!settings.lastResult) {
    $("status").textContent = "Not run yet.";
    $("runDetails").textContent = "";
    $("lastRunAt").textContent = "";
    return;
  }

  const result = settings.lastResult;
  $("status").textContent = result.message || "Run completed.";
  const parts = [];
  if (result.total) parts.push(`${result.count || 0}/${result.total} requested`);
  if (Number.isFinite(result.durationMs)) parts.push(`${(result.durationMs / 1000).toFixed(1)}s`);
  if (result.failures?.length) parts.push(`${result.failures.length} failed`);
  $("runDetails").textContent = parts.join(" · ");
  $("lastRunAt").textContent = settings.lastRunAt
    ? `Completed: ${new Date(settings.lastRunAt).toLocaleString()}`
    : "";
}

function renderRunButton(runtimeStatus = null) {
  const button = $("runNow");
  const running = Boolean(requestPending || runtimeStatus?.running);
  button.disabled = running;

  if (!running) {
    button.textContent = "Resync all now";
    return;
  }

  const progress = runtimeStatus?.progress;
  button.textContent = progress?.total
    ? `Resyncing ${Math.min(progress.current || 0, progress.total)}/${progress.total}…`
    : "Resyncing…";
}

async function load() {
  const settings = { ...DEFAULTS, ...(await browser.storage.local.get(DEFAULTS)) };
  render(settings);
}

async function refreshRuntimeStatus() {
  try {
    const status = await browser.runtime.sendMessage({ type: "GOREECLOUD_GET_STATUS" });
    renderRunButton(status);
  } catch {
    if (!requestPending) renderRunButton({ running: false });
  }
}

function startStatusPolling() {
  if (statusPoll) return;
  statusPoll = setInterval(refreshRuntimeStatus, 400);
}

$("runNow").addEventListener("click", async () => {
  requestPending = true;
  renderRunButton({ running: true });
  startStatusPolling();

  try {
    const result = await browser.runtime.sendMessage({ type: "GOREECLOUD_RUN_NOW" });
    if (!result?.ok && !result?.count) {
      $("status").textContent = result?.message || "Run failed.";
    }
    await load();
  } catch (error) {
    $("status").textContent = error?.message || String(error);
  } finally {
    requestPending = false;
    await refreshRuntimeStatus();
  }
});

browser.storage.onChanged.addListener(() => load());

window.addEventListener("unload", () => {
  if (statusPoll) clearInterval(statusPoll);
});

load();
refreshRuntimeStatus();
startStatusPolling();
