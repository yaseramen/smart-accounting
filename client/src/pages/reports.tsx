import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Printer } from "lucide-react";
import type { ProfitLossReport } from "@shared/schema";

type PeriodType = "daily" | "weekly" | "monthly" | "yearly" | "custom";

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
      return { start: formatDate(today), end: formatDate(today) };
  }
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<PeriodType>("monthly");
  const [customStart, setCustomStart] = useState(() => getDateRange("monthly").start);
  const [customEnd, setCustomEnd] = useState(() => getDateRange("monthly").end);

  const dateRange = period === "custom"
    ? { start: customStart, end: customEnd }
    : getDateRange(period);

  const { data: report, isLoading } = useQuery<ProfitLossReport>({
    queryKey: ["/api/reports/profit-loss", `?startDate=${dateRange.start}&endDate=${dateRange.end}`],
  });

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
    if (newPeriod !== "custom") {
      const range = getDateRange(newPeriod);
      setCustomStart(range.start);
      setCustomEnd(range.end);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const grossProfit = parseFloat(report?.grossProfit || "0");
  const netProfit = parseFloat(report?.netProfit || "0");

  return (
    <div className="p-6 space-y-6 overflow-auto h-full" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-reports-title">التقارير</h1>
          <p className="text-muted-foreground">تقرير الأرباح والخسائر</p>
        </div>
        <Button variant="outline" onClick={handlePrint} data-testid="button-print-report">
          <Printer className="w-4 h-4 ml-2" />
          طباعة
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">فترة التقرير</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end flex-wrap gap-4">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">الفترة</label>
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-40" data-testid="select-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                    data-testid="input-start-date"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">إلى تاريخ</label>
                  <Input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    data-testid="input-end-date"
                  />
                </div>
              </>
            )}
            <div className="text-sm text-muted-foreground">
              من <span className="font-medium" data-testid="text-period-start">{dateRange.start}</span> إلى{" "}
              <span className="font-medium" data-testid="text-period-end">{dateRange.end}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : report ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">صافي المبيعات</CardTitle>
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold" data-testid="text-net-sales">{formatCurrency(report.netSales)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">صافي المشتريات</CardTitle>
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold" data-testid="text-net-purchases">{formatCurrency(report.netPurchases)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">مجمل الربح</CardTitle>
                <BarChart3 className={`w-5 h-5 ${grossProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-lg font-bold ${grossProfit >= 0 ? "" : "text-red-600 dark:text-red-400"}`} data-testid="text-gross-profit">{formatCurrency(report.grossProfit)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">صافي الربح</CardTitle>
                <DollarSign className={`w-5 h-5 ${netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-lg font-bold ${netProfit >= 0 ? "" : "text-red-600 dark:text-red-400"}`} data-testid="text-net-profit">{formatCurrency(report.netProfit)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>تفاصيل الأرباح والخسائر</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <h3 className="font-bold mb-3">الإيرادات</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="text-muted-foreground">إجمالي المبيعات</span>
                      <span className="font-medium" data-testid="text-total-sales">{formatCurrency(report.totalSales)}</span>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="text-muted-foreground">مرتجعات المبيعات</span>
                      <span className="font-medium text-red-600 dark:text-red-400" data-testid="text-sales-returns">({formatCurrency(report.totalSalesReturns)})</span>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-1 border-t pt-2">
                      <span className="font-bold">صافي المبيعات</span>
                      <span className="font-bold" data-testid="text-detail-net-sales">{formatCurrency(report.netSales)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-b pb-4">
                  <h3 className="font-bold mb-3">تكلفة المبيعات</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="text-muted-foreground">إجمالي المشتريات</span>
                      <span className="font-medium" data-testid="text-total-purchases">{formatCurrency(report.totalPurchases)}</span>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="text-muted-foreground">مرتجعات المشتريات</span>
                      <span className="font-medium text-green-600 dark:text-green-400" data-testid="text-purchase-returns">({formatCurrency(report.totalPurchasesReturns)})</span>
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-1 border-t pt-2">
                      <span className="font-bold">صافي المشتريات</span>
                      <span className="font-bold" data-testid="text-detail-net-purchases">{formatCurrency(report.netPurchases)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-b pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-lg font-bold">مجمل الربح</span>
                    <span className={`text-lg font-bold ${grossProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-detail-gross-profit">
                      {formatCurrency(report.grossProfit)}
                    </span>
                  </div>
                </div>

                <div className="border-b pb-4">
                  <h3 className="font-bold mb-3">المصروفات</h3>
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-muted-foreground">إجمالي المصروفات</span>
                    <span className="font-medium" data-testid="text-total-expenses">{formatCurrency(report.totalExpenses)}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-xl font-bold">صافي الربح / الخسارة</span>
                    <span className={`text-xl font-bold ${netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-detail-net-profit">
                      {formatCurrency(report.netProfit)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
