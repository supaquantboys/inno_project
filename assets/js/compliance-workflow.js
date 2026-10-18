/* Atomic Compliance ledger events; quantities retain each product's own unit. */
(function (root) {
  const ADD = "Additions to Inventory",
    RED = "Reductions to Inventory",
    OPEN = "Opening Inventory Baseline";
  const PROCESS = "Quantity Taken for Further Processing or Planted";
  const FINISHED = [
    "Finished Extracts mg THC",
    "Finished Edible mg THC",
    "Finished Topicals mg THC",
  ];
  const batch = (tx) =>
    tx.productType === "Pure Intermediates kg"
      ? tx.midBatchId || tx.lateBatchId || tx.linkedBatchId || ""
      : FINISHED.includes(tx.productType)
        ? tx.lateBatchId || tx.midBatchId || tx.linkedBatchId || ""
        : tx.earlyBatchId || tx.linkedBatchId || tx.batchId || "";
  const day = (tx) =>
    tx.transactionDate ||
    tx.actionDate ||
    String(tx.timestamp || "").slice(0, 10);
  const delta = (tx) =>
    tx.recordType === "B300_REPORT_SUPPLEMENTAL"
      ? 0
      : tx.type === RED
        ? -Number(tx.quantity)
        : [ADD, OPEN, "Adjustments"].includes(tx.type)
          ? Number(tx.quantity)
          : 0;
  const today = (zone) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  const balance = (rows, product, id, date) =>
    rows
      .filter(
        (t) => t.productType === product && batch(t) === id && day(t) <= date,
      )
      .reduce((n, t) => n + delta(t), 0);
  const nextBatch = (rows, source, product) => {
    const base =
      source ||
      (product === "Pure Intermediates kg" ? "MB" : "LB") + "-" + Date.now();
    const used = new Set(rows.map(batch).filter(Boolean));
    if (!used.has(base)) return base;
    let i = 1;
    while (used.has(base + "-" + String(i).padStart(2, "0"))) i++;
    return base + "-" + String(i).padStart(2, "0");
  };
  function createEvent(tx, rows) {
    const legs = [{ ...tx }];
    const linked = (product, type, category, quantity, id) => ({
      ...tx,
      productType: product,
      type,
      category,
      quantity,
      earlyBatchId: "",
      midBatchId: "",
      lateBatchId: "",
      linkedBatchId: id,
      sourceBatchIds: [],
      ...{
        [product === "Pure Intermediates kg"
          ? "midBatchId"
          : FINISHED.includes(product)
            ? "lateBatchId"
            : "earlyBatchId"]: id,
      },
    });
    const production = tx.type === ADD && tx.category === "Total Production";
    if (production && tx.productType === "Vegetative Plants")
      legs.push(
        linked("Viable Seeds", RED, PROCESS, tx.quantity, tx.linkedBatchId),
      );
    if (
      tx.type === ADD &&
      tx.productType === "Whole Plants" &&
      tx.category === "Quantity Transferred from Vegetative Cannabis Plant"
    )
      legs.push(
        linked(
          "Vegetative Plants",
          RED,
          "Quantity Transferred to Whole Cannabis Plant",
          tx.quantity,
          tx.linkedBatchId,
        ),
      );
    if (
      tx.type === RED &&
      tx.productType === "Vegetative Plants" &&
      tx.category === "Quantity Transferred to Whole Cannabis Plant"
    )
      legs.push(
        linked(
          "Whole Plants",
          ADD,
          "Quantity Transferred from Vegetative Cannabis Plant",
          tx.quantity,
          batch(tx),
        ),
      );
    if (
      production &&
      ["Dried/Fresh Flowering kg", "Dried/Fresh Non-flowering kg"].includes(
        tx.productType,
      )
    )
      legs.push(
        linked(
          "Whole Plants",
          RED,
          "Plant Harvested",
          tx.sourceQuantity,
          tx.linkedBatchId,
        ),
      );
    if (
      production &&
      (tx.productType === "Pure Intermediates kg" ||
        FINISHED.includes(tx.productType))
    ) {
      const sources = (tx.sourceBatchIds || []).filter(Boolean);
      if (!sources.length || new Set(sources).size !== sources.length)
        throw Error("Choose distinct source batches.");
      sources.forEach((id, i) =>
        legs.push(
          linked(
            tx.productType === "Pure Intermediates kg"
              ? tx.sourceProducts?.[i] || "Dried/Fresh Flowering kg"
              : "Pure Intermediates kg",
            RED,
            PROCESS,
            tx.sourceQuantities?.[i],
            id,
          ),
        ),
      );
      if (
        !batch(tx) ||
        sources.includes(batch(tx)) ||
        rows.some((t) => batch(t) === batch(tx))
      )
        throw Error("Use a new destination batch ID for every production run.");
    }
    const needsOutput =
      tx.type === RED &&
      ((tx.productType === "Whole Plants" &&
        tx.category === "Plant Harvested") ||
        ([
          "Dried/Fresh Flowering kg",
          "Dried/Fresh Non-flowering kg",
          "Pure Intermediates kg",
        ].includes(tx.productType) &&
          tx.category === PROCESS));
    if (needsOutput) {
      const allowed =
        tx.productType === "Whole Plants"
          ? ["Dried/Fresh Flowering kg", "Dried/Fresh Non-flowering kg"]
          : tx.productType === "Pure Intermediates kg"
            ? FINISHED
            : ["Pure Intermediates kg"];
      if (!allowed.includes(tx.outputProduct) || !tx.outputBatchId)
        throw Error("Record the produced product and a new output batch.");
      if (
        tx.outputProduct !== "Dried/Fresh Flowering kg" &&
        tx.outputProduct !== "Dried/Fresh Non-flowering kg" &&
        (batch(tx) === tx.outputBatchId ||
          rows.some((t) => batch(t) === tx.outputBatchId))
      )
        throw Error("Use a new destination batch ID for every production run.");
      legs.push(
        linked(
          tx.outputProduct,
          ADD,
          "Total Production",
          tx.outputQuantity,
          tx.outputBatchId,
        ),
      );
      legs[legs.length - 1].sourceBatchIds = [batch(tx)];
    }
    return legs;
  }
  function validate(legs, rows, zone) {
    const now = today(zone);
    for (const tx of legs) {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(day(tx)) ||
        Number.isNaN(Date.parse(day(tx))) ||
        day(tx) > now
      )
        throw Error(
          "Transaction date must be valid and cannot be in the future.",
        );
      if (tx.actionDate && (tx.actionDate > now || tx.actionDate > day(tx)))
        throw Error(
          "Action date cannot be after the effective date or in the future.",
        );
      if (
        !Number.isFinite(Number(tx.quantity)) ||
        (tx.type !== "Adjustments" && Number(tx.quantity) <= 0)
      )
        throw Error("Enter a positive quantity for every input and output.");
      if (!batch(tx))
        throw Error("A batch ID is required, including for opening inventory.");
      if (
        ["Viable Seeds", "Vegetative Plants", "Whole Plants"].includes(
          tx.productType,
        ) &&
        !Number.isInteger(Number(tx.quantity))
      )
        throw Error("Seed and plant quantities must be whole numbers.");
    }
    const affected = new Map();
    legs.forEach((t) => affected.set(t.productType + "|" + batch(t), t));
    for (const tx of affected.values()) {
      const existing = rows.filter(
        (t) => t.productType === tx.productType && batch(t) === batch(tx),
      );
      const added = legs.filter(
        (t) => t.productType === tx.productType && batch(t) === batch(tx),
      );
      const dates = [...new Set([...existing, ...added].map(day))].sort();
      for (const date of dates) {
        if (
          balance([...existing, ...added], tx.productType, batch(tx), date) <
          -0.0000001
        )
          throw Error(
            `Insufficient ${tx.productType} in batch ${batch(tx)} on ${date}. Available on transaction date: ${balance(rows, tx.productType, batch(tx), day(tx)).toFixed(3)}.`,
          );
      }
    }
    return legs;
  }
  const api = {
    batch,
    day,
    delta,
    today,
    balance,
    nextBatch,
    createEvent,
    validate,
  };
  if (typeof module !== "undefined") module.exports = api;
  else root.ComplianceWorkflow = api;
})(typeof window === "undefined" ? globalThis : window);
