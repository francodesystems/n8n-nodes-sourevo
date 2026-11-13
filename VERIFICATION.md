# n8n verified community node: checklist

Status of `@francodesystems-npm/n8n-nodes-sourevo` 0.1.0 against n8n's requirements, checked on 13 Nov 2026 against
[Submit community nodes](https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/) and
[Verification guidelines](https://docs.n8n.io/integrations/creating-nodes/build/reference/verification-guidelines/).

Legend: ✅ done and checked · ⏳ needs Juan (account, network or publishing) · ℹ️ note

## Package

| Requirement | Status | Evidence |
|---|---|---|
| Name starts with `n8n-nodes-` or `@scope/n8n-nodes-` | ✅ | `@francodesystems-npm/n8n-nodes-sourevo` (same scope as n8n-nodes-holded) |
| Keyword `n8n-community-node-package` | ✅ | `package.json` → `keywords` |
| Nodes and credentials listed under `n8n` | ✅ | `n8n.nodes` (Sourevo, SourevoTrigger), `n8n.credentials` (SourevoApi), `strict: true` as in the n8n-node template |
| MIT licence | ✅ | `LICENSE`, `license: "MIT"` |
| No runtime dependencies | ✅ | No `dependencies`; only `devDependencies` and the `n8n-workflow` peer. Code imports only `n8n-workflow` and `crypto` (both allowed) |
| `files` only ships `dist` | ✅ | Tarball: `dist/`, `package.json`, `README.md`, `LICENSE`, `index.js` (38 files, 37 kB) |
| `homepage`, `author`, `repository`, `bugs` | ✅ | homepage `https://sourevo.com/en/developers`; repository `github.com/francodesystems/n8n-nodes-sourevo` (to be created) |
| `@n8n/node-cli` ≥ 0.23.0 as devDependency | ✅ | `^0.23.0` |
| npm repository URL matches a public GitHub repo; same author/maintainer on npm and GitHub | ⏳ | The repo does not exist yet (step 1 below) |

## Code and lint

| Requirement | Status | Evidence |
|---|---|---|
| TypeScript, n8n node conventions | ✅ | Programmatic action node + programmatic webhook trigger |
| `npm run lint` passes | ✅ | `eslint-plugin-n8n-nodes-base` (nodes, credentials, community package.json) + `@n8n/eslint-plugin-community-nodes` recommended (n8n Cloud) rules: 0 errors, 0 warnings |
| `npx @n8n/scan-community-package` static analysis | ✅ (locally) | `npm run scan` runs the scanner's own `analyzePackage` (v0.43.0, the same rule set and file globs, inline disables ignored) on the source and on the `npm pack` tarball: **both passed**. The real command also checks npm provenance and downloads the attested GitHub commit, so it can only be run after step 3 |
| No env vars, no file system access | ✅ | No `process`, `fs`, `__dirname`; base URL comes from the credential |
| No restricted globals (`setTimeout`, `process`, …) | ✅ | Enforced by `lint:cloud` and the scan |
| Errors wrapped in `NodeApiError` / `NodeOperationError` with `itemIndex` | ✅ | Sourevo's `{ error: { code, message, details } }` becomes the message plus `Sourevo error code: …; reason: …; blocking issues: …` |
| Continue On Fail and `pairedItem` | ✅ | Every output item carries `pairedItem: { item: i }` |
| `usableAsTool` | ✅ | `true` on the action node, `false` on the trigger |
| Icons: SVG, light and dark variants | ✅ | `sourevo.svg` / `sourevo.dark.svg` (Sourevo mark, square viewBox; dark variant with lighter greens). ℹ️ Juan: have a look at both in the n8n editor before submitting |
| Credential: password field, `test` request, icon, documentation URL | ✅ | `apiKey` is `password`; test = `GET /api/v1/me`; docs `https://sourevo.com/en/developers` |
| Trigger: name ends in `Trigger`, `inputs: []`, full webhook lifecycle, no silent catch | ✅ | `checkExists` / `create` / `delete` call `/api/v1/webhooks`; failures are logged |
| English only (UI, errors, README) | ✅ | |
| Unit tests | ✅ | `npm test`: 19 tests (`node:test`, no extra dependency): signature check (valid, tolerance, replay, tamper, wrong secret, moved timestamp, malformed, several v1) and pagination (Return All, limit, empty, max pages), plus helpers and error parsing |

## UX

| Guideline | Status | Notes |
|---|---|---|
| Resources and operations, "Get Many", sentence-case actions, alphabetical options | ✅ | Enforced by the lint rules |
| Return All + Limit on list operations | ✅ | Cursor pagination |
| Optional fields in collections, no open JSON for optional config | ✅ | The only JSON inputs are the plot GeoJSON (required in that mode) and Associated Statements (an array TRACES defines) |
| Plan availability is clear | ✅ | Notice in the node and in the credential, node description, README: Pro, Enterprise and Forwarder; trial in simulated mode; packs without the API |

## Functional test (13 Nov 2026, local)

n8n 2.29.10 (docker), the package installed from its `npm pack` tarball into `~/.n8n/nodes` (how n8n installs community packages), against Sourevo in `next dev` with a new trial organization, `TRACES_ADAPTER=simulated` and the `TRIAL_TRACES_*` variables blanked for that process (so nothing went to TRACES acceptance).

| Check | Result |
|---|---|
| Credential test (`GET /me`) | "Connection successful", `X-Sourevo-Mode: simulated` |
| Workflow: Account → Product → Supplier → Plot (point) → Batch → Companies → DDS draft → Risk assessment → Check → Submit (acknowledge all) → Get → Get Many | All green; DDS `AVAILABLE`, `SIM26ESE9FF5A80A8` / `SIM3CA45D`, `sourevoMode: simulated` |
| Other operations: product/supplier/batch Get and Get Many with filters, supplier Update / Status / Invite, plot from GeoJSON, plot Verify / Request Correction / Satellite check / Latest, batch Add / Remove plot, DDS Refresh / Amend / Retract, error on Update of a non-draft | All as expected; API errors surfaced with Sourevo's message |
| Trigger activation | `POST /webhooks` registered the production URL with the selected events |
| Trigger deliveries | `dds.submitted` and `dds.status_changed` delivered (200) and started the workflow |
| Bad deliveries (curl) | Unsigned, wrong secret, 1000 s old and tampered body: 401, no execution. Correctly signed: 200 |
| Deactivate / reactivate | `DELETE /webhooks/{id}` soft-deleted the endpoint; reactivating registered a new one |

ℹ️ This worked locally only because the Sourevo dev server allows `http` and private addresses outside production. In production Sourevo only calls public `https` URLs, so the trigger needs a public n8n (n8n Cloud or self-hosted behind https).

Not exercised end to end: plot upload from a binary file (same API body as the GeoJSON path, with `file.format` and base64 content).

## Sourevo API: anything that blocks verification?

Nothing blocks it. Points worth knowing:

- ℹ️ **Webhook URLs must be public https** (SSRF guard): fine for n8n Cloud and normal self-hosting; local n8n without a tunnel cannot receive events. Documented in the README and the trigger notice.
- ℹ️ **Webhooks are capped at 10 endpoints per organization**: each active workflow with a Sourevo Trigger uses one.
- ℹ️ **The trigger acts as the key's creator**: if that user leaves or stops being owner/admin, Sourevo stops sending (the endpoint is retired with the key's authority).
- ℹ️ **The API reviewer will need a key that works.** A trial key works in simulated mode for 14 days; for n8n's review, consider giving them a longer trial (`/admin/cuentas` → ampliar prueba) or a Pro grant on a demo organization.
- ℹ️ `GET /webhooks` and `GET /operators` return everything in one page (`nextCursor: null`); the node handles both.

