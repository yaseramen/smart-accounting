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
import type { Customer } from "@shared/schema";

export default function CustomersPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({ code: "", name: "", phone: "", email: "", address: "", taxNumber: "", isActive: true });

  const { data: customers, isLoading } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });

  const exportToExcel = async () => {
    if (!customers || customers.length === 0) return;
    const data = customers.map((c) => ({
      "الكود": c.code,
      "الاسم": c.name,
      "التليفون": c.phone || "",
      "البريد": c.email || "",
      "العنوان": c.address || "",
      "الرقم الضريبي": c.taxNumber || "",
      "الرصيد": c.balance || "0",
      "الحالة": c.isActive ? "نشط" : "غير نشط",
    }));
    await writeExcelFile(data, "العملاء", "customers.xlsx");
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/customers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "تم إضافة العميل بنجاح" });
      resetForm();
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "تم تعديل العميل بنجاح" });
      resetForm();
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "تم حذف العميل بنجاح" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const fetchAutoCode = async () => {
    try {
      const res = await fetch("/api/auto/customer-code");
      const data = await res.json();
      if (data.code) setForm(f => ({ ...f, code: f.code || data.code }));
    } catch {}
  };

  const resetForm = () => {
    setForm({ code: "", name: "", phone: "", email: "", address: "", taxNumber: "", isActive: true });
    setEditCustomer(null);
    setOpen(false);
  };

  const handleEdit = (customer: Customer) => {
    setEditCustomer(customer);
    setForm({
      code: customer.code,
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      taxNumber: customer.taxNumber || "",
      isActive: customer.isActive,
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
    if (editCustomer) {
      updateMutation.mutate({ id: editCustomer.id, data });
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
          <h1 className="text-2xl font-bold" data-testid="text-customers-title">العملاء</h1>
          <p className="text-muted-foreground">إدارة بيانات العملاء</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportToExcel} disabled={!customers || customers.length === 0} data-testid="button-export-customers">
            <Download className="w-4 h-4 ml-2" />تصدير Excel
          </Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); else if (!editCustomer) fetchAutoCode(); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-customer"><Plus className="w-4 h-4 ml-2" />إضافة عميل</Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editCustomer ? "تعديل العميل" : "إضافة عميل جديد"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>كود العميل</Label>
                  <Input data-testid="input-customer-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>اسم العميل</Label>
                  <Input data-testid="input-customer-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>رقم التليفون *</Label>
                  <Input data-testid="input-customer-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input data-testid="input-customer-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>العنوان</Label>
                <Input data-testid="input-customer-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>الرقم الضريبي</Label>
                <Input data-testid="input-customer-tax" value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit-customer">
                {createMutation.isPending || updateMutation.isPending ? "جاري الحفظ..." : editCustomer ? "تعديل" : "إضافة"}
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
              {customers?.map((customer) => (
                <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                  <TableCell className="font-mono">{customer.code}</TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/customers/${customer.id}/statement`} className="text-primary hover:underline cursor-pointer" data-testid={`link-customer-${customer.id}`}>
                      {customer.name}
                    </Link>
                  </TableCell>
                  <TableCell>{customer.phone || "-"}</TableCell>
                  <TableCell>{customer.email || "-"}</TableCell>
                  <TableCell className="font-mono">
                    {new Intl.NumberFormat("ar-EG", { minimumFractionDigits: 2 }).format(parseFloat(customer.balance || "0"))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.isActive ? "default" : "secondary"}>
                      {customer.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(customer)} data-testid={`button-edit-customer-${customer.id}`}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteId(customer.id)} data-testid={`button-delete-customer-${customer.id}`}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!customers || customers.length === 0) && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">لا يوجد عملاء</TableCell></TableRow>
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
