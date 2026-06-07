# Source this file from the Monthly_Expense_Tracker project root to enable:
#   start all servers
#   stop all servers
#
# Example:
#   source scripts/expense-tracker-commands.sh

MONTHLY_EXPENSE_TRACKER_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-${(%):-%x}}")/.." && pwd)"

start() {
  if [[ "${1:-}" == "all" && "${2:-}" == "servers" && $# -eq 2 ]]; then
    "$MONTHLY_EXPENSE_TRACKER_ROOT/scripts/start-all-servers"
    return
  fi

  if command -v start >/dev/null 2>&1; then
    command start "$@"
  else
    echo "Usage for this app: start all servers"
    return 1
  fi
}

stop() {
  if [[ "${1:-}" == "all" && "${2:-}" == "servers" && $# -eq 2 ]]; then
    "$MONTHLY_EXPENSE_TRACKER_ROOT/scripts/stop-all-servers"
    return
  fi

  if command -v stop >/dev/null 2>&1; then
    command stop "$@"
  else
    echo "Usage for this app: stop all servers"
    return 1
  fi
}
