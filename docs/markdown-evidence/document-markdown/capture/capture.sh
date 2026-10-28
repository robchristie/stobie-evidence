#!/usr/bin/env bash
# Run capture.mjs as tools/markdown-browser-smoke.sh runs its smoke: headful
# Chromium on a private Xvfb inside the repository's UI sandbox.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
bash tools/bootstrap-linux-ui.sh
EVIDENCE_DIR="${STOBIE_EVIDENCE_DIR:-$ROOT/.tools/runtime/document-markdown-evidence/out}"
mkdir -p "$EVIDENCE_DIR"
EVIDENCE_DIR="$(cd "$EVIDENCE_DIR" && pwd)"
SYSROOT="$ROOT/.tools/sysroot"
SMOKE_TMP="$(mktemp -d "$ROOT/.tools/runtime/document-evidence-x11-XXXXXX")"
mkdir -p "$SMOKE_TMP/.X11-unix"
chmod 1777 "$SMOKE_TMP" "$SMOKE_TMP/.X11-unix"
export LD_LIBRARY_PATH="$SYSROOT/usr/lib"
XVFB="$SYSROOT/usr/bin/Xvfb"
source tools/native-smoke-lifecycle.sh
trap 'cleanup; rm -rf -- "$SMOKE_TMP"' EXIT
export STOBIE_BROWSER_HEADFUL=1
owned_start_xvfb "$EVIDENCE_DIR/xvfb.log" -screen 0 1440x900x24 -nolisten tcp +extension GLX
STOBIE_EVIDENCE_DIR="$EVIDENCE_DIR" ui_sandbox "$(command -v node)" .tools/runtime/document-markdown-evidence/capture.mjs
