# B300 workflow and UX review

Reviewed 2026-09-21 against the current repository and CRA primary sources.

## Regulatory basis

The CRA currently lists the 2025 B300 form. Parts A–F cover business information, unpackaged inventory, packaged inventory, stamps, sales/duty, and certification. Reporting normally uses a calendar month; authorized quarterly reporting also exists. Inventory measures differ by product: plants/seeds use units, material and pure intermediates use kg, and finished extracts/edibles/topicals use mg THC. Packaging transfers material from B to C; stamping does not itself deliver product. Stamp records are jurisdiction-specific. Sales and duty need their own review. Export does not constitute filing.

Sources:

- [CRA B300 form and current download](https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/b300.html)
- [CRA instructions, updated April 22, 2026](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/excise-duties-levies/cannabis-duty/cannabis-duty-information-return.html)

This implementation is a workflow prototype. It does not establish legal eligibility for a shipment or calculate every duty scenario.

## Repository findings and changes

| Finding | Effect on users | Implemented response |
| --- | --- | --- |
| CRA template parsing falls back silently to a two-page export | Partial working copy looks like a complete B300 return | Explicit Part B filename, user-visible warning, official form link and export regression |
| External CDN and browser Babel dependencies | Slow or blank Compliance entry | Committed local vendor assets, precompiled React, and generated CSS |
| Competing UI adapters and minified source | Difficult to trace behavior and safely maintain it | Named, formatted inventory modules with documented loading order |
| Role entry blocked by license dialog | Demo requires knowledge of a hidden testing path | Explicit Explore buttons; existing license flow retained |
| Disconnected workspace styles | Role switch feels like another product | Shared colors, surfaces, typography, spacing and controls |
| Dashboard lacks a next step | Operators must inspect batches repeatedly | Awaiting-analysis and unstamped-batch action queue |
| Form redraw discards entered data | Supplier/reference information must be retyped | Preserve compatible values across conditional field changes |
| Save immediately changes multiple records | Users cannot inspect the consequence first | Details → review → confirm, with action-specific impact text |
| Per-keystroke full redraw loses search focus | Search is frustrating or effectively unusable | Restore caret/focus on search; add batch and inventory-form filters |
| Ledger displays each event leg separately | Linked movements appear unrelated | Expandable business-event groups with record details |
| Arbitrary packaged quantities and package counts | Empty quantity can leave packages behind | Validate full-quantity/full-count equivalence; count destruction too |
| Same-product mix recorded as production | Gross production/reductions overstated | Operational transfer records with signed batch deltas |
| Fully sampled batches disappear from result picker | COA result cannot be recorded | Include empty batches awaiting analysis |
| Compliance can edit one generated event leg | Inventory and report values diverge | Block individual generated-record edits and edit requests |
| Action can save over changes made elsewhere | Stale data overwrites shared state | Compare storage revision before committing; ask user to reopen |
| Packaged receipts/stamps outside common rollback | Partial failure can leave inconsistent state | Include all action storage keys in a common rollback boundary |

Mixing is treated as an internal transfer only when inputs and output stay in the same product category. This follows the distinction in CRA's processing instructions; it is an implementation interpretation, not a general classification for manufacturing processes.

## Interaction model

Inventory navigation has five consistent destinations: Overview, Inventory, Activity, B300 workflow, and Settings & stamps. Batch detail remains the place to choose a stage-appropriate action. Compliance retains its existing report and administration features.

Forms use associated labels, native validation, a labelled dialog, Escape dismissal, keyboard focus containment, and restored focus after closing. All action saves require a review step. Failures return to editable details with an announced error. Mobile navigation scrolls independently; wide record tables stay inside scroll containers.

Demo entry does not generate or delete operational records. Test data in browser tests is isolated from the user's regular browser profile. No historical transactions are rewritten by this change.

## Deferred work, in priority order

1. Replace localStorage with server transactions and real identity/authorization before multi-user use.
2. Implement event-level reversal, including downstream dependencies, stamp inventory, and a correction audit trail.
3. Reconcile manually entered Part C/D report adjustments against operational batch/stamp balances.
4. Capture and validate the required sales/duty inputs for Part E, with a reviewed ruleset and effective dates.
5. Repair/replace the embedded CRA template and verify every output field before enabling a full-return export; expand historical report fixtures.
6. Consolidate the remaining engine adapters after report fixtures cover historical data shapes.

These are deliberately documented gaps, not features implied by the new interface.

## Verification

Browser tests exercise review/confirmation, conditional fields, search, reload persistence, mobile overflow, keyboard dismissal, seed-to-plant transfers, harvest, partial and full-batch lab samples, packaging, stamp consumption, partial shipment/destruction, invalid-action rollback, and same-product mixing. Additional checks cover cross-workspace consistency, stale-action rejection, and the clearly identified Part B PDF fallback with external requests blocked. GitHub Actions runs the same suite on pull requests and main.
