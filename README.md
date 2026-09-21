# MarryWanna · B300 workspaces

A static, browser-local inventory and compliance demo. Inventory staff work with batches; compliance staff review the same transactions and prepare a B300 return.

## Demo on GitHub Pages

Open **https://supaquantboys.github.io/inno_project/** and choose **Explore Inventory** or **Explore Compliance**. These buttons explicitly enter the existing testing-unlock mode for the browser session. The profile menu still provides offline-license testing and sign out.

The workspace icon beside the content-area label opens an optional drawer for switching between Inventory and Compliance. There is no persistent global top bar. The workspace icon and profile sit in a pinned header at the top of the main content in both views. Inventory Overview prioritizes Needs attention before metrics, current inventory, and recent activity.

Pages currently deploys `main`, from the repository root. Merge an approved change into `main` to update that demo. There is no application build step, server, API key, or client-side router to configure. All local assets use relative paths so the `/inno_project/` prefix works. Existing entry URLs and storage keys are retained.

The Compliance interface is precompiled and its React, icon and PDF dependencies are bundled locally with their licenses. It no longer relies on CDNs at runtime. The existing report calculations and embedded CRA PDF template are retained.

## Local development

```sh
npm ci
npm run build # after editing Compliance JSX or updating vendor dependencies
npm start
# Open http://127.0.0.1:4173
```

Node 22 or newer is recommended for the development tools. Node is not needed to host the static files on Pages.

```sh
npx playwright install chromium
npm test
```

To use an installed Chrome instead: `CHROME_PATH="/path/to/chrome" npm test`.

## Suggested walkthrough

1. Explore Inventory and receive flowering material, for example 10 kg, into Vault A.
2. Open its batch. Send a 1% sample to analysis; confirm the remaining 9.900 kg stays available. Record a THC result and COA reference.
3. Package 4 kg as 40 final consumer packages. Review the action before confirming. The event creates a Part B reduction and a Part C addition.
4. In Settings & stamps, receive 40 Ontario stamps. Open the packaged batch and apply all 40 stamps.
5. Deliver 2 kg and 20 packages to a demo buyer. The other 2 kg and 20 packages remain in inventory.
6. Switch to Compliance, inspect the Inventory Ledger and B300 Reports. Finish sales/duty information separately before any real filing process.

Use fictional information. Data is saved in localStorage on the current origin; other devices, browsers, and localhost versus GitHub Pages have separate datasets. Switching roles does not clear records. No example records are inserted automatically.

## Code map

- `index.html`: shared entry, workspace drawer, profile/license controller.
- `assets/js/workspace-chrome.js`, `assets/css/workspace-chrome.css`: shared content-area profile placement and drawer styling.
- `batch-manager-v2.html`: stable inventory entry point and explicit script order.
- `assets/css/workspace.css`: shared design tokens, responsive layouts and controls.
- `assets/css/inventory.css`: base inventory component styles.
- `assets/js/inventory/model.js`: products, quantities, batches, storage compatibility.
- `forms.js`, `actions.js`, `views.js`: original operational forms, mutations and reusable views, now formatted for maintenance.
- `lab.js`: sample/result eligibility, including fully sampled batches.
- `shared-records.js`: linked business events and packaged inventory metadata.
- `packaged-and-stamps.js`: packaged receipt and jurisdiction stamp operations.
- `action-boundary.js`: cross-workspace change detection, validation and rollback.
- `workspace.js`: overview, search, navigation, grouped activity, accessible two-step form.
- `entitlements.js`: existing inventory feature gates.
- `legacy.html`, `legacy-app.html`: stable Compliance wrapper and report entry.
- `src/compliance.jsx`: editable Compliance React source, including the embedded CRA PDF.
- `assets/js/compliance.js`, `assets/css/compliance.css`, `assets/vendor/`: committed generated assets; refresh with `npm run build`.
- `license*`: existing offline-license demo.
- `tests/workflow.spec.js`: browser regression scenarios.

Inventory scripts are ordered classic scripts. Later adapters extend the original engine; the order in `batch-manager-v2.html` is deliberate. This incremental organization retains existing records and report compatibility instead of introducing a storage migration.

## Export limitation

The repository’s existing embedded CRA template cannot currently be parsed by the PDF library. Export explicitly labels its two-page **Part B working copy**, shows a warning, and links to the official CRA form. This is not a complete B300 return. The original fallback previously downloaded under a generic B300 filename without telling the user. Parts C–F must be completed and reviewed separately using the official form.

## Boundaries

This is a prototype, not production authentication, shared multi-user infrastructure, tax advice, or a filing service. Local rollback cannot provide crash-safe database transactions. Generated inventory records cannot be edited individually; complete event reversal is future work. Older records are preserved as-is, including any historical classifications that need review. Packaged quantity remains in shared batch metadata; direct manual Part C records do not reconcile that metadata automatically.

See [research and UX review](docs/B300_RESEARCH_AND_UX.md) and [workflow mapping](B300_WORKFLOW_NOTES.md).

### Compliance presentation

Compliance uses a shared typography scale and theme tokens, including persistent Evergreen, Ocean, Indigo, and Plum presets. Tables default to 10 rows per page (25 and 50 are optional), use bounded scroll areas with sticky headers, and retain full datasets for calculations and exports. Shared table pagination and feedback dialogs are maintained in `src/compliance.jsx`; layout refinements live in `assets/css/compliance-workspace.css`. Run `npm run build` after JSX changes.

Unlicensed sessions allow browsing every workspace page. Operational actions and settings edits are disabled, while workspace switching, profile/license options, and table pagination remain available. The client-side license gate is a demo interface restriction, not production authorization.
