const DEFAULTS = {
  width: 800,
  hideSidebar: true,
  limitHeight: false,
  maxHeight: 400,
};

const CACHE_KEY = "widex.cache.v1";

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return null;
  }
}

function writeCache(settings) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        width: settings.width,
        hideSidebar: settings.hideSidebar,
        limitHeight: settings.limitHeight,
        maxHeight: settings.maxHeight,
      })
    );
  } catch {
    /* ignore quota / privacy mode */
  }
}

function writeEarlyCapStyle(settings) {
  const id = "widex-early-cap";
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("style");
    el.id = id;
    const root = document.documentElement;
    root.insertBefore(el, root.firstChild);
  }
  if (!settings.limitHeight) {
    el.textContent = "";
    return;
  }
  const h = `${settings.maxHeight}px`;
  el.textContent = `
    [data-testid="primaryColumn"] [style*="padding-bottom"]:not(.r-13qz1uu) {
      padding-bottom: 0 !important;
      height: ${h} !important;
      max-height: ${h} !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
    }
    [data-testid="primaryColumn"] [style*="height: 510px"],
    [data-testid="primaryColumn"] [style*="height:510px"],
    [data-testid="primaryColumn"] [style*="min-height: 510px"],
    [data-testid="primaryColumn"] [style*="min-height:510px"] {
      max-height: ${h} !important;
      min-height: 0 !important;
    }
  `;
}

function applyEarlyDom(settings) {
  const root = document.documentElement;
  root.style.setProperty("--widex-width", `${settings.width}px`);
  root.style.setProperty("--widex-sidebar", settings.hideSidebar ? "0px" : "420px");
  root.style.setProperty(
    "--widex-max-height",
    settings.limitHeight ? `${settings.maxHeight}px` : "none"
  );
  root.classList.toggle("widex-hide-sidebar", !!settings.hideSidebar);
  root.classList.toggle("widex-limit-height", !!settings.limitHeight);
  root.toggleAttribute("data-widex-hide-sidebar", !!settings.hideSidebar);
  writeEarlyCapStyle(settings);
}

const cached = readCache();
let current = { ...DEFAULTS, ...(cached || {}) };
applyEarlyDom(cached || { ...DEFAULTS, limitHeight: true });

function readSettings(callback) {
  chrome.storage.local.get(DEFAULTS, (stored) => {
    callback({ ...DEFAULTS, ...stored });
  });
}

function toast(text) {
  let el = document.getElementById("widex-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "widex-toast";
    el.setAttribute("data-widex", "toast");
    document.documentElement.appendChild(el);
  }
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    el.hidden = true;
  }, 1600);
}

function applySettings(settings, { notify } = {}) {
  current = { ...DEFAULTS, ...settings };
  applyEarlyDom(current);
  writeCache(current);
  patchTimeline();
  if (notify) {
    toast(
      current.limitHeight
        ? `Widexline: 幅 ${current.width}px / 高さ上限 ${current.maxHeight}px`
        : `Widexline: 幅 ${current.width}px / 高さ 原寸`
    );
  }
}

function uncap600(el) {
  if (!el?.style) return;
  if (el.getAttribute("data-testid") === "primaryColumn") return;
  el.style.setProperty("max-width", "none", "important");
}

function syncShell() {
  const col = document.querySelector('[data-testid="primaryColumn"]');
  if (!col) return;
  col.style.setProperty("max-width", `${current.width}px`, "important");
  col.style.setProperty("width", `${current.width}px`, "important");
  col.style.setProperty("flex-grow", "0", "important");
  col.style.setProperty("flex-shrink", "0", "important");

  const extra = current.hideSidebar ? 0 : 420;
  const needed = current.width + extra;
  const main = col.closest("main");
  const shell = main?.querySelector(":scope > div");
  if (shell) {
    shell.style.setProperty("width", `${needed}px`, "important");
    shell.style.setProperty("max-width", "none", "important");
    shell.style.setProperty("min-width", `${needed}px`, "important");
  }
  const row = col.parentElement;
  if (row && row !== shell) {
    row.style.setProperty("width", "100%", "important");
    row.style.setProperty("max-width", "none", "important");
  }
}

function resetSidebarSpacers(side) {
  side.querySelectorAll("div[style]").forEach((el) => {
    const marginTop = parseFloat(el.style.marginTop);
    if (Number.isFinite(marginTop) && Math.abs(marginTop) > 2000) {
      el.style.marginTop = "0px";
    }
    const top = parseFloat(el.style.top);
    if (Number.isFinite(top) && Math.abs(top) > 2000) {
      el.style.top = "0px";
    }
    const minHeight = parseFloat(el.style.minHeight);
    if (Number.isFinite(minHeight) && minHeight > 4000) {
      el.style.minHeight = "";
    }
  });
}

function syncSidebar() {
  const side = document.querySelector('[data-testid="sidebarColumn"]');
  if (!side) return;
  const props = [
    "width",
    "min-width",
    "max-width",
    "overflow",
    "opacity",
    "pointer-events",
    "flex",
    "margin",
    "padding",
    "display",
    "visibility",
  ];
  if (current.hideSidebar) {
    side.style.setProperty("width", "0px", "important");
    side.style.setProperty("min-width", "0px", "important");
    side.style.setProperty("max-width", "0px", "important");
    side.style.setProperty("overflow", "hidden", "important");
    side.style.setProperty("opacity", "0", "important");
    side.style.setProperty("pointer-events", "none", "important");
    side.style.setProperty("flex", "0 0 0px", "important");
    side.style.setProperty("margin", "0px", "important");
    side.style.removeProperty("display");
    side.style.removeProperty("visibility");
  } else {
    props.forEach((prop) => side.style.removeProperty(prop));
    resetSidebarSpacers(side);
  }
}

