import { z } from "zod";
import {
  insertAccountSchema, insertCustomerSchema, insertSupplierSchema,
  insertJournalEntrySchema, insertJournalEntryLineSchema,
  insertCompanySchema, insertBranchSchema, insertPermissionSchema,
  insertUnitSchema, insertProductSchema, insertProductComponentSchema,
  insertWarehouseSchema, insertInvoiceSchema, insertInvoiceLineSchema,
  insertStockTransferSchema, insertStockTransferLineSchema,
} from "./schema";

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
};

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  companyName: z.string().min(1),
  companySlug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  fullName: z.string().min(1),
  username: z.string().min(3),
  password: z.string().min(6),
  email: z.string().email().optional(),
});

export const inviteUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  fullName: z.string().min(1),
  email: z.string().email().optional(),
  branchId: z.number().optional(),
  role: z.enum(["user", "company_owner"]).default("user"),
});

export const updatePermissionsSchema = z.object({
  permissions: z.array(insertPermissionSchema.omit({ userId: true })),
});

export const walletChargeSchema = z.object({
  amount: z.number().positive(),
  description: z.string().optional(),
});

export const api = {
  auth: {
    login: {
      method: "POST" as const,
      path: "/api/auth/login" as const,
      input: loginSchema,
    },
    logout: {
      method: "POST" as const,
      path: "/api/auth/logout" as const,
    },
    me: {
      method: "GET" as const,
      path: "/api/auth/me" as const,
    },
    register: {
      method: "POST" as const,
      path: "/api/auth/register" as const,
      input: registerSchema,
    },
  },

  companies: {
    get: {
      method: "GET" as const,
      path: "/api/companies/current" as const,
    },
    update: {
      method: "PUT" as const,
      path: "/api/companies/current" as const,
      input: insertCompanySchema.partial(),
    },
  },

  branches: {
    list: {
      method: "GET" as const,
      path: "/api/branches" as const,
    },
    create: {
      method: "POST" as const,
      path: "/api/branches" as const,
      input: insertBranchSchema.omit({ companyId: true }),
    },
    update: {
      method: "PUT" as const,
      path: "/api/branches/:id" as const,
      input: insertBranchSchema.omit({ companyId: true }).partial(),
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/branches/:id" as const,
    },
  },

  users: {
    list: {
      method: "GET" as const,
      path: "/api/users" as const,
    },
    invite: {
      method: "POST" as const,
      path: "/api/users/invite" as const,
      input: inviteUserSchema,
    },
    update: {
      method: "PUT" as const,
      path: "/api/users/:id" as const,
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/users/:id" as const,
    },
    permissions: {
      get: {
        method: "GET" as const,
        path: "/api/users/:id/permissions" as const,
      },
      update: {
        method: "PUT" as const,
        path: "/api/users/:id/permissions" as const,
        input: updatePermissionsSchema,
      },
    },
  },

  wallet: {
    balance: {
      method: "GET" as const,
      path: "/api/wallet/balance" as const,
    },
    transactions: {
      method: "GET" as const,
      path: "/api/wallet/transactions" as const,
    },
    charge: {
      method: "POST" as const,
      path: "/api/wallet/charge" as const,
      input: walletChargeSchema,
    },
  },

  auditLog: {
    list: {
      method: "GET" as const,
      path: "/api/audit-log" as const,
    },
  },

  systemSettings: {
    get: {
      method: "GET" as const,
      path: "/api/system-settings" as const,
    },
    update: {
      method: "PUT" as const,
      path: "/api/system-settings" as const,
    },
  },

  accounts: {
    list: {
      method: "GET" as const,
      path: "/api/accounts" as const,
      responses: { 200: z.array(z.any()) },
    },
    get: {
      method: "GET" as const,
      path: "/api/accounts/:id" as const,
      responses: { 200: z.any(), 404: errorSchemas.notFound },
    },
    create: {
      method: "POST" as const,
      path: "/api/accounts" as const,
      input: insertAccountSchema.omit({ companyId: true }),
      responses: { 201: z.any(), 400: errorSchemas.validation },
    },
    update: {
      method: "PUT" as const,
      path: "/api/accounts/:id" as const,
      input: insertAccountSchema.omit({ companyId: true }).partial(),
      responses: { 200: z.any(), 400: errorSchemas.validation, 404: errorSchemas.notFound },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/accounts/:id" as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound },
    },
  },
  customers: {
    list: {
      method: "GET" as const,
      path: "/api/customers" as const,
      responses: { 200: z.array(z.any()) },
    },
    get: {
      method: "GET" as const,
      path: "/api/customers/:id" as const,
      responses: { 200: z.any(), 404: errorSchemas.notFound },
    },
    create: {
      method: "POST" as const,
      path: "/api/customers" as const,
      input: insertCustomerSchema.omit({ companyId: true }),
      responses: { 201: z.any(), 400: errorSchemas.validation },
    },
    update: {
      method: "PUT" as const,
      path: "/api/customers/:id" as const,
      input: insertCustomerSchema.omit({ companyId: true }).partial(),
      responses: { 200: z.any(), 400: errorSchemas.validation, 404: errorSchemas.notFound },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/customers/:id" as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound },
    },
  },
  suppliers: {
    list: {
      method: "GET" as const,
      path: "/api/suppliers" as const,
      responses: { 200: z.array(z.any()) },
    },
    get: {
      method: "GET" as const,
      path: "/api/suppliers/:id" as const,
      responses: { 200: z.any(), 404: errorSchemas.notFound },
    },
    create: {
      method: "POST" as const,
      path: "/api/suppliers" as const,
      input: insertSupplierSchema.omit({ companyId: true }),
      responses: { 201: z.any(), 400: errorSchemas.validation },
    },
    update: {
      method: "PUT" as const,
      path: "/api/suppliers/:id" as const,
      input: insertSupplierSchema.omit({ companyId: true }).partial(),
      responses: { 200: z.any(), 400: errorSchemas.validation, 404: errorSchemas.notFound },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/suppliers/:id" as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound },
    },
  },
  journalEntries: {
    list: {
      method: "GET" as const,
      path: "/api/journal-entries" as const,
      responses: { 200: z.array(z.any()) },
    },
    get: {
      method: "GET" as const,
      path: "/api/journal-entries/:id" as const,
      responses: { 200: z.any(), 404: errorSchemas.notFound },
    },
    create: {
      method: "POST" as const,
      path: "/api/journal-entries" as const,
      input: z.object({
        entry: insertJournalEntrySchema.omit({ companyId: true, branchId: true, createdBy: true }),
        lines: z.array(insertJournalEntryLineSchema.omit({ journalEntryId: true })),
      }),
      responses: { 201: z.any(), 400: errorSchemas.validation },
    },
    approve: {
      method: "PATCH" as const,
      path: "/api/journal-entries/:id/approve" as const,
      responses: { 200: z.any(), 404: errorSchemas.notFound },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/journal-entries/:id" as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound },
    },
  },
  ledger: {
    get: {
      method: "GET" as const,
      path: "/api/ledger/:accountId" as const,
      responses: { 200: z.array(z.any()) },
    },
  },
  dashboard: {
    stats: {
      method: "GET" as const,
      path: "/api/dashboard/stats" as const,
      responses: { 200: z.any() },
    },
  },

  units: {
    list: { method: "GET" as const, path: "/api/units" as const },
    create: {
      method: "POST" as const, path: "/api/units" as const,
      input: insertUnitSchema.omit({ companyId: true }),
    },
    update: {
      method: "PUT" as const, path: "/api/units/:id" as const,
      input: insertUnitSchema.omit({ companyId: true }).partial(),
    },
    delete: { method: "DELETE" as const, path: "/api/units/:id" as const },
  },

  products: {
    list: { method: "GET" as const, path: "/api/products" as const },
    get: { method: "GET" as const, path: "/api/products/:id" as const },
    create: {
      method: "POST" as const, path: "/api/products" as const,
      input: insertProductSchema.omit({ companyId: true }),
    },
    update: {
      method: "PUT" as const, path: "/api/products/:id" as const,
      input: insertProductSchema.omit({ companyId: true }).partial(),
    },
    delete: { method: "DELETE" as const, path: "/api/products/:id" as const },
    components: {
      list: { method: "GET" as const, path: "/api/products/:id/components" as const },
      set: {
        method: "PUT" as const, path: "/api/products/:id/components" as const,
        input: z.object({ components: z.array(insertProductComponentSchema.omit({ productId: true })) }),
      },
    },
  },

  warehouses: {
    list: { method: "GET" as const, path: "/api/warehouses" as const },
    create: {
      method: "POST" as const, path: "/api/warehouses" as const,
      input: insertWarehouseSchema.omit({ companyId: true }),
    },
    update: {
      method: "PUT" as const, path: "/api/warehouses/:id" as const,
      input: insertWarehouseSchema.omit({ companyId: true }).partial(),
    },
    delete: { method: "DELETE" as const, path: "/api/warehouses/:id" as const },
    stock: { method: "GET" as const, path: "/api/warehouses/:id/stock" as const },
  },

  invoices: {
    list: { method: "GET" as const, path: "/api/invoices" as const },
    get: { method: "GET" as const, path: "/api/invoices/:id" as const },
    create: {
      method: "POST" as const, path: "/api/invoices" as const,
      input: z.object({
        invoice: insertInvoiceSchema.omit({ companyId: true, branchId: true, createdBy: true }),
        lines: z.array(insertInvoiceLineSchema.omit({ invoiceId: true })),
      }),
    },
    approve: { method: "PATCH" as const, path: "/api/invoices/:id/approve" as const },
    delete: { method: "DELETE" as const, path: "/api/invoices/:id" as const },
  },

  stockAlerts: {
    list: { method: "GET" as const, path: "/api/stock-alerts" as const },
  },

  stockTransfers: {
    list: { method: "GET" as const, path: "/api/stock-transfers" as const },
    get: { method: "GET" as const, path: "/api/stock-transfers/:id" as const },
    create: {
      method: "POST" as const, path: "/api/stock-transfers" as const,
      input: z.object({
        transfer: insertStockTransferSchema.omit({ companyId: true, createdBy: true }),
        lines: z.array(insertStockTransferLineSchema.omit({ transferId: true })),
      }),
    },
    approve: { method: "PATCH" as const, path: "/api/stock-transfers/:id/approve" as const },
    delete: { method: "DELETE" as const, path: "/api/stock-transfers/:id" as const },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
