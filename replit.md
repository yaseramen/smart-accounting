# aiverce محاسب - نظام ERP محاسبي

## Overview
نظام ERP/SaaS محاسبي متكامل لإدارة الشركات باللغة العربية المصرية. يدعم تعدد الشركات (Multi-tenancy) مع عزل البيانات، نظام صلاحيات مرن، محفظة إلكترونية، وسجل عمليات كامل.

## Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express + express-session (PostgreSQL session store)
- **Database**: PostgreSQL (Replit built-in) with Drizzle ORM
- **Auth**: bcrypt password hashing, session-based authentication
- **Language**: Full Arabic (Egyptian) RTL interface with Cairo font
- **QR Code**: qrcode package for invoice QR generation
- **Excel**: xlsx package for client-side Excel export/import

## Architecture
```
client/src/
  pages/           - Dashboard, Accounts, Customers, Suppliers, Journal Entries, Ledger
                     Products, Warehouses, Sales, Purchases, Stock Alerts
                     CustomerStatement, SupplierStatement, ProductReport
  pages/admin/     - Branches, Users, Wallet, Audit Log, Settings, System Settings, System Dashboard
  components/      - App sidebar (permission-based + super_admin-specific), UI components (shadcn)
  hooks/use-auth.ts - Auth hook with permission checking
shared/
  schema.ts        - Drizzle table definitions + Zod schemas (all tables)
  routes.ts        - API contract definitions with validation schemas
server/
  db.ts            - Database connection (PostgreSQL pool)
  auth.ts          - Auth middleware (requireAuth, requireRole, requirePermission, checkWalletBalance)
  storage.ts       - DatabaseStorage class (company-scoped CRUD operations)
  routes.ts        - Express API routes (no hardcoded seed accounts)
```

## Initial Setup (First User Strategy)
- No hardcoded admin accounts - the system starts with zero users
- First user to register from the login screen becomes **Super Admin** (المالك الأول)
- Setup screen appears automatically when DB has no users
- After first user is created, normal login/registration is shown
- Super Admin has full control: all companies, wallet charging, commission rates, system settings

## Database Schema
- **system_settings** - Global system config (service fee rate, support phones)
- **companies** - Multi-tenant companies with wallet balance
- **branches** - Company branches (per-company unique code)
- **users** - User accounts with bcrypt passwords and roles
- **permissions** - Per-user, per-page granular permissions (view/create/edit/delete)
- **wallet_transactions** - Company wallet charge/deduction history
- **audit_logs** - Full audit trail (user, action, table, details)
- **accounts** - Chart of accounts (per-company, hierarchical)
- **customers** - Customer management (per-company)
- **suppliers** - Supplier management (per-company)
- **journal_entries** - Journal entries with draft/approved workflow (per-company)
- **journal_entry_lines** - Entry line items (debit/credit)
- **units** - Measurement units per company with category (weight/length/volume/area/piece)
- **products** - Product catalog with multi-unit, dimensions, composite support
- **product_components** - Bill of Materials for composite products
- **warehouses** - Warehouse/storage locations per company
- **warehouse_stock** - Stock per product per warehouse
- **invoices** - Sales/purchase/sale_return/purchase_return invoices with draft/approved workflow, extra_costs, extra_costs_description
- **invoice_lines** - Invoice line items with line_type (product/service), description, unit conversion, dimensions
- **stock_transfers** - Stock transfers between warehouses (draft/approved workflow)
- **stock_transfer_lines** - Transfer line items (product, quantity)

## Auth & Roles
- **super_admin** - Full system access, manage all companies, wallet charging, system settings (first user auto-assigned)
- **company_owner** - Full company access, manage users/branches/permissions
- **user** - Access based on assigned permissions per page

