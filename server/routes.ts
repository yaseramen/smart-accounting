import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { api, loginSchema, registerSchema, inviteUserSchema, updatePermissionsSchema, walletChargeSchema } from "@shared/routes";
import { PAGES, users, insertRevenueSchema, insertExpenseSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { hashPassword, comparePassword, getSessionUser, requireAuth, requireRole, requirePermission, checkWalletBalance } from "./auth";
import QRCode from "qrcode";

async function seedDatabase() {
  await storage.getSystemSettings();

  const allCompanies = await storage.getAllCompanies();
  for (const company of allCompanies) {
    if (parseFloat(company.walletBalance) === 0) {
      const transactions = await storage.getWalletTransactions(company.id);
      const hasBonus = transactions.some(t => t.description?.includes("مكافأة تسجيل أولى"));
      if (!hasBonus) {
        await storage.chargeWallet(company.id, 10, "مكافأة تسجيل أولى - رصيد ترحيبي");
        console.log(`تم إضافة مكافأة ترحيبية لشركة: ${company.name}`);
      }
    }
  }

  const efctUser = await storage.getUserByUsername("efct");
  if (efctUser && efctUser.role !== "super_admin") {
    await storage.updateUser(efctUser.id, { role: "super_admin", companyId: null, branchId: null });
    console.log("تم ترقية efct إلى مالك النظام (Super Admin)");
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  try {
    await seedDatabase();
  } catch (e: any) {
    console.warn("seedDatabase skipped (tables may not exist yet):", e.message);
  }

  // === AUTH ===
  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(username);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }

      const valid = await comparePassword(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }

      if (user.role !== "super_admin" && user.companyId) {
        const company = await storage.getCompany(user.companyId);
        if (company && parseFloat(company.walletBalance) < 0.01) {
          return res.status(403).json({
            message: "رصيد المحفظة غير كافي لتغطية رسوم الخدمة الرقمية. يرجى شحن المحفظة للاستمرار.",
            walletBlocked: true,
            supportPhone1: "01009376052",
            supportPhone2: "01556660502",
          });
        }
      }

      req.session.userId = user.id;
      const safeUser = await getSessionUser(req);

      try {
        await storage.createLoginLog({
          userId: user.id,
          userName: user.fullName,
          companyId: user.companyId,
          action: "login",
          ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString() || null,
          userAgent: req.headers["user-agent"] || null,
        });
      } catch (_) {}

      res.json(safeUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة" });
      }
      throw err;
    }
  });

  app.post(api.auth.logout.path, async (req, res) => {
    const user = await getSessionUser(req);
    if (user) {
      try {
        await storage.createLoginLog({
          userId: user.id,
          userName: user.fullName,
          companyId: user.companyId,
          action: "logout",
          ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString() || null,
          userAgent: req.headers["user-agent"] || null,
        });
      } catch (_) {}
    }
    req.session.destroy(() => {
      res.json({ message: "تم تسجيل الخروج" });
    });
  });

  app.get(api.auth.me.path, async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ message: "غير مسجل الدخول" });
    res.json(user);
  });

  app.get("/api/auth/setup-status", async (_req, res) => {
    const count = await storage.getUserCount();
    res.json({ needsSetup: count === 0 });
  });

  app.post(api.auth.register.path, async (req, res) => {
    try {
      const userCount = await storage.getUserCount();
      const isFirstUser = userCount === 0;

      if (isFirstUser) {
        const setupSchema = z.object({
          fullName: z.string().min(1),
          username: z.string().min(3),
          password: z.string().min(6),
          email: z.string().email().optional(),
        });
        const data = setupSchema.parse(req.body);

        const recheck = await storage.getUserCount();
        if (recheck > 0) {
          return res.status(400).json({ message: "تم تأسيس النظام بالفعل. لا يمكن إنشاء مالك جديد." });
        }

        const hashedPassword = await hashPassword(data.password);
        const user = await storage.createUser({
          username: data.username,
          password: hashedPassword,
          fullName: data.fullName,
          email: data.email || null,
          companyId: null,
          branchId: null,
          role: "super_admin",
          isActive: true,
        });

        console.log(`تم تسجيل المالك الأول للنظام: ${data.username}`);

        req.session.userId = user.id;
        const safeUser = await getSessionUser(req);
        return res.status(201).json(safeUser);
      }

      const data = registerSchema.parse(req.body);

      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });
      }

      const company = await storage.createCompany({
        name: data.companyName,
        slug: data.companySlug,
        isActive: true,
      });

      const branch = await storage.createBranch({
        companyId: company.id,
        name: "الفرع الرئيسي",
        code: "HQ",
        isActive: true,
      });

      const hashedPassword = await hashPassword(data.password);
      const user = await storage.createUser({
        username: data.username,
        password: hashedPassword,
        fullName: data.fullName,
        email: data.email || null,
        companyId: company.id,
        branchId: branch.id,
        role: "company_owner",
        isActive: true,
      });

      await seedCompanyAccounts(company.id);

      await storage.chargeWallet(company.id, 10, "مكافأة تسجيل أولى - رصيد ترحيبي");

      req.session.userId = user.id;
      const safeUser = await getSessionUser(req);
      res.status(201).json(safeUser);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === "23505") {
        return res.status(400).json({ message: "اسم الشركة أو الكود مستخدم بالفعل" });
      }
      throw err;
    }
  });

  // === COMPANIES ===
  app.get(api.companies.get.path, requireAuth, async (req, res) => {
    const user = await getSessionUser(req);
    if (!user || !user.companyId) return res.status(404).json({ message: "لا توجد شركة مرتبطة" });
    const company = await storage.getCompany(user.companyId);
    res.json(company);
  });

  app.put(api.companies.update.path, requireAuth, requireRole("company_owner", "super_admin"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user || !user.companyId) return res.status(404).json({ message: "لا توجد شركة مرتبطة" });
    const company = await storage.updateCompany(user.companyId, req.body);
    await storage.createAuditLog({
      companyId: user.companyId, userId: user.id, userName: user.fullName,
      action: "update", tableName: "companies", recordId: user.companyId,
      details: "تحديث بيانات الشركة",
    });
    res.json(company);
  });

  // === BRANCHES ===
  app.get(api.branches.list.path, requireAuth, async (req, res) => {
    const user = await getSessionUser(req);
    if (!user || !user.companyId) return res.json([]);
    const result = await storage.getBranches(user.companyId);
    res.json(result);
  });

  app.post(api.branches.create.path, requireAuth, requireRole("company_owner", "super_admin"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user || !user.companyId) return res.status(400).json({ message: "لا توجد شركة مرتبطة" });
    try {
      const branch = await storage.createBranch({ ...req.body, companyId: user.companyId });
      await storage.createAuditLog({
        companyId: user.companyId, userId: user.id, userName: user.fullName,
        action: "create", tableName: "branches", recordId: branch.id,
        details: `إنشاء فرع: ${branch.name}`,
      });
      res.status(201).json(branch);
    } catch (err: any) {
      if (err?.code === "23505") return res.status(400).json({ message: "كود الفرع مستخدم بالفعل" });
      throw err;
    }
  });

  app.put("/api/branches/:id", requireAuth, requireRole("company_owner", "super_admin"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user || !user.companyId) return res.status(400).json({ message: "لا توجد شركة" });
    const branch = await storage.updateBranch(Number(req.params.id), req.body, user.companyId);
    await storage.createAuditLog({
      companyId: user.companyId, userId: user.id, userName: user.fullName,
      action: "update", tableName: "branches", recordId: Number(req.params.id),
      details: `تعديل فرع: ${branch.name}`,
    });
    res.json(branch);
  });

  app.delete("/api/branches/:id", requireAuth, requireRole("company_owner", "super_admin"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user || !user.companyId) return res.status(400).json({ message: "لا توجد شركة" });
    await storage.deleteBranch(Number(req.params.id), user.companyId);
    await storage.createAuditLog({
      companyId: user.companyId, userId: user.id, userName: user.fullName,
      action: "delete", tableName: "branches", recordId: Number(req.params.id),
      details: "حذف فرع",
    });
    res.status(204).send();
  });

  // === USERS ===
  app.get(api.users.list.path, requireAuth, requireRole("company_owner", "super_admin"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user || !user.companyId) return res.json([]);
    const result = await storage.getCompanyUsers(user.companyId);
    res.json(result);
  });

  app.post(api.users.invite.path, requireAuth, requireRole("company_owner", "super_admin"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user || !user.companyId) return res.status(400).json({ message: "لا توجد شركة" });
    try {
      const data = inviteUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) return res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });

      const hashedPassword = await hashPassword(data.password);
      const newUser = await storage.createUser({
        username: data.username,
        password: hashedPassword,
        fullName: data.fullName,
        email: data.email || null,
        companyId: user.companyId,
        branchId: data.branchId || null,
        role: data.role || "user",
        isActive: true,
      });

      await storage.createAuditLog({
        companyId: user.companyId, userId: user.id, userName: user.fullName,
        action: "create", tableName: "users", recordId: newUser.id,
        details: `دعوة مستخدم: ${data.fullName}`,
      });

      const { password, ...safe } = newUser;
      res.status(201).json(safe);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.put("/api/users/:id", requireAuth, requireRole("company_owner", "super_admin"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user || !user.companyId) return res.status(400).json({ message: "لا توجد شركة" });
    const targetUser = await storage.getUserById(Number(req.params.id));
    if (!targetUser || (user.role !== "super_admin" && targetUser.companyId !== user.companyId)) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }
    const { password, ...data } = req.body;
    const updateData: any = { ...data };
    if (password) updateData.password = await hashPassword(password);
    const updated = await storage.updateUser(Number(req.params.id), updateData);
    const { password: _, ...safe } = updated;
    res.json(safe);
  });

  app.delete("/api/users/:id", requireAuth, requireRole("company_owner", "super_admin"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user || !user.companyId) return res.status(400).json({ message: "لا توجد شركة" });
    await storage.deleteUser(Number(req.params.id), user.companyId);
    await storage.createAuditLog({
      companyId: user.companyId, userId: user.id, userName: user.fullName,
      action: "delete", tableName: "users", recordId: Number(req.params.id),
      details: "حذف مستخدم",
    });
    res.status(204).send();
  });

  app.get("/api/users/:id/permissions", requireAuth, requireRole("company_owner", "super_admin"), async (req, res) => {
    const user = await getSessionUser(req);
    const targetUser = await storage.getUserById(Number(req.params.id));
    if (!targetUser || (user?.role !== "super_admin" && targetUser.companyId !== user?.companyId)) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }
    const perms = await storage.getUserPermissions(Number(req.params.id));
    res.json(perms);
  });

  app.put("/api/users/:id/permissions", requireAuth, requireRole("company_owner", "super_admin"), async (req, res) => {
    const user = await getSessionUser(req);
    const targetUser = await storage.getUserById(Number(req.params.id));
    if (!targetUser || (user?.role !== "super_admin" && targetUser.companyId !== user?.companyId)) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }
    try {
      const { permissions: perms } = updatePermissionsSchema.parse(req.body);
      const result = await storage.setUserPermissions(Number(req.params.id), perms);
      if (user) {
        await storage.createAuditLog({
          companyId: user.companyId, userId: user.id, userName: user.fullName,
          action: "update", tableName: "permissions", recordId: Number(req.params.id),
          details: "تحديث صلاحيات مستخدم",
        });
      }
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // === WALLET ===
  app.get(api.wallet.balance.path, requireAuth, async (req, res) => {
    const user = await getSessionUser(req);
    if (!user || !user.companyId) return res.json({ balance: "0", lowBalance: false });

    const balance = await storage.getWalletBalance(user.companyId);
    const company = await storage.getCompany(user.companyId);
    const threshold = parseFloat(company?.lowBalanceThreshold || "20");
    const balanceNum = parseFloat(balance);
    const lowBalance = balanceNum > 0 && balanceNum <= threshold;

    res.json({ balance, lowBalance, supportPhone1: "01009376052", supportPhone2: "01556660502" });
  });

  app.get(api.wallet.transactions.path, requireAuth, async (req, res) => {
    const user = await getSessionUser(req);
    if (!user || !user.companyId) return res.json([]);
    const result = await storage.getWalletTransactions(user.companyId);
    res.json(result);
  });

  app.post(api.wallet.charge.path, requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { amount, description } = walletChargeSchema.parse(req.body);
      const user = await getSessionUser(req);
      const companyId = req.body.companyId;
      if (!companyId) return res.status(400).json({ message: "يجب تحديد الشركة" });

      const tx = await storage.chargeWallet(companyId, amount, description || "شحن محفظة من المدير العام");
      if (user) {
        await storage.createAuditLog({
          companyId, userId: user.id, userName: user.fullName,
          action: "create", tableName: "wallet_transactions", recordId: tx.id,
          details: `شحن محفظة بمبلغ ${amount}`,
        });
      }
      try {
        const companyUsers = await storage.getCompanyUsers(companyId);
        const owners = companyUsers.filter((u: any) => u.role === "company_owner");
        for (const owner of owners) {
          await storage.createNotification({
            userId: owner.id,
            companyId,
            title: "تم شحن المحفظة",
            message: `تم شحن محفظة الشركة بمبلغ ${amount} ج.م`,
            type: "success",
          });
        }
      } catch {}
      res.status(201).json(tx);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.post("/api/wallet/deduct", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { amount, description } = walletChargeSchema.parse(req.body);
      const user = await getSessionUser(req);
      const companyId = req.body.companyId;
      if (!companyId) return res.status(400).json({ message: "يجب تحديد الشركة" });

      const currentBalance = await storage.getWalletBalance(companyId);
      if (parseFloat(currentBalance) < amount) {
        return res.status(400).json({ message: `رصيد المحفظة غير كافي. الرصيد الحالي: ${currentBalance} ج.م` });
      }

      const tx = await storage.deductWallet(companyId, amount, description || "خصم من المحفظة بواسطة المدير العام");
      if (user) {
        await storage.createAuditLog({
          companyId, userId: user.id, userName: user.fullName,
          action: "create", tableName: "wallet_transactions", recordId: tx.id,
          details: `خصم من المحفظة بمبلغ ${amount}`,
        });

        const companyUsers = await db.select().from(users).where(eq(users.companyId, companyId));
        for (const cu of companyUsers) {
          if (cu.role === "company_owner") {
            await storage.createNotification({
              userId: cu.id,
              companyId,
              title: "خصم من المحفظة",
              message: `تم خصم ${amount} ج.م من محفظة الشركة. ${description || ""}`,
              type: "warning",
            });
          }
        }
      }
      res.status(201).json(tx);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // === LOGIN LOGS ===
  app.get("/api/login-logs", requireAuth, requireRole("company_owner", "super_admin"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) return res.json([]);
    const companyId = user.role === "super_admin" && !user.companyId ? null : user.companyId;
    const result = await storage.getLoginLogs(companyId);
    res.json(result);
  });

  // === AUDIT LOG ===
  app.get(api.auditLog.list.path, requireAuth, requirePermission("audit-log", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) return res.json([]);
    const companyId = user.role === "super_admin" ? null : user.companyId;
    const result = await storage.getAuditLogs(companyId);
    res.json(result);
  });

  // === TREASURY ===
  app.get("/api/treasury", requireAuth, requirePermission("treasury", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user || !user.companyId) return res.json({ balance: "0", transactions: [] });
    const data = await storage.getTreasuryData(user.companyId);
    res.json(data);
  });

  app.get("/api/treasury/report", requireAuth, requirePermission("treasury", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user || !user.companyId) return res.json({ balance: "0", totalIn: "0", totalOut: "0", transactions: [] });
    const { startDate, endDate } = req.query as { startDate: string; endDate: string };
    const data = await storage.getTreasuryReport(user.companyId, startDate || "2020-01-01", endDate || "2099-12-31");
    res.json(data);
  });

  // === REVENUES ===
  app.get("/api/revenues", requireAuth, requirePermission("revenue", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user || !user.companyId) return res.json([]);
    const data = await storage.getRevenues(user.companyId);
    res.json(data);
  });

  app.post("/api/revenues", requireAuth, requirePermission("revenue", "canCreate"), async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user || !user.companyId) return res.status(400).json({ message: "يجب تحديد الشركة" });
      const data = insertRevenueSchema.parse({ ...req.body, companyId: user.companyId, createdBy: user.id });
      const revenue = await storage.createRevenue(data, user.companyId);
      if (user) {
        await storage.createAuditLog({
          companyId: user.companyId, userId: user.id, userName: user.fullName,
          action: "create", tableName: "revenues", recordId: revenue.id,
          details: `إيراد جديد: ${data.description} - ${data.amount} ج.م`,
        });
      }
      res.status(201).json(revenue);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err instanceof Error) return res.status(400).json({ message: err.message });
      throw err;
    }
  });

  app.delete("/api/revenues/:id", requireAuth, requirePermission("revenue", "canDelete"), async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user || !user.companyId) return res.status(400).json({ message: "يجب تحديد الشركة" });
      await storage.deleteRevenue(Number(req.params.id), user.companyId);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof Error) return res.status(400).json({ message: err.message });
      throw err;
    }
  });

  app.get("/api/reports/revenue", requireAuth, requirePermission("revenue", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user || !user.companyId) return res.json({ total: "0", count: 0, categories: [], items: [] });
    const { startDate, endDate } = req.query as { startDate: string; endDate: string };
    const data = await storage.getRevenueReport(user.companyId, startDate || "2020-01-01", endDate || "2099-12-31");
    res.json(data);
  });

  // === EXPENSES ===
  app.get("/api/expenses", requireAuth, requirePermission("expenses-page", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user || !user.companyId) return res.json([]);
    const data = await storage.getExpenses(user.companyId);
    res.json(data);
  });

  app.post("/api/expenses", requireAuth, requirePermission("expenses-page", "canCreate"), async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user || !user.companyId) return res.status(400).json({ message: "يجب تحديد الشركة" });
      const data = insertExpenseSchema.parse({ ...req.body, companyId: user.companyId, createdBy: user.id });
      const expense = await storage.createExpense(data, user.companyId);
      if (user) {
        await storage.createAuditLog({
          companyId: user.companyId, userId: user.id, userName: user.fullName,
          action: "create", tableName: "expenses", recordId: expense.id,
          details: `مصروف جديد: ${data.description} - ${data.amount} ج.م`,
        });
      }
      res.status(201).json(expense);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err instanceof Error) return res.status(400).json({ message: err.message });
      throw err;
    }
  });

  app.delete("/api/expenses/:id", requireAuth, requirePermission("expenses-page", "canDelete"), async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user || !user.companyId) return res.status(400).json({ message: "يجب تحديد الشركة" });
      await storage.deleteExpense(Number(req.params.id), user.companyId);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof Error) return res.status(400).json({ message: err.message });
      throw err;
    }
  });

  app.get("/api/reports/expenses", requireAuth, requirePermission("expenses-page", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user || !user.companyId) return res.json({ total: "0", count: 0, categories: [], items: [] });
    const { startDate, endDate } = req.query as { startDate: string; endDate: string };
    const data = await storage.getExpenseReport(user.companyId, startDate || "2020-01-01", endDate || "2099-12-31");
    res.json(data);
  });

  // === SYSTEM SETTINGS ===
  app.get(api.systemSettings.get.path, requireAuth, requireRole("super_admin"), async (_req, res) => {
    const settings = await storage.getSystemSettings();
    res.json(settings);
  });

  app.put(api.systemSettings.update.path, requireAuth, requireRole("super_admin"), async (req, res) => {
    const user = await getSessionUser(req);
    const settings = await storage.updateSystemSettings(req.body);
    if (user) {
      await storage.createAuditLog({
        companyId: null, userId: user.id, userName: user.fullName,
        action: "update", tableName: "system_settings", recordId: settings.id,
        details: "تحديث إعدادات النظام",
      });
    }
    res.json(settings);
  });

  // === Accounts (protected) ===
  app.get(api.accounts.list.path, requireAuth, checkWalletBalance, requirePermission("accounts", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    const companyId = user?.companyId ?? null;
    const result = await storage.getAccounts(companyId);
    res.json(result);
  });

  app.get("/api/accounts/:id", requireAuth, checkWalletBalance, requirePermission("accounts", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    const account = await storage.getAccount(Number(req.params.id), user?.companyId ?? null);
    if (!account) return res.status(404).json({ message: "الحساب غير موجود" });
    res.json(account);
  });

  app.post(api.accounts.create.path, requireAuth, checkWalletBalance, requirePermission("accounts", "canCreate"), async (req, res) => {
    try {
      const user = await getSessionUser(req);
      const input = api.accounts.create.input.parse(req.body);
      const account = await storage.createAccount({ ...input, companyId: user?.companyId ?? null });
      if (user) {
        await storage.createAuditLog({
          companyId: user.companyId, userId: user.id, userName: user.fullName,
          action: "create", tableName: "accounts", recordId: account.id,
          details: `إنشاء حساب: ${account.name}`,
        });
      }
      res.status(201).json(account);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      throw err;
    }
  });

  app.put("/api/accounts/:id", requireAuth, checkWalletBalance, requirePermission("accounts", "canEdit"), async (req, res) => {
    try {
      const user = await getSessionUser(req);
      const input = api.accounts.update.input.parse(req.body);
      const account = await storage.updateAccount(Number(req.params.id), input, user?.companyId ?? null);
      if (!account) return res.status(404).json({ message: "الحساب غير موجود" });
      if (user) {
        await storage.createAuditLog({
          companyId: user.companyId, userId: user.id, userName: user.fullName,
          action: "update", tableName: "accounts", recordId: Number(req.params.id),
          details: `تعديل حساب: ${account.name}`,
        });
      }
      res.json(account);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      throw err;
    }
  });

  app.delete("/api/accounts/:id", requireAuth, checkWalletBalance, requirePermission("accounts", "canDelete"), async (req, res) => {
    const user = await getSessionUser(req);
    await storage.deleteAccount(Number(req.params.id), user?.companyId ?? null);
    if (user) {
      await storage.createAuditLog({
        companyId: user.companyId, userId: user.id, userName: user.fullName,
        action: "delete", tableName: "accounts", recordId: Number(req.params.id),
        details: "حذف حساب",
      });
    }
    res.status(204).send();
  });

  // === Customers (protected) ===
  app.get(api.customers.list.path, requireAuth, checkWalletBalance, requirePermission("customers", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    const result = await storage.getCustomers(user?.companyId ?? null);
    res.json(result);
  });

  app.get("/api/customers/:id", requireAuth, checkWalletBalance, requirePermission("customers", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    const customer = await storage.getCustomer(Number(req.params.id), user?.companyId ?? null);
    if (!customer) return res.status(404).json({ message: "العميل غير موجود" });
    res.json(customer);
  });

  app.post(api.customers.create.path, requireAuth, checkWalletBalance, requirePermission("customers", "canCreate"), async (req, res) => {
    try {
      const user = await getSessionUser(req);
      const input = api.customers.create.input.parse(req.body);
      const customer = await storage.createCustomer({ ...input, companyId: user?.companyId ?? null });
      if (user) {
        await storage.createAuditLog({
          companyId: user.companyId, userId: user.id, userName: user.fullName,
          action: "create", tableName: "customers", recordId: customer.id,
          details: `إنشاء عميل: ${customer.name}`,
        });
      }
      res.status(201).json(customer);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      if (err?.code === "23505") {
        if (err.constraint?.includes("phone")) return res.status(400).json({ message: "رقم الهاتف مستخدم بالفعل لعميل آخر" });
        return res.status(400).json({ message: "كود العميل مستخدم بالفعل" });
      }
      throw err;
    }
  });

  app.put("/api/customers/:id", requireAuth, checkWalletBalance, requirePermission("customers", "canEdit"), async (req, res) => {
    try {
      const user = await getSessionUser(req);
      const input = api.customers.update.input.parse(req.body);
      const customer = await storage.updateCustomer(Number(req.params.id), input, user?.companyId ?? null);
      if (!customer) return res.status(404).json({ message: "العميل غير موجود" });
      if (user) {
        await storage.createAuditLog({
          companyId: user.companyId, userId: user.id, userName: user.fullName,
          action: "update", tableName: "customers", recordId: Number(req.params.id),
          details: `تعديل عميل: ${customer.name}`,
        });
      }
      res.json(customer);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      if (err?.code === "23505") {
        if (err.constraint?.includes("phone")) return res.status(400).json({ message: "رقم الهاتف مستخدم بالفعل لعميل آخر" });
        return res.status(400).json({ message: "كود العميل مستخدم بالفعل" });
      }
      throw err;
    }
  });

  app.delete("/api/customers/:id", requireAuth, checkWalletBalance, requirePermission("customers", "canDelete"), async (req, res) => {
    const user = await getSessionUser(req);
    await storage.deleteCustomer(Number(req.params.id), user?.companyId ?? null);
    if (user) {
      await storage.createAuditLog({
        companyId: user.companyId, userId: user.id, userName: user.fullName,
        action: "delete", tableName: "customers", recordId: Number(req.params.id),
        details: "حذف عميل",
      });
    }
    res.status(204).send();
  });

  // === Suppliers (protected) ===
  app.get(api.suppliers.list.path, requireAuth, checkWalletBalance, requirePermission("suppliers", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    const result = await storage.getSuppliers(user?.companyId ?? null);
    res.json(result);
  });

  app.get("/api/suppliers/:id", requireAuth, checkWalletBalance, requirePermission("suppliers", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    const supplier = await storage.getSupplier(Number(req.params.id), user?.companyId ?? null);
    if (!supplier) return res.status(404).json({ message: "المورد غير موجود" });
    res.json(supplier);
  });

  app.post(api.suppliers.create.path, requireAuth, checkWalletBalance, requirePermission("suppliers", "canCreate"), async (req, res) => {
    try {
      const user = await getSessionUser(req);
      const input = api.suppliers.create.input.parse(req.body);
      const supplier = await storage.createSupplier({ ...input, companyId: user?.companyId ?? null });
      if (user) {
        await storage.createAuditLog({
          companyId: user.companyId, userId: user.id, userName: user.fullName,
          action: "create", tableName: "suppliers", recordId: supplier.id,
          details: `إنشاء مورد: ${supplier.name}`,
        });
      }
      res.status(201).json(supplier);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      if (err?.code === "23505") {
        if (err.constraint?.includes("phone")) return res.status(400).json({ message: "رقم الهاتف مستخدم بالفعل لمورد آخر" });
        return res.status(400).json({ message: "كود المورد مستخدم بالفعل" });
      }
      throw err;
    }
  });

  app.put("/api/suppliers/:id", requireAuth, checkWalletBalance, requirePermission("suppliers", "canEdit"), async (req, res) => {
    try {
      const user = await getSessionUser(req);
      const input = api.suppliers.update.input.parse(req.body);
      const supplier = await storage.updateSupplier(Number(req.params.id), input, user?.companyId ?? null);
      if (!supplier) return res.status(404).json({ message: "المورد غير موجود" });
      if (user) {
        await storage.createAuditLog({
          companyId: user.companyId, userId: user.id, userName: user.fullName,
          action: "update", tableName: "suppliers", recordId: Number(req.params.id),
          details: `تعديل مورد: ${supplier.name}`,
        });
      }
      res.json(supplier);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      if (err?.code === "23505") {
        if (err.constraint?.includes("phone")) return res.status(400).json({ message: "رقم الهاتف مستخدم بالفعل لمورد آخر" });
        return res.status(400).json({ message: "كود المورد مستخدم بالفعل" });
      }
      throw err;
    }
  });

  app.delete("/api/suppliers/:id", requireAuth, checkWalletBalance, requirePermission("suppliers", "canDelete"), async (req, res) => {
    const user = await getSessionUser(req);
    await storage.deleteSupplier(Number(req.params.id), user?.companyId ?? null);
    if (user) {
      await storage.createAuditLog({
        companyId: user.companyId, userId: user.id, userName: user.fullName,
        action: "delete", tableName: "suppliers", recordId: Number(req.params.id),
        details: "حذف مورد",
      });
    }
    res.status(204).send();
  });

  // === Journal Entries (protected) ===
  app.get(api.journalEntries.list.path, requireAuth, checkWalletBalance, requirePermission("journal-entries", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    const result = await storage.getJournalEntries(user?.companyId ?? null);
    res.json(result);
  });

  app.get("/api/journal-entries/:id", requireAuth, checkWalletBalance, requirePermission("journal-entries", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    const entry = await storage.getJournalEntry(Number(req.params.id), user?.companyId ?? null);
    if (!entry) return res.status(404).json({ message: "القيد غير موجود" });
    res.json(entry);
  });

  app.post(api.journalEntries.create.path, requireAuth, checkWalletBalance, requirePermission("journal-entries", "canCreate"), async (req, res) => {
    try {
      const user = await getSessionUser(req);
      const input = api.journalEntries.create.input.parse(req.body);
      const totalDebit = input.lines.reduce((sum, l) => sum + parseFloat(l.debit || "0"), 0);
      const totalCredit = input.lines.reduce((sum, l) => sum + parseFloat(l.credit || "0"), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return res.status(400).json({ message: "إجمالي المدين لازم يساوي إجمالي الدائن" });
      }
      if (input.lines.length < 2) {
        return res.status(400).json({ message: "القيد لازم يكون فيه سطرين على الأقل" });
      }
      const entry = await storage.createJournalEntry({
        entry: { ...input.entry, companyId: user?.companyId ?? null, branchId: user?.branchId ?? null, createdBy: user?.id ?? null },
        lines: input.lines,
      });
      if (user) {
        await storage.createAuditLog({
          companyId: user.companyId, userId: user.id, userName: user.fullName,
          action: "create", tableName: "journal_entries", recordId: entry.id,
          details: `إنشاء قيد: ${entry.entryNumber}`,
        });
      }
      res.status(201).json(entry);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      throw err;
    }
  });

  app.patch("/api/journal-entries/:id/approve", requireAuth, checkWalletBalance, async (req, res) => {
    try {
      const user = await getSessionUser(req);
      const entry = await storage.approveJournalEntry(Number(req.params.id), user?.companyId ?? null);
      if (user) {
        await storage.createAuditLog({
          companyId: user.companyId, userId: user.id, userName: user.fullName,
          action: "update", tableName: "journal_entries", recordId: entry.id,
          details: `اعتماد قيد: ${entry.entryNumber}`,
        });
      }
      res.json(entry);
    } catch (err: any) {
      if (err.message === "القيد غير موجود") {
        return res.status(404).json({ message: err.message });
      }
      throw err;
    }
  });

  app.delete("/api/journal-entries/:id", requireAuth, checkWalletBalance, requirePermission("journal-entries", "canDelete"), async (req, res) => {
    const user = await getSessionUser(req);
    await storage.deleteJournalEntry(Number(req.params.id), user?.companyId ?? null);
    if (user) {
      await storage.createAuditLog({
        companyId: user.companyId, userId: user.id, userName: user.fullName,
        action: "delete", tableName: "journal_entries", recordId: Number(req.params.id),
        details: "حذف قيد",
      });
    }
    res.status(204).send();
  });

  // === Ledger (protected) ===
  app.get("/api/ledger/:accountId", requireAuth, checkWalletBalance, requirePermission("ledger", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    const ledger = await storage.getLedger(Number(req.params.accountId), user?.companyId ?? null);
    res.json(ledger);
  });

  // === Dashboard (protected) ===
  app.get(api.dashboard.stats.path, requireAuth, checkWalletBalance, async (req, res) => {
    const user = await getSessionUser(req);
    const stats = await storage.getDashboardStats(user?.companyId ?? null);
    res.json(stats);
  });

  app.get("/api/system-dashboard/stats", requireAuth, requireRole("super_admin"), async (_req, res) => {
    const stats = await storage.getSystemDashboardStats();
    res.json(stats);
  });

  app.get("/api/admin/companies", requireAuth, requireRole("super_admin"), async (_req, res) => {
    const companies = await storage.getAllCompanies();
    res.json(companies);
  });

  app.put("/api/admin/companies/:id/fee-rate", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const companyId = Number(req.params.id);
      let { customServiceFeeRate } = req.body;
      if (customServiceFeeRate !== null && customServiceFeeRate !== undefined) {
        const rate = parseFloat(customServiceFeeRate);
        if (isNaN(rate) || rate < 0 || rate > 1) {
          return res.status(400).json({ message: "النسبة يجب أن تكون رقم بين 0 و 1" });
        }
        customServiceFeeRate = rate.toFixed(4);
      } else {
        customServiceFeeRate = null;
      }
      const updated = await storage.updateCompanyFeeRate(companyId, customServiceFeeRate);
      const user = await getSessionUser(req);
      await storage.createAuditLog({
        companyId, userId: user!.id, userName: user!.fullName,
        action: "update", tableName: "companies", recordId: companyId,
        details: customServiceFeeRate === null
          ? `إزالة نسبة الرسوم المخصصة - العودة للنسبة الافتراضية`
          : `تعيين نسبة رسوم مخصصة: ${(parseFloat(customServiceFeeRate) * 100).toFixed(4)}%`,
      });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "خطأ في تحديث النسبة" });
    }
  });

  app.get("/api/admin/platform-earnings", requireAuth, requireRole("super_admin"), async (req, res) => {
    const { from, to, companyId } = req.query;
    const earnings = await storage.getPlatformEarnings(
      from as string | undefined,
      to as string | undefined,
      companyId ? Number(companyId) : undefined,
    );
    res.json(earnings);
  });

  // === Support Tickets ===
  app.post("/api/support-tickets", requireAuth, async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user) return res.status(401).json({ message: "غير مسجل الدخول" });
      const { subject, message, category } = req.body;
      if (!subject?.trim() || !message?.trim()) return res.status(400).json({ message: "الموضوع والرسالة مطلوبان" });
      const validCategories = ["bug", "feature", "question", "complaint", "other"];
      if (category && !validCategories.includes(category)) return res.status(400).json({ message: "تصنيف غير صالح" });
      const ticket = await storage.createSupportTicket({
        userId: user.id,
        userName: user.fullName,
        companyId: user.companyId || undefined,
        companyName: user.company?.name || undefined,
        subject,
        message,
        category: category || "bug",
      });
      res.status(201).json(ticket);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "خطأ في إرسال التذكرة" });
    }
  });

  app.get("/api/support-tickets", requireAuth, async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ message: "غير مسجل الدخول" });
    if (user.role === "super_admin") {
      const tickets = await storage.getSupportTickets();
      return res.json(tickets);
    }
    if (!user.companyId) return res.json([]);
    const tickets = await storage.getSupportTickets(user.companyId);
    res.json(tickets);
  });

  app.put("/api/support-tickets/:id/reply", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { reply } = req.body;
      if (!reply) return res.status(400).json({ message: "الرد مطلوب" });
      const ticket = await storage.replySupportTicket(Number(req.params.id), reply);
      try {
        await storage.createNotification({
          userId: ticket.userId,
          companyId: ticket.companyId,
          title: "رد على تذكرة الدعم",
          message: `تم الرد على تذكرة الدعم: ${ticket.subject}`,
          type: "info",
        });
      } catch {}
      res.json(ticket);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "خطأ في الرد" });
    }
  });

  app.put("/api/support-tickets/:id/status", requireAuth, requireRole("super_admin"), async (req, res) => {
    try {
      const { status } = req.body;
      if (!["open", "replied", "closed"].includes(status)) return res.status(400).json({ message: "حالة غير صالحة" });
      const ticket = await storage.updateSupportTicketStatus(Number(req.params.id), status);
      res.json(ticket);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "خطأ في تحديث الحالة" });
    }
  });

  // === Units (protected) ===
  app.get(api.units.list.path, requireAuth, checkWalletBalance, requirePermission("products", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user?.companyId) return res.json([]);
    const result = await storage.getUnits(user.companyId);
    res.json(result);
  });

  app.post(api.units.create.path, requireAuth, checkWalletBalance, requirePermission("products", "canCreate"), async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });
      const input = api.units.create.input.parse(req.body);
      const unit = await storage.createUnit({ ...input, companyId: user.companyId });
      await storage.createAuditLog({
        companyId: user.companyId, userId: user.id, userName: user.fullName,
        action: "create", tableName: "units", recordId: unit.id,
        details: `إنشاء وحدة: ${unit.name}`,
      });
      res.status(201).json(unit);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err?.code === "23505") return res.status(400).json({ message: "اسم الوحدة مستخدم بالفعل" });
      throw err;
    }
  });

  app.put("/api/units/:id", requireAuth, checkWalletBalance, requirePermission("products", "canEdit"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });
    const unit = await storage.updateUnit(Number(req.params.id), req.body, user.companyId);
    await storage.createAuditLog({
      companyId: user.companyId, userId: user.id, userName: user.fullName,
      action: "update", tableName: "units", recordId: Number(req.params.id),
      details: `تعديل وحدة: ${unit.name}`,
    });
    res.json(unit);
  });

  app.delete("/api/units/:id", requireAuth, checkWalletBalance, requirePermission("products", "canDelete"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });
    await storage.deleteUnit(Number(req.params.id), user.companyId);
    await storage.createAuditLog({
      companyId: user.companyId, userId: user.id, userName: user.fullName,
      action: "delete", tableName: "units", recordId: Number(req.params.id),
      details: "حذف وحدة",
    });
    res.status(204).send();
  });

  // === Products (protected) ===
  app.get(api.products.list.path, requireAuth, checkWalletBalance, requirePermission("products", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user?.companyId) return res.json([]);
    const result = await storage.getProducts(user.companyId);
    res.json(result);
  });

  app.get("/api/products/:id", requireAuth, checkWalletBalance, requirePermission("products", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user?.companyId) return res.status(404).json({ message: "المنتج غير موجود" });
    const product = await storage.getProduct(Number(req.params.id), user.companyId);
    if (!product) return res.status(404).json({ message: "المنتج غير موجود" });
    res.json(product);
  });

  app.post(api.products.create.path, requireAuth, checkWalletBalance, requirePermission("products", "canCreate"), async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });
      const body = { ...req.body };
      if (!body.code || body.code.trim() === "") {
        body.code = await storage.getNextProductCode(user.companyId);
      }
      const input = api.products.create.input.parse(body);
      const product = await storage.createProduct({ ...input, companyId: user.companyId });
      await storage.createAuditLog({
        companyId: user.companyId, userId: user.id, userName: user.fullName,
        action: "create", tableName: "products", recordId: product.id,
        details: `إنشاء منتج: ${product.name}`,
      });
      res.status(201).json(product);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err?.code === "23505") return res.status(400).json({ message: "كود المنتج مستخدم بالفعل" });
      throw err;
    }
  });

  app.put("/api/products/:id", requireAuth, checkWalletBalance, requirePermission("products", "canEdit"), async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });
      const product = await storage.updateProduct(Number(req.params.id), req.body, user.companyId);
      await storage.createAuditLog({
        companyId: user.companyId, userId: user.id, userName: user.fullName,
        action: "update", tableName: "products", recordId: Number(req.params.id),
        details: `تعديل منتج: ${product.name}`,
      });
      res.json(product);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.delete("/api/products/:id", requireAuth, checkWalletBalance, requirePermission("products", "canDelete"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });
    await storage.deleteProduct(Number(req.params.id), user.companyId);
    await storage.createAuditLog({
      companyId: user.companyId, userId: user.id, userName: user.fullName,
      action: "delete", tableName: "products", recordId: Number(req.params.id),
      details: "حذف منتج",
    });
    res.status(204).send();
  });

  app.get("/api/products/:id/components", requireAuth, checkWalletBalance, requirePermission("products", "canView"), async (req, res) => {
    const comps = await storage.getProductComponents(Number(req.params.id));
    res.json(comps);
  });

  app.put("/api/products/:id/components", requireAuth, checkWalletBalance, requirePermission("products", "canEdit"), async (req, res) => {
    try {
      const { components } = api.products.components.set.input.parse(req.body);
      const result = await storage.setProductComponents(Number(req.params.id), components);
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.post("/api/products/:id/manufacture", requireAuth, checkWalletBalance, requirePermission("products", "canEdit"), async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });
      const { quantity, warehouseId } = req.body;
      if (!quantity || !warehouseId) return res.status(400).json({ message: "الكمية والمخزن مطلوبين" });
      await storage.manufactureProduct(Number(req.params.id), Number(quantity), Number(warehouseId), user.companyId);
      await storage.createAuditLog({
        companyId: user.companyId, userId: user.id, userName: user.fullName,
        action: "create", tableName: "products", recordId: Number(req.params.id),
        details: `إنتاج منتج مركب - كمية: ${quantity}`,
      });
      res.json({ message: "تم الإنتاج بنجاح" });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "خطأ في الإنتاج" });
    }
  });

  // === Auto-generation endpoints ===
  app.get("/api/auto/customer-code", requireAuth, async (req, res) => {
    const user = await getSessionUser(req);
    if (!user?.companyId) return res.json({ code: "CUS-0001" });
    const code = await storage.getNextCustomerCode(user.companyId);
    res.json({ code });
  });

  app.get("/api/auto/supplier-code", requireAuth, async (req, res) => {
    const user = await getSessionUser(req);
    if (!user?.companyId) return res.json({ code: "SUP-0001" });
    const code = await storage.getNextSupplierCode(user.companyId);
    res.json({ code });
  });

  app.get("/api/auto/invoice-number", requireAuth, async (req, res) => {
    const user = await getSessionUser(req);
    const type = String(req.query.type || "sale");
    const defaultMap: Record<string, string> = { sale: "INV-0001", purchase: "PUR-0001", sale_return: "SRT-0001", purchase_return: "PRT-0001" };
    if (!user?.companyId) return res.json({ number: defaultMap[type] || "INV-0001" });
    const number = await storage.getNextInvoiceNumber(user.companyId, type);
    res.json({ number });
  });

  app.get("/api/auto/product-code", requireAuth, async (req, res) => {
    const user = await getSessionUser(req);
    if (!user?.companyId) return res.json({ code: "PRD-0001" });
    const code = await storage.getNextProductCode(user.companyId);
    res.json({ code });
  });

  // === Warehouses (protected) ===
  app.get(api.warehouses.list.path, requireAuth, checkWalletBalance, requirePermission("warehouses", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user?.companyId) return res.json([]);
    const result = await storage.getWarehouses(user.companyId);
    res.json(result);
  });

  app.post(api.warehouses.create.path, requireAuth, checkWalletBalance, requirePermission("warehouses", "canCreate"), async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });
      const input = api.warehouses.create.input.parse(req.body);
      const warehouse = await storage.createWarehouse({ ...input, companyId: user.companyId });
      await storage.createAuditLog({
        companyId: user.companyId, userId: user.id, userName: user.fullName,
        action: "create", tableName: "warehouses", recordId: warehouse.id,
        details: `إنشاء مخزن: ${warehouse.name}`,
      });
      res.status(201).json(warehouse);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err?.code === "23505") return res.status(400).json({ message: "كود المخزن مستخدم بالفعل" });
      throw err;
    }
  });

  app.put("/api/warehouses/:id", requireAuth, checkWalletBalance, requirePermission("warehouses", "canEdit"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });
    const warehouse = await storage.updateWarehouse(Number(req.params.id), req.body, user.companyId);
    await storage.createAuditLog({
      companyId: user.companyId, userId: user.id, userName: user.fullName,
      action: "update", tableName: "warehouses", recordId: Number(req.params.id),
      details: `تعديل مخزن: ${warehouse.name}`,
    });
    res.json(warehouse);
  });

  app.delete("/api/warehouses/:id", requireAuth, checkWalletBalance, requirePermission("warehouses", "canDelete"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });
    await storage.deleteWarehouse(Number(req.params.id), user.companyId);
    await storage.createAuditLog({
      companyId: user.companyId, userId: user.id, userName: user.fullName,
      action: "delete", tableName: "warehouses", recordId: Number(req.params.id),
      details: "حذف مخزن",
    });
    res.status(204).send();
  });

  app.get("/api/warehouses/:id/stock", requireAuth, checkWalletBalance, requirePermission("warehouses", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user?.companyId) return res.json([]);
    const result = await storage.getWarehouseStock(Number(req.params.id), user.companyId);
    res.json(result);
  });

  // === Invoices (protected) ===
  app.get(api.invoices.list.path, requireAuth, checkWalletBalance, async (req, res) => {
    const user = await getSessionUser(req);
    if (!user?.companyId) return res.json([]);
    const type = req.query.type as string | undefined;
    const pagePerm = type === "purchase" ? "purchases" : type === "sale_return" || type === "purchase_return" ? "returns" : "sales";
    const perms = user.permissions || [];
    const hasPerm = user.role === "super_admin" || user.role === "company_owner" ||
      perms.some((p: any) => p.page === pagePerm && p.canView);
    if (!hasPerm) return res.status(403).json({ message: "ليس لديك صلاحية" });
    const result = await storage.getInvoices(user.companyId, type);
    res.json(result);
  });

  app.get("/api/invoices/:id", requireAuth, checkWalletBalance, async (req, res) => {
    const user = await getSessionUser(req);
    if (!user?.companyId) return res.status(404).json({ message: "الفاتورة غير موجودة" });
    const invoice = await storage.getInvoice(Number(req.params.id), user.companyId);
    if (!invoice) return res.status(404).json({ message: "الفاتورة غير موجودة" });
    const pagePerm = invoice.type === "purchase" ? "purchases" : (invoice.type === "sale_return" || invoice.type === "purchase_return") ? "returns" : "sales";
    const perms = user.permissions || [];
    const hasPerm = user.role === "super_admin" || user.role === "company_owner" ||
      perms.some((p: any) => p.page === pagePerm && p.canView);
    if (!hasPerm) return res.status(403).json({ message: "ليس لديك صلاحية" });
    res.json(invoice);
  });

  app.post(api.invoices.create.path, requireAuth, checkWalletBalance, async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });

      const input = api.invoices.create.input.parse(req.body);
      if (input.invoice.paymentType === "partial") {
        const paid = parseFloat(input.invoice.paidAmount || "0");
        const total = parseFloat(input.invoice.total || "0");
        if (paid < 0 || paid > total) {
          return res.status(400).json({ message: "المبلغ المدفوع يجب أن يكون بين 0 وإجمالي الفاتورة" });
        }
      }
      const pagePerm = input.invoice.type === "purchase" ? "purchases" : (input.invoice.type === "sale_return" || input.invoice.type === "purchase_return") ? "returns" : "sales";
      const perms = user.permissions || [];
      const hasPerm = user.role === "super_admin" || user.role === "company_owner" ||
        perms.some((p: any) => p.page === pagePerm && p.canCreate);
      if (!hasPerm) return res.status(403).json({ message: "ليس لديك صلاحية" });

      const subtotalVal = parseFloat(input.invoice.subtotal || "0");
      const discountVal = parseFloat(input.invoice.discountAmount || "0");
      const extraCostsVal = parseFloat(input.invoice.extraCosts || "0");
      const afterDiscountVal = subtotalVal - discountVal + extraCostsVal;
      const computedServiceFee = afterDiscountVal > 0 ? Math.max(afterDiscountVal * 0.0005, 0.50) : 0;
      input.invoice.serviceFee = computedServiceFee.toFixed(2);

      const qrText = JSON.stringify({
        company: user.company?.name,
        invoiceNumber: input.invoice.invoiceNumber,
        date: input.invoice.invoiceDate,
        total: input.invoice.total,
        type: input.invoice.type,
      });
      let qrData: string | null = null;
      try {
        qrData = await QRCode.toDataURL(qrText, { width: 200 });
      } catch {}

      const invoice = await storage.createInvoice({
        invoice: {
          ...input.invoice,
          companyId: user.companyId,
          branchId: user.branchId ?? null,
          createdBy: user.id,
          qrData,
        },
        lines: input.lines,
      });

      await storage.createAuditLog({
        companyId: user.companyId, userId: user.id, userName: user.fullName,
        action: "create", tableName: "invoices", recordId: invoice.id,
        details: `إنشاء فاتورة ${input.invoice.type === "sale" ? "مبيعات" : input.invoice.type === "purchase" ? "مشتريات" : input.invoice.type === "sale_return" ? "مرتجع مبيعات" : "مرتجع مشتريات"}: ${invoice.invoiceNumber}`,
      });
      res.status(201).json(invoice);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err?.code === "23505") return res.status(400).json({ message: "رقم الفاتورة مستخدم بالفعل" });
      throw err;
    }
  });

  app.patch("/api/invoices/:id/approve", requireAuth, checkWalletBalance, async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });
      const existing = await storage.getInvoice(Number(req.params.id), user.companyId);
      if (!existing) return res.status(404).json({ message: "الفاتورة غير موجودة" });
      const pagePerm = existing.type === "purchase" ? "purchases" : (existing.type === "sale_return" || existing.type === "purchase_return") ? "returns" : "sales";
      const perms = user.permissions || [];
      const hasPerm = user.role === "super_admin" || user.role === "company_owner" ||
        perms.some((p: any) => p.page === pagePerm && p.canEdit);
      if (!hasPerm) return res.status(403).json({ message: "ليس لديك صلاحية لاعتماد الفاتورة" });

      const invoice = await storage.approveInvoice(Number(req.params.id), user.companyId);
      await storage.createAuditLog({
        companyId: user.companyId, userId: user.id, userName: user.fullName,
        action: "update", tableName: "invoices", recordId: invoice.id,
        details: `اعتماد فاتورة: ${invoice.invoiceNumber}`,
      });
      const typeLabel = invoice.type === "sale" ? "مبيعات" : invoice.type === "purchase" ? "مشتريات" : invoice.type === "sale_return" ? "مرتجع مبيعات" : "مرتجع مشتريات";
      if (invoice.createdBy && invoice.createdBy !== user.id) {
        try {
          await storage.createNotification({
            userId: invoice.createdBy,
            companyId: user.companyId,
            title: "تم اعتماد فاتورة",
            message: `تم اعتماد فاتورة ${typeLabel} رقم ${invoice.invoiceNumber}`,
            type: "success",
          });
        } catch {}
      }
      res.json(invoice);
    } catch (err: any) {
      if (err.message) return res.status(400).json({ message: err.message });
      throw err;
    }
  });

  app.delete("/api/invoices/:id", requireAuth, checkWalletBalance, async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });
      const existing = await storage.getInvoice(Number(req.params.id), user.companyId);
      if (!existing) return res.status(404).json({ message: "الفاتورة غير موجودة" });
      const pagePerm = existing.type === "purchase" ? "purchases" : (existing.type === "sale_return" || existing.type === "purchase_return") ? "returns" : "sales";
      const perms = user.permissions || [];
      const hasPerm = user.role === "super_admin" || user.role === "company_owner" ||
        perms.some((p: any) => p.page === pagePerm && p.canDelete);
      if (!hasPerm) return res.status(403).json({ message: "ليس لديك صلاحية لحذف الفاتورة" });

      await storage.deleteInvoice(Number(req.params.id), user.companyId);
      await storage.createAuditLog({
        companyId: user.companyId, userId: user.id, userName: user.fullName,
        action: "delete", tableName: "invoices", recordId: Number(req.params.id),
        details: "حذف فاتورة",
      });
      res.status(204).send();
    } catch (err: any) {
      if (err.message) return res.status(400).json({ message: err.message });
      throw err;
    }
  });

  // === Customer Statement ===
  app.get("/api/customers/:id/statement", requireAuth, checkWalletBalance, async (req, res) => {
    const user = await getSessionUser(req);
    if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });
    const customerId = Number(req.params.id);
    const customer = await storage.getCustomer(customerId, user.companyId);
    if (!customer) return res.status(404).json({ message: "العميل غير موجود" });

    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    const saleInvoices = await storage.getInvoices(user.companyId, "sale");
    const saleReturnInvoices = await storage.getInvoices(user.companyId, "sale_return");

    let customerInvoices = [
      ...saleInvoices.filter(inv => inv.customerId === customerId),
      ...saleReturnInvoices.filter(inv => inv.customerId === customerId),
    ];

    if (startDate) {
      customerInvoices = customerInvoices.filter(inv => inv.invoiceDate >= startDate);
    }
    if (endDate) {
      customerInvoices = customerInvoices.filter(inv => inv.invoiceDate <= endDate);
    }

    customerInvoices.sort((a, b) => a.invoiceDate.localeCompare(b.invoiceDate) || a.id - b.id);

    let runningBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    const transactions = customerInvoices.map(inv => {
      const amount = parseFloat(inv.total);
      const paidAmount = parseFloat(inv.paidAmount || "0");
      let debit = 0;
      let credit = 0;

      if (inv.type === "sale") {
        debit = amount - paidAmount;
      } else if (inv.type === "sale_return") {
        credit = amount;
      }

      const outstanding = inv.type === "sale" ? amount - paidAmount : 0;

      totalDebit += debit;
      totalCredit += credit;
      runningBalance += debit - credit;

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        total: inv.total,
        status: inv.status,
        type: inv.type,
        paymentType: inv.paymentType || "paid",
        paidAmount: paidAmount.toFixed(2),
        outstanding: outstanding.toFixed(2),
        debit: debit.toFixed(2),
        credit: credit.toFixed(2),
        balance: runningBalance.toFixed(2),
      };
    });

    res.json({
      customer,
      invoices: transactions,
      summary: {
        totalInvoices: transactions.length,
        totalDebit: totalDebit.toFixed(2),
        totalCredit: totalCredit.toFixed(2),
        netBalance: (totalDebit - totalCredit).toFixed(2),
        balance: customer.balance,
      },
    });
  });

  // === Supplier Statement ===
  app.get("/api/suppliers/:id/statement", requireAuth, checkWalletBalance, async (req, res) => {
    const user = await getSessionUser(req);
    if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });
    const supplierId = Number(req.params.id);
    const supplier = await storage.getSupplier(supplierId, user.companyId);
    if (!supplier) return res.status(404).json({ message: "المورد غير موجود" });

    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    const purchaseInvoices = await storage.getInvoices(user.companyId, "purchase");
    const purchaseReturnInvoices = await storage.getInvoices(user.companyId, "purchase_return");

    let supplierInvoices = [
      ...purchaseInvoices.filter(inv => inv.supplierId === supplierId),
      ...purchaseReturnInvoices.filter(inv => inv.supplierId === supplierId),
    ];

    if (startDate) {
      supplierInvoices = supplierInvoices.filter(inv => inv.invoiceDate >= startDate);
    }
    if (endDate) {
      supplierInvoices = supplierInvoices.filter(inv => inv.invoiceDate <= endDate);
    }

    supplierInvoices.sort((a, b) => a.invoiceDate.localeCompare(b.invoiceDate) || a.id - b.id);

    let runningBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    const transactions = supplierInvoices.map(inv => {
      const amount = parseFloat(inv.total);
      const paidAmount = parseFloat(inv.paidAmount || "0");
      let debit = 0;
      let credit = 0;

      if (inv.type === "purchase") {
        credit = amount - paidAmount;
      } else if (inv.type === "purchase_return") {
        debit = amount;
      }

      const outstanding = inv.type === "purchase" ? amount - paidAmount : 0;

      totalDebit += debit;
      totalCredit += credit;
      runningBalance += credit - debit;

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        total: inv.total,
        status: inv.status,
        type: inv.type,
        paymentType: inv.paymentType || "paid",
        paidAmount: paidAmount.toFixed(2),
        outstanding: outstanding.toFixed(2),
        debit: debit.toFixed(2),
        credit: credit.toFixed(2),
        balance: runningBalance.toFixed(2),
      };
    });

    res.json({
      supplier,
      invoices: transactions,
      summary: {
        totalInvoices: transactions.length,
        totalDebit: totalDebit.toFixed(2),
        totalCredit: totalCredit.toFixed(2),
        netBalance: (totalCredit - totalDebit).toFixed(2),
        balance: supplier.balance,
      },
    });
  });

  // === Product Report ===
  app.get("/api/products/:id/report", requireAuth, checkWalletBalance, async (req, res) => {
    const user = await getSessionUser(req);
    if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });
    const productId = Number(req.params.id);
    const product = await storage.getProduct(productId, user.companyId);
    if (!product) return res.status(404).json({ message: "المنتج غير موجود" });

    const salesInvoices = await storage.getInvoices(user.companyId, "sale");
    const purchaseInvoices = await storage.getInvoices(user.companyId, "purchase");

    const salesLines = salesInvoices.flatMap(inv =>
      inv.lines.filter(l => l.productId === productId).map(l => ({
        invoiceId: inv.id, invoiceNumber: inv.invoiceNumber, invoiceDate: inv.invoiceDate,
        quantity: l.quantity, unitPrice: l.unitPrice, total: l.total,
        customerName: inv.customer?.name || null, status: inv.status,
      }))
    );

    const purchaseLines = purchaseInvoices.flatMap(inv =>
      inv.lines.filter(l => l.productId === productId).map(l => ({
        invoiceId: inv.id, invoiceNumber: inv.invoiceNumber, invoiceDate: inv.invoiceDate,
        quantity: l.quantity, unitPrice: l.unitPrice, total: l.total,
        supplierName: inv.supplier?.name || null, status: inv.status,
      }))
    );

    const warehouseStockData = await storage.getWarehouseStock(user.companyId);
    const productStock = warehouseStockData.filter((ws: any) => ws.productId === productId);

    const totalSalesRevenue = salesLines.filter(l => l.status === "approved").reduce((s, l) => s + parseFloat(l.total), 0);
    const totalPurchaseCost = purchaseLines.filter(l => l.status === "approved").reduce((s, l) => s + parseFloat(l.total), 0);
    const totalProfit = totalSalesRevenue - totalPurchaseCost;

    res.json({
      product,
      sales: salesLines,
      purchases: purchaseLines,
      warehouseStock: productStock.map((ws: any) => ({
        warehouseId: ws.warehouseId, warehouseName: ws.warehouse?.name || "", quantity: ws.quantity,
      })),
      summary: {
        totalSold: salesLines.filter(l => l.status === "approved").reduce((s, l) => s + parseFloat(l.quantity), 0),
        totalPurchased: purchaseLines.filter(l => l.status === "approved").reduce((s, l) => s + parseFloat(l.quantity), 0),
        totalSalesRevenue: totalSalesRevenue.toFixed(2),
        totalPurchaseCost: totalPurchaseCost.toFixed(2),
        totalProfit: totalProfit.toFixed(2),
        currentStock: product.currentStock,
      },
    });
  });

  // === Reports ===
  app.get("/api/reports/profit-loss", requireAuth, checkWalletBalance, requirePermission("reports", "canView"), async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      if (!startDate || !endDate) return res.status(400).json({ message: "يجب تحديد تاريخ البداية والنهاية" });
      const report = await storage.getProfitLossReport(user.companyId, startDate, endDate);
      res.json(report);
    } catch (err: any) {
      if (err.message) return res.status(400).json({ message: err.message });
      throw err;
    }
  });

  // === Stock Alerts (protected) ===
  app.get(api.stockAlerts.list.path, requireAuth, checkWalletBalance, requirePermission("stock-alerts", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user?.companyId) return res.json([]);
    const result = await storage.getStockAlerts(user.companyId);
    res.json(result);
  });

  // === Stock Transfers ===
  app.get(api.stockTransfers.list.path, requireAuth, checkWalletBalance, requirePermission("stock-transfers", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user?.companyId) return res.json([]);
    const result = await storage.getStockTransfers(user.companyId);
    res.json(result);
  });

  app.get("/api/stock-transfers/:id", requireAuth, checkWalletBalance, requirePermission("stock-transfers", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });
    const transfer = await storage.getStockTransfer(Number(req.params.id), user.companyId);
    if (!transfer) return res.status(404).json({ message: "التحويل غير موجود" });
    res.json(transfer);
  });

  app.post(api.stockTransfers.create.path, requireAuth, checkWalletBalance, requirePermission("stock-transfers", "canCreate"), async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });
      const input = api.stockTransfers.create.input.parse(req.body);

      const fromWh = await storage.getWarehouse(input.transfer.fromWarehouseId, user.companyId);
      const toWh = await storage.getWarehouse(input.transfer.toWarehouseId, user.companyId);
      if (!fromWh || !toWh) return res.status(400).json({ message: "المخزن غير موجود أو لا ينتمي لشركتك" });
      if (input.transfer.fromWarehouseId === input.transfer.toWarehouseId) return res.status(400).json({ message: "لا يمكن التحويل لنفس المخزن" });

      const transfer = await storage.createStockTransfer({
        transfer: {
          ...input.transfer,
          companyId: user.companyId,
          createdBy: user.id,
        },
        lines: input.lines,
      });

      await storage.createAuditLog({
        companyId: user.companyId, userId: user.id, userName: user.fullName,
        action: "create", tableName: "stock_transfers", recordId: transfer.id,
        details: `إنشاء تحويل مخزون من ${transfer.fromWarehouse?.name} إلى ${transfer.toWarehouse?.name}`,
      });
      res.status(201).json(transfer);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.patch("/api/stock-transfers/:id/approve", requireAuth, checkWalletBalance, requirePermission("stock-transfers", "canEdit"), async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });

      const transfer = await storage.approveStockTransfer(Number(req.params.id), user.companyId);
      await storage.createAuditLog({
        companyId: user.companyId, userId: user.id, userName: user.fullName,
        action: "update", tableName: "stock_transfers", recordId: transfer.id,
        details: `اعتماد تحويل مخزون: من ${transfer.fromWarehouse?.name} إلى ${transfer.toWarehouse?.name}`,
      });
      res.json(transfer);
    } catch (err: any) {
      if (err.message) return res.status(400).json({ message: err.message });
      throw err;
    }
  });

  app.delete("/api/stock-transfers/:id", requireAuth, checkWalletBalance, requirePermission("stock-transfers", "canDelete"), async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });

      await storage.deleteStockTransfer(Number(req.params.id), user.companyId);
      await storage.createAuditLog({
        companyId: user.companyId, userId: user.id, userName: user.fullName,
        action: "delete", tableName: "stock_transfers", recordId: Number(req.params.id),
        details: "حذف تحويل مخزون",
      });
      res.status(204).send();
    } catch (err: any) {
      if (err.message) return res.status(400).json({ message: err.message });
      throw err;
    }
  });

  // === GLOBAL SEARCH ===
  app.get("/api/search", requireAuth, async (req, res) => {
    const user = await getSessionUser(req);
    if (!user || !user.companyId) return res.json({ customers: [], suppliers: [], products: [], invoices: [] });
    const q = (req.query.q as string || "").trim();
    if (!q || q.length < 1) return res.json({ customers: [], suppliers: [], products: [], invoices: [] });
    const results = await storage.globalSearch(user.companyId, q);
    res.json(results);
  });

  // === NOTIFICATIONS ===
  app.get("/api/notifications", requireAuth, async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) return res.json([]);
    const result = await storage.getNotifications(user.id);
    res.json(result);
  });

  app.put("/api/notifications/:id/read", requireAuth, async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ message: "غير مسجل" });
    const notification = await storage.markNotificationAsRead(Number(req.params.id), user.id);
    res.json(notification);
  });

  app.put("/api/notifications/read-all", requireAuth, async (req, res) => {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ message: "غير مسجل" });
    await storage.markAllNotificationsAsRead(user.id);
    res.json({ message: "تم تحديد الكل كمقروء" });
  });

  // === Payments (تسديدات) ===
  app.post("/api/payments", requireAuth, requirePermission("receivables", "canCreate"), async (req, res) => {
    try {
      const user = await getSessionUser(req);
      if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });
      const { invoiceId, amount, paymentMethod, paymentDate, notes } = req.body;
      if (!invoiceId || !amount || !paymentDate) return res.status(400).json({ message: "بيانات ناقصة" });
      const payment = await storage.recordPayment({
        companyId: user.companyId,
        invoiceId: Number(invoiceId),
        amount: String(amount),
        paymentMethod: paymentMethod || "cash",
        paymentDate,
        notes: notes || null,
        createdBy: user.id,
      });
      res.json(payment);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/payments", requireAuth, requirePermission("receivables", "canView"), async (req, res) => {
    const user = await getSessionUser(req);
    if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });
    const invoiceId = Number(req.query.invoiceId);
    if (!invoiceId) return res.json([]);
    const result = await storage.getPaymentsByInvoice(invoiceId, user.companyId);
    res.json(result);
  });

  app.get("/api/outstanding/receivables", requireAuth, requirePermission("receivables", "canView"), checkWalletBalance, async (req, res) => {
    const user = await getSessionUser(req);
    if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });
    const invoices = await storage.getOutstandingInvoices(user.companyId, "customer");
    const grouped: Record<number, { customer: any; invoices: any[]; totalOutstanding: number }> = {};
    for (const inv of invoices) {
      const cId = inv.customerId || 0;
      if (!grouped[cId]) {
        grouped[cId] = { customer: inv.customer || { id: 0, name: "بدون عميل" }, invoices: [], totalOutstanding: 0 };
      }
      const outstanding = parseFloat(inv.total) - parseFloat(inv.paidAmount || "0");
      grouped[cId].invoices.push({ ...inv, outstanding: outstanding.toFixed(2) });
      grouped[cId].totalOutstanding += outstanding;
    }
    const result = Object.values(grouped).map(g => ({ ...g, totalOutstanding: g.totalOutstanding.toFixed(2) }));
    res.json(result);
  });

  app.get("/api/outstanding/payables", requireAuth, requirePermission("payables", "canView"), checkWalletBalance, async (req, res) => {
    const user = await getSessionUser(req);
    if (!user?.companyId) return res.status(400).json({ message: "لا توجد شركة" });
    const invoices = await storage.getOutstandingInvoices(user.companyId, "supplier");
    const grouped: Record<number, { supplier: any; invoices: any[]; totalOutstanding: number }> = {};
    for (const inv of invoices) {
      const sId = inv.supplierId || 0;
      if (!grouped[sId]) {
        grouped[sId] = { supplier: inv.supplier || { id: 0, name: "بدون مورد" }, invoices: [], totalOutstanding: 0 };
      }
      const outstanding = parseFloat(inv.total) - parseFloat(inv.paidAmount || "0");
      grouped[sId].invoices.push({ ...inv, outstanding: outstanding.toFixed(2) });
      grouped[sId].totalOutstanding += outstanding;
    }
    const result = Object.values(grouped).map(g => ({ ...g, totalOutstanding: g.totalOutstanding.toFixed(2) }));
    res.json(result);
  });

  return httpServer;
}

