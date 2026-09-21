/* Inventory presentation layer. Keep operational rules in shared-records.js / packaged-and-stamps.js. */
(() => {
  const icons = {
    dashboard:
      '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    products: '<path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9"/>',
    ledger: '<path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5"/>',
    guide: '<path d="M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3zM12 6v15"/>',
    settings:
      '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
  };
  const icon = (name) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${icons[name] || icons.products}</svg>`;
  const header = (title, subtitle, action = "") =>
    `<div class="pagehead"><div><div class="eyebrow">Workspace / Inventory</div><h2>${title}</h2><p>${subtitle}</p></div>${action}</div>`;
  const receiveButton =
    '<button class="btn primary" data-action="receive" data-product="fm">＋ Receive inventory</button>';
  const empty = (title, text, action = "") =>
    `<div class="card empty"><h3>${title}</h3><p>${text}</p>${action}</div>`;
  const oldBatchTable = batchTable;
  const oldBatchDetail = batchDetail;
  const oldProductDetail = productDetail;
  const oldProducts = productsPage;
  const oldTxTable = txTable;
  const decorateLinks = (html) =>
    html.replace(
      /<span class="link" data-batch-open="([^"]*)">(.*?)<\/span>/g,
      '<button type="button" class="link" data-batch-open="$1">$2</button>',
    );
  batchTable = (rows) =>
    rows.length
      ? decorateLinks(oldBatchTable(rows))
      : empty(
          "No batches to show",
          "Receive inventory to start a batch, or change your filters.",
          receiveButton,
        );
  batchDetail = (id) => decorateLinks(oldBatchDetail(id));
  productDetail = (id) => decorateLinks(oldProductDetail(id));
  txTable = (rows) =>
    rows.length
      ? decorateLinks(oldTxTable(rows))
      : empty(
          "Your activity will appear here",
          "Every completed action creates a traceable record for your compliance team.",
        );
  navHtml = () =>
    `<aside class="side"><div class="side-brand"><span>MW</span>MarryWanna</div><div class="nav-label">Operations</div><nav class="nav" aria-label="Inventory navigation">${Object.entries(
      {
        dashboard: "Overview",
        products: "Inventory",
        ledger: "Activity",
        guide: "B300 workflow",
        settings: "Settings & stamps",
      },
    )
      .map(
        ([key, label]) =>
          `<button data-tab="${key}" class="${ui.tab === key ? "active" : ""}" ${ui.tab === key ? 'aria-current="page"' : ""}>${icon(key)}${label}</button>`,
      )
      .join(
        "",
      )}</nav><div class="side-note"><b>Browser demo</b><br>Inventory and compliance share the same records on this device.</div></aside>`;
  const metric = (label, value, note, name) =>
    `<div class="card metric"><div class="metric-top"><div class="label">${label}</div><div class="metric-icon">${icon(name)}</div></div><div class="value">${value}</div><div class="sub">${note}</div></div>`;
  dashboard = () => {
    const batches = activeBatches(),
      lab = state.batches.filter((b) => b.labStatus === "In analysis"),
      unstamped = batches.filter(
        (b) => b.inventoryForm === "packaged" && b.stampStatus !== "Stamped",
      );
    const events = new Set(
      state.transactions.map((t) => t.businessEventId || t.id),
    );
    return (
      header(
        "Operations overview",
        "A clear view of your inventory, next actions, and compliance trail.",
        receiveButton,
      ) +
      `<div class="workflow-banner"><div><div class="eyebrow">From batch to return</div><h3>Every action tells the next part of the story.</h3><p>Work with your batches. Review the resulting records in Compliance.</p><div class="flow-steps"><span>Receive</span>→<span>Grow & process</span>→<span>Package & stamp</span>→<span>Deliver</span></div></div><button class="btn" data-tab="guide">Explore workflow ↗</button></div>` +
      `<div class="grid cards4">${metric("Active batches", batches.length, "Across all product types", "products")}${metric("Awaiting lab results", lab.length, "Samples sent for analysis", "guide")}${metric("Ready for stamping", unstamped.length, "Packaged, unstamped batches", "settings")}${metric("Recorded events", events.size, "Linked actions, one shared record", "ledger")}</div>` +
      `<div class="section"><div class="section-title"><h3>Current inventory <span class="count">· ${batches.length} batches</span></h3><button class="btn" data-tab="products">View all inventory →</button></div>${batchTable(batches.slice(0, 6))}</div>` +
      `<div class="split-grid section"><div><div class="section-title"><h3>Recent activity</h3><button class="btn" data-tab="ledger">View activity</button></div>${eventCards(state.transactions.slice(0, 12), 4)}</div><div><div class="section-title"><h3>Needs attention</h3></div><div class="card">${
        [
          ...lab.map((b) => ({
            b,
            label: "Record lab results",
            action: "lab",
          })),
          ...unstamped.map((b) => ({
            b,
            label: "Apply excise stamps",
            action: "stamp",
          })),
        ]
          .slice(0, 4)
          .map(
            ({ b, label, action }) =>
              `<div class="attention-row"><div><b>${esc(b.id)}</b><p>${esc(label)}</p></div><button class="action" data-action="${action}" data-product="${b.product}" data-batch="${esc(b.id)}">Continue →</button></div>`,
          )
          .join("") ||
        '<p class="muted">You’re all caught up.</p><p class="tiny muted">Batches needing lab results or stamps will appear here.</p>'
      }</div></div></div>`
    );
  };
  function eventCards(rows, limit = Infinity) {
    const groups = new Map();
    rows.forEach((t) => {
      const key = t.businessEventId || t.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(t);
    });
    if (!groups.size)
      return empty(
        "No activity yet",
        "Receive your first shipment to begin the workflow.",
      );
    return `<div class="card">${[...groups.values()]
      .slice(0, limit)
      .map((group) => {
        const t = group[0];
        return `<details class="event-detail"><summary><b>${esc(t.eventLabel || ACTIONS[t.action] || t.category || "Compliance record")}</b><span class="count"> · ${group.length} record${group.length === 1 ? "" : "s"} · ${esc(new Date(t.timestamp).toLocaleDateString("en-CA"))}</span></summary><div style="margin:14px 0">${txTable(group)}</div></details>`;
      })
      .join("")}</div>`;
  }
  productsPage = () => {
    if (ui.product) return oldProducts();
    const query = (ui.batchSearch || "").toLowerCase();
    const rows = activeBatches().filter(
      (b) =>
        (!query ||
          `${b.id} ${PRODUCTS[b.product].label} ${b.location}`
            .toLowerCase()
            .includes(query)) &&
        (!ui.inventoryForm || b.inventoryForm === ui.inventoryForm),
    );
    return (
      header(
        "Inventory",
        "Find a batch, check its stage, and choose the next action.",
        receiveButton,
      ) +
      `<div class="batch-filter"><input class="input" id="batchSearch" aria-label="Search inventory" placeholder="Search batch, product, or location…" value="${esc(ui.batchSearch || "")}"><select class="input" id="inventoryFormFilter" aria-label="Inventory form"><option value="">All inventory</option><option value="unpackaged" ${ui.inventoryForm === "unpackaged" ? "selected" : ""}>Unpackaged · Part B</option><option value="packaged" ${ui.inventoryForm === "packaged" ? "selected" : ""}>Packaged · Part C</option></select></div><div id="batchResults">${batchTable(rows)}</div><div class="section"><div class="section-title"><h3>Browse by product</h3></div>${oldProducts().replace(/^.*?<div class="grid products">/s, '<div class="grid products">')}</div>`
    );
  };
  ledger = () => {
    const q = ui.search.toLowerCase(),
      rows = state.transactions.filter(
        (t) => !q || JSON.stringify(t).toLowerCase().includes(q),
      );
    return (
      header(
        "Activity",
        "Review complete business events and the B300 records they created.",
        '<button class="btn" id="refreshShared">↻ Refresh data</button>',
      ) +
      `<div class="batch-filter"><input id="ledgerSearch" class="input" aria-label="Search activity" placeholder="Search batch, event, or B300 category…" value="${esc(ui.search)}"></div>${eventCards(rows)}`
    );
  };
  settingsPage = () =>
    header(
      "Settings & stamps",
      "Manage storage locations and jurisdiction-specific excise stamps.",
    ) +
    `<div class="card"><h3 style="margin-top:0">Storage locations</h3><p class="tiny muted">Available to both Inventory and Compliance.</p><div class="actions" style="margin-bottom:20px">${state.locations.map((x) => `<span class="status available">${esc(x)}</span>`).join("")}</div><form id="locationForm" class="toolbar"><input name="location" aria-label="New storage location" class="input" placeholder="New storage location" required><button class="btn primary">Add location</button></form></div>`;
  function guide() {
    const parts = [
      [
        "A",
        "Business & reporting period",
        "Confirm the licensee, premises, return type, and reporting dates in Compliance.",
      ],
      [
        "B",
        "Unpackaged inventory",
        "Receive → cultivate → harvest → process. Keep units, kilograms, and mg THC separate.",
      ],
      [
        "C",
        "Packaged inventory",
        "Final consumer packaging moves quantity from Part B to Part C. Stamping is a separate action.",
      ],
      [
        "D",
        "Excise stamps",
        "Receive stamps by jurisdiction, apply them to packaged batches, and record unusable stamps.",
      ],
      [
        "E",
        "Sales & duty",
        "Delivery records support review. Sales values and duty still need completion in Compliance.",
      ],
      [
        "F",
        "Certification",
        "An authorized person checks and certifies the return. Exporting a PDF does not file it.",
      ],
    ];
    return (
      header(
        "Your B300 workflow",
        "One operational record, from receiving inventory to reviewing the return.",
      ) +
      `<div class="guide-grid">${parts.map(([letter, title, text]) => `<article class="card"><span class="guide-letter">PART ${letter}</span><h3>${title}</h3><p>${text}</p></article>`).join("")}</div><div class="card section"><h3>Before preparing a return</h3><p class="muted">Reconcile physical inventory, confirm the reporting period, review exceptions, and complete sales and duty information. This demo supports review; it does not submit a return.</p><a class="link" href="https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/excise-duties-levies/cannabis-duty/cannabis-duty-information-return.html" target="_blank" rel="noopener">Read CRA’s B300 instructions ↗</a></div>`
    );
  }
  // Extend the existing renderer once, keeping the stamp/license modules intact.
  const previousRender = render;
  render = function () {
    previousRender();
    if (ui.tab === "guide" && !ui.batch) {
      document.querySelector(".main").innerHTML = guide();
      bind();
    }
    enhance();
  };
  function bindBatchLinks(root = document) {
    root.querySelectorAll("[data-batch-open]").forEach(
      (el) =>
        (el.onclick = () => {
          ui.batch = el.dataset.batchOpen;
          render();
        }),
    );
    root.querySelectorAll("[data-action]").forEach(
      (el) =>
        (el.onclick = (e) => {
          e.stopPropagation();
          openAction(
            el.dataset.action,
            el.dataset.product,
            el.dataset.batch || null,
          );
        }),
    );
  }
  function enhance() {
    bindBatchLinks();
    document.querySelectorAll(".product-card").forEach((el) => {
      el.tabIndex = 0;
      el.setAttribute("role", "button");
      el.setAttribute(
        "aria-label",
        `View ${PRODUCTS[el.dataset.productOpen].label}`,
      );
      el.onkeydown = (e) => {
        if (e.target === el && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          el.click();
        }
      };
    });
    const search = document.getElementById("ledgerSearch");
    if (search)
      search.oninput = (e) => {
        const cursor = e.target.selectionStart;
        ui.search = e.target.value;
        render();
        const next = document.getElementById("ledgerSearch");
        next.focus();
        next.setSelectionRange(cursor, cursor);
      };
    const filter = () => {
      const input = document.getElementById("batchSearch"),
        cursor = input?.selectionStart;
      ui.batchSearch = input.value;
      ui.inventoryForm = document.getElementById("inventoryFormFilter").value;
      const focused = document.activeElement.id;
      render();
      const next = document.getElementById(focused);
      next?.focus();
      if (focused === "batchSearch") next.setSelectionRange(cursor, cursor);
    };
    const bs = document.getElementById("batchSearch");
    if (bs) bs.oninput = filter;
    const form = document.getElementById("inventoryFormFilter");
    if (form) form.onchange = filter;
    const refresh = document.getElementById("refreshShared");
    if (refresh)
      refresh.onclick = () => {
        state = loadState();
        render();
        toast("Shared records refreshed.");
      };
    document
      .querySelectorAll(".footer-note")
      .forEach(
        (el) =>
          (el.textContent =
            "MarryWanna · Browser-local demo · Inventory and Compliance share records on this device"),
      );
  }
  const impact = (action) =>
    ({
      receive:
        "Adds received inventory to Part B, or domestically purchased unstamped packages to Part C.",
      grow: "Links the source reduction and resulting plants in one event. Vegetative-to-whole-plant transfers are 1:1.",
      harvest:
        "Reduces harvested whole plants in units and records material produced in kilograms.",
      process:
        "Reduces the input product and records output in its own unit of measure.",
      package:
        "Reduces Part B and adds the same material quantity to Part C. Packages remain unstamped.",
      stamp:
        "Reduces the selected jurisdiction’s available stamps and records Part D usage.",
      send: "Reduces the selected batch. Packaged domestic deliveries update Part C; Part E sales and duty require separate review.",
      loss: "Records a supported loss or destruction. Packaged destruction also reduces the package count.",
      lab:
        ui.labMode === "record"
          ? "Records the result only. It does not add the sample back into inventory."
          : "Reduces only the sample sent for analysis. The remaining inventory stays available.",
      move: "Updates the storage location without changing B300 quantities.",
      mix: "Combines unpackaged batches in the same product category without inflating B300 production.",
      clone:
        "Records new vegetative plants as production. The mother batch is retained.",
    })[action] || "Creates linked records for compliance review.";
  // Reopening after a stale-form warning must reload the latest shared state.
  const openCurrentAction = openAction;
  openAction = function (...args) {
    state = loadState();
    return openCurrentAction(...args);
  };
  let focusBeforeModal = null;
  closeModal = function () {
    ui.action = null;
    ui.actionRevision = null;
    document.getElementById("modalRoot")?.remove();
    document.body.style.overflow = "";
    if (focusBeforeModal?.isConnected) focusBeforeModal.focus();
    else document.querySelector(".nav button.active")?.focus();
  };
  renderModal = function () {
    document.getElementById("modalRoot")?.remove();
    if (!ui.action) return;
    focusBeforeModal = document.activeElement;
    ui.actionRevision = window.inventoryRevision();
    document.body.style.overflow = "hidden";
    const wrap = document.createElement("div");
    wrap.id = "modalRoot";
    wrap.innerHTML = `<div class="modal-bg"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="actionTitle"><div class="modal-head"><div><div class="eyebrow">Inventory action</div><h3 id="actionTitle">${esc(ACTIONS[ui.action])}</h3><p>Enter the details, then review before recording.</p></div><button type="button" class="x" data-close aria-label="Close action">×</button></div><form id="actionForm"><div class="modal-body"><div id="formError" role="alert" tabindex="-1"></div><div id="editStep"><div class="formgrid" id="dynamicFields"></div></div><div id="reviewStep" class="hidden"></div><div class="review-impact"><b>B300 impact</b><div id="impactCopy">${esc(impact(ui.action))}</div></div></div><div class="modal-foot"><span class="step-label" id="stepLabel">Step 1 of 2 · Details</span><button class="btn" type="button" data-close>Cancel</button><button class="btn hidden" type="button" id="editAction">Back to details</button><button class="btn primary" type="submit" id="saveAction">Review action →</button></div></form></section></div>`;
    document.body.appendChild(wrap);
    const form = wrap.querySelector("form");
    let reviewing = false;
    const fields = () => {
      const root = wrap.querySelector("#dynamicFields");
      root.innerHTML = actionFields(
        ui.action,
        ui.actionProduct || "seeds",
        ui.actionBatch,
      );
      root.querySelectorAll(".field").forEach((field, i) => {
        const control = field.querySelector("input,select,textarea"),
          label = field.querySelector("label"),
          help = field.querySelector("small");
        if (control) {
          control.id = `action-field-${i}`;
          label?.setAttribute("for", control.id);
          if (help) {
            help.id = `action-help-${i}`;
            control.setAttribute("aria-describedby", help.id);
          }
        }
      });
      const current = form.elements.namedItem("current");
      if (current) current.readOnly = true;
      const packaged =
        form.elements.namedItem("inventoryForm")?.value === "packaged";
      const packages = form.elements.namedItem("packageCount");
      if (ui.action === "receive" && packages) {
        packages.required = packaged;
        packages.closest(".field").hidden = !packaged;
        const scope = form.elements.namedItem("scope");
        scope.disabled = packaged;
        if (packaged) scope.value = "domestic";
      }
    };
    fields();
    wrap
      .querySelectorAll("[data-close]")
      .forEach((el) => (el.onclick = closeModal));
    // Handle conditional fields without discarding entered supplier / reference / quantity.
    form.addEventListener("change", (e) => {
      const name = e.target.name;
      if (name.startsWith("mix_")) {
        const quantity = form.elements.namedItem("qty_" + name.slice(4));
        quantity.disabled = !e.target.checked;
        return;
      }
      if (!["product", "batchId", "labMode", "inventoryForm"].includes(name))
        return;
      const old = new FormData(form),
        changed = e.target.value;
      if (name === "product") {
        ui.actionProduct = changed;
        ui.actionBatch = null;
      }
      if (name === "batchId") ui.actionBatch = changed;
      if (name === "labMode") {
        ui.labMode = changed;
        ui.actionBatch = null;
      }
      fields();
      for (const [key, value] of old) {
        if (
          (name === "product" && ["quantity", "packageCount"].includes(key)) ||
          ["batchId", "product"].includes(key) ||
          (name === "labMode" && ["percent", "thc", "document"].includes(key))
        )
          continue;
        const control = form.elements.namedItem(key);
        if (control && control.type !== "checkbox") control.value = value;
      }
      if (name === "inventoryForm" || name === "product") {
        const packaged =
            form.elements.namedItem("inventoryForm")?.value === "packaged",
          packages = form.elements.namedItem("packageCount"),
          scope = form.elements.namedItem("scope");
        if (packages && ui.action === "receive") {
          packages.required = packaged;
          packages.closest(".field").hidden = !packaged;
          scope.disabled = packaged;
          if (packaged) scope.value = "domestic";
        }
      }
      wrap.querySelector("#impactCopy").textContent = impact(ui.action);
    });
    const edit = () => {
      reviewing = false;
      wrap.querySelector("#editStep").classList.remove("hidden");
      wrap.querySelector("#reviewStep").classList.add("hidden");
      wrap.querySelector("#editAction").classList.add("hidden");
      wrap.querySelector("#saveAction").textContent = "Review action →";
      wrap.querySelector("#stepLabel").textContent = "Step 1 of 2 · Details";
      form.querySelector("input,select,textarea")?.focus();
    };
    wrap.querySelector("#editAction").onclick = edit;
    form.onsubmit = (e) => {
      e.preventDefault();
      const error = wrap.querySelector("#formError");
      error.innerHTML = "";
      if (!reviewing) {
        const entries = [
          ...form.querySelectorAll(
            "#dynamicFields input,#dynamicFields select,#dynamicFields textarea",
          ),
        ].filter(
          (el) =>
            !el.disabled &&
            !el.closest("[hidden]") &&
            el.type !== "checkbox" &&
            el.value,
        );
        wrap.querySelector("#reviewStep").innerHTML =
          `<h3>Review ${esc(ACTIONS[ui.action].toLowerCase())}</h3><dl class="review-list">${entries.map((el) => `<dt>${esc(el.getAttribute("aria-label") || el.closest(".field")?.querySelector("label")?.textContent || el.name)}</dt><dd>${esc(el.tagName === "SELECT" ? el.selectedOptions[0]?.textContent : el.value)}</dd>`).join("")}</dl>`;
        reviewing = true;
        wrap.querySelector("#editStep").classList.add("hidden");
        wrap.querySelector("#reviewStep").classList.remove("hidden");
        wrap.querySelector("#editAction").classList.remove("hidden");
        wrap.querySelector("#saveAction").textContent = "Confirm & record";
        wrap.querySelector("#stepLabel").textContent = "Step 2 of 2 · Review";
        wrap.querySelector("#saveAction").focus();
        return;
      }
      const button = wrap.querySelector("#saveAction");
      button.disabled = true;
      try {
        const fd = new FormData(form);
        if (fd.get("inventoryForm") === "packaged" && ui.action === "receive")
          fd.set("scope", "domestic");
        executeAction(ui.action, fd);
        closeModal();
      } catch (err) {
        edit();
        error.innerHTML = `<div class="alert error">${esc(err.message || String(err))}</div>`;
        error.focus();
        button.disabled = false;
      }
    };
    wrap.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
      }
      if (e.key === "Tab") {
        const els = [
          ...wrap.querySelectorAll("button,input,select,textarea"),
        ].filter((el) => !el.disabled && el.getClientRects().length);
        const first = els[0],
          last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
    form.querySelector("input,select,textarea")?.focus();
  };
  window.addEventListener("storage", (e) => {
    if (Object.values(STORAGE).includes(e.key)) {
      if (ui.action) {
        toast(
          "Shared records changed. Close and reopen this action to refresh.",
        );
        return;
      }
      state = loadState();
      render();
    }
  });
  render();
})();
