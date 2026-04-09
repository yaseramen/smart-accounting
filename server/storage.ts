import { db, pool } from "./db";
import {
  accounts, customers, suppliers, journalEntries, journalEntryLines,
  companies, branches, users, permissions, walletTransactions, auditLogs, systemSettings,
  units, products, productComponents, warehouses, warehouseStock, invoices, invoiceLines,
  stockTransfers, stockTransferLines, supportTickets, loginLogs,
  type Account, type InsertAccount, type CreateAccountRequest, type UpdateAccountRequest,
  type Customer, type InsertCustomer, type CreateCustomerRequest, type UpdateCustomerRequest,
  type Supplier, type InsertSupplier, type CreateSupplierRequest, type UpdateSupplierRequest,
  type JournalEntry, type JournalEntryWithLines, type CreateJournalEntryRequest,
  type LedgerEntry, type DashboardStats,
  type Company, type InsertCompany, type Branch, type InsertBranch,
  type User, type InsertUser, type Permission, type InsertPermission,
  type WalletTransaction, type InsertWalletTransaction,
  type AuditLog, type InsertAuditLog, type SystemSettings,
  type SafeUser, type UserWithPermissions,
  type Unit, type InsertUnit,
  type Product, type InsertProduct, type ProductWithUnits,
  type ProductComponent, type InsertProductComponent,
  type Warehouse, type InsertWarehouse,
  type WarehouseStockItem, type InsertWarehouseStock, type WarehouseStockWithProduct,
  type Invoice, type InsertInvoice, type InvoiceWithLines, type CreateInvoiceRequest,
  type InvoiceLine, type InsertInvoiceLine,
  type StockAlert,
  type StockTransfer, type InsertStockTransfer, type StockTransferWithLines, type CreateStockTransferRequest,
  type StockTransferLine, type InsertStockTransferLine,
  type SupportTicket, type InsertSupportTicket,
  type LoginLog, type InsertLoginLog,
  type Notification, type InsertNotification,
  notifications,
  revenues, expenses, payments,
  type Revenue, type InsertRevenue,
  type Expense, type InsertExpense,
  type Payment, type InsertPayment,
} from "@shared/schema";
import { eq, sql, and, desc, asc, isNull, lt, lte, or, ilike } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

export interface IStorage {
  getAccounts(companyId: number | null): Promise<Account[]>;
  getAccount(id: number, companyId: number | null): Promise<Account | undefined>;
  createAccount(data: CreateAccountRequest): Promise<Account>;
  updateAccount(id: number, data: UpdateAccountRequest, companyId: number | null): Promise<Account>;
  deleteAccount(id: number, companyId: number | null): Promise<void>;

  getCustomers(companyId: number | null): Promise<Customer[]>;
  getCustomer(id: number, companyId: number | null): Promise<Customer | undefined>;
  createCustomer(data: CreateCustomerRequest): Promise<Customer>;
  updateCustomer(id: number, data: UpdateCustomerRequest, companyId: number | null): Promise<Customer>;
  deleteCustomer(id: number, companyId: number | null): Promise<void>;

  getSuppliers(companyId: number | null): Promise<Supplier[]>;
  getSupplier(id: number, companyId: number | null): Promise<Supplier | undefined>;
  createSupplier(data: CreateSupplierRequest): Promise<Supplier>;
  updateSupplier(id: number, data: UpdateSupplierRequest, companyId: number | null): Promise<Supplier>;
  deleteSupplier(id: number, companyId: number | null): Promise<void>;

  getJournalEntries(companyId: number | null): Promise<JournalEntryWithLines[]>;
  getJournalEntry(id: number, companyId: number | null): Promise<JournalEntryWithLines | undefined>;
  createJournalEntry(data: CreateJournalEntryRequest): Promise<JournalEntryWithLines>;
  approveJournalEntry(id: number, companyId: number | null): Promise<JournalEntryWithLines>;
  deleteJournalEntry(id: number, companyId: number | null): Promise<void>;

  getLedger(accountId: number, companyId: number | null): Promise<LedgerEntry[]>;
  getDashboardStats(companyId: number | null): Promise<DashboardStats>;

  getCompany(id: number): Promise<Company | undefined>;
  createCompany(data: InsertCompany): Promise<Company>;
  updateCompany(id: number, data: Partial<InsertCompany>): Promise<Company>;

  getBranches(companyId: number): Promise<Branch[]>;
  createBranch(data: InsertBranch): Promise<Branch>;
  updateBranch(id: number, data: Partial<InsertBranch>, companyId: number): Promise<Branch>;
  deleteBranch(id: number, companyId: number): Promise<void>;

  getUserByUsername(username: string): Promise<User | undefined>;
  getUserById(id: number): Promise<UserWithPermissions | undefined>;
  getCompanyUsers(companyId: number): Promise<SafeUser[]>;
  createUser(data: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number, companyId: number): Promise<void>;

  getUserPermissions(userId: number): Promise<Permission[]>;
  setUserPermissions(userId: number, perms: Omit<InsertPermission, "userId">[]): Promise<Permission[]>;

  getWalletBalance(companyId: number): Promise<string>;
  getWalletTransactions(companyId: number): Promise<WalletTransaction[]>;
  chargeWallet(companyId: number, amount: number, description: string): Promise<WalletTransaction>;
  deductWallet(companyId: number, amount: number, description: string): Promise<WalletTransaction>;

  getAuditLogs(companyId: number | null): Promise<AuditLog[]>;
  createAuditLog(data: InsertAuditLog): Promise<AuditLog>;

  getSystemSettings(): Promise<SystemSettings>;
  updateSystemSettings(data: Partial<SystemSettings>): Promise<SystemSettings>;

  getUnits(companyId: number): Promise<Unit[]>;
  createUnit(data: InsertUnit): Promise<Unit>;
  updateUnit(id: number, data: Partial<InsertUnit>, companyId: number): Promise<Unit>;
  deleteUnit(id: number, companyId: number): Promise<void>;

  getProducts(companyId: number): Promise<ProductWithUnits[]>;
  getProduct(id: number, companyId: number): Promise<ProductWithUnits | undefined>;
  createProduct(data: InsertProduct): Promise<Product>;
  updateProduct(id: number, data: Partial<InsertProduct>, companyId: number): Promise<Product>;
  deleteProduct(id: number, companyId: number): Promise<void>;
  getProductComponents(productId: number): Promise<(ProductComponent & { componentProduct?: Product })[]>;
  setProductComponents(productId: number, comps: Omit<InsertProductComponent, "productId">[]): Promise<ProductComponent[]>;

  getWarehouses(companyId: number): Promise<Warehouse[]>;
  getWarehouse(id: number, companyId: number): Promise<Warehouse | undefined>;
  createWarehouse(data: InsertWarehouse): Promise<Warehouse>;
  updateWarehouse(id: number, data: Partial<InsertWarehouse>, companyId: number): Promise<Warehouse>;
  deleteWarehouse(id: number, companyId: number): Promise<void>;
  getWarehouseStock(warehouseId: number, companyId: number): Promise<WarehouseStockWithProduct[]>;

  getInvoices(companyId: number, type?: string): Promise<InvoiceWithLines[]>;
  getInvoice(id: number, companyId: number): Promise<InvoiceWithLines | undefined>;
  createInvoice(data: CreateInvoiceRequest): Promise<InvoiceWithLines>;
  approveInvoice(id: number, companyId: number): Promise<InvoiceWithLines>;
  deleteInvoice(id: number, companyId: number): Promise<void>;

  getStockAlerts(companyId: number): Promise<StockAlert[]>;

  getStockTransfers(companyId: number): Promise<StockTransferWithLines[]>;
  getStockTransfer(id: number, companyId: number): Promise<StockTransferWithLines | undefined>;
  createStockTransfer(data: CreateStockTransferRequest): Promise<StockTransferWithLines>;
  approveStockTransfer(id: number, companyId: number): Promise<StockTransferWithLines>;
  deleteStockTransfer(id: number, companyId: number): Promise<void>;

  getNextCustomerCode(companyId: number): Promise<string>;
  getNextSupplierCode(companyId: number): Promise<string>;
  getNextInvoiceNumber(companyId: number, type: string): Promise<string>;
  getNextProductCode(companyId: number): Promise<string>;

  manufactureProduct(productId: number, quantity: number, warehouseId: number, companyId: number): Promise<void>;

  getProfitLossReport(companyId: number, startDate: string, endDate: string): Promise<any>;

  getUserCount(): Promise<number>;
  getAllCompanies(): Promise<Company[]>;
  getSystemDashboardStats(): Promise<any>;
  updateCompanyFeeRate(companyId: number, customRate: string | null): Promise<Company>;
  getPlatformEarnings(from?: string, to?: string, companyId?: number): Promise<any>;

  createSupportTicket(data: InsertSupportTicket): Promise<SupportTicket>;
  getSupportTickets(companyId?: number | null): Promise<SupportTicket[]>;
  getSupportTicket(id: number): Promise<SupportTicket | undefined>;
  replySupportTicket(id: number, reply: string): Promise<SupportTicket>;
  updateSupportTicketStatus(id: number, status: string): Promise<SupportTicket>;

  createLoginLog(data: InsertLoginLog): Promise<LoginLog>;
  getLoginLogs(companyId: number | null): Promise<LoginLog[]>;

  createNotification(data: InsertNotification): Promise<Notification>;
  getNotifications(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number, userId: number): Promise<Notification>;
  markAllNotificationsAsRead(userId: number): Promise<void>;

