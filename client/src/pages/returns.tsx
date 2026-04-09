import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { escapeHtml } from "@/lib/utils";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Check, Eye, Undo2, Printer, Download, FileDown } from "lucide-react";
import { exportToExcel as writeExcelFile } from "@/lib/excel";
import type { InvoiceWithLines, Customer, Supplier, ProductWithUnits, Warehouse, Unit, Company } from "@shared/schema";

type InvoiceLine = {
  lineType: "product" | "service";
  productId: number; warehouseId: number | null; quantity: string; unitId: number;
  unitPrice: string; length: string; width: string; effectiveQuantity: string;
  discount: string; taxAmount: string; total: string; description: string;
};

const paymentTypeLabels: Record<string, string> = { paid: "مدفوعة", deferred: "آجلة", partial: "مدفوع جزئياً" };
const paymentMethodLabels: Record<string, string> = { cash: "نقدي", vodafone_cash: "فودافون كاش", instapay: "انستاباي", bank_transfer: "تحويل بنكي", check: "شيك", other: "أخرى" };

function calcLineTotal(line: InvoiceLine, product?: ProductWithUnits) {
  if (line.lineType === "service") {
    const qty = parseFloat(line.quantity) || 0;
    const price = parseFloat(line.unitPrice) || 0;
    const disc = parseFloat(line.discount) || 0;
    const total = qty * price - disc;
    return { effectiveQty: qty.toFixed(4), total: total.toFixed(2), area: null };
  }
  let qty = parseFloat(line.quantity) || 0;
  let effectiveQty = qty;
  if (product?.hasDimensions) {
    const l = parseFloat(line.length) || 0;
    const w = parseFloat(line.width) || 0;
    effectiveQty = qty * l * w;
  } else if (product?.secondaryUnitId && line.unitId === product.secondaryUnitId) {
    const factor = parseFloat(product.conversionFactor || "1");
    effectiveQty = qty / factor;
  }
  const price = parseFloat(line.unitPrice) || 0;
  const disc = parseFloat(line.discount) || 0;
  const tax = parseFloat(line.taxAmount) || 0;
  const subtotal = qty * price;
  const total = subtotal - disc + tax;
  return { effectiveQty: effectiveQty.toFixed(4), total: total.toFixed(2), area: product?.hasDimensions ? (parseFloat(line.length || "0") * parseFloat(line.width || "0")).toFixed(4) : null };
}

