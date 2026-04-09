import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Loader2 } from "lucide-react";
import type { AuditLog } from "@shared/schema";

export default function AuditLogPage() {
  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({ queryKey: ["/api/audit-log"] });

  const actionLabel = (action: string) => {
    switch (action) {
      case "create": return <Badge className="bg-green-100 text-green-800">إنشاء</Badge>;
      case "update": return <Badge className="bg-blue-100 text-blue-800">تعديل</Badge>;
      case "delete": return <Badge className="bg-red-100 text-red-800">حذف</Badge>;
      default: return <Badge variant="secondary">{action}</Badge>;
    }
  };

  return (
    <div className="p-6 h-full overflow-auto" dir="rtl">
      <div className="flex items-center gap-2 mb-6">
        <ScrollText className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-page-title">سجل العمليات</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>العملية</TableHead>
                  <TableHead>الجدول</TableHead>
                  <TableHead>التفاصيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                    <TableCell className="text-sm">{log.createdAt ? new Date(log.createdAt).toLocaleString("ar-EG") : "-"}</TableCell>
                    <TableCell>{log.userName}</TableCell>
                    <TableCell>{actionLabel(log.action)}</TableCell>
                    <TableCell className="font-mono text-xs">{log.tableName}</TableCell>
                    <TableCell className="text-sm">{log.details || "-"}</TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا توجد عمليات مسجلة</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
