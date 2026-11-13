# @francodesystems-npm/n8n-nodes-sourevo

[![npm version](https://img.shields.io/npm/v/@francodesystems-npm/n8n-nodes-sourevo.svg)](https://www.npmjs.com/package/@francodesystems-npm/n8n-nodes-sourevo)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> n8n community node for [Sourevo](https://sourevo.com), EUDR compliance software (Regulation (EU) 2023/1115): from the supplier's plot to the due diligence statement (DDS) submitted to TRACES, without the last step by hand.

This is an [n8n](https://n8n.io) community node that lets you use the **Sourevo public API** in your n8n workflows: create products, suppliers, plots and batches from your ERP or spreadsheets, prepare and check a DDS, submit it to TRACES and get the reference number back with a webhook trigger. Built and maintained by [Francodesystems](https://francodesystems.com), the company behind Sourevo.

📖 **API documentation**: [sourevo.com/en/developers](https://sourevo.com/en/developers) (OpenAPI 3.1 at `https://sourevo.com/api/v1/openapi.json`).

> **Plans.** The Sourevo API is available on the **Pro, Enterprise and Forwarder** plans. **Trial** accounts can use it in **simulated mode**: submissions get `SIM…` reference numbers and nothing reaches TRACES. **Packs do not include the API** (requests answer `403 plan_not_allowed`).

[Installation](#installation) · [Operations](#operations) · [Trigger](#trigger) · [Credentials](#credentials) · [Compatibility](#compatibility) · [Usage](#usage) · [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

In your n8n instance: **Settings → Community Nodes → Install**, and enter:

```
@francodesystems-npm/n8n-nodes-sourevo
```

The package has no runtime dependencies.

## Operations

| Resource | Operations |
|---|---|
| **Account** | Get (organization, plan, mode `live` / `simulated` / `test`, API key) |
| **Company** | Get Many (the operators that submit to TRACES) |
| **Product** | Create (CN code, scientific name for wood, `externalRef`), Get, Get Many (filter by `externalRef`) |
| **Supplier** | Create, Get, Get Many (filter by `externalRef`), Update, Get Status (trust level, plots summary, invitation, risk scorecard), Invite (to the supplier portal) |
| **Plot** | Add to Supplier (point, GeoJSON or a KML / KMZ / CSV / TSV / XLSX / GeoJSON binary file), Get, Get Many (of a supplier), Verify, Request Correction, Run Satellite Check, Get Latest Satellite Check |
| **Batch** | Create (net weight or volume, harvest dates, plots, `externalRef`), Get, Get Many (filter by `externalRef` or product), Add Plots, Remove Plot |
| **DDS** | Create Draft, Get, Get Many (filter by status, company, batch, internal reference, updated since), Update Draft, Delete Draft, Check, Set Risk Assessment, Submit, Amend, Retract, Refresh |

How the node follows the API contract:

- **Pagination**: list operations follow `limit` / `cursor` / `nextCursor`. With **Return All** the node reads every page (100 per request); with a **Limit** it reads only the pages it needs.
- **Idempotency**: every `POST` and `PATCH` carries an `Idempotency-Key`. By default the node generates a new one per item; set **Options → Idempotency Key** (for example with an expression on your ERP document number) to make a retried item safe for 24 hours.
- **External references**: products, suppliers and batches accept `externalRef` (your ERP id). Creating with an existing one returns that record with `duplicate: true` instead of a second copy.
- **Mode**: **Options → Include Mode** adds the `X-Sourevo-Mode` header (`live`, `simulated` or `test`) to every output item as `sourevoMode`, so a workflow can tell trial (SIM) references from real ones.
- **Errors**: Sourevo answers `{ "error": { "code", "message", "details" } }`. The node shows the message, and the code, `details.reason` and the blocking issues of a refused submission in the error description. **Continue On Fail** is supported.
- **Adding plots** outputs one item per created plot, each with the request's `skippedDuplicates` count (geometries already known are skipped by Sourevo).
- **Submit / Amend**: warnings from **Check** must be acknowledged. Send their keys in **Acknowledged Warnings**, or turn on **Acknowledge All Current Warnings** to run the check first and acknowledge what it returns. Acknowledging is recorded as acting under your own responsibility; blocking issues are never bypassed.

Not covered yet (available in the API): risk measures, plot explanations, the AI review reading, supplier and shipment documents, and webhook management beyond the trigger. Use the HTTP Request node with the **Sourevo API** credential for those.

## Trigger

The **Sourevo Trigger** node starts a workflow on Sourevo webhook events:

| Event | When |
|---|---|
| `dds.status_changed` (default) | A DDS changed status, for example `AVAILABLE` with its reference number, `REJECTED` or `WITHDRAWN` |
| `dds.submitted` | A DDS was submitted to TRACES |
| `dds.risk_status_changed` | The risk status of a DDS changed |
| `dds.item_arrived` | Something a DDS was waiting for arrived |
| `plot.proposal_answered` | The supplier confirmed, corrected or rejected a plot you uploaded |
| `plot.satellite_flagged` | A satellite check found something to review on a plot |
| `supplier.claimed` | A supplier linked its own Sourevo account |
| `supplier.document_uploaded` | A supplier uploaded a document for you to review |
| `plan.quota_80`, `plan.quota_100` | 80 % / 100 % of the statements included in the plan are used |

Registration is automatic: activating the workflow calls `POST /api/v1/webhooks` with the node's production URL and the selected events, and deactivating it calls `DELETE /api/v1/webhooks/{id}`. The signing secret returned by Sourevo is kept in the workflow's static data.

Every delivery is verified before the workflow starts: `X-Sourevo-Signature: t=<unix>,v1=<hex>` must be `HMAC-SHA256(secret, "<t>.<raw body>")`, and the timestamp must be within the tolerance (300 seconds by default, **Options → Signature Tolerance**). Unsigned, tampered, wrongly signed or replayed requests get `401` and never start the workflow. The test ping (`POST /webhooks/{id}/test`) is acknowledged but ignored unless **Include Ping** is on.

Sourevo only calls public `https` URLs (the private network is blocked), so the trigger needs an n8n instance reachable from the internet (n8n Cloud, or self-hosted behind https with `WEBHOOK_URL` set).

Output: the event envelope `{ id, type, createdAt, data }` plus `deliveryId` (the `X-Sourevo-Delivery` header).

## Credentials

| Credential | Auth scheme | Notes |
|---|---|---|
| **Sourevo API** | `Authorization: Bearer svk_…` | Tested against `GET /api/v1/me` |

Create the key in Sourevo → **API and integrations** (owners and admins). The key is shown once and acts as the user who created it: if that user leaves the organization or stops being an owner or admin, the key answers `403 key_owner_forbidden`. Leave **Base URL** as `https://sourevo.com` unless you were given another installation.

Remember: the API is available on the Pro, Enterprise and Forwarder plans; trial accounts work in simulated mode; packs do not include the API.

## Compatibility

- Requires n8n version **1.0** or later. Tested with n8n **2.29**.
- Node.js **20.15+**.

## Usage

### From goods receipt to submitted DDS

```
ERP Trigger (goods receipt)
  → Sourevo (Product / Create, externalRef = ERP product id)
  → Sourevo (Supplier / Create, externalRef = ERP partner id)
  → Sourevo (Plot / Add to Supplier, GeoJSON from the supplier)
  → Sourevo (Batch / Create, externalRef = receipt number, plots)
  → Sourevo (DDS / Create Draft)
  → Sourevo (DDS / Set Risk Assessment)
  → Sourevo (DDS / Check)  → IF ready
  → Sourevo (DDS / Submit)
```

### Reference number back to the ERP

```
Sourevo Trigger (dds.status_changed)
  → IF {{ $json.data.status }} == AVAILABLE
  → ERP (write the reference and verification numbers on the receipt)
```

### Satellite alerts to the purchasing team

```
Sourevo Trigger (plot.satellite_flagged)
  → Slack / Email (plot, supplier and what to review)
```

## Development

```bash
npm install
npm run build      # tsc + icons
npm run lint       # eslint-plugin-n8n-nodes-base + n8n Cloud rules
npm test           # signature and pagination unit tests (node:test)
npm run scan       # the static analysis of @n8n/scan-community-package on this checkout and its npm tarball
```

## Releasing (maintainers)

Same process as [n8n-nodes-holded](https://github.com/francodesystems/n8n-nodes-holded): releases are published by `.github/workflows/publish.yml` with an npm provenance attestation, as n8n requires for verified community nodes. See `VERIFICATION.md` for the checklist and the exact steps.

## Resources

- [Sourevo API documentation](https://sourevo.com/en/developers)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [EUDR, Regulation (EU) 2023/1115](https://eur-lex.europa.eu/eli/reg/2023/1115/oj)
