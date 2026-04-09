import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, AlertTriangle, Scale, FileText, Ban, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function TermsPage() {
  const [, navigate] = useLocation();

  useEffect(() => {
    document.title = "سياسة الاستخدام والشروط والأحكام | aiverce محاسب";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "سياسة الاستخدام والشروط والأحكام لنظام aiverce محاسب - حماية قانونية، خصوصية البيانات، حقوق الملكية الفكرية، والتزامات المستخدم");
    return () => {
      document.title = "aiverce محاسب - برنامج محاسبة مجاني | نظام ERP محاسبي متكامل للشركات";
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800" dir="rtl">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="outline" size="icon" onClick={() => navigate("/")} data-testid="button-back-from-terms">
            <ArrowRight className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-terms-title">سياسة الاستخدام والشروط والأحكام</h1>
            <p className="text-muted-foreground text-sm">aiverce محاسب - نظام ERP محاسبي متكامل</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              مقدمة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7">
            <p>مرحباً بك في <strong>aiverce محاسب</strong>، نظام المحاسبة الإلكتروني المقدم من شركة <strong>efct للبرمجة</strong>. باستخدامك لهذا النظام، فإنك توافق على الالتزام بجميع الشروط والأحكام الموضحة في هذه الصفحة.</p>
            <p>يُرجى قراءة هذه الشروط بعناية قبل البدء في استخدام النظام. في حال عدم الموافقة على أي بند من هذه الشروط، يُرجى عدم استخدام النظام.</p>
            <Badge variant="outline" className="text-xs">آخر تحديث: مارس 2026</Badge>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              طبيعة النظام والمسؤولية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7">
            <div className="border-r-4 border-primary pr-4">
              <h3 className="font-bold mb-2">1. النظام أداة تقنية فقط</h3>
              <p>نظام aiverce محاسب هو <strong>أداة تقنية محاسبية</strong> تُستخدم لتسهيل تسجيل العمليات المحاسبية وإدارة الحسابات. النظام <strong>لا يُقدم استشارات مالية أو ضريبية أو قانونية</strong>، ولا يُعتبر بديلاً عن المحاسب القانوني أو المراجع المالي.</p>
            </div>
            <div className="border-r-4 border-primary pr-4">
              <h3 className="font-bold mb-2">2. مسؤولية البيانات</h3>
              <p>المستخدم هو <strong>المسؤول الوحيد والكامل</strong> عن صحة ودقة جميع البيانات المُدخلة في النظام، بما في ذلك على سبيل المثال لا الحصر:</p>
              <ul className="list-disc mr-6 mt-2 space-y-1">
                <li>الفواتير ومبالغها وتفاصيلها</li>
                <li>القيود اليومية والحسابات</li>
                <li>بيانات العملاء والموردين</li>
                <li>الأسعار والكميات والخصومات</li>
                <li>التقارير المالية المُولدة من النظام</li>
              </ul>
            </div>
            <div className="border-r-4 border-primary pr-4">
              <h3 className="font-bold mb-2">3. إخلاء مسؤولية ضريبية</h3>
              <p>شركة efct للبرمجة ونظام aiverce محاسب <strong>لا يتحملان أي مسؤولية</strong> تجاه أي مخالفات ضريبية أو محاسبية أو قانونية تنتج عن:</p>
              <ul className="list-disc mr-6 mt-2 space-y-1">
                <li>إدخال بيانات خاطئة أو مضللة</li>
                <li>عدم الالتزام بالقوانين واللوائح الضريبية المحلية</li>
                <li>استخدام النظام لأغراض غير مشروعة</li>
                <li>عدم مراجعة التقارير مع محاسب قانوني مُعتمد</li>
                <li>التهرب الضريبي أو التلاعب في الحسابات</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-600" />
              الاستخدام المحظور
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7">
            <p>يُحظر على المستخدم استخدام النظام في أي من الأغراض التالية:</p>
            <ul className="list-disc mr-6 space-y-2">
              <li><strong>التهرب الضريبي:</strong> تسجيل فواتير وهمية أو تقليل قيمة المبيعات للتهرب من الضرائب</li>
              <li><strong>غسيل الأموال:</strong> استخدام النظام لإخفاء مصادر أموال غير مشروعة</li>
              <li><strong>الاحتيال المالي:</strong> إنشاء فواتير مزورة أو تضخيم المصروفات</li>
              <li><strong>انتهاك القوانين:</strong> أي استخدام يُخالف القوانين المصرية أو الدولية المعمول بها</li>
              <li><strong>الإضرار بالغير:</strong> استخدام بيانات العملاء أو الموردين لأغراض غير مصرح بها</li>
              <li><strong>نسخ أو توزيع النظام:</strong> نسخ أو إعادة توزيع أو بيع النظام أو أجزاء منه بدون إذن كتابي</li>
            </ul>
            <div className="bg-destructive/10 rounded-lg p-4 mt-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-destructive font-medium">في حال اكتشاف أي استخدام مُخالف، يحق لنا تعليق أو إلغاء الحساب فوراً دون إشعار مسبق، مع الاحتفاظ بحق اتخاذ الإجراءات القانونية اللازمة.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-600" />
              حقوق الملكية الفكرية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7">
            <p>جميع حقوق الملكية الفكرية لنظام aiverce محاسب، بما في ذلك الكود المصدري والتصميم والعلامة التجارية، مملوكة بالكامل لشركة <strong>efct للبرمجة</strong>.</p>
            <ul className="list-disc mr-6 space-y-1">
              <li>لا يحق للمستخدم نسخ أو تعديل أو إعادة هندسة النظام</li>
              <li>لا يحق للمستخدم استخدام العلامة التجارية أو الشعار بدون إذن</li>
              <li>الترخيص الممنوح هو ترخيص استخدام فقط وليس ترخيص ملكية</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              خصوصية البيانات وحمايتها
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7">
            <ul className="list-disc mr-6 space-y-2">
              <li>نلتزم بحماية بيانات المستخدمين وعدم مشاركتها مع أطراف ثالثة إلا بموافقة المستخدم أو بأمر قضائي</li>
              <li>يتم تخزين البيانات بشكل مشفر وآمن على خوادم محمية</li>
              <li>يحق للمستخدم طلب نسخة من بياناته أو حذفها بالكامل عند إنهاء الاشتراك</li>
              <li>لا نتحمل مسؤولية فقدان البيانات الناتج عن سوء استخدام المستخدم لكلمات المرور أو بيانات الدخول</li>
              <li>ننصح بعمل نسخ احتياطية دورية من البيانات المهمة عبر تصدير التقارير</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              التزامات المستخدم
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7">
            <p>بالتسجيل واستخدام النظام، يلتزم المستخدم بما يلي:</p>
            <ul className="list-disc mr-6 space-y-2">
              <li>تقديم بيانات صحيحة ودقيقة عند التسجيل وأثناء الاستخدام</li>
              <li>الحفاظ على سرية بيانات تسجيل الدخول وعدم مشاركتها مع الغير</li>
              <li>الالتزام بجميع القوانين الضريبية والمحاسبية المعمول بها في جمهورية مصر العربية</li>
              <li>مراجعة التقارير المالية مع محاسب قانوني مُعتمد قبل تقديمها للجهات الرسمية</li>
              <li>إبلاغنا فوراً في حال اكتشاف أي خلل أمني أو اختراق للحساب</li>
              <li>عدم محاولة اختراق النظام أو الوصول لبيانات شركات أخرى</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-600" />
              رسوم الخدمة والمحفظة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7">
            <ul className="list-disc mr-6 space-y-2">
              <li>يتم احتساب رسوم خدمة رقمية بنسبة <strong>0.05%</strong> من قيمة كل فاتورة (بحد أدنى 0.50 جنيه مصري)</li>
              <li>رسوم الخدمة تُضاف تلقائياً إلى إجمالي الفاتورة ويدفعها العميل</li>
              <li>يتم شحن المحفظة مسبقاً لضمان استمرارية الخدمة</li>
              <li>في حال نفاد رصيد المحفظة، قد يتم تعليق بعض خدمات النظام مؤقتاً حتى إعادة الشحن</li>
              <li>الأسعار قابلة للتغيير مع إشعار مسبق بـ 30 يوم على الأقل</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              حدود المسؤولية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7">
            <ul className="list-disc mr-6 space-y-2">
              <li>نبذل قصارى جهدنا لضمان عمل النظام بكفاءة واستمرارية، لكننا لا نضمن خلوه من الأخطاء التقنية بشكل كامل</li>
              <li>لا نتحمل أي خسائر مالية ناتجة عن قرارات تجارية مبنية على تقارير النظام</li>
              <li>لا نتحمل مسؤولية أي أعطال ناتجة عن ظروف خارجة عن إرادتنا (قوة قاهرة، انقطاع الإنترنت، إلخ)</li>
              <li>الحد الأقصى لمسؤوليتنا في أي حال من الأحوال لا يتجاوز قيمة الاشتراك المدفوع</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">هذه الشروط تخضع لقوانين جمهورية مصر العربية. أي نزاع ينشأ عن استخدام النظام يخضع للمحاكم المصرية المختصة.</p>
              <p className="text-sm font-medium">شركة efct للبرمجة</p>
              <p className="text-xs text-muted-foreground">هاتف: 01009376052 - 01556660502 | إيميل: santws1@gmail.com</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
