(() => {
  "use strict";
  const LIC_KEY = "marryWannaOfflineLicense",
    TEST_KEY = "marryWannaFreeUnlock";
  let testUnlocked = sessionStorage.getItem(TEST_KEY) === "1";
  const ALL_FEATURES = [
    "marrywanna_core",
    "inventory_workspace",
    "compliance_workspace",
    "b300_reports",
    "audit_log",
    "administration",
    "batch_operations",
    "lab_management",
    "packaged_inventory",
    "excise_stamps",
  ];
  const readFeatures = () => {
    if (testUnlocked) return new Set(ALL_FEATURES);
    try {
      const d = JSON.parse(localStorage.getItem(LIC_KEY) || "null"),
        p = d?.payload;
      if (!p || p.product_id !== "marrywanna-b300") return new Set();
      const now = Date.now();
      if (now < Date.parse(p.not_before) || now > Date.parse(p.expires_at))
        return new Set();
      return new Set(Array.isArray(p.features) ? p.features : []);
    } catch (_) {
      return new Set();
    }
  };
  const has = (f) => readFeatures().has(f);
  const requirement = (action) =>
    action === "lab"
      ? "lab_management"
      : action === "package"
        ? "packaged_inventory"
        : action === "stamp"
          ? "excise_stamps"
          : [
                "receive",
                "send",
                "loss",
                "clone",
                "mix",
                "grow",
                "harvest",
                "process",
                "move",
              ].includes(action)
            ? "batch_operations"
            : null;
  const oldOpen = openAction;
  openAction = function (action, product, batchId = null) {
    const need = requirement(action);
    if (need && !has(need)) {
      toast(
        `${ACTIONS[action] || action} is not included in this license (${need}).`,
      );
      return;
    }
    return oldOpen(action, product, batchId);
  };
  const oldExecute = executeAction;
  executeAction = function (action, fd) {
    let need = requirement(action);
    if (action === "receive" && fd.get("inventoryForm") === "packaged")
      need = "packaged_inventory";
    if (need && !has(need))
      throw Error(`This license does not include ${need}.`);
    return oldExecute(action, fd);
  };
  const oldRender = render;
  function patch() {
    document.querySelectorAll("[data-action]").forEach((btn) => {
      const need = requirement(btn.dataset.action);
      if (need && !has(need)) {
        btn.disabled = true;
        btn.title = `License feature required: ${need}`;
        btn.style.opacity = ".45";
      }
    });
    const stamp = document.getElementById("stampPanel");
    if (stamp && !has("excise_stamps")) stamp.remove();
    const note = document.querySelector(".side-note");
    if (note) {
      const f = [...readFeatures()].filter((x) => x !== "marrywanna_core");
      note.innerHTML = testUnlocked
        ? "<b>Demo workspace</b><br>Changes stay in this browser. Switch to Compliance to review the same records."
        : "<b>Shared operational record</b><br>Your license controls which actions are available. Manage it from your profile.";
    }
  }
  render = function () {
    oldRender();
    patch();
  };
  window.addEventListener("message", (e) => {
    if (
      e.origin !== location.origin ||
      e.data?.type !== "marrywanna-test-unlock"
    )
      return;
    testUnlocked = !!e.data.enabled;
    render();
  });
  render();
})();
