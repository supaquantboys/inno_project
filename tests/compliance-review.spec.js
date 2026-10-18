const { test, expect } = require("@playwright/test");
// Nested workspace frames and complete A–E reports need extra time on local Chrome.
test.setTimeout(120000);
const workflow = require("../assets/js/compliance-workflow");
const ADD = "Additions to Inventory",
  RED = "Reductions to Inventory",
  OPEN = "Opening Inventory Baseline";
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const earlier = new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10);
const seed = {
  id: "seed",
  productType: "Viable Seeds",
  type: OPEN,
  category: OPEN,
  quantity: 100,
  earlyBatchId: "SEED-1",
  transactionDate: earlier,
};
const event = (tx, rows) =>
  workflow.validate(workflow.createEvent(tx, rows), rows, "UTC");
test("seed to VCP and both VCP/WCP entry directions create paired ledger legs", () => {
  const vcp = {
    productType: "Vegetative Plants",
    type: ADD,
    category: "Total Production",
    quantity: 30,
    earlyBatchId: "SEED-1",
    linkedBatchId: "SEED-1",
    transactionDate: yesterday,
  };
  const a = event(vcp, [seed]);
  expect(a).toHaveLength(2);
  expect(
    workflow.balance([seed, ...a], "Viable Seeds", "SEED-1", yesterday),
  ).toBe(70);
  const wcp = {
    ...vcp,
    productType: "Whole Plants",
    category: "Quantity Transferred from Vegetative Cannabis Plant",
    quantity: 20,
  };
  const b = event(wcp, [seed, ...a]);
  expect(
    workflow.balance(
      [seed, ...a, ...b],
      "Vegetative Plants",
      "SEED-1",
      yesterday,
    ),
  ).toBe(10);
  const c = event(
    {
      ...vcp,
      type: RED,
      category: "Quantity Transferred to Whole Cannabis Plant",
      quantity: 2,
    },
    [seed, ...a, ...b],
  );
  expect(c[1].productType).toBe("Whole Plants");
  expect(
    workflow.balance(
      [seed, ...a, ...b, ...c],
      "Whole Plants",
      "SEED-1",
      yesterday,
    ),
  ).toBe(22);
});
test("backdated/future and overspent inventory events are rejected atomically", () => {
  const fm = {
    ...seed,
    productType: "Dried/Fresh Flowering kg",
    quantity: 30,
    transactionDate: yesterday,
  };
  const consume = {
    ...fm,
    type: RED,
    category: "Quantity Taken for Further Processing or Planted",
    quantity: 2,
    transactionDate: earlier,
    outputProduct: "Pure Intermediates kg",
    outputBatchId: "PI-1",
    outputQuantity: 0.2,
  };
  expect(() => event(consume, [fm])).toThrow(/Insufficient/);
  expect(() =>
    event({ ...consume, transactionDate: "2099-01-01" }, [fm]),
  ).toThrow(/future/);
  expect(() =>
    event({ ...consume, transactionDate: yesterday, quantity: 31 }, [fm]),
  ).toThrow(/Insufficient/);
  const spent = { ...fm, type: RED, quantity: 29, transactionDate: yesterday };
  expect(() =>
    event({ ...consume, transactionDate: earlier }, [
      { ...fm, transactionDate: earlier },
      spent,
    ]),
  ).toThrow(/Insufficient/);
});
test("harvest and processing preserve independent input/output units and new batch identity", () => {
  const plants = { ...seed, productType: "Whole Plants", quantity: 20 };
  const harvest = event(
    {
      ...plants,
      type: RED,
      category: "Plant Harvested",
      quantity: 10,
      transactionDate: yesterday,
      outputProduct: "Dried/Fresh Flowering kg",
      outputBatchId: "FM-1",
      outputQuantity: 30,
    },
    [plants],
  );
  expect(harvest.map((t) => Number(t.quantity))).toEqual([10, 30]);
  const process = event(
    {
      ...harvest[1],
      type: RED,
      category: "Quantity Taken for Further Processing or Planted",
      quantity: 2,
      outputProduct: "Pure Intermediates kg",
      outputBatchId: "PI-1",
      outputQuantity: 0.2,
    },
    [plants, ...harvest],
  );
  expect(process[1].productType).toBe("Pure Intermediates kg");
  const rows = [plants, ...harvest, ...process];
  expect(workflow.nextBatch(rows, "PI-1", "Pure Intermediates kg")).toBe(
    "PI-1-01",
  );
  expect(() => event({ ...process[0], outputBatchId: "PI-1" }, rows)).toThrow(
    /new destination/,
  );
});
async function enterCompliance(page, records = [seed]) {
  await page.addInitScript(
    (rows) => localStorage.setItem("b300_transactions", JSON.stringify(rows)),
    records,
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Compliance" }).click();
  const app = page.frameLocator("#appFrame").frameLocator("#f");
  await expect(
    app.getByRole("button", { name: "Inventory Ledger", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  return app;
}
test("Compliance form posts paired seed/VCP records and inventory report drills down", async ({
  page,
}) => {
  const app = await enterCompliance(page);
  await app
    .getByRole("button", { name: "Inventory Ledger", exact: true })
    .click();
  await app
    .getByRole("button", { name: "Add Transaction", exact: true })
    .click();
  await app
    .locator('select[name="productType"]')
    .selectOption("Vegetative Plants");
  await app.locator('select[name="type"]').selectOption(ADD);
  await app.locator('select[name="category"]').selectOption("Total Production");
  await app
    .locator("select")
    .filter({ has: app.locator('option[value="SEED-1"]') })
    .last()
    .selectOption("SEED-1");
  await app.locator('input[name="quantity"]').fill("30");
  await app.locator('input[name="transactionDate"]').fill(yesterday);
  await app.locator('button[form="txForm"]').click();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("b300_transactions")).length,
      ),
    )
    .toBe(3);
  const records = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("b300_transactions")),
  );
  expect(records.filter((t) => t.businessEventId)).toHaveLength(2);
  await app.getByRole("button", { name: "Dashboard", exact: true }).click();
  await app
    .getByRole("button", { name: "Inspect Viable Seeds", exact: true })
    .click();
  await expect(
    app.getByRole("heading", { name: "Inventory Report", exact: true }),
  ).toBeVisible();
  await expect(app.getByLabel("Report product")).toHaveValue("Viable Seeds");
  await expect(
    app.getByRole("cell", { name: "70.000", exact: true }).first(),
  ).toBeVisible();
  await app.getByRole("button", { name: "B300 Reports", exact: true }).click();
  for (const heading of [
    "Part A · Business information",
    "Part B - Cannabis product inventory - Unpackaged",
    "Part C - Cannabis product inventory - Packaged",
  ])
    await expect(
      app.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
});
test("Compliance rejects historical overspend and exposes editable carry-over batches", async ({
  page,
}) => {
  const app = await enterCompliance(page, [
    {
      ...seed,
      productType: "Dried/Fresh Flowering kg",
      quantity: 30,
      transactionDate: yesterday,
    },
  ]);
  await app
    .getByRole("button", { name: "Inventory Ledger", exact: true })
    .click();
  await app
    .getByRole("button", { name: "Add Transaction", exact: true })
    .click();
  await app
    .locator('select[name="productType"]')
    .selectOption("Dried/Fresh Flowering kg");
  await app.locator('select[name="type"]').selectOption(RED);
  await app
    .locator('select[name="category"]')
    .selectOption("Quantity Taken for Further Processing or Planted");
  await app.locator('select[name="linkedBatchId"]').selectOption("SEED-1");
  await app.locator('input[name="quantity"]').fill("31");
  await app
    .getByLabel("Produced product")
    .selectOption("Pure Intermediates kg");
  await app.getByLabel("Produced quantity").fill(".2");
  await app.locator('button[form="txForm"]').click();
  await expect(app.getByRole("alert")).toContainText("Insufficient");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("b300_transactions")).length,
    ),
  ).toBe(1);
  await app.locator('select[name="type"]').selectOption(OPEN);
  await expect(app.getByLabel("Opening inventory batch ID")).toBeEditable();
});

