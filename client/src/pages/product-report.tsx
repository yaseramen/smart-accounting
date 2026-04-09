import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowRight, Package, TrendingUp, TrendingDown, Warehouse } from "lucide-react";
import { Link } from "wouter";

export default function ProductReportPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/products", productId, "report"],
    queryFn: () => fetch(`/api/products/${productId}/report`).then(r => r.json()),
  });

  if (isLoading) {
    return <div className="p-6 space-y-4" dir="rtl"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!data?.product) {
    return <div className="p-6" dir="rtl"><p className="text-muted-foreground">المنتج غير موجود</p></div>;
  }

  const { product, sales, purchases, warehouseStock, summary } = data;

  return (
    <div className="p-6 space-y-6 overflow-auto h-full" dir="rtl">
      <div className="flex items-center gap-4">
        <Link href="/products">
          <Button variant="ghost" size="sm"><ArrowRight className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-product-report-title">
          <Package className="w-6 h-6" /> تقرير المنتج: {product.name}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">المخزون الحالي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-current-stock">{parseFloat(summary.currentStock).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">إجمالي المشتريات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalPurchased.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">إجمالي المبيعات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalSold.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">إيرادات المبيعات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{parseFloat(summary.totalSalesRevenue).toLocaleString()} ج.م</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">تكلفة المشتريات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{parseFloat(summary.totalPurchaseCost).toLocaleString()} ج.م</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">إجمالي الأرباح</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${parseFloat(summary.totalProfit) >= 0 ? "text-green-600" : "text-red-600"}`} data-testid="text-total-profit">
              {parseFloat(summary.totalProfit).toLocaleString()} ج.م
            </div>
          </CardContent>
        </Card>
      </div>

      {warehouseStock.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Warehouse className="w-5 h-5" /> الكميات في المخازن</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المخزن</TableHead>
                  <TableHead className="text-right">الكمية</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouseStock.map((ws: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{ws.warehouseName}</TableCell>
                    <TableCell>{parseFloat(ws.quantity).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingDown className="w-5 h-5" /> حركة الشراء (الموردون)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الفاتورة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">المورد</TableHead>
                  <TableHead className="text-right">الكمية</TableHead>
                  <TableHead className="text-right">الإجمالي</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases?.map((p: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono">{p.invoiceNumber}</TableCell>
                    <TableCell>{p.invoiceDate}</TableCell>
                    <TableCell>{p.supplierName || "-"}</TableCell>
                    <TableCell>{p.quantity}</TableCell>
                    <TableCell className="font-bold">{parseFloat(p.total).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={p.status === "approved" ? "default" : "secondary"}>{p.status === "approved" ? "معتمدة" : "مسودة"}</Badge></TableCell>
                  </TableRow>
                ))}
                {(!purchases || purchases.length === 0) && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">لا توجد مشتريات</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> حركة البيع (العملاء)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الفاتورة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">الكمية</TableHead>
                  <TableHead className="text-right">الإجمالي</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales?.map((s: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono">{s.invoiceNumber}</TableCell>
                    <TableCell>{s.invoiceDate}</TableCell>
                    <TableCell>{s.customerName || "-"}</TableCell>
                    <TableCell>{s.quantity}</TableCell>
                    <TableCell className="font-bold">{parseFloat(s.total).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={s.status === "approved" ? "default" : "secondary"}>{s.status === "approved" ? "معتمدة" : "مسودة"}</Badge></TableCell>
                  </TableRow>
                ))}
                {(!sales || sales.length === 0) && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">لا توجد مبيعات</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
