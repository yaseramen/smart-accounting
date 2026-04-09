import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Users, CreditCard, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

const paymentTypeLabels: Record<string, string> = { paid: "مدفوعة", deferred: "آجلة", partial: "مدفوع جزئياً" };

export default function ReceivablesPage() {
  const { toast } = useToast();
  const [paymentDialog, setPaymentDialog] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", paymentMethod: "cash", paymentDate: new Date().toISOString().split("T")[0], notes: "" });

  const { data, isLoading } = useQuery<any[]>({
    queryKey: ["/api/outstanding/receivables"],
  });

  const paymentMutation = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/payments", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outstanding/receivables"] });
      toast({ title: "تم تسجيل الدفعة بنجاح" });
      setPaymentDialog(null);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const totalOutstanding = data?.reduce((s, g) => s + parseFloat(g.totalOutstanding || "0"), 0) || 0;

  if (isLoading) {
    return <div className="p-6 space-y-4" dir="rtl"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-receivables-title">
          <AlertTriangle className="w-6 h-6 text-orange-500" /> المستحقات على العملاء
        </h1>
        <Card className="px-4 py-2">
          <div className="text-sm text-muted-foreground">إجمالي المستحقات</div>
          <div className="text-xl font-bold text-red-600" data-testid="text-total-receivables">{totalOutstanding.toLocaleString()} ج.م</div>
        </Card>
      </div>

      {(!data || data.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد مستحقات متأخرة</p>
          </CardContent>
        </Card>
      ) : (
        data.map((group: any) => (
          <Card key={group.customer.id} data-testid={`card-customer-${group.customer.id}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <Link href={`/customers/${group.customer.id}/statement`} className="text-primary hover:underline flex items-center gap-2">
                  <Users className="w-5 h-5" /> {group.customer.name}
                </Link>
                <Badge variant="destructive" className="text-base px-3 py-1">
                  {parseFloat(group.totalOutstanding).toLocaleString()} ج.م
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم الفاتورة</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الإجمالي</TableHead>
                    <TableHead className="text-right">المدفوع</TableHead>
                    <TableHead className="text-right">المتبقي</TableHead>
                    <TableHead className="text-right">نوع الدفع</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.invoices.map((inv: any) => (
                    <TableRow key={inv.id} data-testid={`row-receivable-${inv.id}`}>
                      <TableCell className="font-mono">{inv.invoiceNumber}</TableCell>
                      <TableCell>{inv.invoiceDate}</TableCell>
                      <TableCell className="font-bold">{parseFloat(inv.total).toLocaleString()} ج.م</TableCell>
                      <TableCell className="text-green-600">{parseFloat(inv.paidAmount || "0").toLocaleString()} ج.م</TableCell>
                      <TableCell className="font-bold text-orange-600">{parseFloat(inv.outstanding).toLocaleString()} ج.م</TableCell>
                      <TableCell>
                        <Badge variant={inv.paymentType === "deferred" ? "destructive" : "secondary"}>
                          {paymentTypeLabels[inv.paymentType] || inv.paymentType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => {
                          setPaymentDialog(inv);
                          setPaymentForm({ amount: inv.outstanding, paymentMethod: "cash", paymentDate: new Date().toISOString().split("T")[0], notes: "" });
                        }} data-testid={`button-pay-receivable-${inv.id}`}>
                          <CreditCard className="w-4 h-4 ml-1" /> تسجيل دفعة
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}

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
            <Button className="w-full" onClick={() => {
              if (!paymentDialog || !paymentForm.amount) return;
              paymentMutation.mutate({
                invoiceId: paymentDialog.id,
                amount: paymentForm.amount,
                paymentMethod: paymentForm.paymentMethod,
                paymentDate: paymentForm.paymentDate,
                notes: paymentForm.notes,
              });
            }} disabled={paymentMutation.isPending || !paymentForm.amount} data-testid="button-submit-payment">
              {paymentMutation.isPending ? "جاري التسجيل..." : "تسجيل الدفعة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
