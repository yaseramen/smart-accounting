import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { Account, LedgerEntry } from "@shared/schema";

export default function LedgerPage() {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({ queryKey: ["/api/accounts"] });

  const { data: ledger, isLoading: ledgerLoading } = useQuery<LedgerEntry[]>({
    queryKey: ["/api/ledger", selectedAccountId],
    enabled: !!selectedAccountId,
  });

  const formatNumber = (val: string) => new Intl.NumberFormat("ar-EG", { minimumFractionDigits: 2 }).format(parseFloat(val || "0"));

  const selectedAccount = accounts?.find(a => a.id.toString() === selectedAccountId);

  if (accountsLoading) {
    return (
      <div className="p-6 space-y-4" dir="rtl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 overflow-auto h-full" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-ledger-title">دفتر الأستاذ</h1>
        <p className="text-muted-foreground">عرض حركة الحسابات المحاسبية</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">اختر الحساب</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md space-y-2">
            <Label>الحساب</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger data-testid="select-ledger-account"><SelectValue placeholder="اختر حساب لعرض حركته" /></SelectTrigger>
              <SelectContent>
                {accounts?.map((a) => (
                  <SelectItem key={a.id} value={a.id.toString()}>{a.code} - {a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedAccountId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              حركة حساب: {selectedAccount?.code} - {selectedAccount?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ledgerLoading ? (
              <div className="p-6"><Skeleton className="h-48 w-full" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">رقم القيد</TableHead>
                    <TableHead className="text-right">البيان</TableHead>
                    <TableHead className="text-right">مدين</TableHead>
                    <TableHead className="text-right">دائن</TableHead>
                    <TableHead className="text-right">الرصيد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger?.map((entry, i) => (
                    <TableRow key={i} data-testid={`row-ledger-${i}`}>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell className="font-mono">{entry.entryNumber}</TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell className="font-mono">{formatNumber(entry.debit)}</TableCell>
                      <TableCell className="font-mono">{formatNumber(entry.credit)}</TableCell>
                      <TableCell className="font-mono font-bold">{formatNumber(entry.balance)}</TableCell>
                    </TableRow>
                  ))}
                  {(!ledger || ledger.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        لا توجد حركات مسجلة على هذا الحساب
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
