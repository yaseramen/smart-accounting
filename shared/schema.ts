import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, decimal, boolean, timestamp, date, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============ SYSTEM SETTINGS ============
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  serviceFeeRate: decimal("service_fee_rate", { precision: 5, scale: 4 }).notNull().default("0.0005"),
  supportPhone1: varchar("support_phone1", { length: 20 }).notNull().default("01009376052"),
  supportPhone2: varchar("support_phone2", { length: 20 }).notNull().default("01556660502"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============ COMPANIES ============
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  taxNumber: varchar("tax_number", { length: 30 }),
  commercialRegistration: varchar("commercial_registration", { length: 50 }),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 100 }),
  walletBalance: decimal("wallet_balance", { precision: 15, scale: 2 }).notNull().default("0"),
  lowBalanceThreshold: decimal("low_balance_threshold", { precision: 15, scale: 2 }).notNull().default("20"),
  customServiceFeeRate: decimal("custom_service_fee_rate", { precision: 5, scale: 4 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ BRANCHES ============
export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: text("name").notNull(),
  code: varchar("code", { length: 20 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("branch_company_code_idx").on(table.companyId, table.code),
]);

export const branchesRelations = relations(branches, ({ one }) => ({
  company: one(companies, { fields: [branches.companyId], references: [companies.id] }),
}));

// ============ USERS ============
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: text("password").notNull(),
  email: varchar("email", { length: 100 }),
  fullName: text("full_name").notNull(),
  companyId: integer("company_id"),
  branchId: integer("branch_id"),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, { fields: [users.companyId], references: [companies.id] }),
  branch: one(branches, { fields: [users.branchId], references: [branches.id] }),
  permissions: many(permissions),
}));

// ============ PERMISSIONS ============
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  page: varchar("page", { length: 50 }).notNull(),
  canView: boolean("can_view").notNull().default(false),
  canCreate: boolean("can_create").notNull().default(false),
  canEdit: boolean("can_edit").notNull().default(false),
  canDelete: boolean("can_delete").notNull().default(false),
}, (table) => [
  uniqueIndex("permission_user_page_idx").on(table.userId, table.page),
]);

export const permissionsRelations = relations(permissions, ({ one }) => ({
  user: one(users, { fields: [permissions.userId], references: [users.id] }),
}));

// ============ WALLET TRANSACTIONS ============
export const walletTransactions = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  description: text("description").notNull(),
  balanceBefore: decimal("balance_before", { precision: 15, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  company: one(companies, { fields: [walletTransactions.companyId], references: [companies.id] }),
}));

// ============ AUDIT LOGS ============
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  userId: integer("user_id"),
  userName: text("user_name").notNull(),
  action: varchar("action", { length: 20 }).notNull(),
  tableName: varchar("table_name", { length: 50 }).notNull(),
  recordId: integer("record_id"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ ACCOUNTS (with companyId) ============
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  code: varchar("code", { length: 20 }).notNull(),
  name: text("name").notNull(),
  type: varchar("type", { length: 30 }).notNull(),
  parentId: integer("parent_id"),
  level: integer("level").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default("0"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("account_company_code_idx").on(table.companyId, table.code),
]);

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  company: one(companies, { fields: [accounts.companyId], references: [companies.id] }),
  parent: one(accounts, { fields: [accounts.parentId], references: [accounts.id] }),
  journalEntryLines: many(journalEntryLines),
}));

// ============ CUSTOMERS (with companyId) ============
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  code: varchar("code", { length: 20 }).notNull(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 100 }),
  address: text("address"),
  taxNumber: varchar("tax_number", { length: 30 }),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("customer_company_code_idx").on(table.companyId, table.code),
  uniqueIndex("customer_company_phone_idx").on(table.companyId, table.phone),
]);

// ============ SUPPLIERS (with companyId) ============
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  code: varchar("code", { length: 20 }).notNull(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 100 }),
  address: text("address"),
  taxNumber: varchar("tax_number", { length: 30 }),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("supplier_company_code_idx").on(table.companyId, table.code),
  uniqueIndex("supplier_company_phone_idx").on(table.companyId, table.phone),
]);

// ============ JOURNAL ENTRIES (with companyId, branchId, createdBy) ============
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  branchId: integer("branch_id"),
  createdBy: integer("created_by"),
  entryNumber: varchar("entry_number", { length: 20 }).notNull(),
  entryDate: date("entry_date").notNull(),
  description: text("description").notNull(),
  reference: varchar("reference", { length: 50 }),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  totalDebit: decimal("total_debit", { precision: 15, scale: 2 }).notNull().default("0"),
  totalCredit: decimal("total_credit", { precision: 15, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("entry_company_number_idx").on(table.companyId, table.entryNumber),
]);

