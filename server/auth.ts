import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { db } from "./db";
import { users, permissions, companies } from "@shared/schema";
import type { SafeUser, UserRole, PageName } from "@shared/schema";
import { eq, and } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getSessionUser(req: Request): Promise<SafeUser | null> {
  if (!req.session?.userId) return null;

  const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));
  if (!user || !user.isActive) return null;

  const userPerms = await db.select().from(permissions).where(eq(permissions.userId, user.id));

  let company = null;
  let effectiveCompanyId = user.companyId;

  if (user.role === "super_admin") {
    const headerCompanyId = req.headers["x-company-id"];
    if (headerCompanyId) {
      const cid = Number(headerCompanyId);
      if (!isNaN(cid) && cid > 0) {
        const [c] = await db.select().from(companies).where(eq(companies.id, cid));
        if (c) {
          effectiveCompanyId = cid;
          company = c;
        }
      }
    }
  }

  if (!company && effectiveCompanyId) {
    const [c] = await db.select().from(companies).where(eq(companies.id, effectiveCompanyId));
    company = c || null;
  }

  const { password, ...safeUser } = user;
  return { ...safeUser, companyId: effectiveCompanyId, permissions: userPerms, company, branch: null } as SafeUser;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "يجب تسجيل الدخول أولاً" });
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ message: "يجب تسجيل الدخول أولاً" });
    if (!roles.includes(user.role as UserRole)) {
      return res.status(403).json({ message: "ليس لديك صلاحية لهذه العملية" });
    }
    next();
  };
}

export function requirePermission(page: PageName, action: "canView" | "canCreate" | "canEdit" | "canDelete") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ message: "يجب تسجيل الدخول أولاً" });

    if (user.role === "super_admin" || user.role === "company_owner") {
      return next();
    }

    const perm = user.permissions.find(p => p.page === page);
    if (!perm || !perm[action]) {
      return res.status(403).json({ message: "ليس لديك صلاحية لهذه العملية" });
    }
    next();
  };
}

export async function checkWalletBalance(req: Request, res: Response, next: NextFunction) {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ message: "يجب تسجيل الدخول أولاً" });

  if (user.role === "super_admin") return next();

  if (user.companyId) {
    const [company] = await db.select().from(companies).where(eq(companies.id, user.companyId));
    if (company && parseFloat(company.walletBalance) < 0.01) {
      return res.status(403).json({
        message: "رصيد المحفظة غير كافي لتغطية رسوم الخدمة الرقمية. يرجى شحن المحفظة للاستمرار.",
        walletBlocked: true,
        supportPhone1: "01009376052",
        supportPhone2: "01556660502",
      });
    }
  }
  next();
}
