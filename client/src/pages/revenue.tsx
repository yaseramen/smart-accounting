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
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, TrendingUp, Filter, X } from "lucide-react";
import type { Revenue, Account } from "@shared/schema";

const REVENUE_CATEGORIES = [
  "مبيعات",
  "خدمات",
  "إيجارات",
  "عمولات",
  "أرباح استثمارات",
  "أخرى",
];

export default function RevenuePage() {
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

  const { data: revenues, isLoading } = useQuery<Revenue[]>({
    queryKey: ["/api/revenues"],
  });

  const { data: accounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const revenueAccounts = accounts?.filter(a => a.type === "revenue" || a.type === "إيرادات") || [];
  const treasuryAccounts = accounts?.filter(a =>
    a.code?.startsWith("111") || a.type === "asset" || a.type === "أصول متداولة" || a.name?.includes("صندوق") || a.name?.includes("خزينة") || a.name?.includes("بنك")
  ) || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/revenues", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/revenues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/treasury"] });
      toast({ title: "تم إضافة الإيراد بنجاح" });
      resetForm();
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/revenues/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/revenues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/treasury"] });
      toast({ title: "تم حذف الإيراد" });
      setDeleteId(null);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
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
      toast({ title: "خطأ", description: "يرجى إدخال مبلغ صحيح", variant: "destructive" });
      return;
    }
    if (!form.description.trim()) {
      toast({ title: "خطأ", description: "يرجى إدخال وصف الإيراد", variant: "destructive" });
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

  const filteredRevenues = revenues?.filter(r => {
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    return true;
  }) || [];

  const totalAmount = filteredRevenues.reduce((sum, r) => sum + parseFloat(r.amount || "0"), 0);

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
  };

  const hasFilters = dateFrom || dateTo;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4" dir="rtl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 overflow-auto h-full" dir="rtl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-revenue-title">
          <TrendingUp className="w-6 h-6" /> الإيرادات
        </h1>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-revenue"><Plus className="w-4 h-4 ml-1" /> إيراد جديد</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>إيراد جديد</DialogTitle>
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
                    data-testid="input-revenue-date"
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
                    data-testid="input-revenue-amount"
                  />
                </div>
              </div>

              <div>
                <Label>الوصف</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                  data-testid="input-revenue-description"
                />
              </div>

              <div>
                <Label>التصنيف</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger data-testid="select-revenue-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REVENUE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>حساب الإيرادات</Label>
                <Select value={form.accountId} onValueChange={(v) => setForm({ ...form, accountId: v })}>
                  <SelectTrigger data-testid="select-revenue-account">
                    <SelectValue placeholder="اختر حساب الإيرادات" />
                  </SelectTrigger>
                  <SelectContent>
                    {revenueAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={String(acc.id)}>
                        {acc.code} - {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>حساب الخزينة</Label>
                <Select value={form.treasuryAccountId} onValueChange={(v) => setForm({ ...form, treasuryAccountId: v })}>
                  <SelectTrigger data-testid="select-treasury-account">
                    <SelectValue placeholder="اختر حساب الخزينة" />
                  </SelectTrigger>
                  <SelectContent>
                    {treasuryAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={String(acc.id)}>
                        {acc.code} - {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-revenue">
                {createMutation.isPending ? "جاري الحفظ..." : "حفظ الإيراد"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">إجمالي الإيرادات:</span>
            <span className="text-xl font-bold" data-testid="text-revenue-total">
              {totalAmount.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} ج.م
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">من:</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-auto"
                data-testid="input-filter-date-from"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">إلى:</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-auto"
                data-testid="input-filter-date-to"
              />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                <X className="w-4 h-4 ml-1" /> مسح
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">الوصف</TableHead>
                <TableHead className="text-right">التصنيف</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRevenues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    لا توجد إيرادات
                  </TableCell>
                </TableRow>
              ) : (
                filteredRevenues.map((revenue) => (
                  <TableRow key={revenue.id} data-testid={`row-revenue-${revenue.id}`}>
                    <TableCell data-testid={`text-revenue-date-${revenue.id}`}>{revenue.date}</TableCell>
                    <TableCell data-testid={`text-revenue-description-${revenue.id}`}>{revenue.description}</TableCell>
                    <TableCell data-testid={`text-revenue-category-${revenue.id}`}>{revenue.category}</TableCell>
                    <TableCell data-testid={`text-revenue-amount-${revenue.id}`}>
                      {parseFloat(revenue.amount).toLocaleString("ar-EG", { minimumFractionDigits: 2 })} ج.م
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(revenue.id)}
                        data-testid={`button-delete-revenue-${revenue.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا الإيراد؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel data-testid="button-cancel-delete">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              data-testid="button-confirm-delete"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
