import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Trash2, Check, Eye, X } from "lucide-react";
import type { Account, JournalEntryWithLines } from "@shared/schema";

type LineForm = { accountId: string; debit: string; credit: string; description: string };

export default function JournalEntriesPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewEntry, setViewEntry] = useState<JournalEntryWithLines | null>(null);
  const [form, setForm] = useState({ entryNumber: "", entryDate: new Date().toISOString().split("T")[0], description: "", reference: "", status: "draft" });
  const [lines, setLines] = useState<LineForm[]>([
    { accountId: "", debit: "", credit: "", description: "" },
    { accountId: "", debit: "", credit: "", description: "" },
  ]);

  const { data: entries, isLoading } = useQuery<JournalEntryWithLines[]>({ queryKey: ["/api/journal-entries"] });
  const { data: accounts } = useQuery<Account[]>({ queryKey: ["/api/accounts"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/journal-entries", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "تم إنشاء القيد بنجاح" });
      resetForm();
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/journal-entries/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "تم اعتماد القيد بنجاح" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/journal-entries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "تم حذف القيد بنجاح" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setForm({ entryNumber: "", entryDate: new Date().toISOString().split("T")[0], description: "", reference: "", status: "draft" });
    setLines([
      { accountId: "", debit: "", credit: "", description: "" },
      { accountId: "", debit: "", credit: "", description: "" },
    ]);
    setOpen(false);
  };

  const addLine = () => {
    setLines([...lines, { accountId: "", debit: "", credit: "", description: "" }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof LineForm, value: string) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      toast({ title: "خطأ", description: "إجمالي المدين لازم يساوي إجمالي الدائن", variant: "destructive" });
      return;
    }
    const data = {
      entry: {
        entryNumber: form.entryNumber,
        entryDate: form.entryDate,
        description: form.description,
        reference: form.reference || null,
        status: "draft",
      },
      lines: lines.filter(l => l.accountId).map(l => ({
        accountId: parseInt(l.accountId),
        debit: l.debit || "0",
        credit: l.credit || "0",
        description: l.description || null,
      })),
    };
    createMutation.mutate(data);
  };

  const formatNumber = (val: string) => new Intl.NumberFormat("ar-EG", { minimumFractionDigits: 2 }).format(parseFloat(val || "0"));

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
          <h1 className="text-2xl font-bold" data-testid="text-journal-title">قيود اليومية</h1>
          <p className="text-muted-foreground">إنشاء وإدارة القيود المحاسبية</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-entry"><Plus className="w-4 h-4 ml-2" />إنشاء قيد</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>إنشاء قيد يومية جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>رقم القيد</Label>
                  <Input data-testid="input-entry-number" value={form.entryNumber} onChange={(e) => setForm({ ...form, entryNumber: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>التاريخ</Label>
                  <Input data-testid="input-entry-date" type="date" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>البيان</Label>
                  <Input data-testid="input-entry-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>المرجع</Label>
                  <Input data-testid="input-entry-reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <Label>بنود القيد</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLine} data-testid="button-add-line">
                    <Plus className="w-3 h-3 ml-1" />إضافة سطر
                  </Button>
                </div>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الحساب</TableHead>
                        <TableHead className="text-right">مدين</TableHead>
                        <TableHead className="text-right">دائن</TableHead>
                        <TableHead className="text-right">بيان</TableHead>
                        <TableHead className="text-right w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Select value={line.accountId} onValueChange={(v) => updateLine(i, "accountId", v)}>
                              <SelectTrigger data-testid={`select-line-account-${i}`}><SelectValue placeholder="اختر حساب" /></SelectTrigger>
                              <SelectContent>
                                {accounts?.filter(a => a.level >= 2).map((a) => (
                                  <SelectItem key={a.id} value={a.id.toString()}>{a.code} - {a.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input data-testid={`input-line-debit-${i}`} type="number" step="0.01" min="0" value={line.debit} onChange={(e) => updateLine(i, "debit", e.target.value)} placeholder="0.00" />
                          </TableCell>
                          <TableCell>
                            <Input data-testid={`input-line-credit-${i}`} type="number" step="0.01" min="0" value={line.credit} onChange={(e) => updateLine(i, "credit", e.target.value)} placeholder="0.00" />
                          </TableCell>
                          <TableCell>
                            <Input data-testid={`input-line-desc-${i}`} value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)} placeholder="بيان" />
                          </TableCell>
                          <TableCell>
                            {lines.length > 2 && (
                              <Button type="button" size="icon" variant="ghost" onClick={() => removeLine(i)} data-testid={`button-remove-line-${i}`}>
                                <X className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-between gap-4 text-sm font-medium p-2 rounded-md bg-muted">
                  <span>إجمالي المدين: {formatNumber(totalDebit.toFixed(2))}</span>
                  <span>إجمالي الدائن: {formatNumber(totalCredit.toFixed(2))}</span>
                  <Badge variant={isBalanced ? "default" : "destructive"}>
                    {isBalanced ? "متوازن" : "غير متوازن"}
                  </Badge>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending || !isBalanced} data-testid="button-submit-entry">
                {createMutation.isPending ? "جاري الحفظ..." : "إنشاء القيد"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {viewEntry && (
        <Dialog open={!!viewEntry} onOpenChange={() => setViewEntry(null)}>
          <DialogContent className="sm:max-w-[600px]" dir="rtl">
            <DialogHeader>
              <DialogTitle>تفاصيل القيد #{viewEntry.entryNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">التاريخ:</span> {viewEntry.entryDate}</div>
                <div><span className="text-muted-foreground">المرجع:</span> {viewEntry.reference || "-"}</div>
                <div className="col-span-2"><span className="text-muted-foreground">البيان:</span> {viewEntry.description}</div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الحساب</TableHead>
                    <TableHead className="text-right">مدين</TableHead>
                    <TableHead className="text-right">دائن</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewEntry.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.account?.code} - {line.account?.name}</TableCell>
                      <TableCell className="font-mono">{formatNumber(line.debit)}</TableCell>
                      <TableCell className="font-mono">{formatNumber(line.credit)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted">
                    <TableCell>الإجمالي</TableCell>
                    <TableCell className="font-mono">{formatNumber(viewEntry.totalDebit)}</TableCell>
                    <TableCell className="font-mono">{formatNumber(viewEntry.totalCredit)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">رقم القيد</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">البيان</TableHead>
                <TableHead className="text-right">المدين</TableHead>
                <TableHead className="text-right">الدائن</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries?.map((entry) => (
                <TableRow key={entry.id} data-testid={`row-entry-${entry.id}`}>
                  <TableCell className="font-mono">{entry.entryNumber}</TableCell>
                  <TableCell>{entry.entryDate}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">{entry.description}</TableCell>
                  <TableCell className="font-mono">{formatNumber(entry.totalDebit)}</TableCell>
                  <TableCell className="font-mono">{formatNumber(entry.totalCredit)}</TableCell>
                  <TableCell>
                    <Badge variant={entry.status === "approved" ? "default" : "secondary"}>
                      {entry.status === "approved" ? "معتمد" : "مسودة"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Button size="icon" variant="ghost" onClick={() => setViewEntry(entry)} data-testid={`button-view-entry-${entry.id}`}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {entry.status === "draft" && (
                        <Button size="icon" variant="ghost" onClick={() => approveMutation.mutate(entry.id)} data-testid={`button-approve-entry-${entry.id}`}>
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                      )}
                      {entry.status === "draft" && (
                        <Button size="icon" variant="ghost" onClick={() => setDeleteId(entry.id)} data-testid={`button-delete-entry-${entry.id}`}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!entries || entries.length === 0) && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">لا توجد قيود</TableCell></TableRow>
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