## Publish and submit: exact steps for Juan

Nothing below has been done. Each step goes out to GitHub, npm or n8n with your accounts.

1. **Commit and create the public repo** (account `francodesystems`, see the note on GitHub accounts):
   ```bash
   cd ~/Projects/srcanton/n8n-nodes-sourevo
   git add -A && git commit -m "feat: Sourevo node and webhook trigger (0.1.0)"
   GH_TOKEN=<francodesystems token> gh repo create francodesystems/n8n-nodes-sourevo --public --source . --push
   ```
2. **npm authentication for the first release.** A Trusted Publisher can only be added to a package that already exists, so the first publish uses a token:
   - npmjs.com (org `francodesystems-npm`) → Access Tokens → Granular Access Token, read and write, scoped to the `@francodesystems-npm` packages.
   - GitHub → `francodesystems/n8n-nodes-sourevo` → Settings → Secrets and variables → Actions → New secret `NPM_TOKEN`.
3. **Release 0.1.0 from CI with provenance:**
   ```bash
   git tag 0.1.0 && git push origin 0.1.0
   ```
   (or `npm run release` for the interactive bump, changelog, tag and push). The tag runs `.github/workflows/publish.yml`, whose `prepublishOnly` builds, lints, runs the tests and the local scan, then `npm publish --provenance`.
4. **Switch to Trusted Publishing:** on npmjs.com → the package → Settings → Trusted Publishers → GitHub Actions: owner `francodesystems`, repository `n8n-nodes-sourevo`, workflow `publish.yml`. Then delete the `NPM_TOKEN` secret.
5. **Run the real scan** (it needs the published version and its provenance):
   ```bash
   npx @n8n/scan-community-package @francodesystems-npm/n8n-nodes-sourevo
   ```
   Exit code 0 = passed.
6. **Submit:** log in to [creators.n8n.io/nodes](https://creators.n8n.io/nodes) (same creator profile as Holded) → Submit node → `@francodesystems-npm/n8n-nodes-sourevo`. Add a test API key for the reviewers (see above). Review can take up to four weeks.
7. Optional, after verification: link the node from `https://sourevo.com/en/developers` and publish the two workflows in `examples/` as n8n templates (same process as `n8n-nodes-holded/templates/SUBMISSION.md`).
