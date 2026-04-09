import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, User, FileText, TrendingUp, TrendingDown, Scale, CreditCard } from "lucide-react";
import { Link } from "wouter";

const paymentMethodLabels: Record<string, string> = { cash: "نقدي", vodafone_cash: "فودافون كاش", instapay: "انستاباي", bank_transfer: "تحويل بنكي", check: "شيك", other: "أخرى" };
const paymentTypeLabels: Record<string, string> = { paid: "مدفوعة", deferred: "آجلة", partial: "مدفوع جزئياً" };

export default function CustomerStatementPage() {
  const { toast } = useToast();
  const params = useParams<{ id: string }>();
  const customerId = params.id;

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [paymentDialog, setPaymentDialog] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", paymentMethod: "cash", paymentDate: new Date().toISOString().split("T")[0], notes: "" });

  const buildUrl = () => {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const qs = params.toString();
    return `/api/customers/${customerId}/statement${qs ? `?${qs}` : ""}`;
  };

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/customers", customerId, "statement", startDate, endDate],
    queryFn: () => fetch(buildUrl()).then(r => r.json()),
  });

  const paymentMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/payments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId, "statement"] });
      toast({ title: "تم تسجيل الدفعة بنجاح" });
      setPaymentDialog(null);
      setPaymentForm({ amount: "", paymentMethod: "cash", paymentDate: new Date().toISOString().split("T")[0], notes: "" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const handleRecordPayment = () => {
    if (!paymentDialog || !paymentForm.amount) return;
    paymentMutation.mutate({
      invoiceId: paymentDialog.id,
      amount: paymentForm.amount,
      paymentMethod: paymentForm.paymentMethod,
      paymentDate: paymentForm.paymentDate,
      notes: paymentForm.notes,
    });
  };

  if (isLoading) {
    return <div className="p-6 space-y-4" dir="rtl"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!data?.customer) {
    return <div className="p-6" dir="rtl"><p className="text-muted-foreground">العميل غير موجود</p></div>;
  }

  const { customer, invoices, summary } = data;

  const getTypeBadge = (type: string) => {
    if (type === "sale") return <Badge variant="default">فاتورة بيع</Badge>;
    if (type === "sale_return") return <Badge variant="secondary">مرتجع بيع</Badge>;
    return <Badge variant="secondary">{type}</Badge>;
  };

  return (
    <div className="p-6 space-y-6 overflow-auto h-full" dir="rtl">
      <div className="flex items-center gap-4">
        <Link href="/customers">
          <Button variant="ghost" size="sm"><ArrowRight className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-customer-statement-title">
          <User className="w-6 h-6" /> كشف حساب: {customer.name}
        </h1>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">من تاريخ</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} data-testid="input-start-date" className="w-44" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground whitespace-nowrap">إلى تاريخ</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} data-testid="input-end-date" className="w-44" />
            </div>
            {(startDate || endDate) && (
              <Button variant="outline" size="sm" onClick={() => { setStartDate(""); setEndDate(""); }} data-testid="button-clear-dates">
                مسح الفلتر
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">عدد المعاملات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-invoices">{summary.totalInvoices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><TrendingUp className="w-4 h-4 text-red-500" /> إجمالي المدين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-total-debit">{parseFloat(summary.totalDebit).toLocaleString()} ج.م</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><TrendingDown className="w-4 h-4 text-green-500" /> إجمالي الدائن</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-total-credit">{parseFloat(summary.totalCredit).toLocaleString()} ج.م</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Scale className="w-4 h-4" /> صافي الرصيد</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${parseFloat(summary.netBalance) >= 0 ? "text-red-600" : "text-green-600"}`} data-testid="text-net-balance">
              {parseFloat(summary.netBalance).toLocaleString()} ج.م
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> تاريخ التعاملات</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">رقم الفاتورة</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">نوع الدفع</TableHead>
                <TableHead className="text-right">مدين</TableHead>
                <TableHead className="text-right">دائن</TableHead>
                <TableHead className="text-right">المتبقي</TableHead>
                <TableHead className="text-right">الرصيد</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices?.map((inv: any) => (
                <TableRow key={inv.id} data-testid={`row-statement-inv-${inv.id}`}>
                  <TableCell className="font-mono">{inv.invoiceNumber}</TableCell>
                  <TableCell>{inv.invoiceDate}</TableCell>
                  <TableCell>{getTypeBadge(inv.type)}</TableCell>
                  <TableCell>
                    <Badge variant={inv.paymentType === "deferred" ? "destructive" : inv.paymentType === "partial" ? "secondary" : "default"}>
                      {paymentTypeLabels[inv.paymentType] || "مدفوعة"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold text-red-600" data-testid={`text-debit-${inv.id}`}>
                    {parseFloat(inv.debit) > 0 ? `${parseFloat(inv.debit).toLocaleString()} ج.م` : "-"}
                  </TableCell>
                  <TableCell className="font-bold text-green-600" data-testid={`text-credit-${inv.id}`}>
                    {parseFloat(inv.credit) > 0 ? `${parseFloat(inv.credit).toLocaleString()} ج.م` : "-"}
                  </TableCell>
                  <TableCell className="font-bold text-orange-600" data-testid={`text-outstanding-${inv.id}`}>
                    {parseFloat(inv.outstanding) > 0 ? `${parseFloat(inv.outstanding).toLocaleString()} ج.م` : "-"}
                  </TableCell>
                  <TableCell className="font-bold" data-testid={`text-balance-${inv.id}`}>
                    {parseFloat(inv.balance).toLocaleString()} ج.م
                  </TableCell>
                  <TableCell>
                    {inv.type === "sale" && (inv.paymentType === "deferred" || inv.paymentType === "partial") && parseFloat(inv.outstanding) > 0 && (
                      <Button variant="outline" size="sm" onClick={() => {
                        setPaymentDialog(inv);
                        setPaymentForm({ amount: inv.outstanding, paymentMethod: "cash", paymentDate: new Date().toISOString().split("T")[0], notes: "" });
                      }} data-testid={`button-record-payment-${inv.id}`}>
                        <CreditCard className="w-4 h-4 ml-1" /> تسجيل دفعة
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!invoices || invoices.length === 0) && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    لا توجد تعاملات بعد
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div><strong>الهاتف:</strong> {customer.phone || "-"}</div>
        <div><strong>البريد:</strong> {customer.email || "-"}</div>
        <div><strong>العنوان:</strong> {customer.address || "-"}</div>
        <div><strong>الرقم الضريبي:</strong> {customer.taxNumber || "-"}</div>
      </div>

      <Dialog open={!!paymentDialog} onOpenChange={(v) => { if (!v) setPaymentDialog(null); }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تسجيل دفعة - فاتورة {paymentDialog?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>المبلغ المتبقي</Label>
              <div className="text-lg font-bold text-orange-600">{parseFloat(paymentDialog?.outstanding || "0").toLocaleString()} ج.م</div>
            </div>
            <div>
              <Label>مبلغ الدفعة *</Label>
              <Input type="number" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} data-testid="input-payment-amount" />
            </div>
            <div>
              <Label>طريقة الدفع</Label>
              <Select value={paymentForm.paymentMethod} onValueChange={(v) => setPaymentForm({ ...paymentForm, paymentMethod: v })}>
                <SelectTrigger data-testid="select-payment-method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقدي</SelectItem>
                  <SelectItem value="vodafone_cash">فودافون كاش</SelectItem>
                  <SelectItem value="instapay">انستاباي</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="check">شيك</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>تاريخ الدفعة</Label>
              <Input type="date" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} data-testid="input-payment-date" />
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Input value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} data-testid="input-payment-notes" />
            </div>
            <Button className="w-full" onClick={handleRecordPayment} disabled={paymentMutation.isPending || !paymentForm.amount} data-testid="button-submit-payment">
              {paymentMutation.isPending ? "جاري التسجيل..." : "تسجيل الدفعة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
