import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogIn, UserPlus, AlertTriangle, Crown, Eye, EyeOff, CheckCircle2, BookOpen, Shield } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

function PasswordInput({ id, value, onChange, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} value={value} onChange={onChange} className="pl-10" {...props} />
      <button type="button" className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1" onClick={() => setShow(!show)} tabIndex={-1} data-testid={`button-toggle-password-${id}`}>
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function LoginPage() {
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: setupStatus } = useQuery<{ needsSetup: boolean }>({
    queryKey: ["/api/auth/setup-status"],
  });

  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    companyName: "", companySlug: "", fullName: "", username: "", password: "", email: "",
  });
  const [setupData, setSetupData] = useState({
    fullName: "", username: "", password: "", email: "",
  });
  const [walletBlocked, setWalletBlocked] = useState<{ message: string; supportPhone1: string; supportPhone2: string } | null>(null);

  const needsSetup = setupStatus?.needsSetup === true;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalletBlocked(null);
    try {
      await login.mutateAsync(loginData);
      setLocation("/");
    } catch (err: any) {
      const errorText = err.message || "";
      try {
        const parsed = JSON.parse(errorText.split(": ").slice(1).join(": "));
        if (parsed.walletBlocked) {
          setWalletBlocked(parsed);
          return;
        }
        toast({ title: "خطأ", description: parsed.message, variant: "destructive" });
      } catch {
        toast({ title: "خطأ", description: "اسم المستخدم أو كلمة المرور غير صحيحة", variant: "destructive" });
      }
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register.mutateAsync(setupData as any);
      setLocation("/");
    } catch (err: any) {
      const errorText = err.message || "";
      try {
        const parsed = JSON.parse(errorText.split(": ").slice(1).join(": "));
        toast({ title: "خطأ", description: parsed.message, variant: "destructive" });
      } catch {
        toast({ title: "خطأ", description: "حدث خطأ أثناء التسجيل", variant: "destructive" });
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register.mutateAsync(registerData);
      setLocation("/");
    } catch (err: any) {
      const errorText = err.message || "";
      try {
        const parsed = JSON.parse(errorText.split(": ").slice(1).join(": "));
        toast({ title: "خطأ", description: parsed.message, variant: "destructive" });
      } catch {
        toast({ title: "خطأ", description: "حدث خطأ أثناء التسجيل", variant: "destructive" });
      }
    }
  };

  if (needsSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4" dir="rtl">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="aiverce محاسب" className="w-16 h-16 rounded-xl mx-auto mb-4 object-contain" />
            <h1 className="text-3xl font-bold" data-testid="text-setup-title">aiverce محاسب</h1>
            <p className="text-muted-foreground mt-2">مرحباً بك! قم بإنشاء حساب المالك الأول للنظام</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                تأسيس النظام - المالك الأول
              </CardTitle>
              <CardDescription>
                هذا الحساب سيكون المدير العام (Super Admin) بصلاحيات كاملة للتحكم في جميع الشركات، شحن المحافظ، وتعديل نسب العمولات.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSetup} className="space-y-4">
                <div>
                  <Label htmlFor="setup-fullname">الاسم الكامل</Label>
                  <Input
                    id="setup-fullname"
                    data-testid="input-setup-fullname"
                    value={setupData.fullName}
                    onChange={e => setSetupData(prev => ({ ...prev, fullName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="setup-username">اسم المستخدم</Label>
                  <Input
                    id="setup-username"
                    data-testid="input-setup-username"
                    value={setupData.username}
                    onChange={e => setSetupData(prev => ({ ...prev, username: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="setup-password">كلمة المرور</Label>
                  <PasswordInput
                    id="setup-password"
                    data-testid="input-setup-password"
                    value={setupData.password}
                    onChange={e => setSetupData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <Label htmlFor="setup-email">البريد الإلكتروني (اختياري)</Label>
                  <Input
                    id="setup-email"
                    type="email"
                    data-testid="input-setup-email"
                    value={setupData.email}
                    onChange={e => setSetupData(prev => ({ ...prev, email: e.target.value }))}
                    dir="ltr"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={register.isPending} data-testid="button-setup">
                  {register.isPending ? "جاري التأسيس..." : "تأسيس النظام وإنشاء حساب المالك"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="aiverce محاسب" className="w-16 h-16 rounded-xl mx-auto mb-4 object-contain" />
          <h1 className="text-3xl font-bold" data-testid="text-login-title">aiverce محاسب</h1>
          <p className="text-muted-foreground mt-2">نظام ERP محاسبي متكامل</p>
        </div>

        {walletBlocked && (
          <Card className="mb-4 border-destructive bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
                <div>
                  <p className="font-bold text-destructive mb-2" data-testid="text-wallet-blocked">{walletBlocked.message}</p>
                  <p className="text-sm">للشحن تواصل معنا:</p>
                  <p className="text-sm font-mono mt-1" data-testid="text-support-phone1">{walletBlocked.supportPhone1}</p>
                  <p className="text-sm font-mono" data-testid="text-support-phone2">{walletBlocked.supportPhone2}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <Tabs defaultValue="login">
            <CardHeader className="pb-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" data-testid="tab-login">
                  <LogIn className="w-4 h-4 ml-2" />
                  تسجيل الدخول
                </TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">
                  <UserPlus className="w-4 h-4 ml-2" />
                  تسجيل شركة جديدة
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="login">
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="login-username">اسم المستخدم</Label>
                    <Input
                      id="login-username"
                      data-testid="input-login-username"
                      value={loginData.username}
                      onChange={e => setLoginData(prev => ({ ...prev, username: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="login-password">كلمة المرور</Label>
                    <PasswordInput
                      id="login-password"
                      data-testid="input-login-password"
                      value={loginData.password}
                      onChange={e => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={login.isPending} data-testid="button-login">
                    {login.isPending ? "جاري تسجيل الدخول..." : "دخول"}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>

            <TabsContent value="register">
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label htmlFor="reg-company-name">اسم الشركة</Label>
                    <Input
                      id="reg-company-name"
                      data-testid="input-register-company-name"
                      value={registerData.companyName}
                      onChange={e => setRegisterData(prev => ({ ...prev, companyName: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-company-slug">كود الشركة (بالإنجليزي)</Label>
                    <Input
                      id="reg-company-slug"
                      data-testid="input-register-company-slug"
                      value={registerData.companySlug}
                      onChange={e => setRegisterData(prev => ({ ...prev, companySlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                      placeholder="my-company"
                      required
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-fullname">الاسم الكامل</Label>
                    <Input
                      id="reg-fullname"
                      data-testid="input-register-fullname"
                      value={registerData.fullName}
                      onChange={e => setRegisterData(prev => ({ ...prev, fullName: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-username">اسم المستخدم</Label>
                    <Input
                      id="reg-username"
                      data-testid="input-register-username"
                      value={registerData.username}
                      onChange={e => setRegisterData(prev => ({ ...prev, username: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-password">كلمة المرور</Label>
                    <PasswordInput
                      id="reg-password"
                      data-testid="input-register-password"
                      value={registerData.password}
                      onChange={e => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-email">البريد الإلكتروني (اختياري)</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      data-testid="input-register-email"
                      value={registerData.email}
                      onChange={e => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                      dir="ltr"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={register.isPending} data-testid="button-register">
                    {register.isPending ? "جاري التسجيل..." : "تسجيل شركة جديدة"}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="mt-6 space-y-4">
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur">
            <CardContent className="p-4">
              <h2 className="font-bold text-lg mb-3 text-center" data-testid="text-intro-title">برنامج محاسبة مجاني متكامل للشركات والمحلات</h2>
              <p className="text-sm text-muted-foreground leading-7 mb-3">
                <strong>aiverce محاسب</strong> هو نظام ERP محاسبي سحابي مجاني باللغة العربية، مصمم خصيصاً للشركات والمحلات في مصر والوطن العربي. يوفر لك كل ما تحتاجه لإدارة أعمالك المحاسبية بسهولة واحترافية.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" /><span>فواتير مبيعات ومشتريات</span></div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" /><span>إدارة المخزون والمستودعات</span></div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" /><span>عملاء وموردين وكشف حساب</span></div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" /><span>قيود يومية ودفتر أستاذ</span></div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" /><span>تقارير أرباح وخسائر</span></div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" /><span>طباعة حرارية وPDF</span></div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" /><span>إدارة الخزينة والمصروفات</span></div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" /><span>صلاحيات وأمان متقدم</span></div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" /><span>مرتجعات وتحويلات مخزون</span></div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" /><span>تصدير Excel وباركود</span></div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 justify-center">
            <Link href="/guide">
              <Button variant="outline" size="sm" className="gap-1.5" data-testid="link-guide">
                <BookOpen className="w-3.5 h-3.5" />
                دليل الاستخدام
              </Button>
            </Link>
            <Link href="/terms">
              <Button variant="outline" size="sm" className="gap-1.5" data-testid="link-terms">
                <Shield className="w-3.5 h-3.5" />
                سياسة الاستخدام
              </Button>
            </Link>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            شركة efct للبرمجة | هاتف: 01009376052 - 01556660502
          </p>
        </div>
      </div>
    </div>
  );
}
