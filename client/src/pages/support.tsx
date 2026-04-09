import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Plus, Loader2, Clock, CheckCircle, MessageSquareReply } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SupportTicket } from "@shared/schema";

const categories = [
  { value: "bug", label: "إبلاغ عن خطأ" },
  { value: "feature", label: "طلب ميزة جديدة" },
  { value: "question", label: "استفسار عام" },
  { value: "complaint", label: "شكوى" },
  { value: "other", label: "أخرى" },
];

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: { label: "مفتوحة", variant: "destructive" },
  replied: { label: "تم الرد", variant: "default" },
  closed: { label: "مغلقة", variant: "secondary" },
};

export default function SupportPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("bug");
  const [viewTicket, setViewTicket] = useState<SupportTicket | null>(null);

  const { data: tickets, isLoading } = useQuery<SupportTicket[]>({
    queryKey: ["/api/support-tickets"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { subject: string; message: string; category: string }) =>
      apiRequest("POST", "/api/support-tickets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support-tickets"] });
      toast({ title: "تم إرسال التذكرة بنجاح" });
      setDialogOpen(false);
      setSubject("");
      setMessage("");
      setCategory("bug");
    },
    onError: () => toast({ title: "خطأ في إرسال التذكرة", variant: "destructive" }),
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("ar-EG", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const getCategoryLabel = (cat: string) => categories.find(c => c.value === cat)?.label || cat;

  return (
    <div className="p-6 space-y-6 overflow-auto h-full" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-support-title">الدعم الفني</h1>
            <p className="text-muted-foreground">تواصل مع إدارة النظام للإبلاغ عن أخطاء أو طلب تعديلات</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-ticket">
              <Plus className="w-4 h-4 ml-2" />
              تذكرة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader>
              <DialogTitle>إرسال تذكرة دعم فني</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!subject.trim() || !message.trim()) {
                  toast({ title: "الموضوع والرسالة مطلوبان", variant: "destructive" });
                  return;
                }
                createMutation.mutate({ subject, message, category });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium mb-1 block">التصنيف</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="select-ticket-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">الموضوع</label>
                <Input
                  data-testid="input-ticket-subject"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="اكتب موضوع التذكرة"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">الرسالة</label>
                <Textarea
                  data-testid="input-ticket-message"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="اشرح المشكلة أو الطلب بالتفصيل..."
                  rows={5}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-ticket">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                {createMutation.isPending ? "جاري الإرسال..." : "إرسال التذكرة"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : !tickets || tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">لا توجد تذاكر دعم</p>
            <p className="text-sm">اضغط على "تذكرة جديدة" للتواصل مع إدارة النظام</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <Card
              key={ticket.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setViewTicket(ticket)}
              data-testid={`card-ticket-${ticket.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={statusLabels[ticket.status]?.variant || "secondary"} data-testid={`badge-ticket-status-${ticket.id}`}>
                        {statusLabels[ticket.status]?.label || ticket.status}
                      </Badge>
                      <Badge variant="outline">{getCategoryLabel(ticket.category)}</Badge>
                      <span className="text-xs text-muted-foreground">#{ticket.id}</span>
                    </div>
                    <h3 className="font-medium truncate">{ticket.subject}</h3>
                    <p className="text-sm text-muted-foreground truncate mt-1">{ticket.message}</p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(ticket.createdAt)}
                  </div>
                </div>
                {ticket.adminReply && (
                  <div className="mt-3 p-3 bg-primary/5 rounded-md border border-primary/20">
                    <div className="flex items-center gap-1 text-xs text-primary font-medium mb-1">
                      <MessageSquareReply className="w-3 h-3" />
                      رد الإدارة
                    </div>
                    <p className="text-sm">{ticket.adminReply}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(ticket.repliedAt)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!viewTicket} onOpenChange={() => setViewTicket(null)}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              تذكرة #{viewTicket?.id}
              <Badge variant={statusLabels[viewTicket?.status || ""]?.variant || "secondary"}>
                {statusLabels[viewTicket?.status || ""]?.label || viewTicket?.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {viewTicket && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground">التصنيف</label>
                <p className="text-sm font-medium">{getCategoryLabel(viewTicket.category)}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">الموضوع</label>
                <p className="text-sm font-medium">{viewTicket.subject}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">الرسالة</label>
                <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">{viewTicket.message}</p>
              </div>
              <div className="text-xs text-muted-foreground">
                تاريخ الإرسال: {formatDate(viewTicket.createdAt)}
              </div>
              {viewTicket.adminReply && (
                <div className="p-3 bg-primary/5 rounded-md border border-primary/20">
                  <div className="flex items-center gap-1 text-sm text-primary font-medium mb-2">
                    <CheckCircle className="w-4 h-4" />
                    رد إدارة النظام
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{viewTicket.adminReply}</p>
                  <p className="text-xs text-muted-foreground mt-2">{formatDate(viewTicket.repliedAt)}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
