import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Check, ArrowLeftRight, Eye } from "lucide-react";
import type { StockTransferWithLines, Warehouse, ProductWithUnits } from "@shared/schema";

type TransferLineInput = {
  productId: number;
  quantity: string;
};

const emptyLine = (): TransferLineInput => ({
  productId: 0,
  quantity: "",
});

export default function StockTransfersPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewTransfer, setViewTransfer] = useState<StockTransferWithLines | null>(null);

  const [fromWarehouseId, setFromWarehouseId] = useState<string>("");
  const [toWarehouseId, setToWarehouseId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<TransferLineInput[]>([emptyLine()]);

  const { data: transfers = [], isLoading } = useQuery<StockTransferWithLines[]>({
    queryKey: ["/api/stock-transfers"],
  });

  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });

  const { data: products = [] } = useQuery<ProductWithUnits[]>({
    queryKey: ["/api/products"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/stock-transfers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-transfers"] });
      toast({ title: "تم إنشاء التحويل بنجاح" });
      resetForm();
      setOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/stock-transfers/${id}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouses"] });
      toast({ title: "تم اعتماد التحويل بنجاح" });
      setViewTransfer(null);
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/stock-transfers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-transfers"] });
      toast({ title: "تم حذف التحويل" });
      setDeleteId(null);
    },
    onError: (err: any) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setFromWarehouseId("");
    setToWarehouseId("");
    setNotes("");
    setLines([emptyLine()]);
  }

  function addLine() {
    setLines([...lines, emptyLine()]);
  }

  function removeLine(index: number) {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index));
  }

  function updateLine(index: number, field: keyof TransferLineInput, value: string) {
    const updated = [...lines];
    if (field === "productId") {
      updated[index] = { ...updated[index], productId: parseInt(value) || 0 };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setLines(updated);
  }

  function handleSubmit() {
    if (!fromWarehouseId || !toWarehouseId) {
      toast({ title: "خطأ", description: "يجب اختيار المخزن المصدر والمخزن الوجهة", variant: "destructive" });
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      toast({ title: "خطأ", description: "لا يمكن التحويل لنفس المخزن", variant: "destructive" });
      return;
    }
    const validLines = lines.filter(l => l.productId > 0 && parseFloat(l.quantity) > 0);
    if (validLines.length === 0) {
      toast({ title: "خطأ", description: "يجب إضافة منتج واحد على الأقل", variant: "destructive" });
      return;
    }

    createMutation.mutate({
      transfer: {
        fromWarehouseId: parseInt(fromWarehouseId),
        toWarehouseId: parseInt(toWarehouseId),
        notes: notes || null,
        status: "draft",
      },
      lines: validLines.map(l => ({
        productId: l.productId,
        quantity: l.quantity,
      })),
    });
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 overflow-auto h-full">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 overflow-auto h-full" dir="rtl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-bold" data-testid="text-page-title">تحويلات المخزون</h1>
        <Button onClick={() => { resetForm(); setOpen(true); }} data-testid="button-create-transfer">
          <Plus className="w-4 h-4 ml-1" />
          تحويل جديد
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">#</TableHead>
                <TableHead className="text-right">من مخزن</TableHead>
                <TableHead className="text-right">إلى مخزن</TableHead>
                <TableHead className="text-right">عدد الأصناف</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8" data-testid="text-empty-transfers">
                    لا توجد تحويلات
                  </TableCell>
                </TableRow>
              ) : (
                transfers.map((t) => (
                  <TableRow key={t.id} data-testid={`row-transfer-${t.id}`}>
                    <TableCell>{t.id}</TableCell>
                    <TableCell data-testid={`text-from-warehouse-${t.id}`}>{t.fromWarehouse?.name || "-"}</TableCell>
                    <TableCell data-testid={`text-to-warehouse-${t.id}`}>{t.toWarehouse?.name || "-"}</TableCell>
                    <TableCell>{t.lines?.length || 0}</TableCell>
                    <TableCell>
                      <Badge
                        variant={t.status === "approved" ? "default" : "secondary"}
                        data-testid={`badge-status-${t.id}`}
                      >
                        {t.status === "approved" ? "معتمد" : "مسودة"}
                      </Badge>
                    </TableCell>
                    <TableCell>{t.createdAt ? new Date(t.createdAt).toLocaleDateString("ar-EG") : "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        <Button size="sm" variant="ghost" onClick={() => setViewTransfer(t)} data-testid={`button-view-${t.id}`}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {t.status === "draft" && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => approveMutation.mutate(t.id)} data-testid={`button-approve-${t.id}`}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setDeleteId(t.id)} data-testid={`button-delete-${t.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>تحويل مخزون جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>من مخزن</Label>
                <Select value={fromWarehouseId} onValueChange={setFromWarehouseId}>
                  <SelectTrigger data-testid="select-from-warehouse">
                    <SelectValue placeholder="اختر المخزن المصدر" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => (
                      <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>إلى مخزن</Label>
                <Select value={toWarehouseId} onValueChange={setToWarehouseId}>
                  <SelectTrigger data-testid="select-to-warehouse">
                    <SelectValue placeholder="اختر المخزن الوجهة" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => (
                      <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات اختيارية"
                data-testid="input-notes"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label className="text-base font-semibold">المنتجات</Label>
                <Button size="sm" variant="outline" onClick={addLine} data-testid="button-add-line">
                  <Plus className="w-4 h-4 ml-1" />
                  إضافة صنف
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المنتج</TableHead>
                    <TableHead className="text-right">الكمية</TableHead>
                    <TableHead className="text-right w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Select
                          value={line.productId ? line.productId.toString() : ""}
                          onValueChange={(v) => updateLine(idx, "productId", v)}
                        >
                          <SelectTrigger data-testid={`select-product-${idx}`}>
                            <SelectValue placeholder="اختر المنتج" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(p => (
                              <SelectItem key={p.id} value={p.id.toString()}>
                                {p.name} ({p.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.quantity}
                          onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                          placeholder="الكمية"
                          data-testid={`input-quantity-${idx}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeLine(idx)}
                          disabled={lines.length <= 1}
                          data-testid={`button-remove-line-${idx}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              data-testid="button-submit-transfer"
            >
              {createMutation.isPending ? "جاري الحفظ..." : "إنشاء التحويل"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewTransfer} onOpenChange={() => setViewTransfer(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل التحويل #{viewTransfer?.id}</DialogTitle>
          </DialogHeader>
          {viewTransfer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">من مخزن</Label>
                  <p className="font-medium" data-testid="text-view-from">{viewTransfer.fromWarehouse?.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">إلى مخزن</Label>
                  <p className="font-medium" data-testid="text-view-to">{viewTransfer.toWarehouse?.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">الحالة</Label>
                  <p>
                    <Badge variant={viewTransfer.status === "approved" ? "default" : "secondary"} data-testid="badge-view-status">
                      {viewTransfer.status === "approved" ? "معتمد" : "مسودة"}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">التاريخ</Label>
                  <p className="font-medium">{viewTransfer.createdAt ? new Date(viewTransfer.createdAt).toLocaleDateString("ar-EG") : "-"}</p>
                </div>
              </div>
              {viewTransfer.notes && (
                <div>
                  <Label className="text-muted-foreground">ملاحظات</Label>
                  <p className="font-medium">{viewTransfer.notes}</p>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المنتج</TableHead>
                    <TableHead className="text-right">الكود</TableHead>
                    <TableHead className="text-right">الكمية</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewTransfer.lines?.map((line, idx) => (
                    <TableRow key={idx} data-testid={`row-view-line-${idx}`}>
                      <TableCell>{line.product?.name || "-"}</TableCell>
                      <TableCell>{line.product?.code || "-"}</TableCell>
                      <TableCell>{line.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {viewTransfer.status === "draft" && (
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={() => approveMutation.mutate(viewTransfer.id)}
                    disabled={approveMutation.isPending}
                    data-testid="button-approve-view"
                  >
                    <Check className="w-4 h-4 ml-1" />
                    {approveMutation.isPending ? "جاري الاعتماد..." : "اعتماد التحويل"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => { setViewTransfer(null); setDeleteId(viewTransfer.id); }}
                    data-testid="button-delete-view"
                  >
                    <Trash2 className="w-4 h-4 ml-1" />
                    حذف
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا التحويل؟</AlertDialogDescription>
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