export const journalEntryLines = pgTable("journal_entry_lines", {
  id: serial("id").primaryKey(),
  journalEntryId: integer("journal_entry_id").notNull(),
  accountId: integer("account_id").notNull(),
  debit: decimal("debit", { precision: 15, scale: 2 }).notNull().default("0"),
  credit: decimal("credit", { precision: 15, scale: 2 }).notNull().default("0"),
  description: text("description"),
});

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
  company: one(companies, { fields: [journalEntries.companyId], references: [companies.id] }),
  branch: one(branches, { fields: [journalEntries.branchId], references: [branches.id] }),
  createdByUser: one(users, { fields: [journalEntries.createdBy], references: [users.id] }),
  lines: many(journalEntryLines),
}));

export const journalEntryLinesRelations = relations(journalEntryLines, ({ one }) => ({
  journalEntry: one(journalEntries, { fields: [journalEntryLines.journalEntryId], references: [journalEntries.id] }),
  account: one(accounts, { fields: [journalEntryLines.accountId], references: [accounts.id] }),
}));

// ============ UNITS ============
export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: text("name").notNull(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  category: varchar("category", { length: 30 }),
}, (table) => [
  uniqueIndex("unit_company_name_idx").on(table.companyId, table.name),
]);

export const unitsRelations = relations(units, ({ one }) => ({
  company: one(companies, { fields: [units.companyId], references: [companies.id] }),
}));

// ============ PRODUCTS ============
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: text("name").notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  barcode: varchar("barcode", { length: 50 }),
  category: varchar("category", { length: 100 }),
  primaryUnitId: integer("primary_unit_id").notNull(),
  secondaryUnitId: integer("secondary_unit_id"),
  conversionFactor: decimal("conversion_factor", { precision: 15, scale: 4 }).default("1"),
  hasDimensions: boolean("has_dimensions").notNull().default(false),
  dimensionUnit: varchar("dimension_unit", { length: 10 }),
  isComposite: boolean("is_composite").notNull().default(false),
  currentStock: decimal("current_stock", { precision: 15, scale: 4 }).notNull().default("0"),
  reorderLevel: decimal("reorder_level", { precision: 15, scale: 4 }).notNull().default("0"),
  costPrice: decimal("cost_price", { precision: 15, scale: 2 }).notNull().default("0"),
  sellPrice: decimal("sell_price", { precision: 15, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("product_company_code_idx").on(table.companyId, table.code),
]);

export const productsRelations = relations(products, ({ one, many }) => ({
  company: one(companies, { fields: [products.companyId], references: [companies.id] }),
  primaryUnit: one(units, { fields: [products.primaryUnitId], references: [units.id], relationName: "primaryUnit" }),
  secondaryUnit: one(units, { fields: [products.secondaryUnitId], references: [units.id], relationName: "secondaryUnit" }),
  components: many(productComponents, { relationName: "compositeProduct" }),
}));

// ============ PRODUCT COMPONENTS (BOM) ============
export const productComponents = pgTable("product_components", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  componentProductId: integer("component_product_id").notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 4 }).notNull().default("1"),
});

export const productComponentsRelations = relations(productComponents, ({ one }) => ({
  product: one(products, { fields: [productComponents.productId], references: [products.id], relationName: "compositeProduct" }),
  componentProduct: one(products, { fields: [productComponents.componentProductId], references: [products.id], relationName: "componentOf" }),
}));

// ============ WAREHOUSES ============
export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  branchId: integer("branch_id"),
  name: text("name").notNull(),
  code: varchar("code", { length: 20 }).notNull(),
  address: text("address"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("warehouse_company_code_idx").on(table.companyId, table.code),
]);

export const warehousesRelations = relations(warehouses, ({ one, many }) => ({
  company: one(companies, { fields: [warehouses.companyId], references: [companies.id] }),
  branch: one(branches, { fields: [warehouses.branchId], references: [branches.id] }),
  stock: many(warehouseStock),
}));