  globalSearch(companyId: number, query: string): Promise<{
    customers: { id: number; name: string; code: string; phone: string | null }[];
    suppliers: { id: number; name: string; code: string; phone: string | null }[];
    products: { id: number; name: string; code: string; barcode: string | null }[];
    invoices: { id: number; invoiceNumber: string; type: string; total: string }[];
  }>;

  getRevenues(companyId: number): Promise<Revenue[]>;
  createRevenue(data: InsertRevenue, companyId: number): Promise<Revenue>;
  deleteRevenue(id: number, companyId: number): Promise<void>;

  getExpenses(companyId: number): Promise<Expense[]>;
  createExpense(data: InsertExpense, companyId: number): Promise<Expense>;
  deleteExpense(id: number, companyId: number): Promise<void>;

  getTreasuryData(companyId: number): Promise<{ balance: string; transactions: any[] }>;
  getTreasuryReport(companyId: number, startDate: string, endDate: string): Promise<any>;
  getRevenueReport(companyId: number, startDate: string, endDate: string): Promise<any>;
  getExpenseReport(companyId: number, startDate: string, endDate: string): Promise<any>;

  getPaymentsByInvoice(invoiceId: number, companyId: number): Promise<Payment[]>;
  recordPayment(data: InsertPayment): Promise<Payment>;
  getOutstandingInvoices(companyId: number, entityType: "customer" | "supplier"): Promise<InvoiceWithLines[]>;
}

function companyFilter(companyId: number | null) {
  if (companyId === null) return isNull(accounts.companyId);
  return eq(accounts.companyId, companyId);
}

export class DatabaseStorage implements IStorage {
  async getAccounts(companyId: number | null): Promise<Account[]> {
    if (companyId !== null) {
      return await db.select().from(accounts).where(eq(accounts.companyId, companyId)).orderBy(asc(accounts.code));
    }
    return await db.select().from(accounts).orderBy(asc(accounts.code));
  }

  async getAccount(id: number, companyId: number | null): Promise<Account | undefined> {
    const conditions = [eq(accounts.id, id)];
    if (companyId !== null) conditions.push(eq(accounts.companyId, companyId));
    const [account] = await db.select().from(accounts).where(and(...conditions));
    return account;
  }

  async createAccount(data: CreateAccountRequest): Promise<Account> {
    const [account] = await db.insert(accounts).values(data).returning();
    return account;
  }

  async updateAccount(id: number, data: UpdateAccountRequest, companyId: number | null): Promise<Account> {
    const conditions = [eq(accounts.id, id)];
    if (companyId !== null) conditions.push(eq(accounts.companyId, companyId));
    const [account] = await db.update(accounts).set(data).where(and(...conditions)).returning();
    return account;
  }

  async deleteAccount(id: number, companyId: number | null): Promise<void> {
    const conditions = [eq(accounts.id, id)];
    if (companyId !== null) conditions.push(eq(accounts.companyId, companyId));
    await db.delete(accounts).where(and(...conditions));
  }

  async getCustomers(companyId: number | null): Promise<Customer[]> {
    if (companyId !== null) {
      return await db.select().from(customers).where(eq(customers.companyId, companyId)).orderBy(asc(customers.name));
    }
    return await db.select().from(customers).orderBy(asc(customers.name));
  }

  async getCustomer(id: number, companyId: number | null): Promise<Customer | undefined> {
    const conditions = [eq(customers.id, id)];
    if (companyId !== null) conditions.push(eq(customers.companyId, companyId));
    const [customer] = await db.select().from(customers).where(and(...conditions));
    return customer;
  }

  async createCustomer(data: CreateCustomerRequest): Promise<Customer> {
    const [customer] = await db.insert(customers).values(data).returning();
    return customer;
  }

  async updateCustomer(id: number, data: UpdateCustomerRequest, companyId: number | null): Promise<Customer> {
    const conditions = [eq(customers.id, id)];
    if (companyId !== null) conditions.push(eq(customers.companyId, companyId));
    const [customer] = await db.update(customers).set(data).where(and(...conditions)).returning();
    return customer;
  }

  async deleteCustomer(id: number, companyId: number | null): Promise<void> {
    const conditions = [eq(customers.id, id)];
    if (companyId !== null) conditions.push(eq(customers.companyId, companyId));
    await db.delete(customers).where(and(...conditions));
  }

  async getSuppliers(companyId: number | null): Promise<Supplier[]> {
    if (companyId !== null) {
      return await db.select().from(suppliers).where(eq(suppliers.companyId, companyId)).orderBy(asc(suppliers.name));
    }
    return await db.select().from(suppliers).orderBy(asc(suppliers.name));
  }

  async getSupplier(id: number, companyId: number | null): Promise<Supplier | undefined> {
    const conditions = [eq(suppliers.id, id)];
    if (companyId !== null) conditions.push(eq(suppliers.companyId, companyId));
    const [supplier] = await db.select().from(suppliers).where(and(...conditions));
    return supplier;
  }

  async createSupplier(data: CreateSupplierRequest): Promise<Supplier> {
    const [supplier] = await db.insert(suppliers).values(data).returning();
    return supplier;
  }

  async updateSupplier(id: number, data: UpdateSupplierRequest, companyId: number | null): Promise<Supplier> {
    const conditions = [eq(suppliers.id, id)];
    if (companyId !== null) conditions.push(eq(suppliers.companyId, companyId));
    const [supplier] = await db.update(suppliers).set(data).where(and(...conditions)).returning();
    return supplier;
  }

  async deleteSupplier(id: number, companyId: number | null): Promise<void> {
    const conditions = [eq(suppliers.id, id)];
    if (companyId !== null) conditions.push(eq(suppliers.companyId, companyId));
    await db.delete(suppliers).where(and(...conditions));
  }

  async getJournalEntries(companyId: number | null): Promise<JournalEntryWithLines[]> {
    const conditions = companyId !== null ? eq(journalEntries.companyId, companyId) : undefined;
    const entries = await db.query.journalEntries.findMany({
      where: conditions,
      with: {
        lines: {
          with: {
            account: true,
          },
        },
      },
      orderBy: [desc(journalEntries.createdAt)],
    });
    return entries as JournalEntryWithLines[];
  }

  async getJournalEntry(id: number, companyId: number | null): Promise<JournalEntryWithLines | undefined> {
    const conditions = companyId !== null
      ? and(eq(journalEntries.id, id), eq(journalEntries.companyId, companyId))
      : eq(journalEntries.id, id);

    const entry = await db.query.journalEntries.findFirst({
      where: conditions,
      with: {
        lines: {
          with: {
            account: true,
          },
        },
      },
    });
    return entry as JournalEntryWithLines | undefined;
  }

  async createJournalEntry(data: CreateJournalEntryRequest): Promise<JournalEntryWithLines> {
    const totalDebit = data.lines.reduce((sum, l) => sum + parseFloat(l.debit || "0"), 0);
    const totalCredit = data.lines.reduce((sum, l) => sum + parseFloat(l.credit || "0"), 0);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const txDb = drizzle(client, { schema });

      const [entry] = await txDb.insert(journalEntries).values({
        ...data.entry,
        totalDebit: totalDebit.toFixed(2),
        totalCredit: totalCredit.toFixed(2),
      }).returning();

      const linesWithEntryId = data.lines.map(line => ({
        ...line,
        journalEntryId: entry.id,
      }));

      await txDb.insert(journalEntryLines).values(linesWithEntryId);
      await client.query("COMMIT");

      return (await this.getJournalEntry(entry.id, data.entry.companyId ?? null))!;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async approveJournalEntry(id: number, companyId: number | null): Promise<JournalEntryWithLines> {
    const entry = await this.getJournalEntry(id, companyId);
    if (!entry) throw new Error("القيد غير موجود");
    if (entry.status === "approved") throw new Error("القيد معتمد بالفعل");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const txDb = drizzle(client, { schema });

      await txDb.update(journalEntries).set({ status: "approved" }).where(eq(journalEntries.id, id));

      for (const line of entry.lines) {
        const debitAmount = parseFloat(line.debit || "0");
        const creditAmount = parseFloat(line.credit || "0");
        const netChange = debitAmount - creditAmount;

        await txDb.update(accounts).set({
          balance: sql`${accounts.balance} + ${netChange}`,
        }).where(eq(accounts.id, line.accountId));
      }

      await client.query("COMMIT");
      return (await this.getJournalEntry(id, companyId))!;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteJournalEntry(id: number, companyId: number | null): Promise<void> {
    const conditions = [eq(journalEntries.id, id)];
    if (companyId !== null) conditions.push(eq(journalEntries.companyId, companyId));
    await db.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, id));
    await db.delete(journalEntries).where(and(...conditions));
  }

