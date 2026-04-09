import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Receipt, Search } from "lucide-react";
import type { Expense, Account } from "@shared/schema";

const EXPENSE_CATEGORIES = [
  "إيجارات",
  "رواتب",
  "مرافق",
  "صيانة",
  "مشتريات مكتبية",
  "نقل ومواصلات",
  "تسويق وإعلان",
  "ضرائب ورسوم",
  "أخرى",
];

export default function ExpensesPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    description: "",
    category: "أخرى",
    accountId: "",
    treasuryAccountId: "",
  });

  const { data: expensesList, isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: accounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const expenseAccounts = accounts?.filter(
    (a) => a.type === "expense" || a.type === "مصروفات" || a.code?.startsWith("4")
  );
  const treasuryAccounts = accounts?.filter(
    (a) => a.type === "asset" || a.type === "أصول" || a.code?.startsWith("1")
  );

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/expenses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/treasury"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "تم إضافة المصروف بنجاح" });
      resetForm();
    },
    onError: (err: Error) =>
      toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/treasury"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "تم حذف المصروف" });
      setDeleteId(null);
    },
    onError: (err: Error) =>
      toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split("T")[0],
      amount: "",
      description: "",
      category: "أخرى",
      accountId: "",
      treasuryAccountId: "",
    });
    setOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast({ title: "خطأ", description: "يجب إدخال مبلغ صحيح", variant: "destructive" });
      return;
    }
    if (!form.description.trim()) {
      toast({ title: "خطأ", description: "يجب إدخال وصف المصروف", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      date: form.date,
      amount: form.amount,
      description: form.description,
      category: form.category,
      accountId: form.accountId ? Number(form.accountId) : null,
      treasuryAccountId: form.treasuryAccountId ? Number(form.treasuryAccountId) : null,
    });
  };

  const filteredExpenses = expensesList?.filter((exp) => {
    if (dateFrom && exp.date < dateFrom) return false;
    if (dateTo && exp.date > dateTo) return false;
    return true;
  });

  const totalFiltered = filteredExpenses?.reduce(
    (sum, exp) => sum + parseFloat(exp.amount || "0"),
    0
  ) || 0;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4" dir="rtl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 overflow-auto h-full" dir="rtl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-expenses-title">
          <Receipt className="w-6 h-6" /> المصروفات
        </h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-expense">
              <Plus className="w-4 h-4 ml-1" /> مصروف جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg" dir="rtl">
            <DialogHeader>
              <DialogTitle>مصروف جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>التاريخ</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                    data-testid="input-expense-date"
                  />
                </div>
                <div>
                  <Label>المبلغ</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                    data-testid="input-expense-amount"
                  />
                </div>
              </div>
              <div>
                <Label>الوصف</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                  data-testid="input-expense-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>التصنيف</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v })}
                  >
                    <SelectTrigger data-testid="select-expense-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>حساب المصروف</Label>
                  <Select
                    value={form.accountId}
                    onValueChange={(v) => setForm({ ...form, accountId: v })}
                  >
                    <SelectTrigger data-testid="select-expense-account">
                      <SelectValue placeholder="اختر الحساب" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseAccounts?.map((acc) => (
                        <SelectItem key={acc.id} value={String(acc.id)}>
                          {acc.code} - {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>حساب الخزينة</Label>
                <Select
                  value={form.treasuryAccountId}
                  onValueChange={(v) => setForm({ ...form, treasuryAccountId: v })}
                >
                  <SelectTrigger data-testid="select-expense-treasury-account">
                    <SelectValue placeholder="اختر حساب الخزينة" />
                  </SelectTrigger>
                  <SelectContent>
                    {treasuryAccounts?.map((acc) => (
                      <SelectItem key={acc.id} value={String(acc.id)}>
                        {acc.code} - {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
                data-testid="button-submit-expense"
              >
                {createMutation.isPending ? "جاري الحفظ..." : "حفظ المصروف"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Search className="w-4 h-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap">من</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
                data-testid="input-expense-date-from"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="whitespace-nowrap">إلى</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
                data-testid="input-expense-date-to"
              />
            </div>
            {(dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setDateFrom(""); setDateTo(""); }}
                data-testid="button-clear-expense-filters"
              >
                مسح الفلتر
              </Button>
            )}
            <div className="mr-auto text-sm text-muted-foreground" data-testid="text-expenses-total">
              الإجمالي: <span className="font-bold text-foreground">{totalFiltered.toFixed(2)}</span> ج.م
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>الوصف</TableHead>
                <TableHead>التصنيف</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses && filteredExpenses.length > 0 ? (
                filteredExpenses.map((exp) => (
                  <TableRow key={exp.id} data-testid={`row-expense-${exp.id}`}>
                    <TableCell data-testid={`text-expense-date-${exp.id}`}>{exp.date}</TableCell>
                    <TableCell data-testid={`text-expense-description-${exp.id}`}>{exp.description}</TableCell>
                    <TableCell data-testid={`text-expense-category-${exp.id}`}>{exp.category}</TableCell>
                    <TableCell data-testid={`text-expense-amount-${exp.id}`}>
                      {parseFloat(exp.amount).toFixed(2)} ج.م
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(exp.id)}
                        data-testid={`button-delete-expense-${exp.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    لا توجد مصروفات
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا المصروف؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel data-testid="button-cancel-delete-expense">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              data-testid="button-confirm-delete-expense"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
