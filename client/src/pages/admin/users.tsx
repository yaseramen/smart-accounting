import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, UserCog, Loader2, Shield, Ban, CheckCircle, Eye, FilePlus, Pencil, X } from "lucide-react";
import type { SafeUser, Permission, Branch } from "@shared/schema";
import { PAGES } from "@shared/schema";

type BranchData = { id: number; name: string; code: string };

const PAGE_LABELS: Record<string, string> = {
  dashboard: "لوحة التحكم",
  accounts: "شجرة الحسابات",
  "journal-entries": "قيود اليومية",
  ledger: "دفتر الأستاذ",
  customers: "العملاء",
  suppliers: "الموردين",
  products: "المنتجات",
  warehouses: "المخازن",
  sales: "المبيعات",
  purchases: "المشتريات",
  returns: "المرتجعات",
  "stock-alerts": "تنبيهات المخزون",
  "stock-transfers": "تحويلات المخزون",
  reports: "التقارير",
  branches: "الفروع",
  users: "المستخدمين",
  wallet: "المحفظة",
  "audit-log": "سجل العمليات",
  "login-logs": "سجل الدخول",
  settings: "الإعدادات",
};

const PERMISSION_LABELS: Record<string, string> = {
  canView: "عرض",
  canCreate: "إنشاء",
  canEdit: "تعديل",
  canDelete: "حذف",
};

const PERMISSION_KEYS = ["canView", "canCreate", "canEdit", "canDelete"] as const;

type PermAction = (typeof PERMISSION_KEYS)[number];

function getPermissionSummary(permissions?: Permission[]): { viewCount: number; createCount: number; editCount: number; deleteCount: number; totalPages: number } {
  if (!permissions || permissions.length === 0) return { viewCount: 0, createCount: 0, editCount: 0, deleteCount: 0, totalPages: 0 };
  let viewCount = 0, createCount = 0, editCount = 0, deleteCount = 0;
  for (const p of permissions) {
    if (p.canView) viewCount++;
    if (p.canCreate) createCount++;
    if (p.canEdit) editCount++;
    if (p.canDelete) deleteCount++;
  }
  return { viewCount, createCount, editCount, deleteCount, totalPages: PAGES.length };
}

