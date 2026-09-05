#!/usr/bin/env bash
# Deploy the October Big Day static site to Azure Storage static website ($web).
#
# The site is hosted on Azure Storage static-website hosting and reverse-proxied
# by the VPS nginx (obd26.birdsociety.sg) for HTTPS on the custom domain. This
# script only refreshes the blob content; nginx/DNS/TLS are one-time setup.
#
#   Storage account : stobd26birdsoc  (RG general_resources, southeastasia)
#   $web endpoint   : https://stobd26birdsoc.z23.web.core.windows.net/
#   Public URL      : https://obd26.birdsociety.sg/
#
# Auth: set AZURE_STORAGE_KEY in the environment (how CI runs — see
# .github/workflows/deploy.yml). If it's unset, the script falls back to
# fetching the key via `az` (requires `az login` to the Bird Society tenant),
# which is the convenient path for a manual local deploy.
set -euo pipefail

ACCOUNT="stobd26birdsoc"
RG="general_resources"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Stage only the deployable files (no node_modules/.git/package.json/.DS_Store).
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
cp "$ROOT"/index.html "$ROOT"/legacy-2025.html "$ROOT"/sites-map.html "$STAGE"/
mkdir -p "$STAGE/assets"
cp -R "$ROOT/assets/img" "$STAGE/assets/"
find "$STAGE" -name '.DS_Store' -delete

# Data-plane RBAC isn't granted to the interactive user, so we authenticate with
# the account key. CI supplies it as $AZURE_STORAGE_KEY (a GitHub secret); a
# local run without it falls back to fetching the key via the management plane.
KEY="${AZURE_STORAGE_KEY:-$(az storage account keys list -n "$ACCOUNT" -g "$RG" --query '[0].value' -o tsv)}"

echo "Uploading $(find "$STAGE" -type f | wc -l | tr -d ' ') files to \$web ..."
az storage blob upload-batch \
  --account-name "$ACCOUNT" --account-key "$KEY" \
  -d '$web' -s "$STAGE" --overwrite \
  --content-cache-control "public, max-age=3600" -o none

echo "Done. Live at https://obd26.birdsociety.sg/"
