import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Users, Truck, FileText, TrendingUp, TrendingDown, DollarSign, Wallet, Package, Receipt, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import type { DashboardStats } from "@shared/schema";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const CHART_COLORS = [
  "hsl(210, 70%, 50%)",
  "hsl(0, 65%, 55%)",
  "hsl(140, 60%, 45%)",
  "hsl(35, 80%, 55%)",
];

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const formatCurrency = (value: string) => {
    const num = parseFloat(value || "0");
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatChartValue = (value: number) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" dir="rtl">
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const summaryCards = [
    { title: "إجمالي الحسابات", value: stats?.totalAccounts || 0, icon: BookOpen, color: "text-blue-600 dark:text-blue-400" },
    { title: "العملاء", value: stats?.totalCustomers || 0, icon: Users, color: "text-green-600 dark:text-green-400" },
    { title: "الموردين", value: stats?.totalSuppliers || 0, icon: Truck, color: "text-orange-600 dark:text-orange-400" },
    { title: "قيود اليومية", value: stats?.totalJournalEntries || 0, icon: FileText, color: "text-purple-600 dark:text-purple-400" },
    { title: "المنتجات", value: stats?.totalProducts || 0, icon: Package, color: "text-cyan-600 dark:text-cyan-400" },
    { title: "الفواتير", value: stats?.totalInvoices || 0, icon: Receipt, color: "text-pink-600 dark:text-pink-400" },
  ];

  const financialCards = [
    { title: "إجمالي الأصول", value: formatCurrency(stats?.totalAssets || "0"), icon: Wallet, color: "text-blue-600 dark:text-blue-400" },
    { title: "إجمالي الخصوم", value: formatCurrency(stats?.totalLiabilities || "0"), icon: DollarSign, color: "text-red-600 dark:text-red-400" },
    { title: "الإيرادات", value: formatCurrency(stats?.totalRevenue || "0"), icon: TrendingUp, color: "text-green-600 dark:text-green-400" },
    { title: "المصروفات", value: formatCurrency(stats?.totalExpenses || "0"), icon: TrendingDown, color: "text-orange-600 dark:text-orange-400" },
  ];

  const grossProfit = parseFloat(stats?.grossProfit || "0");
  const profitCards = [
    { title: "إجمالي المبيعات", value: formatCurrency(stats?.totalSales || "0"), icon: TrendingUp, color: "text-green-600 dark:text-green-400" },
    { title: "إجمالي المشتريات", value: formatCurrency(stats?.totalPurchases || "0"), icon: TrendingDown, color: "text-red-600 dark:text-red-400" },
    { title: "مجمل الربح", value: formatCurrency(stats?.grossProfit || "0"), icon: BarChart3, color: grossProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400" },
  ];

  const monthlyData = stats?.monthlySalesPurchases || [];
  const accountDistribution = (stats?.accountTypeDistribution || []).filter(d => d.total > 0);

  const formatMonth = (month: string) => {
    const [year, m] = month.split("-");
    const monthNames: Record<string, string> = {
      "01": "يناير", "02": "فبراير", "03": "مارس", "04": "أبريل",
      "05": "مايو", "06": "يونيو", "07": "يوليو", "08": "أغسطس",
      "09": "سبتمبر", "10": "أكتوبر", "11": "نوفمبر", "12": "ديسمبر",
    };
    return `${monthNames[m] || m} ${year}`;
  };

  const chartMonthlyData = monthlyData.map(d => ({
    ...d,
    monthLabel: formatMonth(d.month),
  }));

  return (
    <div className="p-6 space-y-6 overflow-auto h-full" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">لوحة التحكم</h1>
        <p className="text-muted-foreground">نظرة عامة على أداء الشركة</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`text-stat-${card.title}`}>{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">الملخص المالي</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {financialCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold" data-testid={`text-financial-${card.title}`}>{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">الأرباح والخسائر</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {profitCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold" data-testid={`text-profit-${card.title}`}>{card.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">المبيعات والمشتريات - آخر 6 أشهر</CardTitle>
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {chartMonthlyData.length > 0 ? (
              <div data-testid="chart-monthly-sales-purchases" style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartMonthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatChartValue(v)} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatChartValue(value),
                        name === "sales" ? "المبيعات" : "المشتريات",
                      ]}
                      labelFormatter={(label) => label}
                      contentStyle={{ direction: "rtl", borderRadius: 8 }}
                    />
                    <Legend
                      formatter={(value) => (value === "sales" ? "المبيعات" : "المشتريات")}
                    />
                    <Bar dataKey="sales" fill="hsl(140, 60%, 45%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="purchases" fill="hsl(0, 65%, 55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground" data-testid="chart-monthly-empty">
                لا توجد بيانات لعرضها
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">توزيع أنواع الحسابات</CardTitle>
            <PieChartIcon className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {accountDistribution.length > 0 ? (
              <div data-testid="chart-account-distribution" style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={accountDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="total"
                      nameKey="type"
                      label={({ type, percent }) => `${type} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {accountDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatChartValue(value)}
                      contentStyle={{ direction: "rtl", borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground" data-testid="chart-distribution-empty">
                لا توجد بيانات لعرضها
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