## Key Features
1. First User Strategy - first registrant = Super Admin (no hardcoded accounts)
2. System Dashboard for Super Admin (all companies stats, wallet charging)
3. Multi-tenancy with company_id isolation
4. Session-based auth with bcrypt password hashing
5. Granular permissions per user per page
6. Company wallet with charge/deduction tracking
7. Wallet balance enforcement (block at 0, warn at 20%)
8. Full audit log for all CRUD operations
9. Dashboard with financial summary + P&L (totalSales, totalPurchases, grossProfit)
10. Chart of Accounts (tree structure with levels)
11. Journal Entries (create, approve, view with transactions)
12. General Ledger (account movement history)
13. Customer & Supplier CRUD with auto-generated codes (CUS-XXXX, SUP-XXXX)
14. Branch management
15. Arabic RTL interface with Cairo font
16. Products with multi-unit conversion (buy by ton, sell by gram)
17. Dimension products (length × width = area calculation)
18. Composite products with BOM editor + manufacturing (deducts components, adds composite stock)
19. Warehouse management with stock tracking + warehouse ownership validation
20. Sales & Purchase invoices with draft/approve workflow + auto invoice numbers (INV-XXXX, PUR-XXXX)
21. Invoice approval triggers: stock update + journal entry + wallet service fee deduction (all in DB transaction)
22. QR code generation for invoices
23. Thermal printing support (receipt-style invoice print) with service descriptions, extra costs, digital fee
24. Stock alerts (products below reorder level)
25. Auto-generated barcode for products + barcode scanner input + barcode print button + auto product codes (PRD-XXXX)
26. Service line items in invoices (with description text area) - supports mixed product+service invoices
27. Extra costs field on invoices (transport, fees) with description
28. Digital service fee (0.05% "خدمة رقمية") calculated on subtotal+extraCosts, printed clearly
29. Customer account statement (clickable name → transaction history, invoices, balances)
30. Supplier account statement (clickable name → transaction history, invoices, balances)
31. Product smart report (clickable name → movement, suppliers, buyers, warehouse stock, profit)
32. Delete confirmation dialogs on all delete actions
33. Inline entity creation from invoices (create customer/supplier/product without leaving invoice form)
34. Unit categories (weight, length, volume, area, piece) - secondary unit filtered by same category
35. Excel export for customers, suppliers, products, sales, purchases lists
36. WhatsApp share for invoices
37. Excel import template download for products
38. User block/activate toggle in admin panel
39. Sales/Purchase returns (sale_return, purchase_return) with original invoice reference + stock reversal
40. Stock transfers between warehouses (draft/approved workflow, stock validation)
41. Branch manager assignment - assign users to branches from users page
42. Dark mode toggle (sun/moon icon in sidebar footer, persists in localStorage)
43. Searchable product selector (combobox with name/code/barcode filtering) in sales & purchases
44. Searchable customer/supplier selector (combobox with name/phone filtering)
45. Unique phone number per company for customers and suppliers
46. Reports page with P&L by date range (daily/weekly/monthly/yearly/custom)
47. Company info on invoice print (name, phone, tax number, commercial registration)
48. Invoice notes printed on invoices
49. efct company footer ad on all printed invoices
50. Custom service fee rate per company (customServiceFeeRate field, overrides default rate)
51. Platform earnings report page (/platform-earnings) with date filtering and per-company breakdown
52. Support ticket system - users can submit tickets (bug/feature/question/complaint), admin can reply and manage
53. Admin support tickets page (/admin-support) for super_admin to view all tickets, reply, close/reopen
54. Wallet deduction/reversal - super admin can deduct from company wallets to reverse mistaken charges
55. Super admin dual-mode - can select a company to view/manage as company owner (x-company-id header)
56. Notifications system - bell icon with unread count, notifications for invoice approval/wallet charge/ticket reply
57. Dashboard charts - recharts BarChart for monthly sales/purchases, PieChart for account distribution
58. Global search - search bar in sidebar searching across customers/suppliers/products/invoices
59. Login audit log - records login/logout events with IP/user agent, viewable by admin (/login-logs)
60. PDF export - full A4 PDF export for invoices via print dialog (sales/purchases/returns)
61. Finer permissions UI - select-all per row/column, clear Arabic labels, permission summary badges
62. Treasury page (/treasury) - shows cash/treasury account balance and all movements with date filtering
63. Revenue page (/revenue) - record new revenues with auto journal entry creation (debit treasury, credit revenue)
64. Expenses page (/expenses-page) - record new expenses with auto journal entry creation (debit expense, credit treasury)
65. Treasury/Revenue/Expense reports with date filtering and category breakdowns
66. Invoice payment type (paid/deferred/partial) and payment method (cash/vodafone_cash/instapay/bank_transfer/check/other)
67. Invoice draft auto-save to localStorage - resume incomplete invoices after navigating away
68. Enhanced customer/supplier statements with debit/credit columns, running balance, date filtering, returns inclusion
69. Payment recording against invoices - POST /api/payments, auto-updates paidAmount and paymentType
70. Outstanding balance reports - /receivables (customer) and /payables (supplier) pages showing unpaid invoices
71. Save+Print+Approve flow - invoices auto-approve and print on creation (no more draft workflow)
72. Service fee ON invoice (customer pays) - 0.05% of (subtotal - discount + extraCosts), min 0.50 EGP, added before tax
73. Server-side service fee enforcement - backend recalculates serviceFee regardless of client value
74. New logo - /logo.png displayed in sidebar and login page
75. Terms/Policy page (/terms) - comprehensive usage policy protecting owner from legal/tax liability, public route
76. User guide page (/guide) - full in-app manual with searchable accordion sections, common errors and tips
77. SEO optimization - meta tags, Open Graph, Twitter Cards, structured data (JSON-LD), Arabic keywords for search visibility
78. Login page intro section - features list and links to guide/terms for SEO and user onboarding

## Auto-Code Generation
- Customer codes: CUS-XXXX (max-based, gap-safe)
- Supplier codes: SUP-XXXX (max-based, gap-safe)
- Sales invoice numbers: INV-XXXX (max-based)
- Purchase invoice numbers: PUR-XXXX (max-based)
- Product codes: PRD-XXXX (max-based)
- Endpoints: /api/auto/customer-code, /api/auto/supplier-code, /api/auto/invoice-number?type=sale|purchase, /api/auto/product-code

## Super Admin Endpoints
- GET /api/auth/setup-status - Check if system needs initial setup
- GET /api/system-dashboard/stats - System-wide stats (companies, users, invoices, wallet totals)
- GET /api/admin/companies - List all companies
- POST /api/wallet/charge - Charge company wallet

## Report Routes
- GET /api/customers/:id/statement - Customer account statement
- GET /api/suppliers/:id/statement - Supplier account statement
- GET /api/products/:id/report - Product movement & profit report

## Manufacturing
- POST /api/products/:id/manufacture {quantity, warehouseId} - Manufacture composite product
- Validates warehouse ownership, component stock sufficiency
- Deducts component stock, adds composite stock (transactional)
- BOM editor: PUT /api/products/:id/components, GET /api/products/:id/components

## Pages (Permissions)
dashboard, accounts, journal-entries, ledger, customers, suppliers, products, warehouses, sales, purchases, stock-alerts, returns, stock-transfers, branches, users, wallet, audit-log, settings, receivables, payables

## Super Admin Pages (role-based, no company needed)
/ (System Dashboard), /system-settings, /audit-log

## Report Pages (no permission required, auth only)
/customers/:id/statement, /suppliers/:id/statement, /products/:id/report

## Running
- `npm run dev` starts both frontend and backend
- `npm run db:push` syncs schema to database