test("separate PI runs consume explicit source kg and allocate distinct output batches", () => {
  const fm = {
    ...seed,
    productType: "Dried/Fresh Flowering kg",
    quantity: 100,
  };
  const production = {
    productType: "Pure Intermediates kg",
    type: ADD,
    category: "Total Production",
    quantity: 0.5,
    midBatchId: "SEED-1-01",
    sourceBatchIds: ["SEED-1"],
    sourceQuantities: [2],
    transactionDate: yesterday,
  };
  const first = event(production, [fm]);
  const rows = [fm, ...first];
  const secondId = workflow.nextBatch(rows, "SEED-1", "Pure Intermediates kg");
  expect(secondId).toBe("SEED-1-02");
  const second = event({ ...production, midBatchId: secondId }, rows);
  expect(
    workflow.balance(
      [...rows, ...second],
      "Dried/Fresh Flowering kg",
      "SEED-1",
      yesterday,
    ),
  ).toBe(96);
  expect(() => event({ ...production, midBatchId: "SEED-1" }, [fm])).toThrow(
    /new destination/,
  );
});

test("inventory report distinguishes product running total from individual batch balance", async ({
  page,
}) => {
  const app = await enterCompliance(page, [
    seed,
    { ...seed, id: "seed2", earlyBatchId: "SEED-2", quantity: 50 },
  ]);
  await app
    .getByRole("button", { name: "Inventory Report", exact: true })
    .click();
  await app.getByLabel("Report product").selectOption("Viable Seeds");
  await app.getByLabel("Report batch").selectOption("SEED-2");
  const cells = app.locator("tbody tr").first().locator("td");
  await expect(cells.nth(5)).toHaveText("50.000");
  await expect(cells.nth(6)).toHaveText("150.000");
});
