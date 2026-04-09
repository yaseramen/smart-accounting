import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowRight, BookOpen, Search, LayoutDashboard, FileText, Users, Truck,
  Package, Warehouse, ShoppingCart, Receipt, RotateCcw, ArrowRightLeft,
  AlertTriangle, Settings, Shield, Wallet, BarChart3, BookOpenCheck,
  Calculator, ClipboardList, HelpCircle, Lightbulb, Ban, CheckCircle2
} from "lucide-react";
import { useLocation } from "wouter";

type Section = {
  id: string;
  title: string;
  icon: any;
  searchText: string;
  content: any;
};

export default function GuidePage() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    document.title = "دليل استخدام البرنامج | aiverce محاسب";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "دليل استخدام نظام aiverce محاسب - شرح كامل لكيفية استخدام البرنامج، إنشاء الفواتير، إدارة المخزون، والأخطاء الشائعة وحلولها");
    return () => {
      document.title = "aiverce محاسب - برنامج محاسبة مجاني | نظام ERP محاسبي متكامل للشركات";
    };
  }, []);

  const sections: Section[] = [
    {
      id: "getting-started",
      title: "البداية السريعة",
      icon: BookOpen,
      searchText: "تسجيل شركة جديدة إعدادات مستودعات وحدات قياس دليل حسابات عملاء موردين منتجات أسعار باركود بداية",
      content: (
        <div className="space-y-3 text-sm leading-7">
          <h4 className="font-bold text-primary">1. تسجيل شركة جديدة</h4>
          <ul className="list-disc mr-6 space-y-1">
            <li>من صفحة تسجيل الدخول، اضغط على تبويب "تسجيل شركة جديدة"</li>
            <li>أدخل اسم الشركة، اسم المستخدم وكلمة المرور</li>
            <li>بعد التسجيل ستصبح "مالك الشركة" وتملك كل الصلاحيات</li>
          </ul>
          <h4 className="font-bold text-primary">2. الإعدادات الأولية</h4>
          <ul className="list-disc mr-6 space-y-1">
            <li>اذهب إلى <strong>الإعدادات</strong> وأكمل بيانات الشركة (الاسم، الهاتف، الرقم الضريبي)</li>
            <li>أنشئ <strong>المستودعات</strong> التي ستخزن فيها البضاعة</li>
            <li>أضف <strong>وحدات القياس</strong> المناسبة لمنتجاتك (كيلو، متر، قطعة...)</li>
            <li>أنشئ <strong>دليل الحسابات</strong> حسب طبيعة نشاطك</li>
          </ul>
          <h4 className="font-bold text-primary">3. إضافة البيانات الأساسية</h4>
          <ul className="list-disc mr-6 space-y-1">
            <li>أضف <strong>العملاء</strong> مع أرقام هواتفهم وعناوينهم</li>
            <li>أضف <strong>الموردين</strong> بنفس الطريقة</li>
            <li>أضف <strong>المنتجات</strong> مع الأسعار والوحدات والباركود</li>
          </ul>
        </div>
      ),
    },
    {
      id: "invoices",
      title: "الفواتير (المبيعات والمشتريات)",
      icon: FileText,
      searchText: "فاتورة مبيعات مشتريات عميل منتج خدمة دفع نقدي آجل جزئي فودافون إنستاباي تحويل بنكي شيك حفظ طباعة اعتماد خدمة رقمية رسوم",
      content: (
        <div className="space-y-3 text-sm leading-7">
          <h4 className="font-bold text-primary">إنشاء فاتورة مبيعات</h4>
          <ul className="list-disc mr-6 space-y-1">
            <li>اذهب إلى صفحة <strong>المبيعات</strong> واضغط <strong>"فاتورة جديدة"</strong></li>
            <li>اختر العميل (اختياري) - يمكنك إنشاء عميل جديد من نفس النافذة</li>
            <li>أضف المنتجات أو الخدمات مع الكميات والأسعار</li>
            <li>حدد نوع الدفع: <strong>نقدي</strong> أو <strong>آجل</strong> أو <strong>جزئي</strong></li>
            <li>اضغط <strong>"حفظ وطباعة"</strong> - الفاتورة تُعتمد وتُطبع تلقائياً</li>
          </ul>
          <h4 className="font-bold text-primary">أنواع الدفع</h4>
          <ul className="list-disc mr-6 space-y-1">
            <li><strong>نقدي (paid):</strong> العميل دفع كامل المبلغ فوراً</li>
            <li><strong>آجل (deferred):</strong> الدفع مؤجل بالكامل - يظهر في المتأخرات</li>
            <li><strong>جزئي (partial):</strong> دفع جزء والباقي آجل - حدد المبلغ المدفوع</li>
          </ul>
          <h4 className="font-bold text-primary">طرق الدفع</h4>
          <p>يدعم النظام: نقداً، فودافون كاش، إنستاباي، تحويل بنكي، شيك، أخرى</p>
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 mt-2">
            <p className="flex items-start gap-2"><Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-1" /> <span>الفاتورة تتضمن تلقائياً رسوم خدمة رقمية (0.05% بحد أدنى 0.50 ج.م) تُضاف للإجمالي.</span></p>
          </div>
        </div>
      ),
    },
    {
      id: "customers-suppliers",
      title: "العملاء والموردين",
      icon: Users,
      searchText: "عملاء موردين كود كشف حساب دفعة متأخرات ذمم مدينين دائنين فواتير آجلة تسديد",
      content: (
        <div className="space-y-3 text-sm leading-7">
          <h4 className="font-bold text-primary">إدارة العملاء</h4>
          <ul className="list-disc mr-6 space-y-1">
            <li>اذهب إلى <strong>العملاء</strong> لعرض قائمة العملاء وإضافة جديد</li>
            <li>كل عميل يأخذ كود تلقائي (CUS-0001, CUS-0002...)</li>
            <li>اضغط على اسم العميل لعرض <strong>كشف حساب</strong> مفصل بكل فواتيره</li>
            <li>من كشف الحساب يمكنك تسجيل دفعات للفواتير الآجلة</li>
          </ul>
          <h4 className="font-bold text-primary">إدارة الموردين</h4>
          <ul className="list-disc mr-6 space-y-1">
            <li>نفس طريقة العملاء - أكواد تلقائية (SUP-0001, SUP-0002...)</li>
            <li>اضغط على اسم المورد لعرض كشف الحساب</li>
          </ul>
          <h4 className="font-bold text-primary">المتأخرات</h4>
          <ul className="list-disc mr-6 space-y-1">
            <li><strong>ذمم العملاء:</strong> كل الفواتير الآجلة والجزئية غير المسددة للعملاء</li>
            <li><strong>ذمم الموردين:</strong> كل الفواتير الآجلة والجزئية غير المسددة للموردين</li>
            <li>يمكنك تسجيل دفعة من صفحة المتأخرات مباشرة</li>
          </ul>
        </div>
      ),
    },
    {
      id: "products",
      title: "المنتجات والمخزون",
      icon: Package,
      searchText: "منتج مخزون وحدة قياس أبعاد طول عرض مركب مكونات تصنيع مستودع تحويل تنبيه إعادة طلب باركود كود",
      content: (
        <div className="space-y-3 text-sm leading-7">
          <h4 className="font-bold text-primary">أنواع المنتجات</h4>
          <ul className="list-disc mr-6 space-y-1">
            <li><strong>منتج عادي:</strong> وحدة قياس واحدة (مثل: قطعة، كيلو)</li>
            <li><strong>منتج بوحدتين:</strong> شراء بوحدة وبيع بأخرى (شراء بالطن، بيع بالكيلو)</li>
            <li><strong>منتج بأبعاد:</strong> يُحسب بالطول × العرض (مثل: القماش، الزجاج)</li>
            <li><strong>منتج مركب:</strong> يتكون من مكونات (مثل: طقم أثاث = كنبة + كرسيين)</li>
          </ul>
          <h4 className="font-bold text-primary">المستودعات</h4>
          <ul className="list-disc mr-6 space-y-1">
            <li>يمكنك إنشاء عدة مستودعات وتتبع المخزون في كل مستودع على حدة</li>
            <li>استخدم <strong>تحويلات المخزون</strong> لنقل البضاعة بين المستودعات</li>
            <li>صفحة <strong>تنبيهات المخزون</strong> تعرض المنتجات التي وصلت لحد إعادة الطلب</li>
          </ul>
          <h4 className="font-bold text-primary">تصنيع المنتجات المركبة</h4>
          <ul className="list-disc mr-6 space-y-1">
            <li>أنشئ المنتج المركب وحدد مكوناته من تبويب "المكونات"</li>
            <li>اضغط "تصنيع" لخصم المكونات من المخزون وإضافة المنتج المركب</li>
          </ul>
        </div>
      ),
    },
    {
      id: "accounting",
      title: "المحاسبة (القيود والحسابات)",
      icon: Calculator,
      searchText: "حسابات قيد يومي مدين دائن أستاذ شجرة أصول خصوم حقوق ملكية إيرادات مصروفات رصيد محاسبة دفتر",
      content: (
        <div className="space-y-3 text-sm leading-7">
          <h4 className="font-bold text-primary">دليل الحسابات</h4>
          <ul className="list-disc mr-6 space-y-1">
            <li>أنشئ شجرة الحسابات حسب طبيعة نشاطك</li>
            <li>الحسابات هرمية (حساب رئيسي ← حسابات فرعية)</li>
            <li>أنواع الحسابات: أصول، خصوم، حقوق ملكية، إيرادات، مصروفات</li>
          </ul>
          <h4 className="font-bold text-primary">القيود اليومية</h4>
          <ul className="list-disc mr-6 space-y-1">
            <li>أنشئ قيد يومي مع بنود مدينة ودائنة</li>
            <li>يجب أن يتساوى مجموع المدين مع مجموع الدائن</li>
            <li>القيود تُنشأ تلقائياً عند اعتماد الفواتير والإيرادات والمصروفات</li>
          </ul>
          <h4 className="font-bold text-primary">دفتر الأستاذ</h4>
          <ul className="list-disc mr-6 space-y-1">
            <li>يعرض حركة كل حساب مع الرصيد الجاري</li>
            <li>يمكنك تصفية بالتاريخ ونوع الحساب</li>
          </ul>
        </div>
      ),
    },
    {
      id: "treasury",
      title: "الخزينة والإيرادات والمصروفات",
      icon: Wallet,
      searchText: "خزينة رصيد إيرادات مصروفات حركة مالية تقرير",
      content: (
        <div className="space-y-3 text-sm leading-7">
          <h4 className="font-bold text-primary">الخزينة</h4>
          <ul className="list-disc mr-6 space-y-1">
            <li>تعرض رصيد الخزينة الحالي وجميع الحركات</li>
            <li>يتم تحديثها تلقائياً مع كل عملية إيراد أو مصروف</li>
          </ul>
          <h4 className="font-bold text-primary">الإيرادات</h4>
          <ul className="list-disc mr-6 space-y-1">
            <li>سجل الإيرادات من مصادر مختلفة</li>
            <li>يتم إنشاء قيد محاسبي تلقائياً (مدين: الخزينة، دائن: الإيرادات)</li>
          </ul>
          <h4 className="font-bold text-primary">المصروفات</h4>
          <ul className="list-disc mr-6 space-y-1">
            <li>سجل المصروفات المختلفة</li>
            <li>يتم إنشاء قيد محاسبي تلقائياً (مدين: المصروفات، دائن: الخزينة)</li>
          </ul>
        </div>
      ),
    },
    {
      id: "returns",
      title: "المرتجعات",
      icon: RotateCcw,
      searchText: "مرتجع مبيعات مشتريات بضاعة إرجاع مخزون مرجع فاتورة أصلية",
      content: (
        <div className="space-y-3 text-sm leading-7">
          <h4 className="font-bold text-primary">مرتجع مبيعات</h4>
          <ul className="list-disc mr-6 space-y-1">
            <li>عندما يرجع العميل بضاعة، أنشئ فاتورة مرتجع مبيعات</li>
            <li>يمكنك الإشارة لرقم الفاتورة الأصلية في حقل "المرجع"</li>
            <li>المخزون يُرجع تلقائياً عند اعتماد المرتجع</li>
          </ul>
          <h4 className="font-bold text-primary">مرتجع مشتريات</h4>
          <ul className="list-disc mr-6 space-y-1">
            <li>عندما ترجع بضاعة للمورد، أنشئ فاتورة مرتجع مشتريات</li>
            <li>المخزون يُخصم تلقائياً عند اعتماد المرتجع</li>
          </ul>
        </div>
      ),
    },
    {
      id: "reports",
      title: "التقارير",
      icon: BarChart3,
      searchText: "تقرير أرباح خسائر كشف حساب عميل مورد منتج خزينة تصدير Excel PDF WhatsApp طباعة ذمم متأخرات",
      content: (
        <div className="space-y-3 text-sm leading-7">
          <h4 className="font-bold text-primary">أنواع التقارير المتاحة</h4>
          <ul className="list-disc mr-6 space-y-1">
            <li><strong>تقرير الأرباح والخسائر:</strong> يومي/أسبوعي/شهري/سنوي مع تصفية بالتاريخ</li>
            <li><strong>كشف حساب العميل:</strong> كل فواتير العميل مع المدين والدائن والرصيد</li>
            <li><strong>كشف حساب المورد:</strong> كل فواتير المورد مع الرصيد</li>
            <li><strong>تقرير المنتج:</strong> حركة المنتج، الموردين، المشترين، الربح</li>
            <li><strong>تقرير الخزينة:</strong> جميع حركات الخزينة مع التصفية</li>
            <li><strong>ذمم العملاء/الموردين:</strong> المبالغ المتأخرة والمستحقة</li>
          </ul>
          <h4 className="font-bold text-primary">التصدير</h4>
          <ul className="list-disc mr-6 space-y-1">
            <li>يمكنك تصدير أي تقرير أو قائمة إلى <strong>ملف Excel</strong></li>
            <li>يمكنك تصدير الفواتير إلى <strong>PDF</strong> للطباعة بجودة عالية</li>
            <li>يمكنك مشاركة الفواتير عبر <strong>WhatsApp</strong></li>
          </ul>
        </div>
      ),
    },
    {
      id: "permissions",
      title: "الصلاحيات وإدارة المستخدمين",
      icon: Shield,
      searchText: "صلاحيات مستخدمين أدوار مالك شركة عرض إنشاء تعديل حذف حظر تفعيل فرع مدير",
      content: (
        <div className="space-y-3 text-sm leading-7">
          <h4 className="font-bold text-primary">الأدوار</h4>
          <ul className="list-disc mr-6 space-y-1">
            <li><strong>مالك الشركة:</strong> كل الصلاحيات داخل شركته</li>
            <li><strong>مستخدم:</strong> صلاحيات محددة حسب ما يمنحه المالك</li>
          </ul>
          <h4 className="font-bold text-primary">نظام الصلاحيات</h4>
          <ul className="list-disc mr-6 space-y-1">
            <li>كل صفحة لها 4 صلاحيات: عرض، إنشاء، تعديل، حذف</li>
            <li>يمكنك تحديد الصلاحيات بدقة لكل مستخدم</li>
            <li>المستخدم يرى فقط الصفحات المصرح له بها في القائمة الجانبية</li>
          </ul>
          <h4 className="font-bold text-primary">إدارة المستخدمين</h4>
          <ul className="list-disc mr-6 space-y-1">
            <li>أضف مستخدمين جدد من صفحة "المستخدمين"</li>
            <li>يمكنك حظر/تفعيل أي مستخدم</li>
            <li>يمكنك تعيين مستخدم كمدير فرع</li>
          </ul>
        </div>
      ),
    },
    {
      id: "common-errors",
      title: "الأخطاء الشائعة وحلولها",
      icon: AlertTriangle,
      searchText: "خطأ مشكلة حل رصيد محفظة صلاحية فاتورة رقم مستخدم مخزون غير كافي مدين دائن طباعة متصفح نوافذ منبثقة تحديث ذاكرة تخزين",
      content: (
        <div className="space-y-4 text-sm leading-7">
          <div className="border rounded-lg p-3 border-red-200 dark:border-red-800">
            <h4 className="font-bold text-red-600 flex items-center gap-2"><Ban className="w-4 h-4" /> "رصيد المحفظة غير كافي"</h4>
            <p className="mt-1"><strong>السبب:</strong> نفاد رصيد محفظة الشركة</p>
            <p><strong>الحل:</strong> تواصل مع الإدارة لشحن المحفظة (01009376052)</p>
          </div>
          <div className="border rounded-lg p-3 border-red-200 dark:border-red-800">
            <h4 className="font-bold text-red-600 flex items-center gap-2"><Ban className="w-4 h-4" /> "ليس لديك صلاحية"</h4>
            <p className="mt-1"><strong>السبب:</strong> حسابك ليس لديه صلاحية الوصول لهذه الصفحة أو العملية</p>
            <p><strong>الحل:</strong> تواصل مع مالك الشركة لمنحك الصلاحيات المطلوبة</p>
          </div>
          <div className="border rounded-lg p-3 border-red-200 dark:border-red-800">
            <h4 className="font-bold text-red-600 flex items-center gap-2"><Ban className="w-4 h-4" /> "رقم الفاتورة مستخدم بالفعل"</h4>
            <p className="mt-1"><strong>السبب:</strong> محاولة إنشاء فاتورة بنفس رقم فاتورة موجودة</p>
            <p><strong>الحل:</strong> النظام يولد الأرقام تلقائياً - لا تعدل الرقم يدوياً إلا للضرورة</p>
          </div>
          <div className="border rounded-lg p-3 border-red-200 dark:border-red-800">
            <h4 className="font-bold text-red-600 flex items-center gap-2"><Ban className="w-4 h-4" /> "المخزون غير كافي"</h4>
            <p className="mt-1"><strong>السبب:</strong> الكمية المطلوبة في الفاتورة أكبر من المتاح في المستودع</p>
            <p><strong>الحل:</strong> تحقق من المخزون في المستودع المحدد، أو أنشئ فاتورة مشتريات لإضافة مخزون</p>
          </div>
          <div className="border rounded-lg p-3 border-red-200 dark:border-red-800">
            <h4 className="font-bold text-red-600 flex items-center gap-2"><Ban className="w-4 h-4" /> "مجموع المدين لا يساوي مجموع الدائن"</h4>
            <p className="mt-1"><strong>السبب:</strong> القيد المحاسبي غير متوازن</p>
            <p><strong>الحل:</strong> تأكد أن مجموع المبالغ المدينة = مجموع المبالغ الدائنة بالضبط</p>
          </div>
          <div className="border rounded-lg p-3 border-yellow-200 dark:border-yellow-800">
            <h4 className="font-bold text-yellow-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> الفاتورة لا تُطبع</h4>
            <p className="mt-1"><strong>السبب:</strong> متصفح الإنترنت يحجب النوافذ المنبثقة</p>
            <p><strong>الحل:</strong> اسمح للموقع بفتح النوافذ المنبثقة من إعدادات المتصفح</p>
          </div>
          <div className="border rounded-lg p-3 border-yellow-200 dark:border-yellow-800">
            <h4 className="font-bold text-yellow-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> البيانات لا تظهر بعد التحديث</h4>
            <p className="mt-1"><strong>السبب:</strong> ذاكرة التخزين المؤقت في المتصفح</p>
            <p><strong>الحل:</strong> اضغط Ctrl+Shift+R لإعادة تحميل الصفحة بالكامل</p>
          </div>
        </div>
      ),
    },
    {
      id: "tips",
      title: "نصائح وإرشادات",
      icon: Lightbulb,
      searchText: "نصيحة باركود مسح حفظ تلقائي مسودة بحث شامل متأخرات تصدير نسخ احتياطية وضع ليلي",
      content: (
        <div className="space-y-3 text-sm leading-7">
          <div className="flex items-start gap-2 bg-green-50 dark:bg-green-950 rounded-lg p-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold">استخدم الباركود</h4>
              <p>كل منتج له باركود يمكنك طباعته ولصقه. في صفحة المبيعات، يمكنك مسح الباركود لإضافة المنتج بسرعة.</p>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-green-50 dark:bg-green-950 rounded-lg p-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold">الحفظ التلقائي للمسودات</h4>
              <p>النظام يحفظ الفواتير غير المكتملة تلقائياً. إذا خرجت من الصفحة بالخطأ، ستجد بياناتك محفوظة عند العودة.</p>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-green-50 dark:bg-green-950 rounded-lg p-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold">البحث الشامل</h4>
              <p>استخدم شريط البحث في القائمة الجانبية للبحث في العملاء، الموردين، المنتجات، والفواتير من مكان واحد.</p>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-green-50 dark:bg-green-950 rounded-lg p-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold">تابع المتأخرات دورياً</h4>
              <p>راجع صفحة "ذمم العملاء" و"ذمم الموردين" بشكل دوري لتتبع المبالغ المستحقة وتسجيل الدفعات.</p>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-green-50 dark:bg-green-950 rounded-lg p-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold">صدّر بياناتك</h4>
              <p>صدّر التقارير والقوائم بشكل دوري إلى Excel كنسخ احتياطية واحتفظ بها.</p>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
            <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold">الوضع الليلي</h4>
              <p>يمكنك تفعيل الوضع الليلي من أسفل القائمة الجانبية لراحة العين أثناء العمل ليلاً.</p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const filteredSections = searchTerm
    ? sections.filter(s => s.title.includes(searchTerm) || s.searchText.includes(searchTerm))
    : sections;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800" dir="rtl">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="outline" size="icon" onClick={() => navigate("/")} data-testid="button-back-from-guide">
            <ArrowRight className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-guide-title">دليل استخدام البرنامج</h1>
            <p className="text-muted-foreground text-sm">aiverce محاسب - كل ما تحتاج معرفته لاستخدام النظام</p>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث في الدليل..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pr-10"
            data-testid="input-guide-search"
          />
        </div>

        <div className="space-y-3">
          {filteredSections.map(section => (
            <Card key={section.id} className="overflow-hidden">
              <button
                className="w-full text-right"
                onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                data-testid={`button-section-${section.id}`}
              >
                <CardHeader className="py-3 px-4">
                  <CardTitle className="flex items-center gap-3 text-base">
                    <section.icon className="w-5 h-5 text-primary flex-shrink-0" />
                    {section.title}
                    <ArrowRight className={`w-4 h-4 mr-auto transition-transform ${expandedSection === section.id ? "rotate-90" : "rotate-180"}`} />
                  </CardTitle>
                </CardHeader>
              </button>
              {expandedSection === section.id && (
                <CardContent className="pt-0 pb-4 px-4">
                  {section.content}
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="text-center space-y-2">
              <HelpCircle className="w-8 h-8 text-primary mx-auto" />
              <h3 className="font-bold">تحتاج مساعدة إضافية؟</h3>
              <p className="text-sm text-muted-foreground">تواصل معنا عبر صفحة الدعم الفني داخل البرنامج أو اتصل بنا مباشرة</p>
              <p className="text-sm font-medium">هاتف: 01009376052 - 01556660502</p>
              <p className="text-xs text-muted-foreground">إيميل: santws1@gmail.com</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
