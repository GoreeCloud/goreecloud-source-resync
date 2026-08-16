const DEFAULTS = {
  lastRunAt: null,
  lastResult: null,
  runHistory: []
};

const $ = id => document.getElementById(id);

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

async function load() {
  const settings = { ...DEFAULTS, ...(await browser.storage.local.get(DEFAULTS)) };
  render(settings);
}

$("runNow").addEventListener("click", async () => {
  const button = $("runNow");
  button.disabled = true;
  button.textContent = "Resyncing…";

  try {
    const result = await browser.runtime.sendMessage({ type: "GOREECLOUD_RUN_NOW" });
    if (!result?.ok && !result?.count) {
      $("status").textContent = result?.message || "Run failed.";
    }
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