export default function UsersPage() {
  const { toast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [permOpen, setPermOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SafeUser | null>(null);
  const [inviteForm, setInviteForm] = useState({ username: "", password: "", fullName: "", email: "", role: "user" as string, branchId: "" });
  const [permState, setPermState] = useState<Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>>({});

  const { data: usersList = [], isLoading } = useQuery<SafeUser[]>({ queryKey: ["/api/users"] });
  const { data: branchesList = [] } = useQuery<BranchData[]>({ queryKey: ["/api/branches"] });

  const inviteMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/users/invite", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/users"] }); setInviteOpen(false); toast({ title: "تم دعوة المستخدم بنجاح" }); },
    onError: () => toast({ title: "خطأ", description: "فشل دعوة المستخدم", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/users/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/users"] }); toast({ title: "تم حذف المستخدم" }); },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: number; isActive: boolean }) => apiRequest("PUT", `/api/users/${userId}`, { isActive }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/users"] }); toast({ title: "تم تحديث حالة المستخدم" }); },
    onError: () => toast({ title: "خطأ", description: "فشل تحديث حالة المستخدم", variant: "destructive" }),
  });

  const assignBranchMutation = useMutation({
    mutationFn: ({ userId, branchId }: { userId: number; branchId: number | null }) => apiRequest("PUT", `/api/users/${userId}`, { branchId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/users"] }); toast({ title: "تم تعيين الفرع" }); },
    onError: () => toast({ title: "خطأ", description: "فشل تعيين الفرع", variant: "destructive" }),
  });

  const permMutation = useMutation({
    mutationFn: ({ userId, perms }: { userId: number; perms: any[] }) => apiRequest("PUT", `/api/users/${userId}/permissions`, { permissions: perms }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/users"] }); setPermOpen(false); toast({ title: "تم تحديث الصلاحيات" }); },
  });

  const openPermissions = (user: SafeUser) => {
    setSelectedUser(user);
    const state: Record<string, any> = {};
    for (const page of PAGES) {
      const existing = user.permissions?.find(p => p.page === page);
      state[page] = {
        canView: existing?.canView || false,
        canCreate: existing?.canCreate || false,
        canEdit: existing?.canEdit || false,
        canDelete: existing?.canDelete || false,
      };
    }
    setPermState(state);
    setPermOpen(true);
  };

  const savePerm = () => {
    if (!selectedUser) return;
    const perms = Object.entries(permState).map(([page, p]) => ({ page, ...p }));
    permMutation.mutate({ userId: selectedUser.id, perms });
  };

  const roleLabel = (role: string) => {
    if (role === "super_admin") return "مدير النظام";
    if (role === "company_owner") return "مالك الشركة";
    return "مستخدم";
  };

  const isColumnAllChecked = (action: PermAction): boolean => {
    return PAGES.every(page => permState[page]?.[action]);
  };

  const isColumnSomeChecked = (action: PermAction): boolean => {
    const checked = PAGES.filter(page => permState[page]?.[action]).length;
    return checked > 0 && checked < PAGES.length;
  };

  const toggleColumn = (action: PermAction) => {
    const allChecked = isColumnAllChecked(action);
    setPermState(prev => {
      const next = { ...prev };
      for (const page of PAGES) {
        next[page] = { ...next[page], [action]: !allChecked };
      }
      return next;
    });
  };

  const isRowAllChecked = (page: string): boolean => {
    return PERMISSION_KEYS.every(action => permState[page]?.[action]);
  };

  const isRowSomeChecked = (page: string): boolean => {
    const checked = PERMISSION_KEYS.filter(action => permState[page]?.[action]).length;
    return checked > 0 && checked < PERMISSION_KEYS.length;
  };

  const toggleRow = (page: string) => {
    const allChecked = isRowAllChecked(page);
    setPermState(prev => ({
      ...prev,
      [page]: {
        canView: !allChecked,
        canCreate: !allChecked,
        canEdit: !allChecked,
        canDelete: !allChecked,
      },
    }));
  };

  const isAllChecked = (): boolean => {
    return PAGES.every(page => PERMISSION_KEYS.every(action => permState[page]?.[action]));
  };

  const isSomeChecked = (): boolean => {
    const total = PAGES.length * PERMISSION_KEYS.length;
    const checked = PAGES.reduce((sum, page) => sum + PERMISSION_KEYS.filter(action => permState[page]?.[action]).length, 0);
    return checked > 0 && checked < total;
  };

  const toggleAll = () => {
    const allChecked = isAllChecked();
    setPermState(prev => {
      const next = { ...prev };
      for (const page of PAGES) {
        next[page] = {
          canView: !allChecked,
          canCreate: !allChecked,
          canEdit: !allChecked,
          canDelete: !allChecked,
        };
      }
      return next;
    });
  };

  return (
    <div className="p-6 h-full overflow-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <UserCog className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">إدارة المستخدمين</h1>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-invite-user"><Plus className="w-4 h-4 ml-2" />دعوة مستخدم</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader><DialogTitle>دعوة مستخدم جديد</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); const { branchId, ...rest } = inviteForm; inviteMutation.mutate({ ...rest, branchId: branchId && branchId !== "none" ? Number(branchId) : null }); }} className="space-y-4">
              <div><Label>الاسم الكامل</Label><Input data-testid="input-invite-fullname" value={inviteForm.fullName} onChange={e => setInviteForm(p => ({ ...p, fullName: e.target.value }))} required /></div>
              <div><Label>اسم المستخدم</Label><Input data-testid="input-invite-username" value={inviteForm.username} onChange={e => setInviteForm(p => ({ ...p, username: e.target.value }))} required /></div>
              <div><Label>كلمة المرور</Label><Input type="password" data-testid="input-invite-password" value={inviteForm.password} onChange={e => setInviteForm(p => ({ ...p, password: e.target.value }))} required minLength={6} /></div>
              <div><Label>البريد الإلكتروني</Label><Input type="email" data-testid="input-invite-email" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} /></div>
              <div>
                <Label>الدور</Label>
                <Select value={inviteForm.role} onValueChange={v => setInviteForm(p => ({ ...p, role: v }))}>
                  <SelectTrigger data-testid="select-invite-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">مستخدم</SelectItem>
                    <SelectItem value="company_owner">مالك شركة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الفرع</Label>
                <Select value={inviteForm.branchId} onValueChange={v => setInviteForm(p => ({ ...p, branchId: v }))}>
                  <SelectTrigger data-testid="select-invite-branch"><SelectValue placeholder="بدون فرع" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون فرع (جميع الفروع)</SelectItem>
                    {branchesList.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={inviteMutation.isPending} data-testid="button-submit-invite">
                {inviteMutation.isPending ? "جاري الدعوة..." : "دعوة المستخدم"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>الفرع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الصلاحيات</TableHead>
                  <TableHead>البريد</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersList.map(u => {
                  const summary = getPermissionSummary(u.permissions);
                  return (
                    <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                      <TableCell>{u.fullName}</TableCell>
                      <TableCell className="font-mono">{u.username}</TableCell>
                      <TableCell>{roleLabel(u.role)}</TableCell>
                      <TableCell>
                        <Select
                          value={u.branchId ? String(u.branchId) : "none"}
                          onValueChange={(v) => assignBranchMutation.mutate({ userId: u.id, branchId: v === "none" ? null : Number(v) })}
                        >
                          <SelectTrigger className="w-[140px]" data-testid={`select-branch-${u.id}`}>
                            <SelectValue placeholder="جميع الفروع" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">جميع الفروع</SelectItem>
                            {branchesList.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.isActive ? "default" : "destructive"} data-testid={`badge-status-${u.id}`}>
                          {u.isActive ? "نشط" : "محظور"}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`cell-permissions-summary-${u.id}`}>
                        <div className="flex flex-wrap gap-1">
                          {summary.viewCount > 0 && (
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-perm-view-${u.id}`}>
                              <Eye className="w-3 h-3 ml-1" />
                              عرض {summary.viewCount}
                            </Badge>
                          )}
                          {summary.createCount > 0 && (
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-perm-create-${u.id}`}>
                              <FilePlus className="w-3 h-3 ml-1" />
                              إنشاء {summary.createCount}
                            </Badge>
                          )}
                          {summary.editCount > 0 && (
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-perm-edit-${u.id}`}>
                              <Pencil className="w-3 h-3 ml-1" />
                              تعديل {summary.editCount}
                            </Badge>
                          )}
                          {summary.deleteCount > 0 && (
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-perm-delete-${u.id}`}>
                              <X className="w-3 h-3 ml-1" />
                              حذف {summary.deleteCount}
                            </Badge>
                          )}
                          {summary.viewCount === 0 && summary.createCount === 0 && summary.editCount === 0 && summary.deleteCount === 0 && (
                            <span className="text-xs text-muted-foreground">بدون صلاحيات</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{u.email || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant={u.isActive ? "outline" : "default"}
                            onClick={() => toggleActiveMutation.mutate({ userId: u.id, isActive: !u.isActive })}
                            disabled={toggleActiveMutation.isPending}
                            data-testid={`button-toggle-active-${u.id}`}
                          >
                            {u.isActive ? <Ban className="w-4 h-4 ml-1" /> : <CheckCircle className="w-4 h-4 ml-1" />}
                            {u.isActive ? "حظر" : "تفعيل"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openPermissions(u)} data-testid={`button-permissions-${u.id}`}>
                            <Shield className="w-4 h-4 ml-1" />صلاحيات
                          </Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(u.id)} data-testid={`button-delete-user-${u.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {usersList.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">لا يوجد مستخدمين</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من الحذف؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 flex-row-reverse">
            <AlertDialogAction data-testid="button-confirm-delete" onClick={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null); }}>حذف</AlertDialogAction>
            <AlertDialogCancel data-testid="button-cancel-delete">إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={permOpen} onOpenChange={setPermOpen}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>صلاحيات: {selectedUser?.fullName}</DialogTitle></DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">الصفحة</TableHead>
                <TableHead className="text-center w-[80px]">
                  <div className="flex flex-col items-center gap-1">
                    <span>تحديد الكل</span>
                    <Checkbox
                      checked={isAllChecked()}
                      ref={el => { if (el) { const input = el as HTMLButtonElement; input.dataset.indeterminate = String(isSomeChecked()); } }}
                      onCheckedChange={() => toggleAll()}
                      data-testid="checkbox-select-all"
                    />
                  </div>
                </TableHead>
                {PERMISSION_KEYS.map(action => (
                  <TableHead key={action} className="text-center w-[90px]">
                    <div className="flex flex-col items-center gap-1">
                      <span>{PERMISSION_LABELS[action]}</span>
                      <Checkbox
                        checked={isColumnAllChecked(action)}
                        ref={el => { if (el) { const input = el as HTMLButtonElement; input.dataset.indeterminate = String(isColumnSomeChecked(action)); } }}
                        onCheckedChange={() => toggleColumn(action)}
                        data-testid={`checkbox-col-${action}`}
                      />
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PAGES.map(page => (
                <TableRow key={page}>
                  <TableCell className="font-medium">{PAGE_LABELS[page] || page}</TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={isRowAllChecked(page)}
                      ref={el => { if (el) { const input = el as HTMLButtonElement; input.dataset.indeterminate = String(isRowSomeChecked(page)); } }}
                      onCheckedChange={() => toggleRow(page)}
                      data-testid={`checkbox-row-${page}`}
                    />
                  </TableCell>
                  {PERMISSION_KEYS.map(action => (
                    <TableCell key={action} className="text-center">
                      <Checkbox
                        checked={permState[page]?.[action] || false}
                        onCheckedChange={(checked) => setPermState(prev => ({
                          ...prev,
                          [page]: { ...prev[page], [action]: !!checked },
                        }))}
                        data-testid={`checkbox-${page}-${action}`}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button onClick={savePerm} disabled={permMutation.isPending} data-testid="button-save-permissions">
            {permMutation.isPending ? "جاري الحفظ..." : "حفظ الصلاحيات"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
