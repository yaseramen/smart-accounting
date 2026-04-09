import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Loader2, Send, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SupportTicket } from "@shared/schema";

const categories: Record<string, string> = {
  bug: "إبلاغ عن خطأ",
  feature: "طلب ميزة",
  question: "استفسار",
  complaint: "شكوى",
  other: "أخرى",
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: { label: "مفتوحة", variant: "destructive" },
  replied: { label: "تم الرد", variant: "default" },
  closed: { label: "مغلقة", variant: "secondary" },
};

export default function AdminSupportTicketsPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [replyTicket, setReplyTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data: tickets, isLoading } = useQuery<SupportTicket[]>({
    queryKey: ["/api/support-tickets"],
  });

  const replyMutation = useMutation({
    mutationFn: (data: { id: number; reply: string }) =>
      apiRequest("PUT", `/api/support-tickets/${data.id}/reply`, { reply: data.reply }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support-tickets"] });
      toast({ title: "تم إرسال الرد بنجاح" });
      setReplyTicket(null);
      setReplyText("");
    },
    onError: () => toast({ title: "خطأ في إرسال الرد", variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: (data: { id: number; status: string }) =>
      apiRequest("PUT", `/api/support-tickets/${data.id}/status`, { status: data.status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support-tickets"] });
      toast({ title: "تم تحديث الحالة" });
    },
    onError: () => toast({ title: "خطأ في تحديث الحالة", variant: "destructive" }),
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("ar-EG", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const filteredTickets = tickets?.filter(t => statusFilter === "all" || t.status === statusFilter) || [];

  const openCount = tickets?.filter(t => t.status === "open").length || 0;
  const repliedCount = tickets?.filter(t => t.status === "replied").length || 0;
  const closedCount = tickets?.filter(t => t.status === "closed").length || 0;

  return (
    <div className="p-6 space-y-6 overflow-auto h-full" dir="rtl">
      <div className="flex items-center gap-3">
        <MessageSquare className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-admin-tickets-title">إدارة تذاكر الدعم</h1>
          <p className="text-muted-foreground">جميع رسائل المستخدمين والشركات</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer" onClick={() => setStatusFilter("open")}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">مفتوحة</p>
              <p className="text-2xl font-bold text-destructive" data-testid="text-open-count">{openCount}</p>
            </div>
            <XCircle className="w-8 h-8 text-destructive/30" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setStatusFilter("replied")}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">تم الرد</p>
              <p className="text-2xl font-bold text-primary" data-testid="text-replied-count">{repliedCount}</p>
            </div>
            <Send className="w-8 h-8 text-primary/30" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setStatusFilter("closed")}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">مغلقة</p>
              <p className="text-2xl font-bold" data-testid="text-closed-count">{closedCount}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-muted-foreground/30" />
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل ({tickets?.length || 0})</SelectItem>
            <SelectItem value="open">مفتوحة ({openCount})</SelectItem>
            <SelectItem value="replied">تم الرد ({repliedCount})</SelectItem>
            <SelectItem value="closed">مغلقة ({closedCount})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>الشركة</TableHead>
                  <TableHead>التصنيف</TableHead>
                  <TableHead>الموضوع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map(ticket => (
                  <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                    <TableCell className="font-mono text-sm">{ticket.id}</TableCell>
                    <TableCell className="font-medium">{ticket.userName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{ticket.companyName || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{categories[ticket.category] || ticket.category}</Badge>
                    </TableCell>
                    <TableCell className="max-w-48 truncate">{ticket.subject}</TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[ticket.status]?.variant || "secondary"}>
                        {statusConfig[ticket.status]?.label || ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(ticket.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`button-reply-ticket-${ticket.id}`}
                          onClick={() => {
                            setReplyTicket(ticket);
                            setReplyText(ticket.adminReply || "");
                          }}
                        >
                          <Send className="w-3 h-3 ml-1" />
                          رد
                        </Button>
                        {ticket.status !== "closed" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            data-testid={`button-close-ticket-${ticket.id}`}
                            onClick={() => statusMutation.mutate({ id: ticket.id, status: "closed" })}
                          >
                            إغلاق
                          </Button>
                        )}
                        {ticket.status === "closed" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            data-testid={`button-reopen-ticket-${ticket.id}`}
                            onClick={() => statusMutation.mutate({ id: ticket.id, status: "open" })}
                          >
                            إعادة فتح
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTickets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      لا توجد تذاكر
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!replyTicket} onOpenChange={() => { setReplyTicket(null); setReplyText(""); }}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>الرد على التذكرة #{replyTicket?.id}</DialogTitle>
          </DialogHeader>
          {replyTicket && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">{replyTicket.userName}</span>
                  {replyTicket.companyName && (
                    <Badge variant="outline" className="text-xs">{replyTicket.companyName}</Badge>
                  )}
                </div>
                <p className="text-sm font-medium mb-1">{replyTicket.subject}</p>
                <p className="text-sm whitespace-pre-wrap">{replyTicket.message}</p>
                <p className="text-xs text-muted-foreground mt-2">{formatDate(replyTicket.createdAt)}</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">الرد</label>
                <Textarea
                  data-testid="input-admin-reply"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="اكتب ردك هنا..."
                  rows={4}
                />
              </div>

              <Button
                className="w-full"
                disabled={replyMutation.isPending || !replyText.trim()}
                data-testid="button-send-reply"
                onClick={() => {
                  if (replyTicket && replyText.trim()) {
                    replyMutation.mutate({ id: replyTicket.id, reply: replyText });
                  }
                }}
              >
                {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Send className="w-4 h-4 ml-2" />}
                {replyMutation.isPending ? "جاري الإرسال..." : "إرسال الرد"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