async function seedCompanyAccounts(companyId: number) {
  const codeToId: Record<string, number> = {};

  const seedAccounts = [
    { code: "1000", name: "الأصول", type: "أصول", parentCode: null, level: 1, description: "إجمالي الأصول" },
    { code: "1100", name: "النقدية والبنوك", type: "أصول", parentCode: "1000", level: 2, description: "النقدية في الصندوق والبنوك" },
    { code: "1110", name: "الصندوق", type: "أصول", parentCode: "1100", level: 3, description: "النقدية في الصندوق" },
    { code: "1120", name: "البنك الأهلي", type: "أصول", parentCode: "1100", level: 3, description: "حساب البنك الأهلي" },
    { code: "1200", name: "العملاء", type: "أصول", parentCode: "1000", level: 2, description: "أرصدة العملاء المدينة" },
    { code: "1300", name: "المخزون", type: "أصول", parentCode: "1000", level: 2, description: "المخزون السلعي" },
    { code: "2000", name: "الخصوم", type: "خصوم", parentCode: null, level: 1, description: "إجمالي الخصوم" },
    { code: "2100", name: "الموردين", type: "خصوم", parentCode: "2000", level: 2, description: "أرصدة الموردين الدائنة" },
    { code: "2200", name: "القروض", type: "خصوم", parentCode: "2000", level: 2, description: "القروض والتسهيلات" },
    { code: "3000", name: "حقوق الملكية", type: "حقوق ملكية", parentCode: null, level: 1, description: "رأس المال وحقوق الملكية" },
    { code: "3100", name: "رأس المال", type: "حقوق ملكية", parentCode: "3000", level: 2, description: "رأس المال المدفوع" },
    { code: "4000", name: "الإيرادات", type: "إيرادات", parentCode: null, level: 1, description: "إجمالي الإيرادات" },
    { code: "4100", name: "إيرادات المبيعات", type: "إيرادات", parentCode: "4000", level: 2, description: "إيرادات من بيع السلع" },
    { code: "4200", name: "إيرادات الخدمات", type: "إيرادات", parentCode: "4000", level: 2, description: "إيرادات من تقديم الخدمات" },
    { code: "5000", name: "المصروفات", type: "مصروفات", parentCode: null, level: 1, description: "إجمالي المصروفات" },
    { code: "5100", name: "مصروفات الرواتب", type: "مصروفات", parentCode: "5000", level: 2, description: "رواتب وأجور الموظفين" },
    { code: "5200", name: "مصروفات الإيجار", type: "مصروفات", parentCode: "5000", level: 2, description: "إيجار المقرات والمكاتب" },
    { code: "5300", name: "مصروفات عمومية", type: "مصروفات", parentCode: "5000", level: 2, description: "مصروفات عمومية وإدارية" },
  ];

  for (const acc of seedAccounts) {
    const { parentCode, ...rest } = acc;
    const parentId = parentCode ? codeToId[parentCode] : null;
    const created = await storage.createAccount({ ...rest, parentId, isActive: true, companyId });
    codeToId[acc.code] = created.id;
  }
}
