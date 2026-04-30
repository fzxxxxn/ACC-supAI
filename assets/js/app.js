const DATA = window.REVIEW_DATA;
const ITEMS = DATA.items;
const ITEMS_PER_PAGE = DATA.metadata.itemsPerPage || 10;
let currentPage = 1;
let currentQuery = "";

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "aac_blind_ab_review_responses_v1";

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value) {
  return String(value ?? "").toLowerCase();
}

function getResponses() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch (error) {
    return {};
  }
}

function saveResponses(responses) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(responses));
}

function filteredItems() {
  const q = normalize(currentQuery.trim());
  if (!q) return ITEMS;
  return ITEMS.filter(item => {
    const haystack = normalize([
      item.reviewId,
      item.originalId,
      item.sentence,
      ...(item.optionA.sequence || []),
      ...(item.optionB.sequence || []),
      ...(item.optionA.symbols || []).map(s => `${s.label} ${s.filename}`),
      ...(item.optionB.symbols || []).map(s => `${s.label} ${s.filename}`)
    ].join(" "));
    return haystack.includes(q);
  });
}

function totalPages() {
  return Math.max(1, Math.ceil(filteredItems().length / ITEMS_PER_PAGE));
}

function pageItems() {
  const list = filteredItems();
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  return list.slice(start, start + ITEMS_PER_PAGE);
}

function missingImageNode(filename) {
  const div = document.createElement("div");
  div.className = "placeholder";
  div.textContent = filename ? "Missing image" : "No image";
  div.title = filename || "No image";
  return div;
}

function renderSequence(sequence) {
  if (!sequence || sequence.length === 0) return `<li>No sequence</li>`;
  return sequence.map(item => `<li>${escapeHTML(item)}</li>`).join("");
}

function renderSymbols(symbols) {
  if (!symbols || symbols.length === 0) {
    return `<div class="symbol"><div class="symbol-label">No symbols</div><div class="placeholder">No image</div></div>`;
  }
  return symbols.map(symbol => {
    const label = escapeHTML(symbol.label || "Untitled");
    const filename = symbol.filename || "";
    if (!filename) {
      return `<div class="symbol">
        <div class="symbol-label">${label}</div>
        <div class="placeholder">No image</div>
      </div>`;
    }
    const safeFile = escapeHTML(filename);
    return `<div class="symbol">
      <div class="symbol-label">${label}</div>
      <img src="assets/images/${safeFile}" alt="${label}" title="${safeFile}"
           onerror="this.replaceWith(missingImageNode('${safeFile}'))">
    </div>`;
  }).join("");
}

function renderOption(label, option) {
  return `<section class="option" aria-label="Option ${label}">
    <div class="option-title">
      <h3>Option ${label}</h3>
    </div>
    <ul class="sequence">${renderSequence(option.sequence)}</ul>
    <div class="symbols">${renderSymbols(option.symbols)}</div>
  </section>`;
}

function criterionField(item, criterion, title) {
  const responses = getResponses();
  const selected = responses[item.reviewId]?.[criterion] || "";
  const options = ["A", "B", "Tie", "Neither"];
  return `<fieldset class="criterion">
    <legend>${escapeHTML(title)}</legend>
    <div class="radio-row">
      ${options.map(value => {
        const checked = selected === value ? "checked" : "";
        const id = `${item.reviewId}-${criterion}-${value}`;
        return `<label for="${id}">
          <input id="${id}" type="radio" name="${item.reviewId}-${criterion}" value="${value}" ${checked}
                 data-review-id="${item.reviewId}" data-field="${criterion}">
          ${value}
        </label>`;
      }).join("")}
    </div>
  </fieldset>`;
}

function renderReviewForm(item) {
  const responses = getResponses();
  const note = responses[item.reviewId]?.notes || "";
  return `<section class="review-form" aria-label="Review form for ${escapeHTML(item.reviewId)}">
    <div class="criteria-grid">
      ${criterionField(item, "accuracy", "Accuracy")}
      ${criterionField(item, "safety", "Safety")}
      ${criterionField(item, "clarity", "Symbol clarity")}
      ${criterionField(item, "overall", "Overall")}
    </div>
    <div class="notes-row">
      <label for="${item.reviewId}-notes">Notes</label>
      <textarea id="${item.reviewId}-notes" data-review-id="${item.reviewId}" data-field="notes"
                placeholder="Optional comments...">${escapeHTML(note)}</textarea>
    </div>
  </section>`;
}