  async getLedger(accountId: number, companyId: number | null): Promise<LedgerEntry[]> {
    const conditions = [
      eq(journalEntryLines.accountId, accountId),
      eq(journalEntries.status, "approved"),
    ];
    if (companyId !== null) {
      conditions.push(eq(journalEntries.companyId, companyId));
    }

    const lines = await db.select({
      date: journalEntries.entryDate,
      entryNumber: journalEntries.entryNumber,
      description: journalEntries.description,
      debit: journalEntryLines.debit,
      credit: journalEntryLines.credit,
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .where(and(...conditions))
    .orderBy(asc(journalEntries.entryDate));

    let runningBalance = 0;
    return lines.map(line => {
      const debit = parseFloat(line.debit || "0");
      const credit = parseFloat(line.credit || "0");
      runningBalance += debit - credit;
      return {
        date: line.date,
        entryNumber: line.entryNumber,
        description: line.description,
        debit: line.debit || "0",
        credit: line.credit || "0",
        balance: runningBalance.toFixed(2),
      };
    });
  }

  async getDashboardStats(companyId: number | null): Promise<DashboardStats> {
    const accountConditions = companyId !== null ? eq(accounts.companyId, companyId) : undefined;
    const customerConditions = companyId !== null ? eq(customers.companyId, companyId) : undefined;
    const supplierConditions = companyId !== null ? eq(suppliers.companyId, companyId) : undefined;
    const entryConditions = companyId !== null ? eq(journalEntries.companyId, companyId) : undefined;

    const [accountCount] = await db.select({ count: sql<number>`count(*)` }).from(accounts).where(accountConditions);
    const [customerCount] = await db.select({ count: sql<number>`count(*)` }).from(customers).where(customerConditions);
    const [supplierCount] = await db.select({ count: sql<number>`count(*)` }).from(suppliers).where(supplierConditions);
    const [entryCount] = await db.select({ count: sql<number>`count(*)` }).from(journalEntries).where(entryConditions);

    const makeTypeFilter = (type: string) => {
      if (companyId !== null) return and(eq(accounts.type, type), eq(accounts.companyId, companyId));
      return eq(accounts.type, type);
    };

    const assetResult = await db.select({ total: sql<string>`coalesce(sum(balance), 0)` })
      .from(accounts).where(makeTypeFilter("أصول"));
    const liabilityResult = await db.select({ total: sql<string>`coalesce(sum(balance), 0)` })
      .from(accounts).where(makeTypeFilter("خصوم"));
    const revenueResult = await db.select({ total: sql<string>`coalesce(sum(balance), 0)` })
      .from(accounts).where(makeTypeFilter("إيرادات"));
    const expenseResult = await db.select({ total: sql<string>`coalesce(sum(balance), 0)` })
      .from(accounts).where(makeTypeFilter("مصروفات"));

    const productConditions = companyId !== null ? eq(products.companyId, companyId) : undefined;
    const invoiceConditions = companyId !== null ? eq(invoices.companyId, companyId) : undefined;
    const [productCount] = await db.select({ count: sql<number>`count(*)` }).from(products).where(productConditions);
    const [invoiceCount] = await db.select({ count: sql<number>`count(*)` }).from(invoices).where(invoiceConditions);

    const salesFilter = companyId !== null
      ? and(eq(invoices.companyId, companyId), eq(invoices.type, "sale"), eq(invoices.status, "approved"))
      : and(eq(invoices.type, "sale"), eq(invoices.status, "approved"));
    const purchasesFilter = companyId !== null
      ? and(eq(invoices.companyId, companyId), eq(invoices.type, "purchase"), eq(invoices.status, "approved"))
      : and(eq(invoices.type, "purchase"), eq(invoices.status, "approved"));

    const [salesResult] = await db.select({ total: sql<string>`coalesce(sum(total::numeric), 0)` }).from(invoices).where(salesFilter);
    const [purchasesResult] = await db.select({ total: sql<string>`coalesce(sum(total::numeric), 0)` }).from(invoices).where(purchasesFilter);

    const totalSalesVal = parseFloat(salesResult?.total || "0");
    const totalPurchasesVal = parseFloat(purchasesResult?.total || "0");

    const monthlyQuery = sql`
      SELECT 
        to_char(date_trunc('month', invoice_date::date), 'YYYY-MM') as month,
        COALESCE(SUM(CASE WHEN type = 'sale' THEN total::numeric ELSE 0 END), 0) as sales,
        COALESCE(SUM(CASE WHEN type = 'purchase' THEN total::numeric ELSE 0 END), 0) as purchases
      FROM invoices
      WHERE status = 'approved'
        AND invoice_date::date >= (CURRENT_DATE - INTERVAL '6 months')
        ${companyId !== null ? sql`AND company_id = ${companyId}` : sql``}
      GROUP BY date_trunc('month', invoice_date::date)
      ORDER BY date_trunc('month', invoice_date::date) ASC
    `;
    const monthlyRows = await db.execute(monthlyQuery);

    const monthlySalesPurchases = (monthlyRows.rows || []).map((row: any) => ({
      month: row.month,
      sales: parseFloat(row.sales || "0"),
      purchases: parseFloat(row.purchases || "0"),
    }));

    const accountTypeQuery = sql`
      SELECT type, COALESCE(SUM(ABS(balance::numeric)), 0) as total
      FROM accounts
      WHERE type IS NOT NULL
        ${companyId !== null ? sql`AND company_id = ${companyId}` : sql``}
      GROUP BY type
      ORDER BY type
    `;
    const accountTypeRows = await db.execute(accountTypeQuery);

    const accountTypeDistribution = (accountTypeRows.rows || []).map((row: any) => ({
      type: row.type,
      total: parseFloat(row.total || "0"),
    }));

    return {
      totalAccounts: Number(accountCount.count),
      totalCustomers: Number(customerCount.count),
      totalSuppliers: Number(supplierCount.count),
      totalJournalEntries: Number(entryCount.count),
      totalAssets: assetResult[0]?.total || "0",
      totalLiabilities: liabilityResult[0]?.total || "0",
      totalRevenue: revenueResult[0]?.total || "0",
      totalExpenses: expenseResult[0]?.total || "0",
      totalSales: totalSalesVal.toFixed(2),
      totalPurchases: totalPurchasesVal.toFixed(2),
      grossProfit: (totalSalesVal - totalPurchasesVal).toFixed(2),
      totalProducts: Number(productCount.count),
      totalInvoices: Number(invoiceCount.count),
      monthlySalesPurchases,
      accountTypeDistribution,
    };
  }

  // ============ COMPANIES ============
  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async createCompany(data: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values(data).returning();
    return company;
  }

  async updateCompany(id: number, data: Partial<InsertCompany>): Promise<Company> {
    const [company] = await db.update(companies).set(data).where(eq(companies.id, id)).returning();
    return company;
  }

  // ============ BRANCHES ============
  async getBranches(companyId: number): Promise<Branch[]> {
    return await db.select().from(branches).where(eq(branches.companyId, companyId)).orderBy(asc(branches.name));
  }

  async createBranch(data: InsertBranch): Promise<Branch> {
    const [branch] = await db.insert(branches).values(data).returning();
    return branch;
  }

  async updateBranch(id: number, data: Partial<InsertBranch>, companyId: number): Promise<Branch> {
    const [branch] = await db.update(branches).set(data)
      .where(and(eq(branches.id, id), eq(branches.companyId, companyId))).returning();
    return branch;
  }

  async deleteBranch(id: number, companyId: number): Promise<void> {
    await db.delete(branches).where(and(eq(branches.id, id), eq(branches.companyId, companyId)));
  }

  // ============ USERS ============
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserById(id: number): Promise<UserWithPermissions | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return undefined;

    const userPerms = await db.select().from(permissions).where(eq(permissions.userId, user.id));

    let company = null;
    if (user.companyId) {
      const [c] = await db.select().from(companies).where(eq(companies.id, user.companyId));
      company = c || null;
    }

    return { ...user, permissions: userPerms, company, branch: null } as UserWithPermissions;
  }

  async getCompanyUsers(companyId: number): Promise<SafeUser[]> {
    const companyUsers = await db.select().from(users).where(eq(users.companyId, companyId));
    const result: SafeUser[] = [];
    for (const user of companyUsers) {
      const userPerms = await db.select().from(permissions).where(eq(permissions.userId, user.id));
      const { password, ...safeUser } = user;
      result.push({ ...safeUser, permissions: userPerms, company: null, branch: null } as SafeUser);
    }
    return result;
  }

  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: number, companyId: number): Promise<void> {
    await db.delete(permissions).where(eq(permissions.userId, id));
    await db.delete(users).where(and(eq(users.id, id), eq(users.companyId, companyId)));
  }

  // ============ PERMISSIONS ============
  async getUserPermissions(userId: number): Promise<Permission[]> {
    return await db.select().from(permissions).where(eq(permissions.userId, userId));
  }

  async setUserPermissions(userId: number, perms: Omit<InsertPermission, "userId">[]): Promise<Permission[]> {
    await db.delete(permissions).where(eq(permissions.userId, userId));
    if (perms.length === 0) return [];
    const toInsert = perms.map(p => ({ ...p, userId }));
    return await db.insert(permissions).values(toInsert).returning();
  }

  // ============ WALLET ============
  async getWalletBalance(companyId: number): Promise<string> {
    const [company] = await db.select({ walletBalance: companies.walletBalance })
      .from(companies).where(eq(companies.id, companyId));
    return company?.walletBalance || "0";
  }

  async getWalletTransactions(companyId: number): Promise<WalletTransaction[]> {
    return await db.select().from(walletTransactions)
      .where(eq(walletTransactions.companyId, companyId))
      .orderBy(desc(walletTransactions.createdAt));
  }

  async chargeWallet(companyId: number, amount: number, description: string): Promise<WalletTransaction> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const txDb = drizzle(client, { schema });

      const [company] = await txDb.select().from(companies).where(eq(companies.id, companyId));
      const balanceBefore = parseFloat(company.walletBalance);
      const balanceAfter = balanceBefore + amount;

      await txDb.update(companies).set({ walletBalance: balanceAfter.toFixed(2) })
        .where(eq(companies.id, companyId));

      const [tx] = await txDb.insert(walletTransactions).values({
        companyId,
        amount: amount.toFixed(2),
        type: "charge",
        description: description || "شحن محفظة",
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
      }).returning();

      await client.query("COMMIT");
      return tx;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async deductWallet(companyId: number, amount: number, description: string): Promise<WalletTransaction> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const txDb = drizzle(client, { schema });

