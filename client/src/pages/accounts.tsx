import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit } from "lucide-react";
import type { Account } from "@shared/schema";

const ACCOUNT_TYPES = ["أصول", "خصوم", "حقوق ملكية", "إيرادات", "مصروفات"];

export default function AccountsPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [form, setForm] = useState({ code: "", name: "", type: "أصول", parentId: "", level: "1", description: "", isActive: true });

  const { data: accounts, isLoading } = useQuery<Account[]>({ queryKey: ["/api/accounts"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({ title: "تم إضافة الحساب بنجاح" });
      resetForm();
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/accounts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({ title: "تم تعديل الحساب بنجاح" });
      resetForm();
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({ title: "تم حذف الحساب بنجاح" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setForm({ code: "", name: "", type: "أصول", parentId: "", level: "1", description: "", isActive: true });
    setEditAccount(null);
    setOpen(false);
  };

  const handleEdit = (account: Account) => {
    setEditAccount(account);
    setForm({
      code: account.code,
      name: account.name,
      type: account.type,
      parentId: account.parentId?.toString() || "",
      level: account.level.toString(),
      description: account.description || "",
      isActive: account.isActive,
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      code: form.code,
      name: form.name,
      type: form.type,
      parentId: form.parentId ? parseInt(form.parentId) : null,
      level: parseInt(form.level),
      description: form.description || null,
      isActive: form.isActive,
    };
    if (editAccount) {
      updateMutation.mutate({ id: editAccount.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "أصول": return "default";
      case "خصوم": return "destructive";
      case "إيرادات": return "secondary";
      case "مصروفات": return "outline";
      default: return "secondary";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4" dir="rtl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 overflow-auto h-full" dir="rtl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-accounts-title">شجرة الحسابات</h1>
          <p className="text-muted-foreground">إدارة الحسابات المحاسبية</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-account"><Plus className="w-4 h-4 ml-2" />إضافة حساب</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editAccount ? "تعديل الحساب" : "إضافة حساب جديد"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>كود الحساب</Label>
                  <Input data-testid="input-account-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>اسم الحساب</Label>
                  <Input data-testid="input-account-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>نوع الحساب</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger data-testid="select-account-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>المستوى</Label>
                  <Input data-testid="input-account-level" type="number" min="1" max="5" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>الحساب الرئيسي</Label>
                <Select value={form.parentId} onValueChange={(v) => setForm({ ...form, parentId: v })}>
                  <SelectTrigger data-testid="select-parent-account"><SelectValue placeholder="بدون (حساب رئيسي)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون (حساب رئيسي)</SelectItem>
                    {accounts?.map((a) => <SelectItem key={a.id} value={a.id.toString()}>{a.code} - {a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الوصف</Label>
                <Input data-testid="input-account-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-account">
                {createMutation.isPending || updateMutation.isPending ? "جاري الحفظ..." : editAccount ? "تعديل" : "إضافة"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الكود</TableHead>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">المستوى</TableHead>
                <TableHead className="text-right">الرصيد</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts?.map((account) => (
                <TableRow key={account.id} data-testid={`row-account-${account.id}`}>
                  <TableCell className="font-mono">{account.code}</TableCell>
                  <TableCell style={{ paddingRight: `${(account.level - 1) * 20}px` }} className="font-medium">
                    {account.name}
                  </TableCell>
                  <TableCell><Badge variant={getTypeBadgeVariant(account.type)}>{account.type}</Badge></TableCell>
                  <TableCell>{account.level}</TableCell>
                  <TableCell className="font-mono">
                    {new Intl.NumberFormat("ar-EG", { minimumFractionDigits: 2 }).format(parseFloat(account.balance || "0"))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={account.isActive ? "default" : "secondary"}>
                      {account.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(account)} data-testid={`button-edit-account-${account.id}`}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(account.id)} data-testid={`button-delete-account-${account.id}`}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!accounts || accounts.length === 0) && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">لا توجد حسابات</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
    </div>
  );
}
