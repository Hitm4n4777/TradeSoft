# TradeSoft

**TradeSoft** is a Windows desktop inventory and business management application designed for an animal-feed selling business. It is intended to bring day-to-day operations—stock management, purchases, sales, customer and supplier balances, expenses, and reporting—into one application.

The project is being developed with a desktop-first, local-data approach so that core business operations can work without a permanent internet connection.

> **Project status:** In development. Some features described in this document are planned and may not be implemented yet. Update this README as functionality becomes available.

---

## Table of Contents

- [Project Goals](#project-goals)
- [Planned Features](#planned-features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Development Setup](#development-setup)
- [Running TradeSoft](#running-tradesoft)
- [Application Data and Database](#application-data-and-database)
- [Inventory and Accounting Rules](#inventory-and-accounting-rules)
- [Security and Reliability](#security-and-reliability)
- [Backups and Restore](#backups-and-restore)
- [Build and Packaging](#build-and-packaging)
- [Development Roadmap](#development-roadmap)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Project Goals

TradeSoft aims to provide a straightforward desktop application for managing an animal-feed business.

Primary goals:

- Keep products and stock quantities organized.
- Record purchases from suppliers and sales to customers.
- Track the cost and selling price of products.
- Maintain customer and supplier balances, including credit transactions.
- Record operating expenses.
- Provide useful summaries and reports.
- Store business data locally on the Windows computer.
- Support offline use for core workflows.
- Make the interface clear and practical for everyday business use.
- Provide a backup and restore process to protect business records.

## Planned Features

The feature list below describes the intended scope. A feature should be considered complete only after it has been implemented and tested.

### 1. Dashboard

The dashboard is intended to provide a quick overview of business activity, such as:

- Total products and current stock status.
- Low-stock products.
- Sales and purchases over a selected period.
- Outstanding customer balances.
- Outstanding supplier balances.
- Recorded expenses.
- Recent sales and purchase transactions.
- Quick links to common tasks.

Dashboard totals should be calculated from saved records rather than fixed sample data.

### 2. Products and Inventory

The inventory module is intended to support:

- Creating, editing, viewing, and deactivating products.
- Product names, codes/SKUs, categories, units, and notes.
- Purchase cost and selling price.
- Current stock quantity.
- Minimum stock thresholds and low-stock warnings.
- Stock adjustments for damaged, missing, or corrected quantities.
- A history of stock movements.
- Search and filtering.

Possible product units include bags, kilograms, or other units appropriate to the business. The actual units and conversion rules should be configured to match how products are bought and sold.

### 3. Purchases

The purchases module is intended to record stock received from suppliers, including:

- Supplier selection.
- Purchase date and reference number.
- Products, quantities, unit costs, and line totals.
- Discounts and other charges where applicable.
- Amount paid and amount remaining.
- Cash and credit purchases.
- Purchase history and searchable records.
- Purchase returns or corrections, with corresponding stock updates.

A purchase should update stock only when it is saved as a finalized transaction. Editing or reversing a purchase must also update stock and financial balances consistently.

### 4. Sales

The sales module is intended to support:

- Selecting products and entering quantities.
- Applying configured selling prices and discounts.
- Calculating subtotals and final totals.
- Recording customer information where needed.
- Cash, partial-payment, and credit sales.
- Tracking outstanding amounts.
- Viewing and searching sales history.
- Printing or exporting receipts, if enabled.
- Sales returns and corrections.

Finalized sales should reduce inventory. Returned goods should affect inventory and balances according to the return's condition and the business's configured rules.

### 5. Customers

The customer module is intended to manage:

- Customer name and contact information.
- Opening balances, where required.
- Sales and payment history.
- Outstanding balances.
- Payments received against credit.
- Customer statements and date-filtered history.

Customer balances should be derived from recorded transactions and payments, rather than changed only by manually editing a displayed total.

### 6. Suppliers

The supplier module is intended to manage:

- Supplier name and contact information.
- Purchases and payment history.
- Outstanding supplier balances.
- Payments made to suppliers.
- Supplier statements and date-filtered history.

### 7. Expenses

The expense module is intended to record operating costs, such as:

- Expense category.
- Date, amount, and description.
- Payment method.
- Optional notes or reference.
- Search and date filters.
- Expense summaries for reports.

Examples of categories might include transport, utilities, rent, wages, and other business costs. Categories should be adjustable to the needs of the business.

### 8. Reports

Planned reports may include:

- Sales summaries by day, month, or custom date range.
- Purchase summaries.
- Current stock and inventory valuation.
- Low-stock products.
- Gross profit estimates.
- Expenses by category and period.
- Customer balances.
- Supplier balances.
- Transaction histories.

Reports must clearly distinguish sales revenue, cost of goods sold, gross profit, expenses, and net profit. A simple sales total should not be presented as profit.

### 9. Settings

The settings module may include:

- Business name and contact details.
- Currency and number formatting.
- Product and stock preferences.
- Low-stock defaults.
- Receipt preferences.
- Backup and restore controls.
- Application version and basic diagnostics.

---

## Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| Desktop shell | Electron | Runs the application as a Windows desktop program |
| User interface | React | Builds reusable interface components and screens |
| Frontend tooling | Vite | Runs the development server and builds frontend assets |
| Icons | Lucide React | Provides interface icons |
| Charts | Recharts | Displays dashboard and report charts where useful |
| Backend | Python + Django REST Framework | Business logic and API endpoints |
| Database | SQLite | Local relational data storage |
| Packaging | Electron Builder and PyInstaller (planned) | Packages the desktop app and Python backend for Windows |

The exact dependency versions are determined by the project's `package.json` files and Python requirements file.

## Architecture

TradeSoft separates the desktop shell, frontend, backend, and persistent data.

```text
Windows Desktop
└── Electron
    ├── React + Vite frontend
    │   └── Calls the backend through an API/service layer
    ├── Secure preload bridge
    └── Python backend (Django REST Framework)
        └── SQLite database
            └── Stored in a persistent application-data location
```

### Frontend

The React frontend displays the screens and gathers user input. API calls should be organized in `frontend/src/services/` instead of placing backend communication throughout unrelated UI components.

### Electron

Electron creates the desktop window and loads the frontend. It should use a secure preload bridge, with `contextIsolation` enabled and `nodeIntegration` disabled. The renderer should not receive unrestricted access to Node.js or the local filesystem.

### Backend

Django REST Framework is responsible for validating requests, applying business rules, managing database transactions, and returning API responses. Important stock and balance calculations should be performed in the backend, not trusted to frontend calculations alone.

### Database

SQLite stores products, transactions, payments, stock movements, expenses, and related records. The live database should be stored outside the source-code and installation folders so that reinstalling or updating TradeSoft does not accidentally remove business data.

### Offline operation

The intended design is to run the backend locally on the same Windows computer and keep business data in a local database. Features that require external services, if any are added later, should be identified separately and should not prevent core local operations from working.

---

## Project Structure

The repository is organized approximately as follows. Some folders are planned and can be created as the related modules are implemented.

```text
TradeSoft/
├── desktop/
│   ├── main.cjs              # Electron main process
│   ├── preload.cjs           # Restricted renderer bridge
│   ├── package.json          # Electron scripts and dependencies
│   └── package-lock.json
│
├── frontend/
│   ├── public/
│   │   └── assets/           # Public static assets, if needed
│   ├── src/
│   │   ├── assets/            # Imported images and assets
│   │   ├── components/
│   │   │   ├── common/        # Reusable UI elements
│   │   │   ├── dashboard/     # Dashboard-specific components
│   │   │   └── forms/         # Shared form components
│   │   ├── layouts/
│   │   │   └── MainLayout.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── Sales.jsx
│   │   │   ├── Purchases.jsx
│   │   │   ├── Customers.jsx
│   │   │   ├── Suppliers.jsx
│   │   │   ├── Expenses.jsx
│   │   │   ├── Reports.jsx
│   │   │   └── Settings.jsx
│   │   ├── services/
│   │   │   └── api.js          # Backend API helpers
│   │   ├── hooks/              # Shared React hooks
│   │   ├── utils/              # Frontend helpers and formatting
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── backend/
│   ├── config/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── asgi.py
│   │   └── wsgi.py
│   ├── inventory/              # Products and stock movements
│   ├── purchases/              # Purchase transactions
│   ├── sales/                  # Sales transactions and returns
│   ├── contacts/               # Customers and suppliers
│   ├── finance/                # Payments and expenses
│   ├── reports/                # Reporting endpoints and logic
│   ├── common/                 # Shared backend utilities
│   ├── manage.py
│   └── requirements.txt
│
├── scripts/
│   ├── start-dev.bat           # Optional development launcher
│   └── backup.bat              # Optional backup helper
│
├── .gitignore
└── README.md
```

Do not create every planned file just to match this diagram. Add files when they are needed. The `backend/` Django project will need to be initialized before backend commands can run.

---

## Requirements

For development on Windows:

- Windows 10 or Windows 11.
- Node.js and npm.
- Python 3.11 or another Python version supported by the selected Django release.
- Git, if source control is being used.
- A code editor such as Visual Studio Code.

A packaged release should aim to include the required runtime components so that an end user does not need to install Node.js or Python separately. Packaging is a later development step.

---

## Development Setup

Open **Command Prompt (CMD)** or a terminal in VS Code.

### 1. Get the project

If the repository is already on your computer, open its root directory:

```bat
cd /d E:\CodingSpace\TradeSoft
```

If you are cloning the project onto another computer, use the repository URL:

```bat
git clone <repository-url> TradeSoft
cd TradeSoft
```

Replace `<repository-url>` with the actual repository URL.

### 2. Install frontend dependencies

```bat
cd /d E:\CodingSpace\TradeSoft\frontend
npm install
```

The Vite React frontend may already be initialized. If it is not, initialize it from the project root only after confirming the `frontend` directory is ready to receive the template:

```bat
npm create vite@latest . -- --template react
npm install
```

Install the UI libraries used by the project if they are not already present:

```bat
npm install lucide-react recharts
```

Avoid re-running the Vite initialization command in a populated project, because it can overwrite or conflict with existing files.

### 3. Install Electron dependencies

```bat
cd /d E:\CodingSpace\TradeSoft\desktop
npm install
```

The desktop `package.json` should have a valid JSON structure and use `main.cjs` as its Electron entry point.

### 4. Set up the Python backend

Once the Django backend has been initialized, create and activate a virtual environment from the project root:

```bat
cd /d E:\CodingSpace\TradeSoft
py -m venv .venv
.venv\Scripts\activate
```

Install the backend dependencies after `backend/requirements.txt` has been created:

```bat
pip install -r backend\requirements.txt
```

If the Django project has not yet been created, initialize it as a separate development task. Do not run Django management commands until `backend/manage.py` exists.

---

## Running TradeSoft

### Current desktop shell / frontend development

At the current early stage, the Electron shell expects the Vite development server at `http://localhost:5173`.

**Terminal 1 — frontend**

```bat
cd /d E:\CodingSpace\TradeSoft\frontend
npm run dev
```

**Terminal 2 — Electron desktop**

```bat
cd /d E:\CodingSpace\TradeSoft\desktop
npm start
```

Keep the Vite server running while using Electron in development mode.

### Backend development

After the Django project has been initialized and dependencies are installed, start the backend in another terminal. The exact port and settings should be confirmed in the project's Django configuration. For example, if the project is configured to use port `8000`:

```bat
cd /d E:\CodingSpace\TradeSoft
.venv\Scripts\activate
python backend\manage.py runserver 127.0.0.1:8000
```

This example assumes `backend/manage.py` exists and the Django settings are configured correctly. It is not required for the current frontend-only shell until API integration begins.

### Important development note

The Electron window and Django backend are separate processes. Starting Electron does not automatically start Django unless a development or production launcher has been implemented to do so.

---

## Application Data and Database

TradeSoft is intended to use SQLite for local storage.

### Data location

The production database should be stored in a persistent per-user application-data directory, for example under Windows `%APPDATA%` or `%LOCALAPPDATA%`, rather than inside:

- `frontend/`
- `desktop/`
- `backend/`
- `node_modules/`
- the installed application's program directory

The final directory and database filename should be selected in the backend configuration. The example below is illustrative only:

```text
%APPDATA%\TradeSoft\
├── tradesoft.sqlite3
└── backups\
```

Do not assume this path exists until the application implements it.

### Database migrations

Django migrations should be used to manage schema changes. After a model change, create and apply migrations using the configured Django project:

```bat
python backend\manage.py makemigrations
python backend\manage.py migrate
```

These commands require a working Django setup and must be run with the virtual environment activated.

### Protecting business records

- Do not delete the database as a routine troubleshooting step.
- Do not store the live database inside a folder that gets replaced during an application update.
- Back up the database before applying risky schema or data changes.
- Test migrations against a backup or development database before using them with real business data.
- Avoid manually editing the SQLite file unless you understand the consequences.

---

## Inventory and Accounting Rules

Inventory and financial records must remain consistent. These rules should guide backend implementation.

### Stock movements

Every finalized transaction that changes inventory should create an auditable stock movement, such as:

- Stock received from a purchase.
- Stock removed by a sale.
- Goods returned by a customer.
- Goods returned to a supplier.
- A manual adjustment.
- Damaged or missing stock.

The movement history should include the product, quantity change, date, reason or transaction reference, and any other information required for auditing.

### Purchase cost

A weighted-average costing method is planned for inventory valuation. Under this approach, the average unit cost is recalculated using the existing stock value and the value of newly received stock. The implementation must define how freight, discounts, returns, and other costs affect inventory value.

### Money and rounding

- Use decimal-based values for money, not binary floating-point arithmetic.
- Define a consistent currency and rounding policy.
- Validate quantities, prices, discounts, and payments on the backend.
- Do not allow a transaction to leave inventory or balances in an inconsistent state.

### Transactions and reversals

Operations that change stock and financial balances should use database transactions. If one part fails, the related changes should roll back rather than leaving a partially saved sale or purchase.

Finalized transactions should preferably be corrected through explicit returns, reversals, or adjustments with a history, rather than silently deleting records.

> These are design requirements. They should not be treated as implemented until the corresponding backend logic and tests exist.

---

## Security and Reliability

The application should follow these principles:

- Keep Electron `contextIsolation` enabled.
- Keep `nodeIntegration` disabled in the renderer.
- Expose only specific, necessary operations through `preload.cjs`.
- Validate user input in the backend.
- Bind the local Django server to loopback (`127.0.0.1`) unless a different network design is intentionally introduced.
- Avoid exposing the backend to the local network by default.
- Keep secrets and local database files out of version control.
- Use database transactions for related inventory and balance updates.
- Display useful errors without exposing internal stack traces to ordinary users.
- Test backup restoration, not only backup creation.
- Keep sample/demo data separate from real business records.

---

## Backups and Restore

A backup system is planned to help protect against accidental deletion, hardware failure, or application problems.

A complete backup strategy should:

1. Save a consistent copy of the database.
2. Include any required supporting files, if the application later stores attachments.
3. Use clear filenames or timestamps.
4. Store backups separately from the live database when possible.
5. Allow the user to choose a backup during restore.
6. Confirm before replacing current data.
7. Validate the restored database and report success or failure clearly.

For SQLite, copying a database while it is actively being written can produce an unreliable backup if done incorrectly. Implement backup using a SQLite-aware backup method or another safe procedure, and test restoration before relying on it.

---

## Build and Packaging

Packaging is planned for a Windows installer. The intended release should let a user install and launch TradeSoft without manually opening VS Code or starting development servers.

The eventual packaging process will need to:

- Build the React frontend with Vite.
- Package the Electron desktop shell.
- Package the Python/Django backend, potentially using PyInstaller.
- Start and stop the backend process with the desktop application.
- Keep the database and backups in persistent application-data directories.
- Configure installer shortcuts and application metadata.
- Handle upgrades without overwriting user data.
- Test installation, launch, shutdown, backup, restore, and upgrades on a clean Windows environment.

The current development command `npm start` is not itself a production installer.

---

## Development Roadmap

The following is a suggested order of implementation.

- [ ] Establish and document the repository structure.
- [ ] Build the React dashboard layout and navigation.
- [ ] Create the Django project and configure SQLite.
- [ ] Define shared API conventions and error handling.
- [ ] Implement product and inventory models.
- [ ] Implement stock movements and inventory adjustments.
- [ ] Implement supplier and purchase workflows.
- [ ] Implement customer and sales workflows.
- [ ] Add payments, credit balances, and expenses.
- [ ] Connect the dashboard to real backend data.
- [ ] Add reports and inventory valuation.
- [ ] Implement backup and restore.
- [ ] Add automated tests for stock and financial calculations.
- [ ] Integrate automatic backend startup and shutdown with Electron.
- [ ] Package a Windows installer.
- [ ] Test on a clean Windows computer with no development tools installed.

Update these checkboxes as work is completed. Do not mark a task complete until it has been implemented and tested.

---

## Troubleshooting

### Electron opens a blank window or cannot connect

1. Confirm that the Vite server is running.
2. Check that Vite is using `http://localhost:5173`.
3. Start Electron in a second terminal.
4. Check the terminal output for errors in `main.cjs` or the frontend.

### `npm` commands fail

1. Confirm Node.js and npm are installed:

   ```bat
   node --version
   npm --version
   ```

2. Run the command from the correct folder.
3. Check that the folder's `package.json` contains valid JSON.
4. If a dependency installation fails, read the full error before deleting or replacing project files.

### Django commands fail

1. Confirm the Python virtual environment is activated.
2. Confirm dependencies are installed.
3. Confirm `backend/manage.py` exists.
4. Run commands from the repository root and verify the configured settings module.

### Data appears to be missing after reinstalling

The live database should not be kept in the application installation directory. Verify the configured persistent data path and check whether the application is opening a different database file. Do not delete or overwrite any candidate database until its contents have been checked and backed up.

---

## Contributing

During development:

1. Make changes in the relevant frontend, desktop, or backend area.
2. Keep business rules in the backend rather than duplicating them in UI components.
3. Test workflows that affect stock, payments, and balances.
4. Update this README when setup instructions, commands, or implemented features change.
5. Never commit real customer data, supplier records, database files, credentials, or private backups.

---

## License

No license has been selected yet. Until a license is added to the repository, do not assume that the project is open-source or that others have permission to redistribute or modify it.

---

**TradeSoft — local inventory and business management for an animal-feed business.**
