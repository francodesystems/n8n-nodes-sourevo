# Changelog

## 0.1.1

- Same node code as 0.1.0. The publish workflow upgrades the npm that setup-node installs (without sudo), as in the other Francodesystems nodes, so later releases can go through the npm Trusted Publisher (OIDC).

## 0.1.0

- Sourevo node: Account, Company, Product, Supplier, Plot, Batch and DDS resources over the Sourevo public API v1.
- Sourevo Trigger: webhook registration through `/api/v1/webhooks` and `X-Sourevo-Signature` verification with a timestamp tolerance.
