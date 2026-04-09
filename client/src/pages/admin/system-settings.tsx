import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2 } from "lucide-react";
import type { SystemSettings } from "@shared/schema";

export default function SystemSettingsPage() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<SystemSettings>({ queryKey: ["/api/system-settings"] });
  const [form, setForm] = useState({ serviceFeeRate: "", supportPhone1: "", supportPhone2: "" });

  useEffect(() => {
    if (settings) {
      setForm({
        serviceFeeRate: settings.serviceFeeRate || "0.0005",
        supportPhone1: settings.supportPhone1 || "",
        supportPhone2: settings.supportPhone2 || "",
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/system-settings", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/system-settings"] }); toast({ title: "تم تحديث إعدادات النظام" }); },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="p-6 h-full overflow-auto" dir="rtl">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-page-title">إعدادات النظام (مدير عام)</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader><CardTitle>إعدادات الرسوم والدعم</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={e => { e.preventDefault(); updateMutation.mutate(form); }} className="space-y-4">
            <div>
              <Label>نسبة رسوم الخدمة الرقمية</Label>
              <Input
                data-testid="input-service-fee-rate"
                value={form.serviceFeeRate}
                onChange={e => setForm(p => ({ ...p, serviceFeeRate: e.target.value }))}
                dir="ltr"
                placeholder="0.0005 = 0.05%"
              />
              <p className="text-xs text-muted-foreground mt-1">النسبة الحالية: {(parseFloat(form.serviceFeeRate || "0") * 100).toFixed(4)}%</p>
            </div>
            <div>
              <Label>رقم الدعم 1</Label>
              <Input data-testid="input-support-phone1" value={form.supportPhone1} onChange={e => setForm(p => ({ ...p, supportPhone1: e.target.value }))} dir="ltr" />
            </div>
            <div>
              <Label>رقم الدعم 2</Label>
              <Input data-testid="input-support-phone2" value={form.supportPhone2} onChange={e => setForm(p => ({ ...p, supportPhone2: e.target.value }))} dir="ltr" />
            </div>
            <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-system-settings">
              {updateMutation.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
