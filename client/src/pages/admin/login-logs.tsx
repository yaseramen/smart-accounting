import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { LogIn, LogOut, Monitor } from "lucide-react";
import type { LoginLog } from "@shared/schema";

export default function LoginLogsPage() {
  const { data: logs, isLoading } = useQuery<LoginLog[]>({
    queryKey: ["/api/login-logs"],
  });

  const formatDate = (dateStr: string | Date | null) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const parseUserAgent = (ua: string | null) => {
    if (!ua) return "غير معروف";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    if (ua.includes("Edge")) return "Edge";
    return "متصفح آخر";
  };

  return (
    <div className="p-4 space-y-4 overflow-auto h-full" dir="rtl">
      <div className="flex items-center gap-2 flex-wrap">
        <Monitor className="w-5 h-5" />
        <h1 className="text-xl font-bold" data-testid="text-page-title">سجل الدخول</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
          <CardTitle className="text-base">سجل تسجيل الدخول والخروج</CardTitle>
          {logs && (
            <Badge variant="secondary" data-testid="badge-log-count">
              {logs.length} سجل
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !logs || logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" data-testid="text-no-logs">
              لا توجد سجلات دخول بعد
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المستخدم</TableHead>
                    <TableHead className="text-right">الإجراء</TableHead>
                    <TableHead className="text-right">عنوان IP</TableHead>
                    <TableHead className="text-right">المتصفح</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} data-testid={`row-login-log-${log.id}`}>
                      <TableCell data-testid={`text-username-${log.id}`}>
                        {log.userName}
                      </TableCell>
                      <TableCell>
                        {log.action === "login" ? (
                          <Badge variant="default" data-testid={`badge-action-${log.id}`}>
                            <LogIn className="w-3 h-3 ml-1" />
                            دخول
                          </Badge>
                        ) : (
                          <Badge variant="secondary" data-testid={`badge-action-${log.id}`}>
                            <LogOut className="w-3 h-3 ml-1" />
                            خروج
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs" data-testid={`text-ip-${log.id}`}>
                        {log.ipAddress || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-browser-${log.id}`}>
                        {parseUserAgent(log.userAgent)}
                      </TableCell>
                      <TableCell data-testid={`text-date-${log.id}`}>
                        {formatDate(log.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
