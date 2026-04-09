import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, Building2, Users, FileText, Wallet, Loader2, Plus, Minus, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SystemSettings } from "@shared/schema";

type SystemStats = {
  totalCompanies: number;
  totalUsers: number;
  totalInvoices: number;
  totalWalletBalance: string;
  companies: {
    id: number;
    name: string;
    slug: string;
    walletBalance: string;
    customServiceFeeRate: string | null;
    isActive: boolean;
    userCount: number;
  }[];
};

export default function SystemDashboardPage() {
  const { toast } = useToast();
  const { data: stats, isLoading } = useQuery<SystemStats>({
    queryKey: ["/api/system-dashboard/stats"],
  });
  const { data: settings } = useQuery<SystemSettings>({ queryKey: ["/api/system-settings"] });

  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeCompanyId, setChargeCompanyId] = useState<number | null>(null);
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeDesc, setChargeDesc] = useState("");

  const [deductOpen, setDeductOpen] = useState(false);
  const [deductCompanyId, setDeductCompanyId] = useState<number | null>(null);
  const [deductAmount, setDeductAmount] = useState("");
  const [deductDesc, setDeductDesc] = useState("");

  const [feeRateOpen, setFeeRateOpen] = useState(false);
  const [feeRateCompanyId, setFeeRateCompanyId] = useState<number | null>(null);
  const [feeRateCompanyName, setFeeRateCompanyName] = useState("");
  const [feeRateValue, setFeeRateValue] = useState("");
  const [useCustomRate, setUseCustomRate] = useState(false);

  const chargeMutation = useMutation({
    mutationFn: (data: { companyId: number; amount: number; description: string }) =>
      apiRequest("POST", "/api/wallet/charge", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-dashboard/stats"] });
      toast({ title: "تم شحن المحفظة بنجاح" });
      setChargeOpen(false);
      setChargeAmount("");
      setChargeDesc("");
      setChargeCompanyId(null);
    },
    onError: () => toast({ title: "خطأ في شحن المحفظة", variant: "destructive" }),
  });

  const deductMutation = useMutation({
    mutationFn: (data: { companyId: number; amount: number; description: string }) =>
      apiRequest("POST", "/api/wallet/deduct", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-dashboard/stats"] });
      toast({ title: "تم خصم المبلغ من المحفظة بنجاح" });
      setDeductOpen(false);
      setDeductAmount("");
      setDeductDesc("");
      setDeductCompanyId(null);
    },
    onError: () => toast({ title: "خطأ في خصم المبلغ من المحفظة", variant: "destructive" }),
  });

  const feeRateMutation = useMutation({
    mutationFn: (data: { companyId: number; customServiceFeeRate: string | null }) =>
      apiRequest("PUT", `/api/admin/companies/${data.companyId}/fee-rate`, { customServiceFeeRate: data.customServiceFeeRate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-dashboard/stats"] });
      toast({ title: "تم تحديث نسبة الرسوم بنجاح" });
      setFeeRateOpen(false);
    },
    onError: () => toast({ title: "خطأ في تحديث النسبة", variant: "destructive" }),
  });

  const formatCurrency = (value: string) => {
    const num = parseFloat(value || "0");
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 2,
    }).format(num);
  };

  const defaultRate = settings?.serviceFeeRate || "0.0005";
  const defaultRatePercent = (parseFloat(defaultRate) * 100).toFixed(4);

  const getEffectiveRate = (customRate: string | null) => {
    if (customRate) return (parseFloat(customRate) * 100).toFixed(4) + "%";
    return defaultRatePercent + "% (افتراضي)";
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" dir="rtl">
        <h1 className="text-2xl font-bold">لوحة تحكم النظام</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const summaryCards = [
    { title: "إجمالي الشركات", value: stats?.totalCompanies || 0, icon: Building2, color: "text-blue-600" },
    { title: "إجمالي المستخدمين", value: stats?.totalUsers || 0, icon: Users, color: "text-green-600" },
    { title: "إجمالي الفواتير", value: stats?.totalInvoices || 0, icon: FileText, color: "text-purple-600" },
    { title: "إجمالي أرصدة المحافظ", value: formatCurrency(stats?.totalWalletBalance || "0"), icon: Wallet, color: "text-orange-600" },
  ];

  return (
    <div className="p-6 space-y-6 overflow-auto h-full" dir="rtl">
      <div className="flex items-center gap-3">
        <Crown className="w-7 h-7 text-yellow-500" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-system-dashboard-title">لوحة تحكم الإدارة العامة</h1>
          <p className="text-muted-foreground">نظرة شاملة على النظام بالكامل</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`text-sys-stat-${card.title}`}>{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            الشركات المسجلة
            <span className="text-sm font-normal text-muted-foreground mr-2">
              (النسبة الافتراضية: {defaultRatePercent}%)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>اسم الشركة</TableHead>
                <TableHead>الكود</TableHead>
                <TableHead>عدد المستخدمين</TableHead>
                <TableHead>رصيد المحفظة</TableHead>
                <TableHead>نسبة الرسوم</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats?.companies?.map((company, index) => (
                <TableRow key={company.id} data-testid={`row-company-${company.id}`}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell className="font-mono text-sm">{company.slug}</TableCell>
                  <TableCell>{company.userCount}</TableCell>
                  <TableCell className="font-mono">
                    <span className={parseFloat(company.walletBalance) <= 0 ? "text-destructive font-bold" : ""}>
                      {formatCurrency(company.walletBalance)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={company.customServiceFeeRate ? "text-primary font-bold" : "text-muted-foreground"}>
                      {getEffectiveRate(company.customServiceFeeRate)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={company.isActive ? "default" : "secondary"} data-testid={`badge-company-status-${company.id}`}>
                      {company.isActive ? "نشط" : "معطل"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`button-charge-${company.id}`}
                        onClick={() => {
                          setChargeCompanyId(company.id);
                          setChargeOpen(true);
                        }}
                      >
                        <Plus className="w-3 h-3 ml-1" />
                        شحن
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`button-deduct-${company.id}`}
                        onClick={() => {
                          setDeductCompanyId(company.id);
                          setDeductOpen(true);
                        }}
                      >
                        <Minus className="w-3 h-3 ml-1" />
                        خصم
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`button-fee-rate-${company.id}`}
                        onClick={() => {
                          setFeeRateCompanyId(company.id);
                          setFeeRateCompanyName(company.name);
                          setUseCustomRate(!!company.customServiceFeeRate);
                          setFeeRateValue(company.customServiceFeeRate || defaultRate);
                          setFeeRateOpen(true);
                        }}
                      >
                        <Percent className="w-3 h-3 ml-1" />
                        النسبة
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!stats?.companies || stats.companies.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    لا توجد شركات مسجلة بعد
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>شحن محفظة الشركة</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={e => {
              e.preventDefault();
              if (chargeCompanyId && chargeAmount) {
                chargeMutation.mutate({
                  companyId: chargeCompanyId,
                  amount: parseFloat(chargeAmount),
                  description: chargeDesc || "شحن محفظة من المدير العام",
                });
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium">المبلغ (ج.م)</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                data-testid="input-charge-amount"
                value={chargeAmount}
                onChange={e => setChargeAmount(e.target.value)}
                required
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-sm font-medium">الوصف (اختياري)</label>
              <Input
                data-testid="input-charge-description"
                value={chargeDesc}
                onChange={e => setChargeDesc(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={chargeMutation.isPending} data-testid="button-confirm-charge">
              {chargeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              {chargeMutation.isPending ? "جاري الشحن..." : "تأكيد الشحن"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deductOpen} onOpenChange={setDeductOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>خصم من محفظة الشركة</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={e => {
              e.preventDefault();
              if (deductCompanyId && deductAmount) {
                deductMutation.mutate({
                  companyId: deductCompanyId,
                  amount: parseFloat(deductAmount),
                  description: deductDesc || "خصم من المحفظة بواسطة المدير العام",
                });
              }
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium">المبلغ (ج.م)</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                data-testid="input-deduct-amount"
                value={deductAmount}
                onChange={e => setDeductAmount(e.target.value)}
                required
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-sm font-medium">الوصف (اختياري)</label>
              <Input
                data-testid="input-deduct-description"
                value={deductDesc}
                onChange={e => setDeductDesc(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={deductMutation.isPending} data-testid="button-confirm-deduct">
              {deductMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              {deductMutation.isPending ? "جاري الخصم..." : "تأكيد الخصم"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={feeRateOpen} onOpenChange={(open) => {
        setFeeRateOpen(open);
        if (!open) { setFeeRateCompanyId(null); setFeeRateCompanyName(""); setFeeRateValue(""); }
      }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل نسبة الرسوم - {feeRateCompanyName}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={e => {
              e.preventDefault();
              if (feeRateCompanyId !== null) {
                if (useCustomRate) {
                  const rate = parseFloat(feeRateValue);
                  if (isNaN(rate) || rate < 0 || rate > 1) {
                    toast({ title: "النسبة يجب أن تكون رقم بين 0 و 1", variant: "destructive" });
                    return;
                  }
                }
                feeRateMutation.mutate({
                  companyId: feeRateCompanyId,
                  customServiceFeeRate: useCustomRate ? feeRateValue : null,
                });
              }
            }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium whitespace-nowrap">نوع النسبة:</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="rateType"
                    checked={!useCustomRate}
                    onChange={() => setUseCustomRate(false)}
                    data-testid="radio-default-rate"
                  />
                  <span className="text-sm">افتراضي ({defaultRatePercent}%)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="rateType"
                    checked={useCustomRate}
                    onChange={() => setUseCustomRate(true)}
                    data-testid="radio-custom-rate"
                  />
                  <span className="text-sm">مخصص</span>
                </label>
              </div>
            </div>

            {useCustomRate && (
              <div>
                <label className="text-sm font-medium">النسبة المخصصة (رقم عشري)</label>
                <Input
                  type="text"
                  data-testid="input-custom-fee-rate"
                  value={feeRateValue}
                  onChange={e => setFeeRateValue(e.target.value)}
                  dir="ltr"
                  placeholder="مثال: 0.001 = 0.1%"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  النسبة: {feeRateValue ? (parseFloat(feeRateValue) * 100).toFixed(4) : "0"}%
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={feeRateMutation.isPending} data-testid="button-save-fee-rate">
              {feeRateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              {feeRateMutation.isPending ? "جاري الحفظ..." : "حفظ النسبة"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
