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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Download } from "lucide-react";
import { Link } from "wouter";
import { exportToExcel as writeExcelFile } from "@/lib/excel";
import type { Supplier } from "@shared/schema";

export default function SuppliersPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ code: "", name: "", phone: "", email: "", address: "", taxNumber: "", isActive: true });

  const { data: suppliers, isLoading } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] });

  const exportToExcel = async () => {
    if (!suppliers || suppliers.length === 0) return;
    const data = suppliers.map((s) => ({
      "الكود": s.code,
      "الاسم": s.name,
      "التليفون": s.phone || "",
      "البريد": s.email || "",
      "العنوان": s.address || "",
      "الرقم الضريبي": s.taxNumber || "",
      "الرصيد": s.balance || "0",
      "الحالة": s.isActive ? "نشط" : "غير نشط",
    }));
    await writeExcelFile(data, "الموردين", "suppliers.xlsx");
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/suppliers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "تم إضافة المورد بنجاح" });
      resetForm();
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/suppliers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "تم تعديل المورد بنجاح" });
      resetForm();
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "تم حذف المورد بنجاح" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const fetchAutoCode = async () => {
    try {
      const res = await fetch("/api/auto/supplier-code");
      const data = await res.json();
      if (data.code) setForm(f => ({ ...f, code: f.code || data.code }));
    } catch {}
  };

  const resetForm = () => {
    setForm({ code: "", name: "", phone: "", email: "", address: "", taxNumber: "", isActive: true });
    setEditSupplier(null);
    setOpen(false);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditSupplier(supplier);
    setForm({
      code: supplier.code,
      name: supplier.name,
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      taxNumber: supplier.taxNumber || "",
      isActive: supplier.isActive,
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone) {
      toast({ title: "خطأ", description: "رقم التليفون مطلوب", variant: "destructive" });
      return;
    }
    const data = {
      ...form,
      phone: form.phone,
      email: form.email || null,
      address: form.address || null,
      taxNumber: form.taxNumber || null,
    };
    if (editSupplier) {
      updateMutation.mutate({ id: editSupplier.id, data });
    } else {
      createMutation.mutate(data);
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
          <h1 className="text-2xl font-bold" data-testid="text-suppliers-title">الموردين</h1>
          <p className="text-muted-foreground">إدارة بيانات الموردين</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportToExcel} disabled={!suppliers || suppliers.length === 0} data-testid="button-export-suppliers">
            <Download className="w-4 h-4 ml-2" />تصدير Excel
          </Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); else if (!editSupplier) fetchAutoCode(); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-supplier"><Plus className="w-4 h-4 ml-2" />إضافة مورد</Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editSupplier ? "تعديل المورد" : "إضافة مورد جديد"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>كود المورد</Label>
                  <Input data-testid="input-supplier-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>اسم المورد</Label>
                  <Input data-testid="input-supplier-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>رقم التليفون *</Label>
                  <Input data-testid="input-supplier-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input data-testid="input-supplier-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>العنوان</Label>
                <Input data-testid="input-supplier-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>الرقم الضريبي</Label>
                <Input data-testid="input-supplier-tax" value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-supplier">
                {createMutation.isPending || updateMutation.isPending ? "جاري الحفظ..." : editSupplier ? "تعديل" : "إضافة"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الكود</TableHead>
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">التليفون</TableHead>
                <TableHead className="text-right">البريد</TableHead>
                <TableHead className="text-right">الرصيد</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers?.map((supplier) => (
                <TableRow key={supplier.id} data-testid={`row-supplier-${supplier.id}`}>
                  <TableCell className="font-mono">{supplier.code}</TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/suppliers/${supplier.id}/statement`} className="text-primary hover:underline cursor-pointer" data-testid={`link-supplier-${supplier.id}`}>
                      {supplier.name}
                    </Link>
                  </TableCell>
                  <TableCell>{supplier.phone || "-"}</TableCell>
                  <TableCell>{supplier.email || "-"}</TableCell>
                  <TableCell className="font-mono">
                    {new Intl.NumberFormat("ar-EG", { minimumFractionDigits: 2 }).format(parseFloat(supplier.balance || "0"))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={supplier.isActive ? "default" : "secondary"}>
                      {supplier.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(supplier)} data-testid={`button-edit-supplier-${supplier.id}`}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(supplier.id)} data-testid={`button-delete-supplier-${supplier.id}`}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!suppliers || suppliers.length === 0) && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">لا يوجد موردين</TableCell></TableRow>
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
