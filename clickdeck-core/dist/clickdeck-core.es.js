// src/diagnostics/logger.ts
var MAX_LOGS = 100;
var buffer = [];
function getRecentLogs() {
  return [...buffer];
}
function createLogger(context) {
  return {
    debug: (message, details) => writeLog("debug", context, message, details),
    info: (message, details) => writeLog("info", context, message, details),
    warn: (message, details) => writeLog("warn", context, message, details),
    error: (message, details) => writeLog("error", context, message, details)
  };
}
function writeLog(level, context, message, details) {
  const payload = [`[ClickDeck:${context}] ${message}`];
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    level,
    context,
    message,
    details,
    createdAt: Date.now()
  };
  buffer.push(entry);
  if (buffer.length > MAX_LOGS) {
    buffer.shift();
  }
  if (details === void 0) {
    console[level](payload[0]);
    return;
  }
  console[level](payload[0], details);
}

// src/adapters/storage.ts
var storage = {
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return Promise.resolve(void 0);
      return Promise.resolve(JSON.parse(raw));
    } catch {
      return Promise.resolve(void 0);
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("[clickdeck-storage] Failed to write", key, e);
    }
    return Promise.resolve();
  },
  remove(key) {
    localStorage.removeItem(key);
    return Promise.resolve();
  }
};

// src/state/editor-state.ts
function createEditorState() {
  return {
    active: false,
    selected: null,
    patches: []
  };
}
function setEditorActive(state, active) {
  state.active = active;
}
function setSelectedElement(state, selected) {
  state.selected = selected;
}
function recordStylePatch(state, patch) {
  state.patches.push(patch);
}
function recordContentPatch(state, patch) {
  state.patches.push(patch);
}
function buildStorageKey(href) {
  try {
    const url = new URL(href);
    return `clickdeck:page-edits:v1:${url.origin}${url.pathname}${url.search}`;
  } catch {
    const withoutHash = href.split("#")[0];
    return `clickdeck:page-edits:v1:${withoutHash}`;
  }
}
function serializePatches(patches) {
  const persisted = [];
  for (const patch of patches) {
    const locator = patch.targetLocator;
    if (!locator) {
      continue;
    }
    if (patch.kind === "style") {
      persisted.push({
        id: patch.id,
        kind: patch.kind,
        targetDescriptor: patch.targetDescriptor,
        targetLocator: locator,
        property: patch.property,
        before: patch.before,
        after: patch.after,
        createdAt: patch.createdAt
      });
      continue;
    }
    if (patch.kind === "attribute") {
      persisted.push({
        id: patch.id,
        kind: patch.kind,
        targetDescriptor: patch.targetDescriptor,
        targetLocator: locator,
        attribute: patch.attribute,
        before: patch.before,
        after: patch.after,
        createdAt: patch.createdAt
      });
      continue;
    }
    persisted.push({
      id: patch.id,
      kind: patch.kind,
      targetDescriptor: patch.targetDescriptor,
      targetLocator: locator,
      before: patch.before,
      after: patch.after,
      createdAt: patch.createdAt
    });
  }
  return persisted;
}
function findElementByLocator(locator) {
  const candidates = [];
  if (locator.cssPath) candidates.push(locator.cssPath);
  if (locator.nthOfTypePath) candidates.push(locator.nthOfTypePath);
  for (const selector of candidates) {
    try {
      const el = document.querySelector(selector);
      if (!(el instanceof Element)) {
        continue;
      }
      if (el.tagName.toLowerCase() !== locator.tagName.toLowerCase()) {
        continue;
      }
      return el;
    } catch {
    }
  }
  return null;
}
function hydratePersistedPatches(persisted, logger) {
  const patches = [];
  for (const entry of persisted) {
    const target = findElementByLocator(entry.targetLocator);
    if (!target) {
      logger?.warn?.("Persisted patch target not found; skipping", {
        target: entry.targetDescriptor,
        locator: entry.targetLocator
      });
      continue;
    }
    if (entry.kind === "style") {
      if (!(target instanceof HTMLElement)) {
        logger?.warn?.("Persisted style patch target is not an HTMLElement; skipping", {
          target: entry.targetDescriptor,
          locator: entry.targetLocator
        });
        continue;
      }
      patches.push({
        id: entry.id,
        kind: "style",
        targetElement: target,
        targetDescriptor: entry.targetDescriptor,
        targetLocator: entry.targetLocator,
        property: entry.property,
        before: entry.before,
        after: entry.after,
        createdAt: entry.createdAt
      });
      continue;
    }
    if (entry.kind === "attribute") {
      if (!(target instanceof HTMLElement)) {
        logger?.warn?.("Persisted attribute patch target is not an HTMLElement; skipping", {
          target: entry.targetDescriptor,
          locator: entry.targetLocator
        });
        continue;
      }
      patches.push({
        id: entry.id,
        kind: "attribute",
        targetElement: target,
        targetDescriptor: entry.targetDescriptor,
        targetLocator: entry.targetLocator,
        attribute: entry.attribute ?? "src",
        before: entry.before,
        after: entry.after,
        createdAt: entry.createdAt
      });
      continue;
    }
    patches.push({
      id: entry.id,
      kind: "content",
      targetElement: target,
      targetDescriptor: entry.targetDescriptor,
      targetLocator: entry.targetLocator,
      before: entry.before,
      after: entry.after,
      createdAt: entry.createdAt
    });
  }
  return patches;
}

// src/state/history.ts
function createEditHistory() {
  return {
    undoStack: [],
    redoStack: []
  };
}

// src/content/complex-elements.ts
var FORMULA_SELECTOR = "math, .katex, .mathjax, mjx-container";
function getComplexElementKind(element) {
  if (!element) {
    return null;
  }
  const tagName = element.tagName.toLowerCase();
  if (tagName === "svg") return "svg";
  if (tagName === "canvas") return "canvas";
  if (tagName === "iframe") return "iframe";
  if (isFormulaElement(element)) return "formula";
  return null;
}
function getComplexElementInfo(element) {
  if (!element) {
    return null;
  }
  const kind = getComplexElementKind(element);
  if (!kind) {
    return null;
  }
  switch (kind) {
    case "svg":
      return { kind, label: "svg", promptLabel: "inline SVG" };
    case "canvas":
      return { kind, label: "canvas", promptLabel: "canvas" };
    case "formula":
      return { kind, label: "formula", promptLabel: getFormulaPromptLabel(element) };
    case "iframe":
      return { kind, label: "iframe", promptLabel: getIframePromptLabel(element) };
  }
}
function findComplexElementFromTarget(target) {
  if (!(target instanceof Element)) {
    return null;
  }
  if (isInsideClickDeckUi(target)) {
    return null;
  }
  const directKind = getComplexElementKind(target);
  if (directKind) {
    return target;
  }
  const complex = target.closest(`svg, canvas, iframe, ${FORMULA_SELECTOR}`);
  return complex && !isInsideClickDeckUi(complex) ? complex : null;
}
function isFormulaElement(element) {
  const tagName = element.tagName.toLowerCase();
  if (tagName === "math" || tagName === "mjx-container") {
    return true;
  }
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  return element.classList.contains("katex") || element.classList.contains("mathjax");
}
function isInsideClickDeckUi(element) {
  return Boolean(element.closest("[data-clickdeck='true']"));
}
function getComplexElementPromptNotes(element, isZh2) {
  const info = getComplexElementInfo(resolvePromptTarget(element));
  if (!info) {
    return [];
  }
  const isSvgTextTarget = isSimpleSvgTextTarget(element);
  if (isZh2) {
    const lines2 = [`   \u590D\u6742\u5143\u7D20\uFF1A${info.promptLabel}\u3002`];
    if (info.kind === "svg") {
      lines2.push(
        isSvgTextTarget ? "   \u8BF4\u660E\uFF1A\u8FD9\u662F inline SVG\u3002\u5F53\u524D\u53EA\u66FF\u6362\u5DF2\u68C0\u6D4B\u5230\u7684\u7B80\u5355 SVG \u6587\u5B57\u5185\u5BB9\uFF0C\u4E0D\u4FEE\u6539\u5185\u90E8\u8DEF\u5F84\u3001\u56FE\u5F62\u6216 viewBox \u7ED3\u6784\u3002" : "   \u8BF4\u660E\uFF1A\u8FD9\u662F inline SVG\uFF0C\u5F53\u524D\u53EA\u4FEE\u6539\u5176\u5916\u5C42\u6837\u5F0F\uFF0C\u4E0D\u8FDB\u5165\u5185\u90E8 path/text/viewBox \u7ED3\u6784\u3002"
      );
    } else if (info.kind === "canvas") {
      lines2.push("   \u8BF4\u660E\uFF1A\u8FD9\u662F canvas\uFF0C\u5185\u5BB9\u662F\u7ED8\u5236\u7ED3\u679C\uFF1B\u5F53\u524D\u53EA\u4FEE\u6539\u5916\u5C42\u6837\u5F0F\uFF0C\u4E0D\u8BC6\u522B\u6216\u4FEE\u6539\u5185\u90E8\u7ED8\u56FE\u5BF9\u8C61\uFF0C\u5982\u9700\u6539\u5185\u5BB9\u9700\u5148\u4FEE\u6539\u5BF9\u5E94\u7ED8\u5236\u4EE3\u7801\u6216\u751F\u6210\u903B\u8F91\u3002");
    } else if (info.kind === "formula") {
      lines2.push("   \u8BF4\u660E\uFF1A\u8FD9\u662F\u6E32\u67D3\u540E\u7684\u516C\u5F0F\u533A\u57DF\uFF1B\u5F53\u524D\u53EA\u4FEE\u6539\u5916\u5C42\u6837\u5F0F\uFF0C\u4E0D\u4FEE\u6539\u5185\u90E8\u516C\u5F0F\u7ED3\u6784\u3002\u5982\u9700\u6539\u5185\u5BB9\u5E94\u5148\u4FEE\u6539\u5BF9\u5E94\u7684\u6E90\u516C\u5F0F\uFF08\u5982 LaTeX \u6216 MathML\uFF09\u3002");
    } else if (info.kind === "iframe") {
      lines2.push(`   \u8BF4\u660E\uFF1A\u8FD9\u662F iframe \u5D4C\u5165\u5185\u5BB9${getIframeDetails(element, true)}\uFF1B\u5F53\u524D\u53EA\u4FEE\u6539\u5916\u5C42 iframe\uFF0C\u4E0D\u8FDB\u5165\u5185\u90E8\u9875\u9762\uFF0C\u5982\u9700\u6539\u5185\u5BB9\u5E94\u5148\u4FEE\u6539\u5176\u52A0\u8F7D\u9875\u9762\u7684\u6E90\u4EE3\u7801\u6216\u751F\u6210\u903B\u8F91\u3002`);
    }
    return lines2;
  }
  const lines = [`   Complex element: ${info.promptLabel}.`];
  if (info.kind === "svg") {
    lines.push(
      isSvgTextTarget ? "   Note: This is inline SVG. Only detected simple SVG text content is changed; internal paths, graphics, and viewBox structure are not edited." : "   Note: This is inline SVG. Only outer styles are changed; internal path/text/viewBox structure is not edited."
    );
  } else if (info.kind === "canvas") {
    lines.push("   Note: This is canvas. Its content is drawn output; only outer styles are changed. To change its content, edit the underlying drawing code or generation logic.");
  } else if (info.kind === "formula") {
    lines.push("   Note: This is a rendered formula region. Only outer styles are changed; the underlying formula source (such as LaTeX or MathML) is not edited.");
  } else if (info.kind === "iframe") {
    lines.push(`   Note: This is embedded iframe content${getIframeDetails(element, false)}. Only the outer iframe is changed; to modify its content, edit the source page or generation logic loaded inside the iframe.`);
  }
  return lines;
}
function isSimpleSvgTextTarget(element) {
  const tagName = element.tagName.toLowerCase();
  return tagName === "text" || tagName === "tspan";
}
function getEditableSvgTextTarget(target) {
  if (!(target instanceof SVGElement)) {
    return null;
  }
  const tagName = target.tagName.toLowerCase();
  if (tagName !== "text" && tagName !== "tspan") {
    return null;
  }
  const ownerSvg = target.closest("svg");
  if (!(ownerSvg instanceof SVGSVGElement)) {
    return null;
  }
  const svgTextState = getSvgTextEditState(ownerSvg);
  if (!svgTextState || svgTextState.mode !== "editable") {
    return null;
  }
  const editableItem = svgTextState.items.find((item) => item.target === target);
  return editableItem?.target ?? null;
}
function getSvgTextEditState(element) {
  if (!(element instanceof SVGSVGElement)) {
    return null;
  }
  const textElements = Array.from(element.querySelectorAll("text"));
  if (textElements.length === 0) {
    return { mode: "none" };
  }
  const items = [];
  let sawComplex = false;
  for (const textEl of textElements) {
    if (isInsideUnsupportedSvgContainer(textEl) || textEl.querySelector("textPath, foreignObject")) {
      sawComplex = true;
      continue;
    }
    if (textEl.children.length === 0) {
      const value = normalizeSvgText(textEl.textContent);
      if (value) {
        items.push({
          id: `text-${items.length + 1}`,
          label: `Text ${items.length + 1}`,
          value,
          target: textEl
        });
      }
      continue;
    }
    const childElements = Array.from(textEl.children);
    const hasOnlySimpleTspans = childElements.length > 0 && childElements.every((child) => child.tagName.toLowerCase() === "tspan") && childElements.every((child) => child.children.length === 0) && hasNoDirectTextOutsideChildren(textEl);
    if (!hasOnlySimpleTspans) {
      sawComplex = true;
      continue;
    }
    for (const child of childElements) {
      const tspan = child;
      const value = normalizeSvgText(tspan.textContent);
      if (!value) {
        continue;
      }
      items.push({
        id: `text-${items.length + 1}`,
        label: `Text ${items.length + 1}`,
        value,
        target: tspan
      });
    }
  }
  if (sawComplex) {
    return { mode: "complex" };
  }
  if (items.length === 0) {
    return { mode: "none" };
  }
  return { mode: "editable", items };
}
function getFormulaPromptLabel(element) {
  const tagName = element.tagName.toLowerCase();
  if (tagName === "math") return "formula / MathML";
  if (tagName === "mjx-container") return "formula / MathJax";
  if (element instanceof HTMLElement && element.classList.contains("katex")) return "formula / KaTeX";
  if (element instanceof HTMLElement && element.classList.contains("mathjax")) return "formula / MathJax";
  return "formula";
}
function getIframePromptLabel(element) {
  if (!(element instanceof HTMLIFrameElement)) {
    return "iframe";
  }
  return element.hasAttribute("srcdoc") ? "iframe / srcdoc" : "iframe";
}
function getIframeDetails(element, isZh2) {
  if (!(element instanceof HTMLIFrameElement)) {
    return "";
  }
  const details = [];
  const src = element.getAttribute("src");
  if (src) {
    details.push(`src=${JSON.stringify(src.slice(0, 120))}`);
  }
  if (element.hasAttribute("srcdoc")) {
    details.push(isZh2 ? "\u5305\u542B srcdoc" : "has srcdoc");
  }
  return details.length ? ` (${details.join(", ")})` : "";
}
function resolvePromptTarget(element) {
  if (getComplexElementKind(element)) {
    return element;
  }
  return element.closest(`svg, canvas, iframe, ${FORMULA_SELECTOR}`) ?? element;
}
function isInsideUnsupportedSvgContainer(element) {
  return Boolean(element.closest("defs, mask, clipPath, foreignObject"));
}
function hasNoDirectTextOutsideChildren(element) {
  return Array.from(element.childNodes).every((node) => {
    if (node.nodeType !== Node.TEXT_NODE) {
      return true;
    }
    return !(node.textContent ?? "").trim();
  });
}
function normalizeSvgText(value) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

// src/content/dom-utils.ts
function describeElement(element) {
  const id = element.id ? `#${element.id}` : "";
  const classAttr = element.getAttribute("class")?.trim() ?? "";
  const className = classAttr ? `.${classAttr.split(/\s+/).slice(0, 2).join(".")}` : "";
  return `${element.tagName.toLowerCase()}${id}${className}`;
}
function isClickDeckUiElement(element) {
  return Boolean(element.closest("[data-clickdeck='true']"));
}
function createElementLocator(element) {
  const tagName = element.tagName.toLowerCase();
  const idHint = element.id ? `#${element.id}` : void 0;
  const classHint = pickStableClassHint(element);
  const roleHint = pickRoleHint(element);
  const textSnippet = pickTextSnippet(element);
  const imageHint = pickImageHint(element);
  const siblingIndex = getSiblingIndex(element);
  const descriptorParts = [tagName];
  if (idHint) descriptorParts.push(idHint);
  if (classHint) descriptorParts.push(classHint);
  if (textSnippet) descriptorParts.push(`"${textSnippet}"`);
  const descriptor = descriptorParts.join(" ");
  const cssPath = buildCssPath(element);
  const nthOfTypePath = buildNthOfTypePath(element);
  const { stability, reason } = assessSelectorStability(element, { cssPath, nthOfTypePath });
  return {
    descriptor,
    tagName,
    roleHint,
    textSnippet,
    imageHint,
    classHint,
    idHint,
    cssPath,
    nthOfTypePath,
    siblingIndex,
    parentDescriptor: pickParentDescriptor(element),
    backgroundImageHint: pickBackgroundImageHint(element),
    semanticRole: pickSemanticRole(element),
    semanticAncestor: pickSemanticAncestor(element),
    previousSiblingDescriptor: pickSiblingDescriptor(element, true),
    nextSiblingDescriptor: pickSiblingDescriptor(element, false),
    selectorStability: stability,
    selectorStabilityReason: reason
  };
}
function pickBackgroundImageHint(element) {
  if (!(element instanceof HTMLElement)) {
    return void 0;
  }
  try {
    const style = window.getComputedStyle(element);
    const bg = style.getPropertyValue("background-image");
    if (!bg || bg === "none" || bg === "initial") return void 0;
    if (bg.length > 100) return `${bg.slice(0, 97)}...`;
    return bg;
  } catch {
    return void 0;
  }
}
function pickSemanticRole(element) {
  const tagName = element.tagName.toLowerCase();
  if (/^h[1-6]$/.test(tagName)) return "heading";
  if (tagName === "p") return "paragraph";
  if (tagName === "img" || tagName === "svg") return "image";
  if (tagName === "button") return "button";
  if (tagName === "a") return "link";
  if (tagName === "input" || tagName === "textarea" || tagName === "select") return "input";
  if (tagName === "table") return "tableLike";
  const className = (element.getAttribute("class") ?? "").toLowerCase();
  if (className.includes("card")) return "cardLike";
  if (className.includes("section") || className.includes("container") || className.includes("wrapper")) return "sectionLike";
  if (className.includes("chart") || className.includes("graph")) return "chartLike";
  return void 0;
}
function pickSemanticAncestor(element) {
  let curr = element.parentElement;
  while (curr && curr !== document.body && curr !== document.documentElement) {
    const role = pickSemanticRole(curr);
    if (role === "cardLike" || role === "sectionLike") {
      const titleNode = curr.querySelector("h1, h2, h3, h4, h5, h6, .title, .header");
      if (titleNode && titleNode.textContent?.trim()) {
        const titleText = titleNode.textContent.trim();
        return `${role} ("${titleText.length > 20 ? titleText.slice(0, 17) + "..." : titleText}")`;
      }
      return role;
    }
    const slideCtx = getSlideContext(curr);
    if (slideCtx && slideCtx !== describeElement(curr)) {
      return slideCtx;
    }
    curr = curr.parentElement;
  }
  return void 0;
}
function pickSiblingDescriptor(element, isPrevious) {
  const sibling = isPrevious ? element.previousElementSibling : element.nextElementSibling;
  if (!sibling || !(sibling instanceof HTMLElement)) return void 0;
  return describeElement(sibling);
}
function assessSelectorStability(element, _paths) {
  if (element.id) {
    return { stability: "high", reason: "Has ID" };
  }
  const role = pickSemanticRole(element);
  const classHint = pickStableClassHint(element);
  if (classHint && role) {
    return { stability: "high", reason: "Has stable class and semantic role" };
  }
  const dataAttrs = Array.from(element.attributes).filter((a) => a.name.startsWith("data-") || a.name.startsWith("aria-"));
  if (dataAttrs.length > 0) {
    return { stability: "high", reason: "Has data/aria attributes" };
  }
  if (element.textContent?.trim() || role || classHint) {
    return { stability: "medium", reason: "Has some semantic/content hints but relies on nth-of-type" };
  }
  return { stability: "low", reason: "Pure nth-of-type chain without text or semantics" };
}
function canAutoStartTextEditing(element) {
  if (isClickDeckUiElement(element)) {
    return false;
  }
  const tagName = element.tagName.toLowerCase();
  if (getComplexElementKind(element)) {
    return false;
  }
  if (tagName === "img" || tagName === "button" || tagName === "input" || tagName === "textarea" || tagName === "select" || tagName === "svg" || tagName === "canvas" || tagName === "iframe") {
    return false;
  }
  if (element.isContentEditable) {
    return true;
  }
  const text = (element.textContent ?? "").trim();
  return text.length > 0;
}
function findFirstEditableDescendant(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    const element = node;
    if (!isClickDeckUiElement(element) && element !== document.body && element !== document.documentElement) {
      return element;
    }
    node = walker.nextNode();
  }
  return null;
}
function isMeaningfulElement(element) {
  if (isClickDeckUiElement(element)) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  try {
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
  } catch {
  }
  const tagName = element.tagName.toLowerCase();
  if (["img", "video", "svg", "canvas", "button", "input", "select", "textarea", "a", "label"].includes(tagName)) {
    return true;
  }
  if (/^h[1-6]$/.test(tagName) || ["p", "li", "td", "th"].includes(tagName)) {
    return true;
  }
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent && child.textContent.trim().length > 0) {
      return true;
    }
  }
  const className = typeof element.className === "string" ? element.className.toLowerCase() : "";
  if (className.includes("card") || className.includes("btn") || className.includes("item")) {
    return true;
  }
  if (className.includes("icon")) {
    if (element.getAttribute("aria-label") || element.getAttribute("title")) {
      return true;
    }
  }
  if (element.isContentEditable) return true;
  return false;
}
function findMeaningfulDescendant(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    const element = node;
    if (isMeaningfulElement(element) && element !== document.body && element !== document.documentElement) {
      return element;
    }
    node = walker.nextNode();
  }
  return null;
}
function pickRoleHint(element) {
  const ariaLabel = element.getAttribute("aria-label")?.trim();
  if (ariaLabel) return ariaLabel.slice(0, 80);
  const role = element.getAttribute("role")?.trim();
  if (role) return role.slice(0, 80);
  return void 0;
}
function pickTextSnippet(element) {
  const raw = (element.textContent ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return void 0;
  return raw.length > 80 ? `${raw.slice(0, 77)}...` : raw;
}
function pickImageHint(element) {
  if (element.tagName.toLowerCase() !== "img") return void 0;
  const img = element;
  const alt = img.alt?.trim();
  if (alt) return alt.length > 80 ? `${alt.slice(0, 77)}...` : alt;
  const src = img.currentSrc || img.src || "";
  const basename = safeBasename(src);
  return basename || void 0;
}
function pickStableClassHint(element) {
  const className = element.getAttribute("class") ?? "";
  const classes = className.split(/\s+/).map((value) => value.trim()).filter(Boolean);
  for (const candidate of classes) {
    if (!isLikelyStableToken(candidate)) {
      continue;
    }
    return `.${candidate}`;
  }
  const fallback = classes[0];
  if (fallback && fallback.length <= 32) {
    return `.${fallback}`;
  }
  return void 0;
}
function isLikelyStableToken(value) {
  if (value.length > 32) return false;
  if (looksLikeHash(value)) return false;
  if (/^\d+$/.test(value)) return false;
  return true;
}
function isElementVisible(element) {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    return false;
  }
  let current = element;
  while (current && current !== document.body && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) < 0.05) {
      return false;
    }
    current = current.parentElement;
  }
  return true;
}
function getSlideContext(element) {
  const container = element.closest('section, .slide, .page, [data-slide], [data-page], [aria-roledescription="slide"]');
  if (!container || !(container instanceof HTMLElement)) {
    return void 0;
  }
  const dataSlide = container.getAttribute("data-slide");
  const dataPage = container.getAttribute("data-page");
  const ariaLabel = container.getAttribute("aria-label");
  const id = container.id;
  if (dataSlide) return `Slide ${dataSlide}`;
  if (dataPage) return `Page ${dataPage}`;
  if (ariaLabel) return ariaLabel;
  if (id) return `Slide #${id}`;
  const firstHeading = container.querySelector("h1, h2, h3");
  if (firstHeading && firstHeading.textContent?.trim()) {
    const headingText = firstHeading.textContent.trim();
    return `Slide "${headingText.length > 30 ? headingText.slice(0, 27) + "..." : headingText}"`;
  }
  return describeElement(container);
}
function looksLikeHash(value) {
  if (value.length >= 16 && /^[a-f0-9]+$/i.test(value)) return true;
  if (value.length >= 22 && /^[a-z0-9_-]+$/i.test(value)) return true;
  return false;
}
function safeBasename(urlOrPath) {
  try {
    const url = new URL(urlOrPath, window.location.href);
    const pathname = url.pathname || "";
    const last = pathname.split("/").filter(Boolean).pop() ?? "";
    return decodeURIComponent(last);
  } catch {
    const cleaned = urlOrPath.split("?")[0].split("#")[0];
    const last = cleaned.split("/").filter(Boolean).pop() ?? "";
    return last;
  }
}
function buildCssPath(element) {
  const parts = [];
  let current = element;
  while (current && current.tagName.toLowerCase() !== "html") {
    if (current.id) {
      parts.push(`#${cssEscape(current.id)}`);
      break;
    }
    parts.push(simpleSelector(current));
    current = current.parentElement;
  }
  const selector = parts.reverse().join(" > ");
  return selector || simpleSelector(element);
}
function buildNthOfTypePath(element) {
  const parts = [];
  let current = element;
  while (current && current.tagName.toLowerCase() !== "html") {
    const tag = current.tagName.toLowerCase();
    const index = nthOfTypeIndex(current);
    parts.push(`${tag}:nth-of-type(${index})`);
    current = current.parentElement;
  }
  const selector = parts.reverse().join(" > ");
  return selector || `${element.tagName.toLowerCase()}:nth-of-type(${nthOfTypeIndex(element)})`;
}
function simpleSelector(element) {
  const tag = element.tagName.toLowerCase();
  const index = nthOfTypeIndex(element);
  return `${tag}:nth-of-type(${index})`;
}
function nthOfTypeIndex(element) {
  const parent = element.parentElement;
  if (!parent) return 1;
  const tag = element.tagName;
  const siblings = Array.from(parent.children).filter((child) => child.tagName === tag);
  const index = siblings.indexOf(element) + 1;
  return index > 0 ? index : 1;
}
function getSiblingIndex(element) {
  const parent = element.parentElement;
  if (!parent) return 0;
  return Array.from(parent.children).indexOf(element);
}
function pickParentDescriptor(element) {
  let current = element.parentElement;
  while (current && current.tagName.toLowerCase() !== "html") {
    const hasId = Boolean(current.id);
    const classHint = pickStableClassHint(current);
    const textSnippet = pickTextSnippet(current);
    const semantic = /^(main|section|article|header|footer|nav|aside)$/i.test(current.tagName);
    if (hasId || classHint || textSnippet || semantic) {
      const parts = [current.tagName.toLowerCase()];
      if (hasId) parts.push(`#${current.id}`);
      if (classHint) parts.push(classHint);
      if (textSnippet) parts.push(`"${textSnippet}"`);
      return parts.join(" ");
    }
    current = current.parentElement;
  }
  return void 0;
}
function cssEscape(value) {
  return value.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~\s])/g, "\\$1");
}
function placeCaretFromPoint(target, x, y) {
  try {
    let range = null;
    let node = null;
    let offset = 0;
    if (typeof document.caretRangeFromPoint === "function") {
      range = document.caretRangeFromPoint(x, y);
      if (range) {
        node = range.startContainer;
        offset = range.startOffset;
      }
    } else if (typeof document.caretPositionFromPoint === "function") {
      const position = document.caretPositionFromPoint(x, y);
      if (position) {
        node = position.offsetNode;
        offset = position.offset;
      }
    }
    if (node && target.contains(node)) {
      const maxOffset = node.nodeType === Node.TEXT_NODE ? node.nodeValue?.length ?? 0 : node.childNodes.length;
      if (offset >= 0 && offset <= maxOffset) {
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          const newRange = document.createRange();
          newRange.setStart(node, offset);
          newRange.collapse(true);
          sel.addRange(newRange);
          return true;
        }
      }
    }
  } catch (e) {
  }
  try {
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(target);
      newRange.collapse(false);
      sel.addRange(newRange);
    }
  } catch (e) {
  }
  return false;
}

// src/export/ask-gemini.ts
var COMMON_REQUIREMENTS_ZH = `\u8BF7\u5148\u6839\u636E\u5F53\u524D\u7F51\u9875\u5224\u65AD\u5B83\u66F4\u50CF\u54EA\u79CD\u7C7B\u578B\uFF1A\u65B9\u6848/PPT\u3001\u4EA7\u54C1\u754C\u9762\u3001\u8425\u9500\u9875\u3001\u5DE5\u5177\u9875\u3001\u6587\u7AE0\u9875\u6216\u5176\u4ED6\u3002\u540E\u7EED\u5EFA\u8BAE\u5FC5\u987B\u8D34\u5408\u8FD9\u4E2A\u9875\u9762\u7C7B\u578B\uFF0C\u4E0D\u8981\u5957\u7528\u56FA\u5B9A\u6A21\u677F\u3002

\u6267\u884C\u96BE\u5EA6\u5224\u65AD\u6807\u51C6\uFF1A
\u4F4E\uFF1A\u4E3B\u8981\u662F\u8C03\u6574\u987A\u5E8F\u3001\u5B57\u53F7\u3001\u95F4\u8DDD\u3001\u5F3A\u8C03\u5C42\u7EA7\u3001\u5220\u51CF\u6216\u79FB\u52A8\u73B0\u6709\u6A21\u5757\u3002
\u4E2D\uFF1A\u9700\u8981\u91CD\u6784\u4E00\u4E2A\u9875\u9762\u533A\u57DF\uFF0C\u6216\u52A0\u5165\u5C11\u91CF HTML/CSS/\u539F\u751F JS \u4EA4\u4E92\u3002
\u9AD8\uFF1A\u9700\u8981\u91CD\u505A\u591A\u9875\u7ED3\u6784\u3001\u590D\u6742\u52A8\u753B\u3001\u591A\u72B6\u6001\u4EA4\u4E92\u3001\u54CD\u5E94\u5F0F\u5927\u6539\uFF0C\u6216\u53EF\u80FD\u5F71\u54CD\u6574\u4F53\u67B6\u6784\u3002

\u63A8\u8350\u7A0B\u5EA6\u5224\u65AD\u6807\u51C6\uFF1A
\u2605\u2605\u2605\u2605\u2605\uFF1A\u4F4E\u6210\u672C\u4E14\u660E\u663E\u6539\u5584\u6838\u5FC3\u7406\u89E3\u3001\u8F6C\u5316\u6216\u64CD\u4F5C\u8DEF\u5F84\uFF0C\u5EFA\u8BAE\u4F18\u5148\u505A\u3002
\u2605\u2605\u2605\u2605\u2606\uFF1A\u6536\u76CA\u660E\u786E\uFF0C\u4F46\u9700\u8981\u4E00\u70B9\u91CD\u6392\u6216\u5224\u65AD\uFF0C\u9002\u5408\u5F53\u524D\u9636\u6BB5\u505A\u3002
\u2605\u2605\u2605\u2606\u2606\uFF1A\u6709\u5E2E\u52A9\uFF0C\u4F46\u4E0D\u662F\u5173\u952E\u95EE\u9898\uFF0C\u53EF\u4F5C\u4E3A\u53EF\u9009\u4F18\u5316\u3002
\u2605\u2605\u2606\u2606\u2606\uFF1A\u6536\u76CA\u6709\u9650\u6216\u5BB9\u6613\u5206\u6563\u91CD\u70B9\uFF0C\u4E0D\u5EFA\u8BAE\u5F53\u524D\u4F18\u5148\u505A\u3002
\u2605\u2606\u2606\u2606\u2606\uFF1A\u53EF\u80FD\u70AB\u6280\u3001\u8FC7\u5EA6\u8BBE\u8BA1\u6216\u5DE5\u7A0B\u6210\u672C\u504F\u9AD8\uFF0C\u5EFA\u8BAE\u6682\u7F13\u3002

\u7EA6\u675F\u6761\u4EF6\uFF1A
- \u6700\u591A\u8F93\u51FA 3 \u6761\u5EFA\u8BAE\u3002
- \u4E0D\u5199\u603B\u8BC4\uFF0C\u4E0D\u6CDB\u6CDB\u8868\u626C\uFF0C\u4E0D\u91CD\u5199\u6574\u4EFD\u9875\u9762\u3002
- \u4E0D\u5EFA\u8BAE\u590D\u6742\u540E\u53F0\u3001\u6570\u636E\u5E93\u3001AI API\u3001\u4E0A\u4F20\u670D\u52A1\u6216\u91CD\u505A\u6574\u7AD9\u3002
- \u6BCF\u6761\u5EFA\u8BAE\u5FC5\u987B\u5F15\u7528\u5F53\u524D\u9875\u9762\u4E2D\u7684\u5177\u4F53\u533A\u57DF\u3001\u6807\u9898\u3001\u6A21\u5757\u3001\u6309\u94AE\u3001\u8868\u683C\u6216\u53EF\u89C1\u6587\u5B57\u3002\u5982\u679C\u770B\u4E0D\u6E05\u9875\u9762\u5185\u5BB9\uFF0C\u5FC5\u987B\u8BF4\u660E\u4E0D\u786E\u5B9A\uFF0C\u4E0D\u8981\u5047\u88C5\u770B\u89C1\u3002
- \u4E09\u6761\u5EFA\u8BAE\u4E4B\u95F4\u5C3D\u91CF\u8986\u76D6\u4E0D\u540C\u9875\u9762\u3001\u4E0D\u540C\u533A\u57DF\u6216\u4E0D\u540C\u95EE\u9898\uFF0C\u4E0D\u8981\u5168\u90E8\u96C6\u4E2D\u5728\u540C\u4E00\u4E2A\u6A21\u5757\u3002
- \u4F18\u5148\u63A8\u8350\u4F4E\u6210\u672C\u3001\u5C11\u6539\u6587\u6848\u3001\u5C11\u52A0\u4EA4\u4E92\u7684\u65B9\u6848\u3002
- \u5982\u679C\u4E00\u4E2A\u5EFA\u8BAE\u9700\u8981\u65B0\u589E\u8F83\u591A JS\u3001\u6539\u53D8\u4E1A\u52A1\u8868\u8FBE\u6216\u5F15\u5165\u590D\u6742\u52A8\u6548\uFF0C\u8BF7\u964D\u4F4E\u63A8\u8350\u661F\u7EA7\u3002
- \u4E0D\u8981\u4E3A\u4E86\u663E\u5F97\u9AD8\u7EA7\u800C\u5EFA\u8BAE\u590D\u6742\u52A8\u753B\u30013D\u3001\u6C89\u6D78\u5F0F\u91CD\u505A\u3001\u591A\u72B6\u6001\u7CFB\u7EDF\u3002\u4F18\u5148\u9009\u62E9\u4F4E\u6210\u672C\u4F46\u80FD\u660E\u663E\u6539\u5584\u9605\u8BFB\u6216\u64CD\u4F5C\u7684\u6539\u6CD5\u3002

\u6BCF\u6761\u5EFA\u8BAE\u5FC5\u987B\u6309\u4EE5\u4E0B\u7ED3\u6784\u8F93\u51FA\uFF1A

## \u5EFA\u8BAE N\uFF1A\u4E00\u53E5\u8BDD\u6807\u9898

\u9875\u9762\u7C7B\u578B\u5224\u65AD\uFF1A
\u65B9\u6848/PPT / \u4EA7\u54C1\u754C\u9762 / \u8425\u9500\u9875 / \u5DE5\u5177\u9875 / \u6587\u7AE0\u9875 / \u5176\u4ED6

\u4F60\u770B\u5230\u7684\u95EE\u9898\uFF1A
\u7528 1-2 \u53E5\u8BDD\u8BF4\u660E\u5F53\u524D\u9875\u9762\u54EA\u91CC\u4E0D\u987A\u3002\u5FC5\u987B\u5F15\u7528\u9875\u9762\u91CC\u7684\u5177\u4F53\u533A\u57DF\u3001\u6807\u9898\u3001\u6A21\u5757\u3001\u6309\u94AE\u3001\u8868\u683C\u6216\u53EF\u89C1\u6587\u5B57\u3002

\u4E3A\u4EC0\u4E48\u503C\u5F97\u6539\uFF1A
\u8BF4\u660E\u8FD9\u4E2A\u4FEE\u6539\u80FD\u6539\u5584\u4EC0\u4E48\uFF1A\u7406\u89E3\u901F\u5EA6\u3001\u8BF4\u670D\u529B\u3001\u8F6C\u5316\u3001\u64CD\u4F5C\u6548\u7387\u3001\u89C6\u89C9\u8BB0\u5FC6\u70B9\u3001\u79FB\u52A8\u7AEF\u9605\u8BFB\u4F53\u9A8C\u7B49\u3002

\u5EFA\u8BAE\u600E\u4E48\u6539\uFF1A
\u7ED9\u51FA\u5177\u4F53\u8C03\u6574\u65B9\u5411\u3002\u4E0D\u8981\u53EA\u5199"\u589E\u5F3A\u5C42\u7EA7""\u4F18\u5316\u4F53\u9A8C"\u8FD9\u7C7B\u7A7A\u8BDD\u3002

\u6267\u884C\u96BE\u5EA6\uFF1A
\u4F4E / \u4E2D / \u9AD8

\u63A8\u8350\u7A0B\u5EA6\uFF1A
\u2605\u2606\u2606\u2606\u2606 \u5230 \u2605\u2605\u2605\u2605\u2605

\u4E3A\u4EC0\u4E48\u63A8\u8350\uFF1A
\u7528\u4E00\u53E5\u666E\u901A\u7528\u6237\u80FD\u7406\u89E3\u7684\u8BDD\u8BF4\u660E\u4E3A\u4EC0\u4E48\u8FD9\u6761\u503C\u5F97\u5148\u505A\u6216\u4E0D\u503C\u5F97\u73B0\u5728\u505A\u3002

\u7ED9 coding AI \u7684\u4FEE\u6539 prompt\uFF1A
\u5199\u4E00\u6BB5\u53EF\u4EE5\u76F4\u63A5\u590D\u5236\u7ED9 coding AI \u7684\u6267\u884C\u6307\u4EE4\uFF0C\u5FC5\u987B\u5305\u542B\uFF1A
- \u76EE\u6807\u9875\u9762\u6216\u76EE\u6807\u533A\u57DF
- \u5177\u4F53\u8981\u6539\u4EC0\u4E48
- \u4FDD\u7559\u4EC0\u4E48\u73B0\u6709\u98CE\u683C
- \u4E0D\u8981\u6539\u4EC0\u4E48
- \u5982\u9002\u5408\u7528 ClickDeck \u6846\u9009\uFF0C\u8BF7\u8BF4\u660E\u5EFA\u8BAE\u6846\u9009\u54EA\u4E2A\u533A\u57DF`;
var COMMON_REQUIREMENTS_EN = `First decide what type of page this is: proposal/PPT, product UI, marketing page, tool page, article page, or something else. Your suggestions must fit that page type. Do not apply a fixed template.

Implementation difficulty scale:
Low: mostly adjusts order, font size, spacing, emphasis, hierarchy, deletion, or movement of existing modules.
Medium: requires rebuilding one page region, or adding a small amount of HTML/CSS/vanilla JS interaction.
High: requires rebuilding multiple pages, complex animation, multi-state interaction, major responsive changes, or changes that may affect the overall architecture.

Recommendation rating scale:
\u2605\u2605\u2605\u2605\u2605: low cost and clearly improves core comprehension, conversion, or the operation path; do it first.
\u2605\u2605\u2605\u2605\u2606: clear value, but needs some layout work or judgment; suitable for the current phase.
\u2605\u2605\u2605\u2606\u2606: useful, but not a core issue; optional optimization.
\u2605\u2605\u2606\u2606\u2606: limited value or may distract from the main point; do not prioritize now.
\u2605\u2606\u2606\u2606\u2606: likely over-designed, gimmicky, or costly; defer it.

Constraints:
- Output at most 3 suggestions.
- Do not write an overall review, generic praise, or a full-page rewrite.
- Do not suggest complex backend work, databases, AI APIs, upload services, or rebuilding the whole site/app.
- Each suggestion must cite a specific region, heading, module, button, table, or visible text from the current page. If you cannot clearly see the page content, say that you are unsure instead of pretending.
- The 3 suggestions should cover different regions or different problems when possible. Do not put all of them on the same module.
- Prefer low-cost changes that keep copy mostly intact and avoid adding unnecessary interaction.
- If a suggestion requires substantial JS, changes business messaging, or adds complex motion, lower its recommendation rating.
- Do not propose complex animation, 3D effects, immersive rebuilds, or multi-state systems just to sound advanced. Prefer low-cost changes that clearly improve reading or operation.

Each suggestion must use this exact structure:

## Suggestion N: One-line title

Page type judgment:
Proposal/PPT / Product UI / Marketing page / Tool page / Article page / Other

What you noticed:
Use 1-2 sentences to describe what feels unclear or ineffective. You must cite a concrete region, heading, module, button, table, or visible text from the page.

Why it is worth changing:
Explain what this improves: comprehension speed, persuasion, conversion, operation efficiency, visual memorability, mobile readability, etc.

How to change it:
Give a concrete adjustment. Do not write vague advice such as "improve hierarchy" or "enhance the experience" without specifics.

Implementation difficulty:
Low / Medium / High

Recommendation:
\u2605\u2606\u2606\u2606\u2606 to \u2605\u2605\u2605\u2605\u2605

Why this rating:
Use one plain sentence that a non-technical user can understand.

Prompt for coding AI:
Write one directly copyable instruction for a coding AI. It must include:
- Target page or target region
- Exactly what to change
- What existing style to preserve
- What not to change
- If ClickDeck selection would help, specify which area the user should select`;
var FLOW_FOCUS_ZH = `\u8BF7\u4ECE"\u770B\u903B\u8F91"\u89C6\u89D2\u8BC4\u5BA1\u5F53\u524D\u9875\u9762\u3002
\u805A\u7126\u8981\u6C42\uFF1A
- \u9875\u9762\u987A\u5E8F\u662F\u5426\u987A\u3002
- \u4FE1\u606F\u9012\u8FDB\u662F\u5426\u81EA\u7136\u3002
- \u7528\u6237\u662F\u5426\u77E5\u9053\u4E0B\u4E00\u6B65\u4E3A\u4EC0\u4E48\u51FA\u73B0\u3002
- \u65B9\u6848/PPT \u662F\u5426\u6709\u8BF4\u670D\u95ED\u73AF\u3002
- \u4EA7\u54C1 UI \u662F\u5426\u6709\u6E05\u695A\u7684\u4EFB\u52A1\u8DEF\u5F84\u3002`;
var FOCUS_FOCUS_ZH = `\u8BF7\u4ECE"\u770B\u91CD\u70B9"\u89C6\u89D2\u8BC4\u5BA1\u5F53\u524D\u9875\u9762\u3002
\u805A\u7126\u8981\u6C42\uFF1A
- \u7B2C\u4E00\u773C\u770B\u5230\u4EC0\u4E48\u3002
- \u6838\u5FC3\u6807\u9898\u3001\u6570\u5B57\u3001\u6309\u94AE\u3001\u91D1\u53E5\u3001\u56FE\u8868\u662F\u5426\u8DB3\u591F\u7A81\u51FA\u3002
- \u9875\u9762\u662F\u5426\u592A\u6EE1\u3001\u592A\u5E73\u5747\u6216\u592A\u677E\u3002
- \u91CD\u8981\u4FE1\u606F\u662F\u5426\u88AB\u6B21\u8981\u4FE1\u606F\u6DF9\u6CA1\u3002
- \u89C6\u89C9\u4E3B\u6B21\u662F\u5426\u9002\u5408\u5F53\u524D\u9875\u9762\u7C7B\u578B\u3002`;
var INTERACTION_FOCUS_ZH = `\u8BF7\u4ECE"\u770B\u4EA4\u4E92"\u89C6\u89D2\u8BC4\u5BA1\u5F53\u524D\u9875\u9762\u3002
\u805A\u7126\u8981\u6C42\uFF1A
- \u9759\u6001\u5185\u5BB9\u662F\u5426\u9002\u5408\u6539\u6210\u8F7B\u91CF\u4EA4\u4E92\u3002
- \u8868\u683C\u3001\u65F6\u95F4\u7EBF\u3001\u77E9\u9635\u3001\u6B65\u9AA4\u3001\u7B5B\u9009\u3001\u5361\u7247\u662F\u5426\u6709\u66F4\u6E05\u695A\u7684\u8868\u8FBE\u5F62\u5F0F\u3002
- \u5C0F\u4EA7\u54C1 UI \u7684\u6309\u94AE\u3001\u5165\u53E3\u3001\u8868\u5355\u3001\u5207\u6362\u8DEF\u5F84\u662F\u5426\u987A\u624B\u3002
- \u79FB\u52A8\u7AEF\u9605\u8BFB\u6216\u64CD\u4F5C\u662F\u5426\u5403\u529B\u3002
- \u53EA\u5EFA\u8BAE\u7EAF HTML/CSS/\u5C11\u91CF\u539F\u751F JS \u80FD\u5B8C\u6210\u7684\u8F7B\u4EA4\u4E92\u3002`;
var FLOW_FOCUS_EN = `Review the current page from the "Check Flow" perspective.
Focus on:
- Whether the page order feels natural.
- Whether the information progression is clear.
- Whether the user understands why the next section appears.
- Whether a proposal/PPT has a persuasive loop.
- Whether a product UI has a clear task path.`;
var FOCUS_FOCUS_EN = `Review the current page from the "Check Focus" perspective.
Focus on:
- What the user sees first.
- Whether the core heading, numbers, CTA, quote, chart, or key message stands out.
- Whether the page feels too dense, too flat, or too loose.
- Whether important information is buried by secondary information.
- Whether the visual hierarchy fits the page type.`;
var INTERACTION_FOCUS_EN = `Review the current page from the "Check Interaction" perspective.
Focus on:
- Whether static content would be clearer as lightweight interaction.
- Whether tables, timelines, matrices, steps, filters, or cards could be expressed more clearly.
- Whether a product UI's buttons, entry points, forms, or switching paths feel smooth.
- Whether mobile reading or operation feels difficult.
- Only suggest lightweight interactions that can be built with plain HTML/CSS and a small amount of vanilla JS.`;
var askGeminiPrompts = {
  en: {
    flow: `${FLOW_FOCUS_EN}

${COMMON_REQUIREMENTS_EN}`,
    focus: `${FOCUS_FOCUS_EN}

${COMMON_REQUIREMENTS_EN}`,
    interaction: `${INTERACTION_FOCUS_EN}

${COMMON_REQUIREMENTS_EN}`
  },
  zh: {
    flow: `${FLOW_FOCUS_ZH}

${COMMON_REQUIREMENTS_ZH}`,
    focus: `${FOCUS_FOCUS_ZH}

${COMMON_REQUIREMENTS_ZH}`,
    interaction: `${INTERACTION_FOCUS_ZH}

${COMMON_REQUIREMENTS_ZH}`
  }
};
function getAskGeminiPrompt(key, language) {
  return askGeminiPrompts[language][key];
}

// src/content/i18n.ts
var englishLabels = {
  active: "Active",
  close: "Close",
  selectHint: "Select an element on the page.",
  selectedHintPrefix: "Selected:",
  typography: "Typography",
  weight: "Weight",
  lineHeight: "Line height",
  letterSpacing: "Letter spacing",
  spacing: "Spacing",
  margin: "Margin",
  padding: "Padding",
  alignment: "Alignment",
  color: "Color",
  background: "Background",
  radius: "Radius",
  history: "History",
  exportHtml: "Export HTML",
  exportPdf: "Export PDF",
  diagnostics: "Diagnostics",
  light: "Light",
  normal: "Normal",
  bold: "Bold",
  compact: "Compact",
  loose: "Loose",
  tight: "Tight",
  wide: "Wide",
  none: "None",
  small: "Small",
  medium: "Medium",
  large: "Large",
  warm: "Warm",
  white: "White",
  transparent: "Transparent",
  image: "Image",
  imageSource: "Source",
  imageSize: "Size",
  imageFit: "Fit",
  imageRadius: "Radius",
  exportHtmlButton: "Export HTML",
  exportHtmlDesc: "Export the current page snapshot. ClickDeck edits applied to the page are preserved where possible; source files are not rewritten.",
  exportPdfLong: "PDF Long",
  exportPdfA4: "PDF A4",
  exportPdfSlides: "PDF 16:9",
  exportImagePdfLong: "Image PDF Long",
  exportImagePdfA4: "Image PDF A4",
  exportImagePdfSlides: "Image PDF 16:9",
  imagePdfTooltip: "High fidelity layout preservation, but text is not selectable.",
  slidesPdfOnlyHint: "This page looks like a slide deck. Please use Image PDF 16:9 for slide export.",
  pdfGroup: "PDF (Print)",
  imageMax100: "Max 100%",
  imageContain: "Contain",
  imageCover: "Cover",
  complexSelectedSvg: "Selected: svg",
  complexSelectedCanvas: "Selected: canvas",
  complexSelectedFormula: "Selected: formula",
  complexSelectedIframe: "Selected: iframe",
  complexSvgHint: "Supports outer scaling, spacing, export, and AI prompt handoff. Internal SVG editing is not supported.",
  complexCanvasHint: "Canvas content is drawn output. Only the whole block size and spacing can be adjusted.",
  complexFormulaHint: "Formula regions support only outer size and spacing adjustments. Edit the source formula separately.",
  complexIframeHint: "Embedded iframe content is not edited internally. Modify the loaded page or srcdoc source first.",
  svgTextSection: "SVG text",
  editSvgText: "Edit SVG text",
  svgTextEditableHint: "Simple editable SVG text detected. Click the text itself to edit in place. Text does not reflow automatically.",
  svgTextNoneEditable: "No editable SVG text was detected. It may already be converted into shapes.",
  svgTextComplex: "SVG text was detected, but the structure is too complex to edit safely. Update the original SVG code instead.",
  svgTextWarning: "SVG text does not reflow automatically. Longer text may overflow.",
  svgTextEditorTitle: "Edit SVG text",
  svgTextApply: "Apply",
  svgTextCancel: "Close",
  svgTextItemPrefix: "Text",
  smaller: "-",
  larger: "+",
  round: "Round",
  replaceImage: "Replace image",
  replaceVideo: "Replace video",
  ai: "AI",
  copyAiPrompt: "Copy AI edit prompt",
  noEdits: "No edits to summarize yet.",
  left: "Left",
  center: "Center",
  right: "Right",
  auto: "Auto",
  reset: "Reset",
  undo: "Undo",
  redo: "Redo",
  export: "Export",
  long: "Long",
  copyDiagnostics: "Copy diagnostics",
  pickColor: "Pick color",
  pickBgColor: "Pick bg color",
  promptPreviewTitle: "AI edit prompt",
  promptLangEn: "English",
  promptLangZh: "Chinese ref",
  promptEnglishPrimaryNote: "English is the primary execution prompt. Use this version when copying to coding AI.",
  promptChineseReferenceNote: "Chinese is a review-only reference for checking task intent and completeness. Prefer the English version for actual execution.",
  promptCopy: "Copy",
  promptCopied: "Copied!",
  promptClose: "Close",
  finish: "Output",
  savedEditsFound: "Saved edits found",
  savedIntentDrafts: "modification suggestions",
  restore: "Restore",
  dismiss: "Dismiss",
  clear: "Clear",
  collapse: "Collapse",
  restorePanel: "Restore panel",
  transparency: "Transparency",
  promptMediaAIHint: "If this prompt does not include an image/video file or asset path, please ask the user for the replacement media before changing this src.",
  promptMediaUIReminder: "Media reminder: This prompt references a replaced image or video. When sending it to AI, attach the media file or provide the asset path.",
  promptSwitchLangConfirm: "You have manually edited the prompt. Switching language will discard your changes. Continue?",
  increaseWeight: "Increase weight",
  decreaseWeight: "Decrease weight",
  increaseLineHeight: "Increase line height",
  decreaseLineHeight: "Decrease line height",
  increaseLetterSpacing: "Increase letter spacing",
  decreaseLetterSpacing: "Decrease letter spacing",
  increaseRadius: "Increase radius",
  decreaseRadius: "Decrease radius",
  increaseMargin: "Increase margin",
  decreaseMargin: "Decrease margin",
  increasePadding: "Increase padding",
  decreasePadding: "Decrease padding",
  alignLeft: "Align left",
  alignCenter: "Align center",
  alignRight: "Align right",
  present: "Present",
  noSlides: "No slides detected",
  exportLongImage: "Export long image",
  advanced: "Advanced",
  visualEditing: "Visual editing",
  // Intent draft UI
  intentSection: "Edit suggestions",
  aiPromptSection: "AI Prompt",
  askGeminiSection: "Review with AI",
  askGeminiHint: "Use with an AI that can see the current page. Best for what is on screen now; multi-page decks may still need page-by-page review.",
  askGeminiVisibilityHint: "If parts of the page are hidden, AI suggestions may only be based on currently visible content.",
  askGeminiToggle: "Choose review type",
  askGeminiFlow: "Flow",
  askGeminiFlowTooltip: "Ask AI to review page order, cause-and-effect, and narrative flow.",
  askGeminiFocus: "Focus",
  askGeminiFocusTooltip: "Ask AI to spot weak visual hierarchy and buried key messages.",
  askGeminiInteraction: "Interaction",
  askGeminiInteractionTooltip: "Ask AI to review buttons, tabs, scrolling, and reveal patterns.",
  askGeminiCopied: "Paste to AI Review.",
  copyFailed: "Copy failed",
  addIntent: "Add suggestion",
  intentActionMove: "Move",
  intentMoveTo: "Move to...",
  intentPlaceholder: "Enter your instructions for AI...",
  intentMovePlaceholder: "Optional: align left edge / cover this text / avoid the title / keep size",
  intentDragGhost: "Move target box",
  intentDragGhostHint: "Drag the target box to describe where AI should move this region.\nThis does not change the page yet.",
  intentDragToPlace: "Drag to place",
  intentUsePosition: "Use this position",
  intentCancelPreview: "Cancel preview",
  intentMarkRemoval: "Mark removal",
  intentDelBadge: "Del",
  removeActionConstraint: "Preserve surrounding layout when removing.",
  save: "Save",
  cancel: "Cancel",
  delete: "Delete",
  drawRegionHint: "Drag to draw a region for AI editing",
  drawTargetRegionHint: "Drag to draw target region",
  selectTargetRegion: "Select target region",
  langSwitch: "\u4E2D\u6587"
};
var chineseLabels = {
  active: "\u5DF2\u542F\u7528",
  close: "\u5173\u95ED",
  selectHint: "\u9009\u62E9\u9875\u9762\u4E2D\u7684\u5143\u7D20\u3002",
  selectedHintPrefix: "\u5F53\u524D\u9009\u4E2D\uFF1A",
  typography: "\u5B57\u53F7",
  weight: "\u5B57\u91CD",
  lineHeight: "\u884C\u9AD8",
  letterSpacing: "\u5B57\u95F4\u8DDD",
  spacing: "\u95F4\u8DDD",
  margin: "\u5916\u8FB9\u8DDD",
  padding: "\u5185\u8FB9\u8DDD",
  alignment: "\u5BF9\u9F50",
  color: "\u989C\u8272",
  background: "\u80CC\u666F",
  radius: "\u5706\u89D2",
  history: "\u5386\u53F2",
  exportHtml: "\u5BFC\u51FA HTML",
  exportPdf: "\u5BFC\u51FA PDF",
  diagnostics: "\u8BCA\u65AD",
  light: "\u8F7B",
  normal: "\u6B63\u5E38",
  bold: "\u52A0\u7C97",
  compact: "\u7D27\u51D1",
  loose: "\u5BBD\u677E",
  tight: "\u66F4\u7D27",
  wide: "\u66F4\u5BBD",
  none: "\u65E0",
  small: "\u5C0F",
  medium: "\u4E2D",
  large: "\u5927",
  warm: "\u6696\u8272",
  white: "\u767D\u8272",
  transparent: "\u900F\u660E",
  image: "\u56FE\u7247",
  imageSource: "\u56FE\u7247\u6765\u6E90",
  imageSize: "\u5C3A\u5BF8",
  imageFit: "\u88C1\u5207",
  imageRadius: "\u5706\u89D2",
  exportHtmlButton: "\u5BFC\u51FA HTML",
  exportHtmlDesc: "\u5BFC\u51FA\u5F53\u524D\u9875\u9762\u5FEB\u7167\u3002\u5DF2\u5E94\u7528\u5230\u9875\u9762\u4E0A\u7684 ClickDeck \u4FEE\u6539\u4F1A\u5C3D\u91CF\u4FDD\u7559\uFF1B\u4E0D\u4F1A\u5199\u56DE\u539F\u59CB\u6E90\u4EE3\u7801\u3002",
  exportPdfLong: "PDF \u957F\u9875",
  exportPdfA4: "PDF A4",
  exportPdfSlides: "PDF 16:9",
  exportImagePdfLong: "\u56FE\u7247 PDF \u957F\u9875",
  exportImagePdfA4: "\u56FE\u7247 PDF A4",
  exportImagePdfSlides: "\u56FE\u7247 PDF 16:9",
  imagePdfTooltip: "\u5E03\u5C40\u9AD8\u4FDD\u771F\u8FD8\u539F\uFF0C\u4F46\u6587\u5B57\u4E0D\u53EF\u590D\u5236",
  slidesPdfOnlyHint: "\u68C0\u6D4B\u5230\u8FD9\u662F\u5E7B\u706F\u7247\u9875\u9762\uFF0C\u8BF7\u4F7F\u7528\u300C\u56FE\u7247 PDF 16:9\u300D\u5BFC\u51FA\u3002",
  pdfGroup: "PDF \u5BFC\u51FA",
  imageMax100: "\u6700\u5927 100%",
  imageContain: "\u5B8C\u6574\u663E\u793A",
  imageCover: "\u586B\u6EE1\u88C1\u5207",
  complexSelectedSvg: "\u5F53\u524D\u9009\u4E2D\uFF1Asvg",
  complexSelectedCanvas: "\u5F53\u524D\u9009\u4E2D\uFF1Acanvas",
  complexSelectedFormula: "\u5F53\u524D\u9009\u4E2D\uFF1A\u516C\u5F0F",
  complexSelectedIframe: "\u5F53\u524D\u9009\u4E2D\uFF1Aiframe",
  complexSvgHint: "\u652F\u6301\u6574\u4F53\u7F29\u653E\u3001\u95F4\u8DDD\u3001\u5BFC\u51FA\u548C AI prompt \u4EA4\u63A5\uFF1B\u4E0D\u652F\u6301\u7F16\u8F91 SVG \u5185\u90E8\u7ED3\u6784\u3002",
  complexCanvasHint: "Canvas \u5185\u5BB9\u662F\u7ED8\u5236\u7ED3\u679C\uFF0C\u53EA\u80FD\u8C03\u6574\u6574\u4F53\u5C3A\u5BF8\u548C\u95F4\u8DDD\uFF0C\u4E0D\u80FD\u76F4\u63A5\u4FEE\u6539\u5185\u90E8\u5185\u5BB9\u3002",
  complexFormulaHint: "\u516C\u5F0F\u533A\u57DF\u4EC5\u652F\u6301\u6574\u4F53\u5927\u5C0F\u548C\u95F4\u8DDD\u8C03\u6574\uFF0C\u5185\u90E8\u5185\u5BB9\u9700\u8981\u4FEE\u6539\u6E90\u516C\u5F0F\u3002",
  complexIframeHint: "iframe \u662F\u5D4C\u5165\u9875\u9762\uFF0C\u4E0D\u8FDB\u5165\u5185\u90E8\u7ED3\u6784\uFF1B\u5185\u90E8\u5185\u5BB9\u9700\u8981\u5148\u4FEE\u6539\u6240\u52A0\u8F7D\u9875\u9762\u6216 srcdoc \u6E90\u4EE3\u7801\u3002",
  svgTextSection: "SVG \u6587\u5B57",
  editSvgText: "\u4FEE\u6539 SVG \u6587\u5B57",
  svgTextEditableHint: "\u68C0\u6D4B\u5230\u53EF\u7F16\u8F91 SVG \u6587\u5B57\u3002\u8BF7\u76F4\u63A5\u70B9\u51FB\u6587\u5B57\u539F\u4F4D\u4FEE\u6539\uFF1B\u6587\u5B57\u4E0D\u4F1A\u81EA\u52A8\u91CD\u65B0\u6392\u7248\u3002",
  svgTextNoneEditable: "\u672A\u68C0\u6D4B\u5230\u53EF\u7F16\u8F91 SVG \u6587\u5B57\uFF0C\u53EF\u80FD\u5DF2\u88AB\u8F6C\u4E3A\u56FE\u5F62\u3002",
  svgTextComplex: "\u68C0\u6D4B\u5230 SVG \u6587\u5B57\uFF0C\u4F46\u7ED3\u6784\u8F83\u590D\u6742\uFF0C\u5F53\u524D\u65E0\u6CD5\u76F4\u63A5\u4FEE\u6539\u3002\u8BF7\u5148\u4FEE\u6539\u8BE5 SVG \u7684\u539F\u59CB\u7ED3\u6784\u4EE3\u7801\u3002",
  svgTextWarning: "SVG \u6587\u5B57\u4E0D\u4F1A\u81EA\u52A8\u91CD\u65B0\u6392\u7248\uFF0C\u6587\u5B57\u53D8\u957F\u53EF\u80FD\u4F1A\u6EA2\u51FA\u3002",
  svgTextEditorTitle: "\u4FEE\u6539 SVG \u6587\u5B57",
  svgTextApply: "\u5E94\u7528",
  svgTextCancel: "\u5173\u95ED",
  svgTextItemPrefix: "\u6587\u5B57",
  smaller: "-",
  larger: "+",
  round: "\u5706\u5F62",
  replaceImage: "\u66FF\u6362\u56FE\u7247",
  replaceVideo: "\u66FF\u6362\u89C6\u9891",
  ai: "AI",
  copyAiPrompt: "\u590D\u5236 AI edit prompt",
  noEdits: "\u5F53\u524D\u6CA1\u6709\u53EF\u603B\u7ED3\u7684\u4FEE\u6539\u3002",
  left: "\u5DE6",
  center: "\u5C45\u4E2D",
  right: "\u53F3",
  auto: "\u81EA\u52A8",
  reset: "\u91CD\u7F6E",
  undo: "\u64A4\u9500",
  redo: "\u91CD\u505A",
  export: "\u5BFC\u51FA",
  long: "\u957F\u9875",
  copyDiagnostics: "\u590D\u5236\u8BCA\u65AD\u4FE1\u606F",
  pickColor: "\u9009\u62E9\u989C\u8272",
  pickBgColor: "\u81EA\u5B9A\u4E49\u80CC\u666F",
  promptPreviewTitle: "AI edit prompt",
  promptLangEn: "English",
  promptLangZh: "\u4E2D\u6587\u53C2\u8003",
  promptEnglishPrimaryNote: "English \u662F\u6B63\u5F0F\u6267\u884C\u7248 prompt\u3002\u590D\u5236\u7ED9 coding AI \u65F6\uFF0C\u4F18\u5148\u4F7F\u7528\u8FD9\u4E2A\u7248\u672C\u3002",
  promptChineseReferenceNote: "\u4E2D\u6587\u4EC5\u7528\u4E8E\u4EBA\u5DE5\u6838\u5BF9\u4EFB\u52A1\u662F\u5426\u5B8C\u6574\u3001\u76EE\u6807\u662F\u5426\u51C6\u786E\u3001\u662F\u5426\u6709\u6B67\u4E49\u3002\u771F\u6B63\u6267\u884C\u65F6\uFF0C\u4F18\u5148\u590D\u5236 English \u7248\u672C\u3002",
  promptCopy: "\u590D\u5236",
  promptCopied: "\u5DF2\u590D\u5236\uFF01",
  promptClose: "\u5173\u95ED",
  finish: "\u8F93\u51FA",
  savedEditsFound: "\u53D1\u73B0\u5DF2\u4FDD\u5B58\u7684\u4FEE\u6539",
  savedIntentDrafts: "\u4FEE\u6539\u610F\u89C1",
  restore: "\u6062\u590D",
  dismiss: "\u5FFD\u7565",
  clear: "\u6E05\u9664",
  collapse: "\u6298\u53E0",
  restorePanel: "\u5C55\u5F00",
  transparency: "\u900F\u660E\u5EA6",
  promptMediaAIHint: "\u5982\u679C\u8FD9\u4EFD prompt \u6CA1\u6709\u540C\u65F6\u63D0\u4F9B\u5A92\u4F53\u6587\u4EF6\u6216\u8D44\u6E90\u8DEF\u5F84\uFF0C\u8BF7\u5148\u5411\u7528\u6237\u7D22\u8981\u66FF\u6362\u6587\u4EF6\uFF0C\u518D\u4FEE\u6539\u8FD9\u4E2A src\u3002",
  promptMediaUIReminder: "\u5A92\u4F53\u63D0\u9192\uFF1A\u8FD9\u4EFD prompt \u63D0\u5230\u4E86\u66FF\u6362\u5A92\u4F53\u6587\u4EF6\u3002\u53D1\u9001\u7ED9 AI \u65F6\uFF0C\u8BF7\u989D\u5916\u9644\u4E0A\u5A92\u4F53\u6587\u4EF6\uFF0C\u6216\u63D0\u4F9B\u9879\u76EE\u4E2D\u7684\u8D44\u6E90\u8DEF\u5F84\u3002",
  promptSwitchLangConfirm: "\u4F60\u5DF2\u624B\u52A8\u7F16\u8F91\u4E86 prompt\uFF0C\u5207\u6362\u8BED\u8A00\u5C06\u4E22\u5931\u8FD9\u4E9B\u7F16\u8F91\uFF0C\u786E\u5B9A\u7EE7\u7EED\u5417\uFF1F",
  increaseWeight: "\u589E\u5927\u5B57\u91CD",
  decreaseWeight: "\u51CF\u5C0F\u5B57\u91CD",
  increaseLineHeight: "\u589E\u5927\u884C\u9AD8",
  decreaseLineHeight: "\u51CF\u5C0F\u884C\u9AD8",
  increaseLetterSpacing: "\u589E\u5927\u5B57\u95F4\u8DDD",
  decreaseLetterSpacing: "\u51CF\u5C0F\u5B57\u95F4\u8DDD",
  increaseRadius: "\u589E\u5927\u5706\u89D2",
  decreaseRadius: "\u51CF\u5C0F\u5706\u89D2",
  increaseMargin: "\u589E\u5927\u5916\u8FB9\u8DDD",
  decreaseMargin: "\u51CF\u5C0F\u5916\u8FB9\u8DDD",
  increasePadding: "\u589E\u5927\u5185\u8FB9\u8DDD",
  decreasePadding: "\u51CF\u5C0F\u5185\u8FB9\u8DDD",
  alignLeft: "\u5DE6\u5BF9\u9F50",
  alignCenter: "\u5C45\u4E2D\u5BF9\u9F50",
  alignRight: "\u53F3\u5BF9\u9F50",
  present: "\u6F14\u793A",
  noSlides: "\u672A\u68C0\u6D4B\u5230\u53EF\u6F14\u793A\u5206\u9875",
  exportLongImage: "\u5BFC\u51FA\u957F\u56FE",
  advanced: "\u9AD8\u7EA7\u9009\u9879",
  visualEditing: "\u89C6\u89C9\u7F16\u8F91",
  // Intent draft UI
  intentSection: "\u4FEE\u6539\u610F\u89C1",
  aiPromptSection: "AI Prompt",
  askGeminiSection: "\u8BA9 AI \u770B\u9875\u9762",
  askGeminiHint: "\u7ED9\u80FD\u770B\u89C1\u5F53\u524D\u9875\u9762\u7684 AI \u7528\u3002\u66F4\u9002\u5408\u8BC4\u5BA1\u773C\u524D\u8FD9\u4E00\u9875\uFF1B\u5982\u679C\u662F\u591A\u9875 deck\uFF0C\u901A\u5E38\u4ECD\u8981\u9010\u9875\u770B\u903B\u8F91\u3002",
  askGeminiVisibilityHint: "\u82E5\u90E8\u5206\u9875\u9762\u672A\u663E\u793A\uFF0CAI \u63D0\u4F9B\u7684\u5EFA\u8BAE\u53EF\u80FD\u53EA\u57FA\u4E8E\u5F53\u524D\u53EF\u89C1\u5185\u5BB9\u3002",
  askGeminiToggle: "\u9009\u62E9\u8BC4\u5BA1\u65B9\u5411",
  askGeminiFlow: "\u770B\u903B\u8F91",
  askGeminiFlowTooltip: "\u8BA9 AI \u7ED9\u9875\u9762\u987A\u5E8F\u3001\u56E0\u679C\u5173\u7CFB\u548C\u53D9\u4E8B\u8282\u594F\u63D0\u5EFA\u8BAE\u3002",
  askGeminiFocus: "\u770B\u91CD\u70B9",
  askGeminiFocusTooltip: "\u8BA9 AI \u627E\u51FA\u89C6\u89C9\u4E3B\u6B21\u95EE\u9898\uFF0C\u63D0\u9192\u54EA\u4E9B\u91CD\u70B9\u88AB\u57CB\u6CA1\u3002",
  askGeminiInteraction: "\u770B\u4EA4\u4E92",
  askGeminiInteractionTooltip: "\u8BA9 AI \u68C0\u67E5\u6309\u94AE\u3001\u5207\u6362\u548C\u6EDA\u52A8\u8DEF\u5F84\u662F\u5426\u987A\u624B\u3002",
  askGeminiCopied: "\u7C98\u8D34\u81F3AI\u8BC4\u5BA1",
  copyFailed: "\u590D\u5236\u5931\u8D25",
  addIntent: "\u6DFB\u52A0\u4FEE\u6539\u610F\u89C1",
  intentActionMove: "\u79FB\u52A8",
  intentMoveTo: "\u79FB\u52A8\u5230...",
  intentPlaceholder: "\u8F93\u5165\u4F60\u60F3\u8BA9 AI \u505A\u7684\u64CD\u4F5C...",
  intentMovePlaceholder: "\u53EF\u9009\uFF1A\u5BF9\u9F50\u5DE6\u8FB9\u7F18 / \u76D6\u4F4F\u8FD9\u91CC / \u907F\u5F00\u6807\u9898 / \u4FDD\u6301\u5927\u5C0F",
  intentDragGhost: "\u62D6\u52A8\u76EE\u6807\u6846",
  intentDragGhostHint: "\u62D6\u52A8\u76EE\u6807\u6846\u6765\u544A\u8BC9 AI \u79FB\u52A8\u5230\u54EA\u91CC\u3002\n\u8FD9\u4E0D\u4F1A\u4FEE\u6539\u5F53\u524D\u9875\u9762\u7684 DOM\u3002",
  intentDragToPlace: "\u62D6\u52A8\u5230\u76EE\u6807\u4F4D\u7F6E",
  intentUsePosition: "\u4F7F\u7528\u8FD9\u4E2A\u4F4D\u7F6E",
  intentCancelPreview: "\u53D6\u6D88\u9884\u89C8",
  intentMarkRemoval: "\u6807\u8BB0\u5220\u9664",
  intentDelBadge: "\u5220\u9664",
  removeActionConstraint: "\u5C40\u90E8\u5220\u9664\u5E76\u4FDD\u6301\u5468\u56F4\u5E03\u5C40\u7A33\u5B9A\uFF0C\u4E0D\u8981\u5F15\u8D77\u9875\u9762\u6392\u7248\u5D29\u584C\u3002",
  save: "\u4FDD\u5B58",
  cancel: "\u53D6\u6D88",
  delete: "\u5220\u9664",
  drawRegionHint: "\u62D6\u62FD\u6846\u9009\uFF0C\u544A\u8BC9 AI \u5728\u54EA\u64CD\u4F5C",
  drawTargetRegionHint: "\u62D6\u62FD\u6846\u9009\uFF0C\u544A\u8BC9 AI \u79FB\u52A8\u5230\u54EA",
  selectTargetRegion: "\u6846\u9009\u76EE\u6807\u533A\u57DF",
  langSwitch: "EN"
};
var _languageOverride = null;
var LANG_STORAGE_KEY = "clickdeck-language";
function _getStoredLanguage() {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === "en" || stored === "zh") return stored;
  } catch {
  }
  return null;
}
function setPanelLanguage(lang) {
  _languageOverride = lang;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
  }
}
function getPanelLanguage() {
  if (_languageOverride) return _languageOverride;
  const stored = _getStoredLanguage();
  if (stored) return stored;
  const language = navigator.language || "en";
  return language.toLowerCase().startsWith("zh") ? "zh" : "en";
}
function getPanelLabels() {
  return getPanelLanguage() === "zh" ? chineseLabels : englishLabels;
}

// src/content/overlay.ts
var STYLE_ID = "clickdeck-style";
function createOverlay(rootId2) {
  injectBaseStyles(rootId2);
  const root = document.createElement("div");
  root.id = rootId2;
  root.dataset.clickdeck = "true";
  const outline = document.createElement("div");
  outline.className = "clickdeck-outline";
  outline.dataset.clickdeck = "true";
  root.append(outline);
  document.documentElement.append(root);
  return {
    root,
    outline,
    destroy: () => {
      root.remove();
    },
    updateOutline: (target) => updateOutline(outline, target)
  };
}
function updateOutline(outline, target) {
  if (!target) {
    outline.style.display = "none";
    return;
  }
  const rect = target.getBoundingClientRect();
  outline.style.display = "block";
  outline.style.left = `${rect.left}px`;
  outline.style.top = `${rect.top}px`;
  outline.style.width = `${rect.width}px`;
  outline.style.height = `${rect.height}px`;
}
function injectBaseStyles(rootId2) {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${rootId2}, #${rootId2} * {
      box-sizing: border-box;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    #${rootId2} {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      pointer-events: none;
    }

    .clickdeck-outline {
      position: fixed;
      display: none;
      border: 2px solid #f97316;
      border-radius: 8px;
      box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.16);
      pointer-events: none;
    }

    .clickdeck-panel {
      position: fixed;
      top: 16px;
      right: 16px;
      width: 248px;
      padding: 14px;
      color: #e0d8cc;
      background: #1a1a2e;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      box-shadow: 0 18px 44px rgba(0, 0, 0, 0.4);
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      pointer-events: auto;
      transition: opacity 0.2s ease, width 0.2s ease, height 0.2s ease, padding 0.2s ease, border-radius 0.2s ease;
    }

    .clickdeck-panel--collapsed {
      width: 48px;
      height: 48px;
      padding: 0;
      border-radius: 24px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
    }

    .clickdeck-panel--collapsed:active {
      cursor: grabbing;
    }

    .clickdeck-panel--collapsed .clickdeck-panel__content-wrapper,
    .clickdeck-panel--collapsed .clickdeck-notice {
      display: none !important;
    }

    .clickdeck-panel__floating-button {
      display: none;
    }

    .clickdeck-panel--collapsed .clickdeck-panel__floating-button {
      display: flex;
      width: 100%;
      height: 100%;
      align-items: center;
      justify-content: center;
      cursor: inherit;
    }

    .clickdeck-panel__floating-button img {
      width: 38px;
      height: 38px;
      border-radius: 999px;
      pointer-events: none;
    }

    .clickdeck-panel--opacity-70 {
      opacity: 0.7;
    }

    .clickdeck-panel--opacity-40 {
      opacity: 0.4;
    }

    .clickdeck-panel__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      cursor: grab;
    }

    .clickdeck-panel__header:active {
      cursor: grabbing;
    }

    .clickdeck-panel__header-actions {
      display: flex;
      gap: 4px;
    }

    .clickdeck-panel__title {
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 7px;
      overflow: hidden;
      min-width: 0;
    }

    .clickdeck-panel__logo {
      width: 28px;
      height: 28px;
      border-radius: 999px;
      object-fit: cover;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      flex-shrink: 0;
    }

    .clickdeck-panel__status {
      font-size: 10px;
      font-weight: 500;
      color: #7acc4a;
      background: #1a3a1a;
      padding: 2px 6px;
      border-radius: 9999px;
      flex-shrink: 0;
    }

    .clickdeck-panel__hint {
      min-height: 18px;
      color: #b0a090;
      font-size: 12px;
      line-height: 1.4;
    }

    .clickdeck-panel__complex-notice {
      margin-top: 8px;
      padding: 8px 10px;
      border: 1px solid rgba(120, 84, 53, 0.18);
      border-radius: 8px;
      background: #fff8ed;
      color: #5b4635;
    }

    .clickdeck-panel__complex-notice[hidden] {
      display: none;
    }

    .clickdeck-panel__complex-title {
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .clickdeck-panel__complex-body {
      font-size: 11px;
      line-height: 1.45;
      color: #7a6554;
    }

    .clickdeck-panel__section {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .clickdeck-panel__module-title {
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 12px;
      font-weight: 700;
      color: #c0b0a0;
      letter-spacing: 0.03em;
    }

    .clickdeck-panel__section-title {
      font-size: 11px;
      font-weight: 600;
      color: #b0a090;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }

    .clickdeck-panel__sub-hint {
      margin-top: 6px;
      font-size: 11px;
      line-height: 1.45;
      color: #7a6554;
    }

    .clickdeck-panel__group {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
    }

    .clickdeck-panel__group--spacing {
      grid-template-columns: 1fr minmax(0, 1fr) minmax(0, 1fr);
      align-items: center;
      margin-bottom: 6px;
    }

    .clickdeck-panel__group--spacing:last-child {
      margin-bottom: 0;
    }

    .clickdeck-panel__group--ask-gemini {
      grid-template-columns: repeat(auto-fit, minmax(108px, 1fr));
    }

    .clickdeck-panel__group--ask-gemini .clickdeck-button {
      min-height: 34px;
      white-space: nowrap;
    }

    .clickdeck-panel__group--media-actions {
      grid-template-columns: minmax(0, 1fr) 44px 44px;
      align-items: stretch;
    }

    .clickdeck-panel__group--media-size {
      grid-template-columns: 44px 44px minmax(0, 1fr);
      align-items: stretch;
    }

    .clickdeck-panel__spacing-label {
      font-size: 11px;
      color: #b0a090;
    }

    .clickdeck-panel__sub-section {
      margin-bottom: 8px;
    }

    .clickdeck-panel__sub-section:last-child {
      margin-bottom: 0;
    }

    .clickdeck-panel__sub-title {
      font-size: 10px;
      color: #908070;
      margin-bottom: 4px;
    }

    .clickdeck-panel__advanced {
      margin-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 12px;
    }

    .clickdeck-panel__advanced-summary {
      font-size: 11px;
      font-weight: 600;
      color: #b0a090;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      cursor: pointer;
      user-select: none;
      outline: none;
    }

    .clickdeck-panel__advanced[hidden] {
      display: none;
    }

    .clickdeck-button {
      min-height: 32px;
      padding: 0 8px;
      color: #e0d8cc;
      background: #2a2a3e;
      border: 1px solid #444;
      border-radius: 8px;
      font-size: 12px;
      line-height: 1;
      cursor: pointer;
    }

    .clickdeck-button:hover {
      background: #3a3a52;
      border-color: #f97316;
    }

    .clickdeck-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: #222;
      border-color: #333;
    }

    .clickdeck-color-picker {
      min-height: 32px;
      width: 100%;
      padding: 2px;
      border: 1px solid #444;
      border-radius: 8px;
      cursor: pointer;
      background: transparent;
    }

    .clickdeck-button--action-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .clickdeck-button--action-icon svg {
      width: 16px;
      height: 16px;
      stroke: currentColor;
    }

    .clickdeck-button--icon {
      min-height: 24px;
      width: 24px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      color: #b0a090;
    }

    .clickdeck-button--icon:hover {
      background: #3a3a52;
      color: #e0d8cc;
      border-color: transparent;
    }

    .clickdeck-button--primary {
      background: #5a4a3e;
      color: #fff;
      border-color: #5a4a3e;
    }

    .clickdeck-button--primary:hover {
      background: #4a3a2e;
      border-color: #4a3a2e;
    }

    .clickdeck-button--active {
      background: #3a2a1a;
      border-color: #c8a47a;
      font-weight: 600;
    }

    .clickdeck-button--media-source {
      min-height: 34px;
      white-space: nowrap;
      padding: 0 12px;
    }

    .clickdeck-button--media-size {
      min-width: 44px;
      padding: 0;
      font-size: 16px;
      font-weight: 600;
    }

    .clickdeck-prompt-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }

    .clickdeck-prompt-modal {
      background: #1e1e32;
      border: 1px solid #444;
      border-radius: 10px;
      padding: 14px;
      width: min(760px, calc(100vw - 32px));
      max-height: min(760px, calc(100vh - 32px));
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    }

    .clickdeck-prompt-modal__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 6px;
    }

    .clickdeck-prompt-modal__title {
      font-size: 12px;
      font-weight: 700;
      color: #e0d8cc;
    }

    .clickdeck-prompt-modal__lang {
      display: grid;
      grid-template-columns: repeat(2, minmax(72px, 1fr));
      gap: 4px;
    }

    .clickdeck-prompt-modal__textarea {
      width: 100%;
      min-height: 320px;
      max-height: calc(100vh - 220px);
      padding: 8px;
      border: 1px solid #555;
      border-radius: 6px;
      background: #2a2a3e;
      color: #e0d8cc;
      font-size: 13px;
      font-family: "Menlo", "Consolas", monospace;
      line-height: 1.5;
      resize: vertical;
      box-sizing: border-box;
    }

    .clickdeck-prompt-modal__warning {
      padding: 10px;
      background: #3a1a1a;
      border-left: 4px solid #ff4d4f;
      color: #ff8080;
      font-size: 13px;
      line-height: 1.4;
      border-radius: 4px;
    }

    .clickdeck-prompt-modal__textarea:focus {
      outline: 2px solid #f97316;
      outline-offset: -1px;
    }

    .clickdeck-prompt-modal__footer {
      display: flex;
      gap: 6px;
      justify-content: flex-end;
    }

    .clickdeck-svg-text-modal__rows {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: min(360px, calc(100vh - 260px));
      overflow-y: auto;
    }

    .clickdeck-svg-text-modal__row {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .clickdeck-svg-text-modal__label {
      font-size: 11px;
      font-weight: 600;
      color: #6b4e35;
    }

    .clickdeck-svg-text-modal__input {
      width: 100%;
      min-height: 34px;
      padding: 0 10px;
      border: 1px solid #e8d5b0;
      border-radius: 6px;
      background: #fff;
      color: #3d2f24;
      font-size: 13px;
    }

    .clickdeck-svg-text-modal__input:focus {
      outline: 2px solid #c8a47a;
      outline-offset: -1px;
    }

    .clickdeck-svg-inline-highlight {
      border: 2px solid rgba(249, 115, 22, 0.9);
      border-radius: 6px;
      box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.18);
      background: rgba(255, 255, 255, 0.02);
      pointer-events: none;
    }

    .clickdeck-svg-inline-popover {
      position: fixed;
      min-width: 180px;
      max-width: min(280px, calc(100vw - 24px));
      padding: 10px;
      border: 1px solid rgba(120, 84, 53, 0.22);
      border-radius: 10px;
      background: rgba(255, 250, 244, 0.98);
      box-shadow: 0 16px 36px rgba(49, 33, 18, 0.18);
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: auto;
      z-index: 2147483647;
    }

    .clickdeck-svg-inline-popover__title {
      font-size: 11px;
      font-weight: 700;
      color: #6b4e35;
      line-height: 1.3;
    }

    .clickdeck-svg-inline-popover__input {
      width: 100%;
      min-height: 34px;
      padding: 0 10px;
      border: 1px solid rgba(120, 84, 53, 0.24);
      border-radius: 8px;
      background: #fff;
      caret-color: currentColor;
    }

    .clickdeck-svg-inline-popover__input:focus {
      outline: 2px solid rgba(185, 133, 74, 0.9);
      outline-offset: 0;
    }

    .clickdeck-svg-inline-popover__actions {
      display: flex;
      justify-content: flex-end;
      gap: 6px;
    }

    .clickdeck-svg-inline-popover__button {
      min-width: 54px;
      height: 28px;
      padding: 0 10px;
      border: 1px solid rgba(120, 84, 53, 0.22);
      border-radius: 7px;
      background: #fff;
      color: #4b3525;
      font-size: 12px;
      font-weight: 600;
      pointer-events: auto;
      cursor: pointer;
    }

    .clickdeck-svg-inline-popover__button--primary {
      background: #f59e0b;
      border-color: #f59e0b;
      color: #fff;
    }

    .clickdeck-notice {
      background: #2a2a1a;
      border: 1px solid #555;
      border-radius: 8px;
      padding: 10px 12px;
      margin: 12px 14px 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .clickdeck-notice__title {
      font-size: 12px;
      font-weight: 600;
      color: #e0d8cc;
    }

    .clickdeck-notice__actions {
      display: flex;
      gap: 6px;
    }

    .clickdeck-panel__footer {
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 6px;
      color: #b0a090;
      font-size: 11px;
      line-height: 1.4;
    }

    .clickdeck-panel__footer a {
      color: #8a7a6a;
      text-decoration: underline;
      text-underline-offset: 2px;
      pointer-events: auto;
    }

    @media print {
      [data-clickdeck="true"] {
        display: none !important;
      }
    }

    .clickdeck-presenting [data-clickdeck="true"],
    .clickdeck-presenting .clickdeck-panel,
    .clickdeck-presenting .clickdeck-outline,
    .clickdeck-exporting [data-clickdeck="true"],
    .clickdeck-exporting .clickdeck-panel,
    .clickdeck-exporting .clickdeck-outline {
      display: none !important;
    }

    .clickdeck-exporting,
    .clickdeck-exporting body {
      scrollbar-width: none !important;
    }

    .clickdeck-exporting::-webkit-scrollbar,
    .clickdeck-exporting body::-webkit-scrollbar {
      display: none !important;
    }

    .clickdeck-presenting,
    .clickdeck-presenting body {
      overflow: hidden !important;
    }

    .clickdeck-presenting .clickdeck-presentation-hidden-slide {
      display: none !important;
    }

    .clickdeck-presenting .clickdeck-presenting-slide {
      position: fixed !important;
      left: 50% !important;
      top: 50% !important;
      transform: translate(-50%, -50%) scale(var(--clickdeck-present-scale, 1)) !important;
      transform-origin: center center !important;
      z-index: 2147483000 !important;
      max-width: none !important;
      max-height: none !important;
      animation: clickdeckFadeIn 0.3s ease-out;
    }

    @keyframes clickdeckFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `;
  document.documentElement.append(style);
}

// src/adapters/assets.ts
var ASSET_BASE = "/clickdeck-assets/";
function getAssetURL(path) {
  return `${ASSET_BASE}${path}`;
}

// src/content/panel.ts
function createPanel(onAction, options = {}) {
  const labels = getPanelLabels();
  const panelLogoUrl = getAssetURL("Bear-collapsed.png");
  const collapsedLogoUrl = getAssetURL("Bear-collapsed.png");
  const element = document.createElement("div");
  element.className = "clickdeck-panel";
  element.dataset.clickdeck = "true";
  element.innerHTML = `
    <div class="clickdeck-panel__floating-button" data-internal-action="restore" title="${labels.restorePanel}" aria-label="${labels.restorePanel}">
      <img src="${collapsedLogoUrl}" alt="QuickUI" />
    </div>
    <div class="clickdeck-panel__content-wrapper">
      <div class="clickdeck-panel__header">
        <span class="clickdeck-panel__title">
          <img class="clickdeck-panel__logo" src="${panelLogoUrl}" alt="" />
          <span class="clickdeck-panel__status">${labels.active}</span>
        </span>
        <span class="clickdeck-panel__header-actions">
          <button class="clickdeck-button clickdeck-button--icon" data-internal-action="transparency" type="button" aria-label="${labels.transparency}" title="${labels.transparency}">\u25D0</button>
          <button class="clickdeck-button clickdeck-button--icon" data-action="switch-language" type="button" aria-label="${labels.langSwitch}" title="${labels.langSwitch}" style="font-size:10px;font-weight:700;width:auto;min-width:26px;padding:0 4px;">${labels.langSwitch}</button>
          <button class="clickdeck-button clickdeck-button--icon" data-internal-action="collapse" type="button" aria-label="${labels.collapse}" title="${labels.collapse}">\u2212</button>
          <button class="clickdeck-button clickdeck-button--icon" data-action="close" type="button" aria-label="${labels.close}" title="${labels.close}">\u2715</button>
        </span>
      </div>
    <div class="clickdeck-panel__hint">${labels.selectHint}</div>
    <div class="clickdeck-panel__module-title">${labels.visualEditing}</div>
    <div class="clickdeck-panel__section" data-section="typography" data-context="text">
      <div class="clickdeck-panel__section-title">${labels.typography}</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("font-smaller", "A-")}
        ${buttonMarkup("font-larger", "A+")}
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="weight" data-context="text">
      <div class="clickdeck-panel__section-title">${labels.weight}</div>
      <div class="clickdeck-panel__group">
        ${iconButtonMarkup("weight-decrease", `<span style="font-weight:300;">B-</span>`, labels.decreaseWeight)}
        ${iconButtonMarkup("weight-increase", `<span style="font-weight:700;">B+</span>`, labels.increaseWeight)}
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="color" data-context="text">
      <div class="clickdeck-panel__section-title">${labels.color}</div>
      <div class="clickdeck-panel__group">
        <input type="color" class="clickdeck-color-picker" value="#2563eb" title="${labels.pickColor}" />
        <button class="clickdeck-button" data-action="pick-bg-color" type="button">${labels.auto}</button>
        <button class="clickdeck-button" data-action="reset-color" type="button">${labels.reset}</button>
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="background" data-context="container">
      <div class="clickdeck-panel__section-title">${labels.background}</div>
      <div class="clickdeck-panel__group">
        <input type="color" class="clickdeck-bg-color-picker" value="#ffffff" title="${labels.pickBgColor}" />
        ${buttonMarkup("bg-warm", labels.warm)}
        ${buttonMarkup("bg-white", labels.white)}
        ${buttonMarkup("bg-transparent", labels.transparent)}
        ${buttonMarkup("bg-reset", labels.reset)}
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="alignment" data-context="text,container">
      <div class="clickdeck-panel__section-title">${labels.alignment}</div>
      <div class="clickdeck-panel__group">
        ${iconButtonMarkup("align-left", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`, labels.alignLeft)}
        ${iconButtonMarkup("align-center", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`, labels.alignCenter)}
        ${iconButtonMarkup("align-right", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`, labels.alignRight)}
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="image-basic" data-context="image,video">
      <div class="clickdeck-panel__section-title">${labels.image}</div>
      <div class="clickdeck-panel__sub-section">
        <div class="clickdeck-panel__sub-title">${labels.imageSource}</div>
        <div class="clickdeck-panel__group">
          ${buttonMarkup("replace-image", labels.replaceImage, true)}
          ${buttonMarkup("replace-video", labels.replaceVideo, true)}
        </div>
      </div>
      <div class="clickdeck-panel__sub-section">
        <div class="clickdeck-panel__sub-title">${labels.imageSize}</div>
        <div class="clickdeck-panel__group">
          ${buttonMarkup("image-width-smaller", labels.smaller)}
          ${buttonMarkup("image-width-larger", labels.larger)}
          ${buttonMarkup("image-maxwidth-100", labels.imageMax100)}
        </div>
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="history" data-context="text,container,image,video">
      <div class="clickdeck-panel__section-title">${labels.history}</div>
      <div class="clickdeck-panel__group">
        ${buttonMarkup("undo", labels.undo, true)}
        ${buttonMarkup("redo", labels.redo, true)}
      </div>
    </div>

    <details class="clickdeck-panel__advanced">
      <summary class="clickdeck-panel__advanced-summary">${labels.advanced}</summary>
      <div class="clickdeck-panel__section" data-section="line-height" data-context="text">
        <div class="clickdeck-panel__section-title">${labels.lineHeight}</div>
        <div class="clickdeck-panel__group">
          ${iconButtonMarkup("lineheight-decrease", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16M8 9l4 -3l4 3M8 15l4 3l4 -3"/></svg>`, labels.decreaseLineHeight)}
          ${iconButtonMarkup("lineheight-increase", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16M8 3l4 -3l4 3M8 21l4 3l4 -3"/></svg>`, labels.increaseLineHeight)}
        </div>
      </div>
      <div class="clickdeck-panel__section" data-section="letter-spacing" data-context="text">
        <div class="clickdeck-panel__section-title">${labels.letterSpacing}</div>
        <div class="clickdeck-panel__group">
          ${iconButtonMarkup("letterspacing-decrease", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 12h8M10 9l-3 3l3 3M14 9l3 3l-3 3M4 4v16M20 4v16"/></svg>`, labels.decreaseLetterSpacing)}
          ${iconButtonMarkup("letterspacing-increase", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16M7 9l-3 3l3 3M17 9l3 3l-3 3M8 4v16M16 4v16"/></svg>`, labels.increaseLetterSpacing)}
        </div>
      </div>
      <div class="clickdeck-panel__section" data-section="spacing" data-context="text,container,image,video">
        <div class="clickdeck-panel__section-title">${labels.spacing}</div>
        <div class="clickdeck-panel__group clickdeck-panel__group--spacing" data-spacing-group="margin">
          <span class="clickdeck-panel__spacing-label">${labels.margin}</span>
          ${iconButtonMarkup("margin-decrease", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12"/><path d="M12 2v4M12 22v-4M2 12h4M22 12h-4"/></svg>`, labels.decreaseMargin)}
          ${iconButtonMarkup("margin-increase", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12"/><path d="M12 6v-4M12 18v4M6 12h-4M18 12h4"/></svg>`, labels.increaseMargin)}
        </div>
        <div class="clickdeck-panel__group clickdeck-panel__group--spacing" data-spacing-group="padding">
          <span class="clickdeck-panel__spacing-label">${labels.padding}</span>
          ${iconButtonMarkup("padding-decrease", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20"/><rect x="8" y="8" width="8" height="8"/><path d="M12 2v6M12 22v-6M2 12h6M22 12h-6"/></svg>`, labels.decreasePadding)}
          ${iconButtonMarkup("padding-increase", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20"/><rect x="8" y="8" width="8" height="8"/><path d="M12 8v-6M12 16v6M8 12h-6M16 12h6"/></svg>`, labels.increasePadding)}
        </div>
      </div>
      <div class="clickdeck-panel__section" data-section="radius" data-context="container">
        <div class="clickdeck-panel__section-title">${labels.radius}</div>
        <div class="clickdeck-panel__group">
          ${iconButtonMarkup("radius-decrease", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="0" ry="0"/></svg>`, labels.decreaseRadius)}
          ${iconButtonMarkup("radius-increase", `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="8" ry="8"/></svg>`, labels.increaseRadius)}
        </div>
      </div>
      <div class="clickdeck-panel__section" data-section="image-advanced" data-context="image">
        <div class="clickdeck-panel__sub-section">
          <div class="clickdeck-panel__sub-title">${labels.imageFit}</div>
          <div class="clickdeck-panel__group">
            ${buttonMarkup("image-fit-contain", labels.imageContain)}
            ${buttonMarkup("image-fit-cover", labels.imageCover)}
          </div>
        </div>
        <div class="clickdeck-panel__sub-section">
          <div class="clickdeck-panel__sub-title">${labels.imageRadius}</div>
          <div class="clickdeck-panel__group">
            ${buttonMarkup("image-radius-none", labels.none)}
            ${buttonMarkup("image-radius-sm", labels.small)}
            ${buttonMarkup("image-radius-lg", labels.large)}
            ${buttonMarkup("image-radius-round", labels.round)}
          </div>
        </div>
      </div>
      <div class="clickdeck-panel__section" data-section="diagnostics">
        <div class="clickdeck-panel__section-title">${labels.diagnostics}</div>
        <div class="clickdeck-panel__group" style="grid-template-columns: 1fr;">
          ${buttonMarkup("copy-diagnostics", labels.copyDiagnostics)}
        </div>
      </div>
    </details>

    <div class="clickdeck-panel__section" data-section="intent">
      <div class="clickdeck-panel__section-title">${labels.intentSection}</div>
      <div class="clickdeck-panel__group" style="grid-template-columns: 1fr;">
        ${buttonMarkup("add-intent", labels.addIntent)}
      </div>
    </div>
    <div class="clickdeck-panel__section" data-section="ai-prompt">
      <div class="clickdeck-panel__section-title">${labels.aiPromptSection}</div>
      <div class="clickdeck-panel__group" style="grid-template-columns: 1fr;">
        ${buttonMarkup("copy-ai-prompt", labels.copyAiPrompt)}
      </div>
    </div>

    <div class="clickdeck-panel__section" data-section="ask-gemini">
      <div class="clickdeck-panel__section-title">${labels.askGeminiSection}</div>
      <div class="clickdeck-panel__sub-hint" style="margin-bottom: 4px; font-size: 11px; opacity: 0.6; line-height: 1.4;">${labels.askGeminiHint}</div>
      <div class="clickdeck-panel__sub-hint" style="margin-bottom: 8px; font-size: 11px; opacity: 0.8; line-height: 1.4;">${labels.askGeminiVisibilityHint}</div>
      <div class="clickdeck-panel__group clickdeck-panel__group--ask-gemini">
        ${buttonMarkup("ask-gemini-flow", labels.askGeminiFlow, false, labels.askGeminiFlowTooltip)}
        ${buttonMarkup("ask-gemini-focus", labels.askGeminiFocus, false, labels.askGeminiFocusTooltip)}
        ${buttonMarkup("ask-gemini-interaction", labels.askGeminiInteraction, false, labels.askGeminiInteractionTooltip)}
      </div>
    </div>

    ${false ? `<div class="clickdeck-panel__section" data-section="finish">
      <div class="clickdeck-panel__section-title">${labels.finish}</div>
      <div class="clickdeck-panel__group" style="grid-template-columns: repeat(2, 1fr);">
        ${buttonMarkup("export-long-image", labels.exportLongImage)}
        ${buttonMarkup("export-html", labels.exportHtmlButton, false, labels.exportHtmlDesc)}
        ${buttonMarkup("present", labels.present, true)}
        ${buttonMarkup("export-image-pdf-long", labels.exportImagePdfLong, false, labels.imagePdfTooltip)}
        ${buttonMarkup("export-image-pdf-a4", labels.exportImagePdfA4, false, labels.imagePdfTooltip)}
        ${buttonMarkup("export-image-pdf-slides", labels.exportImagePdfSlides, false, labels.imagePdfTooltip)}
      </div> 
    </div>` : ""}
    <div class="clickdeck-panel__footer">
      <a href="https://github.com/playertk/QuickUIDesign/issues" target="_blank" rel="noopener noreferrer">Feedback</a>
      <a href="https://github.com/playertk/QuickUIDesign/" target="_blank" rel="noopener noreferrer">GitHub</a>
    </div>
    </div>
    </div>
  `;
  element.addEventListener("click", (event) => {
    const target = event.target;
    const internalButton = target.closest("[data-internal-action]");
    if (internalButton) {
      const action = internalButton.dataset.internalAction;
      if (action === "collapse") {
        element.classList.add("clickdeck-panel--collapsed");
        options.onCollapsedChange?.(true);
        emitLayoutChange();
      } else if (action === "restore") {
        element.classList.remove("clickdeck-panel--collapsed");
        options.onCollapsedChange?.(false);
        emitLayoutChange();
      } else if (action === "transparency") {
        if (element.classList.contains("clickdeck-panel--opacity-70")) {
          element.classList.remove("clickdeck-panel--opacity-70");
          element.classList.add("clickdeck-panel--opacity-40");
        } else if (element.classList.contains("clickdeck-panel--opacity-40")) {
          element.classList.remove("clickdeck-panel--opacity-40");
        } else {
          element.classList.add("clickdeck-panel--opacity-70");
        }
      }
      return;
    }
    const button = target.closest("[data-action]");
    if (!button) {
      return;
    }
    onAction(button.dataset.action);
  });
  const colorPicker = element.querySelector(".clickdeck-color-picker");
  if (colorPicker) {
    colorPicker.addEventListener("input", () => {
      onAction(`color:${colorPicker.value}`);
    });
  }
  const bgColorPicker = element.querySelector(".clickdeck-bg-color-picker");
  if (bgColorPicker) {
    bgColorPicker.addEventListener("input", () => {
      onAction(`bg-custom:${bgColorPicker.value}`);
    });
  }
  const header = element.querySelector(".clickdeck-panel__header");
  const floatingBtn = element.querySelector(".clickdeck-panel__floating-button");
  if (header && floatingBtn) {
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;
    let hasMoved = false;
    const onMouseDown = (e) => {
      if (e.target.closest("button")) {
        return;
      }
      isDragging = true;
      hasMoved = false;
      offsetX = e.clientX - element.getBoundingClientRect().left;
      offsetY = e.clientY - element.getBoundingClientRect().top;
      e.preventDefault();
    };
    header.addEventListener("mousedown", onMouseDown);
    floatingBtn.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", (e) => {
      if (!isDragging) {
        return;
      }
      hasMoved = true;
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
      element.style.right = "auto";
      emitLayoutChange();
    });
    window.addEventListener("mouseup", () => {
      isDragging = false;
    });
    floatingBtn.addEventListener("click", (e) => {
      if (hasMoved) {
        e.stopPropagation();
        e.preventDefault();
      }
    }, { capture: true });
  }
  let undoAvailable = false;
  let redoAvailable = false;
  let canReplaceMedia = false;
  let replaceMediaType = "none";
  let canPresent = false;
  let currentContext = "none";
  const updateContextUI = () => {
    element.querySelectorAll(".clickdeck-panel__section[data-context]").forEach((section) => {
      const allowedContexts = (section.dataset.context ?? "").split(",").map((value) => value.trim());
      section.hidden = !allowedContexts.includes(currentContext);
    });
    const paddingGroup = element.querySelector('.clickdeck-panel__group--spacing[data-spacing-group="padding"]');
    if (paddingGroup) {
      paddingGroup.hidden = currentContext === "image" || currentContext === "video";
    }
    const colorPickerEl = element.querySelector(".clickdeck-color-picker");
    if (colorPickerEl) {
      colorPickerEl.disabled = currentContext !== "text";
    }
    const bgColorPickerEl = element.querySelector(".clickdeck-bg-color-picker");
    if (bgColorPickerEl) {
      bgColorPickerEl.disabled = currentContext !== "container";
    }
    const advancedDetails = element.querySelector(".clickdeck-panel__advanced");
    if (advancedDetails) {
      const hasVisibleChild = Array.from(advancedDetails.querySelectorAll(".clickdeck-panel__section")).some((s) => !s.hidden);
      advancedDetails.hidden = !hasVisibleChild;
    }
    const pageLevelActions = /* @__PURE__ */ new Set([
      "close",
      "switch-language",
      "copy-diagnostics",
      "copy-ai-prompt",
      "ask-gemini-flow",
      "ask-gemini-focus",
      "ask-gemini-interaction",
      "export-html",
      "export-long-image",
      "export-image-pdf-long",
      "export-image-pdf-a4",
      "export-image-pdf-slides",
      "add-intent"
    ]);
    element.querySelectorAll("[data-action]").forEach((button) => {
      const action = button.dataset.action;
      if (pageLevelActions.has(action)) {
        return;
      }
      if (action === "present") {
        button.disabled = !canPresent;
        button.title = canPresent ? "" : labels.noSlides;
        return;
      }
      if (action === "undo") {
        button.disabled = currentContext === "none" || !undoAvailable;
        return;
      }
      if (action === "redo") {
        button.disabled = currentContext === "none" || !redoAvailable;
        return;
      }
      if (action === "replace-image") {
        const isImage = currentContext === "image";
        button.disabled = !isImage || !canReplaceMedia || replaceMediaType !== "image";
        button.style.display = isImage ? "" : "none";
        return;
      }
      if (action === "replace-video") {
        const isVideo = currentContext === "video";
        button.disabled = !isVideo || !canReplaceMedia || replaceMediaType !== "video";
        button.style.display = isVideo ? "" : "none";
        return;
      }
      button.disabled = currentContext === "none";
    });
  };
  updateContextUI();
  function emitLayoutChange() {
    const rect = element.getBoundingClientRect();
    options.onLayoutChange?.({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      collapsed: element.classList.contains("clickdeck-panel--collapsed")
    });
  }
  return {
    element,
    destroy: () => {
      element.remove();
    },
    syncLayout: () => {
      emitLayoutChange();
    },
    setHint: (text) => {
      const hint = element.querySelector(".clickdeck-panel__hint");
      if (hint) {
        hint.textContent = text === labels.selectHint ? text : `${labels.selectedHintPrefix} ${text}`;
      }
    },
    setHistoryAvailability: (canUndo, canRedo) => {
      undoAvailable = canUndo;
      redoAvailable = canRedo;
      updateContextUI();
    },
    setReplaceMediaAvailability: (enabled, mediaType) => {
      canReplaceMedia = enabled;
      replaceMediaType = mediaType;
      updateContextUI();
    },
    setSelectionContext: (context) => {
      currentContext = context;
      updateContextUI();
    },
    setSvgTextEditorState: (state) => {
      const existing = element.querySelector(".clickdeck-svg-text-editor-state");
      if (existing) {
        existing.remove();
      }
      if (!state) {
        return;
      }
      const badge = document.createElement("div");
      badge.className = "clickdeck-svg-text-editor-state";
      badge.dataset.clickdeck = "true";
      badge.textContent = state.message;
      Object.assign(badge.style, {
        padding: "4px 8px",
        fontSize: "11px",
        borderRadius: "6px",
        marginBottom: "4px"
      });
      if (state.mode === "editable") {
        badge.style.background = "#1a3a2a";
        badge.style.color = "#7acc4a";
      } else {
        badge.style.background = "#3a1a1a";
        badge.style.color = "#e85d5d";
      }
      const intentSection = element.querySelector('[data-section="intent"]');
      if (intentSection) {
        intentSection.parentNode?.insertBefore(badge, intentSection);
      }
    },
    setPresentationAvailability: (hasSlides) => {
      canPresent = hasSlides;
      updateContextUI();
    },
    showPromptPreview: (options2) => {
      element.querySelector(".clickdeck-prompt-overlay")?.remove();
      let currentLang = "en";
      let isDirty = false;
      const overlay = document.createElement("div");
      overlay.className = "clickdeck-prompt-overlay";
      overlay.dataset.clickdeck = "true";
      const render = () => {
        const promptText = currentLang === "zh" ? options2.promptZh : options2.promptEn;
        const promptNote = currentLang === "zh" ? labels.promptChineseReferenceNote : labels.promptEnglishPrimaryNote;
        overlay.innerHTML = `
          <div class="clickdeck-prompt-modal">
            <div class="clickdeck-prompt-modal__header">
              <span class="clickdeck-prompt-modal__title">${labels.promptPreviewTitle}</span>
              <div class="clickdeck-prompt-modal__lang">
                <button class="clickdeck-button${currentLang === "en" ? " clickdeck-button--active" : ""}" data-lang="en" type="button">${labels.promptLangEn}</button>
                <button class="clickdeck-button${currentLang === "zh" ? " clickdeck-button--active" : ""}" data-lang="zh" type="button">${labels.promptLangZh}</button>
              </div>
            </div>
            <div class="clickdeck-prompt-modal__note">${promptNote}</div>
            ${options2.hasMediaReplacement ? `<div class="clickdeck-prompt-modal__warning">${labels.promptMediaUIReminder}</div>` : ""}
            <textarea class="clickdeck-prompt-modal__textarea" spellcheck="false">${promptText}</textarea>
            <div class="clickdeck-prompt-modal__footer">
              <button class="clickdeck-button clickdeck-button--primary" data-prompt-action="copy" type="button">${labels.promptCopy}</button>
              <button class="clickdeck-button" data-prompt-action="close" type="button">${labels.promptClose}</button>
            </div>
          </div>
        `;
        overlay.querySelector("textarea")?.addEventListener("input", () => {
          isDirty = true;
        });
        overlay.querySelectorAll("[data-lang]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const newLang = btn.dataset.lang;
            if (newLang === currentLang) return;
            if (isDirty) {
              const confirmMsg = currentLang === "zh" ? "\u4F60\u5DF2\u624B\u52A8\u7F16\u8F91\u4E86 prompt\uFF0C\u5207\u6362\u8BED\u8A00\u5C06\u4E22\u5931\u8FD9\u4E9B\u7F16\u8F91\uFF0C\u786E\u5B9A\u7EE7\u7EED\u5417\uFF1F" : "You have manually edited the prompt. Switching language will discard your changes. Continue?";
              if (!confirm(confirmMsg)) return;
            }
            currentLang = newLang;
            isDirty = false;
            render();
          });
        });
        const copyBtn = overlay.querySelector("[data-prompt-action='copy']");
        copyBtn?.addEventListener("click", () => {
          const textarea = overlay.querySelector("textarea");
          const value = textarea?.value ?? "";
          options2.onCopy(value, currentLang);
          if (copyBtn) {
            const original = copyBtn.textContent ?? "";
            copyBtn.textContent = labels.promptCopied;
            setTimeout(() => {
              copyBtn.textContent = original;
            }, 1500);
          }
        });
        overlay.querySelector("[data-prompt-action='close']")?.addEventListener("click", () => {
          overlay.remove();
        });
      };
      render();
      element.appendChild(overlay);
    },
    showSavedEditsNotice: (options2) => {
      let notice = element.querySelector(".clickdeck-notice");
      if (notice) {
        notice.remove();
      }
      notice = document.createElement("div");
      notice.className = "clickdeck-notice";
      const titleParts = [];
      if (options2.count > 0) {
        titleParts.push(`${labels.savedEditsFound} (${options2.count})`);
      }
      if (options2.hasIntentDrafts && options2.count === 0) {
        titleParts.push(`${labels.savedIntentDrafts}`);
      } else if (options2.hasIntentDrafts) {
        titleParts.push(`+ ${labels.savedIntentDrafts}`);
      }
      notice.innerHTML = `
        <div class="clickdeck-notice__title">${titleParts.join(" ")}</div>
        <div class="clickdeck-notice__actions">
          <button class="clickdeck-button clickdeck-button--primary" data-notice-action="restore" type="button">${labels.restore}</button>
          <button class="clickdeck-button" data-notice-action="clear" type="button">${labels.clear}</button>
        </div>
      `;
      notice.querySelector("[data-notice-action='restore']")?.addEventListener("click", () => options2.onRestore());
      notice.querySelector("[data-notice-action='clear']")?.addEventListener("click", () => options2.onClear());
      const header2 = element.querySelector(".clickdeck-panel__header");
      if (header2 && header2.nextSibling) {
        header2.parentNode?.insertBefore(notice, header2.nextSibling);
      }
    },
    hideSavedEditsNotice: () => {
      element.querySelector(".clickdeck-notice")?.remove();
    },
    showSvgTextEditor: (options2) => {
      element.querySelector(".clickdeck-svg-text-editor")?.remove();
      const editorEl = document.createElement("div");
      editorEl.className = "clickdeck-svg-text-editor";
      editorEl.dataset.clickdeck = "true";
      const warningEl = document.createElement("div");
      warningEl.className = "clickdeck-svg-text-editor__warning";
      warningEl.textContent = options2.warning;
      const listEl = document.createElement("div");
      listEl.className = "clickdeck-svg-text-editor__list";
      const inputs = [];
      for (const item of options2.items) {
        const row = document.createElement("div");
        row.className = "clickdeck-svg-text-editor__row";
        const labelEl = document.createElement("label");
        labelEl.className = "clickdeck-svg-text-editor__label";
        labelEl.textContent = item.label;
        const input = document.createElement("input");
        input.type = "text";
        input.className = "clickdeck-svg-text-editor__input";
        input.value = item.value;
        input.dataset.svgTextId = item.id;
        row.append(labelEl, input);
        listEl.appendChild(row);
        inputs.push(input);
      }
      const actionsEl = document.createElement("div");
      actionsEl.className = "clickdeck-svg-text-editor__actions";
      const applyBtn = document.createElement("button");
      applyBtn.type = "button";
      applyBtn.className = "clickdeck-button clickdeck-button--primary";
      applyBtn.textContent = "Apply";
      applyBtn.addEventListener("click", () => {
        const updates = inputs.map((inp) => ({
          id: inp.dataset.svgTextId ?? "",
          value: inp.value
        }));
        options2.onApply(updates);
        editorEl.remove();
      });
      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "clickdeck-button";
      cancelBtn.textContent = "Cancel";
      cancelBtn.addEventListener("click", () => {
        editorEl.remove();
      });
      actionsEl.append(applyBtn, cancelBtn);
      editorEl.append(warningEl, listEl, actionsEl);
      const header2 = element.querySelector(".clickdeck-panel__header");
      if (header2 && header2.nextSibling) {
        header2.parentNode?.insertBefore(editorEl, header2.nextSibling);
      }
    }
  };
}
function buttonMarkup(action, label, disabled = false, title) {
  const titleAttr = title ? ` title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}"` : "";
  return `<button class="clickdeck-button" data-action="${action}" type="button"${disabled ? " disabled" : ""}${titleAttr}>${label}</button>`;
}
function iconButtonMarkup(action, icon, label, disabled = false) {
  return `<button class="clickdeck-button clickdeck-button--action-icon" data-action="${action}" type="button" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"${disabled ? " disabled" : ""}>${icon}</button>`;
}
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// src/content/selection.ts
function isSelectableElement(element) {
  if (isClickDeckUiElement(element)) {
    return false;
  }
  if (element === document.documentElement || element === document.body) {
    return false;
  }
  return true;
}
function getTabSwitchTarget(current, direction) {
  const parent = current.parentElement;
  const child = findFirstEditableDescendant(current);
  const parentEligible = parent ? isSelectableElement(parent) : false;
  const childEligible = child ? isSelectableElement(child) : false;
  if (direction === "forward") {
    if (parentEligible) return parent;
    if (childEligible) return child;
    return null;
  }
  if (childEligible) return child;
  if (parentEligible) return parent;
  return null;
}
function isLargeContainer(element) {
  const tagName = element.tagName.toLowerCase();
  if (tagName === "img" || tagName === "video" || tagName === "svg" || tagName === "canvas") {
    return false;
  }
  if (["button", "input", "select", "textarea", "a", "label"].includes(tagName)) {
    return false;
  }
  const role = element.getAttribute("role");
  if (role === "dialog" || role === "toolbar" || role === "navigation") {
    return false;
  }
  if (element.getAttribute("aria-modal") === "true") {
    return false;
  }
  if (["dialog", "nav", "form", "table"].includes(tagName)) {
    return false;
  }
  if (element.isContentEditable) {
    return false;
  }
  try {
    const style = window.getComputedStyle(element);
    if (style.position === "fixed" || style.position === "sticky") {
      return false;
    }
  } catch {
  }
  const rect = element.getBoundingClientRect();
  const viewportArea = window.innerWidth * window.innerHeight;
  const elementArea = rect.width * rect.height;
  if (elementArea <= viewportArea * 0.4) {
    return false;
  }
  const layoutTags = ["div", "main", "section", "article", "header", "footer", "aside"];
  if (!layoutTags.includes(tagName)) {
    return false;
  }
  if (!findMeaningfulDescendant(element)) {
    return false;
  }
  return true;
}
function getEditableTarget(target, currentSelected) {
  return resolveEditableTarget(target, currentSelected).target;
}
function resolveEditableTarget(target, currentSelected) {
  const complexElement = findComplexElementFromTarget(target);
  if (complexElement) {
    return { target: complexElement, source: "direct" };
  }
  if (!(target instanceof HTMLElement)) {
    return { target: null, source: "none" };
  }
  if (!isSelectableElement(target)) {
    return { target: null, source: "none" };
  }
  if (isLargeContainer(target)) {
    if (currentSelected === target) {
      return { target, source: "direct" };
    }
    const child = findMeaningfulDescendant(target);
    if (child && isSelectableElement(child)) {
      return { target: child, source: "large-container-fallback" };
    }
  }
  if (!isExplicitContentTarget(target)) {
    return { target: null, source: "background-block" };
  }
  return { target, source: "direct" };
}
function isExplicitContentTarget(element) {
  const tagName = element.tagName.toLowerCase();
  if (/^h[1-6]$/.test(tagName) || [
    "span",
    "p",
    "li",
    "td",
    "th",
    "strong",
    "em",
    "b",
    "i",
    "small",
    "mark",
    "code",
    "pre",
    "blockquote",
    "img",
    "video",
    "svg",
    "canvas",
    "button",
    "input",
    "select",
    "textarea",
    "a",
    "label"
  ].includes(tagName)) {
    return true;
  }
  if (element.isContentEditable) {
    return true;
  }
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
      return true;
    }
  }
  return false;
}

// src/content/style-actions.ts
function applyStyleAction(logger, element, action) {
  const computed = window.getComputedStyle(element);
  let changes = null;
  switch (action) {
    case "font-smaller":
      changes = [{
        property: "fontSize",
        before: element.style.fontSize,
        after: `${parseFloat(computed.fontSize) - 2}px`
      }];
      break;
    case "font-larger":
      changes = [{
        property: "fontSize",
        before: element.style.fontSize,
        after: `${parseFloat(computed.fontSize) + 2}px`
      }];
      break;
    case "align-left":
      changes = [{
        property: "textAlign",
        before: element.style.textAlign,
        after: "left"
      }];
      break;
    case "align-center":
      changes = [{
        property: "textAlign",
        before: element.style.textAlign,
        after: "center"
      }];
      break;
    case "align-right":
      changes = [{
        property: "textAlign",
        before: element.style.textAlign,
        after: "right"
      }];
      break;
    case "pick-bg-color": {
      let bg = "";
      let current = element.parentElement;
      while (current) {
        const computedBg = window.getComputedStyle(current).backgroundColor;
        if (computedBg && computedBg !== "transparent" && computedBg !== "rgba(0, 0, 0, 0)") {
          bg = computedBg;
          break;
        }
        current = current.parentElement;
      }
      if (!bg) {
        logger.info("No non-transparent background found in ancestors");
        return null;
      }
      changes = [{
        property: "color",
        before: element.style.color,
        after: bg
      }];
      break;
    }
    case "reset-color":
      changes = [{
        property: "color",
        before: element.style.color,
        after: ""
      }];
      break;
    case "weight-decrease": {
      const current = readFontWeight(computed.fontWeight);
      changes = [{
        property: "fontWeight",
        before: element.style.fontWeight,
        after: `${clamp(current - 100, 100, 900)}`
      }];
      break;
    }
    case "weight-increase": {
      const current = readFontWeight(computed.fontWeight);
      changes = [{
        property: "fontWeight",
        before: element.style.fontWeight,
        after: `${clamp(current + 100, 100, 900)}`
      }];
      break;
    }
    case "lineheight-decrease": {
      const current = readLineHeightRatio(computed);
      changes = [{
        property: "lineHeight",
        before: element.style.lineHeight,
        after: `${roundTo(clamp(current - 0.1, 1, 2.4), 1)}`
      }];
      break;
    }
    case "lineheight-increase": {
      const current = readLineHeightRatio(computed);
      changes = [{
        property: "lineHeight",
        before: element.style.lineHeight,
        after: `${roundTo(clamp(current + 0.1, 1, 2.4), 1)}`
      }];
      break;
    }
    case "letterspacing-decrease": {
      const current = readLetterSpacingEm(computed);
      changes = [{
        property: "letterSpacing",
        before: element.style.letterSpacing,
        after: `${roundTo(clamp(current - 0.02, -0.08, 0.16), 2)}em`
      }];
      break;
    }
    case "letterspacing-increase": {
      const current = readLetterSpacingEm(computed);
      changes = [{
        property: "letterSpacing",
        before: element.style.letterSpacing,
        after: `${roundTo(clamp(current + 0.02, -0.08, 0.16), 2)}em`
      }];
      break;
    }
    case "margin-decrease": {
      const current = readPixelValue(computed.marginTop, 0);
      changes = [{
        property: "margin",
        before: element.style.margin,
        after: `${clamp(current - 4, 0, 96)}px`
      }];
      break;
    }
    case "margin-increase": {
      const current = readPixelValue(computed.marginTop, 0);
      changes = [{
        property: "margin",
        before: element.style.margin,
        after: `${clamp(current + 4, 0, 96)}px`
      }];
      break;
    }
    case "padding-decrease": {
      const current = readPixelValue(computed.paddingTop, 0);
      changes = [{
        property: "padding",
        before: element.style.padding,
        after: `${clamp(current - 4, 0, 96)}px`
      }];
      break;
    }
    case "padding-increase": {
      const current = readPixelValue(computed.paddingTop, 0);
      changes = [{
        property: "padding",
        before: element.style.padding,
        after: `${clamp(current + 4, 0, 96)}px`
      }];
      break;
    }
    case "bg-warm":
      changes = [{
        property: "backgroundColor",
        before: element.style.backgroundColor,
        after: "#f7f3ea"
      }];
      break;
    case "bg-white":
      changes = [{
        property: "backgroundColor",
        before: element.style.backgroundColor,
        after: "#ffffff"
      }];
      break;
    case "bg-transparent":
      changes = [{
        property: "backgroundColor",
        before: element.style.backgroundColor,
        after: "transparent"
      }];
      break;
    case "bg-reset":
      changes = [{
        property: "backgroundColor",
        before: element.style.backgroundColor,
        after: ""
      }];
      break;
    default:
      if (action.startsWith("bg-custom:")) {
        const bgVal = action.replace("bg-custom:", "");
        changes = [{
          property: "backgroundColor",
          before: element.style.backgroundColor,
          after: bgVal
        }];
      }
      break;
    case "radius-decrease": {
      const current = readPixelValue(computed.borderTopLeftRadius, 0);
      changes = [{
        property: "borderRadius",
        before: element.style.borderRadius,
        after: `${clamp(current - 2, 0, 48)}px`
      }];
      break;
    }
    case "radius-increase": {
      const current = readPixelValue(computed.borderTopLeftRadius, 0);
      changes = [{
        property: "borderRadius",
        before: element.style.borderRadius,
        after: `${clamp(current + 2, 0, 48)}px`
      }];
      break;
    }
    case "image-width-smaller": {
      if (getComplexElementKind(element) === "formula") {
        changes = buildFormulaScaleChanges(element, computed, -1);
        break;
      }
      if (element instanceof HTMLVideoElement) {
        changes = buildVideoScaleChanges(element, computed, -1);
        break;
      }
      const current = element.style.width || computed.width;
      const next = stepSize(current, -1);
      changes = buildMediaScaleChanges(element, computed, next);
      break;
    }
    case "image-width-larger": {
      if (getComplexElementKind(element) === "formula") {
        changes = buildFormulaScaleChanges(element, computed, 1);
        break;
      }
      if (element instanceof HTMLVideoElement) {
        changes = buildVideoScaleChanges(element, computed, 1);
        break;
      }
      const current = element.style.width || computed.width;
      const next = stepSize(current, 1);
      changes = buildMediaScaleChanges(element, computed, next);
      break;
    }
    case "image-maxwidth-100":
      changes = [{
        property: "maxWidth",
        before: element.style.maxWidth,
        after: "100%"
      }];
      break;
    case "image-fit-contain":
      changes = [{
        property: "objectFit",
        before: element.style.objectFit,
        after: "contain"
      }];
      break;
    case "image-fit-cover":
      changes = [{
        property: "objectFit",
        before: element.style.objectFit,
        after: "cover"
      }];
      break;
    case "image-radius-none":
      changes = [{
        property: "borderRadius",
        before: element.style.borderRadius,
        after: "0"
      }];
      break;
    case "image-radius-sm":
      changes = [{
        property: "borderRadius",
        before: element.style.borderRadius,
        after: "8px"
      }];
      break;
    case "image-radius-lg":
      changes = [{
        property: "borderRadius",
        before: element.style.borderRadius,
        after: "16px"
      }];
      break;
    case "image-radius-round":
      changes = [{
        property: "borderRadius",
        before: element.style.borderRadius,
        after: "9999px"
      }];
      break;
  }
  if (!changes || changes.length === 0) {
    return null;
  }
  for (const change of changes) {
    element.style[change.property] = change.after;
  }
  logger.info("Style action applied", { action, target: describeElement(element) });
  return changes;
}
function buildMediaScaleChanges(element, computed, nextWidth) {
  const changes = [
    {
      property: "width",
      before: element.style.width,
      after: nextWidth
    }
  ];
  const currentHeightInline = element.style.height;
  const currentHeightComputed = computed.height.trim();
  if (currentHeightInline || currentHeightComputed && currentHeightComputed !== "auto") {
    changes.push({
      property: "height",
      before: currentHeightInline,
      after: "auto"
    });
  }
  return changes;
}
function buildFormulaScaleChanges(element, computed, direction) {
  const current = readPixelValue(computed.fontSize, 16);
  return [{
    property: "fontSize",
    before: element.style.fontSize,
    after: `${clamp(current + 2 * direction, 8, 120)}px`
  }];
}
function buildVideoScaleChanges(element, computed, direction) {
  const currentWidth = readPixelValue(element.style.width || computed.width, 0);
  const currentHeight = readPixelValue(element.style.height || computed.height, 0);
  const intrinsicWidth = typeof element.videoWidth === "number" ? element.videoWidth : 0;
  const intrinsicHeight = typeof element.videoHeight === "number" ? element.videoHeight : 0;
  if (currentWidth <= 0) {
    const nextWidth2 = stepSize(computed.width, direction);
    return buildMediaScaleChanges(element, computed, nextWidth2);
  }
  const nextWidth = clamp(currentWidth + 20 * direction, 20, 2e3);
  const ratio = intrinsicWidth > 0 && intrinsicHeight > 0 ? intrinsicHeight / intrinsicWidth : currentHeight > 0 ? currentHeight / currentWidth : 0;
  if (ratio <= 0) {
    const nextWidthFallback = stepSize(computed.width, direction);
    return buildMediaScaleChanges(element, computed, nextWidthFallback);
  }
  const nextHeight = clamp(roundTo(nextWidth * ratio, 2), 20, 2e3);
  return [
    {
      property: "width",
      before: element.style.width,
      after: `${nextWidth}px`
    },
    {
      property: "height",
      before: element.style.height,
      after: `${nextHeight}px`
    },
    {
      property: "minWidth",
      before: element.style.minWidth,
      after: "0px"
    },
    {
      property: "minHeight",
      before: element.style.minHeight,
      after: "0px"
    }
  ];
}
function stepSize(value, direction) {
  const trimmed = (value || "").toString().trim();
  const percentMatch = trimmed.match(/^(-?\\d+(?:\\.\\d+)?)%$/);
  if (percentMatch) {
    const current = Number(percentMatch[1]);
    const delta = 5 * direction;
    const next = clamp(current + delta, 10, 200);
    return `${next}%`;
  }
  const pxMatch = trimmed.match(/^(-?\\d+(?:\\.\\d+)?)px$/);
  if (pxMatch) {
    const current = Number(pxMatch[1]);
    const delta = 20 * direction;
    const next = clamp(current + delta, 20, 2e3);
    return `${next}px`;
  }
  const parsed = Number.parseFloat(trimmed);
  if (Number.isFinite(parsed)) {
    const next = clamp(parsed + 20 * direction, 20, 2e3);
    return `${next}px`;
  }
  return direction > 0 ? "320px" : "160px";
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function roundTo(value, digits) {
  const m = Math.pow(10, digits);
  return Math.round(value * m) / m;
}
function readPixelValue(value, fallback) {
  if (!value || value === "normal" || value === "auto") return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function readFontWeight(value) {
  if (value === "normal") return 400;
  if (value === "bold") return 700;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 400;
}
function readLineHeightRatio(computed) {
  const value = computed.lineHeight;
  if (value === "normal") return 1.5;
  const pxMatch = value.match(/^(-?\d+(?:\.\d+)?)px$/);
  if (pxMatch) {
    const lhPx = Number(pxMatch[1]);
    const fsPx = readPixelValue(computed.fontSize, 16);
    if (fsPx > 0) return lhPx / fsPx;
  }
  const parsed = Number.parseFloat(value);
  if (Number.isFinite(parsed) && !value.endsWith("px") && !value.endsWith("%")) {
    return parsed;
  }
  return 1.5;
}
function readLetterSpacingEm(computed) {
  const value = computed.letterSpacing;
  if (value === "normal") return 0;
  const pxMatch = value.match(/^(-?\d+(?:\.\d+)?)px$/);
  if (pxMatch) {
    const lsPx = Number(pxMatch[1]);
    const fsPx = readPixelValue(computed.fontSize, 16);
    if (fsPx > 0) return lsPx / fsPx;
  }
  const emMatch = value.match(/^(-?\d+(?:\.\d+)?)em$/);
  if (emMatch) return Number(emMatch[1]);
  return 0;
}

// src/export/html.ts
function ensureBaseTag(clone) {
  const baseEl = document.createElement("base");
  baseEl.href = window.location.href;
  let head = clone.querySelector("head");
  if (!head) {
    head = document.createElement("head");
    clone.insertBefore(head, clone.firstChild);
  }
  head.prepend(baseEl);
  if (!head.querySelector("meta[charset]")) {
    const metaCharset = document.createElement("meta");
    metaCharset.setAttribute("charset", "utf-8");
    head.prepend(metaCharset);
  }
}
function syncInlineStyles(sourceRoot, cloneRoot) {
  const sourceElements = [sourceRoot, ...Array.from(sourceRoot.querySelectorAll("*"))];
  const cloneElements = [cloneRoot, ...Array.from(cloneRoot.querySelectorAll("*"))];
  const length = Math.min(sourceElements.length, cloneElements.length);
  for (let index = 0; index < length; index += 1) {
    const source = sourceElements[index];
    const clone = cloneElements[index];
    const styleAttr = source.getAttribute("style");
    if (styleAttr === null) {
      clone.removeAttribute("style");
      continue;
    }
    clone.setAttribute("style", styleAttr);
  }
}
function exportHtmlSnapshot(logger) {
  try {
    const clone = document.documentElement.cloneNode(true);
    syncInlineStyles(document.documentElement, clone);
    const elementsToRemove = clone.querySelectorAll("[data-clickdeck='true'], #clickdeck-style, .clickdeck-panel, .clickdeck-outline");
    elementsToRemove.forEach((el) => el.remove());
    clone.classList.remove("clickdeck-presenting", "clickdeck-exporting");
    const body = clone.querySelector("body");
    if (body) {
      body.classList.remove("clickdeck-presenting", "clickdeck-exporting");
    }
    ensureBaseTag(clone);
    const htmlContent = clone.outerHTML;
    const doctype = document.doctype ? `<!DOCTYPE ${document.doctype.name}>` : "<!DOCTYPE html>";
    const comment = "\n<!-- Exported by ClickDeck Snapshot. Modifications applied to DOM are preserved. Original source files are not rewritten. -->\n";
    const fullHtml = `${doctype}${comment}${htmlContent}`;
    const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clickdeck-snapshot-${Date.now()}.html`;
    a.dataset.clickdeck = "true";
    a.click();
    URL.revokeObjectURL(url);
    logger.info(
      "HTML snapshot exported. Note: external images/fonts still rely on their original URLs. data: URL images are preserved."
    );
  } catch (error) {
    logger.error("Failed to export HTML snapshot", { error });
  }
}

// src/content/visual-units.ts
var nextUnitId = 1;
function collectVisualUnits(root = document.body) {
  const units = [];
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node2) => {
        if (node2.nodeType === Node.ELEMENT_NODE) {
          const element = node2;
          if (isClickDeckUiElement(element)) {
            return NodeFilter.FILTER_REJECT;
          }
          const style = window.getComputedStyle(element);
          if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
            return NodeFilter.FILTER_REJECT;
          }
        } else if (node2.nodeType === Node.TEXT_NODE) {
          if ((node2.textContent ?? "").trim().length === 0) {
            return NodeFilter.FILTER_SKIP;
          }
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node;
      const style = window.getComputedStyle(element);
      const tagName = element.tagName.toLowerCase();
      let kind;
      let textSnippet;
      if (tagName === "img" || tagName === "svg" || tagName === "canvas") {
        kind = "image";
      } else if (tagName === "video") {
        kind = "video";
      } else if (tagName === "button" || tagName === "a" || tagName === "input" || tagName === "select" || tagName === "textarea") {
        kind = "interactive";
        if (tagName === "input") {
          const type = (element.getAttribute("type") || "text").toLowerCase();
          const excludedTypes = ["hidden", "password", "file", "checkbox", "radio", "color", "button", "submit", "reset", "range"];
          if (!excludedTypes.includes(type)) {
            textSnippet = element.value;
          }
        } else if (tagName === "textarea") {
          textSnippet = element.value;
        } else if (tagName === "select") {
          const select = element;
          if (select.multiple) {
            const selectedOptions = Array.from(select.selectedOptions);
            if (selectedOptions.length > 0) {
              textSnippet = selectedOptions.map((opt) => opt.text || opt.value).join(", ");
            }
          } else {
            const selectedOption = select.options[select.selectedIndex];
            if (selectedOption) {
              textSnippet = selectedOption.text || selectedOption.value;
            } else {
              textSnippet = select.value;
            }
          }
        }
      } else if (style.backgroundImage !== "none" && !style.backgroundImage.startsWith("linear-gradient")) {
        kind = "background";
      } else if (tagName === "td" || tagName === "th") {
        kind = "textBlock";
        textSnippet = element.innerText || element.textContent || "";
        textSnippet = textSnippet.replace(/\s+/g, " ").trim();
      } else if (hasDirectTextContent(element)) {
        kind = "textBlock";
      } else {
        if (style.display === "block" || style.display === "flex" || style.display === "grid") {
          kind = "block";
        }
      }
      if (textSnippet) {
        textSnippet = textSnippet.trim();
        if (textSnippet.length > 80) {
          textSnippet = textSnippet.substring(0, 80) + "...";
        }
      }
      if (kind) {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          units.push({
            id: `vu-${nextUnitId++}`,
            kind,
            element,
            locator: createElementLocator(element),
            rect: toRectLike(rect),
            documentRect: toDocumentRect(rect),
            textSnippet: textSnippet && textSnippet.length > 0 ? textSnippet : void 0,
            confidence: "high"
          });
        }
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? "").trim();
      if (text.length > 0) {
        const parentElement = node.parentElement;
        if (parentElement) {
          const range = document.createRange();
          range.selectNodeContents(node);
          const rects = range.getClientRects();
          for (let i = 0; i < rects.length; i++) {
            const r = rects[i];
            if (r.width > 0 && r.height > 0) {
              units.push({
                id: `vu-textline-${nextUnitId++}`,
                kind: "textLine",
                element: parentElement,
                locator: createElementLocator(parentElement),
                rect: toRectLike(r),
                documentRect: toDocumentRect(r),
                textSnippet: text.substring(0, 80),
                confidence: "high"
              });
            }
          }
        }
      }
    }
    node = walker.nextNode();
  }
  return units;
}
function hasDirectTextContent(element) {
  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i];
    if (child.nodeType === Node.TEXT_NODE && (child.textContent ?? "").trim().length > 0) {
      return true;
    }
  }
  return false;
}
function toRectLike(rect) {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    bottom: rect.bottom
  };
}
function toDocumentRect(rect) {
  const scrollX = window.scrollX || document.documentElement.scrollLeft;
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  return {
    left: rect.left + scrollX,
    top: rect.top + scrollY,
    width: rect.width,
    height: rect.height,
    right: rect.right + scrollX,
    bottom: rect.bottom + scrollY
  };
}
function rectsOverlap(a, b) {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}
function calculateOverlap(a, b) {
  if (!rectsOverlap(a, b)) return { overlapArea: 0, overlapRatio: 0 };
  const overlapWidth = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const overlapHeight = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  const overlapArea = Math.max(0, overlapWidth) * Math.max(0, overlapHeight);
  const aArea = a.width * a.height;
  const overlapRatio = aArea > 0 ? overlapArea / aArea : 0;
  return { overlapArea, overlapRatio };
}
function isCenterInBox(rect, box) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return cx >= box.left && cx <= box.right && cy >= box.top && cy <= box.bottom;
}
function findVisualUnitsInBox(units, box) {
  const matches = [];
  for (const unit of units) {
    const { overlapArea, overlapRatio } = calculateOverlap(unit.rect, box);
    if (overlapArea > 0) {
      const centerInBox = isCenterInBox(unit.rect, box);
      const score = overlapRatio * overlapArea + (centerInBox ? 1e3 : 0);
      matches.push({
        unit,
        overlapRatio,
        overlapArea,
        centerInBox,
        score
      });
    }
  }
  return matches.sort((a, b) => b.score - a.score);
}

// src/content/intent-region.ts
var ANCHOR_OVERLAP_EPSILON = 10;
var nextRegionId = 1;
function toDocumentRect2(viewportBox, scrollX, scrollY) {
  const sx = scrollX ?? (typeof window !== "undefined" ? window.scrollX : 0);
  const sy = scrollY ?? (typeof window !== "undefined" ? window.scrollY : 0);
  return {
    left: viewportBox.left + sx,
    top: viewportBox.top + sy,
    width: viewportBox.width,
    height: viewportBox.height,
    right: viewportBox.right + sx,
    bottom: viewportBox.bottom + sy
  };
}
function toRelativeRect(box, anchorRect) {
  if (anchorRect.width === 0 || anchorRect.height === 0) {
    return { ...box };
  }
  const leftPct = (box.left - anchorRect.left) / anchorRect.width * 100;
  const topPct = (box.top - anchorRect.top) / anchorRect.height * 100;
  const widthPct = box.width / anchorRect.width * 100;
  const heightPct = box.height / anchorRect.height * 100;
  return {
    left: leftPct,
    top: topPct,
    width: widthPct,
    height: heightPct,
    right: leftPct + widthPct,
    bottom: topPct + heightPct
  };
}
function isVisibleAnchorCandidate(element) {
  if (element.hasAttribute("hidden")) return false;
  if (element.getAttribute("aria-hidden") === "true") return false;
  const style = window.getComputedStyle(element);
  if (style.display === "none") return false;
  if (style.visibility === "hidden") return false;
  if (parseFloat(style.opacity) < 0.01) return false;
  return true;
}
function getAnchorPriority(element) {
  if (element.classList.contains("active")) return 10;
  if (element.getAttribute("aria-current") === "true") return 10;
  if (element.getAttribute("data-active") === "true") return 10;
  return 0;
}
function detectPageMode(root = document.body) {
  if (typeof document === "undefined") return "unknown";
  const strongSlideElements = root.querySelectorAll('[aria-roledescription="slide"], .slide, [data-slide]');
  if (strongSlideElements.length > 0) {
    return "slide";
  }
  const sections = root.querySelectorAll("section");
  if (sections.length > 1) {
    let slideLikeSections = 0;
    const viewportHeight2 = window.innerHeight;
    const viewportWidth = window.innerWidth;
    for (let i = 0; i < sections.length; i++) {
      const rect = sections[i].getBoundingClientRect();
      if (rect.height >= viewportHeight2 * 0.8 && rect.width >= viewportWidth * 0.8) {
        slideLikeSections++;
      }
    }
    if (slideLikeSections > 1) {
      return "slide";
    }
  }
  const height = document.body.scrollHeight;
  const viewportHeight = window.innerHeight;
  if (height > viewportHeight * 1.5) {
    return "long";
  }
  return "unknown";
}
function findRegionAnchor(box, root = document.body) {
  const mode = detectPageMode(root);
  if (mode === "slide") {
    const slides = Array.from(root.querySelectorAll('[aria-roledescription="slide"], .slide, [data-slide]'));
    let bestSlide = null;
    let maxOverlap = 0;
    let bestPriority = -1;
    for (const slide of slides) {
      if (!isVisibleAnchorCandidate(slide)) continue;
      const rect = slide.getBoundingClientRect();
      const { overlapArea } = calculateOverlap(rect, box);
      const priority = getAnchorPriority(slide);
      if (overlapArea > 0) {
        const areaDiff = overlapArea - maxOverlap;
        if (areaDiff > ANCHOR_OVERLAP_EPSILON) {
          maxOverlap = overlapArea;
          bestPriority = priority;
          bestSlide = slide;
        } else if (Math.abs(areaDiff) <= ANCHOR_OVERLAP_EPSILON && priority > bestPriority) {
          maxOverlap = Math.max(maxOverlap, overlapArea);
          bestPriority = priority;
          bestSlide = slide;
        }
      }
    }
    if (bestSlide) {
      const rect = bestSlide.getBoundingClientRect();
      return {
        kind: "slide",
        locator: createElementLocator(bestSlide),
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          right: rect.right,
          bottom: rect.bottom
        },
        confidence: "high"
      };
    }
  }
  const containers = Array.from(root.querySelectorAll('section, article, main, [class*="container"], [class*="wrapper"]'));
  let bestContainer = null;
  let minArea = Infinity;
  for (const container of containers) {
    const rect = container.getBoundingClientRect();
    const { overlapArea } = calculateOverlap(rect, box);
    if (overlapArea > 0 && overlapArea / (box.width * box.height) > 0.8) {
      const area = rect.width * rect.height;
      if (area > 0 && area < minArea) {
        minArea = area;
        bestContainer = container;
      }
    }
  }
  if (bestContainer) {
    const rect = bestContainer.getBoundingClientRect();
    return {
      kind: bestContainer.tagName.toLowerCase() === "section" ? "section" : "container",
      locator: createElementLocator(bestContainer),
      rect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom
      },
      confidence: "medium"
    };
  }
  return {
    kind: "document",
    confidence: "low"
  };
}
function createIntentRegion(options) {
  const root = options.root ?? document.body;
  const pageMode = detectPageMode(root);
  const documentBox = toDocumentRect2(options.viewportBox);
  const anchor = findRegionAnchor(options.viewportBox, root);
  let relativeBox;
  if (anchor.rect) {
    relativeBox = toRelativeRect(options.viewportBox, anchor.rect);
  }
  return {
    id: `ir-${nextRegionId++}`,
    action: options.action,
    userIntent: options.userIntent,
    pageMode,
    viewportBox: options.viewportBox,
    documentBox,
    relativeBox,
    anchor,
    createdAt: Date.now(),
    isGhostPreview: options.isGhostPreview
  };
}
function getAnchorIdentity(anchor) {
  if (anchor.locator?.descriptor) {
    return `${anchor.kind}:${anchor.locator.descriptor}`;
  }
  if (anchor.kind === "document") {
    return "document";
  }
  return null;
}
function compareRegionAnchors(source, target) {
  const sourceId = getAnchorIdentity(source.anchor);
  const targetId = getAnchorIdentity(target.anchor);
  if (sourceId && targetId && sourceId === targetId) {
    return {
      shared: true,
      differentSection: false,
      confidence: source.anchor.confidence === "high" && target.anchor.confidence === "high" ? "high" : "medium"
    };
  }
  if (source.anchor.kind === target.anchor.kind && source.anchor.kind !== "document") {
    return {
      shared: false,
      differentSection: false,
      confidence: "medium"
    };
  }
  return {
    shared: false,
    differentSection: source.anchor.kind !== target.anchor.kind || Boolean(sourceId && targetId && sourceId !== targetId),
    confidence: "low"
  };
}

// src/content/css-facts.ts
var MEDIA_TAGS = /* @__PURE__ */ new Set(["img", "svg", "canvas", "video"]);
var TEXT_TAGS = /* @__PURE__ */ new Set(["p", "span", "a", "button", "label", "li", "td", "th", "h1", "h2", "h3", "h4", "h5", "h6"]);
var OVERLAY_HINT_PATTERN = /(^|[-_\s])(mask|mosaic|overlay|badge|tooltip|popover|modal|floating|absolute)([-_\s]|$)/i;
function addFact(facts, name, value) {
  const normalized = (value ?? "").trim();
  if (!normalized) return;
  facts.push(`${name}: ${normalized}`);
}
function addFactIfNot(facts, name, value, ignored) {
  const normalized = (value ?? "").trim();
  if (!normalized || ignored.includes(normalized)) return;
  addFact(facts, name, normalized);
}
function isIgnoredValue(value, ignored) {
  return ignored.includes(value);
}
function hasTextFeature(element) {
  const tagName = element.tagName.toLowerCase();
  return TEXT_TAGS.has(tagName) || (element.textContent ?? "").trim().length > 0;
}
function hasMediaFeature(element, style) {
  const tagName = element.tagName.toLowerCase();
  if (MEDIA_TAGS.has(tagName)) return true;
  const objectFit = style.getPropertyValue("object-fit").trim();
  const objectPosition = style.getPropertyValue("object-position").trim();
  return Boolean(
    objectFit && objectFit !== "fill" || objectPosition && objectPosition !== "50% 50%"
  );
}
function hasLayoutFeature(style) {
  const display = style.getPropertyValue("display").trim();
  const hasNonDefault = (name, ignored) => {
    const value = style.getPropertyValue(name).trim();
    return Boolean(value && !isIgnoredValue(value, ignored));
  };
  return display === "flex" || display === "grid" || hasNonDefault("gap", ["normal", "0px"]) || hasNonDefault("row-gap", ["normal", "0px"]) || hasNonDefault("column-gap", ["normal", "0px"]) || hasNonDefault("padding", ["0", "0px", "0px 0px", "0px 0px 0px", "0px 0px 0px 0px"]) || hasNonDefault("margin", ["0", "0px", "0px 0px", "0px 0px 0px", "0px 0px 0px 0px"]) || hasNonDefault("align-items", ["normal", "stretch"]) || hasNonDefault("justify-content", ["normal", "start", "flex-start"]);
}
function hasPositioningFeature(style) {
  const position = style.getPropertyValue("position").trim();
  const transform = style.getPropertyValue("transform").trim();
  const zIndex = style.getPropertyValue("z-index").trim();
  return Boolean(position && position !== "static") || Boolean(transform && transform !== "none") || Boolean(zIndex && zIndex !== "auto");
}
function hasOverlayHint(element, style) {
  const hintText = [element.className, element.id, element.getAttribute("role")].join(" ");
  if (OVERLAY_HINT_PATTERN.test(hintText)) return true;
  if (element.getAttribute("aria-hidden") === "true" && hasPositioningFeature(style)) return true;
  return false;
}
function getRectSize(element) {
  const rect = element.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);
  if (width <= 0 && height <= 0) return null;
  return `${width} x ${height}`;
}
function pickKind(element, style) {
  if (hasOverlayHint(element, style)) return "overlay";
  if (hasMediaFeature(element, style)) return "media";
  if (hasPositioningFeature(style)) return "positioned";
  if (hasTextFeature(element)) return "text";
  if (hasLayoutFeature(style)) return "layout";
  return "unknown";
}
function collectCssFacts(element) {
  const style = window.getComputedStyle(element);
  const facts = {
    kind: pickKind(element, style),
    base: [],
    text: [],
    media: [],
    layout: [],
    positioning: [],
    hints: []
  };
  addFact(facts.base, "tag", element.tagName.toLowerCase());
  addFact(facts.base, "display", style.getPropertyValue("display"));
  addFact(facts.base, "position", style.getPropertyValue("position"));
  addFact(facts.base, "visibility", style.getPropertyValue("visibility"));
  addFactIfNot(facts.base, "opacity", style.getPropertyValue("opacity"), ["1"]);
  addFactIfNot(facts.base, "transform", style.getPropertyValue("transform"), ["none"]);
  const rectSize = getRectSize(element);
  if (rectSize) addFact(facts.base, "rect-size", rectSize);
  if (hasTextFeature(element)) {
    addFactIfNot(facts.text, "font-size", style.getPropertyValue("font-size"), ["16px"]);
    addFactIfNot(facts.text, "font-weight", style.getPropertyValue("font-weight"), ["400", "normal"]);
    addFactIfNot(facts.text, "line-height", style.getPropertyValue("line-height"), ["normal"]);
    addFactIfNot(facts.text, "letter-spacing", style.getPropertyValue("letter-spacing"), ["normal", "0px"]);
    addFactIfNot(facts.text, "color", style.getPropertyValue("color"), ["rgb(0, 0, 0)"]);
    addFactIfNot(facts.text, "text-align", style.getPropertyValue("text-align"), ["start", "left"]);
  }
  if (hasMediaFeature(element, style)) {
    addFactIfNot(facts.media, "object-fit", style.getPropertyValue("object-fit"), ["fill"]);
    addFactIfNot(facts.media, "object-position", style.getPropertyValue("object-position"), ["50% 50%"]);
    addFactIfNot(facts.media, "aspect-ratio", style.getPropertyValue("aspect-ratio"), ["auto"]);
    addFactIfNot(facts.media, "border-radius", style.getPropertyValue("border-radius"), ["0px"]);
    const width = style.getPropertyValue("width").trim();
    const height = style.getPropertyValue("height").trim();
    if (width || height) addFact(facts.media, "css-size", `${width || "auto"} x ${height || "auto"}`);
  }
  if (hasLayoutFeature(style)) {
    addFactIfNot(facts.layout, "gap", style.getPropertyValue("gap"), ["normal", "0px"]);
    addFactIfNot(facts.layout, "row-gap", style.getPropertyValue("row-gap"), ["normal", "0px"]);
    addFactIfNot(facts.layout, "column-gap", style.getPropertyValue("column-gap"), ["normal", "0px"]);
    addFactIfNot(facts.layout, "padding", style.getPropertyValue("padding"), ["0", "0px", "0px 0px", "0px 0px 0px", "0px 0px 0px 0px"]);
    addFactIfNot(facts.layout, "margin", style.getPropertyValue("margin"), ["0", "0px", "0px 0px", "0px 0px 0px", "0px 0px 0px 0px"]);
    addFactIfNot(facts.layout, "align-items", style.getPropertyValue("align-items"), ["normal", "stretch"]);
    addFactIfNot(facts.layout, "justify-content", style.getPropertyValue("justify-content"), ["normal", "start", "flex-start"]);
  }
  if (hasPositioningFeature(style) || hasOverlayHint(element, style)) {
    addFactIfNot(facts.positioning, "top", style.getPropertyValue("top"), ["auto"]);
    addFactIfNot(facts.positioning, "right", style.getPropertyValue("right"), ["auto"]);
    addFactIfNot(facts.positioning, "bottom", style.getPropertyValue("bottom"), ["auto"]);
    addFactIfNot(facts.positioning, "left", style.getPropertyValue("left"), ["auto"]);
    addFactIfNot(facts.positioning, "inset", style.getPropertyValue("inset"), ["auto"]);
    addFactIfNot(facts.positioning, "z-index", style.getPropertyValue("z-index"), ["auto"]);
    addFactIfNot(facts.positioning, "transform", style.getPropertyValue("transform"), ["none"]);
  }
  const className = typeof element.className === "string" ? element.className.trim() : "";
  if (className && OVERLAY_HINT_PATTERN.test(className)) {
    addFact(facts.hints, "class-hint", className);
  }
  if (element.getAttribute("aria-hidden") === "true") {
    facts.hints.push("aria-hidden: true");
  }
  return facts;
}

// src/content/region-context.ts
function summarizeVisualUnit(unit) {
  if (unit.kind === "image") return "[Image]";
  if (unit.kind === "video") return "[Video]";
  if (unit.kind === "background") return "[Background Container]";
  if (unit.textSnippet) return unit.textSnippet.length > 50 ? unit.textSnippet.slice(0, 47) + "..." : unit.textSnippet;
  if (unit.roleHint) return `[${unit.roleHint}]`;
  return `[${unit.kind}]`;
}
function rankRegionCandidates(region, units) {
  const matches = findVisualUnitsInBox(units, region.viewportBox);
  const candidates = matches.map((match) => {
    let priorityScore = match.score;
    let reason = "Overlap";
    if (match.unit.kind === "textLine" || match.unit.kind === "image" || match.unit.kind === "video" || match.unit.kind === "interactive") {
      priorityScore += 1e4;
      reason = `Primary content (${match.unit.kind})`;
    } else if (match.unit.kind === "textBlock") {
      priorityScore += 5e3;
      reason = "Text container";
    } else {
      reason = "Container block";
    }
    return {
      unit: match.unit,
      reason,
      overlapRatio: match.overlapRatio,
      centerInBox: match.centerInBox,
      _rawScore: priorityScore
    };
  });
  candidates.sort((a, b) => b._rawScore - a._rawScore);
  return candidates.slice(0, 3).map((c, index) => {
    const { _rawScore, ...rest } = c;
    return { ...rest, rank: index + 1 };
  });
}
function getPriorityBonus(unit) {
  if (unit.kind === "textLine" || unit.kind === "image" || unit.kind === "video" || unit.kind === "interactive") return 20;
  if (unit.kind === "textBlock") return 10;
  return 0;
}
function findNearbyReferences(region, units, options) {
  const MAX_DISTANCE = typeof window !== "undefined" ? window.innerHeight * 0.8 : 500;
  const box = region.viewportBox;
  const boxCenterX = box.left + box.width / 2;
  const boxCenterY = box.top + box.height / 2;
  const aboves = [];
  const belows = [];
  const lefts = [];
  const rights = [];
  for (const unit of units) {
    if (unit.element.closest('[data-clickdeck="true"]')) continue;
    if (shouldExcludeUnit(unit, options)) continue;
    if (unit.kind === "background") continue;
    if (unit.kind === "block" && !unit.roleHint) continue;
    const u = unit.rect;
    const uCenterX = u.left + u.width / 2;
    const uCenterY = u.top + u.height / 2;
    const distYAbove = box.top - u.bottom;
    const distYBelow = u.top - box.bottom;
    const distXLeft = box.left - u.right;
    const distXRight = u.left - box.right;
    const verticallyAligned = Math.abs(uCenterX - boxCenterX) < Math.max(box.width, u.width) / 1.5;
    const horizontallyAligned = Math.abs(uCenterY - boxCenterY) < Math.max(box.height, u.height) / 1.5;
    if (verticallyAligned) {
      if (distYAbove >= 0 && distYAbove < MAX_DISTANCE) {
        aboves.push({ score: distYAbove - getPriorityBonus(unit), actualDist: distYAbove, unit });
      } else if (distYBelow >= 0 && distYBelow < MAX_DISTANCE) {
        belows.push({ score: distYBelow - getPriorityBonus(unit), actualDist: distYBelow, unit });
      }
    }
    if (horizontallyAligned) {
      if (distXLeft >= 0 && distXLeft < MAX_DISTANCE) {
        lefts.push({ score: distXLeft - getPriorityBonus(unit), actualDist: distXLeft, unit });
      } else if (distXRight >= 0 && distXRight < MAX_DISTANCE) {
        rights.push({ score: distXRight - getPriorityBonus(unit), actualDist: distXRight, unit });
      }
    }
  }
  const sortFn = (a, b) => a.score - b.score;
  aboves.sort(sortFn);
  belows.sort(sortFn);
  lefts.sort(sortFn);
  rights.sort(sortFn);
  const results = [];
  const addReferences = (direction, list) => {
    let count = 0;
    const seen = /* @__PURE__ */ new Set();
    for (const item of list) {
      if (count >= 2) break;
      const summary = summarizeVisualUnit(item.unit);
      if (seen.has(summary)) continue;
      seen.add(summary);
      let layoutSemantic = "";
      if (direction === "above") layoutSemantic = "place Target B below this reference / preserve vertical spacing";
      else if (direction === "below") layoutSemantic = "place Target B above this reference / preserve vertical spacing";
      else if (direction === "left") layoutSemantic = "use it as horizontal context / preserve offset";
      else if (direction === "right") layoutSemantic = "avoid overlap / preserve offset";
      results.push({
        direction,
        distance: Math.max(0, item.actualDist),
        unit: item.unit,
        summary,
        layoutSemantic
      });
      count++;
    }
  };
  addReferences("above", aboves);
  addReferences("below", belows);
  addReferences("left", lefts);
  addReferences("right", rights);
  return results;
}
function getConfidence(deltaPx) {
  if (deltaPx <= 4) return "high";
  if (deltaPx <= 8) return "medium";
  if (deltaPx <= 16) return "low";
  return "none";
}
function calculateAlignmentHints(box, anchorRect, units, options) {
  const hints = [];
  const boxCenterX = box.left + box.width / 2;
  const boxCenterY = box.top + box.height / 2;
  const pushHint = (summary, deltaPx, relationKind, referencePriority) => {
    let confidence = "none";
    if (relationKind === "spacing") {
      if (deltaPx <= 4) confidence = "high";
      else if (deltaPx <= 24) confidence = "medium";
      else if (deltaPx <= 32) confidence = "low";
    } else {
      confidence = getConfidence(deltaPx);
    }
    if (confidence !== "none") {
      hints.push({ summary, deltaPx, confidence, relationKind, referencePriority });
    }
  };
  if (anchorRect && anchorRect.width > 0) {
    const anchorCenterX = anchorRect.left + anchorRect.width / 2;
    const anchorCenterY = anchorRect.top + anchorRect.height / 2;
    pushHint(`Left edge aligns with anchor left edge`, Math.abs(box.left - anchorRect.left), "edge", 0);
    pushHint(`Right edge aligns with anchor right edge`, Math.abs(box.right - anchorRect.right), "edge", 0);
    pushHint(`Top edge aligns with anchor top edge`, Math.abs(box.top - anchorRect.top), "edge", 0);
    pushHint(`Bottom edge aligns with anchor bottom edge`, Math.abs(box.bottom - anchorRect.bottom), "edge", 0);
    pushHint(`Center X is close to anchor center X`, Math.abs(boxCenterX - anchorCenterX), "center", 0);
    pushHint(`Center Y is close to anchor center Y`, Math.abs(boxCenterY - anchorCenterY), "center", 0);
  }
  for (const unit of units) {
    if (unit.element.closest('[data-clickdeck="true"]')) continue;
    if (unit.kind === "background" || unit.kind === "block") continue;
    const textSnippet = unit.textSnippet?.trim();
    if (options?.excludeTextSnippets && textSnippet && options.excludeTextSnippets.includes(textSnippet)) {
      continue;
    }
    const u = unit.rect;
    if (u.width === 0 || u.height === 0) continue;
    const uCenterX = u.left + u.width / 2;
    const uCenterY = u.top + u.height / 2;
    const label = summarizeVisualUnit(unit);
    const overlapX = Math.max(0, Math.min(box.right, u.right) - Math.max(box.left, u.left));
    const overlapY = Math.max(0, Math.min(box.bottom, u.bottom) - Math.max(box.top, u.top));
    const isOverlapping = overlapX > 0 && overlapY > 0;
    const horizontallyAligned = Math.abs(uCenterX - boxCenterX) < Math.max(box.width, u.width) / 1.5;
    const verticallyAligned = Math.abs(uCenterY - boxCenterY) < Math.max(box.height, u.height) / 1.5;
    let isNearby = isOverlapping;
    if (!isNearby && horizontallyAligned) {
      const distY = Math.min(Math.abs(box.top - u.bottom), Math.abs(box.bottom - u.top));
      if (distY <= 100) isNearby = true;
    }
    if (!isNearby && verticallyAligned) {
      const distX = Math.min(Math.abs(box.left - u.right), Math.abs(box.right - u.left));
      if (distX <= 100) isNearby = true;
    }
    const priority = isNearby ? 1 : 2;
    pushHint(`Left edge aligns with ${label} left edge`, Math.abs(box.left - u.left), "edge", priority);
    pushHint(`Right edge aligns with ${label} right edge`, Math.abs(box.right - u.right), "edge", priority);
    pushHint(`Center X is close to ${label} center X`, Math.abs(boxCenterX - uCenterX), "center", priority);
    pushHint(`Top edge aligns with ${label} top edge`, Math.abs(box.top - u.top), "edge", priority);
    pushHint(`Bottom edge aligns with ${label} bottom edge`, Math.abs(box.bottom - u.bottom), "edge", priority);
    pushHint(`Center Y is close to ${label} center Y`, Math.abs(boxCenterY - uCenterY), "center", priority);
    if (horizontallyAligned) {
      if (box.top >= u.bottom) {
        pushHint(`Top edge is ${Math.round(box.top - u.bottom)}px below ${label} bottom edge`, box.top - u.bottom, "spacing", priority);
      }
      if (box.bottom <= u.top) {
        pushHint(`Bottom edge is ${Math.round(u.top - box.bottom)}px above ${label} top edge`, u.top - box.bottom, "spacing", priority);
      }
    }
  }
  const score = (h) => {
    const typeScore = h.relationKind === "edge" ? 0 : h.relationKind === "spacing" ? 100 : 200;
    const refScore = h.referencePriority === 0 ? 0 : h.referencePriority === 1 ? 100 : 400;
    const confScore = h.confidence === "high" ? 0 : h.confidence === "medium" ? 150 : 1e3;
    return confScore + refScore + typeScore + h.deltaPx * 0.1;
  };
  hints.sort((a, b) => score(a) - score(b));
  const seen = /* @__PURE__ */ new Set();
  const topHints = [];
  let centerCount = 0;
  for (const h of hints) {
    if (seen.has(h.summary)) continue;
    if (h.relationKind === "center") {
      if (centerCount >= 1) continue;
      centerCount++;
    }
    seen.add(h.summary);
    topHints.push({
      summary: h.summary,
      deltaPx: h.deltaPx,
      confidence: h.confidence
    });
    if (topHints.length >= 4) break;
  }
  return topHints;
}
function shouldExcludeUnit(unit, options) {
  if (options?.excludeUnitIds?.includes(unit.id)) {
    return true;
  }
  if (options?.excludeElements?.some((element) => element === unit.element)) {
    return true;
  }
  const textSnippet = unit.textSnippet?.trim();
  return Boolean(textSnippet && options?.excludeTextSnippets?.includes(textSnippet));
}
function buildRegionContext(region, units, options) {
  const candidates = rankRegionCandidates(region, units);
  const empty = candidates.length === 0;
  const nearby = findNearbyReferences(region, units, options);
  let confidence = "low";
  if (!empty && region.anchor.confidence === "high") {
    confidence = "high";
  } else if (!empty) {
    confidence = "medium";
  } else if (empty && nearby.length > 0) {
    confidence = "medium";
  }
  const alignmentHints = region.action === "move" ? calculateAlignmentHints(region.viewportBox, region.anchor.rect, units, options) : void 0;
  return {
    region,
    candidates,
    nearby,
    alignmentHints,
    activeAlignmentGuides: options?.activeAlignmentGuides,
    empty,
    confidence
  };
}

// src/export/intent-prompt.ts
function isZh(language) {
  return language === "zh";
}
function t(language, en, zh) {
  return isZh(language) ? zh : en;
}
function formatRect(rect) {
  return `l:${Math.round(rect.left)} t:${Math.round(rect.top)} w:${Math.round(rect.width)} h:${Math.round(rect.height)}`;
}
function formatAnchor(context) {
  const kind = context.region.anchor.kind;
  const locator = context.region.anchor.locator;
  return locator?.descriptor ? `${kind} (${locator.descriptor})` : kind;
}
function formatBox(context) {
  const { region } = context;
  if (region.relativeBox) {
    return `${formatRect(region.relativeBox)} relative to anchor, placement hint only`;
  }
  return `${formatRect(region.viewportBox)} viewport px, placement hint only`;
}
function formatCandidate(candidate) {
  const summary = summarizeVisualUnit(candidate.unit);
  const details = [
    `rank ${candidate.rank}`,
    candidate.reason,
    `overlap ${Math.round(candidate.overlapRatio * 100)}%`,
    candidate.centerInBox ? "center in box" : "partial overlap"
  ];
  return `${summary} (${details.join("; ")})`;
}
function formatDirection(direction, language) {
  if (!isZh(language)) return direction;
  if (direction === "above") return "\u4E0A\u65B9";
  if (direction === "below") return "\u4E0B\u65B9";
  if (direction === "left") return "\u5DE6\u4FA7";
  return "\u53F3\u4FA7";
}
function translateSemantic(text, language) {
  if (!isZh(language)) return text;
  return text.replace("place Target B below this reference / preserve vertical spacing", "\u5C06 Target B \u653E\u5728\u8BE5\u53C2\u8003\u9879\u4E0B\u65B9 / \u4FDD\u6301\u5782\u76F4\u95F4\u8DDD").replace("place Target B above this reference / preserve vertical spacing", "\u5C06 Target B \u653E\u5728\u8BE5\u53C2\u8003\u9879\u4E0A\u65B9 / \u4FDD\u6301\u5782\u76F4\u95F4\u8DDD").replace("use it as horizontal context / preserve offset", "\u5C06\u5176\u4F5C\u4E3A\u6A2A\u5411\u53C2\u8003 / \u4FDD\u6301\u76F8\u5BF9\u504F\u79FB").replace("avoid overlap / preserve offset", "\u907F\u514D\u91CD\u53E0 / \u4FDD\u6301\u76F8\u5BF9\u504F\u79FB");
}
function appendContextBlock(lines, label, context, indent = "", language = "en") {
  lines.push(`${indent}${label}:`);
  lines.push(`${indent}- ${t(language, "Page mode", "\u9875\u9762\u6A21\u5F0F")}: ${context.region.pageMode}`);
  lines.push(`${indent}- ${t(language, "Anchor", "\u951A\u70B9")}: ${formatAnchor(context)}`);
  lines.push(`${indent}- ${t(language, "Visual box", "\u89C6\u89C9\u6846")}: ${formatBox(context)}`);
  lines.push(`${indent}- ${t(language, "Region confidence", "\u533A\u57DF\u7F6E\u4FE1\u5EA6")}: ${context.confidence}`);
}
function appendRegionContents(lines, context, indent = "", isTargetB = false, language = "en") {
  lines.push(`${indent}${t(language, "Region contents", "\u533A\u57DF\u5185\u5BB9")}:`);
  if (context.empty) {
    lines.push(`${indent}- ${t(language, "Empty visual area; use it as intended placement area, not as an existing element.", "\u5F53\u524D\u662F\u7A7A\u767D\u89C6\u89C9\u533A\u57DF\uFF1B\u5E94\u5C06\u5176\u89C6\u4E3A\u9884\u671F\u653E\u7F6E\u533A\u57DF\uFF0C\u800C\u4E0D\u662F\u5DF2\u5B58\u5728\u5143\u7D20\u3002")}`);
    return;
  }
  if (isTargetB && context.candidates.length > 0) {
    const allLowOverlapBlocks = context.candidates.every((c) => c.unit.kind === "block" && c.overlapRatio < 0.1);
    if (allLowOverlapBlocks) {
      lines.push(`${indent}- ${t(language, "Mostly empty/structural area; use nearby references and alignment hints as placement context.", "\u8FD9\u91CC\u4E3B\u8981\u662F\u7A7A\u767D\u6216\u7ED3\u6784\u6027\u533A\u57DF\uFF1B\u8BF7\u4F7F\u7528\u8FD1\u90BB\u53C2\u8003\u548C\u5BF9\u9F50\u63D0\u793A\u4F5C\u4E3A\u653E\u7F6E\u4F9D\u636E\u3002")}`);
      return;
    }
  }
  context.candidates.slice(0, 3).forEach((candidate) => {
    lines.push(`${indent}- ${formatCandidate(candidate)}`);
  });
}
function appendNearbyReferences(lines, context, indent = "", label = "Nearby references", language = "en") {
  lines.push(`${indent}${label}:`);
  if (context.nearby.length === 0) {
    lines.push(`${indent}- ${t(language, "None found.", "\u672A\u627E\u5230\u3002")}`);
    return;
  }
  context.nearby.slice(0, 8).forEach((nearby) => {
    let text = isZh(language) ? `${indent}- ${formatDirection(nearby.direction, language)}: ${nearby.summary}\uFF0C\u8DDD\u79BB ${Math.round(nearby.distance)}px` : `${indent}- ${formatDirection(nearby.direction, language)}: ${nearby.summary}, ${Math.round(nearby.distance)}px away`;
    if (nearby.layoutSemantic) {
      text += `; ${translateSemantic(nearby.layoutSemantic, language)}.`;
    }
    lines.push(text);
  });
}
function hasMultipleSiblingCandidates(context) {
  if (context.candidates.length < 2) return false;
  const parents = /* @__PURE__ */ new Map();
  context.candidates.forEach((candidate) => {
    const parent = candidate.unit.element.parentElement;
    if (!parent) return;
    parents.set(parent, (parents.get(parent) ?? 0) + 1);
  });
  return Array.from(parents.values()).some((count) => count >= 2);
}
function appendSourceImplementationHint(lines, context, language) {
  if (!hasMultipleSiblingCandidates(context)) return;
  lines.push(t(language, "Source implementation hint:", "Source A \u5B9E\u73B0\u63D0\u793A:"));
  lines.push(t(language, "- Source A contains multiple sibling items; prefer moving their shared row/wrapper container when that preserves the selected visual group.", "- Source A \u5305\u542B\u591A\u4E2A\u540C\u7EA7\u9879\uFF1B\u5982\u679C\u80FD\u4FDD\u7559\u5F53\u524D\u89C6\u89C9\u5206\u7EC4\uFF0C\u5E94\u4F18\u5148\u79FB\u52A8\u5B83\u4EEC\u5171\u4EAB\u7684\u6574\u884C\u6216\u5916\u5C42\u5BB9\u5668\u3002"));
  lines.push(t(language, "- Exclude nearby labels/headings outside Source A's visual box, even when they share a parent container.", "- \u5373\u4F7F\u4E0E Source A \u5171\u7528\u7236\u5BB9\u5668\uFF0C\u4E5F\u4E0D\u8981\u628A\u89C6\u89C9\u6846\u5916\u7684\u90BB\u8FD1\u6807\u7B7E\u6216\u6807\u9898\u4E00\u8D77\u7EB3\u5165\u79FB\u52A8\u8303\u56F4\u3002"));
  lines.push("");
}
function describePrimaryObject(context, language) {
  const candidate = context.candidates[0];
  if (!candidate) {
    return t(language, "No strong primary object detected; treat Source A as the selected visual group only.", "\u672A\u68C0\u6D4B\u5230\u5F3A\u4E3B\u5BF9\u8C61\uFF1B\u5C06 Source A \u89C6\u4E3A\u5F53\u524D\u9009\u4E2D\u7684\u6574\u4F53\u89C6\u89C9\u5206\u7EC4\u3002");
  }
  const summary = summarizeVisualUnit(candidate.unit);
  const kind = candidate.unit.kind;
  if (kind === "image") {
    return t(language, `Most likely primary object: image block ${summary}.`, `\u6700\u53EF\u80FD\u7684\u4E3B\u5BF9\u8C61\uFF1A\u56FE\u7247\u5757 ${summary}\u3002`);
  }
  if (kind === "video") {
    return t(language, `Most likely primary object: video block ${summary}.`, `\u6700\u53EF\u80FD\u7684\u4E3B\u5BF9\u8C61\uFF1A\u89C6\u9891\u5757 ${summary}\u3002`);
  }
  if (kind === "interactive") {
    return t(language, `Most likely primary object: interactive control ${summary}.`, `\u6700\u53EF\u80FD\u7684\u4E3B\u5BF9\u8C61\uFF1A\u4EA4\u4E92\u63A7\u4EF6 ${summary}\u3002`);
  }
  if (kind === "textLine" || kind === "textBlock") {
    return t(language, `Most likely primary object: text content ${summary}.`, `\u6700\u53EF\u80FD\u7684\u4E3B\u5BF9\u8C61\uFF1A\u6587\u672C\u5185\u5BB9 ${summary}\u3002`);
  }
  return t(language, `Most likely primary object: visual block ${summary}.`, `\u6700\u53EF\u80FD\u7684\u4E3B\u5BF9\u8C61\uFF1A\u89C6\u89C9\u5757 ${summary}\u3002`);
}
function appendSourceSemanticSummary(lines, context, language) {
  lines.push(t(language, "Source A summary:", "Source A \u6458\u8981:"));
  lines.push(t(language, "- Source A is the selected visual content group inside the drawn Source A box.", "- Source A \u662F Source A \u89C6\u89C9\u6846\u5185\u88AB\u9009\u4E2D\u7684\u6574\u4F53\u5185\u5BB9\u7EC4\u3002"));
  lines.push(`- ${describePrimaryObject(context, language)}`);
  if (hasMultipleSiblingCandidates(context)) {
    lines.push(t(language, "- Group wrapper hint: if multiple sibling items are selected together, prefer moving their shared wrapper/container instead of splitting them into separate span-level edits.", "- \u5171\u540C\u5916\u5C42\u63D0\u793A\uFF1A\u5982\u679C\u540C\u65F6\u9009\u4E2D\u4E86\u591A\u4E2A\u540C\u7EA7\u9879\uFF0C\u5E94\u4F18\u5148\u79FB\u52A8\u5B83\u4EEC\u5171\u4EAB\u7684 wrapper / container\uFF0C\u800C\u4E0D\u662F\u62C6\u6210\u591A\u4E2A span \u7EA7\u522B\u7684\u5C0F\u6539\u52A8\u3002"));
  } else {
    lines.push(t(language, "- Group wrapper hint: no stronger shared wrapper signal was detected beyond the selected visual group.", "- \u5171\u540C\u5916\u5C42\u63D0\u793A\uFF1A\u9664\u5F53\u524D\u9009\u4E2D\u7684\u89C6\u89C9\u5206\u7EC4\u5916\uFF0C\u6682\u672A\u68C0\u6D4B\u5230\u66F4\u5F3A\u7684\u5171\u4EAB wrapper \u4FE1\u53F7\u3002"));
  }
  lines.push(t(language, "- Surrounding context: nearby headings, labels, and parent-container text outside Source A's visual box are reference only unless they overlap Source A or the user explicitly says to move them together.", "- \u5468\u8FB9\u4E0A\u4E0B\u6587\uFF1ASource A \u89C6\u89C9\u6846\u5916\u7684\u90BB\u8FD1\u6807\u9898\u3001\u6807\u7B7E\u548C\u7236\u5BB9\u5668\u6587\u672C\u9ED8\u8BA4\u53EA\u662F\u53C2\u8003\uFF0C\u9664\u975E\u5B83\u4EEC\u4E0E Source A \u91CD\u53E0\uFF0C\u6216\u7528\u6237\u660E\u786E\u8981\u6C42\u4E00\u8D77\u79FB\u52A8\u3002"));
  lines.push("");
}
function appendTargetSemanticSummary(lines, context, language) {
  lines.push(t(language, "Target B summary:", "Target B \u6458\u8981:"));
  if (context.empty) {
    lines.push(t(language, "- Target B is an empty placement area / destination guide, not an existing content target.", "- Target B \u662F\u7A7A\u767D\u653E\u7F6E\u533A\u57DF / \u843D\u70B9\u53C2\u8003\uFF0C\u4E0D\u662F\u5DF2\u6709\u5185\u5BB9\u76EE\u6807\u3002"));
    lines.push(t(language, "- Existing content handling: none detected inside Target B; do not infer replacement from this empty area.", "- \u73B0\u6709\u5185\u5BB9\u5904\u7406\uFF1ATarget B \u5185\u672A\u68C0\u6D4B\u5230\u73B0\u6709\u5185\u5BB9\uFF0C\u4E0D\u8981\u628A\u8FD9\u5757\u7A7A\u767D\u533A\u57DF\u7406\u89E3\u4E3A\u66FF\u6362\u5BF9\u8C61\u3002"));
    lines.push("");
    return;
  }
  const primary = context.candidates[0];
  const summary = primary ? summarizeVisualUnit(primary.unit) : t(language, "existing content", "\u73B0\u6709\u5185\u5BB9");
  lines.push(t(language, `- Target B is a destination guide that currently overlaps or sits near existing content such as ${summary}.`, `- Target B \u662F\u4E00\u4E2A\u843D\u70B9\u53C2\u8003\u533A\u57DF\uFF0C\u76EE\u524D\u4E0E ${summary} \u7B49\u73B0\u6709\u5185\u5BB9\u76F8\u90BB\u6216\u53D1\u751F\u8986\u76D6\u3002`));
  lines.push(t(language, `- Existing content handling: treat ${summary} as visual context first, not as a replacement target by default.`, `- \u73B0\u6709\u5185\u5BB9\u5904\u7406\uFF1A\u5E94\u5148\u5C06 ${summary} \u89C6\u4E3A\u89C6\u89C9\u4E0A\u4E0B\u6587\uFF0C\u9ED8\u8BA4\u4E0D\u8981\u628A\u5B83\u5F53\u6210\u66FF\u6362\u76EE\u6807\u3002`));
  lines.push(t(language, `- Potential blocking content: if ${summary} would physically block the moved result, resolve that overlap locally; otherwise keep it as surrounding context.`, `- \u53EF\u80FD\u7684\u963B\u6321\u5185\u5BB9\uFF1A\u5982\u679C ${summary} \u4F1A\u7269\u7406\u963B\u6321\u79FB\u52A8\u7ED3\u679C\uFF0C\u518D\u5C40\u90E8\u5904\u7406\u91CD\u53E0\uFF1B\u5426\u5219\u5E94\u7EE7\u7EED\u628A\u5B83\u89C6\u4E3A\u5468\u8FB9\u4E0A\u4E0B\u6587\u3002`));
  lines.push("");
}
function formatOffsetAmount(value, unit) {
  const rounded = Math.round(Math.abs(value));
  return `about ${rounded}${unit}`;
}
function appendPlacementOffset(lines, sourceContext, targetContext, language) {
  const sourceBox = sourceContext.region.relativeBox;
  const targetBox = targetContext.region.relativeBox;
  const useRelative = Boolean(sourceBox && targetBox);
  const sBox = sourceBox ?? sourceContext.region.viewportBox;
  const tBox = targetBox ?? targetContext.region.viewportBox;
  const unit = useRelative ? "%" : "px";
  const leftDelta = tBox.left - sBox.left;
  const topDelta = tBox.top - sBox.top;
  const leftThreshold = useRelative ? 1 : Math.max(4, sBox.width * 0.05);
  const topThreshold = useRelative ? 1 : Math.max(4, sBox.height * 0.05);
  const details = [];
  if (Math.abs(leftDelta) >= leftThreshold) {
    const direction = leftDelta > 0 ? "to the right of" : "to the left of";
    details.push(isZh(language) ? `- Target B \u5DE6\u8FB9\u754C\u4F4D\u4E8E Source A \u5DE6\u8FB9\u754C${leftDelta > 0 ? "\u53F3\u4FA7" : "\u5DE6\u4FA7"}\uFF0C\u504F\u79FB\u7EA6 ${Math.round(Math.abs(leftDelta))}${unit}\u3002` : `- Target B left edge is ${formatOffsetAmount(leftDelta, unit)} ${direction} Source A left edge.`);
  }
  if (Math.abs(topDelta) >= topThreshold) {
    const direction = topDelta > 0 ? "below" : "above";
    details.push(isZh(language) ? `- Target B \u4E0A\u8FB9\u754C\u4F4D\u4E8E Source A \u4E0A\u8FB9\u754C${topDelta > 0 ? "\u4E0B\u65B9" : "\u4E0A\u65B9"}\uFF0C\u504F\u79FB\u7EA6 ${Math.round(Math.abs(topDelta))}${unit}\u3002` : `- Target B top edge is ${formatOffsetAmount(topDelta, unit)} ${direction} Source A top edge.`);
  }
  if (details.length === 0) return;
  lines.push(t(language, "Placement offset:", "\u653E\u7F6E\u504F\u79FB:"));
  details.forEach((line) => lines.push(line));
  lines.push("");
}
function quoteReference(summary) {
  return summary.startsWith("[") ? summary : `"${summary}"`;
}
function pickReference(context, direction) {
  const references = context.nearby.filter((ref) => ref.direction === direction);
  return references.find((ref) => !ref.summary.startsWith("[")) ?? references[0];
}
function getProximity(distance) {
  if (distance <= 16) return "adjacent";
  if (distance <= 64) return "close";
  return "nearby context";
}
function formatAxisGap(distance, axis) {
  const rounded = Math.round(distance);
  return `with about ${rounded}px ${axis === "X" ? "horizontal" : "vertical"} gap`;
}
function formatXConstraint(reference) {
  const proximity = getProximity(reference.distance);
  const side = reference.direction === "left" ? "right" : "left";
  const overlapText = reference.direction === "left" ? "while preserving adjacency" : "while avoiding overlap";
  if (proximity === "adjacent") {
    return `- X axis: place Source A immediately to the ${side} of ${quoteReference(reference.summary)}, ${formatAxisGap(reference.distance, "X")}.`;
  }
  if (proximity === "close") {
    return `- X axis: place Source A close to the ${side} of ${quoteReference(reference.summary)}, ${formatAxisGap(reference.distance, "X")}.`;
  }
  return `- X axis: keep Source A to the ${side} of ${quoteReference(reference.summary)} as nearby context, ${formatAxisGap(reference.distance, "X")}, ${overlapText}.`;
}
function formatYConstraint(reference) {
  const proximity = getProximity(reference.distance);
  const side = reference.direction === "below" ? "above" : "below";
  if (proximity === "adjacent") {
    return `- Y axis: place Source A immediately ${side} ${quoteReference(reference.summary)}, ${formatAxisGap(reference.distance, "Y")}.`;
  }
  if (proximity === "close") {
    return `- Y axis: keep Source A close ${side} ${quoteReference(reference.summary)}, ${formatAxisGap(reference.distance, "Y")}.`;
  }
  return `- Y axis: keep Source A ${side} ${quoteReference(reference.summary)} as nearby context, ${formatAxisGap(reference.distance, "Y")}.`;
}
function formatGuideConstraint(axis, guide) {
  return `- ${axis} axis: use recorded guide, Target B ${formatAlignmentEdge(guide.targetEdge)} aligns with ${quoteReference(guide.unitSummary)} ${formatAlignmentEdge(guide.sourceEdge)}.`;
}
function formatXConstraintLocalized(reference, language) {
  if (!isZh(language)) return formatXConstraint(reference);
  const side = reference.direction === "left" ? "\u53F3\u4FA7" : "\u5DE6\u4FA7";
  const proximity = getProximity(reference.distance);
  if (proximity === "adjacent") {
    return `- X \u8F74\uFF1A\u5C06 Source A \u7D27\u8D34\u653E\u5728 ${quoteReference(reference.summary)} \u7684${side}\uFF0C\u7EA6\u4FDD\u6301 ${Math.round(reference.distance)}px \u6A2A\u5411\u95F4\u8DDD\u3002`;
  }
  if (proximity === "close") {
    return `- X \u8F74\uFF1A\u5C06 Source A \u653E\u5728 ${quoteReference(reference.summary)} \u7684${side}\u9644\u8FD1\uFF0C\u7EA6\u4FDD\u6301 ${Math.round(reference.distance)}px \u6A2A\u5411\u95F4\u8DDD\u3002`;
  }
  return `- X \u8F74\uFF1A\u4EE5 ${quoteReference(reference.summary)} \u4F5C\u4E3A\u6A2A\u5411\u90BB\u8FD1\u53C2\u8003\uFF0C\u5C06 Source A \u4FDD\u6301\u5728\u5176${side}\uFF0C\u7EA6\u4FDD\u6301 ${Math.round(reference.distance)}px \u6A2A\u5411\u95F4\u8DDD\u3002`;
}
function formatYConstraintLocalized(reference, language) {
  if (!isZh(language)) return formatYConstraint(reference);
  const side = reference.direction === "below" ? "\u4E0A\u65B9" : "\u4E0B\u65B9";
  const proximity = getProximity(reference.distance);
  if (proximity === "adjacent") {
    return `- Y \u8F74\uFF1A\u5C06 Source A \u7D27\u8D34\u653E\u5728 ${quoteReference(reference.summary)} \u7684${side}\uFF0C\u7EA6\u4FDD\u6301 ${Math.round(reference.distance)}px \u7EB5\u5411\u95F4\u8DDD\u3002`;
  }
  if (proximity === "close") {
    return `- Y \u8F74\uFF1A\u5C06 Source A \u4FDD\u6301\u5728 ${quoteReference(reference.summary)} \u7684${side}\u9644\u8FD1\uFF0C\u7EA6\u4FDD\u6301 ${Math.round(reference.distance)}px \u7EB5\u5411\u95F4\u8DDD\u3002`;
  }
  return `- Y \u8F74\uFF1A\u4EE5 ${quoteReference(reference.summary)} \u4F5C\u4E3A\u7EB5\u5411\u90BB\u8FD1\u53C2\u8003\uFF0C\u5C06 Source A \u4FDD\u6301\u5728\u5176${side}\uFF0C\u7EA6\u4FDD\u6301 ${Math.round(reference.distance)}px \u7EB5\u5411\u95F4\u8DDD\u3002`;
}
function formatGuideConstraintLocalized(axis, guide, language) {
  if (!isZh(language)) return formatGuideConstraint(axis, guide);
  return `- ${axis} \u8F74\uFF1A\u4F7F\u7528\u5DF2\u8BB0\u5F55\u53C2\u8003\u7EBF\uFF0CTarget B \u7684${formatAlignmentEdge(guide.targetEdge)}\u4E0E ${quoteReference(guide.unitSummary)} \u7684${formatAlignmentEdge(guide.sourceEdge)}\u5BF9\u9F50\u3002`;
}
function getAnchorCenterHint(targetContext, axis) {
  const hints = targetContext.alignmentHints ?? [];
  const needle = axis === "x" ? "Center X is close to anchor center X" : "Center Y is close to anchor center Y";
  const hint = hints.find((candidate) => candidate.summary.includes(needle));
  if (!hint) return null;
  return { confidence: hint.confidence };
}
function getPlacementOffsetConstraint(sourceContext, targetContext, axis, language) {
  const useRelative = Boolean(sourceContext.region.relativeBox && targetContext.region.relativeBox);
  const sourceBox = sourceContext.region.relativeBox ?? sourceContext.region.viewportBox;
  const targetBox = targetContext.region.relativeBox ?? targetContext.region.viewportBox;
  const unit = useRelative ? "%" : "px";
  if (axis === "x") {
    const delta2 = targetBox.left - sourceBox.left;
    const direction2 = delta2 >= 0 ? isZh(language) ? "\u53F3\u4FA7" : "to the right of" : isZh(language) ? "\u5DE6\u4FA7" : "to the left of";
    return {
      axis,
      confidence: "low",
      relationType: "gap",
      source: "placement-offset",
      text: isZh(language) ? `- X \u8F74\uFF1A\u5C06 Source A \u4FDD\u6301\u5728 Source A \u5DE6\u8FB9\u754C${direction2}\uFF0C\u504F\u79FB\u7EA6 ${Math.round(Math.abs(delta2))}${unit}\u3002` : `- X axis: use placement offset; Target B left edge is about ${Math.round(Math.abs(delta2))}${unit} ${direction2} Source A left edge.`
    };
  }
  const delta = targetBox.top - sourceBox.top;
  const direction = delta >= 0 ? isZh(language) ? "\u4E0B\u65B9" : "below" : isZh(language) ? "\u4E0A\u65B9" : "above";
  return {
    axis,
    confidence: "low",
    relationType: "gap",
    source: "placement-offset",
    text: isZh(language) ? `- Y \u8F74\uFF1A\u5C06 Source A \u4FDD\u6301\u5728 Source A \u4E0A\u8FB9\u754C${direction}\uFF0C\u504F\u79FB\u7EA6 ${Math.round(Math.abs(delta))}${unit}\u3002` : `- Y axis: use placement offset; Target B top edge is about ${Math.round(Math.abs(delta))}${unit} ${direction} Source A top edge.`
  };
}
function resolveAxisConstraint(sourceContext, targetContext, axis, language) {
  const guides = targetContext.activeAlignmentGuides ?? [];
  const guide = guides.find((candidate) => candidate.axis === axis);
  if (guide) {
    const isCenter = guide.targetEdge === "centerX" || guide.targetEdge === "centerY";
    return {
      axis,
      confidence: "high",
      relationType: isCenter ? "centered" : "align",
      source: "active-guide",
      text: formatGuideConstraintLocalized(axis === "x" ? "X" : "Y", guide, language)
    };
  }
  if (axis === "x") {
    const left = pickReference(targetContext, "left");
    const right = pickReference(targetContext, "right");
    const reference = left ?? right;
    if (reference) {
      return {
        axis,
        confidence: "medium",
        relationType: reference.distance <= 16 ? "adjacent" : "gap",
        source: "nearby",
        text: formatXConstraintLocalized(reference, language)
      };
    }
  } else {
    const below = pickReference(targetContext, "below");
    const above = pickReference(targetContext, "above");
    const reference = below ?? above;
    if (reference) {
      return {
        axis,
        confidence: "medium",
        relationType: reference.distance <= 16 ? "adjacent" : "gap",
        source: "nearby",
        text: formatYConstraintLocalized(reference, language)
      };
    }
  }
  const anchorCenter = getAnchorCenterHint(targetContext, axis);
  if (anchorCenter) {
    return {
      axis,
      confidence: anchorCenter.confidence,
      relationType: "centered",
      source: "anchor-center",
      text: axis === "x" ? t(language, "- X axis: center Source A within the shared anchor/container.", "- X \u8F74\uFF1A\u5C06 Source A \u5728\u5171\u4EAB anchor / \u5BB9\u5668\u5185\u6C34\u5E73\u5C45\u4E2D\u3002") : t(language, "- Y axis: center Source A within the shared anchor/container.", "- Y \u8F74\uFF1A\u5C06 Source A \u5728\u5171\u4EAB anchor / \u5BB9\u5668\u5185\u5782\u76F4\u5C45\u4E2D\u3002")
    };
  }
  return getPlacementOffsetConstraint(sourceContext, targetContext, axis, language);
}
function appendPrimaryAxisConstraints(lines, sourceContext, targetContext, language) {
  const xConstraint = resolveAxisConstraint(sourceContext, targetContext, "x", language);
  const yConstraint = resolveAxisConstraint(sourceContext, targetContext, "y", language);
  lines.push(t(language, "Primary axis constraints:", "\u4E3B\u8F74\u7EA6\u675F:"));
  lines.push(xConstraint.text);
  lines.push(yConstraint.text);
  lines.push("");
  return [xConstraint, yConstraint];
}
function appendSecondaryReferences(lines, targetContext, primary, language) {
  const guides = targetContext.activeAlignmentGuides ?? [];
  const primaryGuideAxes = new Set(primary.filter((constraint) => constraint.source === "active-guide").map((constraint) => constraint.axis));
  const secondaryGuideLines = guides.filter((guide) => !primaryGuideAxes.has(guide.axis)).slice(0, 2).map((guide) => isZh(language) ? `- Target B \u7684${formatAlignmentEdge(guide.targetEdge)}\u4E0E ${quoteReference(guide.unitSummary)} \u7684${formatAlignmentEdge(guide.sourceEdge)}\u5BF9\u9F50\uFF08delta: ${Math.round(guide.deltaPx)}px\uFF0Cconfidence: ${guide.confidence}\uFF09\u3002` : `- Target B ${formatAlignmentEdge(guide.targetEdge)} aligns with ${quoteReference(guide.unitSummary)} ${formatAlignmentEdge(guide.sourceEdge)} (delta: ${Math.round(guide.deltaPx)}px, confidence: ${guide.confidence}).`);
  const nearbyLines = targetContext.nearby.filter((reference) => {
    if ((reference.direction === "left" || reference.direction === "right") && primary.some((constraint) => constraint.axis === "x" && constraint.source === "nearby")) {
      return false;
    }
    if ((reference.direction === "above" || reference.direction === "below") && primary.some((constraint) => constraint.axis === "y" && constraint.source === "nearby")) {
      return false;
    }
    return true;
  }).slice(0, 2).map((reference) => isZh(language) ? `- ${formatDirection(reference.direction, language)}\uFF1A${reference.summary}\uFF0C\u8DDD\u79BB ${Math.round(reference.distance)}px\uFF08confidence: medium\uFF09\u3002` : `- ${reference.direction}: ${reference.summary}, ${Math.round(reference.distance)}px away (confidence: medium).`);
  if (secondaryGuideLines.length === 0 && nearbyLines.length === 0) {
    lines.push(t(language, "Secondary references:", "\u6B21\u7EA7\u53C2\u8003:"));
    lines.push(t(language, "- None beyond the primary constraints.", "- \u9664\u4E3B\u7EA6\u675F\u5916\u6CA1\u6709\u989D\u5916\u6B21\u7EA7\u53C2\u8003\u3002"));
    lines.push("");
    return;
  }
  lines.push(t(language, "Secondary references:", "\u6B21\u7EA7\u53C2\u8003:"));
  secondaryGuideLines.forEach((line) => lines.push(line));
  nearbyLines.forEach((line) => lines.push(line));
  lines.push("");
}
function detectRelationTypes(sourceContext, targetContext, constraints, language) {
  const types = /* @__PURE__ */ new Set();
  constraints.forEach((constraint) => types.add(constraint.relationType));
  if (compareRegionAnchors(sourceContext.region, targetContext.region).shared) {
    types.add("inside");
  }
  const ordered = ["align", "gap", "adjacent", "inside", "centered"].filter((type) => types.has(type));
  return isZh(language) ? ordered.join("\u3001") : ordered.join(", ");
}
function appendAnchorAndCoordinateModel(lines, sourceContext, targetContext, language) {
  const relation = compareRegionAnchors(sourceContext.region, targetContext.region);
  lines.push(t(language, "Anchor and coordinate model:", "Anchor \u4E0E\u5750\u6807\u7CFB:"));
  if (relation.shared) {
    lines.push(t(language, `- Source A and Target B share the same ${sourceContext.region.anchor.kind} anchor. Use this shared anchor coordinate system as the primary placement frame.`, `- Source A \u4E0E Target B \u5171\u4EAB\u540C\u4E00\u4E2A ${sourceContext.region.anchor.kind} anchor\uFF0C\u5E94\u4F18\u5148\u4F7F\u7528\u8FD9\u4E2A\u5171\u4EAB\u5750\u6807\u7CFB\u5224\u65AD\u4F4D\u7F6E\u3002`));
  } else {
    lines.push(t(language, "- Target B appears in a different anchor/section.", "- Target B \u770B\u8D77\u6765\u4F4D\u4E8E\u4E0D\u540C\u7684 anchor / section \u4E2D\u3002"));
    lines.push(t(language, `- Treat placement across anchors as lower confidence. Source anchor: ${formatAnchor(sourceContext)}. Target anchor: ${formatAnchor(targetContext)}.`, `- \u8DE8 anchor \u7684\u653E\u7F6E\u5173\u7CFB\u5E94\u964D\u4F4E\u7F6E\u4FE1\u5EA6\u3002Source anchor\uFF1A${formatAnchor(sourceContext)}\uFF1BTarget anchor\uFF1A${formatAnchor(targetContext)}\u3002`));
  }
  if (targetContext.region.relativeBox) {
    lines.push(t(language, `- Relative box: ${formatRect(targetContext.region.relativeBox)} relative to target anchor.`, `- \u76F8\u5BF9\u6846\uFF1A${formatRect(targetContext.region.relativeBox)}\uFF08\u76F8\u5BF9\u4E8E Target anchor\uFF09\u3002`));
  }
  lines.push(t(language, `- Viewport box fallback: ${formatRect(targetContext.region.viewportBox)}.`, `- \u89C6\u53E3\u5750\u6807\u56DE\u9000\uFF1A${formatRect(targetContext.region.viewportBox)}\u3002`));
  if (targetContext.region.documentBox) {
    lines.push(t(language, `- Document box fallback: ${formatRect(targetContext.region.documentBox)}.`, `- \u6587\u6863\u5750\u6807\u56DE\u9000\uFF1A${formatRect(targetContext.region.documentBox)}\u3002`));
  }
  lines.push("");
}
function appendConfidenceNotes(lines, sourceContext, targetContext, primary, language) {
  const relation = compareRegionAnchors(sourceContext.region, targetContext.region);
  lines.push(t(language, "Confidence notes:", "\u7F6E\u4FE1\u5EA6\u8BF4\u660E:"));
  primary.forEach((constraint) => {
    lines.push(isZh(language) ? `- ${constraint.axis.toUpperCase()} \u8F74\u4E3B\u7EA6\u675F\uFF1A${constraint.confidence}\uFF08\u6765\u6E90\uFF1A${constraint.source}\uFF09\u3002` : `- ${constraint.axis.toUpperCase()} axis primary constraint: ${constraint.confidence} confidence (source: ${constraint.source}).`);
  });
  lines.push(relation.shared ? t(language, `- Anchor relation: ${relation.confidence} confidence shared anchor.`, `- Anchor \u5173\u7CFB\uFF1A\u5171\u4EAB anchor\uFF0C\u7F6E\u4FE1\u5EA6 ${relation.confidence}\u3002`) : t(language, `- Anchor relation: ${relation.confidence} confidence because Source A and Target B use different anchors/sections.`, `- Anchor \u5173\u7CFB\uFF1ASource A \u4E0E Target B \u4F7F\u7528\u4E0D\u540C anchor / section\uFF0C\u56E0\u6B64\u7F6E\u4FE1\u5EA6\u4E3A ${relation.confidence}\u3002`));
  lines.push("");
}
function formatAlignmentEdge(edge) {
  if (edge === "centerX") return "center X";
  if (edge === "centerY") return "center Y";
  return `${edge} edge`;
}
function formatActiveGuide(guide, language) {
  if (isZh(language)) {
    return `- Target B \u7684${formatAlignmentEdge(guide.targetEdge)}\u4E0E "${guide.unitSummary}" \u7684${formatAlignmentEdge(guide.sourceEdge)}\u5BF9\u9F50\uFF08delta: ${Math.round(guide.deltaPx)}px\uFF09\u3002`;
  }
  return `- Target B ${formatAlignmentEdge(guide.targetEdge)} aligns with "${guide.unitSummary}" ${formatAlignmentEdge(guide.sourceEdge)} (delta: ${Math.round(guide.deltaPx)}px).`;
}
function compactFactGroup(label, facts) {
  const values = facts[label];
  if (!Array.isArray(values) || values.length === 0) return null;
  return `${label}: ${values.slice(0, 5).join("; ")}`;
}
function collectPrimaryCssFacts(context) {
  if (context.empty || context.candidates.length === 0) return [];
  const element = context.candidates[0].unit.element;
  if (!element) return [];
  try {
    const facts = collectCssFacts(element);
    const lines = [`kind: ${facts.kind}`];
    ["base", "text", "media", "layout", "positioning", "hints"].forEach((group) => {
      const line = compactFactGroup(group, facts);
      if (line) lines.push(line);
    });
    return lines.slice(0, 8);
  } catch {
    return [];
  }
}
function appendCssFacts(lines, context, indent = "", language = "en") {
  const facts = collectPrimaryCssFacts(context);
  lines.push(`${indent}${t(language, "CSS facts", "CSS \u4E8B\u5B9E")}:`);
  if (facts.length === 0) {
    lines.push(`${indent}- ${t(language, "Not available; use DOM structure and surrounding visual context.", "\u4E0D\u53EF\u7528\uFF1B\u8BF7\u7ED3\u5408 DOM \u7ED3\u6784\u548C\u5468\u56F4\u89C6\u89C9\u4E0A\u4E0B\u6587\u5224\u65AD\u3002")}`);
    return;
  }
  facts.forEach((fact) => lines.push(`${indent}- ${fact}`));
}
function getMoveNote(input) {
  const sourceNote = input.sourceContext.region.userIntent.trim();
  const targetNote = input.targetContext?.region.userIntent.trim() ?? "";
  return sourceNote || targetNote;
}
function contextHasImage(context) {
  return context.candidates.some((candidate) => candidate.unit.kind === "image");
}
function appendIntentOperation(lines, input, opId, skipExpectedResult = false) {
  const { sourceContext } = input;
  const userNote = sourceContext.region.userIntent || "[not provided]";
  const language = input.__promptLanguage ?? "en";
  lines.push(`${opId} | ${t(language, "type", "\u7C7B\u578B")}: ${t(language, "intent", "\u610F\u56FE")}`);
  lines.push(`${t(language, "User note", "\u7528\u6237\u8BF4\u660E")}: "${userNote}"`);
  appendContextBlock(lines, t(language, "Target", "\u76EE\u6807\u533A\u57DF"), sourceContext, "", language);
  appendRegionContents(lines, sourceContext, "", false, language);
  appendNearbyReferences(lines, sourceContext, "", t(language, "Nearby references", "\u8FD1\u90BB\u53C2\u8003"), language);
  appendCssFacts(lines, sourceContext, "", language);
  if (!skipExpectedResult) {
    lines.push(t(language, "Expected result:", "\u9884\u671F\u7ED3\u679C:"));
    lines.push(t(language, "- Implement the user note only inside the selected region and directly related local layout.", "- \u53EA\u5728\u6240\u9009\u533A\u57DF\u53CA\u5176\u76F4\u63A5\u76F8\u5173\u7684\u5C40\u90E8\u5E03\u5C40\u5185\u843D\u5B9E\u8FD9\u6761\u7528\u6237\u8BF4\u660E\u3002"));
    lines.push(t(language, "- Infer whether the note means add, delete, replace, restyle, or a small local rearrangement from the wording.", "- \u6839\u636E\u63AA\u8F9E\u5224\u65AD\u8FD9\u6761\u8BF4\u660E\u662F\u65B0\u589E\u3001\u5220\u9664\u3001\u66FF\u6362\u3001\u91CD\u8BBE\u6837\u5F0F\uFF0C\u8FD8\u662F\u5C40\u90E8\u5C0F\u8303\u56F4\u91CD\u6392\u3002"));
    lines.push(t(language, "- If the selected region is empty, use it as the intended placement area for new content.", "- \u5982\u679C\u6240\u9009\u533A\u57DF\u4E3A\u7A7A\u767D\uFF0C\u5E94\u5C06\u5176\u89C6\u4E3A\u65B0\u5185\u5BB9\u7684\u9884\u671F\u653E\u7F6E\u533A\u57DF\u3002"));
  }
  lines.push("");
  return contextHasImage(sourceContext);
}
function appendMoveOperation(lines, input, opId, skipExpectedResult = false) {
  const { sourceContext, targetContext } = input;
  if (!targetContext) return false;
  const moveNote = getMoveNote(input);
  const language = input.__promptLanguage ?? "en";
  lines.push(`${opId} | ${t(language, "type", "\u7C7B\u578B")}: ${t(language, "move", "\u79FB\u52A8")}`);
  lines.push(`${t(language, "Move note", "\u79FB\u52A8\u8BF4\u660E")}: ${moveNote ? `"${moveNote}"` : "[not provided]"}`);
  appendContextBlock(lines, t(language, "Source A", "Source A"), sourceContext, "", language);
  appendRegionContents(lines, sourceContext, "", false, language);
  appendCssFacts(lines, sourceContext, "", language);
  appendSourceSemanticSummary(lines, sourceContext, language);
  appendSourceImplementationHint(lines, sourceContext, language);
  lines.push(t(language, "Placement summary:", "\u653E\u7F6E\u6458\u8981:"));
  lines.push(t(language, "- Treat Source A as the selected visual content group inside Source A's visual box, not as individual child spans or text fragments.", "- \u5C06 Source A \u89C6\u4E3A\u89C6\u89C9\u6846\u5185\u88AB\u9009\u4E2D\u7684\u6574\u4F53\u5185\u5BB9\u7EC4\uFF0C\u800C\u4E0D\u662F\u82E5\u5E72\u72EC\u7ACB\u5B50 span \u6216\u96F6\u6563\u6587\u672C\u7247\u6BB5\u3002"));
  lines.push(t(language, "- Do not include nearby labels, headings, or parent-container text unless they overlap Source A or are explicitly listed in Source A Region contents.", "- \u4E0D\u8981\u628A Source A \u89C6\u89C9\u6846\u5916\u7684\u90BB\u8FD1\u6807\u7B7E\u3001\u6807\u9898\u6216\u7236\u5BB9\u5668\u6587\u672C\u7EB3\u5165\u79FB\u52A8\u8303\u56F4\uFF0C\u9664\u975E\u5B83\u4EEC\u4E0E Source A \u53D1\u751F\u91CD\u53E0\uFF0C\u6216\u5DF2\u660E\u786E\u5217\u5728 Source A \u7684\u533A\u57DF\u5185\u5BB9\u4E2D\u3002"));
  const sBox = sourceContext.region.viewportBox;
  const tBox = targetContext.region.viewportBox;
  const sCenterX = sBox.left + sBox.width / 2;
  const sCenterY = sBox.top + sBox.height / 2;
  const tCenterX = tBox.left + tBox.width / 2;
  const tCenterY = tBox.top + tBox.height / 2;
  let horizontalWord = "";
  if (tCenterX > sCenterX + sBox.width * 0.1) horizontalWord = "shifted to the right of";
  else if (tCenterX < sCenterX - sBox.width * 0.1) horizontalWord = "shifted to the left of";
  let verticalWord = "";
  if (tCenterY < sCenterY - sBox.height * 0.1) verticalWord = "above";
  else if (tCenterY > sCenterY + sBox.height * 0.1) verticalWord = "below";
  if (horizontalWord && verticalWord) {
    lines.push(isZh(language) ? `- Target B \u4F4D\u4E8E Source A \u7684${verticalWord === "above" ? "\u4E0A\u65B9" : "\u4E0B\u65B9"}\uFF0C\u5E76\u4E14\u76F8\u5BF9${horizontalWord.includes("right") ? "\u53F3\u79FB" : "\u5DE6\u79FB"}\u3002` : `- Target B is ${verticalWord} and ${horizontalWord} Source A.`);
  } else if (horizontalWord) {
    lines.push(isZh(language) ? `- Target B \u76F8\u5BF9 Source A ${horizontalWord.includes("right") ? "\u5411\u53F3\u504F\u79FB" : "\u5411\u5DE6\u504F\u79FB"}\u3002` : `- Target B is ${horizontalWord} Source A.`);
  } else if (verticalWord) {
    lines.push(isZh(language) ? `- Target B \u4F4D\u4E8E Source A \u7684${verticalWord === "above" ? "\u4E0A\u65B9" : "\u4E0B\u65B9"}\u3002` : `- Target B is ${verticalWord} Source A.`);
  } else {
    lines.push(t(language, `- Target B is roughly at the same position as Source A.`, `- Target B \u4E0E Source A \u7684\u4F4D\u7F6E\u5927\u81F4\u76F8\u540C\u3002`));
  }
  lines.push("");
  appendPlacementOffset(lines, sourceContext, targetContext, language);
  appendAnchorAndCoordinateModel(lines, sourceContext, targetContext, language);
  const primaryConstraints = appendPrimaryAxisConstraints(lines, sourceContext, targetContext, language);
  lines.push(`${t(language, "Relation types", "\u5173\u7CFB\u7C7B\u578B")}: ${detectRelationTypes(sourceContext, targetContext, primaryConstraints, language)}`);
  lines.push("");
  appendSecondaryReferences(lines, targetContext, primaryConstraints, language);
  appendConfidenceNotes(lines, sourceContext, targetContext, primaryConstraints, language);
  appendContextBlock(lines, t(language, "Target B", "Target B"), targetContext, "", language);
  appendTargetSemanticSummary(lines, targetContext, language);
  lines.push(t(language, "Target B placement reference:", "Target B \u653E\u7F6E\u53C2\u8003:"));
  if (targetContext.region.isGhostPreview) {
    lines.push(t(language, "- Target B source: dragged target box.", "- Target B \u6765\u6E90\uFF1A\u62D6\u62FD\u5F97\u5230\u7684\u76EE\u6807\u6846\u3002"));
  }
  lines.push(t(language, "- Target B is the destination guide for placement and alignment, not replacement content.", "- Target B \u662F\u653E\u7F6E\u548C\u5BF9\u9F50\u53C2\u8003\uFF0C\u4E0D\u4EE3\u8868\u8981\u66FF\u6362\u8FD9\u91CC\u539F\u6709\u5185\u5BB9\u3002"));
  lines.push(t(language, "- Existing content inside Target B is visual context unless it physically blocks the move.", "- \u9664\u975E\u73B0\u6709\u5185\u5BB9\u4F1A\u7269\u7406\u963B\u6321\u79FB\u52A8\u7ED3\u679C\uFF0C\u5426\u5219\u5E94\u5C06\u5176\u89C6\u4E3A\u89C6\u89C9\u4E0A\u4E0B\u6587\u3002"));
  appendRegionContents(lines, targetContext, "", true, language);
  appendNearbyReferences(lines, targetContext, "", t(language, "Placement references", "\u653E\u7F6E\u53C2\u8003"), language);
  lines.push("");
  lines.push(t(language, "Final alignment guide:", "\u6700\u7EC8\u5BF9\u9F50\u53C2\u8003:"));
  if (targetContext.activeAlignmentGuides && targetContext.activeAlignmentGuides.length > 0) {
    targetContext.activeAlignmentGuides.forEach((guide) => {
      lines.push(formatActiveGuide(guide, language));
    });
  } else if (targetContext.alignmentHints && targetContext.alignmentHints.length > 0) {
    const highHints = targetContext.alignmentHints.filter((h) => h.confidence === "high");
    if (highHints.length === 0) {
      lines.push(t(language, "- None active at drop; use Placement references and Target B visual box.", "- \u677E\u624B\u65F6\u6CA1\u6709\u6FC0\u6D3B\u53C2\u8003\u7EBF\uFF1B\u8BF7\u6539\u7528\u653E\u7F6E\u53C2\u8003\u548C Target B \u89C6\u89C9\u6846\u5224\u65AD\u3002"));
    } else {
      highHints.forEach((hint) => {
        lines.push(isZh(language) ? `- \u677E\u624B\u65F6\u6CA1\u6709\u8BB0\u5F55\u5230\u6FC0\u6D3B\u53C2\u8003\u7EBF\uFF1B\u6539\u7528\u9AD8\u7F6E\u4FE1\u5EA6\u56DE\u9000\u53C2\u8003\uFF1A${hint.summary}\uFF08delta: ${Math.round(hint.deltaPx)}px\uFF0Cconfidence: ${hint.confidence}\uFF09\u3002` : `- No recorded active guide at drop; calculated high-confidence fallback: ${hint.summary} (delta: ${Math.round(hint.deltaPx)}px, confidence: ${hint.confidence}).`);
      });
    }
  } else {
    lines.push(t(language, "- None active at drop; use Placement references and Target B visual box.", "- \u677E\u624B\u65F6\u6CA1\u6709\u6FC0\u6D3B\u53C2\u8003\u7EBF\uFF1B\u8BF7\u6539\u7528\u653E\u7F6E\u53C2\u8003\u548C Target B \u89C6\u89C9\u6846\u5224\u65AD\u3002"));
  }
  appendCssFacts(lines, targetContext, "", language);
  if (!skipExpectedResult) {
    lines.push(t(language, "Expected result:", "\u9884\u671F\u7ED3\u679C:"));
    lines.push(t(language, "- Move Source A content toward Target B using DOM structure, local container, current layout, nearby references, and CSS facts.", "- \u7ED3\u5408 DOM \u7ED3\u6784\u3001\u5C40\u90E8\u5BB9\u5668\u3001\u5F53\u524D\u5E03\u5C40\u3001\u8FD1\u90BB\u53C2\u8003\u548C CSS \u4E8B\u5B9E\uFF0C\u5C06 Source A \u79FB\u52A8\u5230 Target B\u3002"));
    lines.push(t(language, "- Without a move note, infer conservatively from Source A, Target B, visual boxes, region contents, nearby references, and CSS facts.", "- \u5982\u679C\u6CA1\u6709\u79FB\u52A8\u8BF4\u660E\uFF0C\u5E94\u57FA\u4E8E Source A\u3001Target B\u3001\u89C6\u89C9\u6846\u3001\u533A\u57DF\u5185\u5BB9\u3001\u8FD1\u90BB\u53C2\u8003\u548C CSS \u4E8B\u5B9E\u505A\u4FDD\u5B88\u63A8\u65AD\u3002"));
    lines.push(t(language, "- Treat Source A as the selected visual content group inside Source A's visual box and Target B as its desired final visual placement.", "- \u5C06 Source A \u89C6\u4E3A Source A \u89C6\u89C9\u6846\u5185\u7684\u6574\u4F53\u5185\u5BB9\u7EC4\uFF0C\u5E76\u5C06 Target B \u89C6\u4E3A\u5176\u9884\u671F\u7684\u6700\u7EC8\u89C6\u89C9\u843D\u70B9\u3002"));
    lines.push(t(language, "- Do not recreate or preserve ClickDeck editing UI such as selection boxes, target boxes, dashed outlines, badges, or marker labels.", "- \u4E0D\u8981\u91CD\u5EFA\u6216\u4FDD\u7559 ClickDeck \u7684\u7F16\u8F91 UI\uFF0C\u4F8B\u5982\u9009\u62E9\u6846\u3001\u76EE\u6807\u6846\u3001\u865A\u7EBF\u8F6E\u5ED3\u3001\u5FBD\u6807\u6216\u6807\u8BB0\u6807\u7B7E\u3002"));
    lines.push(t(language, "- Implement the move through the page's existing layout flow first: parent alignment, flex/grid placement, margin, max-width, gap, order, or a local wrapper.", "- \u4F18\u5148\u901A\u8FC7\u9875\u9762\u73B0\u6709\u5E03\u5C40\u6D41\u5B9E\u73B0\u79FB\u52A8\uFF0C\u4F8B\u5982\u7236\u7EA7\u5BF9\u9F50\u3001flex/grid \u6392\u5E03\u3001margin\u3001max-width\u3001gap\u3001order \u6216\u5C40\u90E8 wrapper\u3002"));
    lines.push(t(language, "- Preserve source content, approximate size, proportions, visual hierarchy, and style unless local fit requires minor spacing adjustments.", "- \u9664\u975E\u5C40\u90E8\u9002\u914D\u786E\u5B9E\u9700\u8981\u5C0F\u5E45\u95F4\u8DDD\u8C03\u6574\uFF0C\u5426\u5219\u5E94\u4FDD\u7559\u6E90\u5185\u5BB9\u3001\u5927\u81F4\u5C3A\u5BF8\u3001\u6BD4\u4F8B\u3001\u89C6\u89C9\u5C42\u7EA7\u548C\u6837\u5F0F\u3002"));
    lines.push(t(language, "- Preserve obvious alignment relationships such as edge alignment, centering, relative offset, and spacing rhythm.", "- \u4FDD\u7559\u660E\u663E\u7684\u5BF9\u9F50\u5173\u7CFB\uFF0C\u4F8B\u5982\u8FB9\u7F18\u5BF9\u9F50\u3001\u5C45\u4E2D\u3001\u76F8\u5BF9\u504F\u79FB\u548C\u95F4\u8DDD\u8282\u594F\u3002"));
    lines.push(t(language, "- Do not hard-code viewport coordinates as CSS top/left unless the original layout is already explicitly absolute-positioned and that is the smallest safe change.", "- \u9664\u975E\u539F\u5E03\u5C40\u672C\u6765\u5C31\u662F\u660E\u786E\u7684 absolute \u5B9A\u4F4D\uFF0C\u4E14\u8FD9\u662F\u6700\u5C0F\u5B89\u5168\u6539\u52A8\uFF0C\u5426\u5219\u4E0D\u8981\u628A\u89C6\u53E3\u5750\u6807\u786C\u7F16\u7801\u6210 CSS top/left\u3002"));
  }
  lines.push("");
  return contextHasImage(sourceContext) || contextHasImage(targetContext);
}
function appendRemoveOperation(lines, input, opId, skipExpectedResult = false) {
  const { sourceContext } = input;
  const userNote = sourceContext.region.userIntent.trim();
  const language = input.__promptLanguage ?? "en";
  lines.push(`${opId} | ${t(language, "type", "\u7C7B\u578B")}: ${t(language, "remove", "\u5220\u9664")}`);
  lines.push(`${t(language, "Remove note", "\u5220\u9664\u8BF4\u660E")}: ${userNote ? `"${userNote}"` : "[not provided]"}`);
  appendContextBlock(lines, t(language, "Target", "\u76EE\u6807\u533A\u57DF"), sourceContext, "", language);
  appendRegionContents(lines, sourceContext, "", false, language);
  appendNearbyReferences(lines, sourceContext, "", t(language, "Nearby references", "\u8FD1\u90BB\u53C2\u8003"), language);
  appendCssFacts(lines, sourceContext, "", language);
  if (!skipExpectedResult) {
    lines.push(t(language, "Expected result:", "\u9884\u671F\u7ED3\u679C:"));
    lines.push(t(language, "- Remove the selected region from the source HTML/CSS, or hide it only if that matches the existing implementation style.", "- \u4ECE\u6E90 HTML/CSS \u4E2D\u79FB\u9664\u6240\u9009\u533A\u57DF\uFF1B\u53EA\u6709\u5F53\u8FD9\u66F4\u7B26\u5408\u539F\u5B9E\u73B0\u98CE\u683C\u65F6\uFF0C\u624D\u4F7F\u7528\u9690\u85CF\u800C\u975E\u5220\u9664\u3002"));
    lines.push(t(language, "- Preserve surrounding layout where possible.", "- \u5728\u53EF\u80FD\u7684\u60C5\u51B5\u4E0B\u4FDD\u7559\u5468\u56F4\u5E03\u5C40\u3002"));
    lines.push(t(language, "- If removal leaves an obvious gap, adjust only local spacing/layout.", "- \u5982\u679C\u5220\u9664\u540E\u7559\u4E0B\u660E\u663E\u7A7A\u9699\uFF0C\u53EA\u8C03\u6574\u5C40\u90E8\u95F4\u8DDD\u6216\u5E03\u5C40\u3002"));
    lines.push(t(language, "- Avoid unintended layout shifts outside the selected region and directly related surrounding layout.", "- \u907F\u514D\u5728\u6240\u9009\u533A\u57DF\u53CA\u5176\u76F4\u63A5\u76F8\u5173\u5468\u8FB9\u4E4B\u5916\u5F15\u5165\u975E\u9884\u671F\u5E03\u5C40\u504F\u79FB\u3002"));
    lines.push(t(language, "- Do not redesign unrelated sections, slides, scripts, or behavior.", "- \u4E0D\u8981\u91CD\u505A\u65E0\u5173\u7684 section\u3001slide\u3001\u811A\u672C\u6216\u884C\u4E3A\u3002"));
  }
  lines.push("");
  return false;
}

// src/export/change-summary.ts
function groupPromptChanges(patches) {
  const groups = /* @__PURE__ */ new Map();
  for (const patch of patches) {
    const locator = patch.targetLocator;
    if (!locator) continue;
    const key = locator.cssPath || locator.nthOfTypePath || patch.targetDescriptor;
    if (!key) continue;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        target: locator.descriptor || patch.targetDescriptor,
        targetElement: patch.targetElement,
        locator: locator.cssPath || locator.nthOfTypePath,
        slideContext: getSlideContext(patch.targetElement),
        styleChanges: /* @__PURE__ */ new Map(),
        attributeChanges: /* @__PURE__ */ new Map(),
        firstSeenAt: patch.createdAt || Date.now()
      };
      groups.set(key, group);
    }
    if (patch.kind === "style") {
      const existing = group.styleChanges.get(patch.property);
      if (existing) {
        existing.after = patch.after;
      } else {
        group.styleChanges.set(patch.property, { before: patch.before, after: patch.after });
      }
    } else if (patch.kind === "content") {
      if (group.textChange) {
        group.textChange.after = patch.after;
      } else {
        group.textChange = { before: patch.before, after: patch.after };
      }
    } else if (patch.kind === "attribute") {
      const existing = group.attributeChanges.get(patch.attribute);
      if (existing) {
        existing.after = patch.after;
      } else {
        group.attributeChanges.set(patch.attribute, { before: patch.before, after: patch.after });
      }
    }
  }
  const result = [];
  for (const group of Array.from(groups.values()).sort((a, b) => a.firstSeenAt - b.firstSeenAt)) {
    for (const [prop, change] of Array.from(group.styleChanges.entries())) {
      if (change.before === change.after) {
        group.styleChanges.delete(prop);
      }
    }
    if (group.textChange && group.textChange.before === group.textChange.after) {
      group.textChange = void 0;
    }
    for (const [attr, change] of Array.from(group.attributeChanges.entries())) {
      if (change.before === change.after) {
        group.attributeChanges.delete(attr);
      }
    }
    if (group.styleChanges.size > 0 || group.textChange || group.attributeChanges.size > 0) {
      result.push(group);
    }
  }
  return result;
}
function quoteSnippet(value) {
  const raw = (value ?? "").toString().replace(/\s+/g, " ").trim();
  if (!raw) {
    return '""';
  }
  const max = 80;
  const clipped = raw.length > max ? `${raw.slice(0, max - 3)}...` : raw;
  return JSON.stringify(clipped);
}
function summarizeTextChange(before, after, isZh2) {
  const beforeText = normalizeText(before);
  const afterText = normalizeText(after);
  if (!beforeText && afterText) {
    return [isZh2 ? `   \u6587\u672C\u65B0\u589E\uFF1A${quoteSnippet(afterText)}\u3002` : `   Text added: ${quoteSnippet(afterText)}.`];
  }
  if (beforeText && !afterText) {
    return [isZh2 ? `   \u6587\u672C\u5220\u9664\uFF1A${quoteSnippet(beforeText)}\u3002` : `   Text removed: ${quoteSnippet(beforeText)}.`];
  }
  const diff = findTextDiff(beforeText, afterText);
  const lines = [];
  if (diff.removed && !diff.added) {
    lines.push(isZh2 ? `   \u6587\u672C\u5220\u9664\uFF1A${quoteSnippet(diff.removed)}\u3002` : `   Text removed: ${quoteSnippet(diff.removed)}.`);
  } else if (!diff.removed && diff.added) {
    const isAppend = diff.prefix.length >= beforeText.length - 1;
    lines.push(
      isZh2 ? `   ${isAppend ? "\u6587\u672C\u8FFD\u52A0" : "\u6587\u672C\u65B0\u589E"}\uFF1A${quoteSnippet(diff.added)}\u3002` : `   Text ${isAppend ? "appended" : "added"}: ${quoteSnippet(diff.added)}.`
    );
  } else if (diff.removed || diff.added) {
    lines.push(
      isZh2 ? `   \u6587\u672C\u66FF\u6362\uFF1A\u5C06 ${quoteSnippet(diff.removed)} \u66FF\u6362\u4E3A ${quoteSnippet(diff.added)}\u3002` : `   Text replaced: ${quoteSnippet(diff.removed)} with ${quoteSnippet(diff.added)}.`
    );
  }
  lines.push(
    isZh2 ? `   \u5B8C\u6574\u6587\u672C\u7ED3\u679C\u5E94\u4E3A\uFF1A${quoteSnippet(afterText)}\u3002` : `   Final text should be: ${quoteSnippet(afterText)}.`
  );
  return lines;
}
function normalizeText(value) {
  return (value ?? "").toString().replace(/\s+/g, " ").trim();
}
function findTextDiff(before, after) {
  let prefixLength = 0;
  const maxPrefix = Math.min(before.length, after.length);
  while (prefixLength < maxPrefix && before[prefixLength] === after[prefixLength]) {
    prefixLength += 1;
  }
  let suffixLength = 0;
  const maxSuffix = Math.min(before.length - prefixLength, after.length - prefixLength);
  while (suffixLength < maxSuffix && before[before.length - 1 - suffixLength] === after[after.length - 1 - suffixLength]) {
    suffixLength += 1;
  }
  return {
    prefix: before.slice(0, prefixLength),
    removed: before.slice(prefixLength, before.length - suffixLength).trim(),
    added: after.slice(prefixLength, after.length - suffixLength).trim()
  };
}
function normalizeAttributeValue(attribute, value) {
  if (attribute !== "src") {
    return value;
  }
  const raw = (value ?? "").toString();
  if (raw.startsWith("data:")) {
    if (raw.startsWith("data:video/")) {
      return "[data URL video]";
    }
    return "[data URL image]";
  }
  return raw;
}

// src/export/unified-prompt.ts
var PROMPT_COPY = {
  en: {
    pageContext: "Page context:",
    titleLine: (title) => `- Title: ${title}`,
    scope: "- Scope: Current active browser page only.",
    todoList: "Execution TodoList:",
    targetLabel: "Target",
    detailsLabel: "Details",
    howToUse: "How to use location hints:",
    howToUseRules: [
      "1. Use the original HTML structure as the source of truth, then use anchors, region contents, nearby references, and CSS facts to locate the edit.",
      "2. Visual boxes are placement hints, not absolute CSS instructions. Do not blindly convert viewport boxes into hard-coded top/left coordinates.",
      "3. Use Target B relativeBox and alignment hints as spatial intent. Prefer stable local layout edits over coordinate-only CSS.",
      "4. CSS facts are a short factual snapshot of the selected element, not a full computed-style dump and not a classification rule system."
    ],
    globalRules: "Global editing rules:",
    globalRuleLines: [
      "1. Keep all unrelated content, layout, and behavior unchanged.",
      "2. Apply the smallest possible code changes.",
      "3. Preserve the user's wording and intent. Do not treat the user note as literal page copy unless explicitly asked.",
      "4. Keep changes limited to the selected region and directly related surrounding layout.",
      "5. Match the existing visual style unless the user explicitly asks for another style.",
      "6. If the intent, target, or placement is ambiguous, ask a clarifying question before editing instead of guessing broadly.",
      "7. Do not redesign the whole slide/page or modify unrelated pages, slides, sections, content, scripts, or behavior."
    ],
    moveRules: "Move operation rules:",
    moveRuleLines: [
      "1. Move Source A content toward Target B using DOM structure, local container, current layout, nearby references, and CSS facts.",
      "2. If Move note is [not provided], infer the intent conservatively from visual boxes, region contents, nearby references, and CSS facts.",
      "3. Target B is a placement reference, not replacement content.",
      "4. Interpret the move as the desired final visual placement of Source A content, not as an instruction to recreate ClickDeck selection boxes or markers.",
      "5. Implement the move through the page's existing layout flow first: parent alignment, flex/grid placement, margin, max-width, gap, order, or a local wrapper.",
      "6. Preserve source size/proportion/style and only make local spacing adjustments needed to fit.",
      "7. Preserve obvious alignment relationships such as edge alignment, centering, relative offset, and spacing rhythm.",
      "8. Avoid brittle coordinate-only fixes unless the original layout is already absolute-positioned and no safer local layout edit exists."
    ],
    removeRules: "Remove operation rules:",
    removeRuleLines: [
      "1. Remove the selected region from the source HTML/CSS, or hide it only if that matches the existing implementation style.",
      "2. Preserve surrounding layout where possible. If removal leaves an obvious gap, adjust only local spacing/layout.",
      "3. Avoid unintended layout shifts outside the selected region."
    ],
    intentRules: "Intent operation rules:",
    intentRuleLines: [
      "1. Implement the user note only inside the selected region and directly related local layout.",
      "2. Infer whether the note means add, delete, replace, restyle, or a small local rearrangement from the wording.",
      "3. If the selected region is empty, use it as the intended placement area for new content."
    ],
    taskDetails: "Task Details:",
    typeLabel: "type",
    patchType: "patch",
    targetField: "Target",
    locatorField: "Locator",
    slideContextField: "Slide/Page Context",
    codeSnippetField: "Context code snippet",
    finalChecklist: "Final alignment checklist:",
    finalChecklistLines: [
      "1. Complete every task in the Execution TodoList exactly once.",
      "2. For each task, match the task id to its detail block before editing.",
      "3. If a task cannot be completed safely or is ambiguous, list it under `Unresolved` with the task id instead of ignoring it.",
      "4. Do not merge two tasks silently, skip a task, or apply one task to the wrong element.",
      "5. Keep source changes minimal and limited to HTML/CSS unless the task explicitly requires otherwise."
    ],
    taskTypeMap: {
      STYLE: "STYLE",
      CONTENT: "CONTENT",
      ATTRIBUTE: "ATTRIBUTE",
      MOVE: "MOVE",
      REMOVE: "REMOVE",
      INTENT: "INTENT"
    }
  },
  zh: {
    pageContext: "\u9875\u9762\u4E0A\u4E0B\u6587:",
    titleLine: (title) => `- \u6807\u9898: ${title}`,
    scope: "- \u8303\u56F4\uFF1A\u4EC5\u9650\u5F53\u524D\u6D3B\u52A8\u6D4F\u89C8\u5668\u9875\u9762\u3002",
    todoList: "\u6267\u884C\u5F85\u529E\u6E05\u5355:",
    targetLabel: "\u76EE\u6807",
    detailsLabel: "\u8BE6\u60C5",
    howToUse: "\u5B9A\u4F4D\u4FE1\u606F\u4F7F\u7528\u8BF4\u660E:",
    howToUseRules: [
      "1. \u4EE5\u539F\u59CB HTML \u7ED3\u6784\u4E3A\u51C6\uFF0C\u518D\u7ED3\u5408\u951A\u70B9\u3001\u533A\u57DF\u5185\u5BB9\u3001\u8FD1\u90BB\u53C2\u8003\u548C CSS \u4E8B\u5B9E\u5B9A\u4F4D\u9700\u8981\u4FEE\u6539\u7684\u5BF9\u8C61\u3002",
      "2. \u89C6\u89C9\u6846\u53EA\u662F\u653E\u7F6E\u63D0\u793A\uFF0C\u4E0D\u662F\u7EDD\u5BF9 CSS \u6307\u4EE4\u3002\u4E0D\u8981\u628A\u89C6\u53E3\u6846\u76F2\u76EE\u8F6C\u6362\u6210\u786C\u7F16\u7801\u7684 top/left \u5750\u6807\u3002",
      "3. \u5C06 Target B \u7684 relativeBox \u548C\u5BF9\u9F50\u63D0\u793A\u89C6\u4E3A\u7A7A\u95F4\u610F\u56FE\u3002\u5E94\u4F18\u5148\u4F7F\u7528\u7A33\u5B9A\u7684\u5C40\u90E8\u5E03\u5C40\u4FEE\u6539\uFF0C\u800C\u4E0D\u662F\u4EC5\u9760\u5750\u6807\u5199 CSS\u3002",
      "4. CSS \u4E8B\u5B9E\u53EA\u662F\u6240\u9009\u5143\u7D20\u7684\u7B80\u77ED\u4E8B\u5B9E\u5FEB\u7167\uFF0C\u4E0D\u662F\u5B8C\u6574\u7684 computed-style \u5BFC\u51FA\uFF0C\u4E5F\u4E0D\u662F\u4E00\u5957\u5206\u7C7B\u89C4\u5219\u7CFB\u7EDF\u3002"
    ],
    globalRules: "\u5168\u5C40\u7F16\u8F91\u89C4\u5219:",
    globalRuleLines: [
      "1. \u4FDD\u6301\u6240\u6709\u65E0\u5173\u5185\u5BB9\u3001\u5E03\u5C40\u548C\u884C\u4E3A\u4E0D\u53D8\u3002",
      "2. \u91C7\u7528\u5C3D\u53EF\u80FD\u5C0F\u7684\u4EE3\u7801\u6539\u52A8\u3002",
      "3. \u4FDD\u7559\u7528\u6237\u539F\u59CB\u63AA\u8F9E\u548C\u610F\u56FE\u3002\u9664\u975E\u7528\u6237\u660E\u786E\u8981\u6C42\uFF0C\u5426\u5219\u4E0D\u8981\u628A\u7528\u6237\u8BF4\u660E\u5F53\u6210\u9875\u9762\u5B57\u9762\u6587\u6848\u3002",
      "4. \u5C06\u6539\u52A8\u9650\u5236\u5728\u6240\u9009\u533A\u57DF\u53CA\u5176\u76F4\u63A5\u76F8\u5173\u7684\u5468\u8FB9\u5E03\u5C40\u5185\u3002",
      "5. \u9664\u975E\u7528\u6237\u660E\u786E\u8981\u6C42\u53E6\u4E00\u79CD\u98CE\u683C\uFF0C\u5426\u5219\u5E94\u5339\u914D\u73B0\u6709\u89C6\u89C9\u6837\u5F0F\u3002",
      "6. \u5982\u679C\u610F\u56FE\u3001\u76EE\u6807\u6216\u653E\u7F6E\u5173\u7CFB\u5B58\u5728\u6B67\u4E49\uFF0C\u5E94\u5148\u63D0\u6F84\u6E05\u95EE\u9898\uFF0C\u800C\u4E0D\u662F\u5BBD\u6CDB\u731C\u6D4B\u3002",
      "7. \u4E0D\u8981\u91CD\u505A\u6574\u4E2A slide/page\uFF0C\u4E5F\u4E0D\u8981\u4FEE\u6539\u65E0\u5173\u9875\u9762\u3001slide\u3001section\u3001\u5185\u5BB9\u3001\u811A\u672C\u6216\u884C\u4E3A\u3002"
    ],
    moveRules: "\u79FB\u52A8\u64CD\u4F5C\u89C4\u5219:",
    moveRuleLines: [
      "1. \u7ED3\u5408 DOM \u7ED3\u6784\u3001\u5C40\u90E8\u5BB9\u5668\u3001\u5F53\u524D\u5E03\u5C40\u3001\u8FD1\u90BB\u53C2\u8003\u548C CSS \u4E8B\u5B9E\uFF0C\u5C06 Source A \u79FB\u52A8\u5230 Target B\u3002",
      "2. \u5982\u679C Move note \u4E3A [not provided]\uFF0C\u5E94\u57FA\u4E8E\u89C6\u89C9\u6846\u3001\u533A\u57DF\u5185\u5BB9\u3001\u8FD1\u90BB\u53C2\u8003\u548C CSS \u4E8B\u5B9E\u505A\u4FDD\u5B88\u63A8\u65AD\u3002",
      "3. Target B \u662F\u653E\u7F6E\u53C2\u8003\uFF0C\u4E0D\u4EE3\u8868\u8981\u66FF\u6362\u90A3\u91CC\u7684\u73B0\u6709\u5185\u5BB9\u3002",
      "4. \u5C06\u8FD9\u6B21\u79FB\u52A8\u7406\u89E3\u4E3A Source A \u5185\u5BB9\u7684\u6700\u7EC8\u89C6\u89C9\u843D\u70B9\uFF0C\u800C\u4E0D\u662F\u8981\u6C42\u91CD\u5EFA ClickDeck \u7684\u9009\u62E9\u6846\u6216\u6807\u8BB0\u3002",
      "5. \u4F18\u5148\u901A\u8FC7\u9875\u9762\u73B0\u6709\u5E03\u5C40\u6D41\u5B9E\u73B0\u79FB\u52A8\uFF0C\u4F8B\u5982\u7236\u7EA7\u5BF9\u9F50\u3001flex/grid \u6392\u5E03\u3001margin\u3001max-width\u3001gap\u3001order \u6216\u5C40\u90E8 wrapper\u3002",
      "6. \u4FDD\u7559\u6E90\u5185\u5BB9\u7684\u5C3A\u5BF8\u3001\u6BD4\u4F8B\u548C\u6837\u5F0F\uFF0C\u53EA\u505A\u6EE1\u8DB3\u843D\u4F4D\u6240\u9700\u7684\u5C40\u90E8\u95F4\u8DDD\u8C03\u6574\u3002",
      "7. \u4FDD\u7559\u660E\u663E\u7684\u5BF9\u9F50\u5173\u7CFB\uFF0C\u4F8B\u5982\u8FB9\u7F18\u5BF9\u9F50\u3001\u5C45\u4E2D\u3001\u76F8\u5BF9\u504F\u79FB\u548C\u95F4\u8DDD\u8282\u594F\u3002",
      "8. \u9664\u975E\u539F\u5E03\u5C40\u672C\u6765\u5C31\u662F absolute \u5B9A\u4F4D\u4E14\u6CA1\u6709\u66F4\u5B89\u5168\u7684\u5C40\u90E8\u5E03\u5C40\u6539\u6CD5\uFF0C\u5426\u5219\u4E0D\u8981\u91C7\u7528\u8106\u5F31\u7684\u7EAF\u5750\u6807\u4FEE\u8865\u3002"
    ],
    removeRules: "\u5220\u9664\u64CD\u4F5C\u89C4\u5219:",
    removeRuleLines: [
      "1. \u4ECE\u6E90 HTML/CSS \u4E2D\u79FB\u9664\u6240\u9009\u533A\u57DF\uFF1B\u53EA\u6709\u5F53\u8FD9\u66F4\u7B26\u5408\u539F\u5B9E\u73B0\u98CE\u683C\u65F6\uFF0C\u624D\u4F7F\u7528\u9690\u85CF\u800C\u975E\u5220\u9664\u3002",
      "2. \u5728\u53EF\u80FD\u7684\u60C5\u51B5\u4E0B\u4FDD\u7559\u5468\u56F4\u5E03\u5C40\uFF1B\u5982\u679C\u5220\u9664\u540E\u7559\u4E0B\u660E\u663E\u7A7A\u9699\uFF0C\u53EA\u8C03\u6574\u5C40\u90E8\u95F4\u8DDD\u6216\u5E03\u5C40\u3002",
      "3. \u907F\u514D\u5728\u6240\u9009\u533A\u57DF\u4E4B\u5916\u5F15\u5165\u975E\u9884\u671F\u5E03\u5C40\u504F\u79FB\u3002"
    ],
    intentRules: "\u610F\u56FE\u64CD\u4F5C\u89C4\u5219:",
    intentRuleLines: [
      "1. \u53EA\u5728\u6240\u9009\u533A\u57DF\u53CA\u5176\u76F4\u63A5\u76F8\u5173\u7684\u5C40\u90E8\u5E03\u5C40\u5185\u843D\u5B9E\u8FD9\u6761\u7528\u6237\u8BF4\u660E\u3002",
      "2. \u6839\u636E\u63AA\u8F9E\u5224\u65AD\u8FD9\u6761\u8BF4\u660E\u662F\u65B0\u589E\u3001\u5220\u9664\u3001\u66FF\u6362\u3001\u91CD\u8BBE\u6837\u5F0F\uFF0C\u8FD8\u662F\u5C40\u90E8\u5C0F\u8303\u56F4\u91CD\u6392\u3002",
      "3. \u5982\u679C\u6240\u9009\u533A\u57DF\u4E3A\u7A7A\u767D\uFF0C\u5E94\u5C06\u5176\u89C6\u4E3A\u65B0\u5185\u5BB9\u7684\u9884\u671F\u653E\u7F6E\u533A\u57DF\u3002"
    ],
    taskDetails: "\u4EFB\u52A1\u8BE6\u60C5:",
    typeLabel: "\u7C7B\u578B",
    patchType: "patch",
    targetField: "\u76EE\u6807",
    locatorField: "\u5B9A\u4F4D\u8DEF\u5F84",
    slideContextField: "\u6240\u5C5E\u9875\u9762/Slide",
    codeSnippetField: "\u4E0A\u4E0B\u6587\u4EE3\u7801\u7247\u6BB5",
    finalChecklist: "\u6700\u7EC8\u6838\u5BF9\u6E05\u5355:",
    finalChecklistLines: [
      "1. \u4E25\u683C\u9010\u9879\u5B8C\u6210\u6267\u884C\u5F85\u529E\u6E05\u5355\u4E2D\u7684\u6BCF\u4E2A\u4EFB\u52A1\uFF0C\u4E14\u53EA\u5B8C\u6210\u4E00\u6B21\u3002",
      "2. \u5BF9\u6BCF\u4E2A\u4EFB\u52A1\uFF0C\u90FD\u8981\u5148\u5C06\u4EFB\u52A1 id \u4E0E\u5BF9\u5E94\u8BE6\u60C5\u5757\u6838\u5BF9\u4E00\u81F4\u540E\u518D\u4FEE\u6539\u3002",
      "3. \u5982\u679C\u67D0\u4E2A\u4EFB\u52A1\u65E0\u6CD5\u5B89\u5168\u5B8C\u6210\u6216\u5B58\u5728\u6B67\u4E49\uFF0C\u8BF7\u5C06\u5176\u5217\u5165 `Unresolved` \u5E76\u5E26\u4E0A\u4EFB\u52A1 id\uFF0C\u4E0D\u8981\u76F4\u63A5\u5FFD\u7565\u3002",
      "4. \u4E0D\u8981\u9759\u9ED8\u5408\u5E76\u4E24\u4E2A\u4EFB\u52A1\u3001\u8DF3\u8FC7\u4EFB\u52A1\uFF0C\u6216\u628A\u67D0\u4E2A\u4EFB\u52A1\u9519\u8BEF\u5E94\u7528\u5230\u522B\u7684\u5143\u7D20\u4E0A\u3002",
      "5. \u9664\u975E\u4EFB\u52A1\u660E\u786E\u8981\u6C42\uFF0C\u5426\u5219\u5E94\u5C06\u6539\u52A8\u9650\u5236\u5728 HTML/CSS \u4E14\u4FDD\u6301\u6700\u5C0F\u3002"
    ],
    taskTypeMap: {
      STYLE: "\u6837\u5F0F",
      CONTENT: "\u5185\u5BB9",
      ATTRIBUTE: "\u5C5E\u6027",
      MOVE: "\u79FB\u52A8",
      REMOVE: "\u5220\u9664",
      INTENT: "\u610F\u56FE"
    }
  }
};
function getLocalHtmlSnippet(el) {
  if (!el) return null;
  try {
    const clone = el.cloneNode(true);
    const clickdeckElements = clone.querySelectorAll("[id^='clickdeck-'], [class*='clickdeck-']");
    clickdeckElements.forEach((n) => n.remove());
    if (isClickDeckUiElement(clone)) return null;
    let outerHTML = clone.outerHTML;
    outerHTML = outerHTML.replace(/src="data:[^"]+"/g, 'src="[data URL hidden]"');
    outerHTML = outerHTML.replace(/srcdoc="[^"]*"/g, 'srcdoc="[srcdoc hidden]"');
    const lines = outerHTML.split("\n");
    let snippet = lines.slice(0, 8).join("\n");
    if (snippet.length > 500) {
      snippet = snippet.substring(0, 500) + "\n... (truncated)";
    } else if (lines.length > 8) {
      snippet += "\n... (truncated)";
    }
    return snippet;
  } catch {
    return null;
  }
}
function buildUnifiedPrompt(patches, intents, options) {
  const isZh2 = options.language === "zh";
  const copy = PROMPT_COPY[isZh2 ? "zh" : "en"];
  const changeGroups = groupPromptChanges(patches);
  if (changeGroups.length === 0 && intents.length === 0) {
    return {
      ok: false,
      reason: "empty",
      message: isZh2 ? "\u5F53\u524D\u6CA1\u6709\u53EF\u603B\u7ED3\u7684\u4FEE\u6539\uFF0C\u8BF7\u5148\u5728\u9875\u9762\u4E0A\u505A\u4E00\u4E9B\u8C03\u6574\u3002" : "No edits to summarize yet. Make some changes first."
    };
  }
  const lines = [];
  let hasMediaReplacement = false;
  lines.push("ClickDeck AI edit prompt");
  lines.push("");
  lines.push(copy.pageContext);
  lines.push(`- URL: ${options.page.url || "unknown"}`);
  lines.push(copy.titleLine(options.page.title || "unknown"));
  lines.push(copy.scope);
  lines.push("");
  lines.push(copy.todoList);
  let globalTaskId = 1;
  const taskMap = [];
  const intentRefs = [];
  for (let i = 0; i < intents.length; i++) {
    const intent = intents[i];
    const taskId = `TASK-${globalTaskId++}`;
    const opId = `OP-${i + 1}`;
    let shortTarget = "";
    if (intent.operation.action === "move") {
      shortTarget = `Source A -> Target B`;
    } else {
      const u = intent.sourceContext.region.userIntent;
      shortTarget = u ? `"${u.substring(0, 20)}${u.length > 20 ? "..." : ""}"` : "selected region";
    }
    const taskType = copy.taskTypeMap[intent.operation.action.toUpperCase()];
    lines.push(`- [ ] ${taskId} | ${taskType} | ${copy.targetLabel}: ${shortTarget} | ${copy.detailsLabel}: ${opId}`);
    taskMap.push({ id: taskId, type: taskType, ref: opId });
    intentRefs.push(opId);
  }
  const changeRefs = [];
  for (let i = 0; i < changeGroups.length; i++) {
    const group = changeGroups[i];
    const taskId = `TASK-${globalTaskId++}`;
    const changeId = `Change-${i + 1}`;
    const changeTypes = [];
    if (group.styleChanges.size > 0) changeTypes.push("STYLE");
    if (group.textChange) changeTypes.push("CONTENT");
    if (group.attributeChanges.size > 0) changeTypes.push("ATTRIBUTE");
    const taskType = changeTypes.map((type) => copy.taskTypeMap[type]).join("/");
    lines.push(`- [ ] ${taskId} | ${taskType} | ${copy.targetLabel}: ${group.target} | ${copy.detailsLabel}: ${changeId}`);
    taskMap.push({ id: taskId, type: taskType, ref: changeId });
    changeRefs.push(changeId);
  }
  lines.push("");
  lines.push(copy.howToUse);
  copy.howToUseRules.forEach((line) => lines.push(line));
  lines.push("");
  lines.push(copy.globalRules);
  copy.globalRuleLines.forEach((line) => lines.push(line));
  lines.push("");
  const hasMove = intents.some((input) => input.operation.action === "move");
  if (hasMove) {
    lines.push(copy.moveRules);
    copy.moveRuleLines.forEach((line) => lines.push(line));
    lines.push("");
  }
  const hasRemove = intents.some((input) => input.operation.action === "remove");
  if (hasRemove) {
    lines.push(copy.removeRules);
    copy.removeRuleLines.forEach((line) => lines.push(line));
    lines.push("");
  }
  const hasGeneralIntent = intents.some((input) => input.operation.action === "intent");
  if (hasGeneralIntent) {
    lines.push(copy.intentRules);
    copy.intentRuleLines.forEach((line) => lines.push(line));
    lines.push("");
  }
  lines.push(copy.taskDetails);
  lines.push("");
  for (let i = 0; i < intents.length; i++) {
    const input = intents[i];
    const opId = intentRefs[i];
    if (input.operation.action === "move") {
      input.__promptLanguage = options.language;
      hasMediaReplacement = appendMoveOperation(lines, input, opId, true) || hasMediaReplacement;
    } else if (input.operation.action === "remove") {
      input.__promptLanguage = options.language;
      hasMediaReplacement = appendRemoveOperation(lines, input, opId, true) || hasMediaReplacement;
    } else {
      input.__promptLanguage = options.language;
      hasMediaReplacement = appendIntentOperation(lines, input, opId, true) || hasMediaReplacement;
    }
  }
  for (let i = 0; i < changeGroups.length; i++) {
    const group = changeGroups[i];
    const changeId = changeRefs[i];
    lines.push(`${changeId} | ${copy.typeLabel}: ${copy.patchType}`);
    lines.push(`   ${copy.targetField}: ${group.target}`);
    lines.push(`   ${copy.locatorField}: ${group.locator}`);
    if (group.slideContext) {
      lines.push(`   ${copy.slideContextField}: ${group.slideContext}`);
    }
    if (group.targetElement) {
      lines.push(...getComplexElementPromptNotes(group.targetElement, isZh2));
    }
    const snippet = getLocalHtmlSnippet(group.targetElement);
    if (snippet) {
      lines.push(`   ${copy.codeSnippetField}:`);
      lines.push(`   \`\`\`html
   ${snippet.split("\n").join("\n   ")}
   \`\`\``);
    }
    if (group.textChange) {
      lines.push(...summarizeTextChange(group.textChange.before, group.textChange.after, isZh2));
    }
    for (const [prop, change] of Array.from(group.styleChanges.entries())) {
      lines.push(
        isZh2 ? `   \u6837\u5F0F\u4FEE\u6539\uFF1A${prop} \u4ECE ${quoteSnippet(change.before)} \u6539\u4E3A ${quoteSnippet(change.after)}\u3002` : `   Style: ${prop} changed from ${quoteSnippet(change.before)} to ${quoteSnippet(change.after)}.`
      );
    }
    for (const [attr, change] of Array.from(group.attributeChanges.entries())) {
      const after = normalizeAttributeValue(attr, change.after);
      lines.push(
        isZh2 ? `   \u5C5E\u6027\u4FEE\u6539\uFF1A${attr} \u9700\u8981\u66FF\u6362\u4E3A ${quoteSnippet(after)}\u3002` : `   Attribute: ${attr} should be replaced with ${quoteSnippet(after)}.`
      );
      if (attr === "src") {
        hasMediaReplacement = true;
        lines.push(
          isZh2 ? `   \u5982\u679C\u8FD9\u4EFD prompt \u6CA1\u6709\u540C\u65F6\u63D0\u4F9B\u5A92\u4F53\u6587\u4EF6\u6216\u8D44\u6E90\u8DEF\u5F84\uFF0C\u8BF7\u5148\u5411\u7528\u6237\u7D22\u8981\u66FF\u6362\u6587\u4EF6\uFF0C\u518D\u4FEE\u6539\u8FD9\u4E2A src\u3002` : `   If this prompt does not include an image/video file or asset path, please ask the user for the replacement media before changing this src.`
        );
      }
    }
    lines.push("");
  }
  lines.push(copy.finalChecklist);
  copy.finalChecklistLines.forEach((line) => lines.push(line));
  return {
    ok: true,
    prompt: lines.join("\n").trim(),
    hasMediaReplacement
  };
}

// src/content/presentation-mode.ts
function detectPresentationSlides(root = document) {
  let slides = Array.from(root.querySelectorAll(".slide"));
  if (slides.length >= 2) return slides;
  slides = Array.from(root.querySelectorAll("[data-slide]"));
  if (slides.length >= 2) return slides;
  slides = Array.from(root.querySelectorAll('[aria-roledescription="slide"]'));
  if (slides.length >= 2) return slides;
  slides = Array.from(root.querySelectorAll(".deck > section"));
  if (slides.length >= 2) return slides;
  const sections = Array.from(root.querySelectorAll("main > section"));
  if (sections.length >= 2) {
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 600;
    const threshold = viewportHeight * 0.75;
    const allTall = sections.every((s) => s.clientHeight >= threshold);
    if (allTall) {
      return sections;
    }
  }
  return [];
}
function syncPresentationHostState(options) {
  const { slides, index, direction, logger } = options;
  const slide = slides[index] ?? null;
  const detail = { index, total: slides.length, slide, direction };
  syncCommonSlideState(slides, index);
  syncHostNavState(slides, index);
  syncCounters(slides, index);
  syncHostThemeState(slides, index);
  triggerLegacyHostSlideHook(index, logger);
  syncKnownPresentationFrameworks(slide, index, logger);
  triggerClickDeckHostProtocol(detail, logger);
  dispatchPresentationChange(detail, logger);
  return detail;
}
function getHostNavDots() {
  return Array.from(document.querySelectorAll("#nav .dot, .nav-dot, .nav-dots .nav-dot"));
}
function syncHostNavState(slides, index) {
  const dots = getHostNavDots();
  if (dots.length !== slides.length) {
    return;
  }
  dots.forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === index);
    if (dotIndex === index) {
      dot.setAttribute("aria-current", "true");
    } else {
      dot.removeAttribute("aria-current");
    }
  });
}
function syncCommonSlideState(slides, index) {
  slides.forEach((slide, slideIndex) => {
    if (slideIndex === index) {
      slide.classList.add("active");
      slide.classList.remove("prev");
    } else if (slideIndex < index) {
      slide.classList.remove("active");
      slide.classList.add("prev");
    } else {
      slide.classList.remove("active");
      slide.classList.remove("prev");
    }
  });
}
function syncCounters(slides, index) {
  const currentSlideEl = document.getElementById("currentSlide");
  const totalSlidesEl = document.getElementById("totalSlides");
  if (currentSlideEl) {
    currentSlideEl.textContent = String(index + 1);
  }
  if (totalSlidesEl) {
    totalSlidesEl.textContent = String(slides.length);
  }
}
function syncHostThemeState(slides, index) {
  const slide = slides[index];
  if (!slide) {
    return;
  }
  const theme = slide.dataset.theme || (slide.classList.contains("light") ? "light" : slide.classList.contains("dark") ? "dark" : "");
  if (theme) {
    document.body.classList.toggle("light-bg", theme === "light");
  }
}
function triggerLegacyHostSlideHook(index, logger) {
  const hostWindow = window;
  if (typeof hostWindow.__playSlide !== "function") {
    return;
  }
  try {
    hostWindow.__playSlide(index);
  } catch (error) {
    logger.warn("Could not trigger host slide hook", error);
  }
}
function syncKnownPresentationFrameworks(slide, index, logger) {
  const hostWindow = window;
  const reveal = hostWindow.Reveal;
  if (reveal && typeof reveal.slide === "function") {
    try {
      reveal.slide(index);
      if (typeof reveal.sync === "function") {
        reveal.sync();
      }
      if (typeof reveal.layout === "function") {
        reveal.layout();
      }
    } catch (error) {
      logger.warn("Could not sync reveal.js presentation state", error);
    }
  }
  if (slide?.id && typeof hostWindow.impress === "function") {
    try {
      const impressApi = hostWindow.impress();
      if (typeof impressApi?.goto === "function") {
        impressApi.goto(slide.id);
      }
    } catch (error) {
      logger.warn("Could not sync impress.js presentation state", error);
    }
  }
}
function triggerClickDeckHostProtocol(detail, logger) {
  const hostWindow = window;
  if (typeof hostWindow.__clickdeckSyncPresentationState !== "function") {
    return;
  }
  try {
    hostWindow.__clickdeckSyncPresentationState(detail);
  } catch (error) {
    logger.warn("Could not trigger ClickDeck presentation sync protocol", error);
  }
}
function dispatchPresentationChange(detail, logger) {
  try {
    document.dispatchEvent(new CustomEvent("clickdeck:presentationchange", { detail }));
  } catch (error) {
    logger.warn("Could not dispatch presentation change event", error);
  }
}
function getPresentationDirection(options) {
  const { from, to, initial, requested } = options;
  if (requested) {
    return requested;
  }
  if (initial) {
    return "initial";
  }
  if (Math.abs(to - from) > 1) {
    return "jump";
  }
  if (to > from) {
    return "next";
  }
  if (to < from) {
    return "previous";
  }
  return "jump";
}
function createPresentationController(options) {
  const { slides, logger } = options;
  let currentIndex = 0;
  let isPresenting = false;
  let originalScrollY = 0;
  let hasSyncedInitialState = false;
  let originalDimensions = [];
  let transformedAncestorStates = [];
  function notifyHostPresentationChange(index, direction) {
    syncPresentationHostState({ slides, index, direction, logger });
  }
  function updateSlideVisibility() {
    slides.forEach((slide, index) => {
      if (index === currentIndex) {
        slide.classList.remove("clickdeck-presentation-hidden-slide");
        slide.classList.add("clickdeck-presenting-slide");
        const dim = originalDimensions[index];
        if (dim) {
          const scale = Math.min(window.innerWidth / dim.width, window.innerHeight / dim.height);
          slide.style.setProperty("--clickdeck-present-scale", String(scale));
        }
      } else {
        slide.classList.remove("clickdeck-presenting-slide");
        slide.classList.add("clickdeck-presentation-hidden-slide");
        slide.style.removeProperty("--clickdeck-present-scale");
      }
    });
  }
  function goTo(index, requestedDirection) {
    if (!isPresenting || slides.length === 0) return;
    if (index < 0) index = 0;
    if (index >= slides.length) index = slides.length - 1;
    const previousIndex = currentIndex;
    currentIndex = index;
    const direction = getPresentationDirection({
      from: previousIndex,
      to: currentIndex,
      initial: !hasSyncedInitialState,
      requested: requestedDirection
    });
    updateSlideVisibility();
    notifyHostPresentationChange(currentIndex, direction);
    hasSyncedInitialState = true;
  }
  function next() {
    if (currentIndex < slides.length - 1) {
      goTo(currentIndex + 1);
    } else {
      exit();
    }
  }
  function previous() {
    if (currentIndex > 0) {
      goTo(currentIndex - 1);
    }
  }
  function onKeyDown(e) {
    if (!isPresenting) return;
    if (e.target.closest("input, textarea, [contenteditable='true']")) {
      return;
    }
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
      case "PageDown":
      case " ":
        e.preventDefault();
        e.stopPropagation();
        next();
        break;
      case "ArrowLeft":
      case "ArrowUp":
      case "PageUp":
        e.preventDefault();
        e.stopPropagation();
        previous();
        break;
      case "Home":
        e.preventDefault();
        e.stopPropagation();
        goTo(0, currentIndex === 0 ? "jump" : void 0);
        break;
      case "End":
        e.preventDefault();
        e.stopPropagation();
        goTo(slides.length - 1, slides.length > 2 ? "jump" : void 0);
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        exit();
        break;
    }
  }
  function onDocumentClick(e) {
    if (!isPresenting) return;
    const target = e.target;
    const dot = target?.closest("#nav .dot, .nav-dot");
    if (!dot) {
      return;
    }
    const dots = getHostNavDots();
    if (dots.length !== slides.length) {
      return;
    }
    const explicitIndexStr = dot.dataset.i || dot.dataset.index;
    const explicitIndex = explicitIndexStr ? Number.parseInt(explicitIndexStr, 10) : Number.NaN;
    const nextIndex = Number.isFinite(explicitIndex) ? explicitIndex : dots.indexOf(dot);
    if (nextIndex < 0) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    goTo(nextIndex, Math.abs(nextIndex - currentIndex) > 1 ? "jump" : void 0);
  }
  let wheelTimeout = null;
  function onWheel(e) {
    if (!isPresenting) return;
    e.preventDefault();
    e.stopPropagation();
    if (wheelTimeout) return;
    wheelTimeout = window.setTimeout(() => {
      wheelTimeout = null;
    }, 250);
    if (e.deltaY + e.deltaX > 0) {
      next();
    } else if (e.deltaY + e.deltaX < 0) {
      previous();
    }
  }
  let touchStartX = 0;
  let touchStartY = 0;
  function onTouchStart(e) {
    if (!isPresenting || e.touches.length === 0) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
  function onTouchEnd(e) {
    if (!isPresenting || e.changedTouches.length === 0) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    if (Math.abs(deltaX) > 50 || Math.abs(deltaY) > 50) {
      e.preventDefault();
      e.stopPropagation();
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < 0) next();
        else previous();
      } else {
        if (deltaY < 0) next();
        else previous();
      }
    }
  }
  function onFullscreenChange() {
    if (isPresenting && !document.fullscreenElement) {
      exit();
    }
  }
  async function enter() {
    if (isPresenting) return;
    if (slides.length === 0) return;
    isPresenting = true;
    hasSyncedInitialState = false;
    originalScrollY = window.scrollY;
    let bestIndex = 0;
    let minDistance = Infinity;
    slides.forEach((slide, index) => {
      const rect = slide.getBoundingClientRect();
      const distance = Math.abs(rect.top) + Math.abs(rect.left);
      if (distance < minDistance) {
        minDistance = distance;
        bestIndex = index;
      }
    });
    currentIndex = bestIndex;
    originalDimensions = slides.map((slide) => {
      const rect = slide.getBoundingClientRect();
      return {
        width: rect.width || window.innerWidth,
        height: rect.height || window.innerHeight
      };
    });
    transformedAncestorStates = collectTransformedAncestors(slides);
    document.documentElement.classList.add("clickdeck-presenting");
    neutralizeTransformedAncestors(transformedAncestorStates);
    document.addEventListener("keydown", onKeyDown, { capture: true });
    document.addEventListener("click", onDocumentClick, { capture: true });
    document.addEventListener("wheel", onWheel, { capture: true, passive: false });
    document.addEventListener("touchstart", onTouchStart, { capture: true, passive: false });
    document.addEventListener("touchend", onTouchEnd, { capture: true, passive: false });
    document.addEventListener("fullscreenchange", onFullscreenChange);
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      logger.warn("Could not request fullscreen", err);
    }
    goTo(currentIndex, "initial");
    logger.info("Entered presentation mode", { slideCount: slides.length });
  }
  function exit() {
    if (!isPresenting) return;
    isPresenting = false;
    document.documentElement.classList.remove("clickdeck-presenting");
    restoreTransformedAncestors(transformedAncestorStates);
    transformedAncestorStates = [];
    slides.forEach((slide) => {
      slide.classList.remove("clickdeck-presenting-slide");
      slide.classList.remove("clickdeck-presentation-hidden-slide");
      slide.style.removeProperty("--clickdeck-present-scale");
    });
    document.removeEventListener("keydown", onKeyDown, { capture: true });
    document.removeEventListener("click", onDocumentClick, { capture: true });
    document.removeEventListener("wheel", onWheel, { capture: true });
    document.removeEventListener("touchstart", onTouchStart, { capture: true });
    document.removeEventListener("touchend", onTouchEnd, { capture: true });
    document.removeEventListener("fullscreenchange", onFullscreenChange);
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch((err) => {
        logger.warn("Could not exit fullscreen", err);
      });
    }
    window.scrollTo({ top: originalScrollY, behavior: "auto" });
    logger.info("Exited presentation mode");
  }
  function destroy() {
    exit();
  }
  return { enter, exit, next, previous, goTo, destroy };
}
function collectTransformedAncestors(slides) {
  const states = /* @__PURE__ */ new Map();
  for (const slide of slides) {
    let current = slide.parentElement;
    while (current && current !== document.body && current !== document.documentElement) {
      const computed = window.getComputedStyle(current);
      const createsFixedContainingBlock = computed.transform !== "none" || computed.perspective !== "none" || computed.filter !== "none";
      if (createsFixedContainingBlock && !states.has(current)) {
        states.set(current, current.getAttribute("style"));
      }
      current = current.parentElement;
    }
  }
  return Array.from(states.entries()).map(([element, style]) => ({ element, style }));
}
function neutralizeTransformedAncestors(states) {
  for (const { element } of states) {
    element.style.transform = "none";
    element.style.perspective = "none";
    element.style.filter = "none";
  }
}
function restoreTransformedAncestors(states) {
  for (const { element, style } of states) {
    if (style === null) {
      element.removeAttribute("style");
    } else {
      element.setAttribute("style", style);
    }
  }
}

// src/content/presentation-diagnostics.ts
function truncateText(text, maxLength) {
  const t2 = (text || "").trim();
  if (t2.length <= maxLength) return t2;
  return t2.slice(0, maxLength) + "...";
}
function getSlideDetection(root = document) {
  let mode = "none";
  let slides = [];
  let trySlides = Array.from(root.querySelectorAll(".slide"));
  if (trySlides.length >= 2) {
    mode = ".slide";
    slides = trySlides;
  } else {
    trySlides = Array.from(root.querySelectorAll("[data-slide]"));
    if (trySlides.length >= 2) {
      mode = "[data-slide]";
      slides = trySlides;
    } else {
      trySlides = Array.from(root.querySelectorAll('[aria-roledescription="slide"]'));
      if (trySlides.length >= 2) {
        mode = '[aria-roledescription="slide"]';
        slides = trySlides;
      } else {
        trySlides = Array.from(root.querySelectorAll(".deck > section"));
        if (trySlides.length >= 2) {
          mode = ".deck > section";
          slides = trySlides;
        } else {
          trySlides = Array.from(root.querySelectorAll("main > section"));
          if (trySlides.length >= 2) {
            const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 600;
            const threshold = viewportHeight * 0.75;
            const allTall = trySlides.every((s) => s.clientHeight >= threshold);
            if (allTall) {
              mode = "main > section";
              slides = trySlides;
            }
          }
        }
      }
    }
  }
  return {
    count: slides.length,
    mode,
    slides: slides.map((s, idx) => ({
      index: idx,
      tagName: s.tagName.toLowerCase(),
      id: s.id,
      className: s.className,
      textSnippet: truncateText(s.textContent || "", 80)
    }))
  };
}
function getElementInfo(element) {
  const computed = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const hasNonZeroRect = rect.width > 0 && rect.height > 0;
  const isInViewport = rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0;
  const hiddenReasons = [];
  if (computed.display === "none") hiddenReasons.push("display-none");
  if (computed.visibility === "hidden") hiddenReasons.push("visibility-hidden");
  if (parseFloat(computed.opacity) < 0.01) hiddenReasons.push("opacity-zero");
  if (!hasNonZeroRect) hiddenReasons.push("zero-size");
  if (hasNonZeroRect && !isInViewport) hiddenReasons.push("outside-viewport");
  if (element.classList.contains("clickdeck-presentation-hidden-slide")) hiddenReasons.push("clickdeck-hidden-class");
  if (element.getAttribute("aria-hidden") === "true") hiddenReasons.push("aria-hidden");
  if (element.hasAttribute("hidden")) hiddenReasons.push("hidden-attribute");
  const isProbablyVisible = hasNonZeroRect && isInViewport && computed.display !== "none" && computed.visibility !== "hidden" && parseFloat(computed.opacity) >= 0.01 && !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true";
  return {
    tagName: element.tagName.toLowerCase(),
    id: element.id,
    className: element.className,
    textSnippet: truncateText(element.textContent || "", 80),
    computed: {
      display: computed.display,
      visibility: computed.visibility,
      opacity: computed.opacity,
      transform: computed.transform,
      position: computed.position,
      zIndex: computed.zIndex,
      pointerEvents: computed.pointerEvents
    },
    rect: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left
    },
    isInViewport,
    hasNonZeroRect,
    isProbablyVisible,
    hiddenReasons
  };
}
function collectPresentationDiagnostics(options) {
  const maxText = options?.maxTextLength || 80;
  const maxCandidates = options?.maxContentCandidates || 8;
  const w = window;
  const hostCapabilities = {
    hasPlaySlideHook: typeof w.__playSlide === "function",
    hasClickDeckSyncProtocol: typeof w.__clickdeckSyncPresentationState === "function",
    hasRevealSlide: typeof w.Reveal?.slide === "function",
    hasRevealSync: typeof w.Reveal?.sync === "function",
    hasRevealLayout: typeof w.Reveal?.layout === "function",
    hasImpress: typeof w.impress === "function",
    hasNavDots: false,
    navDotCount: 0,
    hasCurrentSlideCounter: !!document.getElementById("currentSlide"),
    hasTotalSlidesCounter: !!document.getElementById("totalSlides")
  };
  const navDots = Array.from(document.querySelectorAll("#nav .dot, .nav-dot, .nav-dots .nav-dot"));
  hostCapabilities.hasNavDots = navDots.length > 0;
  hostCapabilities.navDotCount = navDots.length;
  const slideDetection = getSlideDetection();
  const allDetectedSlides = slideDetection.mode === "none" ? [] : Array.from(document.querySelectorAll(slideDetection.mode));
  let presentingIndex = null;
  const activeIndexes = [];
  const prevIndexes = [];
  const hiddenByClickDeckIndexes = [];
  allDetectedSlides.forEach((slide, idx) => {
    if (slide.classList.contains("clickdeck-presenting-slide")) presentingIndex = idx;
    if (slide.classList.contains("active")) activeIndexes.push(idx);
    if (slide.classList.contains("prev")) prevIndexes.push(idx);
    if (slide.classList.contains("clickdeck-presentation-hidden-slide")) hiddenByClickDeckIndexes.push(idx);
  });
  const navActiveIndexes = [];
  navDots.forEach((dot, idx) => {
    if (dot.classList.contains("active") || dot.getAttribute("aria-current") === "true") {
      navActiveIndexes.push(idx);
    }
  });
  let targetSlideNode = null;
  if (presentingIndex !== null && allDetectedSlides[presentingIndex]) {
    targetSlideNode = allDetectedSlides[presentingIndex];
  } else if (activeIndexes.length > 0 && allDetectedSlides[activeIndexes[0]]) {
    targetSlideNode = allDetectedSlides[activeIndexes[0]];
  } else if (allDetectedSlides.length > 0) {
    targetSlideNode = allDetectedSlides[0];
  }
  const contentCandidates = [];
  if (targetSlideNode) {
    const candElements = Array.from(
      targetSlideNode.querySelectorAll(
        "h1, h2, h3, p, li, img, svg, canvas, [data-anim], [data-motion], .content, .card, .panel, .text, .title"
      )
    ).slice(0, maxCandidates);
    for (const el of candElements) {
      const info = getElementInfo(el);
      info.textSnippet = truncateText(info.textSnippet, maxText);
      contentCandidates.push(info);
    }
  }
  const snapshot = {
    capturedAt: (/* @__PURE__ */ new Date()).toISOString(),
    presentingSlideIndex: presentingIndex,
    activeSlideIndexes: activeIndexes,
    prevSlideIndexes: prevIndexes,
    hiddenByClickDeckIndexes,
    navActiveIndexes,
    currentSlideCounterText: document.getElementById("currentSlide")?.textContent || null,
    totalSlidesCounterText: document.getElementById("totalSlides")?.textContent || null,
    currentSlide: targetSlideNode ? getElementInfo(targetSlideNode) : null,
    contentCandidates
  };
  if (snapshot.currentSlide) {
    snapshot.currentSlide.textSnippet = truncateText(snapshot.currentSlide.textSnippet, maxText);
  }
  return {
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    page: {
      url: window.location.href,
      title: document.title,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      isClickDeckPresenting: document.documentElement.classList.contains("clickdeck-presenting")
    },
    slideDetection,
    hostCapabilities,
    snapshots: [snapshot]
  };
}

// src/adapters/capture.ts
async function captureViewportMock() {
  const img = new Image();
  img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  return img;
}

// src/export/utils.ts
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function waitForVisualStability(baseWaitMs = 300) {
  await wait(baseWaitMs);
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
    }
  }
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}
async function waitForExportReadiness(baseWaitMs = 300) {
  await waitForVisualStability(baseWaitMs);
  const pendingImages = Array.from(document.images).filter((image) => !image.complete);
  if (pendingImages.length === 0) {
    return;
  }
  await Promise.allSettled(pendingImages.map((image) => waitForImageReady(image)));
  await waitForVisualStability(0);
}
async function waitForImageReady(image) {
  const imageReady = typeof image.decode === "function" ? image.decode() : new Promise((resolve) => {
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => resolve(), { once: true });
  });
  await Promise.race([
    imageReady.catch(() => void 0),
    wait(1500)
  ]);
}
function detectScrollTarget() {
  const windowOriginalScrollY = window.scrollY;
  const windowScrollTarget = {
    element: window,
    getScrollTop: () => window.scrollY,
    setScrollTop: (value) => window.scrollTo(0, value),
    getScrollHeight: () => document.documentElement.scrollHeight,
    getClientHeight: () => window.innerHeight,
    getClientWidth: () => window.innerWidth,
    restore: () => {
      window.scrollTo(0, windowOriginalScrollY);
    }
  };
  if (document.documentElement.scrollHeight > window.innerHeight + 2) {
    return windowScrollTarget;
  }
  const candidateSelectors = [".deck", "[data-deck]", ".slides", ".reveal .slides", "main"];
  for (const selector of candidateSelectors) {
    const el = document.querySelector(selector);
    if (el && el.scrollHeight > el.clientHeight + 2) {
      const originalScrollTop = el.scrollTop;
      return {
        element: el,
        getScrollTop: () => el.scrollTop,
        setScrollTop: (value) => {
          el.scrollTop = value;
        },
        getScrollHeight: () => el.scrollHeight,
        getClientHeight: () => el.clientHeight,
        getClientWidth: () => el.clientWidth,
        restore: () => {
          el.scrollTop = originalScrollTop;
        }
      };
    }
  }
  let bestCandidate = null;
  const elements = document.body.querySelectorAll("*");
  for (const el of elements) {
    if (el.scrollHeight > el.clientHeight + 2) {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") {
        if (!bestCandidate || el.clientWidth * el.clientHeight > bestCandidate.clientWidth * bestCandidate.clientHeight) {
          bestCandidate = el;
        }
      }
    }
  }
  if (bestCandidate) {
    const el = bestCandidate;
    const originalScrollTop = el.scrollTop;
    return {
      element: el,
      getScrollTop: () => el.scrollTop,
      setScrollTop: (value) => {
        el.scrollTop = value;
      },
      getScrollHeight: () => el.scrollHeight,
      getClientHeight: () => el.clientHeight,
      getClientWidth: () => el.clientWidth,
      restore: () => {
        el.scrollTop = originalScrollTop;
      }
    };
  }
  return windowScrollTarget;
}
async function throttledCaptureViewport(logger) {
  try {
    const img = await captureViewportMock();
    return img;
  } catch (err) {
    logger.error("Capture failed", { error: String(err) });
    throw err;
  }
}

// src/export/long-image.ts
var MAX_CANVAS_PIXELS = 8e7;
function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.dataset.clickdeck = "true";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
function canvasToBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to encode long image canvas"));
        return;
      }
      resolve(blob);
    }, type);
  });
}
function downloadBlob(blob, filename) {
  if (!URL.createObjectURL) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        downloadDataUrl(reader.result, filename);
      }
    };
    reader.readAsDataURL(blob);
    return;
  }
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.dataset.clickdeck = "true";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1e3);
}
async function exportLongImageSnapshot(logger) {
  logger.info("Long image export started");
  const scrollTarget = detectScrollTarget();
  logger.info("Scroll target detected");
  try {
    document.documentElement.classList.add("clickdeck-exporting");
    await waitForExportReadiness(100);
    const viewportHeight = scrollTarget.getClientHeight();
    const viewportWidth = scrollTarget.getClientWidth();
    const totalHeight = scrollTarget.getScrollHeight();
    const dpr = window.devicePixelRatio || 1;
    if (viewportWidth * dpr * totalHeight * dpr > MAX_CANVAS_PIXELS) {
      logger.warn("Long image canvas exceeds MAX_CANVAS_PIXELS, aborting export");
      alert("\u5F53\u524D\u9875\u9762\u8FC7\u957F\uFF0C\u957F\u56FE\u5BFC\u51FA\u53EF\u80FD\u5BFC\u81F4\u6D4F\u89C8\u5668\u5361\u6B7B\u3002\u8BF7\u6539\u7528\u56FE\u7247 PDF A4\uFF0C\u6216\u7F29\u5C0F\u6D4F\u89C8\u5668\u7F29\u653E\u6BD4\u4F8B\u540E\u91CD\u8BD5\u3002");
      return;
    }
    const screenshots = [];
    let currentY = 0;
    while (currentY < totalHeight) {
      scrollTarget.setScrollTop(currentY);
      await waitForExportReadiness(300);
      const img = await throttledCaptureViewport(logger);
      const actualY = scrollTarget.getScrollTop();
      screenshots.push({ img, y: actualY });
      logger.info(`Captured fragment at Y=${actualY}`);
      currentY += viewportHeight;
      if (actualY + viewportHeight >= totalHeight) {
        break;
      }
    }
    logger.info("Stitching started");
    const canvas = document.createElement("canvas");
    canvas.width = viewportWidth * dpr;
    canvas.height = totalHeight * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2d context for stitching canvas");
    }
    for (const { img, y } of screenshots) {
      ctx.drawImage(img, 0, y * dpr, viewportWidth * dpr, viewportHeight * dpr);
    }
    logger.info("Encoding long image");
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const filename = `clickdeck-long-image-${timestamp}.png`;
    const blob = await canvasToBlob(canvas, "image/png");
    logger.info("Download triggered");
    downloadBlob(blob, filename);
    logger.info("Long image export successful");
  } catch (error) {
    logger.error("Long image export failed", { error: error instanceof Error ? error.message : String(error) });
    alert(`\u957F\u56FE\u5BFC\u51FA\u5931\u8D25\uFF1A${error instanceof Error ? error.message : String(error)}`);
  } finally {
    document.documentElement.classList.remove("clickdeck-exporting");
    scrollTarget.restore();
  }
}

// src/export/simple-image-pdf.ts
var encoder = new TextEncoder();
function ascii(value) {
  return encoder.encode(value);
}
function concatChunks(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}
function dataUrlToBytes(dataUrl) {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) {
    throw new Error("Invalid image data URL");
  }
  const header = dataUrl.slice(0, commaIndex).toLowerCase();
  if (!header.startsWith("data:image/jpeg") && !header.startsWith("data:image/jpg")) {
    throw new Error("Only JPEG image data URLs can be embedded into ClickDeck PDF");
  }
  const payload = dataUrl.slice(commaIndex + 1);
  const binary = header.includes(";base64") ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
function normalizeSize(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }
  return Math.max(1, Math.round(value));
}
function pdfNumber(value) {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return Number.parseFloat(value.toFixed(3)).toString();
}
var SimpleImagePdf = class {
  constructor() {
    this.pages = [];
  }
  addPage(width, height) {
    this.pages.push({
      width: normalizeSize(width),
      height: normalizeSize(height),
      images: []
    });
    return this.pages.length - 1;
  }
  addJpegImage(pageIndex, dataUrl, options) {
    const page = this.pages[pageIndex];
    if (!page) {
      throw new Error("PDF page does not exist");
    }
    page.images.push({
      data: dataUrlToBytes(dataUrl),
      pixelWidth: normalizeSize(options.pixelWidth),
      pixelHeight: normalizeSize(options.pixelHeight),
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height
    });
  }
  toBlob() {
    if (this.pages.length === 0) {
      throw new Error("Cannot save an empty PDF");
    }
    const objects = [];
    const catalogId = 1;
    const pagesId = 2;
    let nextObjectId = 3;
    const pageObjectIds = [];
    const pageData = this.pages.map((page) => {
      const pageId = nextObjectId++;
      const contentId = nextObjectId++;
      const imageIds = page.images.map(() => nextObjectId++);
      pageObjectIds.push(pageId);
      return { page, pageId, contentId, imageIds };
    });
    objects[catalogId] = ascii(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    objects[pagesId] = ascii(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`);
    for (const data of pageData) {
      const xObjectEntries = data.imageIds.map((id, index) => `/Im${index + 1} ${id} 0 R`).join(" ");
      objects[data.pageId] = ascii([
        "<<",
        "/Type /Page",
        `/Parent ${pagesId} 0 R`,
        `/MediaBox [0 0 ${pdfNumber(data.page.width)} ${pdfNumber(data.page.height)}]`,
        `/Resources << /XObject << ${xObjectEntries} >> >>`,
        `/Contents ${data.contentId} 0 R`,
        ">>"
      ].join(" "));
      const commands = data.page.images.map((image, index) => {
        const drawY = data.page.height - image.y - image.height;
        return [
          "q",
          `${pdfNumber(image.width)} 0 0 ${pdfNumber(image.height)} ${pdfNumber(image.x)} ${pdfNumber(drawY)} cm`,
          `/Im${index + 1} Do`,
          "Q"
        ].join("\n");
      }).join("\n");
      const content = ascii(commands);
      objects[data.contentId] = concatChunks([
        ascii(`<< /Length ${content.length} >>
stream
`),
        content,
        ascii("\nendstream")
      ]);
      data.page.images.forEach((image, index) => {
        const imageId = data.imageIds[index];
        objects[imageId] = concatChunks([
          ascii([
            "<<",
            "/Type /XObject",
            "/Subtype /Image",
            `/Width ${image.pixelWidth}`,
            `/Height ${image.pixelHeight}`,
            "/ColorSpace /DeviceRGB",
            "/BitsPerComponent 8",
            "/Filter /DCTDecode",
            `/Length ${image.data.length}`,
            ">>",
            "stream\n"
          ].join(" ")),
          image.data,
          ascii("\nendstream")
        ]);
      });
    }
    const chunks = [ascii("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
    const offsets = [0];
    let offset = chunks[0].length;
    for (let id = 1; id < objects.length; id++) {
      const objectBody = objects[id];
      if (!objectBody) {
        continue;
      }
      offsets[id] = offset;
      const objectChunk = concatChunks([
        ascii(`${id} 0 obj
`),
        objectBody,
        ascii("\nendobj\n")
      ]);
      chunks.push(objectChunk);
      offset += objectChunk.length;
    }
    const xrefOffset = offset;
    const xrefRows = ["xref", `0 ${objects.length}`, "0000000000 65535 f "];
    for (let id = 1; id < objects.length; id++) {
      xrefRows.push(`${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n `);
    }
    chunks.push(ascii(`${xrefRows.join("\n")}
`));
    chunks.push(ascii([
      "trailer",
      `<< /Size ${objects.length} /Root ${catalogId} 0 R >>`,
      "startxref",
      String(xrefOffset),
      "%%EOF"
    ].join("\n")));
    const pdfBytes = concatChunks(chunks);
    const pdfBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
    return new Blob([pdfBuffer], { type: "application/pdf" });
  }
};
function imageElementToJpegDataUrl(img, quality = 0.9) {
  const pixelWidth = normalizeSize(img.naturalWidth || img.width);
  const pixelHeight = normalizeSize(img.naturalHeight || img.height);
  const canvas = document.createElement("canvas");
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2d context for PDF image conversion");
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, pixelWidth, pixelHeight);
  ctx.drawImage(img, 0, 0, pixelWidth, pixelHeight);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  canvas.width = 0;
  canvas.height = 0;
  return { dataUrl, pixelWidth, pixelHeight };
}
function downloadPdfBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.dataset.clickdeck = "true";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1e3);
}

// src/export/image-pdf.ts
var LONG_PAGE_MAX_HEIGHT = 14400;
async function exportImagePdfLongSnapshot(logger) {
  const scrollTarget = detectScrollTarget();
  try {
    document.documentElement.classList.add("clickdeck-exporting");
    await waitForExportReadiness(100);
    const viewportHeight = scrollTarget.getClientHeight();
    const viewportWidth = scrollTarget.getClientWidth();
    const totalHeight = scrollTarget.getScrollHeight();
    if (totalHeight > LONG_PAGE_MAX_HEIGHT) {
      alert("\u5F53\u524D\u7F51\u9875\u603B\u9AD8\u5EA6\u8D85\u8FC7\u63A8\u8350\u9608\u503C\uFF0C\u56FE\u7247 PDF \u53EF\u80FD\u65E0\u6CD5\u88AB\u90E8\u5206\u9605\u8BFB\u5668\u6253\u5F00\u6216\u5BFC\u81F4\u5185\u5B58\u6EA2\u51FA\u3002\u5EFA\u8BAE\u6539\u7528 A4 \u5206\u9875\u6A21\u5F0F\u5BFC\u51FA\u3002");
    }
    const pdf = new SimpleImagePdf();
    const pageIndex = pdf.addPage(viewportWidth, totalHeight);
    let currentY = 0;
    while (currentY < totalHeight) {
      scrollTarget.setScrollTop(currentY);
      await waitForExportReadiness(300);
      const img = await throttledCaptureViewport(logger);
      const actualY = scrollTarget.getScrollTop();
      const jpeg = imageElementToJpegDataUrl(img);
      pdf.addJpegImage(pageIndex, jpeg.dataUrl, {
        pixelWidth: jpeg.pixelWidth,
        pixelHeight: jpeg.pixelHeight,
        x: 0,
        y: actualY,
        width: viewportWidth,
        height: viewportHeight
      });
      logger.info(`Appended screen fragment to PDF at Y=${actualY}`);
      currentY += viewportHeight;
      if (actualY + viewportHeight >= totalHeight) {
        break;
      }
    }
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    downloadPdfBlob(pdf.toBlob(), `clickdeck-image-long-${timestamp}.pdf`);
    logger.info("Image PDF Long export successful");
  } catch (error) {
    logger.error("Image PDF Long export failed", { error: error instanceof Error ? error.message : String(error) });
  } finally {
    document.documentElement.classList.remove("clickdeck-exporting");
    scrollTarget.restore();
  }
}
async function exportImagePdfA4Snapshot(logger) {
  const scrollTarget = detectScrollTarget();
  try {
    document.documentElement.classList.add("clickdeck-exporting");
    await waitForExportReadiness(100);
    const viewportHeight = scrollTarget.getClientHeight();
    const viewportWidth = scrollTarget.getClientWidth();
    const totalHeight = scrollTarget.getScrollHeight();
    const dpr = window.devicePixelRatio || 1;
    const a4Height = viewportWidth * 1.414;
    const pdf = new SimpleImagePdf();
    const a4Canvas = document.createElement("canvas");
    a4Canvas.width = viewportWidth * dpr;
    a4Canvas.height = a4Height * dpr;
    const ctx = a4Canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2d context");
    }
    let currentY = 0;
    let currentA4Page = 0;
    let pageHasContent = false;
    const clearPageCanvas = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, a4Canvas.width, a4Canvas.height);
    };
    const appendCurrentPage = () => {
      if (!pageHasContent) {
        return;
      }
      const pageDataUrl = a4Canvas.toDataURL("image/jpeg", 0.9);
      const pageIndex = pdf.addPage(viewportWidth, a4Height);
      pdf.addJpegImage(pageIndex, pageDataUrl, {
        pixelWidth: a4Canvas.width,
        pixelHeight: a4Canvas.height,
        x: 0,
        y: 0,
        width: viewportWidth,
        height: a4Height
      });
      logger.info(`Appended A4 page ${currentA4Page + 1} to PDF`);
      currentA4Page++;
      pageHasContent = false;
      clearPageCanvas();
    };
    clearPageCanvas();
    while (currentY < totalHeight) {
      scrollTarget.setScrollTop(currentY);
      await waitForExportReadiness(300);
      const img = await throttledCaptureViewport(logger);
      const actualY = scrollTarget.getScrollTop();
      const fragmentBottom = actualY + viewportHeight;
      let fragmentCursor = actualY;
      while (fragmentCursor < fragmentBottom) {
        const pageTop = currentA4Page * a4Height;
        const pageBottom = pageTop + a4Height;
        if (fragmentCursor >= pageBottom) {
          appendCurrentPage();
          continue;
        }
        const yOffsetInCanvas = actualY - pageTop;
        ctx.drawImage(img, 0, yOffsetInCanvas * dpr, viewportWidth * dpr, viewportHeight * dpr);
        pageHasContent = true;
        fragmentCursor = Math.min(fragmentBottom, pageBottom);
      }
      currentY += viewportHeight;
      if (actualY + viewportHeight >= totalHeight) {
        break;
      }
    }
    appendCurrentPage();
    a4Canvas.width = 0;
    a4Canvas.height = 0;
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    downloadPdfBlob(pdf.toBlob(), `clickdeck-image-a4-${timestamp}.pdf`);
    logger.info("Image PDF A4 export successful");
  } catch (error) {
    logger.error("Image PDF A4 export failed", { error: error instanceof Error ? error.message : String(error) });
  } finally {
    document.documentElement.classList.remove("clickdeck-exporting");
    scrollTarget.restore();
  }
}
async function exportImagePdfSlidesSnapshot(logger) {
  const originalScrollX = window.scrollX;
  const originalScrollY = window.scrollY;
  const originalScale = document.documentElement.style.getPropertyValue("--clickdeck-present-scale");
  let slideStates = [];
  let transformedAncestorStates = [];
  try {
    const slides = detectPresentationSlides();
    if (slides.length === 0) {
      alert("No slides detected on this page.");
      return;
    }
    slideStates = slides.map((slide) => ({
      slide,
      className: slide.className,
      style: slide.getAttribute("style")
    }));
    const slideSizes = slides.map((slide) => {
      const rect = slide.getBoundingClientRect();
      return {
        width: rect.width || window.innerWidth,
        height: rect.height || window.innerHeight
      };
    });
    transformedAncestorStates = collectTransformedAncestors2(slides);
    document.documentElement.classList.add("clickdeck-exporting", "clickdeck-presenting");
    neutralizeTransformedAncestors2(transformedAncestorStates);
    window.scrollTo(0, 0);
    await waitForExportReadiness(100);
    const dpr = window.devicePixelRatio || 1;
    const pdfWidth = 1920;
    const pdfHeight = 1080;
    const pdf = new SimpleImagePdf();
    let isFirstPage = true;
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const slideSize = slideSizes[i];
      const scale = Math.min(window.innerWidth / slideSize.width, window.innerHeight / slideSize.height, 1);
      document.documentElement.style.setProperty("--clickdeck-present-scale", String(scale));
      for (const candidate of slides) {
        candidate.classList.toggle("clickdeck-presenting-slide", candidate === slide);
        candidate.classList.toggle("clickdeck-presentation-hidden-slide", candidate !== slide);
      }
      syncPresentationHostState({
        slides,
        index: i,
        direction: i === 0 ? "initial" : "next",
        logger
      });
      await waitForExportReadiness(300);
      const img = await throttledCaptureViewport(logger);
      const cropTarget = slide.querySelector("[data-slide-content], .sheet, .slide-content, .page, .card") || slide;
      const rect = cropTarget.getBoundingClientRect();
      const cropX = Math.max(0, rect.left);
      const cropY = Math.max(0, rect.top);
      const cropWidth = Math.min(window.innerWidth - cropX, rect.width);
      const cropHeight = Math.min(window.innerHeight - cropY, rect.height);
      if (cropWidth <= 0 || cropHeight <= 0) {
        logger.warn(`Slide ${i + 1} content is not visible, skipping.`);
        continue;
      }
      const canvas = document.createElement("canvas");
      canvas.width = cropWidth * dpr;
      canvas.height = cropHeight * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get 2d context");
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        img,
        cropX * dpr,
        cropY * dpr,
        cropWidth * dpr,
        cropHeight * dpr,
        0,
        0,
        cropWidth * dpr,
        cropHeight * dpr
      );
      const slideDataUrl = canvas.toDataURL("image/jpeg", 0.9);
      isFirstPage = false;
      const drawScale = Math.min(pdfWidth / cropWidth, pdfHeight / cropHeight);
      const drawWidth = cropWidth * drawScale;
      const drawHeight = cropHeight * drawScale;
      const drawX = (pdfWidth - drawWidth) / 2;
      const drawY = (pdfHeight - drawHeight) / 2;
      const pageIndex = pdf.addPage(pdfWidth, pdfHeight);
      pdf.addJpegImage(pageIndex, slideDataUrl, {
        pixelWidth: canvas.width,
        pixelHeight: canvas.height,
        x: drawX,
        y: drawY,
        width: drawWidth,
        height: drawHeight
      });
      logger.info(`Appended slide ${i + 1} to PDF`);
      canvas.width = 0;
      canvas.height = 0;
    }
    if (isFirstPage) {
      alert("No visible slide content was captured.");
      logger.warn("Image PDF Slides export captured no visible slides.");
      return;
    }
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    downloadPdfBlob(pdf.toBlob(), `clickdeck-image-slides-${timestamp}.pdf`);
    logger.info("Image PDF Slides export successful");
  } catch (error) {
    logger.error("Image PDF Slides export failed", { error: error instanceof Error ? error.message : String(error) });
  } finally {
    document.documentElement.classList.remove("clickdeck-exporting", "clickdeck-presenting");
    if (originalScale) {
      document.documentElement.style.setProperty("--clickdeck-present-scale", originalScale);
    } else {
      document.documentElement.style.removeProperty("--clickdeck-present-scale");
    }
    restoreSlideStates(slideStates);
    restoreTransformedAncestors2(transformedAncestorStates);
    window.scrollTo(originalScrollX, originalScrollY);
  }
}
function collectTransformedAncestors2(slides) {
  const states = /* @__PURE__ */ new Map();
  for (const slide of slides) {
    let current = slide.parentElement;
    while (current && current !== document.body && current !== document.documentElement) {
      const computed = window.getComputedStyle(current);
      const createsFixedContainingBlock = computed.transform !== "none" || computed.perspective !== "none" || computed.filter !== "none";
      if (createsFixedContainingBlock && !states.has(current)) {
        states.set(current, current.getAttribute("style"));
      }
      current = current.parentElement;
    }
  }
  return Array.from(states.entries()).map(([element, style]) => ({ element, style }));
}
function neutralizeTransformedAncestors2(states) {
  for (const { element } of states) {
    element.style.transform = "none";
    element.style.perspective = "none";
    element.style.filter = "none";
  }
}
function restoreTransformedAncestors2(states) {
  for (const { element, style } of states) {
    if (style === null) {
      element.removeAttribute("style");
    } else {
      element.setAttribute("style", style);
    }
  }
}
function restoreSlideStates(states) {
  for (const { slide, className, style } of states) {
    slide.className = className;
    if (style === null) {
      slide.removeAttribute("style");
    } else {
      slide.setAttribute("style", style);
    }
  }
}

// src/content/intent-overlay.ts
function createIntentOverlay(rootId2, onComplete, onCancel, hintText) {
  const root = document.createElement("div");
  root.id = rootId2;
  root.dataset.clickdeck = "true";
  Object.assign(root.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    cursor: "crosshair",
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    // Light dim
    userSelect: "none"
  });
  const hint = document.createElement("div");
  Object.assign(hint.style, {
    position: "absolute",
    left: "50%",
    top: "16px",
    transform: "translateX(-50%)",
    background: "rgba(0,0,0,0.75)",
    color: "#fff",
    padding: "8px 16px",
    borderRadius: "20px",
    fontSize: "14px",
    fontFamily: "sans-serif",
    pointerEvents: "none"
  });
  hint.textContent = hintText;
  root.appendChild(hint);
  const outline = document.createElement("div");
  Object.assign(outline.style, {
    position: "absolute",
    border: "2px dashed #3b82f6",
    // Blue dashed
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    // Light blue fill
    display: "none",
    pointerEvents: "none"
  });
  root.appendChild(outline);
  let startX = 0;
  let startY = 0;
  let isDrawing = false;
  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    isDrawing = true;
    startX = e.clientX;
    startY = e.clientY;
    outline.style.display = "block";
    outline.style.left = `${startX}px`;
    outline.style.top = `${startY}px`;
    outline.style.width = "0px";
    outline.style.height = "0px";
  };
  const onMouseMove = (e) => {
    if (!isDrawing) return;
    const currentX = e.clientX;
    const currentY = e.clientY;
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    outline.style.left = `${left}px`;
    outline.style.top = `${top}px`;
    outline.style.width = `${width}px`;
    outline.style.height = `${height}px`;
  };
  const onMouseUp = (e) => {
    if (!isDrawing) return;
    isDrawing = false;
    const currentX = e.clientX;
    const currentY = e.clientY;
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    if (width > 10 && height > 10) {
      onComplete({ left, top, width, height, right: left + width, bottom: top + height });
    } else {
      onCancel();
    }
  };
  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      onCancel();
    }
  };
  root.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("keydown", onKeyDown);
  document.documentElement.appendChild(root);
  return {
    root,
    destroy: () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown);
      root.remove();
    }
  };
}

// src/content/intent-draft-panel.ts
var STYLE_ID2 = "clickdeck-intent-draft-style";
function createIntentDraftPanel(onSave, onCancel, onDelete, onHighlight, _onDrawTarget, onDragTarget, onActionChange) {
  injectBaseStyles2();
  const labels = getPanelLabels();
  const element = document.createElement("div");
  element.className = "clickdeck-intent-draft clickdeck-intent-draft--hidden";
  element.dataset.clickdeck = "true";
  element.innerHTML = `
    <button class="clickdeck-intent-draft__rail" type="button" aria-label="${labels.intentSection}">
      <span class="clickdeck-intent-draft__tabs"></span>
    </button>
    <div class="clickdeck-intent-draft__sheet">
      <div class="clickdeck-intent-draft__sheet-header">
        <span class="clickdeck-intent-draft__sheet-title">${labels.intentSection}</span>
        <button class="clickdeck-button clickdeck-button--icon clickdeck-intent-draft__collapse" type="button" aria-label="${labels.collapse}" title="${labels.collapse}">\u21E4</button>
      </div>
    </div>
  `;
  const rail = element.querySelector(".clickdeck-intent-draft__rail");
  const tabs = element.querySelector(".clickdeck-intent-draft__tabs");
  const sheet = element.querySelector(".clickdeck-intent-draft__sheet");
  const collapseButton = element.querySelector(".clickdeck-intent-draft__collapse");
  const cardsContainer = document.createElement("div");
  cardsContainer.className = "clickdeck-intent-draft__cards";
  sheet.appendChild(cardsContainer);
  const cards = /* @__PURE__ */ new Map();
  let expanded = true;
  let manuallyHidden = false;
  let currentLayout = null;
  function createCardDOM(operation, color = "#3b82f6", preSaved = false) {
    const card = document.createElement("div");
    card.className = "clickdeck-intent-draft__card";
    card.style.setProperty("--clickdeck-intent-color", color);
    card.innerHTML = `
      <div class="clickdeck-intent-draft__editing" style="display: flex;">
        <textarea class="clickdeck-intent-draft__textarea" placeholder="${labels.intentPlaceholder}"></textarea>
        <div class="clickdeck-intent-draft__target-actions" style="display: flex; gap: 8px;">
          <button class="clickdeck-button clickdeck-button--outline clickdeck-intent-draft__target-btn" type="button">
            ${labels.intentMoveTo}
          </button>
          <button class="clickdeck-button clickdeck-button--outline clickdeck-intent-draft__remove-btn" type="button">
            ${labels.intentMarkRemoval}
          </button>
        </div>
        <div class="clickdeck-intent-draft__actions">
          <button class="clickdeck-button clickdeck-button--outline" data-action="cancel" type="button">${labels.cancel}</button>
          <button class="clickdeck-button clickdeck-button--primary" data-action="save" type="button">${labels.save}</button>
        </div>
      </div>
      <div class="clickdeck-intent-draft__saved" style="display: none;">
        <div class="clickdeck-intent-draft__saved-content">
          <span class="clickdeck-intent-draft__saved-action"></span>
          <span class="clickdeck-intent-draft__saved-text"></span>
        </div>
        <button class="clickdeck-button clickdeck-button--icon clickdeck-button--danger" data-action="delete" type="button" title="${labels.delete}" aria-label="${labels.delete}">\u2715</button>
      </div>
    `;
    const editingView = card.querySelector(".clickdeck-intent-draft__editing");
    const savedView = card.querySelector(".clickdeck-intent-draft__saved");
    const textarea = card.querySelector(".clickdeck-intent-draft__textarea");
    const savedActionSpan = card.querySelector(".clickdeck-intent-draft__saved-action");
    const savedTextSpan = card.querySelector(".clickdeck-intent-draft__saved-text");
    const btnCancel = card.querySelector('button[data-action="cancel"]');
    const btnSave = card.querySelector('button[data-action="save"]');
    const btnDelete = card.querySelector('button[data-action="delete"]');
    const btnTarget = card.querySelector(".clickdeck-intent-draft__target-btn");
    const btnRemove = card.querySelector(".clickdeck-intent-draft__remove-btn");
    textarea.value = operation.source.userIntent;
    let isSaved = preSaved;
    let draftAction = operation.action;
    const syncMoveButton = () => {
      const isMove = draftAction === "move";
      btnTarget.classList.toggle("clickdeck-intent-draft__target-btn--active", isMove);
      btnTarget.textContent = isMove ? labels.intentDragGhost : labels.intentMoveTo;
      const isRemove = draftAction === "remove";
      btnRemove.classList.toggle("clickdeck-intent-draft__remove-btn--active", isRemove);
      textarea.hidden = false;
      textarea.placeholder = isMove ? labels.intentMovePlaceholder : labels.intentPlaceholder;
    };
    syncMoveButton();
    btnTarget.addEventListener("click", () => {
      const changed = draftAction !== "move";
      draftAction = "move";
      syncMoveButton();
      if (changed) {
        onActionChange?.(operation.id, "move");
      }
      onDragTarget?.(operation.id);
    });
    btnRemove.addEventListener("click", () => {
      const changed = draftAction !== "remove";
      draftAction = "remove";
      syncMoveButton();
      if (changed) onActionChange?.(operation.id, "remove");
    });
    const updateSavedView = () => {
      const isMove = operation.action === "move";
      const isRemove = operation.action === "remove";
      if (isMove) {
        savedActionSpan.textContent = `[${labels.intentActionMove}]`;
        savedActionSpan.hidden = false;
        savedTextSpan.textContent = operation.source.userIntent || labels.intentActionMove;
      } else if (isRemove) {
        savedActionSpan.textContent = `[${labels.intentMarkRemoval}]`;
        savedActionSpan.hidden = false;
        savedTextSpan.textContent = operation.source.userIntent || labels.intentMarkRemoval;
      } else {
        savedActionSpan.textContent = "";
        savedActionSpan.hidden = true;
        savedTextSpan.textContent = operation.source.userIntent || labels.addIntent;
      }
      editingView.style.display = "none";
      savedView.style.display = "flex";
    };
    btnCancel.addEventListener("click", () => {
      if (isSaved) {
        draftAction = operation.action;
        syncMoveButton();
        textarea.value = operation.source.userIntent;
        editingView.style.display = "none";
        savedView.style.display = "flex";
      } else {
        card.remove();
        cards.delete(operation.id);
        onCancel(operation.id);
        updateContainerVisibility();
      }
    });
    btnSave.addEventListener("click", () => {
      const text = textarea.value.trim();
      if (!text && draftAction !== "move" && draftAction !== "remove") {
        textarea.focus();
        return;
      }
      operation.action = draftAction;
      operation.source.action = draftAction;
      operation.source.userIntent = text;
      isSaved = true;
      updateSavedView();
      onSave(operation);
    });
    btnDelete.addEventListener("click", (e) => {
      e.stopPropagation();
      card.remove();
      cards.delete(operation.id);
      onDelete(operation.id);
      updateContainerVisibility();
    });
    savedView.addEventListener("click", () => {
      editingView.style.display = "flex";
      savedView.style.display = "none";
      if (operation.action === "move") {
        btnTarget.focus();
      } else {
        textarea.focus();
      }
      onHighlight(operation);
    });
    cardsContainer.appendChild(card);
    cards.set(operation.id, card);
    expanded = true;
    updateContainerVisibility();
    if (preSaved) {
      updateSavedView();
    } else {
      textarea.focus();
    }
  }
  function renderTabs() {
    tabs.innerHTML = "";
    const items = Array.from(cards.values());
    items.forEach((card) => {
      const tab = document.createElement("span");
      tab.className = "clickdeck-intent-draft__tab";
      tab.style.background = card.style.getPropertyValue("--clickdeck-intent-color") || "#3b82f6";
      tabs.appendChild(tab);
    });
  }
  function syncAnchorPosition() {
    if (!currentLayout) return;
    const railWidth = 18;
    const sheetWidth = 280;
    const preferLeft = currentLayout.left + currentLayout.width / 2 > window.innerWidth / 2;
    const top = Math.max(12, currentLayout.top + 12);
    const totalExpandedWidth = railWidth + sheetWidth;
    const left = preferLeft ? currentLayout.left - (expanded ? totalExpandedWidth : railWidth) : currentLayout.left + currentLayout.width;
    element.classList.toggle("clickdeck-intent-draft--left", preferLeft);
    element.classList.toggle("clickdeck-intent-draft--right", !preferLeft);
    element.classList.toggle("clickdeck-intent-draft--expanded", expanded);
    element.style.top = `${top}px`;
    element.style.left = `${Math.max(8, left)}px`;
  }
  function updateContainerVisibility() {
    renderTabs();
    const shouldHide = manuallyHidden || cards.size === 0 || currentLayout?.collapsed;
    if (shouldHide) {
      element.classList.add("clickdeck-intent-draft--hidden");
    } else {
      element.classList.remove("clickdeck-intent-draft--hidden");
    }
    syncAnchorPosition();
  }
  rail.addEventListener("click", () => {
    if (cards.size === 0) return;
    expanded = true;
    updateContainerVisibility();
  });
  collapseButton.addEventListener("click", () => {
    expanded = false;
    updateContainerVisibility();
  });
  return {
    element,
    destroy: () => {
      element.remove();
    },
    addDraft: (operation, color, preSaved) => {
      createCardDOM(operation, color, preSaved);
    },
    hide: () => {
      manuallyHidden = true;
      updateContainerVisibility();
    },
    show: () => {
      manuallyHidden = false;
      if (cards.size > 0) {
        updateContainerVisibility();
      }
    },
    setAnchorLayout: (layout) => {
      currentLayout = layout;
      updateContainerVisibility();
    }
  };
}
function injectBaseStyles2() {
  if (document.getElementById(STYLE_ID2)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID2;
  style.textContent = `
    .clickdeck-intent-draft {
      position: fixed;
      z-index: 2147483647;
      display: flex;
      align-items: flex-start;
      gap: 0;
      transition: opacity 0.2s ease;
      font-family: Inter, system-ui, sans-serif;
    }
    .clickdeck-intent-draft--hidden {
      display: none;
      opacity: 0;
      pointer-events: none;
    }
    .clickdeck-intent-draft__rail {
      width: 18px;
      min-width: 18px;
      padding: 8px 3px;
      border: 1px solid rgba(120, 84, 53, 0.22);
      background: #fffaf2;
      box-shadow: 0 8px 30px rgba(0,0,0,0.12);
      cursor: pointer;
      display: flex;
      align-items: stretch;
      justify-content: center;
      min-height: 96px;
    }
    .clickdeck-intent-draft--left .clickdeck-intent-draft__rail {
      order: 2;
      border-left: none;
      border-radius: 0 12px 12px 0;
    }
    .clickdeck-intent-draft--right .clickdeck-intent-draft__rail {
      order: 1;
      border-right: none;
      border-radius: 12px 0 0 12px;
    }
    .clickdeck-intent-draft__tabs {
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 100%;
    }
    .clickdeck-intent-draft__tab {
      flex: 1 1 0;
      min-height: 28px;
      border-radius: 999px;
      opacity: 0.95;
    }
    .clickdeck-intent-draft__sheet {
      width: 280px;
      background: #fff;
      border: 1px solid rgba(120, 84, 53, 0.22);
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.12);
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      display: none;
    }
    .clickdeck-intent-draft--expanded .clickdeck-intent-draft__sheet {
      display: block;
    }
    .clickdeck-intent-draft--left .clickdeck-intent-draft__sheet {
      order: 1;
      border-right: none;
      border-radius: 12px 0 0 12px;
    }
    .clickdeck-intent-draft--right .clickdeck-intent-draft__sheet {
      order: 2;
      border-left: none;
      border-radius: 0 12px 12px 0;
    }
    .clickdeck-intent-draft__sheet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 12px 0;
    }
    .clickdeck-intent-draft__sheet-title {
      font-size: 12px;
      font-weight: 700;
      color: #6f5f52;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .clickdeck-intent-draft__cards {
      padding-top: 8px;
    }
    .clickdeck-intent-draft__editing {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      border-left: 4px solid var(--clickdeck-intent-color, #3b82f6);
    }
    .clickdeck-intent-draft__textarea {
      width: 100%;
      min-height: 80px;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 13px;
      resize: vertical;
      outline: none;
    }
    .clickdeck-intent-draft__textarea:focus {
      border-color: #3b82f6;
    }
    .clickdeck-intent-draft__target-btn {
      align-self: flex-start;
      font-size: 12px;
      padding: 4px 8px;
    }
    .clickdeck-intent-draft__target-btn--active {
      border-color: var(--clickdeck-intent-color, #3b82f6);
      color: var(--clickdeck-intent-color, #3b82f6);
      background: color-mix(in srgb, var(--clickdeck-intent-color, #3b82f6) 10%, white);
    }
    .clickdeck-intent-draft__actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .clickdeck-intent-draft__saved {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      cursor: pointer;
      background: #f8fafc;
      border-left: 4px solid var(--clickdeck-intent-color, #3b82f6);
    }
    .clickdeck-intent-draft__saved:hover {
      background: #f1f5f9;
    }
    .clickdeck-intent-draft__saved-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow: hidden;
    }
    .clickdeck-intent-draft__saved-action {
      font-size: 12px;
      font-weight: 600;
      color: var(--clickdeck-intent-color, #3b82f6);
    }
    .clickdeck-intent-draft__saved-text {
      font-size: 13px;
      color: #333;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `;
  document.documentElement.appendChild(style);
}

// src/content/intent-draft-state.ts
function pickNextIntentColor(usedColors, palette) {
  if (palette.length === 0) {
    return "#3b82f6";
  }
  for (const color of palette) {
    if (!usedColors.includes(color)) {
      return color;
    }
  }
  return palette[usedColors.length % palette.length] ?? palette[0];
}
function buildIntentDraftVisualPlan(drafts, removeBadgeLabel) {
  return drafts.map((draft, index) => {
    const order = index + 1;
    if (draft.action === "move") {
      return {
        id: draft.id,
        color: draft.color,
        sourceLabel: `${order}A`,
        targetLabel: draft.hasTarget ? `${order}B` : void 0
      };
    }
    if (draft.action === "remove") {
      return {
        id: draft.id,
        color: draft.color,
        sourceLabel: `${order} ${removeBadgeLabel}`
      };
    }
    return {
      id: draft.id,
      color: draft.color,
      sourceLabel: `${order}`
    };
  });
}

// src/content/intent-ghost.ts
var STYLE_ID3 = "clickdeck-ghost-preview-style";
var GUIDE_ORTHOGONAL_MAX = 240;
var SNAP_THRESHOLD_PX = 8;
function getTargetGuidePositions(rect) {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  return [
    { axis: "x", position: rect.left, targetEdge: "left" },
    { axis: "x", position: rect.right, targetEdge: "right" },
    { axis: "x", position: centerX, targetEdge: "centerX" },
    { axis: "y", position: rect.top, targetEdge: "top" },
    { axis: "y", position: rect.bottom, targetEdge: "bottom" },
    { axis: "y", position: centerY, targetEdge: "centerY" }
  ];
}
function rangeDistance(startA, endA, startB, endB) {
  if (endA < startB) return startB - endA;
  if (endB < startA) return startA - endB;
  return 0;
}
function isGuideLocallyRelevant(rect, candidate) {
  if (candidate.axis === "x") {
    const distanceY = rangeDistance(rect.top, rect.bottom, candidate.sourceRect.top, candidate.sourceRect.bottom);
    return distanceY <= Math.max(GUIDE_ORTHOGONAL_MAX, rect.height * 2);
  }
  const distanceX = rangeDistance(rect.left, rect.right, candidate.sourceRect.left, candidate.sourceRect.right);
  return distanceX <= Math.max(GUIDE_ORTHOGONAL_MAX, rect.width);
}
function computeActiveGuides(rect, guideCandidates, threshold = SNAP_THRESHOLD_PX) {
  const targetPositions = getTargetGuidePositions(rect);
  const bestByAxis = /* @__PURE__ */ new Map();
  for (const target of targetPositions) {
    for (const candidate of guideCandidates) {
      if (candidate.axis !== target.axis) continue;
      if (!isGuideLocallyRelevant(rect, candidate)) continue;
      const deltaPx = Math.abs(target.position - candidate.position);
      if (deltaPx > threshold) continue;
      const current = bestByAxis.get(candidate.axis);
      if (!current || deltaPx < current.deltaPx) {
        bestByAxis.set(candidate.axis, {
          axis: candidate.axis,
          position: candidate.position,
          targetEdge: target.targetEdge,
          sourceEdge: candidate.sourceEdge,
          unitSummary: candidate.unitSummary,
          deltaPx,
          confidence: "high"
        });
      }
    }
  }
  return Array.from(bestByAxis.values()).sort((a, b) => a.axis.localeCompare(b.axis));
}
function getEdgePosition(rect, edge) {
  if (edge === "left") return rect.left;
  if (edge === "right") return rect.right;
  if (edge === "top") return rect.top;
  if (edge === "bottom") return rect.bottom;
  if (edge === "centerX") return rect.left + rect.width / 2;
  return rect.top + rect.height / 2;
}
function offsetRect(rect, dx, dy) {
  return {
    left: rect.left + dx,
    top: rect.top + dy,
    width: rect.width,
    height: rect.height,
    right: rect.right + dx,
    bottom: rect.bottom + dy
  };
}
function snapRectToGuides(rect, guideCandidates, threshold = SNAP_THRESHOLD_PX) {
  const guides = computeActiveGuides(rect, guideCandidates, threshold);
  let dx = 0;
  let dy = 0;
  const xGuide = guides.find((guide) => guide.axis === "x");
  if (xGuide) {
    dx = xGuide.position - getEdgePosition(rect, xGuide.targetEdge);
  }
  const yGuide = guides.find((guide) => guide.axis === "y");
  if (yGuide) {
    dy = yGuide.position - getEdgePosition(rect, yGuide.targetEdge);
  }
  if (dx === 0 && dy === 0) {
    return { rect, guides, dx, dy };
  }
  const snappedRect = offsetRect(rect, dx, dy);
  const snappedGuides = computeActiveGuides(snappedRect, guideCandidates, threshold).map((guide) => ({
    ...guide,
    deltaPx: 0
  }));
  return { rect: snappedRect, guides: snappedGuides, dx, dy };
}
function formatGuideHint(guides) {
  if (guides.length === 0) return null;
  const xGuide = guides.find((guide) => guide.axis === "x");
  const yGuide = guides.find((guide) => guide.axis === "y");
  const parts = [];
  if (xGuide) {
    parts.push(`X: ${xGuide.targetEdge} -> ${xGuide.unitSummary}`);
  }
  if (yGuide) {
    parts.push(`Y: ${yGuide.targetEdge} -> ${yGuide.unitSummary}`);
  }
  return parts.join(" | ");
}
function createMoveTargetBox(options) {
  injectBaseStyles3();
  const labels = getPanelLabels();
  const element = document.createElement("div");
  element.className = "clickdeck-ghost-preview";
  element.dataset.clickdeck = "true";
  element.style.setProperty("--ghost-color", options.color);
  element.style.setProperty("--ghost-bg", `color-mix(in srgb, ${options.color} 15%, transparent)`);
  let originalPosition = null;
  if (options.anchorElement && window.getComputedStyle(options.anchorElement).position === "static") {
    originalPosition = options.anchorElement.style.position;
    options.anchorElement.style.position = "relative";
  }
  Object.assign(element.style, {
    position: "absolute",
    left: options.useRelativeBox ? `${options.box.left}%` : `${options.box.left}px`,
    top: options.useRelativeBox ? `${options.box.top}%` : `${options.box.top}px`,
    width: options.useRelativeBox ? `${options.box.width}%` : `${options.box.width}px`,
    height: options.useRelativeBox ? `${options.box.height}%` : `${options.box.height}px`,
    transform: `translate(0px, 0px)`
  });
  const guideLines = [];
  function clearGuideLines() {
    guideLines.forEach((l) => l.remove());
    guideLines.length = 0;
  }
  function drawGuideLine(isVertical, position) {
    const line = document.createElement("div");
    line.className = "clickdeck-ghost-guide-line";
    line.dataset.clickdeck = "true";
    if (isVertical) {
      line.style.left = `${position}px`;
      line.style.top = "0";
      line.style.width = "1px";
      line.style.height = "100vh";
    } else {
      line.style.left = "0";
      line.style.top = `${position}px`;
      line.style.width = "100vw";
      line.style.height = "1px";
    }
    document.body.appendChild(line);
    guideLines.push(line);
  }
  const uiContainer = document.createElement("div");
  uiContainer.className = "clickdeck-ghost-preview__center-hint";
  uiContainer.textContent = labels.intentDragToPlace;
  element.appendChild(uiContainer);
  const labelBadge = document.createElement("div");
  labelBadge.className = "clickdeck-ghost-preview__label";
  labelBadge.style.background = options.color;
  labelBadge.textContent = options.label;
  element.appendChild(labelBadge);
  const btnCancel = document.createElement("div");
  btnCancel.className = "clickdeck-ghost-preview__close";
  btnCancel.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  btnCancel.addEventListener("click", (e) => {
    e.stopPropagation();
    options.onCancel();
  });
  element.appendChild(btnCancel);
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let currentTx = 0;
  let currentTy = 0;
  let tempDx = 0;
  let tempDy = 0;
  let previewTx = 0;
  let previewTy = 0;
  let lastPreviewRect = { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 };
  let lastPreviewGuides = [];
  function onMouseDown(e) {
    if (e.target.closest(".clickdeck-ghost-preview__close")) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    element.classList.add("clickdeck-ghost-preview--dragging");
    e.preventDefault();
  }
  function onMouseMove(e) {
    if (!isDragging) return;
    tempDx = e.clientX - startX;
    tempDy = e.clientY - startY;
    const baseRect = {
      left: lastPreviewRect.left - previewTx,
      top: lastPreviewRect.top - previewTy,
      width: lastPreviewRect.width,
      height: lastPreviewRect.height,
      right: lastPreviewRect.right - previewTx,
      bottom: lastPreviewRect.bottom - previewTy
    };
    const rawRect = offsetRect(baseRect, currentTx + tempDx, currentTy + tempDy);
    const snapped = snapRectToGuides(rawRect, options.guideCandidates);
    previewTx = currentTx + tempDx + snapped.dx;
    previewTy = currentTy + tempDy + snapped.dy;
    lastPreviewRect = snapped.rect;
    lastPreviewGuides = snapped.guides;
    element.style.transform = `translate(${previewTx}px, ${previewTy}px)`;
    clearGuideLines();
    lastPreviewGuides.forEach((guide) => drawGuideLine(guide.axis === "x", guide.position));
    uiContainer.textContent = formatGuideHint(lastPreviewGuides) ?? labels.intentDragToPlace;
  }
  function onMouseUp() {
    if (!isDragging) return;
    isDragging = false;
    currentTx = previewTx;
    currentTy = previewTy;
    tempDx = 0;
    tempDy = 0;
    element.classList.remove("clickdeck-ghost-preview--dragging");
    clearGuideLines();
    uiContainer.textContent = formatGuideHint(lastPreviewGuides) ?? labels.intentDragToPlace;
    options.onChange(lastPreviewRect, lastPreviewGuides);
  }
  element.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
  (options.anchorElement ?? document.body).appendChild(element);
  const initialRect = element.getBoundingClientRect();
  lastPreviewRect = {
    left: initialRect.left,
    top: initialRect.top,
    width: initialRect.width,
    height: initialRect.height,
    right: initialRect.right,
    bottom: initialRect.bottom
  };
  return {
    element,
    destroy: () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      element.remove();
      clearGuideLines();
      if (options.anchorElement && originalPosition !== null) {
        if (originalPosition === "") {
          options.anchorElement.style.removeProperty("position");
        } else {
          options.anchorElement.style.position = originalPosition;
        }
      }
    }
  };
}
function injectBaseStyles3() {
  if (document.getElementById(STYLE_ID3)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID3;
  style.textContent = `
    .clickdeck-ghost-preview {
      position: absolute;
      background: var(--ghost-bg);
      border: 2px dashed var(--ghost-color);
      border-radius: 8px;
      cursor: grab;
      z-index: 2147483647; /* high z-index */
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      backdrop-filter: blur(2px);
      user-select: none;
    }
    .clickdeck-ghost-preview--dragging {
      cursor: grabbing;
      opacity: 0.8;
      border: 2px solid var(--ghost-color);
    }
    .clickdeck-ghost-preview__label {
      position: absolute;
      top: 0;
      left: 0;
      transform: translateY(-100%);
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 4px 4px 0 0;
      pointer-events: none;
    }
    .clickdeck-ghost-preview__center-hint {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: var(--ghost-color);
      font-size: 14px;
      font-weight: 600;
      pointer-events: none;
      white-space: nowrap;
      text-shadow: 0 1px 2px rgba(255,255,255,0.8);
      background: rgba(255,255,255,0.7);
      padding: 4px 12px;
      border-radius: 999px;
    }
    .clickdeck-ghost-preview__close {
      position: absolute;
      top: -10px;
      right: -10px;
      width: 20px;
      height: 20px;
      background: #fff;
      color: #666;
      border: 1px solid #ddd;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      z-index: 10;
    }
    .clickdeck-ghost-preview__close:hover {
      background: #f3f4f6;
      color: #000;
    }
    .clickdeck-ghost-guide-line {
      position: fixed;
      background-color: #3b82f688;
      pointer-events: none;
      z-index: 2147483646;
      box-shadow: 0 0 2px rgba(59, 130, 246, 0.5);
    }
  `;
  document.documentElement.appendChild(style);
}

// src/content/controller.ts
function writeClipboard(text) {
  const fallbackCopy = () => {
    return new Promise((resolve, reject) => {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        textarea.style.pointerEvents = "none";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  };
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy());
  }
  return fallbackCopy();
}
function createController(logger, rootId2) {
  let labels = getPanelLabels();
  const state = createEditorState();
  const history = createEditHistory();
  let active = false;
  let hoveredElement = null;
  let selectedElement = null;
  let overlay = null;
  let panel = null;
  let panelLayout = null;
  let intentOverlay = null;
  let intentDraftPanel = null;
  let intentDrafts = [];
  let moveTargetBox = null;
  let presentationController = null;
  let editingElement = null;
  let originalText = "";
  let svgInlineEditor = null;
  let visibilityCheckInterval = null;
  function buildIntentDraftPanel() {
    const p = createIntentDraftPanel(
      (op) => {
        const idx = intentDrafts.findIndex((d) => d.operation.id === op.id);
        if (idx !== -1) {
          if (op.action === "move" && intentDrafts[idx].targetContext) {
            op.target = intentDrafts[idx].targetContext.region;
          }
          intentDrafts[idx].operation = op;
          if (moveTargetBox && op.action === "move") {
            moveTargetBox.destroy();
            moveTargetBox = null;
            if (intentDrafts[idx].targetContext) refreshIntentDraftMarkers();
          }
          if (op.action !== "move" && intentDrafts[idx].targetMarker) {
            intentDrafts[idx].targetMarker?.remove();
            intentDrafts[idx].targetMarker = void 0;
            intentDrafts[idx].targetContext = void 0;
          }
        }
        persistPatches();
      },
      (opId) => {
        const draft = intentDrafts.find((d) => d.operation.id === opId);
        if (draft) removeIntentDraftMarkers(draft);
        intentDrafts = intentDrafts.filter((d) => d.operation.id !== opId);
        refreshIntentDraftMarkers();
        persistPatches();
        if (intentDrafts.length === 0) p?.hide();
        if (moveTargetBox) {
          moveTargetBox.destroy();
          moveTargetBox = null;
        }
      },
      (opId) => {
        const draft = intentDrafts.find((d) => d.operation.id === opId);
        if (draft) removeIntentDraftMarkers(draft);
        intentDrafts = intentDrafts.filter((d) => d.operation.id !== opId);
        refreshIntentDraftMarkers();
        persistPatches();
        if (intentDrafts.length === 0) p?.hide();
        if (moveTargetBox) {
          moveTargetBox.destroy();
          moveTargetBox = null;
        }
      },
      (op) => {
        const docBox = op.source.documentBox;
        window.scrollTo({ top: docBox.top - window.innerHeight / 2 + docBox.height / 2, behavior: "smooth" });
        const draft = intentDrafts.find((d) => d.operation.id === op.id);
        pulseIntentMarker(draft?.sourceMarker);
        pulseIntentMarker(draft?.targetMarker);
      },
      (opId) => {
        if (intentOverlay) return;
        const draft = intentDrafts.find((d) => d.operation.id === opId);
        if (!draft) return;
        intentOverlay = createIntentOverlay(
          "clickdeck-intent-target-overlay-root",
          (rect) => {
            intentOverlay?.destroy();
            intentOverlay = null;
            const units = collectVisualUnits();
            const region = createIntentRegion({ action: "move", userIntent: "", viewportBox: rect });
            const idx = intentDrafts.findIndex((d) => d.operation.id === opId);
            const excludeTexts = idx !== -1 ? intentDrafts[idx].context.candidates.map((c) => c.unit.textSnippet?.trim()).filter(Boolean) : void 0;
            const targetContext = buildRegionContext(region, units, { excludeTextSnippets: excludeTexts });
            if (idx !== -1) {
              intentDrafts[idx].targetContext = targetContext;
              intentDrafts[idx].operation.target = targetContext.region;
              refreshIntentDraftMarkers();
              pulseIntentMarker(intentDrafts[idx].targetMarker);
            }
          },
          () => {
            intentOverlay?.destroy();
            intentOverlay = null;
          },
          labels.drawTargetRegionHint
        );
      },
      (opId) => {
        if (moveTargetBox || intentOverlay) return;
        const draft = intentDrafts.find((d) => d.operation.id === opId);
        if (!draft) return;
        const sourceViewportBox = draft.context.region.viewportBox;
        const anchorElement = findIntentAnchorElement(draft.context.region);
        const relativeBox = anchorElement ? draft.context.region.relativeBox : void 0;
        const box = relativeBox ?? draft.context.region.documentBox;
        const units = collectVisualUnits();
        const sourceUnits = findVisualUnitsInBox(units, sourceViewportBox).map((m) => m.unit);
        const sourceTextSnippets = sourceUnits.map((u) => u.textSnippet?.trim()).filter(Boolean);
        const sourceElements = new Set(sourceUnits.map((u) => u.element));
        const sourceUnitIds = new Set(sourceUnits.map((u) => u.id));
        const guideCandidates = units.filter((u) => !sourceUnitIds.has(u.id) && !sourceElements.has(u.element)).flatMap((u) => {
          const summary = summarizeVisualUnit(u);
          const cx = u.rect.left + u.rect.width / 2;
          const cy = u.rect.top + u.rect.height / 2;
          return [
            { axis: "x", position: u.rect.left, sourceEdge: "left", unitSummary: summary, unitKind: u.kind, sourceRect: u.rect },
            { axis: "x", position: u.rect.right, sourceEdge: "right", unitSummary: summary, unitKind: u.kind, sourceRect: u.rect },
            { axis: "x", position: cx, sourceEdge: "centerX", unitSummary: summary, unitKind: u.kind, sourceRect: u.rect },
            { axis: "y", position: u.rect.top, sourceEdge: "top", unitSummary: summary, unitKind: u.kind, sourceRect: u.rect },
            { axis: "y", position: u.rect.bottom, sourceEdge: "bottom", unitSummary: summary, unitKind: u.kind, sourceRect: u.rect },
            { axis: "y", position: cy, sourceEdge: "centerY", unitSummary: summary, unitKind: u.kind, sourceRect: u.rect }
          ];
        });
        const updateTargetContext = (finalRect, activeGuides = []) => {
          const region = createIntentRegion({ action: "move", userIntent: "", viewportBox: finalRect, isGhostPreview: true });
          const idx2 = intentDrafts.findIndex((d) => d.operation.id === opId);
          const tc = buildRegionContext(region, units, {
            excludeTextSnippets: sourceTextSnippets,
            excludeElements: Array.from(sourceElements),
            excludeUnitIds: Array.from(sourceUnitIds),
            activeAlignmentGuides: activeGuides
          });
          if (idx2 !== -1) {
            intentDrafts[idx2].targetContext = tc;
            intentDrafts[idx2].operation.target = tc.region;
          }
        };
        updateTargetContext(sourceViewportBox);
        draft.targetMarker?.remove();
        draft.targetMarker = void 0;
        const idx = intentDrafts.findIndex((d) => d.operation.id === opId);
        moveTargetBox = createMoveTargetBox({
          color: draft.color || "#3b82f6",
          label: `${idx + 1}B`,
          anchorElement,
          useRelativeBox: Boolean(anchorElement && relativeBox),
          box,
          guideCandidates,
          onChange: (fr, ag) => updateTargetContext(fr, ag),
          onCancel: () => {
            moveTargetBox?.destroy();
            moveTargetBox = null;
            const d = intentDrafts.find((dd) => dd.operation.id === opId);
            if (d) {
              d.targetContext = void 0;
              d.operation.target = void 0;
            }
          }
        });
      },
      (opId, action) => {
        const idx = intentDrafts.findIndex((d) => d.operation.id === opId);
        if (idx === -1) return;
        const draft = intentDrafts[idx];
        draft.operation.action = action;
        draft.context.region.action = action;
        if (action !== "move") {
          if (moveTargetBox) {
            moveTargetBox.destroy();
            moveTargetBox = null;
          }
          if (draft.targetMarker) {
            draft.targetMarker.remove();
            draft.targetMarker = void 0;
          }
          draft.targetContext = void 0;
          draft.operation.target = void 0;
        }
        refreshIntentDraftMarkers();
      }
    );
    document.documentElement.appendChild(p.element);
    if (panelLayout) p.setAnchorLayout(panelLayout);
    return p;
  }
  const pageHref = window.location.href;
  const storageKey = buildStorageKey(pageHref);
  const textTags = /* @__PURE__ */ new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "a", "li", "strong", "em"]);
  const containerTags = /* @__PURE__ */ new Set(["div", "section", "article", "main", "header", "footer", "nav", "aside"]);
  const intentColors = ["#e85d75", "#16a085", "#d97706", "#2563eb", "#8b5cf6", "#0f766e"];
  function refreshSvgTextEditorState(target) {
    if (!(target instanceof SVGSVGElement)) {
      panel?.setSvgTextEditorState(null);
      return;
    }
    const svgTextState = getSvgTextEditState(target);
    if (!svgTextState) {
      panel?.setSvgTextEditorState(null);
      return;
    }
    if (svgTextState.mode === "editable") {
      panel?.setSvgTextEditorState({
        mode: "editable",
        message: labels.svgTextEditableHint
      });
      return;
    }
    panel?.setSvgTextEditorState({
      mode: svgTextState.mode,
      message: svgTextState.mode === "complex" ? labels.svgTextComplex : labels.svgTextNoneEditable
    });
  }
  function getSelectionContext(target) {
    if (!target) {
      return "none";
    }
    const complexKind = getComplexElementKind(target);
    if (complexKind) {
      return complexKind;
    }
    const tag = target.tagName.toLowerCase();
    if (tag === "img") {
      return "image";
    }
    if (tag === "video") {
      return "video";
    }
    if (textTags.has(tag) || target instanceof HTMLElement && canAutoStartTextEditing(target)) {
      return "text";
    }
    if (containerTags.has(tag)) {
      return "container";
    }
    return "container";
  }
  function createIntentMarker(region, color, label, variant = "source") {
    const marker = document.createElement("div");
    marker.dataset.clickdeck = "true";
    marker.dataset.intentColor = color;
    marker.className = "clickdeck-intent-region-marker";
    const anchorElement = findIntentAnchorElement(region);
    const relativeBox = anchorElement ? region.relativeBox : void 0;
    const box = relativeBox ?? region.documentBox;
    const useRelativeBox = Boolean(anchorElement && relativeBox);
    if (anchorElement && window.getComputedStyle(anchorElement).position === "static") {
      anchorElement.style.position = "relative";
    }
    Object.assign(marker.style, {
      position: "absolute",
      left: useRelativeBox ? `${box.left}%` : `${box.left}px`,
      top: useRelativeBox ? `${box.top}%` : `${box.top}px`,
      width: useRelativeBox ? `${box.width}%` : `${box.width}px`,
      height: useRelativeBox ? `${box.height}%` : `${box.height}px`,
      border: `2px ${variant === "source" ? "solid" : "dashed"} ${color}`,
      backgroundColor: `${color}18`,
      boxShadow: `0 0 0 3px ${color}24`,
      borderRadius: "8px",
      pointerEvents: "none",
      zIndex: "2147483645",
      transition: "box-shadow 0.2s ease, background-color 0.2s ease"
    });
    if (label) {
      const badge = document.createElement("span");
      badge.textContent = label;
      badge.className = "clickdeck-intent-region-badge";
      Object.assign(badge.style, {
        position: "absolute",
        left: "-2px",
        top: "-24px",
        minWidth: "22px",
        height: "20px",
        padding: "0 7px",
        borderRadius: "999px",
        background: color,
        color: "#fff",
        fontSize: "12px",
        fontWeight: "700",
        lineHeight: "20px",
        textAlign: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.16)"
      });
      marker.appendChild(badge);
    }
    (anchorElement ?? document.body).appendChild(marker);
    return marker;
  }
  function findIntentAnchorElement(region) {
    const locator = region.anchor.locator;
    if (!locator || region.anchor.kind === "document") {
      return null;
    }
    const selectors = [locator.cssPath, locator.nthOfTypePath].filter(Boolean);
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          return element;
        }
      } catch {
      }
    }
    return null;
  }
  function pulseIntentMarker(marker) {
    if (!marker) return;
    const color = marker.dataset.intentColor ?? "#3b82f6";
    const originalShadow = marker.style.boxShadow;
    const originalBackground = marker.style.backgroundColor;
    marker.style.boxShadow = `0 0 0 6px rgba(255,255,255,0.85), 0 0 0 10px ${color}40`;
    marker.style.backgroundColor = `${color}26`;
    window.setTimeout(() => {
      marker.style.boxShadow = originalShadow;
      marker.style.backgroundColor = originalBackground;
    }, 650);
  }
  function removeIntentDraftMarkers(draft) {
    draft.sourceMarker.remove();
    draft.targetMarker?.remove();
  }
  function refreshIntentDraftMarkers() {
    const visualPlan = buildIntentDraftVisualPlan(
      intentDrafts.map((draft) => ({
        id: draft.operation.id,
        action: draft.operation.action,
        color: draft.color,
        hasTarget: Boolean(draft.targetContext)
      })),
      getPanelLabels().intentDelBadge
    );
    const planById = new Map(visualPlan.map((item) => [item.id, item]));
    for (const draft of intentDrafts) {
      const plan = planById.get(draft.operation.id);
      if (!plan) continue;
      draft.sourceMarker.remove();
      draft.sourceMarker = createIntentMarker(
        draft.context.region,
        draft.color,
        plan.sourceLabel,
        draft.operation.action === "remove" ? "remove" : "source"
      );
      draft.targetMarker?.remove();
      if (draft.targetContext && plan.targetLabel) {
        draft.targetMarker = createIntentMarker(
          draft.targetContext.region,
          draft.color,
          plan.targetLabel,
          "target"
        );
      } else {
        draft.targetMarker = void 0;
      }
    }
  }
  function getEffectivePatches() {
    return [...history.undoStack];
  }
  function serializeIntentDrafts(drafts) {
    return drafts.map((draft) => ({
      operation: {
        id: draft.operation.id,
        action: draft.operation.action,
        source: { ...draft.operation.source },
        target: draft.operation.target ? { ...draft.operation.target } : void 0,
        createdAt: draft.operation.createdAt
      },
      color: draft.color
    }));
  }
  function persistPatches() {
    const effective = getEffectivePatches();
    const hasIntentDrafts = intentDrafts.length > 0;
    if (effective.length === 0 && !hasIntentDrafts) {
      clearPersistedPatches();
      return;
    }
    const payload = {
      version: 2,
      href: pageHref,
      patches: serializePatches(effective),
      savedAt: Date.now()
    };
    if (hasIntentDrafts) {
      payload.intentDrafts = serializeIntentDrafts(intentDrafts);
    }
    storage.set(storageKey, payload).then(() => {
      logger.info("Page edits persisted", { key: storageKey, count: payload.patches.length, intentDrafts: payload.intentDrafts?.length ?? 0 });
    }).catch((err) => {
      logger.warn("Failed to persist page edits", { message: String(err) });
    });
  }
  function clearPersistedPatches() {
    storage.remove(storageKey).then(() => {
      logger.info("Cleared persisted page edits", { key: storageKey });
    }).catch((err) => {
      logger.warn("Failed to clear persisted page edits", { message: String(err) });
    });
  }
  function tryRestorePersistedPatches() {
    storage.get(storageKey).then((payload) => {
      if (!payload) return;
      const hasPatches = Array.isArray(payload.patches) && payload.patches.length > 0;
      const hasIntentDrafts = Array.isArray(payload.intentDrafts) && payload.intentDrafts.length > 0;
      if (!hasPatches && !hasIntentDrafts) return;
      panel?.showSavedEditsNotice({
        count: hasPatches ? payload.patches.length : 0,
        hasIntentDrafts,
        onRestore: () => {
          if (hasPatches) {
            const hydrated = hydratePersistedPatches(payload.patches, logger);
            if (hydrated.length === 0) {
              logger.warn("No persisted patches could be restored");
            } else {
              for (const patch of hydrated) {
                applyPatchValue(patch, patch.after);
                state.patches.push(patch);
                history.undoStack.push(patch);
              }
              history.redoStack.length = 0;
              refreshHistoryButtons();
              updateOutline2();
              logger.info("Restored persisted page edits", { restored: hydrated.length, total: payload.patches.length });
            }
          }
          if (hasIntentDrafts) {
            for (const persisted of payload.intentDrafts) {
              const region = persisted.operation.source;
              const units = collectVisualUnits();
              const context = buildRegionContext(region, units);
              const color = persisted.color || pickNextIntentColor(
                intentDrafts.map((d) => d.color),
                intentColors
              );
              const sourceMarker = createIntentMarker(region, color, "");
              let targetContext;
              if (persisted.operation.target) {
                const targetRegion = persisted.operation.target;
                const targetUnits = collectVisualUnits();
                targetContext = buildRegionContext(targetRegion, targetUnits);
              }
              const operation = {
                id: persisted.operation.id,
                action: persisted.operation.action,
                source: region,
                target: targetContext?.region,
                createdAt: persisted.operation.createdAt
              };
              intentDrafts.push({ operation, context, targetContext, color, sourceMarker });
            }
            refreshIntentDraftMarkers();
            logger.info("Restored intent drafts", { count: payload.intentDrafts.length });
          }
          if (intentDrafts.length > 0) {
            if (!intentDraftPanel) {
              intentDraftPanel = buildIntentDraftPanel();
            }
            refreshIntentDraftMarkers();
            intentDraftPanel.show();
            for (const restored of intentDrafts) {
              intentDraftPanel.addDraft(restored.operation, restored.color, true);
            }
          }
          panel?.hideSavedEditsNotice();
        },
        onClear: () => {
          clearPersistedPatches();
          panel?.hideSavedEditsNotice();
        }
      });
    }).catch((err) => {
      logger.warn("Failed to load persisted page edits", { message: String(err) });
    });
  }
  function stopEditing() {
    if (svgInlineEditor) {
      const { container, highlight, target, ownerSvg, originalText: originalText2 } = svgInlineEditor;
      const newText2 = target.textContent ?? "";
      container.remove();
      highlight.remove();
      if (newText2 !== originalText2) {
        const locator = createElementLocator(target);
        const patch = {
          id: `${Date.now()}-${state.patches.length + 1}`,
          kind: "content",
          targetElement: target,
          targetDescriptor: describeElement(target),
          targetLocator: locator,
          before: originalText2,
          after: newText2,
          createdAt: Date.now()
        };
        recordContentPatch(state, patch);
        history.undoStack.push(patch);
        history.redoStack.length = 0;
        logger.info("Inline SVG text editing completed", { target: patch.targetDescriptor });
        refreshHistoryButtons();
        persistPatches();
      }
      svgInlineEditor = null;
      refreshSvgTextEditorState(ownerSvg);
      return;
    }
    if (!editingElement) {
      return;
    }
    editingElement.removeAttribute("contenteditable");
    const newText = editingElement.textContent ?? "";
    if (newText !== originalText) {
      const locator = createElementLocator(editingElement);
      const patch = {
        id: `${Date.now()}-${state.patches.length + 1}`,
        kind: "content",
        targetElement: editingElement,
        targetDescriptor: describeElement(editingElement),
        targetLocator: locator,
        before: originalText,
        after: newText,
        createdAt: Date.now()
      };
      recordContentPatch(state, patch);
      history.undoStack.push(patch);
      history.redoStack.length = 0;
      logger.info("In-place text editing completed", { target: patch.targetDescriptor });
      refreshHistoryButtons();
      persistPatches();
    }
    editingElement = null;
    originalText = "";
  }
  function updateOutline2() {
    if (!overlay) {
      return;
    }
    if (isPanelCollapsed()) {
      overlay.updateOutline(null);
      return;
    }
    const target = selectedElement ?? hoveredElement;
    if (target && !isElementVisible(target)) {
      overlay.updateOutline(null);
      return;
    }
    overlay.updateOutline(target);
  }
  function isPanelCollapsed() {
    return panel?.element.classList.contains("clickdeck-panel--collapsed") ?? false;
  }
  function syncCollapsedBrowsingMode() {
    if (isPanelCollapsed()) {
      hoveredElement = null;
    }
    updateOutline2();
  }
  function refreshHistoryButtons() {
    panel?.setHistoryAvailability(history.undoStack.length > 0, history.redoStack.length > 0);
  }
  function popPatchGroup(stack) {
    const last = stack.pop();
    if (!last) {
      return [];
    }
    const groupCreatedAt = last.createdAt;
    const groupTarget = last.targetDescriptor;
    const collected = [last];
    while (stack.length > 0) {
      const previous = stack[stack.length - 1];
      if (!previous || previous.kind !== "style" || last.kind !== "style" || previous.createdAt !== groupCreatedAt || previous.targetDescriptor !== groupTarget) {
        break;
      }
      collected.push(stack.pop());
    }
    return collected.reverse();
  }
  function pushPatchGroup(stack, patches) {
    if (patches.length === 0) {
      return;
    }
    const last = patches[patches.length - 1];
    const groupBatchId = last.batchId;
    const groupTarget = last.targetDescriptor;
    const collected = [last];
    while (stack.length > 0) {
      const previous = stack[stack.length - 1];
      if (groupBatchId) {
        if (!previous || previous.batchId !== groupBatchId) {
          break;
        }
        collected.push(stack.pop());
        continue;
      }
      break;
    }
    for (let i = collected.length - 1; i >= 1; i--) {
      stack.push(collected[i]);
    }
    for (const patch of patches) {
      stack.push(patch);
    }
  }
  function applyPatchValue(patch, value) {
    if (patch.kind === "style") {
      patch.targetElement.style[patch.property] = value;
    } else if (patch.kind === "attribute") {
      if (patch.attribute === "src" && patch.targetElement instanceof HTMLImageElement) {
        patch.targetElement.src = value;
      } else {
        patch.targetElement.setAttribute(patch.attribute, value);
        if (patch.targetElement instanceof HTMLVideoElement || patch.targetElement instanceof HTMLSourceElement) {
          const videoEl = patch.targetElement instanceof HTMLVideoElement ? patch.targetElement : patch.targetElement.closest("video");
          if (videoEl) videoEl.load();
        }
      }
    } else {
      patch.targetElement.textContent = value;
    }
  }
  function undoLastPatch() {
    const patches = popPatchGroup(history.undoStack);
    if (patches.length === 0) {
      return;
    }
    for (const patch of [...patches].reverse()) {
      applyPatchValue(patch, patch.before);
    }
    pushPatchGroup(history.redoStack, patches);
    logger.info("Undo applied", {
      patchIds: patches.map((patch) => patch.id),
      target: patches[0]?.targetDescriptor
    });
    updateOutline2();
    refreshHistoryButtons();
    persistPatches();
  }
  function redoLastPatch() {
    const patches = popPatchGroup(history.redoStack);
    if (patches.length === 0) {
      return;
    }
    for (const patch of patches) {
      applyPatchValue(patch, patch.after);
    }
    pushPatchGroup(history.undoStack, patches);
    logger.info("Redo applied", {
      patchIds: patches.map((patch) => patch.id),
      target: patches[0]?.targetDescriptor
    });
    updateOutline2();
    refreshHistoryButtons();
    persistPatches();
  }
  function handleMouseMove(event) {
    if (!active || intentOverlay) {
      return;
    }
    if (isPanelCollapsed()) {
      if (hoveredElement) {
        hoveredElement = null;
        updateOutline2();
      }
      return;
    }
    const target = getEditableTarget(event.target, selectedElement);
    if (target === hoveredElement) {
      return;
    }
    hoveredElement = target;
    if (!selectedElement) {
      updateOutline2();
    }
  }
  function handleClick(event) {
    if (!active || intentOverlay || isPanelCollapsed()) {
      return;
    }
    if (event.target instanceof Element && isClickDeckUiElement(event.target)) {
      return;
    }
    const rawTarget = event.target;
    const editableSvgTextTarget = getEditableSvgTextTarget(rawTarget);
    if (svgInlineEditor && svgInlineEditor.container.contains(rawTarget)) {
      return;
    }
    const hadSelectionContext = Boolean(selectedElement || editingElement);
    if (editingElement && editingElement.contains(rawTarget)) {
      return;
    }
    if (selectedElement instanceof HTMLElement && rawTarget === selectedElement && isLargeContainer(selectedElement)) {
      event.preventDefault();
      event.stopPropagation();
      clearSelection("double-click large container");
      return;
    }
    const resolution = resolveEditableTarget(rawTarget, selectedElement);
    const target = resolution.target;
    stopEditing();
    if (!target) {
      if (rawTarget instanceof Element && isClickDeckUiElement(rawTarget)) {
        return;
      }
      if (hadSelectionContext) {
        event.preventDefault();
        event.stopPropagation();
        clearSelection("background click");
      }
      return;
    }
    if (hadSelectionContext && resolution.source !== "direct") {
      event.preventDefault();
      event.stopPropagation();
      clearSelection(`non-direct click: ${resolution.source}`);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    selectedElement = target;
    const descriptor = describeElement(target);
    setSelectedElement(state, { element: target, descriptor });
    panel?.setHint(descriptor);
    const tag = target.tagName.toLowerCase();
    const mediaType = tag === "img" ? "image" : tag === "video" ? "video" : "none";
    panel?.setReplaceMediaAvailability(mediaType !== "none", mediaType);
    panel?.setSelectionContext(getSelectionContext(target));
    refreshSvgTextEditorState(target);
    if (editableSvgTextTarget) {
      openInlineSvgTextEditor(editableSvgTextTarget);
      updateOutline2();
      logger.info("Inline SVG text editing started", { target: describeElement(editableSvgTextTarget) });
      return;
    }
    if (target instanceof HTMLElement && canAutoStartTextEditing(target)) {
      editingElement = target;
      originalText = target.textContent ?? "";
      target.setAttribute("contenteditable", "true");
      target.focus();
      placeCaretFromPoint(target, event.clientX, event.clientY);
    } else {
      editingElement = null;
      originalText = "";
    }
    updateOutline2();
    logger.info("Element selected", descriptor);
  }
  function clearSelection(reason) {
    stopEditing();
    selectedElement = null;
    setSelectedElement(state, null);
    panel?.setHint(labels.selectHint);
    panel?.setReplaceMediaAvailability(false, "none");
    panel?.setSelectionContext("none");
    panel?.setSvgTextEditorState(null);
    updateOutline2();
    logger.info("Selection cleared", { reason });
  }
  function selectElement(target, reason) {
    stopEditing();
    selectedElement = target;
    const descriptor = describeElement(target);
    setSelectedElement(state, { element: target, descriptor });
    panel?.setHint(descriptor);
    const tag = target.tagName.toLowerCase();
    const mediaType = tag === "img" ? "image" : tag === "video" ? "video" : "none";
    panel?.setReplaceMediaAvailability(mediaType !== "none", mediaType);
    panel?.setSelectionContext(getSelectionContext(target));
    refreshSvgTextEditorState(target);
    updateOutline2();
    logger.info("Element selected", { descriptor, reason });
  }
  function handleSelectionShortcut(event) {
    if (!active) {
      return;
    }
    if (isPanelCollapsed()) {
      return;
    }
    if (event.code === "Escape") {
      if (!selectedElement && !editingElement) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      clearSelection("escape");
      return;
    }
    if (event.code === "Tab") {
      if (!selectedElement) {
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (!(selectedElement instanceof HTMLElement)) {
        return;
      }
      const direction = event.shiftKey ? "backward" : "forward";
      const next = getTabSwitchTarget(selectedElement, direction);
      if (!next || next === selectedElement) {
        return;
      }
      selectElement(next, `tab:${direction}`);
    }
  }
  function handleStyleAction(action) {
    if (!selectedElement || !("style" in selectedElement)) {
      return;
    }
    const targetElement = selectedElement;
    const changes = applyStyleAction(logger, targetElement, action);
    if (!changes || changes.length === 0) {
      return;
    }
    const createdAt = Date.now();
    const baseId = `${createdAt}-${state.patches.length + 1}`;
    const targetDescriptor = describeElement(targetElement);
    const targetLocator = createElementLocator(targetElement);
    const patches = changes.map((change, index) => {
      const patch = {
        id: `${baseId}-${index + 1}`,
        kind: "style",
        targetElement,
        targetDescriptor,
        targetLocator,
        property: change.property,
        before: change.before,
        after: change.after,
        createdAt
      };
      recordStylePatch(state, patch);
      return patch;
    });
    pushPatchGroup(history.undoStack, patches);
    history.redoStack.length = 0;
    logger.info("Style patch recorded", {
      patchIds: patches.map((patch) => patch.id),
      properties: patches.map((patch) => patch.property),
      target: targetDescriptor
    });
    updateOutline2();
    refreshHistoryButtons();
    persistPatches();
  }
  function applySvgTextEdits(targetSvg, updates) {
    const svgTextState = getSvgTextEditState(targetSvg);
    if (!svgTextState || svgTextState.mode !== "editable") {
      return;
    }
    const itemMap = new Map(svgTextState.items.map((item) => [item.id, item]));
    const patchTargets = updates.map((update) => {
      const item = itemMap.get(update.id);
      if (!item) {
        return null;
      }
      const nextValue = update.value;
      const before = item.target.textContent ?? "";
      if (before === nextValue) {
        return null;
      }
      item.target.textContent = nextValue;
      const patch = {
        id: "",
        kind: "content",
        targetElement: item.target,
        targetDescriptor: describeElement(item.target),
        targetLocator: createElementLocator(item.target),
        before,
        after: nextValue,
        createdAt: 0
      };
      return patch;
    }).filter((patch) => Boolean(patch));
    if (patchTargets.length === 0) {
      return;
    }
    const createdAt = Date.now();
    const batchId = `svg-text-${createdAt}-${state.patches.length + 1}`;
    const baseId = `${createdAt}-${state.patches.length + 1}`;
    const patches = patchTargets.map((patch, index) => ({
      ...patch,
      id: `${baseId}-${index + 1}`,
      batchId,
      createdAt
    }));
    for (const patch of patches) {
      recordContentPatch(state, patch);
    }
    pushPatchGroup(history.undoStack, patches);
    history.redoStack.length = 0;
    refreshHistoryButtons();
    persistPatches();
    refreshSvgTextEditorState(targetSvg);
    logger.info("SVG text edits applied", {
      patchIds: patches.map((patch) => patch.id),
      target: describeElement(targetSvg)
    });
  }
  function openInlineSvgTextEditor(target) {
    stopEditing();
    const ownerSvg = target.closest("svg");
    if (!(ownerSvg instanceof SVGSVGElement)) {
      return;
    }
    const rect = target.getBoundingClientRect();
    const style = window.getComputedStyle(target);
    const overlayRoot = overlay?.root ?? document.body;
    const highlight = document.createElement("div");
    highlight.className = "clickdeck-svg-inline-highlight";
    highlight.dataset.clickdeck = "true";
    Object.assign(highlight.style, {
      position: "fixed",
      left: `${rect.left - 4}px`,
      top: `${rect.top - 4}px`,
      width: `${rect.width + 8}px`,
      height: `${rect.height + 8}px`,
      zIndex: "2147483646"
    });
    const container = document.createElement("div");
    container.className = "clickdeck-svg-inline-popover";
    container.dataset.clickdeck = "true";
    container.tabIndex = -1;
    const title = document.createElement("div");
    title.className = "clickdeck-svg-inline-popover__title";
    title.textContent = labels.svgTextEditorTitle;
    const input = document.createElement("input");
    input.type = "text";
    input.value = target.textContent ?? "";
    input.className = "clickdeck-svg-inline-popover__input";
    input.dataset.clickdeck = "true";
    Object.assign(input.style, {
      fontSize: style.fontSize,
      fontFamily: style.fontFamily,
      fontWeight: style.fontWeight,
      letterSpacing: style.letterSpacing,
      lineHeight: style.lineHeight,
      color: style.fill && style.fill !== "none" ? style.fill : style.color
    });
    const actions = document.createElement("div");
    actions.className = "clickdeck-svg-inline-popover__actions";
    const applyButton = document.createElement("button");
    applyButton.type = "button";
    applyButton.className = "clickdeck-svg-inline-popover__button clickdeck-svg-inline-popover__button--primary";
    applyButton.dataset.clickdeck = "true";
    applyButton.textContent = labels.svgTextApply;
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "clickdeck-svg-inline-popover__button";
    cancelButton.dataset.clickdeck = "true";
    cancelButton.textContent = labels.svgTextCancel;
    actions.append(applyButton, cancelButton);
    container.append(title, input, actions);
    overlayRoot.append(highlight, container);
    positionSvgInlinePopover(container, rect);
    const commitAndRemove = () => {
      stopEditing();
    };
    const cancelAndRemove = () => {
      if (!svgInlineEditor) {
        return;
      }
      const { container: container2, highlight: highlight2, target: target2, ownerSvg: ownerSvg2, originalText: originalText2 } = svgInlineEditor;
      target2.textContent = originalText2;
      container2.remove();
      highlight2.remove();
      svgInlineEditor = null;
      refreshSvgTextEditorState(ownerSvg2);
    };
    input.addEventListener("input", () => {
      target.textContent = input.value;
    });
    input.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter") {
        evt.preventDefault();
        evt.stopPropagation();
        commitAndRemove();
        return;
      }
      if (evt.key === "Escape") {
        evt.preventDefault();
        evt.stopPropagation();
        cancelAndRemove();
      }
    });
    applyButton.addEventListener("click", (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      commitAndRemove();
    });
    cancelButton.addEventListener("click", (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      cancelAndRemove();
    });
    svgInlineEditor = {
      container,
      input,
      highlight,
      target,
      ownerSvg,
      originalText: target.textContent ?? ""
    };
    input.focus();
    input.select();
  }
  function positionSvgInlinePopover(container, rect) {
    const margin = 12;
    const gap = 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popoverRect = container.getBoundingClientRect();
    let left = rect.left;
    if (left + popoverRect.width > viewportWidth - margin) {
      left = Math.max(margin, rect.right - popoverRect.width);
    }
    let top = rect.bottom + gap;
    if (top + popoverRect.height > viewportHeight - margin) {
      top = Math.max(margin, rect.top - popoverRect.height - gap);
    }
    container.style.left = `${left}px`;
    container.style.top = `${top}px`;
  }
  function handlePanelAction(action) {
    stopEditing();
    if (action === "edit-svg-text") {
      if (!(selectedElement instanceof SVGSVGElement)) {
        return;
      }
      const targetSvg = selectedElement;
      const svgTextState = getSvgTextEditState(targetSvg);
      if (!svgTextState || svgTextState.mode !== "editable") {
        refreshSvgTextEditorState(targetSvg);
        return;
      }
      panel?.showSvgTextEditor({
        items: svgTextState.items.map((item, index) => ({
          id: item.id,
          label: `${labels.svgTextItemPrefix} ${index + 1}`,
          value: item.value
        })),
        warning: labels.svgTextWarning,
        onApply: (updates) => applySvgTextEdits(targetSvg, updates)
      });
      return;
    }
    if (action === "close") {
      deactivate();
      return;
    }
    if (action === "switch-language") {
      const newLang = getPanelLanguage() === "en" ? "zh" : "en";
      setLanguage(newLang);
      return;
    }
    if (action === "copy-diagnostics") {
      void writeClipboard(JSON.stringify(getRecentLogs(), null, 2));
      logger.info("Diagnostics copied to clipboard");
      return;
    }
    if (action === "copy-ai-prompt") {
      const effective = getEffectivePatches();
      const page = { url: pageHref, title: document.title };
      const intentInputs = intentDrafts.map((d) => ({
        operation: d.operation,
        sourceContext: d.context,
        targetContext: d.targetContext
      }));
      const unifiedResultEn = buildUnifiedPrompt(effective, intentInputs, { language: "en", page });
      if (!unifiedResultEn.ok) {
        const errMsg = unifiedResultEn.message;
        logger.info("No effective edits or intents to summarize for AI prompt", {
          intentMessage: errMsg
        });
        alert(errMsg);
        return;
      }
      let finalEn = unifiedResultEn.prompt;
      let hasMediaReplacement = unifiedResultEn.hasMediaReplacement;
      const unifiedResultZh = buildUnifiedPrompt(effective, intentInputs, { language: "zh", page });
      let finalZh = unifiedResultZh.ok ? [
        "\u4E2D\u6587\u53C2\u8003\u8BF4\u660E\uFF1A\u4EE5\u4E0B\u5185\u5BB9\u53EA\u7528\u4E8E\u4EBA\u5DE5\u6838\u5BF9\u4EFB\u52A1\u662F\u5426\u5B8C\u6574\u3001\u76EE\u6807\u662F\u5426\u51C6\u786E\u3001\u662F\u5426\u5B58\u5728\u6B67\u4E49\u3002\u5B9E\u9645\u590D\u5236\u7ED9 coding AI \u6267\u884C\u65F6\uFF0C\u4F18\u5148\u4F7F\u7528 English \u7248\u672C\u3002",
        "",
        unifiedResultZh.prompt
      ].join("\n") : "";
      panel?.showPromptPreview({
        promptEn: finalEn,
        promptZh: finalZh || finalEn,
        hasMediaReplacement,
        onCopy: (value, lang) => {
          if (!value.trim()) {
            logger.info("Copy cancelled: empty prompt");
            return;
          }
          writeClipboard(value).then(() => logger.info("AI edit prompt copied to clipboard", { lang })).catch((error) => logger.error("Failed to copy AI edit prompt", { error }));
        }
      });
      return;
    }
    if (action === "ask-gemini-flow" || action === "ask-gemini-focus" || action === "ask-gemini-interaction") {
      const promptKeyByAction = {
        "ask-gemini-flow": "flow",
        "ask-gemini-focus": "focus",
        "ask-gemini-interaction": "interaction"
      };
      const promptText = getAskGeminiPrompt(promptKeyByAction[action], getPanelLanguage());
      writeClipboard(promptText).then(() => {
        logger.info("Ask Gemini prompt copied to clipboard", { action });
        const btn = panel?.element.querySelector(`[data-action="${action}"]`);
        if (btn) {
          const originalText2 = btn.textContent;
          btn.textContent = "\u2713 " + labels.askGeminiCopied;
          setTimeout(() => {
            btn.textContent = originalText2;
          }, 2500);
        }
        const toast = document.createElement("div");
        toast.textContent = "\u2713 " + labels.askGeminiCopied;
        Object.assign(toast.style, {
          position: "fixed",
          bottom: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#1a1a2e",
          color: "#7acc4a",
          padding: "12px 24px",
          borderRadius: "10px",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          zIndex: "2147483647",
          fontSize: "14px",
          fontWeight: "600",
          pointerEvents: "none",
          transition: "opacity 0.3s ease"
        });
        document.body.appendChild(toast);
        setTimeout(() => {
          toast.style.opacity = "0";
          setTimeout(() => toast.remove(), 300);
        }, 2500);
      }).catch((error) => {
        logger.error("Failed to copy Ask Gemini prompt", { action, error });
        const btn = panel?.element.querySelector(`[data-action="${action}"]`);
        if (btn) {
          const originalText2 = btn.textContent;
          btn.textContent = labels.copyFailed;
          setTimeout(() => {
            btn.textContent = originalText2;
          }, 2e3);
        }
      });
      return;
    }
    if (action === "export-html") {
      exportHtmlSnapshot(logger);
      return;
    }
    if (action === "export-long-image") {
      exportLongImageSnapshot(logger);
      return;
    }
    if (action === "export-image-pdf-long") {
      if (detectPresentationSlides().length >= 2) {
        alert(labels.slidesPdfOnlyHint);
        return;
      }
      exportImagePdfLongSnapshot(logger);
      return;
    }
    if (action === "export-image-pdf-a4") {
      if (detectPresentationSlides().length >= 2) {
        alert(labels.slidesPdfOnlyHint);
        return;
      }
      exportImagePdfA4Snapshot(logger);
      return;
    }
    if (action === "export-image-pdf-slides") {
      exportImagePdfSlidesSnapshot(logger);
      return;
    }
    if (action === "present") {
      if (presentationController) {
        presentationController.enter().catch((err) => logger.error("Failed to enter presentation mode", err));
      }
      return;
    }
    if (action === "undo") {
      undoLastPatch();
      return;
    }
    if (action === "redo") {
      redoLastPatch();
      return;
    }
    if (action === "replace-image") {
      if (!(selectedElement instanceof HTMLImageElement)) {
        logger.warn("Replace image is only available for img elements");
        return;
      }
      const img = selectedElement;
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.style.display = "none";
      input.dataset.clickdeck = "true";
      document.body.appendChild(input);
      input.addEventListener(
        "change",
        () => {
          const file = input.files?.[0];
          if (!file) {
            input.remove();
            return;
          }
          const reader = new FileReader();
          reader.onerror = () => {
            logger.error("Failed to read image file", { fileName: file.name });
            input.remove();
          };
          reader.onload = () => {
            const result = reader.result;
            if (typeof result !== "string") {
              logger.error("Unexpected FileReader result when replacing image");
              input.remove();
              return;
            }
            const before = img.src;
            img.src = result;
            const patch = {
              id: `${Date.now()}-${state.patches.length + 1}`,
              kind: "attribute",
              targetElement: img,
              targetDescriptor: describeElement(img),
              targetLocator: createElementLocator(img),
              attribute: "src",
              before,
              after: result,
              createdAt: Date.now()
            };
            state.patches.push(patch);
            history.undoStack.push(patch);
            history.redoStack.length = 0;
            refreshHistoryButtons();
            updateOutline2();
            persistPatches();
            logger.info("Image replaced", { target: patch.targetDescriptor, fileName: file.name });
            input.remove();
          };
          reader.readAsDataURL(file);
        },
        { once: true }
      );
      input.click();
      return;
    }
    if (action === "replace-video") {
      if (!(selectedElement instanceof HTMLVideoElement)) {
        logger.warn("Replace video is only available for video elements");
        return;
      }
      const video = selectedElement;
      let targetForPatch = video;
      let targetAttr = "src";
      if (!video.hasAttribute("src")) {
        const source = video.querySelector("source");
        if (source) {
          targetForPatch = source;
        }
      }
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "video/*";
      input.style.display = "none";
      input.dataset.clickdeck = "true";
      document.body.appendChild(input);
      input.addEventListener(
        "change",
        () => {
          const file = input.files?.[0];
          if (!file) {
            input.remove();
            return;
          }
          const reader = new FileReader();
          reader.onerror = () => {
            logger.error("Failed to read video file", { fileName: file.name });
            input.remove();
          };
          reader.onload = () => {
            const result = reader.result;
            if (typeof result !== "string") {
              logger.error("Unexpected FileReader result when replacing video");
              input.remove();
              return;
            }
            const before = targetForPatch.getAttribute(targetAttr) || "";
            targetForPatch.setAttribute(targetAttr, result);
            video.load();
            const patch = {
              id: `${Date.now()}-${state.patches.length + 1}`,
              kind: "attribute",
              targetElement: targetForPatch,
              targetDescriptor: describeElement(targetForPatch),
              targetLocator: createElementLocator(targetForPatch),
              attribute: targetAttr,
              before,
              after: result,
              createdAt: Date.now()
            };
            state.patches.push(patch);
            history.undoStack.push(patch);
            history.redoStack.length = 0;
            refreshHistoryButtons();
            updateOutline2();
            persistPatches();
            logger.info("Video replaced", { target: patch.targetDescriptor, fileName: file.name });
            input.remove();
          };
          reader.readAsDataURL(file);
        },
        { once: true }
      );
      input.click();
      return;
    }
    if (typeof action === "string" && action.startsWith("color:")) {
      if (!selectedElement) {
        return;
      }
      if (!(selectedElement instanceof HTMLElement)) {
        return;
      }
      const colorValue = action.slice(6);
      const before = selectedElement.style.color;
      selectedElement.style.color = colorValue;
      const patch = {
        id: `${Date.now()}-${state.patches.length + 1}`,
        kind: "style",
        targetElement: selectedElement,
        targetDescriptor: describeElement(selectedElement),
        targetLocator: createElementLocator(selectedElement),
        property: "color",
        before,
        after: colorValue,
        createdAt: Date.now()
      };
      recordStylePatch(state, patch);
      history.undoStack.push(patch);
      history.redoStack.length = 0;
      logger.info("Color picker applied", { color: colorValue, target: patch.targetDescriptor });
      updateOutline2();
      refreshHistoryButtons();
      persistPatches();
      return;
    }
    if (action === "add-intent") {
      if (intentOverlay) return;
      clearSelection("escape");
      intentOverlay = createIntentOverlay(
        "clickdeck-intent-overlay-root",
        (rect) => {
          intentOverlay?.destroy();
          intentOverlay = null;
          const units = collectVisualUnits();
          const region = createIntentRegion({
            action: "intent",
            userIntent: "",
            viewportBox: rect
          });
          const context = buildRegionContext(region, units);
          const operation = {
            id: `op-${Date.now()}`,
            action: "intent",
            source: region,
            createdAt: Date.now()
          };
          const color = pickNextIntentColor(
            intentDrafts.map((draft) => draft.color),
            intentColors
          );
          const sourceMarker = createIntentMarker(region, color, "");
          intentDrafts.push({ operation, context, color, sourceMarker });
          refreshIntentDraftMarkers();
          persistPatches();
          if (!intentDraftPanel) {
            intentDraftPanel = buildIntentDraftPanel();
          }
          intentDraftPanel.show();
          intentDraftPanel.addDraft(operation, color);
        },
        () => {
          intentOverlay?.destroy();
          intentOverlay = null;
        },
        labels.drawRegionHint
      );
      return;
    }
    handleStyleAction(action);
  }
  function handleHistoryShortcut(event) {
    if (!active || !event.ctrlKey || event.altKey || event.metaKey || event.code !== "KeyZ") {
      return;
    }
    if (editingElement && document.activeElement === editingElement) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    stopEditing();
    if (event.shiftKey) {
      redoLastPatch();
      return;
    }
    undoLastPatch();
  }
  function activate() {
    active = true;
    setEditorActive(state, true);
    overlay = createOverlay(rootId2);
    panel = createPanel(handlePanelAction, {
      onCollapsedChange: syncCollapsedBrowsingMode,
      onLayoutChange: (layout) => {
        panelLayout = layout;
        intentDraftPanel?.setAnchorLayout(layout);
      }
    });
    overlay.root.append(panel.element);
    panel.syncLayout();
    refreshHistoryButtons();
    panel.setReplaceMediaAvailability(false, "none");
    panel.setSelectionContext("none");
    const slides = detectPresentationSlides();
    if (slides.length >= 2) {
      presentationController = createPresentationController({ slides, logger });
      panel.setPresentationAvailability(true);
    } else {
      presentationController = null;
      panel.setPresentationAvailability(false);
    }
    window.addEventListener("mousemove", handleMouseMove, true);
    window.addEventListener("click", handleClick, true);
    window.addEventListener("scroll", updateOutline2, true);
    window.addEventListener("resize", updateOutline2, true);
    window.addEventListener("keydown", handleHistoryShortcut, true);
    window.addEventListener("keydown", handleSelectionShortcut, true);
    logger.info("ClickDeck activated");
    window.dispatchEvent(new CustomEvent("clickdeck-state-change"));
    window.__clickdeckClearSavedEdits = clearPersistedPatches;
    window.__CLICKDECK_COLLECT_PRESENTATION_DIAGNOSTICS__ = () => collectPresentationDiagnostics();
    tryRestorePersistedPatches();
    visibilityCheckInterval = window.setInterval(() => {
      if (selectedElement || hoveredElement) {
        updateOutline2();
      }
    }, 200);
  }
  function deactivate() {
    active = false;
    stopEditing();
    setEditorActive(state, false);
    hoveredElement = null;
    selectedElement = null;
    setSelectedElement(state, null);
    panel?.setReplaceMediaAvailability(false, "none");
    panel?.setSelectionContext("none");
    presentationController?.destroy();
    presentationController = null;
    window.removeEventListener("mousemove", handleMouseMove, true);
    window.removeEventListener("click", handleClick, true);
    window.removeEventListener("scroll", updateOutline2, true);
    window.removeEventListener("resize", updateOutline2, true);
    window.removeEventListener("keydown", handleHistoryShortcut, true);
    window.removeEventListener("keydown", handleSelectionShortcut, true);
    if (visibilityCheckInterval !== null) {
      window.clearInterval(visibilityCheckInterval);
      visibilityCheckInterval = null;
    }
    panel?.destroy();
    panel = null;
    overlay?.destroy();
    overlay = null;
    intentOverlay?.destroy();
    intentOverlay = null;
    intentDraftPanel?.destroy();
    intentDraftPanel = null;
    intentDrafts.forEach(removeIntentDraftMarkers);
    delete window.__CLICKDECK_COLLECT_PRESENTATION_DIAGNOSTICS__;
    logger.info("ClickDeck deactivated");
    window.dispatchEvent(new CustomEvent("clickdeck-state-change"));
  }
  function setLanguage(lang) {
    setPanelLanguage(lang);
    labels = getPanelLabels();
    if (!active || !panel || !overlay) return;
    const wasCollapsed = panel.element.classList.contains("clickdeck-panel--collapsed");
    const hadOpacity70 = panel.element.classList.contains("clickdeck-panel--opacity-70");
    const hadOpacity40 = panel.element.classList.contains("clickdeck-panel--opacity-40");
    const panelRect = panel.element.getBoundingClientRect();
    panel.destroy();
    panel = createPanel(handlePanelAction, {
      onCollapsedChange: syncCollapsedBrowsingMode,
      onLayoutChange: (layout) => {
        panelLayout = layout;
        intentDraftPanel?.setAnchorLayout(layout);
      }
    });
    panel.element.style.left = `${panelRect.left}px`;
    panel.element.style.top = `${panelRect.top}px`;
    panel.element.style.right = "auto";
    if (wasCollapsed) panel.element.classList.add("clickdeck-panel--collapsed");
    if (hadOpacity70) panel.element.classList.add("clickdeck-panel--opacity-70");
    if (hadOpacity40) panel.element.classList.add("clickdeck-panel--opacity-40");
    overlay.root.append(panel.element);
    panel.syncLayout();
    panel.setHint(
      selectedElement ? `${labels.selectedHintPrefix} ${describeElement(selectedElement)}` : labels.selectHint
    );
    refreshHistoryButtons();
    panel.setReplaceMediaAvailability(false, "none");
    panel.setSelectionContext("none");
    if (intentDraftPanel && panelLayout) {
      intentDraftPanel.setAnchorLayout(panelLayout);
    }
    logger.info("ClickDeck language switched", { lang });
  }
  return {
    toggle: () => {
      if (active) {
        deactivate();
      } else {
        activate();
      }
    },
    isActive: () => active,
    setLanguage
  };
}

// src/react-compat.ts
function createReactCompatLayer(getPatches, logger) {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "attributes" || mutation.attributeName !== "style") {
        continue;
      }
      const el = mutation.target;
      if (!el.style) continue;
      const patches = getPatches();
      let reapplied = 0;
      for (const patch of patches) {
        if (patch.kind !== "style" || patch.targetElement !== el) continue;
        if (el.style[patch.property] !== patch.after) {
          el.style[patch.property] = patch.after;
          reapplied++;
        }
      }
      if (reapplied > 0) {
        logger.info("ReactCompat: re-applied ClickDeck patches after DOM mutation", {
          target: el.tagName,
          reapplyCount: reapplied
        });
      }
    }
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["style", "class"],
    subtree: true
  });
  return {
    destroy: () => observer.disconnect()
  };
}

// src/index.ts
var controller = null;
var reactCompat = null;
var rootId = "clickdeck-devtools-root";
var dbg = console.log.bind(console, "[ClickDeck:init]");
function initClickDeck(config) {
  if (controller) {
    console.warn("[ClickDeck] Already initialized. Call destroyClickDeck() first.");
    return;
  }
  try {
    dbg("Step 1/4: Creating logger...");
    const logger = createLogger("clickdeck-devtools");
    dbg("Step 1/4: Logger created OK");
    dbg("Step 2/4: Creating controller (rootId:", rootId, ")...");
    controller = createController(logger, rootId);
    dbg("Step 2/4: Controller created OK, isActive:", controller.isActive());
    dbg("Step 3/4: Setting up ReactCompat layer...");
    reactCompat = createReactCompatLayer(
      () => controller?._getEffectivePatches?.() ?? [],
      logger
    );
    dbg("Step 3/4: ReactCompat OK");
    logger.info("ClickDeck dev-tools initialized");
    dbg("Step 4/4: DONE \u2014 ClickDeck ready. Press Alt+Shift+C to toggle.");
  } catch (err) {
    console.error("[ClickDeck:init] INITIALIZATION FAILED:", err);
    console.error("[ClickDeck:init] Stack:", err?.stack);
    controller = null;
  }
}
function destroyClickDeck() {
  if (controller) {
    try {
      if (controller.isActive()) {
        controller.toggle();
      }
    } catch (e) {
      console.warn("[ClickDeck] Error deactivating controller:", e);
    }
    controller = null;
  }
  if (reactCompat) {
    try {
      reactCompat.destroy();
    } catch (e) {
      console.warn("[ClickDeck] Error destroying reactCompat:", e);
    }
    reactCompat = null;
  }
}
function toggleClickDeck() {
  try {
    controller?.toggle();
    dbg("Toggle complete, active:", controller?.isActive());
  } catch (err) {
    console.error("[ClickDeck:toggle] FAILED:", err);
  }
}
function isClickDeckActive() {
  return controller?.isActive() ?? false;
}
function setClickDeckLanguage(lang) {
  setPanelLanguage(lang);
  controller?.setLanguage?.(lang);
}
export {
  destroyClickDeck,
  initClickDeck,
  isClickDeckActive,
  setClickDeckLanguage,
  toggleClickDeck
};
