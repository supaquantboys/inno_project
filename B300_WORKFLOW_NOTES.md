# B300 workflow notes (demo)

Updated: 2026-09-07

## Product model

The demo now treats **Inventory Workspace** and **Compliance Workspace** as two role-specific views over the same browser-local operational record.

- Inventory Workspace: batch/action workflow for inventory staff.
- Compliance Workspace: transaction review, adjustments, B300 reporting and compliance controls.
- Shared demo stores: `b300_transactions`, `b300_shared_batch_metadata`, `b300_settings_locations`.
- This is intentionally a same-browser prototype, not a multi-device backend.

## Core B300 workflow mapping

| Operational action | Inventory impact / B300 mapping |
| --- | --- |
| Receive unpackaged inventory | Part B addition: Quantity Received in Canada or Quantity Imported into Canada |
| Plant viable seeds | Seed reduction: Quantity Taken for Further Processing or Planted; resulting VCP addition: Total Production |
| VCP to WCP | VCP reduction: Quantity Transferred to Whole Cannabis Plant; WCP addition: Quantity Transferred from Vegetative Cannabis Plant; quantities are 1:1 |
| Harvest WCP | WCP reduction in units: Plant Harvested; FM/NFM addition in kg: Total Production |
| Process FM/NFM to PI | Source reduction: Quantity Taken for Further Processing or Planted; PI addition: Total Production |
| Send sample to analysis | Reduce only the actual sample quantity via Quantity Sent for Analysis; remaining batch inventory stays available |
| Record lab result | Operational metadata / audit event; no B300 quantity movement |
| Process PI to finished cannabis | PI reduction: Quantity Taken for Further Processing or Planted; finished product addition: Total Production |
| Package final consumer product | Part B reduction: Quantity Packaged plus Part C addition: Quantity packaged for the same material quantity |
| Apply cannabis excise stamps | Part D: Stamps used for products, by jurisdiction |
| Deliver stamped packaged product | Part C reduction: Quantity stamped and delivered to a purchaser in Canada |
| Sell packaged product unstamped | Part C reduction: Quantity sold in Canada - unstamped |
| Destroy packaged product | Part C reduction: Quantity destroyed |
| Move batch | Audit/operational movement only; no B300 quantity change |
| Manual inventory adjustment | Compliance-only exceptional path; should be used for corrections/reconciliation, not routine inventory work |
| Other | Exceptional compliance path; avoid for normal operational workflows |

## Business events

Inventory Workspace-generated records carry a shared `businessEventId` and `eventLabel`. A single operational action can therefore create multiple linked B300 records without appearing to Compliance users as unrelated manual entries.

Examples:

- Grow VCP to WCP: one business event, two inventory transactions.
- Harvest: one business event, WCP reduction + FM/NFM production.
- Package: one business event, Part B reduction + Part C packaged addition.

System-generated event transactions also carry `sourceWorkspace`, `systemGenerated`, and a demo `correctionPolicy` value of `Reverse business event`. Production should enforce reversal/correction at the event level instead of editing only one leg of a paired event.

## Packaged vs unpackaged inventory

`inventoryForm` is tracked in shared batch metadata:

- `unpackaged`: normal Part B operational inventory.
- `packaged`: final consumer packaged inventory represented in Part C.

Packaged batches additionally track `stampStatus`, `jurisdiction`, and `packageCount`. Operational cultivation/processing actions are not offered on packaged batches.

## Lab behaviour

Sending material for analysis reduces only the sample quantity. The source batch can keep an `In analysis` lab status while its remaining quantity stays operationally available. Recording the COA/THC result updates shared batch metadata but does not add material back to inventory.

## Role boundary

Inventory Workspace deliberately omits routine manual adjustment and `Other` actions. Those are compliance/reconciliation paths and remain in Compliance Workspace. Part E sales/duty reporting also remains a Compliance Workspace responsibility in this demo.

## Demo limitations

- Data sharing is browser-local only.
- Login credentials are client-side demo credentials.
- No backend transaction locking or cross-device concurrency exists yet.
- `correctionPolicy` is descriptive metadata in the demo; Compliance Workspace does not yet technically block direct edits of one system-generated transaction.
- Part C `Quantity purchased in Canada - unstamped`, Part D stamp receipts/unusable stamps/adjustments, and Part E sales/duty can already be represented by the Compliance reporting model but are not all exposed as Inventory Workspace operational actions.

## Current CRA references

- Form B300: https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/b300.html
- Completing a cannabis duty and information return: https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/excise-duties-levies/cannabis-duty/cannabis-duty-information-return.html
- Cannabis records to keep: https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/excise-duties-levies/cannabis-duty/report-cannabis/what-records-keep.html