// ============ WAREHOUSE STOCK ============
export const warehouseStock = pgTable("warehouse_stock", {
  id: serial("id").primaryKey(),
  warehouseId: integer("warehouse_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 4 }).notNull().default("0"),
}, (table) => [
  uniqueIndex("warehouse_stock_idx").on(table.warehouseId, table.productId),
]);

export const warehouseStockRelations = relations(warehouseStock, ({ one }) => ({
  warehouse: one(warehouses, { fields: [warehouseStock.warehouseId], references: [warehouses.id] }),
  product: one(products, { fields: [warehouseStock.productId], references: [products.id] }),
}));

// ============ INVOICES ============
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  branchId: integer("branch_id"),
  createdBy: integer("created_by"),
  invoiceNumber: varchar("invoice_number", { length: 30 }).notNull(),
  invoiceDate: date("invoice_date").notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  customerId: integer("customer_id"),
  supplierId: integer("supplier_id"),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull().default("0"),
  discountAmount: decimal("discount_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  discountPercent: decimal("discount_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  taxPercent: decimal("tax_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  serviceFee: decimal("service_fee", { precision: 15, scale: 2 }).notNull().default("0"),
  extraCosts: decimal("extra_costs", { precision: 15, scale: 2 }).notNull().default("0"),
  extraCostsDescription: text("extra_costs_description"),
  total: decimal("total", { precision: 15, scale: 2 }).notNull().default("0"),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  paymentType: varchar("payment_type", { length: 20 }).notNull().default("paid"),
  paymentMethod: varchar("payment_method", { length: 30 }).notNull().default("cash"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  notes: text("notes"),
  reference: varchar("reference", { length: 50 }),
  qrData: text("qr_data"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("invoice_company_number_idx").on(table.companyId, table.invoiceNumber),
]);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  company: one(companies, { fields: [invoices.companyId], references: [companies.id] }),
  branch: one(branches, { fields: [invoices.branchId], references: [branches.id] }),
  createdByUser: one(users, { fields: [invoices.createdBy], references: [users.id] }),
  customer: one(customers, { fields: [invoices.customerId], references: [customers.id] }),
  supplier: one(suppliers, { fields: [invoices.supplierId], references: [suppliers.id] }),
  lines: many(invoiceLines),
}));

// ============ INVOICE LINES ============
export const invoiceLines = pgTable("invoice_lines", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull(),
  lineType: varchar("line_type", { length: 20 }).notNull().default("product"),
  productId: integer("product_id"),
  warehouseId: integer("warehouse_id"),
  quantity: decimal("quantity", { precision: 15, scale: 4 }).notNull(),
  unitId: integer("unit_id"),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  description: text("description"),
  length: decimal("length", { precision: 15, scale: 4 }),
  width: decimal("width", { precision: 15, scale: 4 }),
  area: decimal("area", { precision: 15, scale: 4 }),
  effectiveQuantity: decimal("effective_quantity", { precision: 15, scale: 4 }).notNull(),
  discount: decimal("discount", { precision: 15, scale: 2 }).notNull().default("0"),
  taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 15, scale: 2 }).notNull().default("0"),
});

export const invoiceLinesRelations = relations(invoiceLines, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceLines.invoiceId], references: [invoices.id] }),
  product: one(products, { fields: [invoiceLines.productId], references: [products.id] }),
  warehouse: one(warehouses, { fields: [invoiceLines.warehouseId], references: [warehouses.id] }),
  unit: one(units, { fields: [invoiceLines.unitId], references: [units.id] }),
}));

