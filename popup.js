const DEFAULTS = {
  width: 800,
  hideSidebar: true,
  limitHeight: false,
  maxHeight: 400,
};

const width = document.getElementById("width");
const widthOut = document.getElementById("widthOut");
const hideSidebar = document.getElementById("hideSidebar");
const limitHeight = document.getElementById("limitHeight");
const maxHeight = document.getElementById("maxHeight");
const maxHeightOut = document.getElementById("maxHeightOut");
const maxHeightUnit = document.getElementById("maxHeightUnit");
const reset = document.getElementById("reset");
const statusEl = document.getElementById("status");

function render(settings) {
  width.value = String(settings.width);
  widthOut.value = String(settings.width);
  hideSidebar.checked = !!settings.hideSidebar;
  limitHeight.checked = !!settings.limitHeight;
  maxHeight.value = String(settings.maxHeight);
  if (settings.limitHeight) {
    maxHeightOut.value = String(settings.maxHeight);
    maxHeightUnit.textContent = "px";
  } else {
    maxHeightOut.value = "原寸";
    maxHeightUnit.textContent = "";
  }
}

function setStatus(text, ok) {
  statusEl.textContent = text;
  statusEl.classList.toggle("ok", !!ok);
  statusEl.classList.toggle("ng", !ok);
}

function withActiveTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab?.id) {
      setStatus("タブを取得できません", false);
      return;
    }
    callback(tab);
  });
}

function ping() {
  withActiveTab((tab) => {
    chrome.tabs.sendMessage(tab.id, { type: "widex-ping" }, (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        setStatus("未接続: x.com を再読み込みしてください", false);
        return;
      }
      const s = response.settings || {};
      setStatus(
        s.limitHeight
          ? `接続中　幅 ${s.width}px / 高さ ${s.maxHeight}px`
          : `接続中　幅 ${s.width}px / 高さ 原寸`,
        true
      );
    });
  });
}

function notify(settings) {
  withActiveTab((tab) => {
    chrome.tabs.sendMessage(
      tab.id,
      { type: "widex-settings", settings },
      (response) => {
        if (chrome.runtime.lastError || !response?.ok) {
          setStatus("未接続: x.com を再読み込みしてください", false);
          return;
        }
        const s = response.settings || settings;
        setStatus(
          s.limitHeight
            ? `適用済み　幅 ${s.width}px / 高さ ${s.maxHeight}px`
            : `適用済み　幅 ${s.width}px / 高さ 原寸`,
          true
        );
      }
    );
  });
}

function save(partial) {
  chrome.storage.local.get(DEFAULTS, (stored) => {
    const settings = { ...DEFAULTS, ...stored, ...partial };
    chrome.storage.local.set(settings, () => {
      render(settings);
      notify(settings);
    });
  });
}

chrome.storage.local.get(DEFAULTS, (stored) => {
  render({ ...DEFAULTS, ...stored });
  ping();
});

width.addEventListener("input", () => {
  save({ width: Number(width.value) });
});

hideSidebar.addEventListener("change", () => {
  save({ hideSidebar: hideSidebar.checked });
});

limitHeight.addEventListener("change", () => {
  save({ limitHeight: limitHeight.checked });
});

maxHeight.addEventListener("input", () => {
  save({
    limitHeight: true,
    maxHeight: Number(maxHeight.value),
  });
});

reset.addEventListener("click", () => {
  chrome.storage.local.set(DEFAULTS, () => {
    render(DEFAULTS);
    notify(DEFAULTS);
  });
});
