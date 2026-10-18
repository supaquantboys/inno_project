# Webapp comments 1017 review

Reviewed the 13 numbered items and their follow-up lines in the supplied Google Sheet on 2026-10-18.

- Compliance now commits paired plant transfer records and explicit production inputs/outputs as one event. Generated legs are protected from independent edits.
- Harvest and processing reductions request actual output product, quantity and destination batch in the same form. Unlike plant transfers, inputs/outputs with different units are never inferred from one quantity.
- Stock validation uses the effective business date and checks the affected batch timeline, including later transactions. Future dates, fractional plants and overdraws are rejected. Opening inventory now has an editable or generated batch ID.
- PI and finished production accept new destination batch IDs; defaults retain source lineage with a collision-free suffix. Each production run has a distinct batch.
- Inventory Report supports product, date and batch filters, optional related-batch history, separate per-product/batch running balances, and CSV export. Dashboard balance links open the selected product history.
- B300 Reports defaults to an A–E working view, retaining focused part selectors.

Existing records are not retroactively paired: historical manual rows may already have compensating entries. Reconcile those explicitly to avoid double posting. Inventory Report labels old records without batch IDs as unassigned.

The original CRA PDF template/fallback limitation remains: a Part B working-copy export is not a complete return, and this application does not file with CRA. Showing A–E in the interface does not change that limitation. Part F certification is outside this change.

The production output section implements the requested immediate prompt within the transaction form; a separate popup after saving is unnecessary because inputs and actual output must be validated together.