// ============ STOCK TRANSFERS ============
export const stockTransfers = pgTable("stock_transfers", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  fromWarehouseId: integer("from_warehouse_id").notNull(),
  toWarehouseId: integer("to_warehouse_id").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stockTransfersRelations = relations(stockTransfers, ({ one, many }) => ({
  company: one(companies, { fields: [stockTransfers.companyId], references: [companies.id] }),
  fromWarehouse: one(warehouses, { fields: [stockTransfers.fromWarehouseId], references: [warehouses.id], relationName: "fromWarehouse" }),
  toWarehouse: one(warehouses, { fields: [stockTransfers.toWarehouseId], references: [warehouses.id], relationName: "toWarehouse" }),
  createdByUser: one(users, { fields: [stockTransfers.createdBy], references: [users.id] }),
  lines: many(stockTransferLines),
}));

export const stockTransferLines = pgTable("stock_transfer_lines", {
  id: serial("id").primaryKey(),
  transferId: integer("transfer_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 4 }).notNull(),
});

export const stockTransferLinesRelations = relations(stockTransferLines, ({ one }) => ({
  transfer: one(stockTransfers, { fields: [stockTransferLines.transferId], references: [stockTransfers.id] }),
  product: one(products, { fields: [stockTransferLines.productId], references: [products.id] }),
}));

// ============ INSERT SCHEMAS ============
export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true, walletBalance: true });
export const insertBranchSchema = createInsertSchema(branches).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertPermissionSchema = createInsertSchema(permissions).omit({ id: true });
export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true, createdAt: true });
export const insertSystemSettingsSchema = createInsertSchema(systemSettings).omit({ id: true, updatedAt: true });
export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true, createdAt: true, balance: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true, balance: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true, balance: true });
export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({ id: true, createdAt: true, totalDebit: true, totalCredit: true });
export const insertJournalEntryLineSchema = createInsertSchema(journalEntryLines).omit({ id: true });
export const insertUnitSchema = createInsertSchema(units).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, currentStock: true });
export const insertProductComponentSchema = createInsertSchema(productComponents).omit({ id: true });
export const insertWarehouseSchema = createInsertSchema(warehouses).omit({ id: true, createdAt: true });
export const insertWarehouseStockSchema = createInsertSchema(warehouseStock).omit({ id: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export const insertInvoiceLineSchema = createInsertSchema(invoiceLines).omit({ id: true });
export const insertStockTransferSchema = createInsertSchema(stockTransfers).omit({ id: true, createdAt: true });
export const insertStockTransferLineSchema = createInsertSchema(stockTransferLines).omit({ id: true });

// ============ TYPES ============
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Branch = typeof branches.$inferSelect;
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type SystemSettings = typeof systemSettings.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntryLine = typeof journalEntryLines.$inferSelect;
export type InsertJournalEntryLine = z.infer<typeof insertJournalEntryLineSchema>;
export type Unit = typeof units.$inferSelect;
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type ProductComponent = typeof productComponents.$inferSelect;
export type InsertProductComponent = z.infer<typeof insertProductComponentSchema>;
export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;
export type WarehouseStockItem = typeof warehouseStock.$inferSelect;
export type InsertWarehouseStock = z.infer<typeof insertWarehouseStockSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InvoiceLine = typeof invoiceLines.$inferSelect;
export type InsertInvoiceLine = z.infer<typeof insertInvoiceLineSchema>;

export type StockTransfer = typeof stockTransfers.$inferSelect;
export type InsertStockTransfer = z.infer<typeof insertStockTransferSchema>;
export type StockTransferLine = typeof stockTransferLines.$inferSelect;
export type InsertStockTransferLine = z.infer<typeof insertStockTransferLineSchema>;

export type StockTransferWithLines = StockTransfer & {
  lines: (StockTransferLine & { product?: Product })[];
  fromWarehouse?: Warehouse;
  toWarehouse?: Warehouse;
};

export type CreateStockTransferRequest = {
  transfer: InsertStockTransfer;
  lines: Omit<InsertStockTransferLine, "transferId">[];
};

export type CreateAccountRequest = InsertAccount;
export type UpdateAccountRequest = Partial<InsertAccount>;
export type CreateCustomerRequest = InsertCustomer;
export type UpdateCustomerRequest = Partial<InsertCustomer>;
export type CreateSupplierRequest = InsertSupplier;
export type UpdateSupplierRequest = Partial<InsertSupplier>;

export type CreateJournalEntryRequest = {
  entry: InsertJournalEntry;
  lines: Omit<InsertJournalEntryLine, "journalEntryId">[];
};

export type JournalEntryWithLines = JournalEntry & {
  lines: (JournalEntryLine & { account?: Account })[];
};

export type InvoiceWithLines = Invoice & {
  lines: (InvoiceLine & { product?: Product; unit?: Unit; warehouse?: Warehouse })[];
  customer?: Customer | null;
  supplier?: Supplier | null;
};

export type ProductWithUnits = Product & {
  primaryUnit?: Unit;
  secondaryUnit?: Unit | null;
  components?: (ProductComponent & { componentProduct?: Product })[];
};

export type WarehouseStockWithProduct = WarehouseStockItem & {
  product?: Product & { primaryUnit?: Unit };
  warehouse?: Warehouse;
};

export type StockAlert = {
  productId: number;
  productName: string;
  productCode: string;
  currentStock: string;
  reorderLevel: string;
  primaryUnitSymbol: string;
};

export type CreateInvoiceRequest = {
  invoice: InsertInvoice;
  lines: Omit<InsertInvoiceLine, "invoiceId">[];
};

export type LedgerEntry = {
  date: string;
  entryNumber: string;
  description: string;
  debit: string;
  credit: string;
  balance: string;
};

export type MonthlyData = {
  month: string;
  sales: number;
  purchases: number;
};

export type AccountTypeDistribution = {
  type: string;
  total: number;
};

export type DashboardStats = {
  totalAccounts: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalJournalEntries: number;
  totalAssets: string;
  totalLiabilities: string;
  totalRevenue: string;
  totalExpenses: string;
  totalSales: string;
  totalPurchases: string;
  grossProfit: string;
  totalProducts: number;
  totalInvoices: number;
  monthlySalesPurchases: MonthlyData[];
  accountTypeDistribution: AccountTypeDistribution[];
};

export type UserWithPermissions = User & {
  permissions: Permission[];
  company?: Company | null;
  branch?: Branch | null;
};

export type SafeUser = Omit<UserWithPermissions, "password">;

export type ProfitLossReport = {
  totalSales: string;
  totalSalesReturns: string;
  netSales: string;
  totalPurchases: string;
  totalPurchasesReturns: string;
  netPurchases: string;
  grossProfit: string;
  totalExpenses: string;
  netProfit: string;
  periodStart: string;
  periodEnd: string;
};

// ============ SUPPORT TICKETS ============
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id"),
  userId: integer("user_id").notNull(),
  userName: text("user_name").notNull(),
  companyName: text("company_name"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  category: varchar("category", { length: 30 }).notNull().default("bug"),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  adminReply: text("admin_reply"),
  repliedAt: timestamp("replied_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({ id: true, status: true, adminReply: true, repliedAt: true, createdAt: true });
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

// ============ LOGIN LOGS ============
export const loginLogs = pgTable("login_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  userName: text("user_name").notNull(),
  companyId: integer("company_id"),
  action: varchar("action", { length: 20 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLoginLogSchema = createInsertSchema(loginLogs).omit({ id: true, createdAt: true });
export type InsertLoginLog = z.infer<typeof insertLoginLogSchema>;
export type LoginLog = typeof loginLogs.$inferSelect;

// ============ NOTIFICATIONS ============
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  companyId: integer("company_id"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 20 }).notNull().default("info"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, isRead: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ============ REVENUES ============
export const revenues = pgTable("revenues", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  date: date("date").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 50 }).notNull().default("أخرى"),
  accountId: integer("account_id"),
  treasuryAccountId: integer("treasury_account_id"),
  journalEntryId: integer("journal_entry_id"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const revenuesRelations = relations(revenues, ({ one }) => ({
  company: one(companies, { fields: [revenues.companyId], references: [companies.id] }),
  account: one(accounts, { fields: [revenues.accountId], references: [accounts.id] }),
  treasuryAccount: one(accounts, { fields: [revenues.treasuryAccountId], references: [accounts.id] }),
  journalEntry: one(journalEntries, { fields: [revenues.journalEntryId], references: [journalEntries.id] }),
}));

export const insertRevenueSchema = createInsertSchema(revenues).omit({ id: true, journalEntryId: true, createdAt: true });
export type InsertRevenue = z.infer<typeof insertRevenueSchema>;
export type Revenue = typeof revenues.$inferSelect;

// ============ EXPENSES ============
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  date: date("date").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 50 }).notNull().default("أخرى"),
  accountId: integer("account_id"),
  treasuryAccountId: integer("treasury_account_id"),
  journalEntryId: integer("journal_entry_id"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expensesRelations = relations(expenses, ({ one }) => ({
  company: one(companies, { fields: [expenses.companyId], references: [companies.id] }),
  account: one(accounts, { fields: [expenses.accountId], references: [accounts.id] }),
  treasuryAccount: one(accounts, { fields: [expenses.treasuryAccountId], references: [accounts.id] }),
  journalEntry: one(journalEntries, { fields: [expenses.journalEntryId], references: [journalEntries.id] }),
}));

export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, journalEntryId: true, createdAt: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

// ============ PAYMENTS (تسديدات الفواتير) ============
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  invoiceId: integer("invoice_id").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 30 }).notNull().default("cash"),
  paymentDate: date("payment_date").notNull(),
  notes: text("notes"),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  company: one(companies, { fields: [payments.companyId], references: [companies.id] }),
  invoice: one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
  createdByUser: one(users, { fields: [payments.createdBy], references: [users.id] }),
}));

export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export const PAGES = [
  "dashboard",
  "accounts",
  "journal-entries",
  "ledger",
  "customers",
  "suppliers",
  "products",
  "warehouses",
  "sales",
  "purchases",
  "returns",
  "stock-alerts",
  "stock-transfers",
  "reports",
  "branches",
  "users",
  "wallet",
  "audit-log",
  "login-logs",
  "settings",
  "treasury",
  "revenue",
  "expenses-page",
  "receivables",
  "payables",
] as const;

export type PageName = (typeof PAGES)[number];

export const ROLES = ["super_admin", "company_owner", "user"] as const;
export type UserRole = (typeof ROLES)[number];
