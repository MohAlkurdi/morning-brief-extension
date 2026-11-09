#!/bin/sh
# Installs the Morning Brief helper that runs briefs through Claude Code or Codex (ChatGPT).
# Usage: sh install.sh <chrome-extension-id>   (Firefox needs no id)
set -e
NAME=io.morningbrief.claude_code
EXT_ID="$1"
HERE=$(cd "$(dirname "$0")" && pwd)
DIR="${MB_DIR:-$HOME/.morning-brief}"

command -v node >/dev/null || { echo "Node.js is required: https://nodejs.org" >&2; exit 1; }
# Version managers (nvm, volta, vite-plus) put shims on PATH that fail outside a login shell.
NODE=$(node -e 'process.stdout.write(process.execPath)')
CLAUDE=$(command -v claude || true)
CODEX=$(command -v codex || true)
[ -n "$CLAUDE$CODEX" ] || { echo "Install Claude Code (https://claude.com/claude-code) or Codex (https://developers.openai.com/codex) first." >&2; exit 1; }
[ -z "$CLAUDE" ] || "$CLAUDE" auth status --json 2>/dev/null | grep -q '"loggedIn": *true' || echo "Note: run 'claude auth login' to use your Claude plan."
[ -z "$CODEX" ] || "$CODEX" login status 2>&1 | grep -qi 'chatgpt' || echo "Note: run 'codex login' to use your ChatGPT plan."

mkdir -p "$DIR"
cp "$HERE/host.mjs" "$HERE/guard.mjs" "$DIR/"
# Browsers start the helper with a minimal PATH, so bake in absolute paths.
cat > "$DIR/host.sh" <<SH
#!/bin/sh
export PATH="$(dirname "$NODE")${CLAUDE:+:$(dirname "$CLAUDE")}${CODEX:+:$(dirname "$CODEX")}:/usr/local/bin:/usr/bin:/bin"
export CLAUDE_BIN="${CLAUDE:-claude}"
export CODEX_BIN="${CODEX:-codex}"
exec "$NODE" "$DIR/host.mjs"
SH
chmod 755 "$DIR/host.sh"

manifest() {
  printf '{\n  "name": "%s",\n  "description": "Morning Brief: Claude Code and Codex helper",\n  "path": "%s",\n  "type": "stdio",\n  %s\n}\n' "$NAME" "$DIR/host.sh" "$1"
}
write() { mkdir -p "$1" && manifest "$2" > "$1/$NAME.json" && echo "  $1"; }

if [ "$(uname)" = Darwin ]; then
  BASE="$HOME/Library/Application Support"
  FIREFOX="$BASE/Mozilla/NativeMessagingHosts"
else
  BASE="$HOME/.config"
  FIREFOX="$HOME/.mozilla/native-messaging-hosts"
fi

echo "Installed the helper for:"
if [ -n "$NATIVE_HOSTS_DIRS" ]; then
  # Testing hook: install only into the given directories.
  for d in $NATIVE_HOSTS_DIRS; do write "$d" "\"allowed_origins\": [\"chrome-extension://$EXT_ID/\"]"; done
  exit 0
fi
if [ -n "$EXT_ID" ]; then
  for b in "Google/Chrome" "Google/Chrome Beta" "Chromium" "BraveSoftware/Brave-Browser" "Microsoft Edge" "Arc/User Data" "Vivaldi" "google-chrome" "chromium" "microsoft-edge" "vivaldi"; do
    [ -d "$BASE/$b" ] && write "$BASE/$b/NativeMessagingHosts" "\"allowed_origins\": [\"chrome-extension://$EXT_ID/\"]"
  done
fi
[ -d "$(dirname "$FIREFOX")" ] && write "$FIREFOX" '"allowed_extensions": ["morning-brief@local"]'
echo "Done. Go back to Morning Brief and press Check connection."