export default function ReturnsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"sale_return" | "purchase_return">("sale_return");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewInvoice, setViewInvoice] = useState<InvoiceWithLines | null>(null);
  const [selectedOriginalInvoice, setSelectedOriginalInvoice] = useState<string>("");
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: "", invoiceDate: new Date().toISOString().split("T")[0],
    customerId: "", supplierId: "", notes: "", reference: "",
    discountAmount: "0", discountPercent: "0", taxPercent: "0",
    extraCosts: "0", extraCostsDescription: "",
    paymentType: "paid" as string,
    paymentMethod: "cash" as string,
    paidAmount: "0",
  });
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [hasDraft, setHasDraft] = useState(false);

  const saveDraft = useCallback(() => {
    if (!open) return;
    const draft = { invoiceForm, lines, activeTab, savedAt: Date.now() };
    localStorage.setItem("return_invoice_draft", JSON.stringify(draft));
  }, [invoiceForm, lines, open, activeTab]);

  useEffect(() => { saveDraft(); }, [saveDraft]);

  useEffect(() => {
    const saved = localStorage.getItem("return_invoice_draft");
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.lines?.length > 0 || draft.invoiceForm?.invoiceNumber) {
          setHasDraft(true);
        }
      } catch {}
    }
  }, []);

  const restoreDraft = () => {
    const saved = localStorage.getItem("return_invoice_draft");
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        setInvoiceForm({ ...invoiceForm, ...draft.invoiceForm });
        setLines(draft.lines || []);
        if (draft.activeTab) setActiveTab(draft.activeTab);
      } catch {}
    }
    setHasDraft(false);
    setOpen(true);
  };

  const discardDraft = () => {
    localStorage.removeItem("return_invoice_draft");
    setHasDraft(false);
  };

  const { data: saleReturnsList, isLoading: saleReturnsLoading } = useQuery<InvoiceWithLines[]>({
    queryKey: ["/api/invoices?type=sale_return"],
  });
  const { data: purchaseReturnsList, isLoading: purchaseReturnsLoading } = useQuery<InvoiceWithLines[]>({
    queryKey: ["/api/invoices?type=purchase_return"],
  });
  const { data: saleInvoices } = useQuery<InvoiceWithLines[]>({ queryKey: ["/api/invoices?type=sale"] });
  const { data: purchaseInvoices } = useQuery<InvoiceWithLines[]>({ queryKey: ["/api/invoices?type=purchase"] });
  const { data: customers } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  const { data: suppliers } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] });
  const { data: productsList } = useQuery<ProductWithUnits[]>({ queryKey: ["/api/products"] });
  const { data: warehousesList } = useQuery<Warehouse[]>({ queryKey: ["/api/warehouses"] });
  const { data: unitsList } = useQuery<Unit[]>({ queryKey: ["/api/units"] });
  const { data: company } = useQuery<Company>({ queryKey: ["/api/companies/current"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/invoices", data);
      const invoice = await res.json();
      await apiRequest("PATCH", `/api/invoices/${invoice.id}/approve`);
      const approvedRes = await fetch(`/api/invoices/${invoice.id}`);
      const approvedInvoice = await approvedRes.json();
      return approvedInvoice;
    },
    onSuccess: (approvedInvoice: InvoiceWithLines) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices?type=sale_return"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices?type=purchase_return"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "تم حفظ واعتماد فاتورة المرتجع بنجاح" });
      resetForm();
      handlePrint(approvedInvoice);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/invoices/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices?type=sale_return"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices?type=purchase_return"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "تم اعتماد فاتورة المرتجع بنجاح" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices?type=sale_return"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices?type=purchase_return"] });
      toast({ title: "تم حذف فاتورة المرتجع" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const fetchAutoInvoiceNumber = async () => {
    try {
      const res = await fetch(`/api/auto/invoice-number?type=${activeTab}`);
      const data = await res.json();
      if (data.number) setInvoiceForm(f => ({ ...f, invoiceNumber: f.invoiceNumber || data.number }));
    } catch {}
  };

  const resetForm = () => {
    setInvoiceForm({
      invoiceNumber: "", invoiceDate: new Date().toISOString().split("T")[0],
      customerId: "", supplierId: "", notes: "", reference: "",
      discountAmount: "0", discountPercent: "0", taxPercent: "0",
      extraCosts: "0", extraCostsDescription: "",
      paymentType: "paid", paymentMethod: "cash", paidAmount: "0",
    });
    setLines([]);
    setSelectedOriginalInvoice("");
    setOpen(false);
    localStorage.removeItem("return_invoice_draft");
  };

  const loadFromOriginalInvoice = (invoiceId: string) => {
    setSelectedOriginalInvoice(invoiceId);
    if (!invoiceId) return;
    const sourceList = activeTab === "sale_return" ? saleInvoices : purchaseInvoices;
    const original = sourceList?.find(inv => inv.id === Number(invoiceId));
    if (!original) return;

    setInvoiceForm(prev => ({
      ...prev,
      customerId: original.customerId ? String(original.customerId) : "",
      supplierId: original.supplierId ? String(original.supplierId) : "",
      reference: original.invoiceNumber,
      notes: `مرتجع من فاتورة رقم ${original.invoiceNumber}`,
    }));

    const newLines: InvoiceLine[] = original.lines
      .filter(l => l.lineType === "product" && l.productId)
      .map(l => ({
        lineType: "product" as const,
        productId: l.productId!,
        warehouseId: l.warehouseId,
        quantity: l.quantity,
        unitId: l.unitId || 0,
        unitPrice: l.unitPrice,
        length: l.length || "",
        width: l.width || "",
        effectiveQuantity: l.effectiveQuantity,
        discount: l.discount || "0",
        taxAmount: l.taxAmount || "0",
        total: l.total,
        description: l.description || "",
      }));
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, {
      lineType: "product",
      productId: 0, warehouseId: null, quantity: "1", unitId: 0,
      unitPrice: "0", length: "", width: "", effectiveQuantity: "1",
      discount: "0", taxAmount: "0", total: "0", description: "",
    }]);
  };

  const updateLine = (index: number, field: string, value: any) => {
    const updated = [...lines];
    (updated[index] as any)[field] = value;
    if (field === "productId") {
      const product = productsList?.find(p => p.id === Number(value));
      if (product) {
        updated[index].unitId = product.primaryUnitId;
        updated[index].unitPrice = activeTab === "sale_return" ? product.sellPrice : product.costPrice;
      }
    }
    const product = productsList?.find(p => p.id === updated[index].productId);
    const calc = calcLineTotal(updated[index], product);
    updated[index].effectiveQuantity = calc.effectiveQty;
    updated[index].total = calc.total;
    setLines(updated);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const subtotal = lines.reduce((s, l) => s + parseFloat(l.total || "0"), 0);
  const extraCosts = parseFloat(invoiceForm.extraCosts) || 0;
  const discountAmt = parseFloat(invoiceForm.discountAmount) || (subtotal * (parseFloat(invoiceForm.discountPercent) || 0) / 100);
  const afterDiscount = subtotal - discountAmt + extraCosts;
  const rawServiceFee = afterDiscount * 0.0005;
  const serviceFee = afterDiscount > 0 ? Math.max(rawServiceFee, 0.50) : 0;
  const afterFee = afterDiscount + serviceFee;
  const taxAmt = afterFee * (parseFloat(invoiceForm.taxPercent) || 0) / 100;
  const grandTotal = afterFee + taxAmt;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) {
      toast({ title: "خطأ", description: "أضف بند واحد على الأقل", variant: "destructive" });
      return;
    }
    const paidAmt = invoiceForm.paymentType === "paid" ? grandTotal.toFixed(2) : invoiceForm.paymentType === "deferred" ? "0" : invoiceForm.paidAmount || "0";
    createMutation.mutate({
      invoice: {
        invoiceNumber: invoiceForm.invoiceNumber,
        invoiceDate: invoiceForm.invoiceDate,
        type: activeTab,
        customerId: activeTab === "sale_return" && invoiceForm.customerId && invoiceForm.customerId !== "none" ? Number(invoiceForm.customerId) : null,
        supplierId: activeTab === "purchase_return" && invoiceForm.supplierId && invoiceForm.supplierId !== "none" ? Number(invoiceForm.supplierId) : null,
        subtotal: subtotal.toFixed(2),
        discountAmount: discountAmt.toFixed(2),
        discountPercent: invoiceForm.discountPercent || "0",
        taxAmount: taxAmt.toFixed(2),
        taxPercent: invoiceForm.taxPercent || "0",
        serviceFee: serviceFee.toFixed(2),
        extraCosts: extraCosts.toFixed(2),
        extraCostsDescription: invoiceForm.extraCostsDescription || null,
        total: grandTotal.toFixed(2),
        paidAmount: paidAmt,
        paymentType: invoiceForm.paymentType,
        paymentMethod: invoiceForm.paymentMethod,
        status: "draft",
        notes: invoiceForm.notes || null,
        reference: invoiceForm.reference || null,
        qrData: null,
      },
      lines: lines.map(l => ({
        lineType: l.lineType,
        productId: l.productId ? Number(l.productId) : null,
        warehouseId: l.warehouseId ? Number(l.warehouseId) : null,
        quantity: l.quantity,
        unitId: l.unitId ? Number(l.unitId) : null,
        unitPrice: l.unitPrice,
        description: l.description || null,
        length: l.length || null,
        width: l.width || null,
        area: l.length && l.width ? (parseFloat(l.length) * parseFloat(l.width)).toFixed(4) : null,
        effectiveQuantity: l.effectiveQuantity,
        discount: l.discount || "0",
        taxAmount: l.taxAmount || "0",
        total: l.total,
      })),
    });
  };

  const exportToExcel = async (list: InvoiceWithLines[], typeName: string) => {
    if (!list || list.length === 0) return;
    const data = list.map((inv) => ({
      "رقم الفاتورة": inv.invoiceNumber,
      "التاريخ": inv.invoiceDate,
      "المرجع": inv.reference || "",
      "الإجمالي الفرعي": inv.subtotal,
      "الخصم": inv.discountAmount,
      "الضريبة": inv.taxAmount,
      "الإجمالي": inv.total,
      "الحالة": inv.status === "approved" ? "معتمدة" : "مسودة",
    }));
    await writeExcelFile(data, typeName, `${typeName}.xlsx`);
  };

  const handlePrint = (inv: InvoiceWithLines) => {
    const printWindow = window.open("", "_blank", "width=300,height=600");
    if (!printWindow) return;
    const typeName = inv.type === "sale_return" ? "مرتجع مبيعات" : "مرتجع مشتريات";
    const partyName = inv.type === "sale_return" ? (inv.customer?.name || "بدون") : (inv.supplier?.name || "بدون");
    const partyLabel = inv.type === "sale_return" ? "العميل" : "المورد";
    const linesHtml = inv.lines.map(l =>
      `<tr><td>${l.product?.name || l.description || ""}</td><td>${l.quantity}</td><td>${l.unitPrice}</td><td>${l.total}</td></tr>`
    ).join("");
    const companyName = company?.name || "aiverce محاسب";
    const companyPhoneVal = company?.phone || "";
    const companyTax = company?.taxNumber || "";
    const companyReg = company?.commercialRegistration || "";
    printWindow.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>فاتورة ${typeName}</title>
      <style>*{margin:0;padding:0;font-family:'Cairo',sans-serif;font-size:12px}body{width:80mm;padding:4mm}
      .center{text-align:center}.bold{font-weight:bold}table{width:100%;border-collapse:collapse;margin:4px 0}
      td,th{border-bottom:1px dashed #000;padding:2px;text-align:right}.total{font-size:14px;font-weight:bold;border-top:2px solid #000;padding-top:4px;margin-top:4px}
      hr{border:none;border-top:1px dashed #000;margin:4px 0}.footer{margin-top:8px;font-size:9px;color:#666;text-align:center;border-top:1px dashed #999;padding-top:4px}</style></head><body>
      <div class="center bold" style="font-size:16px">${companyName}</div>
      ${companyPhoneVal ? `<div class="center" style="font-size:10px">هاتف: ${companyPhoneVal}</div>` : ""}
      ${companyTax ? `<div class="center" style="font-size:10px">الرقم الضريبي: ${companyTax}</div>` : ""}
      ${companyReg ? `<div class="center" style="font-size:10px">السجل التجاري: ${companyReg}</div>` : ""}
      <hr><div class="center bold">فاتورة ${typeName}</div>
      <hr><div>رقم الفاتورة: ${inv.invoiceNumber}</div><div>التاريخ: ${inv.invoiceDate}</div>
      ${inv.reference ? `<div>مرجع الفاتورة الأصلية: ${inv.reference}</div>` : ""}
      <div>${partyLabel}: ${partyName}</div><hr>
      <table><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>${linesHtml}</table>
      <hr>
      <div>الإجمالي الفرعي: ${inv.subtotal}</div>
      ${parseFloat(inv.discountAmount) > 0 ? `<div>الخصم: ${inv.discountAmount}</div>` : ""}
      ${parseFloat(inv.serviceFee || "0") > 0 ? `<div>خدمة رقمية (0.05%): ${inv.serviceFee}</div>` : ""}
      ${parseFloat(inv.taxAmount) > 0 ? `<div>الضريبة: ${inv.taxAmount}</div>` : ""}
      <div class="total center">الإجمالي: ${inv.total} ج.م</div>
      ${inv.notes ? `<hr><div style="font-size:10px"><strong>ملاحظات:</strong> ${inv.notes}</div>` : ""}
      <hr><div class="center" style="margin-top:4px">شكراً لتعاملكم معنا</div>
      <div class="footer">تم التنفيذ بواسطة شركة efct للبرمجة<br>هاتف: 01009376052 - 01556660502<br>إيميل: santws1@gmail.com</div>
      <script>window.onload=()=>{window.print();}</script></body></html>`);
    printWindow.document.close();
  };

  const handleExportPDF = (inv: InvoiceWithLines) => {
    const pdfWindow = window.open("", "_blank");
    if (!pdfWindow) return;
    const typeName = inv.type === "sale_return" ? "مرتجع مبيعات" : "مرتجع مشتريات";
    const partyName = escapeHtml(inv.type === "sale_return" ? inv.customer?.name : inv.supplier?.name) || "بدون";
    const partyLabel = inv.type === "sale_return" ? "العميل" : "المورد";
    const linesHtml = inv.lines.map((l, idx) =>
      `<tr><td>${idx + 1}</td><td>${escapeHtml(l.product?.name || l.description)}</td><td>${l.quantity} ${escapeHtml(l.unit?.symbol)}</td><td>${l.unitPrice}</td><td>${parseFloat(l.discount || "0").toFixed(2)}</td><td>${l.total}</td></tr>`
    ).join("");
    const companyNameVal = escapeHtml(company?.name);
    const companyPhoneVal = escapeHtml(company?.phone);
    const companyTaxVal = escapeHtml(company?.taxNumber);
    const companyRegVal = escapeHtml(company?.commercialRegistration);
    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>فاتورة ${typeName} ${inv.invoiceNumber}</title>
    <style>
      @page{size:A4;margin:15mm}
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Cairo','Segoe UI',Tahoma,sans-serif;font-size:13px;color:#222;line-height:1.6;padding:20px}
      .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #333;padding-bottom:12px;margin-bottom:16px}
      .company-info{text-align:right}
      .company-name{font-size:22px;font-weight:bold;color:#111}
      .company-detail{font-size:11px;color:#555}
      .invoice-title{font-size:20px;font-weight:bold;color:#333;text-align:left}
      .invoice-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;padding:10px;background:#f8f9fa;border-radius:6px}
      .invoice-meta div{font-size:12px}
      .invoice-meta strong{color:#333}
      table{width:100%;border-collapse:collapse;margin-bottom:16px}
      th{background:#333;color:#fff;padding:8px 10px;text-align:right;font-size:12px}
      td{padding:7px 10px;border-bottom:1px solid #e0e0e0;font-size:12px}
      tr:nth-child(even){background:#f9f9f9}
      .totals{margin-top:8px;border-top:2px solid #333;padding-top:10px}
      .totals-row{display:flex;justify-content:space-between;padding:3px 0;font-size:13px}
      .totals-row.grand{font-size:16px;font-weight:bold;border-top:1px solid #ccc;padding-top:8px;margin-top:4px}
      .notes{margin-top:12px;padding:8px;background:#fff8e1;border-right:3px solid #ffc107;font-size:11px}
      .footer{margin-top:20px;text-align:center;font-size:9px;color:#999;border-top:1px solid #eee;padding-top:8px}
      @media print{body{padding:0}.no-print{display:none!important}}
    </style></head><body>
    <div class="header">
      <div class="company-info">
        <div class="company-name">${companyNameVal}</div>
        ${companyPhoneVal ? `<div class="company-detail">هاتف: ${companyPhoneVal}</div>` : ""}
        ${companyTaxVal ? `<div class="company-detail">الرقم الضريبي: ${companyTaxVal}</div>` : ""}
        ${companyRegVal ? `<div class="company-detail">السجل التجاري: ${companyRegVal}</div>` : ""}
      </div>
      <div class="invoice-title">فاتورة ${typeName}</div>
    </div>
    <div class="invoice-meta">
      <div><strong>رقم الفاتورة:</strong> ${inv.invoiceNumber}</div>
      <div><strong>التاريخ:</strong> ${inv.invoiceDate}</div>
      <div><strong>${partyLabel}:</strong> ${partyName}</div>
      <div><strong>الحالة:</strong> ${inv.status === "approved" ? "معتمدة" : "مسودة"}</div>
      ${inv.reference ? `<div><strong>مرجع الفاتورة الأصلية:</strong> ${escapeHtml(inv.reference)}</div>` : ""}
    </div>
    <table>
      <thead><tr><th>#</th><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الخصم</th><th>الإجمالي</th></tr></thead>
      <tbody>${linesHtml}</tbody>
    </table>
    <div class="totals">
      <div class="totals-row"><span>الإجمالي الفرعي</span><span>${inv.subtotal} ج.م</span></div>
      ${parseFloat(inv.discountAmount) > 0 ? `<div class="totals-row"><span>الخصم</span><span>-${inv.discountAmount} ج.م</span></div>` : ""}
      ${parseFloat(inv.serviceFee || "0") > 0 ? `<div class="totals-row"><span>خدمة رقمية (0.05%)</span><span>${inv.serviceFee} ج.م</span></div>` : ""}
      ${parseFloat(inv.taxAmount) > 0 ? `<div class="totals-row"><span>الضريبة</span><span>${inv.taxAmount} ج.م</span></div>` : ""}
      <div class="totals-row grand"><span>الإجمالي النهائي</span><span>${inv.total} ج.م</span></div>
    </div>
    ${inv.notes ? `<div class="notes"><strong>ملاحظات:</strong> ${escapeHtml(inv.notes)}</div>` : ""}
    <div class="footer">تم التنفيذ بواسطة شركة efct للبرمجة | هاتف: 01009376052 - 01556660502 | إيميل: santws1@gmail.com</div>
    <script>window.onload=()=>{window.print();}</script>
    </body></html>`;
    pdfWindow.document.write(html);
    pdfWindow.document.close();
  };

  const currentList = activeTab === "sale_return" ? saleReturnsList : purchaseReturnsList;
  const isLoading = activeTab === "sale_return" ? saleReturnsLoading : purchaseReturnsLoading;
  const originalInvoices = activeTab === "sale_return"
    ? (saleInvoices?.filter(inv => inv.status === "approved") || [])
    : (purchaseInvoices?.filter(inv => inv.status === "approved") || []);

  if (isLoading) {
    return <div className="p-6 space-y-4" dir="rtl"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="p-6 space-y-4 overflow-auto h-full" dir="rtl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-returns-title">
          <Undo2 className="w-6 h-6" /> المرتجعات
        </h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => exportToExcel(currentList || [], activeTab === "sale_return" ? "مرتجعات_مبيعات" : "مرتجعات_مشتريات")} disabled={!currentList || currentList.length === 0} data-testid="button-export-returns">
            <Download className="w-4 h-4 ml-1" /> تصدير Excel
          </Button>
          <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else fetchAutoInvoiceNumber(); setOpen(v); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-return"><Plus className="w-4 h-4 ml-1" /> مرتجع جديد</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle>{activeTab === "sale_return" ? "مرتجع مبيعات جديد" : "مرتجع مشتريات جديد"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>رقم فاتورة المرتجع</Label>
                    <Input value={invoiceForm.invoiceNumber} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })} required data-testid="input-return-number" />
                  </div>
                  <div>
                    <Label>التاريخ</Label>
                    <Input type="date" value={invoiceForm.invoiceDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })} required data-testid="input-return-date" />
                  </div>
                  <div>
                    <Label>الفاتورة الأصلية (اختياري)</Label>
                    <Select value={selectedOriginalInvoice} onValueChange={loadFromOriginalInvoice}>
                      <SelectTrigger data-testid="select-original-invoice">
                        <SelectValue placeholder="اختر الفاتورة الأصلية" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون</SelectItem>
                        {originalInvoices.map((inv) => (
                          <SelectItem key={inv.id} value={String(inv.id)}>
                            {inv.invoiceNumber} - {inv.total} ج.م
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {activeTab === "sale_return" && (
                    <div>
                      <Label>العميل</Label>
                      <Select value={invoiceForm.customerId} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, customerId: v })}>
                        <SelectTrigger data-testid="select-return-customer">
                          <SelectValue placeholder="اختر العميل" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">بدون عميل</SelectItem>
                          {customers?.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {activeTab === "purchase_return" && (
                    <div>
                      <Label>المورد</Label>
                      <Select value={invoiceForm.supplierId} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, supplierId: v })}>
                        <SelectTrigger data-testid="select-return-supplier">
                          <SelectValue placeholder="اختر المورد" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">بدون مورد</SelectItem>
                          {suppliers?.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label>المرجع</Label>
                    <Input value={invoiceForm.reference} onChange={(e) => setInvoiceForm({ ...invoiceForm, reference: e.target.value })} placeholder="رقم الفاتورة الأصلية" data-testid="input-return-reference" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>نوع الدفع</Label>
                    <Select value={invoiceForm.paymentType} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, paymentType: v })}>
                      <SelectTrigger data-testid="select-return-payment-type">
                        <SelectValue placeholder="اختر نوع الدفع" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(paymentTypeLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>طريقة الدفع</Label>
                    <Select value={invoiceForm.paymentMethod} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, paymentMethod: v })}>
                      <SelectTrigger data-testid="select-return-payment-method">
                        <SelectValue placeholder="اختر طريقة الدفع" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(paymentMethodLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {invoiceForm.paymentType === "partial" && (
                    <div>
                      <Label>المبلغ المدفوع</Label>
                      <Input type="number" step="0.01" value={invoiceForm.paidAmount} onChange={(e) => setInvoiceForm({ ...invoiceForm, paidAmount: e.target.value })} data-testid="input-return-paid-amount" />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Label className="text-base font-bold">بنود المرتجع</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addLine} data-testid="button-add-return-line">
                      <Plus className="w-4 h-4 ml-1" /> إضافة بند
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">المنتج</TableHead>
                        <TableHead className="text-right">المخزن</TableHead>
                        <TableHead className="text-right">الكمية</TableHead>
                        <TableHead className="text-right">الوحدة</TableHead>
                        <TableHead className="text-right">السعر</TableHead>
                        <TableHead className="text-right">الإجمالي</TableHead>
                        <TableHead className="text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line, i) => {
                        const product = productsList?.find(p => p.id === line.productId);
                        return (
                          <TableRow key={i}>
                            <TableCell>
                              <Select value={String(line.productId || "")} onValueChange={(v) => updateLine(i, "productId", Number(v))}>
                                <SelectTrigger className="w-36" data-testid={`select-return-line-product-${i}`}>
                                  <SelectValue placeholder="اختر" />
                                </SelectTrigger>
                                <SelectContent>
                                  {productsList?.filter(p => p.isActive).map(p => (
                                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Select value={String(line.warehouseId || "")} onValueChange={(v) => updateLine(i, "warehouseId", v === "none" ? null : Number(v))}>
                                <SelectTrigger className="w-24" data-testid={`select-return-line-warehouse-${i}`}>
                                  <SelectValue placeholder="-" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">-</SelectItem>
                                  {warehousesList?.map(w => (
                                    <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input type="number" step="0.01" className="w-20" value={line.quantity}
                                onChange={(e) => updateLine(i, "quantity", e.target.value)} data-testid={`input-return-line-qty-${i}`} />
                            </TableCell>
                            <TableCell>
                              <Select value={String(line.unitId || "")} onValueChange={(v) => updateLine(i, "unitId", Number(v))}>
                                <SelectTrigger className="w-20" data-testid={`select-return-line-unit-${i}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {product && <SelectItem value={String(product.primaryUnitId)}>{product.primaryUnit?.symbol || "أساسي"}</SelectItem>}
                                  {product?.secondaryUnit && <SelectItem value={String(product.secondaryUnitId!)}>{product.secondaryUnit.symbol}</SelectItem>}
                                  {!product && unitsList?.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.symbol}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input type="number" step="0.01" className="w-24" value={line.unitPrice}
                                onChange={(e) => updateLine(i, "unitPrice", e.target.value)} data-testid={`input-return-line-price-${i}`} />
                            </TableCell>
                            <TableCell className="font-bold">{parseFloat(line.total).toLocaleString()}</TableCell>
                            <TableCell>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(i)} data-testid={`button-remove-return-line-${i}`}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>خصم (مبلغ)</Label>
                    <Input type="number" step="0.01" value={invoiceForm.discountAmount} onChange={(e) => setInvoiceForm({ ...invoiceForm, discountAmount: e.target.value })} data-testid="input-return-discount" />
                  </div>
                  <div>
                    <Label>خصم (%)</Label>
                    <Input type="number" step="0.01" value={invoiceForm.discountPercent} onChange={(e) => setInvoiceForm({ ...invoiceForm, discountPercent: e.target.value })} data-testid="input-return-discount-percent" />
                  </div>
                  <div>
                    <Label>ضريبة (%)</Label>
                    <Input type="number" step="0.01" value={invoiceForm.taxPercent} onChange={(e) => setInvoiceForm({ ...invoiceForm, taxPercent: e.target.value })} data-testid="input-return-tax" />
                  </div>
                  <div>
                    <Label>تكاليف إضافية</Label>
                    <Input type="number" step="0.01" value={invoiceForm.extraCosts} onChange={(e) => setInvoiceForm({ ...invoiceForm, extraCosts: e.target.value })} data-testid="input-return-extra-costs" />
                  </div>
                </div>

                <div>
                  <Label>ملاحظات</Label>
                  <Textarea value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} data-testid="input-return-notes" />
                </div>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex justify-between gap-2 flex-wrap text-sm">
                      <span>الإجمالي الفرعي: <strong>{subtotal.toFixed(2)}</strong></span>
                      {discountAmt > 0 && <span>الخصم: <strong>{discountAmt.toFixed(2)}</strong></span>}
                      {serviceFee > 0 && <span className="text-blue-600">خدمة رقمية: <strong>{serviceFee.toFixed(2)}</strong></span>}
                      {taxAmt > 0 && <span>الضريبة: <strong>{taxAmt.toFixed(2)}</strong></span>}
                      <span className="text-lg font-bold">الإجمالي: {grandTotal.toFixed(2)} ج.م</span>
                    </div>
                  </CardContent>
                </Card>

                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-return">
                  {createMutation.isPending ? "جاري الحفظ والطباعة..." : "حفظ وطباعة"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {hasDraft && (
        <Card className="border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="font-medium" data-testid="text-return-draft-notice">لديك مسودة فاتورة مرتجع محفوظة - هل تريد استكمالها؟</span>
            <div className="flex gap-2">
              <Button size="sm" onClick={restoreDraft} data-testid="button-restore-return-draft">استكمال المسودة</Button>
              <Button size="sm" variant="outline" onClick={discardDraft} data-testid="button-discard-return-draft">بدء من جديد</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "sale_return" | "purchase_return")} dir="rtl">
        <TabsList>
          <TabsTrigger value="sale_return" data-testid="tab-sale-returns">مرتجعات المبيعات</TabsTrigger>
          <TabsTrigger value="purchase_return" data-testid="tab-purchase-returns">مرتجعات المشتريات</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab}>
          {(!currentList || currentList.length === 0) ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Undo2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p data-testid="text-no-returns">لا توجد فواتير مرتجعات</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">رقم الفاتورة</TableHead>
                      <TableHead className="text-right">التاريخ</TableHead>
                      <TableHead className="text-right">{activeTab === "sale_return" ? "العميل" : "المورد"}</TableHead>
                      <TableHead className="text-right">المرجع</TableHead>
                      <TableHead className="text-right">الإجمالي</TableHead>
                      <TableHead className="text-right">نوع الدفع</TableHead>
                      <TableHead className="text-right">طريقة الدفع</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentList.map((inv) => (
                      <TableRow key={inv.id} data-testid={`row-return-${inv.id}`}>
                        <TableCell className="font-medium" data-testid={`text-return-number-${inv.id}`}>{inv.invoiceNumber}</TableCell>
                        <TableCell>{inv.invoiceDate}</TableCell>
                        <TableCell>{activeTab === "sale_return" ? (inv.customer?.name || "بدون") : (inv.supplier?.name || "بدون")}</TableCell>
                        <TableCell>{inv.reference || "-"}</TableCell>
                        <TableCell className="font-bold" data-testid={`text-return-total-${inv.id}`}>{parseFloat(inv.total).toLocaleString()} ج.م</TableCell>
                        <TableCell>
                          <Badge variant="outline" data-testid={`badge-return-payment-type-${inv.id}`}>
                            {paymentTypeLabels[(inv as any).paymentType] || "مدفوعة"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" data-testid={`badge-return-payment-method-${inv.id}`}>
                            {paymentMethodLabels[(inv as any).paymentMethod] || "نقدي"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={inv.status === "approved" ? "default" : "secondary"} data-testid={`badge-return-status-${inv.id}`}>
                            {inv.status === "approved" ? "معتمدة" : "مسودة"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            <Button variant="ghost" size="icon" onClick={() => setViewInvoice(inv)} data-testid={`button-view-return-${inv.id}`}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handlePrint(inv)} data-testid={`button-print-return-${inv.id}`}>
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleExportPDF(inv)} data-testid={`button-pdf-return-${inv.id}`}>
                              <FileDown className="w-4 h-4" />
                            </Button>
                            {inv.status === "draft" && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => approveMutation.mutate(inv.id)} disabled={approveMutation.isPending} data-testid={`button-approve-return-${inv.id}`}>
                                  <Check className="w-4 h-4 text-green-600" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setDeleteId(inv.id)} data-testid={`button-delete-return-${inv.id}`}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!viewInvoice} onOpenChange={() => setViewInvoice(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل فاتورة المرتجع {viewInvoice?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-muted-foreground">التاريخ:</span> {viewInvoice.invoiceDate}</div>
                <div><span className="text-muted-foreground">النوع:</span> {viewInvoice.type === "sale_return" ? "مرتجع مبيعات" : "مرتجع مشتريات"}</div>
                <div><span className="text-muted-foreground">المرجع:</span> {viewInvoice.reference || "-"}</div>
                {viewInvoice.customer && <div><span className="text-muted-foreground">العميل:</span> {viewInvoice.customer.name}</div>}
                {viewInvoice.supplier && <div><span className="text-muted-foreground">المورد:</span> {viewInvoice.supplier.name}</div>}
                <div>
                  <span className="text-muted-foreground">الحالة:</span>{" "}
                  <Badge variant={viewInvoice.status === "approved" ? "default" : "secondary"}>
                    {viewInvoice.status === "approved" ? "معتمدة" : "مسودة"}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">نوع الدفع:</span>{" "}
                  <Badge variant="outline" data-testid="badge-view-return-payment-type">
                    {paymentTypeLabels[(viewInvoice as any).paymentType] || "مدفوعة"}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">طريقة الدفع:</span>{" "}
                  <Badge variant="outline" data-testid="badge-view-return-payment-method">
                    {paymentMethodLabels[(viewInvoice as any).paymentMethod] || "نقدي"}
                  </Badge>
                </div>
                {(viewInvoice as any).paymentType === "partial" && (
                  <div><span className="text-muted-foreground">المبلغ المدفوع:</span> {(viewInvoice as any).paidAmount || "0"} ج.م</div>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المنتج</TableHead>
                    <TableHead className="text-right">الكمية</TableHead>
                    <TableHead className="text-right">السعر</TableHead>
                    <TableHead className="text-right">الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewInvoice.lines.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell>{l.product?.name || l.description || "-"}</TableCell>
                      <TableCell>{l.quantity} {l.unit?.symbol || ""}</TableCell>
                      <TableCell>{l.unitPrice}</TableCell>
                      <TableCell className="font-bold">{l.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between gap-2 flex-wrap text-sm border-t pt-2">
                <span>الإجمالي الفرعي: {viewInvoice.subtotal}</span>
                {parseFloat(viewInvoice.discountAmount) > 0 && <span>الخصم: {viewInvoice.discountAmount}</span>}
                {parseFloat(viewInvoice.serviceFee || "0") > 0 && <span className="text-blue-600">خدمة رقمية: {viewInvoice.serviceFee}</span>}
                {parseFloat(viewInvoice.taxAmount) > 0 && <span>الضريبة: {viewInvoice.taxAmount}</span>}
                <span className="text-lg font-bold">الإجمالي: {viewInvoice.total} ج.م</span>
              </div>
              {viewInvoice.notes && <div className="text-sm text-muted-foreground">ملاحظات: {viewInvoice.notes}</div>}
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" className="flex-1" onClick={() => handlePrint(viewInvoice)} data-testid="button-print-return-view">
                  <Printer className="w-4 h-4 ml-2" /> طباعة الفاتورة
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => handleExportPDF(viewInvoice)} data-testid="button-pdf-return-view">
                  <FileDown className="w-4 h-4 ml-2" /> تصدير PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف فاتورة المرتجع؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel data-testid="button-cancel-delete-return">إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null); }} data-testid="button-confirm-delete-return">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
