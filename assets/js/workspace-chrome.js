/* Attach shared shell controls inside each workspace's content, including after
   inventory view replacement or React navigation. Profile nodes retain their
   original controller/listeners when adopted into this same-origin document. */
(() => {
  const shell = window.top.WorkspaceChrome;
  if (!shell) return;
  const license = window.top.MarryLicense;
  const workspaceFeature = location.pathname.endsWith("legacy-app.html")
    ? "compliance_workspace"
    : "inventory_workspace";
  const locked = () => !license?.feature(workspaceFeature);
  const allowed = (el) =>
    !el.closest("[data-action]") &&
    Boolean(
      el.closest(
        ".content-context-bar, [data-license-navigation], [data-tab], [data-batch-open], [data-product-open], [data-product-back], [data-batch-back], [data-close], .table-pagination, .batch-filter",
      ),
    );
  const originals = new Map();
  function applyReadOnly() {
    const isLocked = locked();
    document.body.classList.toggle("workspace-readonly", isLocked);
    document
      .querySelectorAll("button, input, select, textarea, a[download]")
      .forEach((el) => {
        if (isLocked && !allowed(el)) {
          if (!originals.has(el))
            originals.set(el, {
              disabled: el.disabled,
              title: el.getAttribute("title"),
            });
          el.disabled = true;
          el.setAttribute("aria-disabled", "true");
          el.setAttribute("data-license-blocked", "true");
          el.title = "A license is required to use this action.";
        }
      });
    if (!isLocked) {
      for (const [el, original] of originals) {
        el.disabled = original.disabled;
        el.removeAttribute("aria-disabled");
        el.removeAttribute("data-license-blocked");
        if (original.title === null) el.removeAttribute("title");
        else el.title = original.title;
      }
      originals.clear();
    } else {
      for (const el of originals.keys())
        if (!el.isConnected) originals.delete(el);
    }
    const bar = document.querySelector(".content-context-bar");
    if (bar && !bar.querySelector(".readonly-label")) {
      const label = document.createElement("span");
      label.className = "readonly-label";
      label.textContent = "Read-only · License required";
      bar.querySelector(".content-context-left").appendChild(label);
    }
  }
  // Capture events before React or inventory handlers, including already-open forms.
  for (const name of ["click", "submit", "change", "input", "keydown"]) {
    document.addEventListener(
      name,
      (event) => {
        if (!locked() || allowed(event.target)) return;
        if (
          event.target.closest(
            "button, input, select, textarea, form, a[download]",
          )
        ) {
          if (name === "keydown" && ["Tab", "Escape"].includes(event.key))
            return;
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      true,
    );
  }
  window.top.addEventListener("marrywanna-license-changed", applyReadOnly);
  window.addEventListener("pagehide", () =>
    window.top.removeEventListener("marrywanna-license-changed", applyReadOnly),
  );
  const mount = () => {
    shell.mount(document);
    applyReadOnly();
  };
  new MutationObserver(mount).observe(document.body, {
    childList: true,
    subtree: true,
  });
  document.addEventListener("click", (event) => {
    const profile = document.getElementById("licenseProfile");
    if (profile && !profile.contains(event.target)) shell.closeProfile();
  });
  document.addEventListener("keydown", (event) => {
    const profile = document.getElementById("licenseProfile");
    if (event.key === "Escape" && profile?.classList.contains("open")) {
      shell.closeProfile();
      profile.querySelector("button").focus();
    }
  });
  mount();
})();
