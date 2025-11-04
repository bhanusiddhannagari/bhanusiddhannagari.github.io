# Multi-Group Expense Manager

Advanced web application for tracking and splitting expenses across multiple groups, trips, or events. Supports equal, percentage, and custom amount splits with data persistence, analytics, recurring expenses, and export/import utilities.

## ✨ Key Features

- Multiple groups/trips with independent friend lists & expense histories
- Flexible split modes: Equal, Percentage, Custom Amounts
- Intelligent settlement suggestions (who should pay whom to balance debts)
- Recurring expenses (weekly, monthly, yearly, custom day interval)
- Category analytics with dynamic doughnut charts (Chart.js)
- Dark mode with CSS variables + persistent preference
- Robust persistence strategy:
  - File System Access API (optional directory selection) for portable JSON storage
  - Automatic metadata (version, timestamps, checksum) embedded in saved data
  - Automatic backup file generation with timestamped filenames
  - localStorage fallback when FS Access not available
- Comprehensive CSV / JSON export options (expenses, balances, summaries, full data dump)
- Secure import (validates structure + metadata) with integrity feedback
- Granular filtering (group, category, date ranges) for history views
- Notification system (success/error toasts)
- Responsive design (mobile friendly layout, grid/flex adjustments)
- Accessibility-conscious semantics and focusable interactive elements

## 📂 Directory Structure

```text
multi-group-expense-manager/
  ├── index.html              # Main application UI
  ├── splitter-script.js      # Core logic (ExpenseSplitter + persistence + charts)
  ├── splitter-styles.css     # Full inlined styles (formerly root), plus utilities
  └── README.md               # This documentation
```

## 🧠 Core Concepts

### Data Model

- Friends: `{ id, name }`
- Expenses: `{ id, description, amount, category, paidBy, date, groupId, splits: [ { friendId, amount, percentage? } ] }`
- Groups: `{ id, name, created }`
- Recurring Template: `{ id, description, baseAmount, frequency, nextDate, category, groupId, active, splitsConfig }`
- Settlements (suggested): `{ fromFriendId, toFriendId, amount }`
- Metadata: `{ version, created, lastModified, checksum? }`

### Split Modes

- Equal: Divide total by participant count (rounded to 2 decimals, remainder allocated to last friend to maintain total integrity).
- Percentage: User provides percentages, validated to sum (≈100% with tolerance) then mapped to amounts.
- Custom: Direct per-friend amounts validated to match total.

### Settlement Suggestion Algorithm (High-Level)

1. Compute net balances per friend within a group (paid - owed).
2. Classify into creditors (positive) and debtors (negative).
3. Greedy matching: largest debtor pays largest creditor up to min(|debt|, credit).
4. Continue until all balances resolved within a small epsilon.

### Recurring Expense Logic

- Each recurring template stores its next trigger date.
- On load or periodic check, all templates with `nextDate <= today` generate actual expenses and advance `nextDate` based on frequency:
  - weekly → +7 days
  - monthly → same day next month (fallback to last day if shorter month)
  - yearly → +1 year
  - custom → +N days
- Generated expenses are tagged (e.g., `isRecurring: true`) for UI filtering (optional future enhancement).

## 💾 Persistence Strategy

When the user chooses a folder (via File System Access API):

- Data written to `expense_splitter_data.json` with pretty JSON for readability.
- Automatic backups: `expense_splitter_backup_YYYY-MM-DDTHH-MM-SS.json` on demand or scheduled triggers.
- Metadata updates `lastModified` and version number on each save.
- Integrity: Optional checksum (e.g., SHA-256) can be added in future. Placeholder included in schema.

Fallback: If unsupported (Safari, older browsers, embedded contexts), app uses `localStorage` under a namespaced key `multi_group_expense_data_v2`.

## 📊 Analytics

Chart.js doughnut chart displays category distribution for current group, updated after each expense addition or import.

## 🌗 Dark Mode

Toggle persists via `localStorage` key `expense_splitter_theme`. Body toggles `.dark` class; CSS variables adjust palette accordingly.

## 🔐 Validation & Error Handling

- Input validation (amount > 0, description non-empty, splits integrity, date present).
- FS Access operations wrapped with try/catch and user-facing error notifications.
- Import sanitizes JSON structure (ensures essential keys) before merging.

## 🚀 Getting Started

1. Open `index.html` in a modern Chromium-based browser for full functionality.
2. (Optional) Click "Choose Folder" to enable direct file persistence.
3. Create a new group (e.g., "Goa Trip") and add friends.
4. Add expenses, choose split mode, review balance summary.
5. Use settlement suggestions to simplify reimbursements.
6. Export data or balances for offline records.

## ⏱ Performance Considerations

- All operations are in-memory; persistence only triggered on explicit save or auto-save events.
- Large histories: Consider pagination (future enhancement) if expenses exceed several thousand entries.
- Chart updates are throttled implicitly via expense addition timing; could add explicit debounce later.

## 🧪 Suggested Manual Test Cases

1. Add 3 friends; create equal split expense; verify each owes amount/3.
2. Percentage split: 50/30/20; confirm rounding keeps total consistent.
3. Custom split mismatched total → shows validation error.
4. Delete a group with existing expenses → associated expenses removed; balances update.
5. Enable dark mode → persists after reload.
6. Choose folder, add expense, click save → JSON file updated (inspect contents).
7. Generate recurring weekly expense (set nextDate to yesterday) → auto-added on load.
8. Import previously exported JSON → UI reflects imported friends & expenses.
9. Settlement suggestions produce minimal number of transactions.

## 📤 Export Formats

- Expenses CSV: columns (id, date, description, category, amount, paidBy, group, splits JSON)
- Balances CSV: (friend, net_balance, group)
- Summary CSV: aggregated per category + totals
- Full JSON: entire data model + metadata + backups list (if tracked)

## 🛠 Future Enhancements

- Add computed checksum for integrity validation
- Pagination / virtual scrolling for very large expense lists
- User avatars / color tags per friend
- Tag recurring expenses distinctly in UI
- Merge groups / clone group feature
- Multi-currency or currency conversion module
- Optional authentication layer for multi-user synchronous use

## 🧩 Tech Stack

- HTML5 semantic layout
- CSS3 (Flexbox/Grid, custom properties, responsive queries)
- Vanilla JavaScript (ES6 modules pattern within single file)
- Chart.js for category visualization
- Optional File System Access API

## 🔒 Privacy / Data Ownership

All expense data stays on the user's machine (localStorage or chosen folder). No remote transmission occurs.

## 📄 License

Specify license terms here (e.g., MIT) if distributing publicly.

---
Maintained as part of the Expense Suite (see root landing page). For single-user tracking, use `personal-expense-calculator/`.
