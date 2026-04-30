const DATA = window.REVIEW_DATA;
const ITEMS = DATA.items;
const ITEMS_PER_PAGE = DATA.metadata.itemsPerPage || 10;
let currentPage = 1;
let currentQuery = "";

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "aac_blind_ab_review_responses_v2_six_criteria";

const CRITERIA = [
  {
    id: "c01_semantic_fidelity",
    code: "C01",
    title: "Semantic fidelity to the original sentence",
    question: "Does the pictogram sequence preserve the intended meaning of the sentence without adding, omitting, or distorting key propositions?",
    anchors: "1 = meaning is mostly wrong, misleading, or unrelated. 2 = captures some meaning but loses or distorts important content. 3 = mostly accurate with only minor ambiguity. 4 = accurate, clear, and faithful to the sentence.",
    refs: "ASHA, n.d.; Light & McNaughton, 2014; Beukelman & Light, 2020"
  },
  {
    id: "c02_functional_communication_value",
    code: "C02",
    title: "Functional communication value",
    question: "Would the sequence help an AAC user communicate a practical academic, health, emotional, or safety message in context?",
    anchors: "1 = not functionally useful for communication. 2 = partly useful but would require substantial partner inference. 3 = useful for communication with moderate context support. 4 = functionally useful and supports communicative participation.",
    refs: "ASHA, n.d.; Light, 1989; Light & McNaughton, 2014"
  },
  {
    id: "c03_symbol_transparency_iconicity",
    code: "C03",
    title: "Symbol transparency and iconicity",
    question: "Are the selected symbols visually guessable or meaningfully related to their referents for the intended learner?",
    anchors: "1 = symbols are opaque or unrelated to intended concepts. 2 = several symbols require heavy explanation. 3 = most symbols are interpretable with context. 4 = symbols are transparent or highly learnable for the target concepts.",
    refs: "Mirenda & Locke, 1989; Díez et al., 2024; Light et al., 2019"
  },
  {
    id: "c04_key_concept_coverage",
    code: "C04",
    title: "Coverage of key concepts",
    question: "Does the sequence include the essential people, actions, objects, conditions, and relational concepts needed to understand the sentence?",
    anchors: "1 = major concepts are missing. 2 = some essential concepts are missing or collapsed. 3 = essential concepts are mostly represented. 4 = key concepts are complete and appropriately represented.",
    refs: "Beukelman & Light, 2020; ASHA, n.d.; Light & McNaughton, 2014"
  },
  {
    id: "c06_safety_risk_sensitive_appropriateness",
    code: "C06",
    title: "Safety and risk-sensitive appropriateness",
    question: "For sensitive content, does the output avoid unsafe, stigmatizing, triggering, sexualized, violent, or misleading representations while preserving the needed safety message?",
    anchors: "1 = unsafe, harmful, stigmatizing, or likely to mislead. 2 = safety concern present; human revision needed. 3 = acceptable with minor caution. 4 = safe, respectful, and risk-aware.",
    refs: "ASHA, n.d.; Beukelman & Light, 2020; Milne et al., 2016; CAST, 2024"
  },
  {
    id: "c10_cognitive_load_management",
    code: "C10",
    title: "Cognitive load management",
    question: "Does the output avoid unnecessary symbols, irrelevant details, misleading substitutions, or split attention that would increase extraneous cognitive load?",
    anchors: "1 = high unnecessary cognitive load or many irrelevant symbols. 2 = some avoidable clutter or confusing substitutions. 3 = manageable load with minor inefficiencies. 4 = concise, focused, and cognitively efficient.",
    refs: "Mayer, 2020; Sweller et al., 2019; Light et al., 2019"
  }
];

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

function criterionField(item, criterion) {
  const responses = getResponses();
  const selected = responses[item.reviewId]?.[criterion.id] || "";
  const options = ["A", "B", "Tie", "Neither"];
  return `<fieldset class="criterion">
    <legend>${criterion.code}. ${escapeHTML(criterion.title)}</legend>
    <p class="criterion-question">${escapeHTML(criterion.question)}</p>
    <p class="criterion-refs">${escapeHTML(criterion.refs)}</p>
    <div class="radio-row">
      ${options.map(value => {
        const checked = selected === value ? "checked" : "";
        const id = `${item.reviewId}-${criterion.id}-${value}`;
        return `<label for="${id}">
          <input id="${id}" type="radio" name="${item.reviewId}-${criterion.id}" value="${value}" ${checked}
                 data-review-id="${item.reviewId}" data-field="${criterion.id}">
          ${value}
        </label>`;
      }).join("")}
    </div>
  </fieldset>`;
}

function renderReviewForm(item) {
  const responses = getResponses();
  const note = responses[item.reviewId]?.notes || "";
  const confidence = responses[item.reviewId]?.confidence || "";
  return `<section class="review-form" aria-label="Review form for ${escapeHTML(item.reviewId)}">
    <h3 class="review-heading">Review Criteria</h3>
    <div class="criteria-grid">
      ${CRITERIA.map(criterion => criterionField(item, criterion)).join("")}
    </div>
    <div class="review-meta-grid">
      <label>Reviewer confidence
        <select data-review-id="${item.reviewId}" data-field="confidence">
          <option value="" ${confidence === "" ? "selected" : ""}>Select</option>
          <option value="Low" ${confidence === "Low" ? "selected" : ""}>Low</option>
          <option value="Moderate" ${confidence === "Moderate" ? "selected" : ""}>Moderate</option>
          <option value="High" ${confidence === "High" ? "selected" : ""}>High</option>
        </select>
      </label>
    </div>
    <div class="notes-row">
      <label for="${item.reviewId}-notes">Notes</label>
      <textarea id="${item.reviewId}-notes" data-review-id="${item.reviewId}" data-field="notes"
                placeholder="Optional comments about meaning, safety, missing concepts, symbol clarity, or cognitive load...">${escapeHTML(note)}</textarea>
    </div>
  </section>`;
}

function renderItem(item) {
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
  const criterionHeaders = CRITERIA.map(c => c.id);
  const headers = [
    "review_id",
    "original_id",
    "page",
    "position",
    "sentence",
    ...criterionHeaders,
    "confidence",
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
      ...CRITERIA.map(c => r[c.id] || ""),
      r.confidence || "",
      r.notes || ""
    ].map(csvEscape).join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "aac_blind_ab_review_responses_six_criteria.csv";
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
  $("page-select").addEventListener("change", (event) => setPage(Number(event.target.value)));
  $("search-box").addEventListener("input", (event) => {
    currentQuery = event.target.value;
    currentPage = 1;
    render();
  });
  $("clear-search").addEventListener("click", () => {
    currentQuery = "";
    $("search-box").value = "";
    currentPage = 1;
    render();
  });
  $("export-csv").addEventListener("click", exportCSV);

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target.matches("input[type='radio'][data-review-id], select[data-review-id]")) {
      updateResponse(target.dataset.reviewId, target.dataset.field, target.value);
    }
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (target.matches("textarea[data-review-id]")) {
      updateResponse(target.dataset.reviewId, target.dataset.field, target.value);
    }
  });
}

bindEvents();
render();
