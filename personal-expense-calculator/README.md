# Personal Expense Calculator (Legacy)

Standalone single-user bachelor room expense tracker preserved after migration to the multi-group system.

## Features

- Add, categorize, and list expenses
- Monthly & total summaries + daily average
- Category doughnut chart (Chart.js)
- CSV export & localStorage persistence

## Run

Open `index.html` directly in a modern browser. Data persists in `localStorage` under key `personal_expenses`.

## Differences vs Multi-Group

| Personal | Multi-Group |
|----------|-------------|
| Single user only | Many participants with split logic |
| Basic categories | Extended categories per group |
| No settlements | Automated balances & settlement suggestions |
| CSV backup | CSV + JSON import/export + backups |
| No recurring (manual) | Recurring expenses automation |

## When to Use

Use this simple version if you only track your own bachelor room costs and don’t need splitting.

## Roadmap (if kept)

- Editable expenses
- Dark mode parity
- Optional recurring personal bills

For collaborative expense sharing switch to the multi-group manager.
