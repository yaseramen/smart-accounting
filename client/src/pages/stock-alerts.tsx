import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
import type { StockAlert } from "@shared/schema";

export default function StockAlertsPage() {
  const { data: alerts, isLoading } = useQuery<StockAlert[]>({ queryKey: ["/api/stock-alerts"] });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4" dir="rtl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 overflow-auto h-full" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-stock-alerts-title">
          <AlertTriangle className="w-6 h-6 text-yellow-500" /> تنبيهات المخزون
        </h1>
        <Badge variant="destructive" data-testid="badge-alerts-count">
          {alerts?.length || 0} تنبيه
        </Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">كود المنتج</TableHead>
                <TableHead className="text-right">اسم المنتج</TableHead>
                <TableHead className="text-right">المخزون الحالي</TableHead>
                <TableHead className="text-right">حد إعادة الطلب</TableHead>
                <TableHead className="text-right">الوحدة</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts?.map((alert) => {
                const current = parseFloat(alert.currentStock);
                const reorder = parseFloat(alert.reorderLevel);
                const isZero = current <= 0;
                return (
                  <TableRow key={alert.productId} data-testid={`row-alert-${alert.productId}`}>
                    <TableCell className="font-mono">{alert.productCode}</TableCell>
                    <TableCell className="font-medium">{alert.productName}</TableCell>
                    <TableCell className={isZero ? "text-destructive font-bold" : "text-yellow-600 font-bold"}>
                      {current.toLocaleString()}
                    </TableCell>
                    <TableCell>{reorder.toLocaleString()}</TableCell>
                    <TableCell>{alert.primaryUnitSymbol}</TableCell>
                    <TableCell>
                      {isZero ? (
                        <Badge variant="destructive" data-testid={`badge-alert-${alert.productId}`}>نفد المخزون</Badge>
                      ) : (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-600" data-testid={`badge-alert-${alert.productId}`}>
                          مخزون منخفض
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!alerts || alerts.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    لا توجد تنبيهات - جميع المنتجات فوق حد إعادة الطلب
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