function renderItem(item, visibleIndex) {
  return `<article class="review-card" id="${escapeHTML(item.reviewId)}">
    <div class="card-top">
      <div>
        <div class="item-id">${escapeHTML(item.reviewId)} · ${escapeHTML(item.originalId)}</div>
        <p class="sentence">${escapeHTML(item.sentence)}</p>
      </div>
      <div class="progress-pill">Page ${item.page} · #${item.position}</div>
    </div>
    <div class="option-grid">
      ${renderOption("A", item.optionA)}
      ${renderOption("B", item.optionB)}
    </div>
    ${renderReviewForm(item)}
  </article>`;
}

function renderPageOptions() {
  const select = $("page-select");
  const pages = totalPages();
  select.innerHTML = "";
  for (let i = 1; i <= pages; i++) {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = `${i}`;
    if (i === currentPage) option.selected = true;
    select.appendChild(option);
  }
}

function render() {
  const pages = totalPages();
  if (currentPage > pages) currentPage = pages;
  if (currentPage < 1) currentPage = 1;

  const container = $("items-container");
  const items = pageItems();
  container.innerHTML = items.length
    ? items.map(renderItem).join("")
    : `<div class="empty-state">No items match the current search.</div>`;

  $("total-items").textContent = filteredItems().length;
  $("current-page-stat").textContent = `${currentPage} / ${pages}`;
  $("page-label").textContent = `Page ${currentPage} of ${pages}`;
  $("prev-page").disabled = currentPage <= 1;
  $("prev-page-bottom").disabled = currentPage <= 1;
  $("next-page").disabled = currentPage >= pages;
  $("next-page-bottom").disabled = currentPage >= pages;
  renderPageOptions();
}

function setPage(page) {
  currentPage = Math.min(Math.max(1, page), totalPages());
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateResponse(reviewId, field, value) {
  const responses = getResponses();
  responses[reviewId] ||= {};
  responses[reviewId][field] = value;
  saveResponses(responses);
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

function exportCSV() {
  const responses = getResponses();
  const headers = [
    "review_id",
    "original_id",
    "page",
    "position",
    "sentence",
    "accuracy",
    "safety",
    "symbol_clarity",
    "overall",
    "notes"
  ];
  const rows = ITEMS.map(item => {
    const r = responses[item.reviewId] || {};
    return [
      item.reviewId,
      item.originalId,
      item.page,
      item.position,
      item.sentence,
      r.accuracy || "",
      r.safety || "",
      r.clarity || "",
      r.overall || "",
      r.notes || ""
    ].map(csvEscape).join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "aac_blind_ab_review_responses.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  $("prev-page").addEventListener("click", () => setPage(currentPage - 1));
  $("next-page").addEventListener("click", () => setPage(currentPage + 1));
  $("prev-page-bottom").addEventListener("click", () => setPage(currentPage - 1));
  $("next-page-bottom").addEventListener("click", () => setPage(currentPage + 1));
  $("page-select").addEventListener("change", (e) => setPage(Number(e.target.value)));
  $("export-csv").addEventListener("click", exportCSV);
  $("search-box").addEventListener("input", (e) => {
    currentQuery = e.target.value;
    currentPage = 1;
    render();
  });
  $("clear-search").addEventListener("click", () => {
    currentQuery = "";
    $("search-box").value = "";
    currentPage = 1;
    render();
  });

  document.addEventListener("change", (e) => {
    const target = e.target;
    if (target.matches("input[type='radio'][data-review-id]")) {
      updateResponse(target.dataset.reviewId, target.dataset.field, target.value);
    }
  });

  document.addEventListener("input", (e) => {
    const target = e.target;
    if (target.matches("textarea[data-review-id]")) {
      updateResponse(target.dataset.reviewId, target.dataset.field, target.value);
    }
  });
}

bindEvents();
render();
