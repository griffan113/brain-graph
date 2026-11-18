#!/usr/bin/env bash
# Hook PostToolUse (Bash) da skill brain-graph: regenera docs/brain-graph.html depois que um comando
# de ESCRITA do `brain` CLI roda (create-page, update-truth, append-timeline,
# archive-page, set-tags, update-root). Leituras (list-pages, read-page...) nao
# disparam. Barato (~100ms) e nunca bloqueia (sempre exit 0).

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
[ -n "$ROOT" ] || exit 0

cmd="$(jq -r '.tool_input.command // empty' 2>/dev/null)"
[ -n "$cmd" ] || exit 0

if printf '%s' "$cmd" | grep -Eq 'brain\.mjs[[:space:]]+(create-page|update-truth|append-timeline|archive-page|set-tags|update-root)\b'; then
  (cd "$ROOT" && node "$HERE/brain-graph.mjs" >/dev/null 2>&1) || true
fi
exit 0