      const [company] = await txDb.select().from(companies).where(eq(companies.id, companyId));
      const balanceBefore = parseFloat(company.walletBalance);
      const balanceAfter = balanceBefore - amount;

      await txDb.update(companies).set({ walletBalance: balanceAfter.toFixed(2) })
        .where(eq(companies.id, companyId));

      const [tx] = await txDb.insert(walletTransactions).values({
        companyId,
        amount: amount.toFixed(2),
        type: "deduction",
        description,
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
      }).returning();

      await client.query("COMMIT");
      return tx;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // ============ AUDIT LOG ============
  async getAuditLogs(companyId: number | null): Promise<AuditLog[]> {
    if (companyId !== null) {
      return await db.select().from(auditLogs)
        .where(eq(auditLogs.companyId, companyId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(500);
    }
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(500);
  }

  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(data).returning();
    return log;
  }

  // ============ SYSTEM SETTINGS ============
  async getSystemSettings(): Promise<SystemSettings> {
    const [settings] = await db.select().from(systemSettings);
    if (!settings) {
      const [created] = await db.insert(systemSettings).values({}).returning();
      return created;
    }
    return settings;
  }

  async updateSystemSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
    const current = await this.getSystemSettings();
    const [updated] = await db.update(systemSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(systemSettings.id, current.id)).returning();
    return updated;
  }

  // ============ UNITS ============
  async getUnits(companyId: number): Promise<Unit[]> {
    return await db.select().from(units).where(eq(units.companyId, companyId)).orderBy(asc(units.name));
  }

  async createUnit(data: InsertUnit): Promise<Unit> {
    const [unit] = await db.insert(units).values(data).returning();
    return unit;
  }

  async updateUnit(id: number, data: Partial<InsertUnit>, companyId: number): Promise<Unit> {
    const [unit] = await db.update(units).set(data)
      .where(and(eq(units.id, id), eq(units.companyId, companyId))).returning();
    return unit;
  }

  async deleteUnit(id: number, companyId: number): Promise<void> {
    await db.delete(units).where(and(eq(units.id, id), eq(units.companyId, companyId)));
  }

  // ============ PRODUCTS ============
  async getProducts(companyId: number): Promise<ProductWithUnits[]> {
    const result = await db.query.products.findMany({
      where: eq(products.companyId, companyId),
      with: {
        primaryUnit: true,
        secondaryUnit: true,
      },
      orderBy: [asc(products.code)],
    });
    return result as ProductWithUnits[];
  }

  async getProduct(id: number, companyId: number): Promise<ProductWithUnits | undefined> {
    const result = await db.query.products.findFirst({
      where: and(eq(products.id, id), eq(products.companyId, companyId)),
      with: {
        primaryUnit: true,
        secondaryUnit: true,
        components: {
          with: {
            componentProduct: true,
          },
        },
      },
    });
    return result as ProductWithUnits | undefined;
  }

