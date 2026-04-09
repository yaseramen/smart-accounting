import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Wallet, ArrowUpCircle, ArrowDownCircle, Printer, Filter } from "lucide-react";

type PeriodType = "all" | "daily" | "weekly" | "monthly" | "yearly" | "custom";

type TreasuryTransaction = {
  id: number;
  date: string;
  entryNumber: string;
  description: string;
  lineDescription?: string;
  debit: string;
  credit: string;
  accountName: string;
};

type TreasuryData = {
  balance: string;
  transactions: TreasuryTransaction[];
};

type TreasuryReport = {
  balance: string;
  totalIn: string;
  totalOut: string;
  transactions: TreasuryTransaction[];
};

function getDateRange(period: PeriodType): { start: string; end: string } {
  const today = new Date();
  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  switch (period) {
    case "daily":
      return { start: formatDate(today), end: formatDate(today) };
    case "weekly": {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return { start: formatDate(weekStart), end: formatDate(today) };
    }
    case "monthly": {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: formatDate(monthStart), end: formatDate(today) };
    }
    case "yearly": {
      const yearStart = new Date(today.getFullYear(), 0, 1);
      return { start: formatDate(yearStart), end: formatDate(today) };
    }
    case "custom":
    case "all":
      return { start: "2020-01-01", end: formatDate(today) };
  }
}

export default function TreasuryPage() {
  const [period, setPeriod] = useState<PeriodType>("all");
  const [customStart, setCustomStart] = useState(() => getDateRange("monthly").start);
  const [customEnd, setCustomEnd] = useState(() => getDateRange("monthly").end);

  const useFiltering = period !== "all";
  const dateRange = period === "custom"
    ? { start: customStart, end: customEnd }
    : getDateRange(period);

  const { data: treasuryData, isLoading: loadingData } = useQuery<TreasuryData>({
    queryKey: ["/api/treasury"],
  });

  const { data: reportData, isLoading: loadingReport } = useQuery<TreasuryReport>({
    queryKey: ["/api/treasury/report", `?startDate=${dateRange.start}&endDate=${dateRange.end}`],
    enabled: useFiltering,
  });

  const isLoading = loadingData || (useFiltering && loadingReport);

  const balance = treasuryData?.balance || "0";
  const transactions = useFiltering
    ? (reportData?.transactions || [])
    : (treasuryData?.transactions || []);
  const totalIn = useFiltering ? (reportData?.totalIn || "0") : null;
  const totalOut = useFiltering ? (reportData?.totalOut || "0") : null;

  const formatCurrency = (value: string) => {
    const num = parseFloat(value || "0");
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 2,
    }).format(num);
  };

  const handlePeriodChange = (val: string) => {
    const newPeriod = val as PeriodType;
    setPeriod(newPeriod);
    if (newPeriod !== "custom" && newPeriod !== "all") {
      const range = getDateRange(newPeriod);
      setCustomStart(range.start);
      setCustomEnd(range.end);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const balanceNum = parseFloat(balance);

  return (
    <div className="p-6 space-y-6 overflow-auto h-full" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-treasury-title">الخزينة</h1>
          <p className="text-muted-foreground">إدارة حركات الصندوق والنقدية</p>
        </div>
        <Button variant="outline" onClick={handlePrint} data-testid="button-print-treasury">
          <Printer className="w-4 h-4 ml-2" />
          طباعة
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">رصيد الخزينة</CardTitle>
            <Wallet className={`w-5 h-5 ${balanceNum >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className={`text-2xl font-bold ${balanceNum >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-treasury-balance">
                {formatCurrency(balance)}
              </div>
            )}
          </CardContent>
        </Card>

        {useFiltering && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الوارد</CardTitle>
                <ArrowUpCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                {loadingReport ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-treasury-total-in">
                    {formatCurrency(totalIn || "0")}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الصادر</CardTitle>
                <ArrowDownCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </CardHeader>
              <CardContent>
                {loadingReport ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-treasury-total-out">
                    {formatCurrency(totalOut || "0")}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            تصفية حسب الفترة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end flex-wrap gap-4">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">الفترة</label>
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-40" data-testid="select-treasury-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="daily">يومي</SelectItem>
                  <SelectItem value="weekly">أسبوعي</SelectItem>
                  <SelectItem value="monthly">شهري</SelectItem>
                  <SelectItem value="yearly">سنوي</SelectItem>
                  <SelectItem value="custom">مخصص</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {period === "custom" && (
              <>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">من تاريخ</label>
                  <Input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    data-testid="input-treasury-start-date"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">إلى تاريخ</label>
                  <Input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    data-testid="input-treasury-end-date"
                  />
                </div>
              </>
            )}
            {useFiltering && (
              <div className="text-sm text-muted-foreground">
                من <span className="font-medium" data-testid="text-treasury-period-start">{dateRange.start}</span> إلى{" "}
                <span className="font-medium" data-testid="text-treasury-period-end">{dateRange.end}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">حركات الخزينة</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-treasury-empty">
              لا توجد حركات في الخزينة
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">رقم القيد</TableHead>
                    <TableHead className="text-right">البيان</TableHead>
                    <TableHead className="text-right">الحساب</TableHead>
                    <TableHead className="text-right">وارد (مدين)</TableHead>
                    <TableHead className="text-right">صادر (دائن)</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => {
                    const debitNum = parseFloat(t.debit);
                    const creditNum = parseFloat(t.credit);
                    const isDeposit = debitNum > 0;

                    return (
                      <TableRow key={t.id} data-testid={`row-treasury-${t.id}`}>
                        <TableCell data-testid={`text-treasury-date-${t.id}`}>{t.date}</TableCell>
                        <TableCell data-testid={`text-treasury-entry-${t.id}`}>{t.entryNumber}</TableCell>
                        <TableCell data-testid={`text-treasury-desc-${t.id}`}>{t.lineDescription || t.description}</TableCell>
                        <TableCell data-testid={`text-treasury-account-${t.id}`}>{t.accountName}</TableCell>
                        <TableCell>
                          {debitNum > 0 && (
                            <span className="text-green-600 dark:text-green-400 font-medium" data-testid={`text-treasury-debit-${t.id}`}>
                              {formatCurrency(t.debit)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {creditNum > 0 && (
                            <span className="text-red-600 dark:text-red-400 font-medium" data-testid={`text-treasury-credit-${t.id}`}>
                              {formatCurrency(t.credit)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isDeposit ? "default" : "secondary"} data-testid={`badge-treasury-type-${t.id}`}>
                            {isDeposit ? "وارد" : "صادر"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
