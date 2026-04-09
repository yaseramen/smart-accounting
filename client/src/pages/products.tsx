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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Package, Barcode, Printer, Download, Upload, Factory, Settings2 } from "lucide-react";
import { Link } from "wouter";
import { exportToExcel as writeExcelFile } from "@/lib/excel";
import type { ProductWithUnits, Unit, Warehouse } from "@shared/schema";

export default function ProductsPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteUnitId, setDeleteUnitId] = useState<number | null>(null);
  const [unitOpen, setUnitOpen] = useState(false);
  const [bomOpen, setBomOpen] = useState(false);
  const [bomProduct, setBomProduct] = useState<ProductWithUnits | null>(null);
  const [bomComponents, setBomComponents] = useState<{ componentProductId: string; quantity: string }[]>([]);
  const [mfgOpen, setMfgOpen] = useState(false);
  const [mfgProduct, setMfgProduct] = useState<ProductWithUnits | null>(null);
  const [mfgForm, setMfgForm] = useState({ quantity: "1", warehouseId: "" });
  const [editProduct, setEditProduct] = useState<ProductWithUnits | null>(null);
  const [form, setForm] = useState({
    code: "", name: "", barcode: "", category: "", primaryUnitId: "", secondaryUnitId: "",
    conversionFactor: "1", hasDimensions: false, dimensionUnit: "",
    isComposite: false, reorderLevel: "0", costPrice: "0", sellPrice: "0", isActive: true,
  });
  const [unitForm, setUnitForm] = useState({ name: "", symbol: "", category: "" });

  const handlePrintBarcode = (product: ProductWithUnits) => {
    const printWindow = window.open("", "_blank", "width=300,height=200");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>باركود ${product.name}</title>
      <style>*{margin:0;padding:0;font-family:'Cairo',sans-serif}body{width:60mm;padding:3mm;text-align:center}
      .name{font-size:12px;font-weight:bold;margin-bottom:2px}.code{font-size:10px;color:#555;margin-bottom:4px}
      .barcode{font-family:monospace;font-size:20px;letter-spacing:3px;margin:6px 0}
      .barcode-num{font-size:10px;letter-spacing:1px}.price{font-size:11px;margin-top:4px;font-weight:bold}
      </style></head><body>
      <div class="name">${product.name}</div>
      <div class="code">${product.code}</div>
      <div class="barcode">||||| |||| ||||| ||||</div>
      <div class="barcode-num">${product.barcode || ""}</div>
      <div class="price">${parseFloat(product.sellPrice).toLocaleString()} ج.م</div>
      <script>window.onload=()=>{window.print();}</script></body></html>`);
    printWindow.document.close();
  };

  const { data: products, isLoading } = useQuery<ProductWithUnits[]>({ queryKey: ["/api/products"] });
  const { data: unitsList } = useQuery<Unit[]>({ queryKey: ["/api/units"] });
  const { data: warehousesList } = useQuery<Warehouse[]>({ queryKey: ["/api/warehouses"] });

  const exportToExcel = async () => {
    if (!products || products.length === 0) return;
    const data = products.map((p) => ({
      "الكود": p.code, "الاسم": p.name, "التصنيف": p.category || "",
      "الوحدة الأساسية": p.primaryUnit?.name || "", "الوحدة الثانوية": p.secondaryUnit?.name || "",
      "معامل التحويل": p.conversionFactor || "1", "سعر التكلفة": p.costPrice,
      "سعر البيع": p.sellPrice, "المخزون الحالي": p.currentStock,
      "حد إعادة الطلب": p.reorderLevel, "الباركود": p.barcode || "",
      "الحالة": p.isActive ? "نشط" : "معطل",
    }));
    await writeExcelFile(data, "المنتجات", "products.xlsx");
  };

  const downloadImportTemplate = async () => {
    const templateData = [{
      "كود المنتج": "", "اسم المنتج": "", "التصنيف": "",
      "سعر التكلفة": "", "سعر البيع": "", "حد إعادة الطلب": "", "الباركود": "",
    }];
    await writeExcelFile(templateData, "قالب المنتجات", "products_import_template.xlsx");
  };

  const fetchAutoCode = async () => {
    try {
      const res = await fetch("/api/auto/product-code");
      const data = await res.json();
      if (data.code) setForm(f => ({ ...f, code: f.code || data.code }));
    } catch {}
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "تم إضافة المنتج بنجاح" });
      resetForm();
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "تم تعديل المنتج بنجاح" });
      resetForm();
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "تم حذف المنتج بنجاح" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const createUnitMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/units", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      toast({ title: "تم إضافة الوحدة بنجاح" });
      setUnitForm({ name: "", symbol: "", category: "" });
      setUnitOpen(false);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteUnitMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/units/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      toast({ title: "تم حذف الوحدة" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const saveBomMutation = useMutation({
    mutationFn: ({ id, components }: { id: number; components: any[] }) =>
      apiRequest("PUT", `/api/products/${id}/components`, { components }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "تم حفظ مكونات المنتج" });
      setBomOpen(false);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const manufactureMutation = useMutation({
    mutationFn: ({ id, quantity, warehouseId }: { id: number; quantity: number; warehouseId: number }) =>
      apiRequest("POST", `/api/products/${id}/manufacture`, { quantity, warehouseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "تم الإنتاج بنجاح" });
      setMfgOpen(false);
    },
    onError: (err: Error) => toast({ title: "خطأ في الإنتاج", description: err.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setForm({
      code: "", name: "", barcode: "", category: "", primaryUnitId: "", secondaryUnitId: "",
      conversionFactor: "1", hasDimensions: false, dimensionUnit: "",
      isComposite: false, reorderLevel: "0", costPrice: "0", sellPrice: "0", isActive: true,
    });
    setEditProduct(null);
    setOpen(false);
  };

  const handleEdit = (product: ProductWithUnits) => {
    setEditProduct(product);
    setForm({
      code: product.code, name: product.name, barcode: product.barcode || "", category: product.category || "",
      primaryUnitId: String(product.primaryUnitId),
      secondaryUnitId: product.secondaryUnitId ? String(product.secondaryUnitId) : "",
      conversionFactor: product.conversionFactor || "1",
      hasDimensions: product.hasDimensions, dimensionUnit: product.dimensionUnit || "",
      isComposite: product.isComposite, reorderLevel: product.reorderLevel || "0",
      costPrice: product.costPrice || "0", sellPrice: product.sellPrice || "0",
      isActive: product.isActive,
    });
    setOpen(true);
  };

  const openBom = async (product: ProductWithUnits) => {
    setBomProduct(product);
    try {
      const res = await fetch(`/api/products/${product.id}/components`);
      const comps = await res.json();
      setBomComponents(comps.map((c: any) => ({
        componentProductId: String(c.componentProductId),
        quantity: c.quantity,
      })));
    } catch {
      setBomComponents([]);
    }
    setBomOpen(true);
  };

  const openManufacture = (product: ProductWithUnits) => {
    setMfgProduct(product);
    setMfgForm({ quantity: "1", warehouseId: "" });
    setMfgOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...form,
      barcode: form.barcode || null,
      primaryUnitId: Number(form.primaryUnitId),
      secondaryUnitId: form.secondaryUnitId && form.secondaryUnitId !== "none" ? Number(form.secondaryUnitId) : null,
      category: form.category || null,
      dimensionUnit: form.dimensionUnit || null,
    };
    if (editProduct) {
      updateMutation.mutate({ id: editProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const selectedPrimaryUnit = unitsList?.find(u => u.id === Number(form.primaryUnitId));
  const filteredSecondaryUnits = unitsList?.filter(u => {
    if (!selectedPrimaryUnit?.category) return true;
    return u.category === selectedPrimaryUnit.category;
  });

  const UNIT_CATEGORIES = [
    { value: "weight", label: "الوزن" },
    { value: "length", label: "الطول" },
    { value: "volume", label: "الحجم" },
    { value: "area", label: "المساحة" },
    { value: "piece", label: "القطعة" },
  ];

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
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-products-title">
          <Package className="w-6 h-6" /> المنتجات والأصناف
        </h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportToExcel} disabled={!products || products.length === 0} data-testid="button-export-products">
            <Download className="w-4 h-4 ml-1" /> تصدير Excel
          </Button>
          <Button variant="outline" onClick={downloadImportTemplate} data-testid="button-download-template">
            <Upload className="w-4 h-4 ml-1" /> قالب الاستيراد
          </Button>
          <Dialog open={unitOpen} onOpenChange={setUnitOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-add-unit">
                <Plus className="w-4 h-4 ml-1" /> وحدة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>إضافة وحدة قياس</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createUnitMutation.mutate(unitForm); }} className="space-y-4">
                <div>
                  <Label>اسم الوحدة</Label>
                  <Input value={unitForm.name} onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })} required data-testid="input-unit-name" />
                </div>
                <div>
                  <Label>الرمز</Label>
                  <Input value={unitForm.symbol} onChange={(e) => setUnitForm({ ...unitForm, symbol: e.target.value })} required data-testid="input-unit-symbol" />
                </div>
                <div>
                  <Label>الفئة</Label>
                  <Select value={unitForm.category} onValueChange={(v) => setUnitForm({ ...unitForm, category: v })}>
                    <SelectTrigger data-testid="select-unit-category">
                      <SelectValue placeholder="اختر الفئة" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={createUnitMutation.isPending} data-testid="button-save-unit">حفظ الوحدة</Button>
              </form>
              {unitsList && unitsList.length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">الوحدات الحالية</h4>
                  <div className="space-y-1">
                    {unitsList.map((u) => (
                      <div key={u.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                        <span>{u.name} ({u.symbol}) {(u as any).category ? `- ${UNIT_CATEGORIES.find(c => c.value === (u as any).category)?.label || (u as any).category}` : ""}</span>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteUnitId(u.id)} data-testid={`button-delete-unit-${u.id}`}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else if (!editProduct) fetchAutoCode(); setOpen(v); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-product">
                <Plus className="w-4 h-4 ml-1" /> منتج جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle>{editProduct ? "تعديل المنتج" : "إضافة منتج جديد"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>كود المنتج (تلقائي إذا تُرك فارغاً)</Label>
                    <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="PRD-XXXX" data-testid="input-product-code" />
                  </div>
                  <div>
                    <Label>اسم المنتج</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-testid="input-product-name" />
                  </div>
                  <div>
                    <Label>الباركود (ماسح ضوئي أو يدوي - تلقائي إذا فارغ)</Label>
                    <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="امسح الباركود أو اتركه فارغاً" data-testid="input-product-barcode" autoComplete="off" />
                  </div>
                  <div>
                    <Label>التصنيف</Label>
                    <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} data-testid="input-product-category" />
                  </div>
                  <div>
                    <Label>الوحدة الأساسية</Label>
                    <Select value={form.primaryUnitId} onValueChange={(v) => setForm({ ...form, primaryUnitId: v, secondaryUnitId: "" })}>
                      <SelectTrigger data-testid="select-primary-unit">
                        <SelectValue placeholder="اختر الوحدة" />
                      </SelectTrigger>
                      <SelectContent>
                        {unitsList?.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.symbol})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>الوحدة الثانوية (اختياري - نفس الفئة)</Label>
                    <Select value={form.secondaryUnitId} onValueChange={(v) => setForm({ ...form, secondaryUnitId: v })}>
                      <SelectTrigger data-testid="select-secondary-unit">
                        <SelectValue placeholder="بدون وحدة ثانوية" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون</SelectItem>
                        {filteredSecondaryUnits?.filter(u => String(u.id) !== form.primaryUnitId).map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.symbol})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>معامل التحويل</Label>
                    <Input type="number" step="0.0001" value={form.conversionFactor} onChange={(e) => setForm({ ...form, conversionFactor: e.target.value })} data-testid="input-conversion-factor" />
                  </div>
                  <div>
                    <Label>سعر التكلفة</Label>
                    <Input type="number" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} data-testid="input-cost-price" />
                  </div>
                  <div>
                    <Label>سعر البيع</Label>
                    <Input type="number" step="0.01" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })} data-testid="input-sell-price" />
                  </div>
                  <div>
                    <Label>حد إعادة الطلب</Label>
                    <Input type="number" step="0.01" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} data-testid="input-reorder-level" />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch checked={form.hasDimensions} onCheckedChange={(v) => setForm({ ...form, hasDimensions: v })} data-testid="switch-dimensions" />
                    <Label>منتج أبعاد (طول × عرض)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={form.isComposite} onCheckedChange={(v) => setForm({ ...form, isComposite: v })} data-testid="switch-composite" />
                    <Label>منتج مركب (BOM)</Label>
                  </div>
                </div>
                {form.hasDimensions && (
                  <div>
                    <Label>وحدة الأبعاد</Label>
                    <Select value={form.dimensionUnit} onValueChange={(v) => setForm({ ...form, dimensionUnit: v })}>
                      <SelectTrigger data-testid="select-dimension-unit">
                        <SelectValue placeholder="اختر" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="m">متر</SelectItem>
                        <SelectItem value="cm">سنتيمتر</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-product">
                  {editProduct ? "تحديث" : "إضافة"}
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
                <TableHead className="text-right">التصنيف</TableHead>
                <TableHead className="text-right">الوحدة</TableHead>
                <TableHead className="text-right">المخزون</TableHead>
                <TableHead className="text-right">سعر التكلفة</TableHead>
                <TableHead className="text-right">سعر البيع</TableHead>
                <TableHead className="text-right">الباركود</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((product) => (
                <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                  <TableCell className="font-mono">{product.code}</TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/products/${product.id}/report`} className="text-primary hover:underline cursor-pointer" data-testid={`link-product-${product.id}`}>
                      {product.name}
                    </Link>
                  </TableCell>
                  <TableCell>{product.category || "-"}</TableCell>
                  <TableCell>
                    {product.primaryUnit?.symbol || "-"}
                    {product.secondaryUnit && ` / ${product.secondaryUnit.symbol}`}
                  </TableCell>
                  <TableCell>
                    <span className={parseFloat(product.currentStock) <= parseFloat(product.reorderLevel) ? "text-destructive font-bold" : ""}>
                      {parseFloat(product.currentStock).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>{parseFloat(product.costPrice).toLocaleString()}</TableCell>
                  <TableCell>{parseFloat(product.sellPrice).toLocaleString()}</TableCell>
                  <TableCell>
                    <span className="text-xs font-mono flex items-center gap-1">
                      <Barcode className="w-3 h-3" />
                      {product.barcode || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.isActive ? "default" : "secondary"} data-testid={`badge-product-status-${product.id}`}>
                      {product.isActive ? "نشط" : "معطل"}
                    </Badge>
                    {product.hasDimensions && <Badge variant="outline" className="mr-1">أبعاد</Badge>}
                    {product.isComposite && <Badge variant="outline" className="mr-1">مركب</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(product)} data-testid={`button-edit-product-${product.id}`}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handlePrintBarcode(product)} data-testid={`button-print-barcode-${product.id}`} title="طباعة باركود">
                        <Printer className="w-4 h-4" />
                      </Button>
                      {product.isComposite && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => openBom(product)} data-testid={`button-bom-${product.id}`} title="مكونات المنتج">
                            <Settings2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openManufacture(product)} data-testid={`button-manufacture-${product.id}`} title="إنتاج">
                            <Factory className="w-4 h-4 text-green-600" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(product.id)} data-testid={`button-delete-product-${product.id}`}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!products || products.length === 0) && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    لا توجد منتجات بعد. أضف وحدات القياس أولاً ثم أضف المنتجات.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={bomOpen} onOpenChange={(v) => { if (!v) { setBomOpen(false); setBomProduct(null); } }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>مكونات المنتج: {bomProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {bomComponents.map((comp, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select value={comp.componentProductId} onValueChange={(v) => {
                  const updated = [...bomComponents];
                  updated[i].componentProductId = v;
                  setBomComponents(updated);
                }}>
                  <SelectTrigger className="flex-1" data-testid={`select-bom-product-${i}`}>
                    <SelectValue placeholder="اختر المكون" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.filter(p => p.id !== bomProduct?.id && !p.isComposite).map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="number" step="0.01" className="w-24" value={comp.quantity}
                  onChange={(e) => {
                    const updated = [...bomComponents];
                    updated[i].quantity = e.target.value;
                    setBomComponents(updated);
                  }} placeholder="الكمية" data-testid={`input-bom-qty-${i}`} />
                <Button type="button" variant="ghost" size="sm" onClick={() => setBomComponents(bomComponents.filter((_, j) => j !== i))}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => setBomComponents([...bomComponents, { componentProductId: "", quantity: "1" }])} data-testid="button-add-bom-component">
              <Plus className="w-4 h-4 ml-1" /> إضافة مكون
            </Button>
            <Button className="w-full" disabled={saveBomMutation.isPending} onClick={() => {
              if (!bomProduct) return;
              saveBomMutation.mutate({
                id: bomProduct.id,
                components: bomComponents.filter(c => c.componentProductId).map(c => ({
                  componentProductId: Number(c.componentProductId),
                  quantity: c.quantity || "1",
                })),
              });
            }} data-testid="button-save-bom">
              حفظ المكونات
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={mfgOpen} onOpenChange={(v) => { if (!v) { setMfgOpen(false); setMfgProduct(null); } }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إنتاج: {mfgProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>الكمية المطلوب إنتاجها</Label>
              <Input type="number" step="1" min="1" value={mfgForm.quantity}
                onChange={(e) => setMfgForm({ ...mfgForm, quantity: e.target.value })} data-testid="input-mfg-qty" />
            </div>
            <div>
              <Label>المخزن</Label>
              <Select value={mfgForm.warehouseId} onValueChange={(v) => setMfgForm({ ...mfgForm, warehouseId: v })}>
                <SelectTrigger data-testid="select-mfg-warehouse">
                  <SelectValue placeholder="اختر المخزن" />
                </SelectTrigger>
                <SelectContent>
                  {warehousesList?.map(w => (
                    <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={manufactureMutation.isPending || !mfgForm.warehouseId} onClick={() => {
              if (!mfgProduct) return;
              manufactureMutation.mutate({
                id: mfgProduct.id,
                quantity: Number(mfgForm.quantity),
                warehouseId: Number(mfgForm.warehouseId),
              });
            }} data-testid="button-execute-manufacture">
              <Factory className="w-4 h-4 ml-1" /> تنفيذ الإنتاج
            </Button>
          </div>
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
      <AlertDialog open={deleteUnitId !== null} onOpenChange={(v) => { if (!v) setDeleteUnitId(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من الحذف؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 flex-row-reverse">
            <AlertDialogAction data-testid="button-confirm-delete-unit" onClick={() => { if (deleteUnitId) deleteUnitMutation.mutate(deleteUnitId); setDeleteUnitId(null); }}>حذف</AlertDialogAction>
            <AlertDialogCancel data-testid="button-cancel-delete-unit">إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
