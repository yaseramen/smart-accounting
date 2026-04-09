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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Check, Printer, ShoppingCart, Eye, Wrench, UserPlus, Download, Share2, ChevronsUpDown, Search, FileDown } from "lucide-react";
import { Link } from "wouter";
import { exportToExcel as writeExcelFile } from "@/lib/excel";
import type { InvoiceWithLines, Customer, ProductWithUnits, Warehouse, Unit, Company } from "@shared/schema";

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

export default function SalesPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [viewInvoice, setViewInvoice] = useState<InvoiceWithLines | null>(null);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: "", phone: "", code: "" });
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState<number | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: "", invoiceDate: new Date().toISOString().split("T")[0],
    customerId: "", notes: "", reference: "",
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
    const draft = { invoiceForm, lines, savedAt: Date.now() };
    localStorage.setItem("sale_invoice_draft", JSON.stringify(draft));
  }, [invoiceForm, lines, open]);

  useEffect(() => { saveDraft(); }, [saveDraft]);

  useEffect(() => {
    const saved = localStorage.getItem("sale_invoice_draft");
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
    const saved = localStorage.getItem("sale_invoice_draft");
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        setInvoiceForm({ ...invoiceForm, ...draft.invoiceForm });
        setLines(draft.lines || []);
      } catch {}
    }
    setHasDraft(false);
    setOpen(true);
  };

  const discardDraft = () => {
    localStorage.removeItem("sale_invoice_draft");
    setHasDraft(false);
  };

  const { data: invoicesList, isLoading } = useQuery<InvoiceWithLines[]>({
    queryKey: ["/api/invoices?type=sale"],
  });
  const { data: customers } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/invoices?type=sale"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "تم حفظ واعتماد الفاتورة بنجاح" });
      resetForm();
      handlePrint(approvedInvoice);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/invoices/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices?type=sale"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "تم اعتماد الفاتورة بنجاح" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices?type=sale"] });
      toast({ title: "تم حذف الفاتورة" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const createCustomerMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/customers", data),
    onSuccess: async (res) => {
      const customer = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setInvoiceForm(prev => ({ ...prev, customerId: String(customer.id) }));
      setNewCustomerOpen(false);
      setNewCustomerForm({ name: "", phone: "", code: "" });
      toast({ title: "تم إنشاء العميل بنجاح" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const exportToExcel = async () => {
    if (!invoicesList || invoicesList.length === 0) return;
    const data = invoicesList.map((inv) => ({
      "رقم الفاتورة": inv.invoiceNumber,
      "التاريخ": inv.invoiceDate,
      "العميل": inv.customer?.name || "بدون",
      "الإجمالي الفرعي": inv.subtotal,
      "الخصم": inv.discountAmount,
      "الضريبة": inv.taxAmount,
      "الإجمالي": inv.total,
      "الحالة": inv.status === "approved" ? "معتمدة" : inv.status === "cancelled" ? "ملغاة" : "مسودة",
    }));
    await writeExcelFile(data, "فواتير المبيعات", "sales_invoices.xlsx");
  };

  const shareWhatsApp = (inv: InvoiceWithLines) => {
    const linesText = inv.lines.map((l) => {
      if (l.lineType === "service") return `- خدمة: ${l.description || ""} - ${l.total} ج.م`;
      return `- ${l.product?.name || ""} × ${l.quantity} = ${l.total} ج.م`;
    }).join("\n");
    const text = `فاتورة مبيعات رقم: ${inv.invoiceNumber}\nالتاريخ: ${inv.invoiceDate}\nالعميل: ${inv.customer?.name || "بدون"}\n\nالبنود:\n${linesText}\n\nالإجمالي: ${inv.total} ج.م`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const fetchAutoInvoiceNumber = async () => {
    try {
      const res = await fetch("/api/auto/invoice-number?type=sale");
      const data = await res.json();
      if (data.number) setInvoiceForm(f => ({ ...f, invoiceNumber: f.invoiceNumber || data.number }));
    } catch {}
  };

  const resetForm = () => {
    setInvoiceForm({
      invoiceNumber: "", invoiceDate: new Date().toISOString().split("T")[0],
      customerId: "", notes: "", reference: "",
      discountAmount: "0", discountPercent: "0", taxPercent: "0",
      extraCosts: "0", extraCostsDescription: "",
      paymentType: "paid", paymentMethod: "cash", paidAmount: "0",
    });
    setLines([]);
    setOpen(false);
    localStorage.removeItem("sale_invoice_draft");
  };

  const addLine = (type: "product" | "service" = "product") => {
    setLines([...lines, {
      lineType: type,
      productId: 0, warehouseId: null, quantity: "1", unitId: 0,
      unitPrice: "0", length: "", width: "", effectiveQuantity: "1",
      discount: "0", taxAmount: "0", total: "0", description: "",
    }]);
  };

  const updateLine = (index: number, field: string, value: any) => {
    const updated = [...lines];
    (updated[index] as any)[field] = value;

    if (field === "productId" && updated[index].lineType === "product") {
      const product = productsList?.find(p => p.id === Number(value));
      if (product) {
        updated[index].unitId = product.primaryUnitId;
        updated[index].unitPrice = product.sellPrice;
      }
    }

    const product = updated[index].lineType === "product" ? productsList?.find(p => p.id === updated[index].productId) : undefined;
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
        type: "sale",
        customerId: invoiceForm.customerId && invoiceForm.customerId !== "none" ? Number(invoiceForm.customerId) : null,
        supplierId: null,
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
        productId: l.lineType === "product" ? Number(l.productId) : null,
        warehouseId: l.lineType === "product" && l.warehouseId ? Number(l.warehouseId) : null,
        quantity: l.quantity,
        unitId: l.lineType === "product" ? Number(l.unitId) : null,
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

  const handlePrint = (invoice: InvoiceWithLines) => {
    const printWindow = window.open("", "_blank", "width=300,height=600");
    if (!printWindow) return;
    const linesHtml = invoice.lines.map(l => {
      if (l.lineType === "service") {
        return `<tr><td colspan="2"><strong>خدمة:</strong> ${l.description || ""}</td><td>${l.unitPrice}</td><td>${l.total}</td></tr>`;
      }
      return `<tr><td>${l.product?.name || ""}</td><td>${l.quantity}</td><td>${l.unitPrice}</td><td>${l.total}</td></tr>`;
    }).join("");
    const extraCostsVal = parseFloat(invoice.extraCosts || "0");
    const serviceFeeVal = parseFloat(invoice.serviceFee || "0");
    const companyName = company?.name || "aiverce محاسب";
    const companyPhone = company?.phone || "";
    const companyTax = company?.taxNumber || "";
    const companyReg = company?.commercialRegistration || "";
    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>فاتورة ${invoice.invoiceNumber}</title>
    <style>body{font-family:'Cairo',sans-serif;font-size:12px;margin:0;padding:10px;width:280px}
    .center{text-align:center}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:5px 0}
    table{width:100%;border-collapse:collapse}td{padding:2px 4px;font-size:11px}
    .total-row{font-weight:bold;border-top:1px solid #000}.footer{margin-top:8px;font-size:9px;color:#666;text-align:center;border-top:1px dashed #999;padding-top:4px}</style></head>
    <body><div class="center bold" style="font-size:16px">${companyName}</div>
    ${companyPhone ? `<div class="center" style="font-size:10px">هاتف: ${companyPhone}</div>` : ""}
    ${companyTax ? `<div class="center" style="font-size:10px">الرقم الضريبي: ${companyTax}</div>` : ""}
    ${companyReg ? `<div class="center" style="font-size:10px">السجل التجاري: ${companyReg}</div>` : ""}
    <div class="line"></div>
    <div>رقم الفاتورة: ${invoice.invoiceNumber}</div>
    <div>التاريخ: ${invoice.invoiceDate}</div>
    ${invoice.customer ? `<div>العميل: ${invoice.customer.name}</div>` : ""}
    <div>نوع الدفع: ${paymentTypeLabels[invoice.paymentType || "paid"] || "مدفوعة"}</div>
    <div>طريقة الدفع: ${paymentMethodLabels[invoice.paymentMethod || "cash"] || "نقدي"}</div>
    ${invoice.paymentType === "partial" ? `<div>المدفوع: ${invoice.paidAmount} ج.م</div>` : ""}
    <div class="line"></div>
    <table><tr><td class="bold">الصنف</td><td class="bold">الكمية</td><td class="bold">السعر</td><td class="bold">الإجمالي</td></tr>
    ${linesHtml}
    </table>
    <div class="line"></div>
    <div>الإجمالي الفرعي: ${invoice.subtotal}</div>
    ${parseFloat(invoice.discountAmount) > 0 ? `<div>الخصم: ${invoice.discountAmount}</div>` : ""}
    ${extraCostsVal > 0 ? `<div>تكاليف إضافية: ${invoice.extraCosts}${invoice.extraCostsDescription ? ` (${invoice.extraCostsDescription})` : ""}</div>` : ""}
    ${parseFloat(invoice.taxAmount) > 0 ? `<div>الضريبة: ${invoice.taxAmount}</div>` : ""}
    ${serviceFeeVal > 0 ? `<div>خدمة رقمية (0.05%): ${invoice.serviceFee}</div>` : ""}
    <div class="bold" style="font-size:14px">الإجمالي: ${invoice.total}</div>
    ${invoice.notes ? `<div class="line"></div><div style="font-size:10px"><strong>ملاحظات:</strong> ${invoice.notes}</div>` : ""}
    ${invoice.qrData ? `<div class="center" style="margin-top:10px"><img src="${invoice.qrData}" width="120"/></div>` : ""}
    <div class="line"></div>
    <div class="center" style="font-size:10px">شكراً لتعاملكم معنا</div>
    <div class="footer">تم التنفيذ بواسطة شركة efct للبرمجة<br>هاتف: 01009376052 - 01556660502<br>إيميل: santws1@gmail.com</div>
    </body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportPDF = (invoice: InvoiceWithLines) => {
    const pdfWindow = window.open("", "_blank");
    if (!pdfWindow) return;
    const linesHtml = invoice.lines.map((l, idx) => {
      if (l.lineType === "service") {
        return `<tr><td>${idx + 1}</td><td colspan="2">${escapeHtml(l.description) || "خدمة"}</td><td>1</td><td>${l.unitPrice}</td><td>${parseFloat(l.discount || "0").toFixed(2)}</td><td>${l.total}</td></tr>`;
      }
      return `<tr><td>${idx + 1}</td><td>${escapeHtml(l.product?.name)}</td><td>${escapeHtml(l.product?.code)}</td><td>${l.quantity} ${escapeHtml(l.unit?.symbol)}</td><td>${l.unitPrice}</td><td>${parseFloat(l.discount || "0").toFixed(2)}</td><td>${l.total}</td></tr>`;
    }).join("");
    const extraCostsVal = parseFloat(invoice.extraCosts || "0");
    const serviceFeeVal = parseFloat(invoice.serviceFee || "0");
    const companyName = escapeHtml(company?.name);
    const companyPhone = escapeHtml(company?.phone);
    const companyTax = escapeHtml(company?.taxNumber);
    const companyReg = escapeHtml(company?.commercialRegistration);
    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>فاتورة مبيعات ${invoice.invoiceNumber}</title>
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
      .qr-section{text-align:center;margin-top:16px}
      .footer{margin-top:20px;text-align:center;font-size:9px;color:#999;border-top:1px solid #eee;padding-top:8px}
      @media print{body{padding:0}.no-print{display:none!important}}
    </style></head><body>
    <div class="header">
      <div class="company-info">
        <div class="company-name">${companyName}</div>
        ${companyPhone ? `<div class="company-detail">هاتف: ${companyPhone}</div>` : ""}
        ${companyTax ? `<div class="company-detail">الرقم الضريبي: ${companyTax}</div>` : ""}
        ${companyReg ? `<div class="company-detail">السجل التجاري: ${companyReg}</div>` : ""}
      </div>
      <div class="invoice-title">فاتورة مبيعات</div>
    </div>
    <div class="invoice-meta">
      <div><strong>رقم الفاتورة:</strong> ${invoice.invoiceNumber}</div>
      <div><strong>التاريخ:</strong> ${invoice.invoiceDate}</div>
      <div><strong>العميل:</strong> ${escapeHtml(invoice.customer?.name) || "بدون"}</div>
      <div><strong>الحالة:</strong> ${invoice.status === "approved" ? "معتمدة" : "مسودة"}</div>
      <div><strong>نوع الدفع:</strong> ${paymentTypeLabels[invoice.paymentType || "paid"] || "مدفوعة"}</div>
      <div><strong>طريقة الدفع:</strong> ${paymentMethodLabels[invoice.paymentMethod || "cash"] || "نقدي"}</div>
      ${invoice.paymentType === "partial" ? `<div><strong>المبلغ المدفوع:</strong> ${invoice.paidAmount} ج.م</div>` : ""}
      ${invoice.reference ? `<div><strong>المرجع:</strong> ${escapeHtml(invoice.reference)}</div>` : ""}
    </div>
    <table>
      <thead><tr><th>#</th><th>الصنف</th><th>الكود</th><th>الكمية</th><th>السعر</th><th>الخصم</th><th>الإجمالي</th></tr></thead>
      <tbody>${linesHtml}</tbody>
    </table>
    <div class="totals">
      <div class="totals-row"><span>الإجمالي الفرعي</span><span>${invoice.subtotal} ج.م</span></div>
      ${parseFloat(invoice.discountAmount) > 0 ? `<div class="totals-row"><span>الخصم</span><span>-${invoice.discountAmount} ج.م</span></div>` : ""}
      ${extraCostsVal > 0 ? `<div class="totals-row"><span>تكاليف إضافية${invoice.extraCostsDescription ? ` (${escapeHtml(invoice.extraCostsDescription)})` : ""}</span><span>${invoice.extraCosts} ج.م</span></div>` : ""}
      ${parseFloat(invoice.taxAmount) > 0 ? `<div class="totals-row"><span>الضريبة</span><span>${invoice.taxAmount} ج.م</span></div>` : ""}
      ${serviceFeeVal > 0 ? `<div class="totals-row"><span>خدمة رقمية (0.05%)</span><span>${invoice.serviceFee} ج.م</span></div>` : ""}
      <div class="totals-row grand"><span>الإجمالي النهائي</span><span>${invoice.total} ج.م</span></div>
    </div>
    ${invoice.notes ? `<div class="notes"><strong>ملاحظات:</strong> ${escapeHtml(invoice.notes)}</div>` : ""}
    ${invoice.qrData ? `<div class="qr-section"><img src="${invoice.qrData}" width="140"/></div>` : ""}
    <div class="footer">تم التنفيذ بواسطة شركة efct للبرمجة | هاتف: 01009376052 - 01556660502 | إيميل: santws1@gmail.com</div>
    <script>window.onload=()=>{window.print();}</script>
    </body></html>`;
    pdfWindow.document.write(html);
    pdfWindow.document.close();
  };

  if (isLoading) {
    return <div className="p-6 space-y-4" dir="rtl"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="p-6 space-y-4 overflow-auto h-full" dir="rtl">
      {hasDraft && (
        <Card className="border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="font-medium" data-testid="text-draft-notice">لديك مسودة فاتورة محفوظة - هل تريد استكمالها؟</span>
            <div className="flex gap-2">
              <Button size="sm" onClick={restoreDraft} data-testid="button-restore-draft">استكمال المسودة</Button>
              <Button size="sm" variant="outline" onClick={discardDraft} data-testid="button-discard-draft">بدء من جديد</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-sales-title">
          <ShoppingCart className="w-6 h-6" /> فواتير المبيعات
        </h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportToExcel} disabled={!invoicesList || invoicesList.length === 0} data-testid="button-export-sales">
            <Download className="w-4 h-4 ml-1" /> تصدير Excel
          </Button>
          <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else fetchAutoInvoiceNumber(); setOpen(v); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-sale"><Plus className="w-4 h-4 ml-1" /> فاتورة جديدة</Button>
            </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>فاتورة مبيعات جديدة</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>رقم الفاتورة</Label>
                  <Input value={invoiceForm.invoiceNumber} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })} required data-testid="input-invoice-number" />
                </div>
                <div>
                  <Label>التاريخ</Label>
                  <Input type="date" value={invoiceForm.invoiceDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })} required data-testid="input-invoice-date" />
                </div>
                <div>
                  <Label>العميل</Label>
                  <div className="flex gap-1">
                    <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" role="combobox" aria-expanded={customerSearchOpen} className="flex-1 justify-between" data-testid="select-customer">
                          {invoiceForm.customerId && invoiceForm.customerId !== "none"
                            ? customers?.find(c => String(c.id) === invoiceForm.customerId)?.name || "اختر العميل"
                            : "اختر العميل"}
                          <ChevronsUpDown className="w-4 h-4 opacity-50 mr-2 shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0" align="start">
                        <Command>
                          <CommandInput placeholder="بحث بالاسم أو الهاتف..." data-testid="input-customer-search" />
                          <CommandList>
                            <CommandEmpty>لا توجد نتائج</CommandEmpty>
                            <CommandGroup>
                              <CommandItem value="none" onSelect={() => { setInvoiceForm({ ...invoiceForm, customerId: "none" }); setCustomerSearchOpen(false); }}>
                                بدون عميل
                              </CommandItem>
                              {customers?.map((c) => (
                                <CommandItem key={c.id} value={`${c.name} ${c.phone || ""}`} onSelect={() => { setInvoiceForm({ ...invoiceForm, customerId: String(c.id) }); setCustomerSearchOpen(false); }}>
                                  <div className="flex flex-col">
                                    <span>{c.name}</span>
                                    {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button type="button" variant="outline" size="icon" onClick={() => setNewCustomerOpen(true)} data-testid="button-new-customer-inline">
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>نوع الفاتورة</Label>
                  <Select value={invoiceForm.paymentType} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, paymentType: v, paidAmount: v === "paid" ? String(grandTotal) : v === "deferred" ? "0" : invoiceForm.paidAmount })} data-testid="select-payment-type">
                    <SelectTrigger data-testid="select-payment-type-trigger"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">مدفوعة بالكامل</SelectItem>
                      <SelectItem value="deferred">آجلة</SelectItem>
                      <SelectItem value="partial">مدفوع جزئياً</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>طريقة الدفع</Label>
                  <Select value={invoiceForm.paymentMethod} onValueChange={(v) => setInvoiceForm({ ...invoiceForm, paymentMethod: v })} data-testid="select-payment-method">
                    <SelectTrigger data-testid="select-payment-method-trigger"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">نقدي</SelectItem>
                      <SelectItem value="vodafone_cash">فودافون كاش</SelectItem>
                      <SelectItem value="instapay">انستاباي</SelectItem>
                      <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                      <SelectItem value="check">شيك</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {invoiceForm.paymentType === "partial" && (
                  <div>
                    <Label>المبلغ المدفوع</Label>
                    <Input type="number" step="0.01" value={invoiceForm.paidAmount}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, paidAmount: e.target.value })} data-testid="input-paid-amount" />
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base font-bold">البنود</Label>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => addLine("product")} data-testid="button-add-line">
                      <Plus className="w-4 h-4 ml-1" /> إضافة منتج
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addLine("service")} data-testid="button-add-service">
                      <Wrench className="w-4 h-4 ml-1" /> إضافة خدمة
                    </Button>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">النوع</TableHead>
                      <TableHead className="text-right">المنتج/الوصف</TableHead>
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
                      const product = line.lineType === "product" ? productsList?.find(p => p.id === line.productId) : undefined;
                      return (
                        <TableRow key={i}>
                          <TableCell>
                            <Badge variant={line.lineType === "service" ? "secondary" : "default"}>
                              {line.lineType === "service" ? "خدمة" : "منتج"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {line.lineType === "product" ? (
                              <Popover open={productSearchOpen === i} onOpenChange={(v) => setProductSearchOpen(v ? i : null)}>
                                <PopoverTrigger asChild>
                                  <Button type="button" variant="outline" className="w-36 justify-between font-normal" data-testid={`select-line-product-${i}`}>
                                    <span className="truncate">{line.productId ? (productsList?.find(p => p.id === line.productId)?.name || "اختر") : "اختر منتج"}</span>
                                    <ChevronsUpDown className="w-3 h-3 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56 p-0" align="start">
                                  <Command filter={(value, search) => {
                                    const p = productsList?.find(pr => String(pr.id) === value);
                                    if (!p) return 0;
                                    const s = search.toLowerCase();
                                    if (p.name.toLowerCase().includes(s)) return 1;
                                    if (p.code.toLowerCase().includes(s)) return 1;
                                    if (p.barcode && p.barcode.toLowerCase().includes(s)) return 1;
                                    return 0;
                                  }}>
                                    <CommandInput placeholder="بحث بالاسم أو الباركود..." data-testid={`input-line-product-search-${i}`} />
                                    <CommandList>
                                      <CommandEmpty>لا توجد نتائج</CommandEmpty>
                                      <CommandGroup>
                                        {productsList?.filter(p => p.isActive).map(p => (
                                          <CommandItem key={p.id} value={String(p.id)} onSelect={(v) => { updateLine(i, "productId", Number(v)); setProductSearchOpen(null); }}>
                                            <div className="flex flex-col">
                                              <span>{p.name}</span>
                                              {p.barcode && <span className="text-xs text-muted-foreground">{p.barcode}</span>}
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <Textarea
                                placeholder="وصف الخدمة..."
                                className="w-40 min-h-[60px]"
                                value={line.description}
                                onChange={(e) => updateLine(i, "description", e.target.value)}
                                data-testid={`input-line-desc-${i}`}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            {line.lineType === "product" ? (
                              <Select value={String(line.warehouseId || "")} onValueChange={(v) => updateLine(i, "warehouseId", v === "none" ? null : Number(v))}>
                                <SelectTrigger className="w-24" data-testid={`select-line-warehouse-${i}`}>
                                  <SelectValue placeholder="-" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">-</SelectItem>
                                  {warehousesList?.map(w => (
                                    <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            <Input type="number" step="0.01" className="w-20" value={line.quantity}
                              onChange={(e) => updateLine(i, "quantity", e.target.value)} data-testid={`input-line-qty-${i}`} />
                            {line.lineType === "product" && product?.hasDimensions && (
                              <div className="flex gap-1 mt-1">
                                <Input type="number" step="0.01" placeholder="طول" className="w-16"
                                  value={line.length} onChange={(e) => updateLine(i, "length", e.target.value)} />
                                <span className="self-center">×</span>
                                <Input type="number" step="0.01" placeholder="عرض" className="w-16"
                                  value={line.width} onChange={(e) => updateLine(i, "width", e.target.value)} />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {line.lineType === "product" ? (
                              <Select value={String(line.unitId || "")} onValueChange={(v) => updateLine(i, "unitId", Number(v))}>
                                <SelectTrigger className="w-20" data-testid={`select-line-unit-${i}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {product && <SelectItem value={String(product.primaryUnitId)}>{product.primaryUnit?.symbol || "أساسي"}</SelectItem>}
                                  {product?.secondaryUnit && <SelectItem value={String(product.secondaryUnitId!)}>{product.secondaryUnit.symbol}</SelectItem>}
                                  {!product && unitsList?.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.symbol}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            ) : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>
                            <Input type="number" step="0.01" className="w-24" value={line.unitPrice}
                              onChange={(e) => updateLine(i, "unitPrice", e.target.value)} data-testid={`input-line-price-${i}`} />
                          </TableCell>
                          <TableCell className="font-bold">{parseFloat(line.total).toLocaleString()}</TableCell>
                          <TableCell>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(i)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>نسبة الخصم %</Label>
                  <Input type="number" step="0.01" value={invoiceForm.discountPercent}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, discountPercent: e.target.value, discountAmount: "0" })} data-testid="input-discount-percent" />
                </div>
                <div>
                  <Label>مبلغ الخصم</Label>
                  <Input type="number" step="0.01" value={invoiceForm.discountAmount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, discountAmount: e.target.value, discountPercent: "0" })} data-testid="input-discount-amount" />
                </div>
                <div>
                  <Label>نسبة الضريبة %</Label>
                  <Input type="number" step="0.01" value={invoiceForm.taxPercent}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, taxPercent: e.target.value })} data-testid="input-tax-percent" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>تكاليف إضافية (نقل، رسوم)</Label>
                  <Input type="number" step="0.01" value={invoiceForm.extraCosts}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, extraCosts: e.target.value })} data-testid="input-extra-costs" />
                </div>
                <div>
                  <Label>وصف التكاليف الإضافية</Label>
                  <Textarea value={invoiceForm.extraCostsDescription}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, extraCostsDescription: e.target.value })}
                    placeholder="مثال: مصاريف نقل، رسوم جمركية..." data-testid="input-extra-costs-desc" />
                </div>
              </div>

              <div>
                <Label>ملاحظات</Label>
                <Textarea value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} data-testid="input-invoice-notes" />
              </div>

              <Card>
                <CardContent className="p-4 space-y-1">
                  <div className="flex justify-between"><span>الإجمالي الفرعي:</span><span>{subtotal.toLocaleString()} ج.م</span></div>
                  {discountAmt > 0 && <div className="flex justify-between text-destructive"><span>الخصم:</span><span>-{discountAmt.toLocaleString()} ج.م</span></div>}
                  {extraCosts > 0 && <div className="flex justify-between"><span>تكاليف إضافية:</span><span>{extraCosts.toLocaleString()} ج.م</span></div>}
                  {serviceFee > 0 && <div className="flex justify-between text-blue-600"><span>خدمة رقمية (0.05%):</span><span>{serviceFee.toFixed(2)} ج.م</span></div>}
                  {taxAmt > 0 && <div className="flex justify-between"><span>الضريبة:</span><span>{taxAmt.toLocaleString()} ج.م</span></div>}
                  <div className="flex justify-between text-lg font-bold border-t pt-2"><span>الإجمالي:</span><span data-testid="text-grand-total">{grandTotal.toLocaleString()} ج.م</span></div>
                </CardContent>
              </Card>

              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-save-invoice">
                {createMutation.isPending ? "جاري الحفظ والطباعة..." : "حفظ وطباعة"}
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
                <TableHead className="text-right">رقم الفاتورة</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">العميل</TableHead>
                <TableHead className="text-right">الإجمالي</TableHead>
                <TableHead className="text-right">نوع الدفع</TableHead>
                <TableHead className="text-right">طريقة الدفع</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoicesList?.map((inv) => (
                <TableRow key={inv.id} data-testid={`row-invoice-${inv.id}`}>
                  <TableCell className="font-mono">{inv.invoiceNumber}</TableCell>
                  <TableCell>{inv.invoiceDate}</TableCell>
                  <TableCell>
                    {inv.customer ? (
                      <Link href={`/customers/${inv.customer.id}/statement`} className="text-primary hover:underline cursor-pointer" data-testid={`link-customer-${inv.customer.id}`}>
                        {inv.customer.name}
                      </Link>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="font-bold">{parseFloat(inv.total).toLocaleString()} ج.م</TableCell>
                  <TableCell>
                    <Badge variant={inv.paymentType === "deferred" ? "destructive" : inv.paymentType === "partial" ? "secondary" : "default"} data-testid={`badge-payment-type-${inv.id}`}>
                      {paymentTypeLabels[inv.paymentType || "paid"] || "مدفوعة"}
                    </Badge>
                  </TableCell>
                  <TableCell>{paymentMethodLabels[inv.paymentMethod || "cash"] || "نقدي"}</TableCell>
                  <TableCell>
                    <Badge variant={inv.status === "approved" ? "default" : "secondary"} data-testid={`badge-invoice-status-${inv.id}`}>
                      {inv.status === "approved" ? "معتمدة" : inv.status === "cancelled" ? "ملغاة" : "مسودة"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setViewInvoice(inv)} data-testid={`button-view-invoice-${inv.id}`}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {inv.status === "draft" && (
                        <Button variant="ghost" size="sm" onClick={() => approveMutation.mutate(inv.id)} data-testid={`button-approve-invoice-${inv.id}`}>
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handlePrint(inv)} data-testid={`button-print-invoice-${inv.id}`}>
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleExportPDF(inv)} data-testid={`button-pdf-invoice-${inv.id}`}>
                        <FileDown className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => shareWhatsApp(inv)} data-testid={`button-whatsapp-invoice-${inv.id}`}>
                        <Share2 className="w-4 h-4" />
                      </Button>
                      {inv.status === "draft" && (
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(inv.id)} data-testid={`button-delete-invoice-${inv.id}`}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!invoicesList || invoicesList.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    لا توجد فواتير مبيعات بعد
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={newCustomerOpen} onOpenChange={setNewCustomerOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>عميل جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>كود العميل</Label>
              <Input value={newCustomerForm.code} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, code: e.target.value })} placeholder="CUS-XXXX (اختياري)" data-testid="input-inline-customer-code" />
            </div>
            <div>
              <Label>اسم العميل *</Label>
              <Input value={newCustomerForm.name} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })} required data-testid="input-inline-customer-name" />
            </div>
            <div>
              <Label>رقم الهاتف *</Label>
              <Input value={newCustomerForm.phone} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })} required data-testid="input-inline-customer-phone" />
            </div>
            <Button
              className="w-full"
              disabled={!newCustomerForm.name || !newCustomerForm.phone || createCustomerMutation.isPending}
              onClick={() => createCustomerMutation.mutate({ name: newCustomerForm.name, phone: newCustomerForm.phone, code: newCustomerForm.code || `CUS-${Date.now()}`, isActive: true })}
              data-testid="button-save-inline-customer"
            >
              {createCustomerMutation.isPending ? "جاري الحفظ..." : "حفظ العميل"}
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

      <Dialog open={!!viewInvoice} onOpenChange={(v) => { if (!v) setViewInvoice(null); }}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>فاتورة مبيعات رقم {viewInvoice?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>التاريخ: {viewInvoice.invoiceDate}</div>
                <div>العميل: {viewInvoice.customer ? (
                  <Link href={`/customers/${viewInvoice.customer.id}/statement`} className="text-primary hover:underline">
                    {viewInvoice.customer.name}
                  </Link>
                ) : "بدون"}</div>
                <div>الحالة: {viewInvoice.status === "approved" ? "معتمدة" : "مسودة"}</div>
                <div>نوع الدفع: <Badge variant={viewInvoice.paymentType === "deferred" ? "destructive" : viewInvoice.paymentType === "partial" ? "secondary" : "default"}>{paymentTypeLabels[viewInvoice.paymentType || "paid"] || "مدفوعة"}</Badge></div>
                <div>طريقة الدفع: {paymentMethodLabels[viewInvoice.paymentMethod || "cash"] || "نقدي"}</div>
                {viewInvoice.paymentType === "partial" && <div>المبلغ المدفوع: {parseFloat(viewInvoice.paidAmount || "0").toLocaleString()} ج.م</div>}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">المنتج/الوصف</TableHead>
                    <TableHead className="text-right">الكمية</TableHead>
                    <TableHead className="text-right">السعر</TableHead>
                    <TableHead className="text-right">الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewInvoice.lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Badge variant={l.lineType === "service" ? "secondary" : "default"} className="text-xs">
                          {l.lineType === "service" ? "خدمة" : "منتج"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {l.lineType === "service" ? (
                          <span className="text-sm">{l.description || "خدمة"}</span>
                        ) : (
                          l.product ? (
                            <Link href={`/products/${l.product.id}/report`} className="text-primary hover:underline">
                              {l.product.name}
                            </Link>
                          ) : "-"
                        )}
                      </TableCell>
                      <TableCell>{l.quantity} {l.unit?.symbol || ""}</TableCell>
                      <TableCell>{l.unitPrice}</TableCell>
                      <TableCell>{l.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span>الإجمالي الفرعي:</span><span>{viewInvoice.subtotal} ج.م</span></div>
                {parseFloat(viewInvoice.discountAmount) > 0 && <div className="flex justify-between"><span>الخصم:</span><span>{viewInvoice.discountAmount} ج.م</span></div>}
                {parseFloat(viewInvoice.extraCosts || "0") > 0 && (
                  <div className="flex justify-between"><span>تكاليف إضافية{viewInvoice.extraCostsDescription ? ` (${viewInvoice.extraCostsDescription})` : ""}:</span><span>{viewInvoice.extraCosts} ج.م</span></div>
                )}
                {parseFloat(viewInvoice.taxAmount) > 0 && <div className="flex justify-between"><span>الضريبة:</span><span>{viewInvoice.taxAmount} ج.م</span></div>}
                {parseFloat(viewInvoice.serviceFee) > 0 && <div className="flex justify-between text-blue-600"><span>خدمة رقمية (0.05%):</span><span>{viewInvoice.serviceFee} ج.م</span></div>}
                <div className="flex justify-between font-bold text-lg border-t pt-2"><span>الإجمالي:</span><span>{viewInvoice.total} ج.م</span></div>
              </div>
              {viewInvoice.qrData && (
                <div className="flex justify-center">
                  <img src={viewInvoice.qrData} alt="QR Code" className="w-32 h-32" data-testid="img-invoice-qr" />
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" className="flex-1" onClick={() => handlePrint(viewInvoice)} data-testid="button-print-view">
                  <Printer className="w-4 h-4 ml-2" /> طباعة الفاتورة
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => handleExportPDF(viewInvoice)} data-testid="button-pdf-view">
                  <FileDown className="w-4 h-4 ml-2" /> تصدير PDF
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => shareWhatsApp(viewInvoice)} data-testid="button-whatsapp-view">
                  <Share2 className="w-4 h-4 ml-2" /> مشاركة واتساب
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
