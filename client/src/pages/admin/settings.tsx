import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Settings, Loader2 } from "lucide-react";
import type { Company } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();
  const { data: company, isLoading } = useQuery<Company>({ queryKey: ["/api/companies/current"] });
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", taxNumber: "", commercialRegistration: "" });

  useEffect(() => {
    if (company) {
      setForm({
        name: company.name || "",
        phone: company.phone || "",
        email: company.email || "",
        address: company.address || "",
        taxNumber: company.taxNumber || "",
        commercialRegistration: company.commercialRegistration || "",
      });
    }
  }, [company]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/companies/current", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/companies/current"] }); toast({ title: "تم تحديث بيانات الشركة" }); },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="p-6 h-full overflow-auto" dir="rtl">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-page-title">إعدادات الشركة</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader><CardTitle>بيانات الشركة</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={e => { e.preventDefault(); updateMutation.mutate(form); }} className="space-y-4">
            <div><Label>اسم الشركة</Label><Input data-testid="input-company-name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
            <div><Label>الهاتف</Label><Input data-testid="input-company-phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div><Label>البريد الإلكتروني</Label><Input data-testid="input-company-email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} dir="ltr" /></div>
            <div><Label>العنوان</Label><Input data-testid="input-company-address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
            <div><Label>الرقم الضريبي</Label><Input data-testid="input-company-tax" value={form.taxNumber} onChange={e => setForm(p => ({ ...p, taxNumber: e.target.value }))} /></div>
            <div><Label>رقم السجل التجاري (اختياري)</Label><Input data-testid="input-company-commercial-reg" value={form.commercialRegistration} onChange={e => setForm(p => ({ ...p, commercialRegistration: e.target.value }))} placeholder="اختياري" /></div>
            <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-settings">
              {updateMutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
