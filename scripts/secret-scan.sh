#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

mapfile -t FILES < <(git diff --cached --name-only --diff-filter=ACM)
if [[ ${#FILES[@]} -eq 0 ]]; then
  exit 0
fi

if command -v rg >/dev/null 2>&1; then
  SEARCH_BIN="rg"
  SEARCH_OPTS=(-n -S -i)
else
  SEARCH_BIN="grep"
  SEARCH_OPTS=(-In -i)
fi

PATTERNS=(
  "@smartparks\\.org"
  "(password|secret|api[_-]?key|token)[[:space:]]*[:=][[:space:]]*['\"][^$][^'\"]{5,}['\"]"
  "BEGIN (RSA|EC|OPENSSH) PRIVATE KEY"
)

fail=0
for pattern in "${PATTERNS[@]}"; do
  if [[ "$SEARCH_BIN" == "rg" ]]; then
    if rg "${SEARCH_OPTS[@]}" -e "$pattern" -- "${FILES[@]}"; then
      fail=1
    fi
  else
    if grep "${SEARCH_OPTS[@]}" -E "$pattern" -- "${FILES[@]}"; then
      fail=1
    fi
  fi
done

if [[ $fail -ne 0 ]]; then
  echo "Secret scan failed. Remove secrets or add safe placeholders before committing." >&2
  exit 1
fi