function mediaUrl(url) {
  if (!url || url.startsWith("data:")) return url;
  try {
    const parsed = new URL(url, location.href);
    if (parsed.hostname.includes("twimg.com")) {
      parsed.searchParams.set("name", "large");
    }
    return parsed.toString();
  } catch {
    return url.replace(/name=[a-z0-9_]+/i, "name=large");
  }
}

function photoUrl(photo) {
  const bg = photo.querySelector("[style*='background-image']");
  if (bg) {
    const match = String(bg.style.backgroundImage).match(/url\((['"]?)(.+?)\1\)/);
    if (match?.[2]) return mediaUrl(match[2]);
  }
  const img = photo.querySelector("img");
  return mediaUrl(img?.currentSrc || img?.src || "");
}

function isSensitiveText(text) {
  return (
    text.includes("内容の警告") ||
    text.includes("Content warning") ||
    text.includes("センシティブな内容") ||
    text.includes("Sensitive content")
  );
}

function hasSensitiveWarning(el) {
  let node = el;
  for (let i = 0; i < 16 && node && !isTweetRoot(node); i++) {
    if (isSensitiveText(node.innerText || "")) return true;
    if (isQuoteCard(node)) break;
    node = node.parentElement;
  }
  const root = el.closest?.("article") || el;
  const frame = el.closest?.("[style*='padding-bottom']") || root;
  const scope = frame || root;
  if (isSensitiveText(scope.innerText || "")) return true;
  const buttons = scope.querySelectorAll?.("button") || [];
  for (const button of buttons) {
    const label = `${button.innerText || ""} ${button.getAttribute("aria-label") || ""}`;
    if (
      (label.includes("表示") || label.includes("Show") || label.includes("View")) &&
      !label.includes("さらに表示") &&
      !label.includes("Show more")
    ) {
      if (isSensitiveText(scope.innerText || "")) return true;
    }
  }
  return false;
}

function playableScope(el) {
  return (
    el?.closest("[data-testid='tweetPhoto']") ||
    el?.closest("[data-testid='card.wrapper']") ||
    el
  );
}

function looksLikePlayable(el) {
  if (!el) return false;
  if (el.closest?.("[data-widex-playable='1']")) return true;
  if (el.querySelector?.("video")) return true;
  const html = el.innerHTML || "";
  return /amplify_video_thumb|ext_tw_video_thumb|tweet_video_thumb|video\.twimg\.com|tweet_video\/|previewInterstitial|videoPlayer|playButton|埋め込み動画|Embedded video|この動画を再生する|Play this video|Play GIF/i.test(
    html
  );
}

function markPlayable(el) {
  const scope = playableScope(el);
  if (scope && scope.getAttribute("data-widex-playable") !== "1") {
    scope.setAttribute("data-widex-playable", "1");
  }
  const shell = findMediaShell(scope);
  if (shell && shell.getAttribute("data-widex-playable") !== "1") {
    shell.setAttribute("data-widex-playable", "1");
  }
}

function isPlayableMedia(el) {
  if (!el) return false;
  if (el.closest("[data-widex-playable='1']")) return true;
  const scope = playableScope(el);
  const hit = Boolean(
    el.closest("video") ||
      el.closest("[data-testid='videoPlayer']") ||
      el.closest("[data-testid='previewInterstitial']") ||
      el.closest("[data-testid='playButton']") ||
      scope.querySelector("video") ||
      scope.querySelector("[data-testid='videoPlayer']") ||
      scope.querySelector("[data-testid='previewInterstitial']") ||
      scope.querySelector("[data-testid='playButton']") ||
      scope.querySelector("[aria-label='埋め込み動画']") ||
      scope.querySelector("[aria-label='Embedded video']") ||
      scope.querySelector("[aria-label='この動画を再生する']") ||
      scope.querySelector("[aria-label='Play this video']") ||
      scope.querySelector("[aria-label*='GIF']") ||
      scope.querySelector("[aria-label*='Gif']") ||
      scope.querySelector("img[alt='埋め込み動画']") ||
      scope.querySelector("img[alt='Embedded video']") ||
      scope.querySelector("img[alt*='GIF']") ||
      looksLikePlayable(scope)
  );
  if (hit) markPlayable(scope);
  return hit;
}

function restorePlayableMedia(col) {
  col.querySelectorAll("[data-widex-hidden='1']").forEach((hidden) => {
    if (!isPlayableMedia(hidden) && !looksLikePlayable(hidden)) return;
    const prev = hidden.previousElementSibling;
    if (prev?.classList.contains("widex-single") || prev?.classList.contains("widex-row")) {
      prev.remove();
    }
    hidden.removeAttribute("data-widex-hidden");
    hidden.style.removeProperty("display");
    markPlayable(hidden);
  });
}

function syncSensitive() {
  document.querySelectorAll(".widex-row, .widex-single").forEach((el) => {
    el.classList.toggle("widex-sensitive", hasSensitiveWarning(el));
  });
}

function findCarouselBox(swipe) {
  const nav = swipe.closest("nav");
  if (nav?.parentElement) return nav.parentElement;
  return swipe;
}

function capImg(img) {
  if (!(img instanceof HTMLImageElement)) {
    img.querySelectorAll?.("img").forEach(capImg);
    return;
  }
  img.style.removeProperty("zoom");
  const link = img.closest(".widex-row > a");
  if (!current.limitHeight) {
    img.style.setProperty("width", "100%", "important");
    img.style.setProperty("height", "auto", "important");
    img.style.removeProperty("max-height");
    img.style.removeProperty("max-width");
    if (link) {
      link.style.setProperty("flex", "1 1 0", "important");
      link.style.removeProperty("width");
    }
    return;
  }
  img.style.setProperty("width", "auto", "important");
  img.style.setProperty("height", "auto", "important");
  img.style.removeProperty("max-width");
  img.style.setProperty("max-height", `${current.maxHeight}px`, "important");
  img.style.setProperty("object-fit", "contain", "important");
  if (link) {
    link.style.setProperty("flex", "0 0 auto", "important");
    link.style.setProperty("width", "auto", "important");
  }
}

function aspectCapTargets(box) {
  return [
    ...new Set(
      [
        box,
        box.closest("[data-testid='tweetPhoto']"),
        box.closest("[data-testid='videoPlayer']"),
        box.closest("[data-testid='card.wrapper']"),
      ].filter(Boolean)
    ),
  ];
}

function isPlayerCore(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.tagName === "VIDEO") return true;
  const id = el.getAttribute("data-testid");
  return (
    id === "videoPlayer" ||
    id === "previewInterstitial" ||
    id === "playButton" ||
    id === "videoComponent"
  );
}

function isTweetRoot(el) {
  return !!el?.matches?.("article, [data-testid='tweet']");
}

function isQuoteCard(el) {
  return (
    el?.getAttribute?.("role") === "link" &&
    el.tagName !== "A" &&
    (el.getAttribute("tabindex") != null || (el.className?.toString?.() || "").includes("r-adacv"))
  );
}

function findMediaShell(start) {
  if (!start) return null;
  const tagged = start.closest?.("[data-widex-cap='1']");
  if (
    tagged &&
    !isTweetRoot(tagged) &&
    !isPlayerCore(tagged) &&
    !isQuoteCard(tagged)
  ) {
    return tagged;
  }
  let el = start;
  let border = null;
  let withMax = null;
  let mediaStack = null;
  for (let i = 0; i < 12 && el && !isTweetRoot(el) && !isQuoteCard(el); i++) {
    if (el.getAttribute?.("data-testid") === "card.wrapper") return el;
    const cls = el.className?.toString?.() || "";
    if (cls.includes("r-1kqtdi0") && cls.includes("r-1phboty")) border = el;
    const maxW = el.style?.maxWidth;
    if (maxW && maxW !== "none" && !isPlayerCore(el) && el.getAttribute("data-testid") !== "tweetPhoto") {
      withMax = el;
    }
    if (cls.includes("r-14gqq1x")) mediaStack = el;
    el = el.parentElement;
  }
  const shell = withMax || border?.parentElement || mediaStack;
  if (shell && !isPlayerCore(shell) && !isTweetRoot(shell) && !isQuoteCard(shell)) {
    return shell;
  }
  const photo = start.closest?.("[data-testid='tweetPhoto']");
  return photo || null;
}

function applyAspectCap(box, spacer) {
  if (!box || !spacer) return;
  if (box.closest("[data-widex-playable='1'], [data-widex-cap='1']")) return;
  if (isPlayableMedia(box)) return;
  box.style.removeProperty("zoom");
  const targets = aspectCapTargets(box);
  if (!current.limitHeight) {
    targets.forEach((el) => {
      el.style.removeProperty("max-width");
      el.style.removeProperty("max-height");
      el.style.removeProperty("width");
      el.style.removeProperty("overflow");
      if (el.style.getPropertyPriority("height") === "important") {
        el.style.removeProperty("height");
      }
    });
    return;
  }
  const pct = parseFloat(spacer.style.paddingBottom) || 0;
  if (pct <= 0) return;
  const maxWidth = (current.maxHeight * 100) / pct;
  targets.forEach((el) => {
    el.style.setProperty("max-width", `${maxWidth}px`, "important");
    el.style.setProperty("width", `${maxWidth}px`, "important");
    el.style.setProperty("max-height", `${current.maxHeight}px`, "important");
    const h = parseFloat(el.style.height);
    if (Number.isFinite(h) && h > current.maxHeight) {
      el.style.setProperty("height", "auto", "important");
    }
    el.style.removeProperty("overflow");
  });
}

function clearImportantLayout(node) {
  if (!node?.style) return;
  ["overflow", "width", "max-width", "max-height"].forEach((prop) => {
    if (node.style.getPropertyPriority(prop) === "important") {
      node.style.removeProperty(prop);
    }
  });
}

function cleanupLegacyInnerCap(el) {
  const scope = playableScope(el) || el;
  if (!scope || scope.dataset.widexReleased === "1") return;
  const nodes = new Set();
  const add = (node) => {
    if (node && node !== document.body) nodes.add(node);
  };
  add(scope);
  add(scope.closest?.("[data-testid='tweetPhoto']"));
  const found = findSpacerBox(scope);
  add(found?.box);
  scope
    .querySelectorAll?.(
      "[data-testid='tweetPhoto'], [data-testid='videoPlayer'], [data-testid='previewInterstitial']"
    )
    .forEach(add);
  nodes.forEach((node) => {
    if (node.tagName === "VIDEO") return;
    if (node.dataset?.widexCap === "1") return;
    clearImportantLayout(node);
  });
  scope.dataset.widexReleased = "1";
}

function capPlayable(el) {
  markPlayable(el);
  const tagged = el.closest?.("[data-widex-cap='1']");

  if (!current.limitHeight) {
    const shell = tagged || findMediaShell(el);
    if (shell?.dataset.widexCap === "1") {
      shell.style.removeProperty("--widex-media-cap");
      clearImportantLayout(shell);
      delete shell.dataset.widexCap;
      delete shell.dataset.widexCapWidth;
      delete shell.dataset.widexCapHeight;
    }
    return;
  }

  if (
    tagged &&
    tagged.dataset.widexCapWidth &&
    tagged.dataset.widexCapHeight === String(current.maxHeight)
  ) {
    return;
  }

  const found = findSpacerBox(el);
  const shell = tagged || findMediaShell(found?.box || el);
  if (!shell || isPlayerCore(shell) || isTweetRoot(shell) || isQuoteCard(shell)) return;

  const pct = parseFloat(found?.spacer?.style?.paddingBottom) || 0;
  if (pct <= 0) return;
  const maxWidth = `${(current.maxHeight * 100) / pct}px`;
  if (
    shell.dataset.widexCapWidth === maxWidth &&
    shell.dataset.widexCapHeight === String(current.maxHeight)
  ) {
    return;
  }

  cleanupLegacyInnerCap(el);
  shell.style.setProperty("--widex-media-cap", maxWidth);
  shell.setAttribute("data-widex-cap", "1");
  shell.dataset.widexCapWidth = maxWidth;
  shell.dataset.widexCapHeight = String(current.maxHeight);
  clearImportantLayout(shell);
}

function spacerPct(el) {
  const raw = el?.style?.paddingBottom || "";
  if (!raw.includes("%")) return 0;
  const pct = parseFloat(raw);
  return pct > 10 ? pct : 0;
}

function findSpacerBox(start) {
  if (!start) return null;
  if (spacerPct(start)) return { box: start, spacer: start };
  const inner = [...start.querySelectorAll("[style*='padding-bottom']")].find((el) => spacerPct(el));
  if (inner?.parentElement && !inner.closest(".widex-row, .widex-single")) {
    if (spacerPct(inner) && inner.parentElement === start) {
      return { box: start, spacer: inner };
    }
    return { box: inner.parentElement, spacer: inner };
  }
  let box = start;
  for (let i = 0; i < 8 && box; i++) {
    if (spacerPct(box)) return { box, spacer: box };
    const spacer = [...box.children].find((child) => spacerPct(child));
    if (spacer) return { box, spacer };
    box = box.parentElement;
    if (box?.matches?.("article")) break;
  }
  return null;
}

function isCollageFrame(el) {
  if (!el || el.nodeType !== 1) return false;
  if (spacerPct(el) > 10) return true;
  const cls = el.className?.toString?.() || "";
  if (cls.includes("r-1w2pmg")) return true;
  if (el.querySelector(":scope > nav [data-testid='ScrollSnap-SwipeableList']")) return true;
  if (
    String(el.getAttribute("style") || "").includes("padding-bottom") &&
    el.querySelector("nav, [data-testid='tweetPhoto'], [data-testid='previewInterstitial']")
  ) {
    return true;
  }
  return false;
}

function findSensitiveFrame(photos) {
  if (!photos.length) return null;
  let frame = null;
  let el = photos[0];
  for (let i = 0; i < 16 && el && !isTweetRoot(el) && !isQuoteCard(el); i++) {
    if (isCollageFrame(el) && photos.every((photo) => el.contains(photo))) {
      frame = el;
    }
    el = el.parentElement;
  }
  if (frame) return frame;
  const snap = photos[0].closest("[data-testid='ScrollSnap-SwipeableList']");
  if (snap) {
    const box = findCarouselBox(snap);
    if (box) return box;
  }
  if (photos.length >= 2) {
    const group = findGroupBox(photos);
    if (group) return group;
  }
  return findSpacerBox(photos[0])?.box || photos[0];
}

function applyNativeCap(el, pct) {
  if (!el) return;
  el.setAttribute("data-widex-native-cap", "1");
  el.setAttribute("data-widex-sensitive-native", "1");
  if (!current.limitHeight) {
    ["max-width", "width", "max-height", "height", "padding-bottom", "overflow", "box-sizing"].forEach(
      (prop) => {
        if (el.style.getPropertyPriority(prop) === "important") el.style.removeProperty(prop);
      }
    );
    el.removeAttribute("data-widex-native-cap");
    el.removeAttribute("data-widex-sensitive-native");
    return;
  }
  el.style.setProperty("padding-bottom", "0px", "important");
  el.style.setProperty("height", `${current.maxHeight}px`, "important");
  el.style.setProperty("max-height", `${current.maxHeight}px`, "important");
  el.style.setProperty("overflow", "hidden", "important");
  el.style.setProperty("box-sizing", "border-box", "important");
  if (pct > 10) {
    const maxWidth = (current.maxHeight * 100) / pct;
    el.style.setProperty("max-width", `${maxWidth}px`, "important");
    el.style.setProperty("width", `${maxWidth}px`, "important");
  }
}

function capFrameAndShell(frame) {
  if (!frame) return;
  const pct = spacerPct(frame) || spacerPct(findSpacerBox(frame)?.spacer) || 0;
  applyNativeCap(frame, pct);
  let el = frame.parentElement;
  for (let i = 0; i < 6 && el && !isTweetRoot(el) && !isQuoteCard(el); i++) {
    el.style.setProperty("max-height", `${current.maxHeight}px`, "important");
    el.style.setProperty("height", `${current.maxHeight}px`, "important");
    el.style.setProperty("overflow", "hidden", "important");
    const cls = el.className?.toString?.() || "";
    if (cls.includes("r-l3hqri")) break;
    el = el.parentElement;
  }
}

function capUnflattenedFrames(col) {
  const groups = new Map();
  col.querySelectorAll("[data-testid='tweetPhoto']").forEach((photo) => {
    if (photo.closest(".widex-row, .widex-single, [data-widex-hidden='1']")) return;
    const root = groupRoot(photo);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(photo);
  });
  groups.forEach((photos) => {
    const mixed = photos.some((photo) => isPlayableMedia(photo)) && photos.length > 1;
    const sensitive = photos.some((photo) => hasSensitiveWarning(photo));
    if (!mixed && !sensitive && photos.length < 2) {
      const one = photos[0];
      if (one && (isPlayableMedia(one) || hasSensitiveWarning(one))) {
        capFrameAndShell(findSensitiveFrame(photos));
      }
      return;
    }
    if (!mixed && !sensitive) return;
    capFrameAndShell(findSensitiveFrame(photos));
  });
  col.querySelectorAll("article[data-testid='tweet']").forEach((article) => {
    if (!isSensitiveText(article.innerText || "")) return;
    article.querySelectorAll("[style*='padding-bottom']").forEach((el) => {
      if (el.closest(".widex-row, .widex-single, [data-widex-hidden='1']")) return;
      if (
        !el.querySelector(
          "[data-testid='tweetPhoto'], [data-testid='videoPlayer'], [data-testid='previewInterstitial'], nav"
        )
      ) {
        return;
      }
      capFrameAndShell(el);
    });
  });
}

function capNativeBox(photo) {
  if (photo.closest(".widex-row, .widex-single")) return;
  if (photo.closest("[data-widex-native-cap], [data-widex-sensitive-native]")) return;
  if (hasSensitiveWarning(photo)) return;
  if (isPlayableMedia(photo)) {
    capPlayable(photo);
    return;
  }
  const found = findSpacerBox(photo);
  if (found) applyAspectCap(found.box, found.spacer);
}

function capLinkCards(col) {
  col.querySelectorAll('[data-testid="card.wrapper"]').forEach((card) => {
    if (isPlayableMedia(card)) {
      capPlayable(card);
      return;
    }
    const spacer = card.querySelector("[style*='padding-bottom']");
    if (!spacer) return;
    applyAspectCap(spacer.parentElement, spacer);
  });
}

function capVideos(col) {
  const seen = new Set();
  const starts = [
    ...col.querySelectorAll("[data-widex-playable='1']"),
    ...col.querySelectorAll("[data-testid='videoPlayer']"),
    ...col.querySelectorAll("[data-testid='previewInterstitial']"),
  ];
  starts.forEach((el) => {
    if (el.closest(".widex-row, .widex-single")) return;
    const shell = el.closest("[data-widex-cap='1']") || findMediaShell(el);
    if (shell && seen.has(shell)) return;
    if (shell) seen.add(shell);
    capPlayable(el);
  });
}

function rowAvailWidth(row) {
  const quote = row.closest("div[role='link']");
  const article = row.closest("article");
  const col = row.closest("[data-testid='primaryColumn']");
  const widths = [];
  if (quote && quote.tagName !== "A" && quote.clientWidth > 40) widths.push(quote.clientWidth);
  if (row.parentElement?.clientWidth > 40) widths.push(row.parentElement.clientWidth);
  if (article?.clientWidth > 40) widths.push(article.clientWidth);
  if (col?.clientWidth > 40) widths.push(col.clientWidth);
  if (current.width > 40) widths.push(current.width);
  if (row.clientWidth > 40) widths.push(row.clientWidth);
  return widths.length ? Math.min(...widths) : 0;
}

function packedRowHeight(row) {
  const imgs = [...row.querySelectorAll(":scope > a img")];
  if (!imgs.length) return current.maxHeight;
  const avail = rowAvailWidth(row);
  const gap = 2;
  let total = 0;
  let ready = 0;
  imgs.forEach((img, i) => {
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (nw > 0 && nh > 0) {
      ready += 1;
      total += (current.maxHeight * nw) / nh + (i ? gap : 0);
    }
  });
  if (ready === 0 || avail <= 0 || total <= avail) return current.maxHeight;
  return Math.max(1, Math.floor(current.maxHeight * (avail / total)));
}

function fitRow(row) {
  row.style.removeProperty("zoom");
  const imgs = [...row.querySelectorAll(":scope > a img")];
  imgs.forEach((img) => {
    if (!img.complete) img.addEventListener("load", () => fitRow(row), { once: true });
  });
  if (!current.limitHeight) {
    imgs.forEach(capImg);
    delete row.dataset.widexFitH;
    return;
  }
  const avail = rowAvailWidth(row);
  if (row.dataset.widexFitLock === "1") {
    const prevAvail = parseFloat(row.dataset.widexFitAvail || "0");
    if (Math.abs(avail - prevAvail) < 48) return;
  }
  const height = packedRowHeight(row);
  const key = `${height}:${avail}:${current.maxHeight}:${imgs.length}`;
  if (row.dataset.widexFitH === key) return;
  row.dataset.widexFitting = "1";
  row.dataset.widexFitH = key;
  imgs.forEach((img) => {
    img.style.setProperty("width", "auto", "important");
    img.style.setProperty("height", "auto", "important");
    img.style.removeProperty("max-width");
    img.style.setProperty("max-height", `${height}px`, "important");
    img.style.setProperty("object-fit", "contain", "important");
    const link = img.closest(".widex-row > a");
    if (link) {
      link.style.setProperty("flex", "0 0 auto", "important");
      link.style.setProperty("width", "auto", "important");
    }
  });
  row.dataset.widexFitAvail = String(avail);
  if (imgs.every((img) => img.complete && img.naturalWidth)) {
    row.dataset.widexFitLock = "1";
  }
  requestAnimationFrame(() => {
    delete row.dataset.widexFitting;
  });
}

function fitSingle(wrap) {
  wrap.style.removeProperty("zoom");
  const img = wrap.querySelector("img");
  if (img) {
    if (!img.complete) img.addEventListener("load", () => capImg(img), { once: true });
    capImg(img);
  }
}

function watchMedia(el, fit) {
  if (el.dataset.widexObserved === "1") return;
  el.dataset.widexObserved = "1";
  let timer = 0;
  const observer = new ResizeObserver(() => {
    if (el.dataset.widexFitting === "1") return;
    clearTimeout(timer);
    timer = setTimeout(() => fit(el), 50);
  });
  observer.observe(el);
}

function samePhotoHref(a, b) {
  if (!a || !b) return false;
  const normalize = (value) => {
    try {
      const url = new URL(value, location.origin);
      return url.pathname.replace(/\/$/, "");
    } catch {
      return String(value);
    }
  };
  return normalize(a) === normalize(b);
}

function findOriginalPhotoLink(from, href) {
  const host = from.closest(".widex-row, .widex-single");
  const scope = host?.parentElement || from.closest("article") || document;
  const originals = [...scope.querySelectorAll("a[href*='/photo/']")].filter(
    (anchor) => !anchor.closest(".widex-row, .widex-single")
  );
  return (
    originals.find((anchor) => samePhotoHref(anchor.getAttribute("href"), href)) ||
    originals[0] ||
    null
  );
}

function clickOriginalPhoto(anchor) {
  if (!anchor) return;
  const hidden = anchor.closest("[data-widex-hidden='1']");
  const restore = [];
  if (hidden) {
    ["display", "position", "left", "top", "width", "height", "opacity", "overflow"].forEach(
      (prop) => restore.push([prop, hidden.style.getPropertyValue(prop), hidden.style.getPropertyPriority(prop)])
    );
    hidden.style.setProperty("display", "block", "important");
    hidden.style.setProperty("position", "fixed", "important");
    hidden.style.setProperty("left", "0", "important");
    hidden.style.setProperty("top", "0", "important");
    hidden.style.setProperty("width", "1px", "important");
    hidden.style.setProperty("height", "1px", "important");
    hidden.style.setProperty("opacity", "0", "important");
    hidden.style.setProperty("overflow", "hidden", "important");
  }
  anchor.click();
  if (hidden) {
    restore.forEach(([prop, value, priority]) => {
      if (value) hidden.style.setProperty(prop, value, priority);
      else hidden.style.removeProperty(prop);
    });
    hidden.style.setProperty("display", "none", "important");
  }
}

function bindNativePhotoClick(link, href) {
  if (link.dataset.widexBound === "1") return;
  link.dataset.widexBound = "1";
  link.addEventListener(
    "click",
    (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const original = findOriginalPhotoLink(link, href || link.getAttribute("href"));
      clickOriginalPhoto(original);
    },
    true
  );
}

function findImageCard(photo) {
  const start = photo.closest("a[href*='/photo/']") || photo;
  let el = start;
  for (let i = 0; i < 4 && el.parentElement; i++) {
    const parent = el.parentElement;
    if (
      parent.matches("article") ||
      parent.getAttribute("data-testid") === "tweet" ||
      parent.getAttribute("role") === "link"
    ) {
      break;
    }
    el = parent;
  }
  return el;
}

function photoStatusKey(photo) {
  const href = photo.closest("a[href*='/photo/']")?.getAttribute("href") || "";
  const match = href.match(/\/status\/(\d+)/);
  return match ? match[1] : "";
}

function isSinglePhoto(photo) {
  const snap = photo.closest("[data-testid='ScrollSnap-List']");
  if (snap) return snap.querySelectorAll("[data-testid='tweetPhoto']").length === 1;

  const key = photoStatusKey(photo);
  const scope =
    photo.closest("div[role='link']") ||
    photo.closest("article") ||
    photo.parentElement;
  if (!scope) return false;

  const photos = [...scope.querySelectorAll("[data-testid='tweetPhoto']")].filter(
    (other) => {
      if (other.closest("[data-testid='ScrollSnap-List']")) return false;
      if (other.closest("[data-testid='videoPlayer']")) return false;
      if (other.closest("[data-testid='previewInterstitial']")) return false;
      if (key) return photoStatusKey(other) === key;
      return other.closest("div[role='link']") === photo.closest("div[role='link']");
    }
  );
  return photos.length === 1;
}

function makeSingleWrap(href, url) {
  const wrap = document.createElement("div");
  wrap.className = "widex-single";
  const link = document.createElement("a");
  link.href = href || url;
  link.rel = "noopener";
  const img = document.createElement("img");
  img.src = url;
  img.alt = "";
  img.addEventListener("load", () => capImg(img), { once: true });
  link.appendChild(img);
  wrap.appendChild(link);
  bindNativePhotoClick(link, link.getAttribute("href"));
  return wrap;
}

function hideNative(el) {
  if (!el) return;
  el.setAttribute("data-widex-hidden", "1");
  el.style.setProperty("display", "none", "important");
}

function quoteCondensedHost(photo) {
  const condensed = photo.closest("[data-testid='testCondensedMedia']");
  if (!condensed) return null;
  const row = condensed.parentElement;
  const host = row?.parentElement;
  if (!host || isTweetRoot(host)) return null;
  return { condensed, row, host };
}

function flattenOnePhoto(photo) {
  if (photo.closest(".widex-row, .widex-single, [data-widex-hidden='1']")) return;
  if (photo.closest("[data-testid='ScrollSnap-List']")) return;
  if (isPlayableMedia(photo)) return;
  if (hasSensitiveWarning(photo)) return;
  const photoLink =
    photo.closest("a[href*='/photo/']") || photo.querySelector("a[href*='/photo/']");
  if (!photoLink) return;
  if (!isSinglePhoto(photo)) return;

  const url = photoUrl(photo);
  if (!url) return;
  if (/amplify_video_thumb|ext_tw_video_thumb|tweet_video_thumb|video\.twimg\.com/i.test(url)) {
    markPlayable(photo);
    return;
  }

  const quoteHost = quoteCondensedHost(photo);
  const card = findImageCard(photo);
  const parent = quoteHost?.host || card.parentElement;
  const before = quoteHost ? quoteHost.row.nextSibling : card;
  if (!parent) return;
  if (looksLikePlayable(card)) {
    markPlayable(photo);
    return;
  }

  const existing = parent.querySelector(":scope > .widex-single");
  if (existing) {
    hideNative(quoteHost?.condensed || card);
    watchMedia(existing, fitSingle);
    fitSingle(existing);
    return;
  }

  const wrap = makeSingleWrap(photoLink.getAttribute("href") || url, url);
  parent.insertBefore(wrap, before);
  hideNative(quoteHost?.condensed || card);
  watchMedia(wrap, fitSingle);
  fitSingle(wrap);
}

function flattenCarousel(swipe) {
  if (!swipe.querySelector("[data-testid='tweetPhoto']")) return;
  if (hasSensitiveWarning(swipe)) return;
  if (isPlayableMedia(swipe)) return;

  const photos = [...swipe.querySelectorAll("[data-testid='tweetPhoto']")];
  if (photos.length < 2) return;
  if (photos.some((photo) => isPlayableMedia(photo))) return;

  const items = photos
    .map((photo) => ({
      url: photoUrl(photo),
      href: photo.closest("a")?.getAttribute("href") || "",
    }))
    .filter((item) => item.url);

  if (items.length < 2) return;

  const box = findCarouselBox(swipe);
  const parent = box.parentElement;
  if (!parent) return;

  let row = parent.querySelector(":scope > .widex-row");
  if (!row) {
    row = document.createElement("div");
    row.className = "widex-row";
    items.forEach((item) => {
      const link = document.createElement("a");
      link.href = item.href || item.url;
      link.rel = "noopener";
      const img = document.createElement("img");
      img.src = item.url;
      img.alt = "";
      link.appendChild(img);
      bindNativePhotoClick(link, link.getAttribute("href"));
      row.appendChild(link);
    });
    parent.insertBefore(row, box);
  }

  hideNative(box);
  watchMedia(row, fitRow);
  fitRow(row);
}

function groupRoot(photo) {
  let el = photo.parentElement;
  while (el) {
    if (isQuoteCard(el)) return el;
    if (isTweetRoot(el)) return el;
    el = el.parentElement;
  }
  return photo.parentElement;
}

function isTinyMediaNode(el) {
  if (!el) return true;
  if (el.getAttribute("data-testid") === "tweetPhoto") return true;
  if (el.tagName === "A") return true;
  return false;
}

function findGroupBox(photos) {
  if (photos.length < 2) return null;
  let node = photos[0];
  while (node && !photos.every((photo) => node === photo || node.contains(photo))) {
    node = node.parentElement;
    if (!node || isQuoteCard(node) || isTweetRoot(node)) return null;
  }
  if (!node || isTinyMediaNode(node)) return null;

  let aspect = null;
  let current = node;
  while (current && !isQuoteCard(current) && !isTweetRoot(current)) {
    const spacer = [...current.children].find((child) => {
      const pct = parseFloat(child.style?.paddingBottom);
      return String(child.getAttribute("style") || "").includes("padding-bottom") && pct > 10;
    });
    if (spacer) aspect = current;
    const extraText = current.querySelector("[data-testid='tweetText']");
    if (extraText && photos.every((photo) => !photo.contains(extraText))) {
      const mediaOnly = [...current.children].find((child) =>
        photos.every((photo) => child.contains(photo))
      );
      if (mediaOnly && !isTinyMediaNode(mediaOnly)) return aspect || mediaOnly;
      break;
    }
    current = current.parentElement;
  }
  return aspect || node;
}

function flattenPhotoList(photos) {
  const items = photos
    .map((photo) => ({
      url: photoUrl(photo),
      href: photo.closest("a")?.getAttribute("href") || "",
    }))
    .filter((item) => item.url);
  if (items.length < 2) return;

  const box = findGroupBox(photos);
  if (!box || isQuoteCard(box) || isTweetRoot(box) || isTinyMediaNode(box)) return;
  if (!photos.every((photo) => box.contains(photo))) return;
  const parent = box.parentElement;
  if (!parent) return;

  let row = parent.querySelector(":scope > .widex-row");
  if (!row) {
    row = document.createElement("div");
    row.className = "widex-row";
    items.forEach((item) => {
      const link = document.createElement("a");
      link.href = item.href || item.url;
      link.rel = "noopener";
      const img = document.createElement("img");
      img.src = item.url;
      img.alt = "";
      link.appendChild(img);
      bindNativePhotoClick(link, item.href);
      row.appendChild(link);
    });
    parent.insertBefore(row, box);
  }

  hideNative(box);
  watchMedia(row, fitRow);
  fitRow(row);
}

function flattenPhotoGroups(col) {
  const groups = new Map();
  col.querySelectorAll("[data-testid='tweetPhoto']").forEach((photo) => {
    if (photo.closest(".widex-row, .widex-single, [data-widex-hidden='1']")) return;
    if (photo.closest("[data-testid='ScrollSnap-List']")) return;
    if (isPlayableMedia(photo)) return;
    if (hasSensitiveWarning(photo)) return;
    if (!photoUrl(photo)) return;
    const root = groupRoot(photo);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(photo);
  });
  groups.forEach((photos) => {
    if (photos.length >= 2) flattenPhotoList(photos);
  });
}

function relocateQuoteSingles(col) {
  col.querySelectorAll("[data-testid='testCondensedMedia'] .widex-single").forEach((wrap) => {
    const condensed = wrap.closest("[data-testid='testCondensedMedia']");
    const row = condensed?.parentElement;
    const host = row?.parentElement;
    if (!host || wrap.parentElement === host) return;
    host.insertBefore(wrap, row.nextSibling);
    hideNative(condensed);
    watchMedia(wrap, fitSingle);
    fitSingle(wrap);
  });
}

function preserveScroll(fn) {
  if (!current.limitHeight) {
    fn();
    return;
  }
  const se = document.scrollingElement || document.documentElement;
  const articles = document.querySelectorAll("article[data-testid='tweet']");
  let anchor = null;
  for (const article of articles) {
    const rect = article.getBoundingClientRect();
    if (rect.bottom > 100 && rect.top < window.innerHeight - 40) {
      anchor = article;
      break;
    }
  }
  const fromTop = anchor ? anchor.getBoundingClientRect().top : 0;
  fn();
  if (anchor?.isConnected) {
    const delta = anchor.getBoundingClientRect().top - fromTop;
    if (Math.abs(delta) > 2) se.scrollTop += delta;
  }
}

function patchTimeline() {
  syncSidebar();
  syncShell();
  const col = document.querySelector('[data-testid="primaryColumn"]');
  if (!col) return;

  preserveScroll(() => {
    col.querySelectorAll(".r-1ye8kvj").forEach(uncap600);
    restorePlayableMedia(col);
    col.querySelectorAll("[data-testid='tweetPhoto']").forEach((photo) => {
      if (isPlayableMedia(photo)) markPlayable(photo);
    });
    col
      .querySelectorAll("[data-testid='ScrollSnap-SwipeableList']")
      .forEach(flattenCarousel);
    flattenPhotoGroups(col);
    col.querySelectorAll("[data-testid='tweetPhoto']").forEach((photo) => {
      flattenOnePhoto(photo);
      capNativeBox(photo);
    });
    capUnflattenedFrames(col);
    relocateQuoteSingles(col);
    capLinkCards(col);
    capVideos(col);
    col.querySelectorAll(".widex-row").forEach((row) => {
      watchMedia(row, fitRow);
      fitRow(row);
    });
    col.querySelectorAll(".widex-single").forEach((wrap) => {
      watchMedia(wrap, fitSingle);
      fitSingle(wrap);
    });
    syncSensitive();
    col.querySelectorAll(".widex-row a, .widex-single a").forEach((link) => {
      bindNativePhotoClick(link, link.getAttribute("href"));
    });
  });
}

let scheduled = false;
function schedulePatch() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    patchTimeline();
  });
}

readSettings(applySettings);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  readSettings((settings) => applySettings(settings, { notify: true }));
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "widex-ping") {
    sendResponse({ ok: true, settings: current });
    return;
  }
  if (message?.type === "widex-settings" && message.settings) {
    applySettings(message.settings, { notify: true });
    sendResponse({ ok: true, settings: current });
  }
});

const observer = new MutationObserver(schedulePatch);
function startObserver() {
  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });
}

if (document.body) startObserver();
else document.addEventListener("DOMContentLoaded", startObserver, { once: true });
