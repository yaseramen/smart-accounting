import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Wallet, AlertTriangle, Loader2, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import type { WalletTransaction } from "@shared/schema";

export default function WalletPage() {
  const { data: balanceData, isLoading: balanceLoading } = useQuery<{
    balance: string; lowBalance: boolean; supportPhone1: string; supportPhone2: string;
  }>({ queryKey: ["/api/wallet/balance"] });

  const { data: transactions = [], isLoading: txLoading } = useQuery<WalletTransaction[]>({
    queryKey: ["/api/wallet/transactions"],
  });

  const balance = parseFloat(balanceData?.balance || "0");

  return (
    <div className="p-6 h-full overflow-auto" dir="rtl">
      <div className="flex items-center gap-2 mb-6">
        <Wallet className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-page-title">المحفظة الإلكترونية</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">الرصيد الحالي</CardTitle></CardHeader>
          <CardContent>
            {balanceLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
              <div>
                <p className="text-3xl font-bold" data-testid="text-wallet-balance">{balance.toFixed(2)} ج.م</p>
                {balanceData?.lowBalance && (
                  <div className="flex items-center gap-2 mt-2 text-yellow-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm" data-testid="text-low-balance-warning">تنبيه: الرصيد منخفض!</span>
                  </div>
                )}
                {balance <= 0 && (
                  <div className="mt-3 p-3 bg-destructive/10 rounded-lg">
                    <p className="text-destructive font-bold text-sm" data-testid="text-wallet-empty">الرصيد منتهي - سيتم إيقاف الوصول للنظام</p>
                    <p className="text-sm mt-1">للشحن تواصل معنا:</p>
                    <p className="text-sm font-mono">{balanceData?.supportPhone1}</p>
                    <p className="text-sm font-mono">{balanceData?.supportPhone2}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">معلومات الشحن</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm mb-2">للشحن تواصل مع فريق الدعم:</p>
            <p className="font-mono text-lg" data-testid="text-charge-phone1">01009376052</p>
            <p className="font-mono text-lg" data-testid="text-charge-phone2">01556660502</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>سجل حركات المحفظة</CardTitle></CardHeader>
        <CardContent className="p-0">
          {txLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>الرصيد قبل</TableHead>
                  <TableHead>الرصيد بعد</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map(tx => (
                  <TableRow key={tx.id} data-testid={`row-tx-${tx.id}`}>
                    <TableCell>{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString("ar-EG") : "-"}</TableCell>
                    <TableCell>
                      {tx.type === "charge" ? (
                        <Badge variant="default" className="bg-green-100 text-green-800"><ArrowUpCircle className="w-3 h-3 ml-1" />شحن</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-red-100 text-red-800"><ArrowDownCircle className="w-3 h-3 ml-1" />خصم</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">{tx.amount} ج.م</TableCell>
                    <TableCell>{tx.description}</TableCell>
                    <TableCell className="font-mono">{tx.balanceBefore}</TableCell>
                    <TableCell className="font-mono">{tx.balanceAfter}</TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد حركات</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
