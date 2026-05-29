#!/usr/bin/env bash
# build.sh — produces a SideStore-ready unsigned .ipa.
#
# Requires:  Xcode installed (free, ~12 GB from the Mac App Store).
#            Command Line Tools alone are NOT enough.
#
# Result:    build/AgenticStudioMobile.ipa
#            Drop that file into the SideStore "Apps" tab on your phone.
#            SideStore re-signs it with your Apple ID (refresh weekly).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

APP_NAME="AgenticStudioMobile"
SCHEME="AgenticStudioMobile"
CONFIG="Release"
DERIVED="$ROOT/build/derived"
OUT_DIR="$ROOT/build"
IPA="$OUT_DIR/${APP_NAME}.ipa"

# ── Preflight ──────────────────────────────────────────────────────────────
if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "ERROR: xcodebuild not found." >&2
  echo "Install Xcode from the Mac App Store, then run:" >&2
  echo "  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer" >&2
  exit 1
fi

# Catch the common case where only Command Line Tools are active.
DEV_DIR="$(xcode-select -p 2>/dev/null || true)"
if [[ "$DEV_DIR" == *CommandLineTools* ]]; then
  echo "ERROR: Only Command Line Tools are active." >&2
  echo "Point xcode-select at the full Xcode:" >&2
  echo "  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer" >&2
  exit 1
fi

# Regenerate the pbxproj — keeps it in sync if you added Swift files.
if command -v node >/dev/null 2>&1; then
  echo "▸ regenerating project.pbxproj"
  node scripts/genproj.js
fi

# Fresh start every time.
rm -rf "$OUT_DIR"
mkdir -p "$DERIVED" "$OUT_DIR"

# ── Build (no signing) ─────────────────────────────────────────────────────
echo "▸ xcodebuild ${APP_NAME} (${CONFIG}, iphoneos, unsigned)"
set -x
xcodebuild \
  -project "${APP_NAME}.xcodeproj" \
  -scheme "${SCHEME}" \
  -configuration "${CONFIG}" \
  -destination 'generic/platform=iOS' \
  -sdk iphoneos \
  -derivedDataPath "$DERIVED" \
  -allowProvisioningUpdates \
  CODE_SIGN_IDENTITY="" \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGNING_ALLOWED=NO \
  AD_HOC_CODE_SIGNING_ALLOWED=NO \
  DEVELOPMENT_TEAM="" \
  ENABLE_BITCODE=NO \
  ONLY_ACTIVE_ARCH=NO \
  build
set +x

# ── Package into .ipa ──────────────────────────────────────────────────────
APP_PATH="$(find "$DERIVED/Build/Products/${CONFIG}-iphoneos" -maxdepth 1 -name '*.app' -type d | head -n1 || true)"
if [[ -z "${APP_PATH}" || ! -d "${APP_PATH}" ]]; then
  echo "ERROR: built .app not found under $DERIVED" >&2
  exit 1
fi
echo "▸ found ${APP_PATH##*/}"

STAGE="$OUT_DIR/stage"
rm -rf "$STAGE"
mkdir -p "$STAGE/Payload"
cp -R "$APP_PATH" "$STAGE/Payload/"

# Some SideStore builds reject the iTunesMetadata sidecar; we omit it.
( cd "$STAGE" && zip -qry "$IPA" Payload )
rm -rf "$STAGE"

SIZE=$(du -h "$IPA" | awk '{print $1}')
echo ""
echo "✓ built ${IPA} (${SIZE})"
echo ""
echo "Next steps:"
echo "  1. AirDrop or iCloud-share build/${APP_NAME}.ipa to your iPhone."
echo "  2. Open SideStore → My Apps → + → pick the .ipa."
echo "  3. SideStore signs + installs. App icon appears on home screen."
echo "  4. Refresh every ~7 days in SideStore to keep it active."
