const { test, expect } = require("@playwright/test");
async function enter(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Inventory" }).click();
  const app = page.frameLocator("#appFrame");
  await expect(
    app.getByRole("heading", { name: "Operations overview" }),
  ).toBeVisible();
  return app;
}
async function receive(
  app,
  { product = "fm", quantity = "10", packaged = false } = {},
) {
  await app.getByRole("button", { name: "Receive inventory" }).first().click();
  await app.getByLabel("Product type").selectOption(product);
  await app.getByLabel("Supplier").fill("Demo supplier");
  await app.getByLabel(/^Quantity/).fill(quantity);
  if (packaged) {
    await app.getByLabel("Inventory form").selectOption("packaged");
    await app.getByLabel("Package count").fill("100");
  }
  await app.getByRole("button", { name: "Review action" }).click();
  await expect(
    app.getByRole("button", { name: "Confirm & record" }),
  ).toBeVisible();
  await app.getByRole("button", { name: "Confirm & record" }).click();
  await expect(app.getByRole("dialog")).toHaveCount(0);
}
async function frame(page) {
  return page.frames().find((f) => f.url().includes("batch-manager-v2"));
}
test("receive, preserve conditional fields, review, search and reload", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const app = await enter(page);
  await receive(app, { packaged: true });
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("b300_shared_batch_metadata")),
  );
  expect(Object.values(data.batches)[0]).toMatchObject({
    qty: 10,
    inventoryForm: "packaged",
    packageCount: 100,
  });
  await app.getByRole("button", { name: "Inventory", exact: true }).click();
  await app
    .getByRole("textbox", { name: "Search inventory" })
    .fill("not-a-batch");
  await expect(
    app.getByRole("heading", { name: "No batches to show" }),
  ).toBeVisible();
  await app.getByRole("textbox", { name: "Search inventory" }).fill("LB-");
  await expect(app.locator("#batchResults tbody tr")).toHaveCount(1);
  await page.reload();
  await expect(
    app.getByRole("heading", { name: "Operations overview" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("keyboard dismissal and responsive layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const app = await enter(page);
  await app.getByRole("button", { name: "Receive inventory" }).first().click();
  await expect(app.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(app.getByRole("dialog")).toHaveCount(0);
  const f = await frame(page);
  expect(
    await f.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await app.getByRole("button", { name: "B300 workflow", exact: true }).click();
  await expect(
    app.getByRole("heading", { name: "Your B300 workflow" }),
  ).toBeVisible();
});
test("cultivation, sample, packaging, stamps and delivery preserve linked quantities", async ({
  page,
}) => {
  await enter(page);
  const f = await frame(page);
  const result = await f.evaluate(() => {
    const act = (a, p, x) => {
      ui.actionRevision = null;
      ui.actionProduct = p;
      ui.actionBatch = null;
      const fd = new FormData();
      Object.entries(x).forEach(([k, v]) => fd.set(k, v));
      executeAction(a, fd);
    };
    act("receive", "seeds", {
      product: "seeds",
      quantity: 20,
      party: "Supplier",
      scope: "domestic",
      location: "Vault A",
    });
    let seeds = state.batches[0];
    act("grow", "seeds", {
      batchId: seeds.id,
      quantity: 10,
      location: "Grow Room 1",
    });
    let vcp = state.batches[0];
    act("grow", "vcp", {
      batchId: vcp.id,
      quantity: 10,
      location: "Grow Room 2",
    });
    let wcp = state.batches[0];
    const transfer = state.transactions.slice(0, 2).map((t) => ({
      category: t.category,
      event: t.businessEventId,
      qty: t.quantity,
    }));
    act("harvest", "wcp", {
      batchId: wcp.id,
      quantity: 10,
      outputProduct: "fm",
      outputQty: 5,
      location: "Dry Room",
    });
    let flower = state.batches[0];
    act("lab", "fm", {
      batchId: flower.id,
      labMode: "send",
      percent: 10,
      document: "sample-1",
    });
    const sampleRemaining = getBatch(flower.id).qty;
    act("lab", "fm", {
      batchId: flower.id,
      labMode: "record",
      thc: 20,
      document: "COA-1",
    });
    act("package", "fm", {
      batchId: flower.id,
      quantity: 4,
      packageCount: 40,
      location: "Finished Goods",
    });
    let packaged = state.batches[0];
    const packageEvent = state.transactions
      .slice(0, 2)
      .map((t) => t.businessEventId);
    localStorage.setItem(
      "b300_shared_stamp_inventory",
      JSON.stringify({ Ontario: 50 }),
    );
    act("stamp", "fm", {
      batchId: packaged.id,
      jurisdiction: "Ontario",
      stampsUsed: 40,
    });
    const before = JSON.stringify(state);
    let rejected = false;
    try {
      act("send", "fm", {
        batchId: packaged.id,
        party: "Buyer",
        quantity: 4,
        packagesDelivered: 1,
      });
    } catch (e) {
      rejected = true;
    }
    const unchanged = before === JSON.stringify(state);
    act("send", "fm", {
      batchId: packaged.id,
      party: "Buyer",
      quantity: 2,
      packagesDelivered: 20,
    });
    act("loss", "fm", {
      batchId: packaged.id,
      quantity: 2,
      packagesDestroyed: 20,
      lossMode: "destroy",
      reason: "Recall",
      method: "Demo destruction method",
    });
    state = loadState();
    return {
      transfer,
      sampleRemaining,
      packageEvent,
      rejected,
      unchanged,
      packaged: getBatch(packaged.id),
      stamps: JSON.parse(localStorage.getItem("b300_shared_stamp_inventory")),
    };
  });
  expect(result.transfer[0].event).toBe(result.transfer[1].event);
  expect(result.transfer.map((x) => x.category)).toContain(
    "Quantity Transferred from Vegetative Cannabis Plant",
  );
  expect(result.sampleRemaining).toBe(4.5);
  expect(result.packageEvent[0]).toBe(result.packageEvent[1]);
  expect(result.rejected && result.unchanged).toBeTruthy();
  expect(result.packaged.qty).toBe(0);
  expect(result.packaged.packageCount).toBe(0);
  expect(result.stamps.Ontario).toBe(10);
});
test("same-product mixing is inventory neutral in B300 and rolls back invalid multi-batch actions", async ({
  page,
}) => {
  await enter(page);
  const f = await frame(page);
  const result = await f.evaluate(() => {
    const act = (a, fields) => {
      ui.actionRevision = null;
      ui.actionProduct = "fm";
      const fd = new FormData();
      Object.entries(fields).forEach(([k, v]) => fd.set(k, v));
      executeAction(a, fd);
    };
    act("receive", {
      product: "fm",
      quantity: 10,
      party: "A",
      location: "Vault A",
      scope: "domestic",
    });
    const a = state.batches[0].id;
    act("receive", {
      product: "fm",
      quantity: 10,
      party: "B",
      location: "Vault A",
      scope: "domestic",
    });
    const b = state.batches[0].id;
    const before = JSON.stringify(state),
      raw = localStorage.getItem(STORAGE.transactions);
    let rejected = false;
    try {
      act("mix", {
        ["mix_" + a]: 1,
        ["mix_" + b]: 1,
        ["qty_" + a]: 5,
        ["qty_" + b]: 100,
        location: "Vault A",
      });
    } catch (e) {
      rejected = true;
    }
    const rollback =
      before === JSON.stringify(state) &&
      raw === localStorage.getItem(STORAGE.transactions);
    act("mix", {
      ["mix_" + a]: 1,
      ["mix_" + b]: 1,
      ["qty_" + a]: 5,
      ["qty_" + b]: 5,
      location: "Vault A",
    });
    const tx = state.transactions.slice(0, 3);
    state = loadState();
    return {
      rejected,
      rollback,
      types: tx.map((t) => t.type),
      delta: tx.reduce((n, t) => n + t.inventoryDelta, 0),
      total: totalForProduct("fm"),
      quantities: state.batches.map((b) => b.qty).sort(),
    };
  });
  expect(result.rejected && result.rollback).toBeTruthy();
  expect(
    result.types.every((t) => t === "Internal Transfer / Retention"),
  ).toBeTruthy();
  expect(result.delta).toBe(0);
  expect(result.total).toBe(20);
  expect(result.quantities).toEqual([10, 5, 5]);
});
test("lab results can be recorded after the full batch was sampled", async ({
  page,
}) => {
  const app = await enter(page);
  await receive(app, { quantity: "1" });
  const f = await frame(page);
  await f.evaluate(() => {
    const fd = new FormData();
    fd.set("batchId", state.batches[0].id);
    fd.set("labMode", "send");
    fd.set("percent", "100");
    ui.actionRevision = null;
    executeAction("lab", fd);
  });
  await app.getByRole("button", { name: "Continue" }).click();
  await expect(app.getByLabel("Lab action")).toHaveValue("record");
  await app.getByLabel("THC %").fill("18");
  await app.getByLabel("Document / COA reference").fill("COA-100");
  await app.getByRole("button", { name: "Review action" }).click();
  await app.getByRole("button", { name: "Confirm & record" }).click();
  await expect(app.getByRole("dialog")).toHaveCount(0);
});
test("switching to compliance retains records and protects generated event legs", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const app = await enter(page);
  await receive(app);
  const before = await page.evaluate(() =>
    localStorage.getItem("b300_transactions"),
  );
  await page.getByRole("button", { name: "Compliance", exact: true }).click();
  const compliance = page.frameLocator("#appFrame").frameLocator("#f");
  await expect(
    compliance.getByRole("button", { name: "Inventory Ledger", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await compliance
    .getByRole("button", { name: "Inventory Ledger", exact: true })
    .click();
  await expect(
    compliance.getByText("Linked event", { exact: true }),
  ).toBeVisible();
  await expect(
    compliance.getByRole("button", { name: "Edit", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("b300_transactions")),
  ).toBe(before);
  await compliance
    .getByRole("button", { name: "B300 Reports", exact: true })
    .click();
  await expect(
    compliance.getByText("Reporting Period", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Inventory", exact: true }).click();
  await expect(
    app.getByRole("heading", { name: "Operations overview" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("stale actions are rejected without overwriting another workspace", async ({
  page,
}) => {
  const app = await enter(page);
  await app.getByRole("button", { name: "Receive inventory" }).first().click();
  await app.getByLabel("Supplier").fill("Supplier");
  await app.getByLabel(/^Quantity/).fill("10");
  await app.getByRole("button", { name: "Review action" }).click();
  await page.evaluate(() =>
    localStorage.setItem(
      "b300_transactions",
      JSON.stringify([{ id: "external-event", quantity: 0 }]),
    ),
  );
  await app.getByRole("button", { name: "Confirm & record" }).click();
  await expect(app.getByRole("alert")).toContainText("Shared data changed");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("b300_transactions")).length,
    ),
  ).toBe(1);
});

test("offline PDF export clearly identifies the Part B fallback", async ({
  page,
}) => {
  test.setTimeout(120000); // Filling the embedded 12-page CRA template is CPU intensive.
  const external = [];
  await page.route("**/*", async (route) => {
    if (new URL(route.request().url()).hostname !== "127.0.0.1") {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  const app = await enter(page);
  await receive(app);
  await page.getByRole("button", { name: "Compliance", exact: true }).click();
  const compliance = page.frameLocator("#appFrame").frameLocator("#f");
  await compliance
    .getByRole("button", { name: "B300 Reports", exact: true })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await compliance
    .getByRole("button", { name: "Export report PDF", exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^Part_B_Working_Copy_.*\.pdf$/);
  const { PDFDocument } = require("pdf-lib");
  const bytes = require("node:fs").readFileSync(await download.path());
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBe(2);
  await expect(compliance.getByRole("dialog")).toContainText(
    "not a complete B300 return",
  );
  expect(external).toEqual([]);
});
