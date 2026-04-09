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
import { Plus, Trash2, Edit, Warehouse as WarehouseIcon, Eye } from "lucide-react";
import type { Warehouse, WarehouseStockWithProduct } from "@shared/schema";

export default function WarehousesPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [stockOpen, setStockOpen] = useState(false);
  const [editWarehouse, setEditWarehouse] = useState<Warehouse | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", code: "", address: "", isActive: true });

  const { data: warehousesList, isLoading } = useQuery<Warehouse[]>({ queryKey: ["/api/warehouses"] });
  const { data: stockData } = useQuery<WarehouseStockWithProduct[]>({
    queryKey: ["/api/warehouses", selectedWarehouseId, "stock"],
    queryFn: () => fetch(`/api/warehouses/${selectedWarehouseId}/stock`).then(r => r.json()),
    enabled: !!selectedWarehouseId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/warehouses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
      toast({ title: "تم إضافة المخزن بنجاح" });
      resetForm();
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/warehouses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
      toast({ title: "تم تعديل المخزن بنجاح" });
      resetForm();
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/warehouses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
      toast({ title: "تم حذف المخزن بنجاح" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setForm({ name: "", code: "", address: "", isActive: true });
    setEditWarehouse(null);
    setOpen(false);
  };

  const handleEdit = (wh: Warehouse) => {
    setEditWarehouse(wh);
    setForm({ name: wh.name, code: wh.code, address: wh.address || "", isActive: wh.isActive });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...form, address: form.address || null };
    if (editWarehouse) {
      updateMutation.mutate({ id: editWarehouse.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-warehouses-title">
          <WarehouseIcon className="w-6 h-6" /> المخازن
        </h1>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-warehouse"><Plus className="w-4 h-4 ml-1" /> مخزن جديد</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>{editWarehouse ? "تعديل المخزن" : "إضافة مخزن جديد"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>كود المخزن</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required data-testid="input-warehouse-code" />
              </div>
              <div>
                <Label>اسم المخزن</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-testid="input-warehouse-name" />
              </div>
              <div>
                <Label>العنوان</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} data-testid="input-warehouse-address" />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-warehouse">
                {editWarehouse ? "تحديث" : "إضافة"}
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
                <TableHead className="text-right">العنوان</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehousesList?.map((wh) => (
                <TableRow key={wh.id} data-testid={`row-warehouse-${wh.id}`}>
                  <TableCell className="font-mono">{wh.code}</TableCell>
                  <TableCell className="font-medium">{wh.name}</TableCell>
                  <TableCell>{wh.address || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={wh.isActive ? "default" : "secondary"}>
                      {wh.isActive ? "نشط" : "معطل"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedWarehouseId(wh.id); setStockOpen(true); }} data-testid={`button-view-stock-${wh.id}`}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(wh)} data-testid={`button-edit-warehouse-${wh.id}`}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(wh.id)} data-testid={`button-delete-warehouse-${wh.id}`}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!warehousesList || warehousesList.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    لا توجد مخازن بعد
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>أرصدة المخزن</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">المنتج</TableHead>
                <TableHead className="text-right">الكمية</TableHead>
                <TableHead className="text-right">الوحدة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockData?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.product?.name || "-"}</TableCell>
                  <TableCell>{parseFloat(item.quantity).toLocaleString()}</TableCell>
                  <TableCell>{item.product?.primaryUnit?.symbol || "-"}</TableCell>
                </TableRow>
              ))}
              {(!stockData || stockData.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    لا توجد أرصدة في هذا المخزن
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
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