  async createProduct(data: InsertProduct): Promise<Product> {
    const barcode = data.barcode || `EAN${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const [product] = await db.insert(products).values({ ...data, barcode }).returning();
    return product;
  }

  async updateProduct(id: number, data: Partial<InsertProduct>, companyId: number): Promise<Product> {
    const [product] = await db.update(products).set(data)
      .where(and(eq(products.id, id), eq(products.companyId, companyId))).returning();
    return product;
  }

  async deleteProduct(id: number, companyId: number): Promise<void> {
    await db.delete(productComponents).where(eq(productComponents.productId, id));
    await db.delete(products).where(and(eq(products.id, id), eq(products.companyId, companyId)));
  }

  async getProductComponents(productId: number): Promise<(ProductComponent & { componentProduct?: Product })[]> {
    const result = await db.query.productComponents.findMany({
      where: eq(productComponents.productId, productId),
      with: {
        componentProduct: true,
      },
    });
    return result as (ProductComponent & { componentProduct?: Product })[];
  }

  async setProductComponents(productId: number, comps: Omit<InsertProductComponent, "productId">[]): Promise<ProductComponent[]> {
    await db.delete(productComponents).where(eq(productComponents.productId, productId));
    if (comps.length === 0) return [];
    const toInsert = comps.map(c => ({ ...c, productId }));
    return await db.insert(productComponents).values(toInsert).returning();
  }

  // ============ WAREHOUSES ============
  async getWarehouses(companyId: number): Promise<Warehouse[]> {
    return await db.select().from(warehouses).where(eq(warehouses.companyId, companyId)).orderBy(asc(warehouses.name));
  }

  async getWarehouse(id: number, companyId: number): Promise<Warehouse | undefined> {
    const [wh] = await db.select().from(warehouses).where(and(eq(warehouses.id, id), eq(warehouses.companyId, companyId)));
    return wh;
  }

  async createWarehouse(data: InsertWarehouse): Promise<Warehouse> {
    const [warehouse] = await db.insert(warehouses).values(data).returning();
    return warehouse;
  }

  async updateWarehouse(id: number, data: Partial<InsertWarehouse>, companyId: number): Promise<Warehouse> {
    const [warehouse] = await db.update(warehouses).set(data)
      .where(and(eq(warehouses.id, id), eq(warehouses.companyId, companyId))).returning();
    return warehouse;
  }

  async deleteWarehouse(id: number, companyId: number): Promise<void> {
    await db.delete(warehouseStock).where(eq(warehouseStock.warehouseId, id));
    await db.delete(warehouses).where(and(eq(warehouses.id, id), eq(warehouses.companyId, companyId)));
  }

  async getWarehouseStock(warehouseId: number, companyId: number): Promise<WarehouseStockWithProduct[]> {
    const wh = await db.select().from(warehouses)
      .where(and(eq(warehouses.id, warehouseId), eq(warehouses.companyId, companyId)));
    if (wh.length === 0) return [];

    const result = await db.query.warehouseStock.findMany({
      where: eq(warehouseStock.warehouseId, warehouseId),
      with: {
        product: {
          with: {
            primaryUnit: true,
          },
        },
        warehouse: true,
      },
    });
    return result as WarehouseStockWithProduct[];
  }

  // ============ INVOICES ============
  async getInvoices(companyId: number, type?: string): Promise<InvoiceWithLines[]> {
    const conditions = [eq(invoices.companyId, companyId)];
    if (type) conditions.push(eq(invoices.type, type));

    const result = await db.query.invoices.findMany({
      where: and(...conditions),
      with: {
        lines: {
          with: {
            product: true,
            unit: true,
            warehouse: true,
          },
        },
        customer: true,
        supplier: true,
      },
      orderBy: [desc(invoices.createdAt)],
    });
    return result as InvoiceWithLines[];
  }

  async getInvoice(id: number, companyId: number): Promise<InvoiceWithLines | undefined> {
    const result = await db.query.invoices.findFirst({
      where: and(eq(invoices.id, id), eq(invoices.companyId, companyId)),
      with: {
        lines: {
          with: {
            product: true,
            unit: true,
            warehouse: true,
          },
        },
        customer: true,
        supplier: true,
      },
    });
    return result as InvoiceWithLines | undefined;
  }

  async createInvoice(data: CreateInvoiceRequest): Promise<InvoiceWithLines> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const txDb = drizzle(client, { schema });

      const [inv] = await txDb.insert(invoices).values(data.invoice).returning();

      const linesWithId = data.lines.map(line => ({
        ...line,
        invoiceId: inv.id,
      }));
      await txDb.insert(invoiceLines).values(linesWithId);
      await client.query("COMMIT");

      return (await this.getInvoice(inv.id, data.invoice.companyId))!;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async approveInvoice(id: number, companyId: number): Promise<InvoiceWithLines> {
    const invoice = await this.getInvoice(id, companyId);
    if (!invoice) throw new Error("الفاتورة غير موجودة");
    if (invoice.status === "approved") throw new Error("الفاتورة معتمدة بالفعل");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const txDb = drizzle(client, { schema });

      await txDb.update(invoices).set({ status: "approved" }).where(eq(invoices.id, id));

      for (const line of invoice.lines) {
        if (line.lineType === "service" || !line.productId) continue;
        const effectiveQty = parseFloat(line.effectiveQuantity);
        let stockChange: number;
        if (invoice.type === "sale") {
          stockChange = -effectiveQty;
        } else if (invoice.type === "purchase") {
          stockChange = effectiveQty;
        } else if (invoice.type === "sale_return") {
          stockChange = effectiveQty;
        } else if (invoice.type === "purchase_return") {
          stockChange = -effectiveQty;
        } else {
          stockChange = 0;
        }

        await txDb.update(products).set({
          currentStock: sql`${products.currentStock} + ${stockChange}`,
        }).where(eq(products.id, line.productId));

        if (line.warehouseId) {
          const existing = await txDb.select().from(warehouseStock)
            .where(and(eq(warehouseStock.warehouseId, line.warehouseId), eq(warehouseStock.productId, line.productId)));

          if (existing.length > 0) {
            await txDb.update(warehouseStock).set({
              quantity: sql`${warehouseStock.quantity} + ${stockChange}`,
            }).where(and(eq(warehouseStock.warehouseId, line.warehouseId), eq(warehouseStock.productId, line.productId)));
          } else {
            await txDb.insert(warehouseStock).values({
              warehouseId: line.warehouseId,
              productId: line.productId,
              quantity: stockChange.toString(),
            });
          }
        }
      }

      const invoiceTotal = parseFloat(invoice.total);
      const serviceFeeVal = parseFloat(invoice.serviceFee || "0");

      const accts = await db.select().from(accounts).where(eq(accounts.companyId, companyId));
      let debitAccountId: number | null = null;
      let creditAccountId: number | null = null;

      if (invoice.type === "sale") {
        debitAccountId = accts.find(a => a.code === "1200")?.id || accts.find(a => a.type === "أصول")?.id || null;
        creditAccountId = accts.find(a => a.code === "4100")?.id || accts.find(a => a.type === "إيرادات")?.id || null;
      } else if (invoice.type === "purchase") {
        debitAccountId = accts.find(a => a.code === "1300")?.id || accts.find(a => a.type === "أصول")?.id || null;
        creditAccountId = accts.find(a => a.code === "2100")?.id || accts.find(a => a.type === "خصوم")?.id || null;
      } else if (invoice.type === "sale_return") {
        debitAccountId = accts.find(a => a.code === "4100")?.id || accts.find(a => a.type === "إيرادات")?.id || null;
        creditAccountId = accts.find(a => a.code === "1200")?.id || accts.find(a => a.type === "أصول")?.id || null;
      } else if (invoice.type === "purchase_return") {
        debitAccountId = accts.find(a => a.code === "2100")?.id || accts.find(a => a.type === "خصوم")?.id || null;
        creditAccountId = accts.find(a => a.code === "1300")?.id || accts.find(a => a.type === "أصول")?.id || null;
      }

      if (debitAccountId && creditAccountId) {
        const totalDebit = invoiceTotal.toFixed(2);
        const totalCredit = invoiceTotal.toFixed(2);
        const [entry] = await txDb.insert(journalEntries).values({
          companyId,
          branchId: invoice.branchId,
          createdBy: invoice.createdBy,
          entryNumber: `INV-${invoice.invoiceNumber}`,
          entryDate: invoice.invoiceDate,
          description: `قيد فاتورة ${invoice.type === "sale" ? "مبيعات" : invoice.type === "purchase" ? "مشتريات" : invoice.type === "sale_return" ? "مرتجع مبيعات" : "مرتجع مشتريات"} رقم ${invoice.invoiceNumber}`,
          reference: invoice.invoiceNumber,
          status: "approved",
          totalDebit,
          totalCredit,
        }).returning();

        await txDb.insert(journalEntryLines).values([
          { journalEntryId: entry.id, accountId: debitAccountId, debit: totalDebit, credit: "0", description: `فاتورة ${invoice.invoiceNumber}` },
          { journalEntryId: entry.id, accountId: creditAccountId, debit: "0", credit: totalCredit, description: `فاتورة ${invoice.invoiceNumber}` },
        ]);

        await txDb.update(accounts).set({
          balance: sql`${accounts.balance} + ${invoiceTotal}`,
        }).where(eq(accounts.id, debitAccountId));
        await txDb.update(accounts).set({
          balance: sql`${accounts.balance} - ${invoiceTotal}`,
        }).where(eq(accounts.id, creditAccountId));
      }

      await client.query("COMMIT");

      return (await this.getInvoice(id, companyId))!;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteInvoice(id: number, companyId: number): Promise<void> {
    const inv = await this.getInvoice(id, companyId);
    if (inv && inv.status === "approved") throw new Error("لا يمكن حذف فاتورة معتمدة");
    await db.delete(invoiceLines).where(eq(invoiceLines.invoiceId, id));
    await db.delete(invoices).where(and(eq(invoices.id, id), eq(invoices.companyId, companyId)));
  }

  // ============ STOCK ALERTS ============
  async getStockAlerts(companyId: number): Promise<StockAlert[]> {
    const result = await db
      .select({
        productId: products.id,
        productName: products.name,
        productCode: products.code,
        currentStock: products.currentStock,
        reorderLevel: products.reorderLevel,
        primaryUnitSymbol: units.symbol,
      })
      .from(products)
      .innerJoin(units, eq(products.primaryUnitId, units.id))
      .where(and(
        eq(products.companyId, companyId),
        eq(products.isActive, true),
        sql`${products.currentStock} <= ${products.reorderLevel}`,
      ))
      .orderBy(asc(products.currentStock));

    return result as StockAlert[];
  }

  async getNextCustomerCode(companyId: number): Promise<string> {
    const [result] = await db.select({ maxCode: sql<string>`max(code)` })
      .from(customers).where(eq(customers.companyId, companyId));
    const maxNum = result.maxCode ? parseInt(result.maxCode.replace(/\D/g, "") || "0") : 0;
    return `CUS-${String(maxNum + 1).padStart(4, "0")}`;
  }

  async getNextSupplierCode(companyId: number): Promise<string> {
    const [result] = await db.select({ maxCode: sql<string>`max(code)` })
      .from(suppliers).where(eq(suppliers.companyId, companyId));
    const maxNum = result.maxCode ? parseInt(result.maxCode.replace(/\D/g, "") || "0") : 0;
    return `SUP-${String(maxNum + 1).padStart(4, "0")}`;
  }

  async getNextInvoiceNumber(companyId: number, type: string): Promise<string> {
    const prefixMap: Record<string, string> = { sale: "INV", purchase: "PUR", sale_return: "SRT", purchase_return: "PRT" };
    const prefix = prefixMap[type] || "INV";
    const [result] = await db.select({ maxNum: sql<string>`max(invoice_number)` })
      .from(invoices).where(and(eq(invoices.companyId, companyId), eq(invoices.type, type)));
    const maxNum = result.maxNum ? parseInt(result.maxNum.replace(/\D/g, "") || "0") : 0;
    return `${prefix}-${String(maxNum + 1).padStart(4, "0")}`;
  }

  async getNextProductCode(companyId: number): Promise<string> {
    const [result] = await db.select({ maxCode: sql<string>`max(code)` })
      .from(products).where(eq(products.companyId, companyId));
    const maxNum = result.maxCode ? parseInt(result.maxCode.replace(/\D/g, "") || "0") : 0;
    return `PRD-${String(maxNum + 1).padStart(4, "0")}`;
  }

  async manufactureProduct(productId: number, quantity: number, warehouseId: number, companyId: number): Promise<void> {
    const product = await this.getProduct(productId, companyId);
    if (!product) throw new Error("المنتج غير موجود");
    if (!product.isComposite) throw new Error("المنتج ليس مركب");
    const [wh] = await db.select().from(warehouses).where(and(eq(warehouses.id, warehouseId), eq(warehouses.companyId, companyId)));
    if (!wh) throw new Error("المخزن غير موجود أو لا ينتمي لشركتك");
    const comps = await this.getProductComponents(productId);
    if (comps.length === 0) throw new Error("لا توجد مكونات محددة للمنتج");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const txDb = drizzle(client, { schema });

      for (const comp of comps) {
        const requiredQty = parseFloat(comp.quantity) * quantity;
        const [compProduct] = await txDb.select().from(products).where(eq(products.id, comp.componentProductId));
        if (!compProduct) throw new Error(`المكون ${comp.componentProductId} غير موجود`);
        if (parseFloat(compProduct.currentStock) < requiredQty) {
          throw new Error(`المخزون غير كافي للمكون: ${compProduct.name} (مطلوب ${requiredQty}، متاح ${compProduct.currentStock})`);
        }

        await txDb.update(products).set({
          currentStock: sql`${products.currentStock} - ${requiredQty}`,
        }).where(eq(products.id, comp.componentProductId));

        const existing = await txDb.select().from(warehouseStock)
          .where(and(eq(warehouseStock.warehouseId, warehouseId), eq(warehouseStock.productId, comp.componentProductId)));
        if (existing.length > 0) {
          await txDb.update(warehouseStock).set({
            quantity: sql`${warehouseStock.quantity} - ${requiredQty}`,
          }).where(and(eq(warehouseStock.warehouseId, warehouseId), eq(warehouseStock.productId, comp.componentProductId)));
        }
      }

      await txDb.update(products).set({
        currentStock: sql`${products.currentStock} + ${quantity}`,
      }).where(eq(products.id, productId));

      const existingComposite = await txDb.select().from(warehouseStock)
        .where(and(eq(warehouseStock.warehouseId, warehouseId), eq(warehouseStock.productId, productId)));
      if (existingComposite.length > 0) {
        await txDb.update(warehouseStock).set({
          quantity: sql`${warehouseStock.quantity} + ${quantity}`,
        }).where(and(eq(warehouseStock.warehouseId, warehouseId), eq(warehouseStock.productId, productId)));
      } else {
        await txDb.insert(warehouseStock).values({
          warehouseId, productId, quantity: quantity.toString(),
        });
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  // ============ STOCK TRANSFERS ============
  async getStockTransfers(companyId: number): Promise<StockTransferWithLines[]> {
    const result = await db.query.stockTransfers.findMany({
      where: eq(stockTransfers.companyId, companyId),
      with: {
        lines: {
          with: {
            product: true,
          },
        },
        fromWarehouse: true,
        toWarehouse: true,
      },
      orderBy: [desc(stockTransfers.createdAt)],
    });
    return result as StockTransferWithLines[];
  }

  async getStockTransfer(id: number, companyId: number): Promise<StockTransferWithLines | undefined> {
    const result = await db.query.stockTransfers.findFirst({
      where: and(eq(stockTransfers.id, id), eq(stockTransfers.companyId, companyId)),
      with: {
        lines: {
          with: {
            product: true,
          },
        },
        fromWarehouse: true,
        toWarehouse: true,
      },
    });
    return result as StockTransferWithLines | undefined;
  }

  async createStockTransfer(data: CreateStockTransferRequest): Promise<StockTransferWithLines> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const txDb = drizzle(client, { schema });

      const [transfer] = await txDb.insert(stockTransfers).values(data.transfer).returning();

      const linesWithTransferId = data.lines.map(line => ({
        ...line,
        transferId: transfer.id,
      }));

      if (linesWithTransferId.length > 0) {
        await txDb.insert(stockTransferLines).values(linesWithTransferId);
      }

      await client.query("COMMIT");
      return (await this.getStockTransfer(transfer.id, data.transfer.companyId))!;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async approveStockTransfer(id: number, companyId: number): Promise<StockTransferWithLines> {
    const transfer = await this.getStockTransfer(id, companyId);
    if (!transfer) throw new Error("التحويل غير موجود");
    if (transfer.status === "approved") throw new Error("التحويل معتمد بالفعل");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const txDb = drizzle(client, { schema });

      await txDb.update(stockTransfers).set({ status: "approved" }).where(eq(stockTransfers.id, id));

      for (const line of transfer.lines) {
        const qty = parseFloat(line.quantity);

        const fromStock = await txDb.select().from(warehouseStock)
          .where(and(eq(warehouseStock.warehouseId, transfer.fromWarehouseId), eq(warehouseStock.productId, line.productId)));

        if (fromStock.length === 0 || parseFloat(fromStock[0].quantity) < qty) {
          throw new Error(`المخزون غير كافي في المخزن المصدر للمنتج: ${line.product?.name || line.productId}`);
        }

        await txDb.update(warehouseStock).set({
          quantity: sql`${warehouseStock.quantity} - ${qty}`,
        }).where(and(eq(warehouseStock.warehouseId, transfer.fromWarehouseId), eq(warehouseStock.productId, line.productId)));

        const toStock = await txDb.select().from(warehouseStock)
          .where(and(eq(warehouseStock.warehouseId, transfer.toWarehouseId), eq(warehouseStock.productId, line.productId)));

        if (toStock.length > 0) {
          await txDb.update(warehouseStock).set({
            quantity: sql`${warehouseStock.quantity} + ${qty}`,
          }).where(and(eq(warehouseStock.warehouseId, transfer.toWarehouseId), eq(warehouseStock.productId, line.productId)));
        } else {
          await txDb.insert(warehouseStock).values({
            warehouseId: transfer.toWarehouseId,
            productId: line.productId,
            quantity: qty.toString(),
          });
        }
      }

      await client.query("COMMIT");
      return (await this.getStockTransfer(id, companyId))!;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteStockTransfer(id: number, companyId: number): Promise<void> {
    const transfer = await this.getStockTransfer(id, companyId);
    if (!transfer) throw new Error("التحويل غير موجود");
    if (transfer.status === "approved") throw new Error("لا يمكن حذف تحويل معتمد");
    await db.delete(stockTransferLines).where(eq(stockTransferLines.transferId, id));
    await db.delete(stockTransfers).where(and(eq(stockTransfers.id, id), eq(stockTransfers.companyId, companyId)));
  }

  async getProfitLossReport(companyId: number, startDate: string, endDate: string): Promise<any> {
    const salesFilter = and(
      eq(invoices.companyId, companyId),
      eq(invoices.type, "sale"),
      eq(invoices.status, "approved"),
      sql`${invoices.invoiceDate} >= ${startDate}`,
      sql`${invoices.invoiceDate} <= ${endDate}`
    );
    const purchasesFilter = and(
      eq(invoices.companyId, companyId),
      eq(invoices.type, "purchase"),
      eq(invoices.status, "approved"),
      sql`${invoices.invoiceDate} >= ${startDate}`,
      sql`${invoices.invoiceDate} <= ${endDate}`
    );
    const saleReturnsFilter = and(
      eq(invoices.companyId, companyId),
      eq(invoices.type, "sale_return"),
      eq(invoices.status, "approved"),
      sql`${invoices.invoiceDate} >= ${startDate}`,
      sql`${invoices.invoiceDate} <= ${endDate}`
    );
    const purchaseReturnsFilter = and(
      eq(invoices.companyId, companyId),
      eq(invoices.type, "purchase_return"),
      eq(invoices.status, "approved"),
      sql`${invoices.invoiceDate} >= ${startDate}`,
      sql`${invoices.invoiceDate} <= ${endDate}`
    );

    const [salesResult] = await db.select({ total: sql<string>`coalesce(sum(total::numeric), 0)` }).from(invoices).where(salesFilter);
    const [purchasesResult] = await db.select({ total: sql<string>`coalesce(sum(total::numeric), 0)` }).from(invoices).where(purchasesFilter);
    const [saleReturnsResult] = await db.select({ total: sql<string>`coalesce(sum(total::numeric), 0)` }).from(invoices).where(saleReturnsFilter);
    const [purchaseReturnsResult] = await db.select({ total: sql<string>`coalesce(sum(total::numeric), 0)` }).from(invoices).where(purchaseReturnsFilter);

    const expenseConditions = and(
      eq(accounts.companyId, companyId),
      eq(accounts.type, "مصروفات")
    );
    const expenseEntryConditions = and(
      eq(journalEntries.companyId, companyId),
      eq(journalEntries.status, "approved"),
      sql`${journalEntries.entryDate} >= ${startDate}`,
      sql`${journalEntries.entryDate} <= ${endDate}`
    );
    const [expensesResult] = await db.select({
      total: sql<string>`coalesce(sum(${journalEntryLines.debit}::numeric - ${journalEntryLines.credit}::numeric), 0)`
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .innerJoin(accounts, eq(journalEntryLines.accountId, accounts.id))
    .where(and(expenseConditions, expenseEntryConditions));

    const totalSales = parseFloat(salesResult?.total || "0");
    const totalPurchases = parseFloat(purchasesResult?.total || "0");
    const totalSalesReturns = parseFloat(saleReturnsResult?.total || "0");
    const totalPurchasesReturns = parseFloat(purchaseReturnsResult?.total || "0");
    const totalExpenses = parseFloat(expensesResult?.total || "0");

    const netSales = totalSales - totalSalesReturns;
    const netPurchases = totalPurchases - totalPurchasesReturns;
    const grossProfit = netSales - netPurchases;
    const netProfit = grossProfit - totalExpenses;

    return {
      totalSales: totalSales.toFixed(2),
      totalSalesReturns: totalSalesReturns.toFixed(2),
      netSales: netSales.toFixed(2),
      totalPurchases: totalPurchases.toFixed(2),
      totalPurchasesReturns: totalPurchasesReturns.toFixed(2),
      netPurchases: netPurchases.toFixed(2),
      grossProfit: grossProfit.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      netProfit: netProfit.toFixed(2),
      periodStart: startDate,
      periodEnd: endDate,
    };
  }

  async getUserCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(users);
    return Number(result.count);
  }

  async getAllCompanies(): Promise<Company[]> {
    return await db.select().from(companies).orderBy(asc(companies.name));
  }

  async getSystemDashboardStats(): Promise<any> {
    const [companyCount] = await db.select({ count: sql<number>`count(*)` }).from(companies);
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [invoiceCount] = await db.select({ count: sql<number>`count(*)` }).from(invoices);
    const [totalWallet] = await db.select({ total: sql<string>`coalesce(sum(wallet_balance::numeric), 0)` }).from(companies);

    const allCompanies = await db.select({
      id: companies.id,
      name: companies.name,
      slug: companies.slug,
      walletBalance: companies.walletBalance,
      customServiceFeeRate: companies.customServiceFeeRate,
      isActive: companies.isActive,
    }).from(companies).orderBy(asc(companies.name));

    const companyUserCounts = await db.select({
      companyId: users.companyId,
      count: sql<number>`count(*)`,
    }).from(users).where(sql`${users.companyId} is not null`).groupBy(users.companyId);

    const companiesWithDetails = allCompanies.map(c => ({
      ...c,
      userCount: companyUserCounts.find(u => u.companyId === c.id)?.count || 0,
    }));

    return {
      totalCompanies: Number(companyCount.count),
      totalUsers: Number(userCount.count),
      totalInvoices: Number(invoiceCount.count),
      totalWalletBalance: totalWallet?.total || "0",
      companies: companiesWithDetails,
    };
  }

  async updateCompanyFeeRate(companyId: number, customRate: string | null): Promise<Company> {
    const [updated] = await db.update(companies)
      .set({ customServiceFeeRate: customRate })
      .where(eq(companies.id, companyId))
      .returning();
    if (!updated) throw new Error("الشركة غير موجودة");
    return updated;
  }

  async getPlatformEarnings(from?: string, to?: string, companyId?: number): Promise<any> {
    const conditions: any[] = [eq(walletTransactions.type, "deduction")];
    if (from) conditions.push(sql`${walletTransactions.createdAt} >= ${from}::timestamp`);
    if (to) conditions.push(sql`${walletTransactions.createdAt} <= (${to}::timestamp + interval '1 day')`);
    if (companyId) conditions.push(eq(walletTransactions.companyId, companyId));

    const totalResult = await db.select({
      totalEarnings: sql<string>`coalesce(sum(${walletTransactions.amount}::numeric), 0)`,
      transactionCount: sql<number>`count(*)`,
    }).from(walletTransactions).where(and(...conditions));

    const perCompanyResult = await db.select({
      companyId: walletTransactions.companyId,
      companyName: companies.name,
      totalFees: sql<string>`coalesce(sum(${walletTransactions.amount}::numeric), 0)`,
      transactionCount: sql<number>`count(*)`,
      customServiceFeeRate: companies.customServiceFeeRate,
    })
      .from(walletTransactions)
      .innerJoin(companies, eq(walletTransactions.companyId, companies.id))
      .where(and(...conditions))
      .groupBy(walletTransactions.companyId, companies.name, companies.customServiceFeeRate)
      .orderBy(sql`sum(${walletTransactions.amount}::numeric) desc`);

    const recentTransactions = await db.select({
      id: walletTransactions.id,
      companyId: walletTransactions.companyId,
      companyName: companies.name,
      amount: walletTransactions.amount,
      description: walletTransactions.description,
      createdAt: walletTransactions.createdAt,
    })
      .from(walletTransactions)
      .innerJoin(companies, eq(walletTransactions.companyId, companies.id))
      .where(and(...conditions))
      .orderBy(sql`${walletTransactions.createdAt} desc`)
      .limit(50);

    return {
      totalEarnings: totalResult[0]?.totalEarnings || "0",
      transactionCount: Number(totalResult[0]?.transactionCount || 0),
      perCompany: perCompanyResult.map(r => ({
        companyId: r.companyId,
        companyName: r.companyName,
        totalFees: r.totalFees,
        transactionCount: Number(r.transactionCount),
        customServiceFeeRate: r.customServiceFeeRate,
      })),
      recentTransactions,
    };
  }

  async createSupportTicket(data: InsertSupportTicket): Promise<SupportTicket> {
    const [ticket] = await db.insert(supportTickets).values(data).returning();
    return ticket;
  }

  async getSupportTickets(companyId?: number | null): Promise<SupportTicket[]> {
    if (companyId) {
      return await db.select().from(supportTickets)
        .where(eq(supportTickets.companyId, companyId))
        .orderBy(desc(supportTickets.createdAt));
    }
    return await db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
  }

  async getSupportTicket(id: number): Promise<SupportTicket | undefined> {
    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
    return ticket;
  }

  async replySupportTicket(id: number, reply: string): Promise<SupportTicket> {
    const [updated] = await db.update(supportTickets)
      .set({ adminReply: reply, repliedAt: new Date(), status: "replied" })
      .where(eq(supportTickets.id, id))
      .returning();
    return updated;
  }

  async updateSupportTicketStatus(id: number, status: string): Promise<SupportTicket> {
    const [updated] = await db.update(supportTickets)
      .set({ status })
      .where(eq(supportTickets.id, id))
      .returning();
    return updated;
  }
  async createLoginLog(data: InsertLoginLog): Promise<LoginLog> {
    const [log] = await db.insert(loginLogs).values(data).returning();
    return log;
  }

  async getLoginLogs(companyId: number | null): Promise<LoginLog[]> {
    if (companyId !== null) {
      return await db.select().from(loginLogs)
        .where(eq(loginLogs.companyId, companyId))
        .orderBy(desc(loginLogs.createdAt))
        .limit(500);
    }
    return await db.select().from(loginLogs)
      .orderBy(desc(loginLogs.createdAt))
      .limit(500);
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(data).returning();
    return notification;
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }

  async markNotificationAsRead(id: number, userId: number): Promise<Notification> {
    const [notification] = await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();
    return notification;
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  async globalSearch(companyId: number, query: string) {
    const pattern = `%${query}%`;

    const customerResults = await db.select({
      id: customers.id,
      name: customers.name,
      code: customers.code,
      phone: customers.phone,
    }).from(customers).where(
      and(
        eq(customers.companyId, companyId),
        or(
          ilike(customers.name, pattern),
          ilike(customers.code, pattern),
          ilike(customers.phone, pattern),
        ),
      )
    ).limit(10);

    const supplierResults = await db.select({
      id: suppliers.id,
      name: suppliers.name,
      code: suppliers.code,
      phone: suppliers.phone,
    }).from(suppliers).where(
      and(
        eq(suppliers.companyId, companyId),
        or(
          ilike(suppliers.name, pattern),
          ilike(suppliers.code, pattern),
          ilike(suppliers.phone, pattern),
        ),
      )
    ).limit(10);

    const productResults = await db.select({
      id: products.id,
      name: products.name,
      code: products.code,
      barcode: products.barcode,
    }).from(products).where(
      and(
        eq(products.companyId, companyId),
        or(
          ilike(products.name, pattern),
          ilike(products.code, pattern),
          ilike(products.barcode, pattern),
        ),
      )
    ).limit(10);

    const invoiceResults = await db.select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      type: invoices.type,
      total: invoices.total,
    }).from(invoices).where(
      and(
        eq(invoices.companyId, companyId),
        or(
          ilike(invoices.invoiceNumber, pattern),
          ilike(invoices.reference, pattern),
        ),
      )
    ).limit(10);

    return {
      customers: customerResults,
      suppliers: supplierResults,
      products: productResults,
      invoices: invoiceResults,
    };
  }

  async getRevenues(companyId: number): Promise<Revenue[]> {
    return await db.select().from(revenues)
      .where(eq(revenues.companyId, companyId))
      .orderBy(desc(revenues.date), desc(revenues.id));
  }

  async createRevenue(data: InsertRevenue, companyId: number): Promise<Revenue> {
    const treasuryAccountId = data.treasuryAccountId;
    const revenueAccountId = data.accountId;

    if (!treasuryAccountId || !revenueAccountId) {
      throw new Error("يجب اختيار حساب الخزينة وحساب الإيراد");
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const txDb = drizzle(client, { schema });

      const [treasuryAcc] = await txDb.select().from(accounts).where(and(eq(accounts.id, treasuryAccountId), eq(accounts.companyId, companyId)));
      const [revenueAcc] = await txDb.select().from(accounts).where(and(eq(accounts.id, revenueAccountId), eq(accounts.companyId, companyId)));

      if (!treasuryAcc) throw new Error("حساب الخزينة غير موجود أو لا ينتمي لهذه الشركة");
      if (!revenueAcc) throw new Error("حساب الإيراد غير موجود أو لا ينتمي لهذه الشركة");

      const amount = parseFloat(data.amount as any);
      const maxEntry = await txDb.select({ max: sql<string>`COALESCE(MAX(CAST(SUBSTRING(entry_number FROM '[0-9]+$') AS INTEGER)), 0)` })
        .from(journalEntries).where(eq(journalEntries.companyId, companyId));
      const nextNum = (parseInt(maxEntry[0]?.max || "0") + 1).toString().padStart(4, "0");

      const [je] = await txDb.insert(journalEntries).values({
        companyId,
        entryNumber: `REV-${nextNum}`,
        entryDate: data.date,
        description: `إيراد: ${data.description}`,
        reference: `إيراد - ${data.category}`,
        status: "approved",
        totalDebit: amount.toFixed(2),
        totalCredit: amount.toFixed(2),
      }).returning();

      await txDb.insert(journalEntryLines).values([
        { journalEntryId: je.id, accountId: treasuryAccountId, debit: amount.toFixed(2), credit: "0", description: data.description },
        { journalEntryId: je.id, accountId: revenueAccountId, debit: "0", credit: amount.toFixed(2), description: data.description },
      ]);

      await txDb.update(accounts).set({ balance: sql`${accounts.balance} + ${amount}` }).where(eq(accounts.id, treasuryAccountId));
      await txDb.update(accounts).set({ balance: sql`${accounts.balance} - ${amount}` }).where(eq(accounts.id, revenueAccountId));

      const [revenue] = await txDb.insert(revenues).values({
        ...data,
        companyId,
        journalEntryId: je.id,
      }).returning();

      await client.query("COMMIT");
      return revenue;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteRevenue(id: number, companyId: number): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const txDb = drizzle(client, { schema });

      const [rev] = await txDb.select().from(revenues).where(and(eq(revenues.id, id), eq(revenues.companyId, companyId)));
      if (!rev) throw new Error("الإيراد غير موجود");

      if (rev.journalEntryId) {
        const lines = await txDb.select().from(journalEntryLines).where(eq(journalEntryLines.journalEntryId, rev.journalEntryId));
        for (const line of lines) {
          const debit = parseFloat(line.debit);
          const credit = parseFloat(line.credit);
          const netChange = debit - credit;
          await txDb.update(accounts).set({ balance: sql`${accounts.balance} - ${netChange}` }).where(eq(accounts.id, line.accountId));
        }
        await txDb.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, rev.journalEntryId));
        await txDb.delete(journalEntries).where(eq(journalEntries.id, rev.journalEntryId));
      }

      await txDb.delete(revenues).where(eq(revenues.id, id));
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async getExpenses(companyId: number): Promise<Expense[]> {
    return await db.select().from(expenses)
      .where(eq(expenses.companyId, companyId))
      .orderBy(desc(expenses.date), desc(expenses.id));
  }

  async createExpense(data: InsertExpense, companyId: number): Promise<Expense> {
    const treasuryAccountId = data.treasuryAccountId;
    const expenseAccountId = data.accountId;

    if (!treasuryAccountId || !expenseAccountId) {
      throw new Error("يجب اختيار حساب الخزينة وحساب المصروف");
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const txDb = drizzle(client, { schema });

      const [treasuryAcc] = await txDb.select().from(accounts).where(and(eq(accounts.id, treasuryAccountId), eq(accounts.companyId, companyId)));
      const [expenseAcc] = await txDb.select().from(accounts).where(and(eq(accounts.id, expenseAccountId), eq(accounts.companyId, companyId)));

      if (!treasuryAcc) throw new Error("حساب الخزينة غير موجود أو لا ينتمي لهذه الشركة");
      if (!expenseAcc) throw new Error("حساب المصروف غير موجود أو لا ينتمي لهذه الشركة");

      const amount = parseFloat(data.amount as any);
      const maxEntry = await txDb.select({ max: sql<string>`COALESCE(MAX(CAST(SUBSTRING(entry_number FROM '[0-9]+$') AS INTEGER)), 0)` })
        .from(journalEntries).where(eq(journalEntries.companyId, companyId));
      const nextNum = (parseInt(maxEntry[0]?.max || "0") + 1).toString().padStart(4, "0");

      const [je] = await txDb.insert(journalEntries).values({
        companyId,
        entryNumber: `EXP-${nextNum}`,
        entryDate: data.date,
        description: `مصروف: ${data.description}`,
        reference: `مصروف - ${data.category}`,
        status: "approved",
        totalDebit: amount.toFixed(2),
        totalCredit: amount.toFixed(2),
      }).returning();

      await txDb.insert(journalEntryLines).values([
        { journalEntryId: je.id, accountId: expenseAccountId, debit: amount.toFixed(2), credit: "0", description: data.description },
        { journalEntryId: je.id, accountId: treasuryAccountId, debit: "0", credit: amount.toFixed(2), description: data.description },
      ]);

      await txDb.update(accounts).set({ balance: sql`${accounts.balance} + ${amount}` }).where(eq(accounts.id, expenseAccountId));
      await txDb.update(accounts).set({ balance: sql`${accounts.balance} - ${amount}` }).where(eq(accounts.id, treasuryAccountId));

      const [expense] = await txDb.insert(expenses).values({
        ...data,
        companyId,
        journalEntryId: je.id,
      }).returning();

      await client.query("COMMIT");
      return expense;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteExpense(id: number, companyId: number): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const txDb = drizzle(client, { schema });

      const [exp] = await txDb.select().from(expenses).where(and(eq(expenses.id, id), eq(expenses.companyId, companyId)));
      if (!exp) throw new Error("المصروف غير موجود");

      if (exp.journalEntryId) {
        const lines = await txDb.select().from(journalEntryLines).where(eq(journalEntryLines.journalEntryId, exp.journalEntryId));
        for (const line of lines) {
          const debit = parseFloat(line.debit);
          const credit = parseFloat(line.credit);
          const netChange = debit - credit;
          await txDb.update(accounts).set({ balance: sql`${accounts.balance} - ${netChange}` }).where(eq(accounts.id, line.accountId));
        }
        await txDb.delete(journalEntryLines).where(eq(journalEntryLines.journalEntryId, exp.journalEntryId));
        await txDb.delete(journalEntries).where(eq(journalEntries.id, exp.journalEntryId));
      }

      await txDb.delete(expenses).where(eq(expenses.id, id));
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async getTreasuryData(companyId: number): Promise<{ balance: string; transactions: any[] }> {
    const treasuryAccounts = await db.select().from(accounts)
      .where(and(
        eq(accounts.companyId, companyId),
        eq(accounts.type, "أصول"),
        or(
          ilike(accounts.name, "%صندوق%"),
          ilike(accounts.name, "%خزينة%"),
          ilike(accounts.name, "%نقدية%"),
          eq(accounts.code, "1110"),
        ),
      ));

    let totalBalance = 0;
    const accountIds: number[] = [];

    for (const acc of treasuryAccounts) {
      totalBalance += parseFloat(acc.balance);
      accountIds.push(acc.id);
    }

    if (accountIds.length === 0) {
      return { balance: "0", transactions: [] };
    }

    const transactions = await db.select({
      id: journalEntryLines.id,
      date: journalEntries.entryDate,
      entryNumber: journalEntries.entryNumber,
      description: journalEntries.description,
      lineDescription: journalEntryLines.description,
      debit: journalEntryLines.debit,
      credit: journalEntryLines.credit,
      accountName: accounts.name,
    }).from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .innerJoin(accounts, eq(journalEntryLines.accountId, accounts.id))
      .where(and(
        sql`${journalEntryLines.accountId} IN (${sql.join(accountIds.map(id => sql`${id}`), sql`, `)})`,
        eq(journalEntries.companyId, companyId),
        eq(journalEntries.status, "approved"),
      ))
      .orderBy(desc(journalEntries.entryDate), desc(journalEntries.id));

    return { balance: totalBalance.toFixed(2), transactions };
  }

  async getTreasuryReport(companyId: number, startDate: string, endDate: string): Promise<any> {
    const treasuryAccounts = await db.select().from(accounts)
      .where(and(
        eq(accounts.companyId, companyId),
        eq(accounts.type, "أصول"),
        or(
          ilike(accounts.name, "%صندوق%"),
          ilike(accounts.name, "%خزينة%"),
          ilike(accounts.name, "%نقدية%"),
          eq(accounts.code, "1110"),
        ),
      ));

    const accountIds = treasuryAccounts.map(a => a.id);
    if (accountIds.length === 0) {
      return { balance: "0", totalIn: "0", totalOut: "0", transactions: [] };
    }

    const transactions = await db.select({
      id: journalEntryLines.id,
      date: journalEntries.entryDate,
      entryNumber: journalEntries.entryNumber,
      description: journalEntries.description,
      debit: journalEntryLines.debit,
      credit: journalEntryLines.credit,
      accountName: accounts.name,
    }).from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .innerJoin(accounts, eq(journalEntryLines.accountId, accounts.id))
      .where(and(
        sql`${journalEntryLines.accountId} IN (${sql.join(accountIds.map(id => sql`${id}`), sql`, `)})`,
        eq(journalEntries.companyId, companyId),
        eq(journalEntries.status, "approved"),
        sql`${journalEntries.entryDate} >= ${startDate}`,
        sql`${journalEntries.entryDate} <= ${endDate}`,
      ))
      .orderBy(desc(journalEntries.entryDate));

    let totalIn = 0, totalOut = 0;
    for (const t of transactions) {
      totalIn += parseFloat(t.debit);
      totalOut += parseFloat(t.credit);
    }

    let totalBalance = 0;
    for (const acc of treasuryAccounts) {
      totalBalance += parseFloat(acc.balance);
    }

    return { balance: totalBalance.toFixed(2), totalIn: totalIn.toFixed(2), totalOut: totalOut.toFixed(2), transactions };
  }

  async getRevenueReport(companyId: number, startDate: string, endDate: string): Promise<any> {
    const revenueList = await db.select().from(revenues)
      .where(and(
        eq(revenues.companyId, companyId),
        sql`${revenues.date} >= ${startDate}`,
        sql`${revenues.date} <= ${endDate}`,
      ))
      .orderBy(desc(revenues.date));

    let total = 0;
    const byCategory: Record<string, number> = {};
    for (const r of revenueList) {
      const amt = parseFloat(r.amount);
      total += amt;
      byCategory[r.category] = (byCategory[r.category] || 0) + amt;
    }

    const categories = Object.entries(byCategory).map(([name, amount]) => ({ name, amount: amount.toFixed(2) }));

    return { total: total.toFixed(2), count: revenueList.length, categories, items: revenueList };
  }

  async getExpenseReport(companyId: number, startDate: string, endDate: string): Promise<any> {
    const expenseList = await db.select().from(expenses)
      .where(and(
        eq(expenses.companyId, companyId),
        sql`${expenses.date} >= ${startDate}`,
        sql`${expenses.date} <= ${endDate}`,
      ))
      .orderBy(desc(expenses.date));

    let total = 0;
    const byCategory: Record<string, number> = {};
    for (const e of expenseList) {
      const amt = parseFloat(e.amount);
      total += amt;
      byCategory[e.category] = (byCategory[e.category] || 0) + amt;
    }

    const categories = Object.entries(byCategory).map(([name, amount]) => ({ name, amount: amount.toFixed(2) }));

    return { total: total.toFixed(2), count: expenseList.length, categories, items: expenseList };
  }

  async getPaymentsByInvoice(invoiceId: number, companyId: number): Promise<Payment[]> {
    return db.select().from(payments)
      .where(and(eq(payments.invoiceId, invoiceId), eq(payments.companyId, companyId)))
      .orderBy(desc(payments.createdAt));
  }

  async recordPayment(data: InsertPayment): Promise<Payment> {
    const invoice = await this.getInvoice(data.invoiceId, data.companyId);
    if (!invoice) throw new Error("الفاتورة غير موجودة");
    if (invoice.status !== "approved") throw new Error("لا يمكن تسجيل دفعة لفاتورة غير معتمدة");

    const currentPaid = parseFloat(invoice.paidAmount || "0");
    const invoiceTotal = parseFloat(invoice.total);
    const paymentAmount = parseFloat(data.amount);

    if (paymentAmount <= 0) throw new Error("مبلغ الدفعة يجب أن يكون أكبر من صفر");
    if (currentPaid + paymentAmount > invoiceTotal) throw new Error("مبلغ الدفعة يتجاوز المبلغ المتبقي");

    const [payment] = await db.insert(payments).values(data).returning();

    const newPaid = currentPaid + paymentAmount;
    const newPaymentType = newPaid >= invoiceTotal ? "paid" : "partial";
    await db.update(invoices).set({
      paidAmount: newPaid.toFixed(2),
      paymentType: newPaymentType,
    }).where(eq(invoices.id, data.invoiceId));

    return payment;
  }

  async getOutstandingInvoices(companyId: number, entityType: "customer" | "supplier"): Promise<InvoiceWithLines[]> {
    const types = entityType === "customer" ? ["sale"] : ["purchase"];
    const allInvoices = await db.query.invoices.findMany({
      where: and(
        eq(invoices.companyId, companyId),
        eq(invoices.status, "approved"),
        or(eq(invoices.paymentType, "deferred"), eq(invoices.paymentType, "partial")),
      ),
      with: {
        lines: { with: { product: true, unit: true, warehouse: true } },
        customer: true,
        supplier: true,
      },
      orderBy: [desc(invoices.createdAt)],
    });
    return allInvoices.filter(inv => types.includes(inv.type));
  }
}

export const storage = new DatabaseStorage();
