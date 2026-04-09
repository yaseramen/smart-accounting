import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, DollarSign, Building2, ReceiptText, Search, Calendar } from "lucide-react";

type PlatformEarnings = {
  totalEarnings: string;
  transactionCount: number;
  perCompany: {
    companyId: number;
    companyName: string;
    totalFees: string;
    transactionCount: number;
    customServiceFeeRate: string | null;
  }[];
  recentTransactions: {
    id: number;
    companyId: number;
    companyName: string;
    amount: string;
    description: string;
    createdAt: string;
  }[];
};

export default function PlatformEarningsPage() {
  const [period, setPeriod] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterCompanyId, setFilterCompanyId] = useState("");

  const getDateRange = () => {
    if (period === "custom") return { from: fromDate, to: toDate };
    const now = new Date();
    let from = "";
    if (period === "today") {
      from = now.toISOString().split("T")[0];
    } else if (period === "week") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      from = d.toISOString().split("T")[0];
    } else if (period === "month") {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      from = d.toISOString().split("T")[0];
    } else if (period === "year") {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      from = d.toISOString().split("T")[0];
    }
    return { from, to: period !== "all" ? now.toISOString().split("T")[0] : "" };
  };

  const dateRange = getDateRange();
  const queryParams = new URLSearchParams();
  if (dateRange.from) queryParams.set("from", dateRange.from);
  if (dateRange.to) queryParams.set("to", dateRange.to);
  if (filterCompanyId) queryParams.set("companyId", filterCompanyId);
  const queryString = queryParams.toString();

  const { data: earnings, isLoading } = useQuery<PlatformEarnings>({
    queryKey: ["/api/admin/platform-earnings", queryString],
    queryFn: () => fetch(`/api/admin/platform-earnings${queryString ? "?" + queryString : ""}`, { credentials: "include" }).then(r => r.json()),
  });

  const formatCurrency = (value: string) => {
    const num = parseFloat(value || "0");
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("ar-EG", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="p-6 space-y-6 overflow-auto h-full" dir="rtl">
      <div className="flex items-center gap-3">
        <TrendingUp className="w-7 h-7 text-green-600" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-platform-earnings-title">تقارير أرباح المنصة</h1>
          <p className="text-muted-foreground">إجمالي الرسوم المحصلة من الشركات</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4" />
            فلترة التقرير
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-sm font-medium mb-1 block">الفترة</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-40" data-testid="select-period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="today">اليوم</SelectItem>
                  <SelectItem value="week">آخر أسبوع</SelectItem>
                  <SelectItem value="month">آخر شهر</SelectItem>
                  <SelectItem value="year">آخر سنة</SelectItem>
                  <SelectItem value="custom">مخصص</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {period === "custom" && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">من تاريخ</label>
                  <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} data-testid="input-from-date" dir="ltr" className="w-40" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">إلى تاريخ</label>
                  <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} data-testid="input-to-date" dir="ltr" className="w-40" />
                </div>
              </>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">شركة معينة (رقم)</label>
              <Input
                type="number"
                value={filterCompanyId}
                onChange={e => setFilterCompanyId(e.target.value)}
                data-testid="input-filter-company-id"
                placeholder="اترك فارغ للكل"
                dir="ltr"
                className="w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي أرباح المنصة</CardTitle>
                <DollarSign className="w-5 h-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600" data-testid="text-total-earnings">
                  {formatCurrency(earnings?.totalEarnings || "0")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">عدد العمليات</CardTitle>
                <ReceiptText className="w-5 h-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-transaction-count">
                  {earnings?.transactionCount || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                أرباح المنصة حسب الشركة
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>الشركة</TableHead>
                    <TableHead>إجمالي الرسوم</TableHead>
                    <TableHead>عدد الفواتير</TableHead>
                    <TableHead>نسبة الرسوم</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings?.perCompany?.map((c, i) => (
                    <TableRow key={c.companyId} data-testid={`row-earning-company-${c.companyId}`}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{c.companyName}</TableCell>
                      <TableCell className="font-mono text-green-600 font-bold">{formatCurrency(c.totalFees)}</TableCell>
                      <TableCell>{c.transactionCount}</TableCell>
                      <TableCell>
                        {c.customServiceFeeRate
                          ? <span className="text-primary font-bold">{(parseFloat(c.customServiceFeeRate) * 100).toFixed(4)}% (مخصص)</span>
                          : <span className="text-muted-foreground">افتراضي</span>
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!earnings?.perCompany || earnings.perCompany.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        لا توجد بيانات أرباح
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                آخر عمليات الخصم (رسوم الخدمة)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>الشركة</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings?.recentTransactions?.map((t, i) => (
                    <TableRow key={t.id} data-testid={`row-transaction-${t.id}`}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{t.companyName}</TableCell>
                      <TableCell className="font-mono text-green-600">{formatCurrency(t.amount)}</TableCell>
                      <TableCell className="text-sm">{t.description}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                  {(!earnings?.recentTransactions || earnings.recentTransactions.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        لا توجد عمليات خصم
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
