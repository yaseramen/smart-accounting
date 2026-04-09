import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  LayoutDashboard, BookOpen, FileText, Users, Truck, Calculator,
  Building2, UserCog, Wallet, ScrollText, Settings, Shield, LogOut,
  Package, Warehouse, ShoppingCart, PackageOpen, AlertTriangle, Undo2, ArrowLeftRight,
  BarChart3, Sun, Moon, TrendingUp, MessageCircle, MessageSquare, Eye, X, Monitor,
  Bell, Check, CheckCheck, Info, AlertCircle, Search, Landmark, CircleDollarSign, Receipt,
  BookOpenCheck, ShieldCheck,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/theme-provider";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Notification } from "@shared/schema";

const superAdminMenuItems = [
  { title: "لوحة تحكم النظام", url: "/", icon: LayoutDashboard },
];

const mainMenuItems = [
  { title: "لوحة التحكم", url: "/", icon: LayoutDashboard, page: "dashboard" },
  { title: "شجرة الحسابات", url: "/accounts", icon: BookOpen, page: "accounts" },
  { title: "قيود اليومية", url: "/journal-entries", icon: FileText, page: "journal-entries" },
  { title: "دفتر الأستاذ", url: "/ledger", icon: Calculator, page: "ledger" },
  { title: "العملاء", url: "/customers", icon: Users, page: "customers" },
  { title: "الموردين", url: "/suppliers", icon: Truck, page: "suppliers" },
  { title: "المنتجات", url: "/products", icon: Package, page: "products" },
  { title: "المخازن", url: "/warehouses", icon: Warehouse, page: "warehouses" },
  { title: "فواتير المبيعات", url: "/sales", icon: ShoppingCart, page: "sales" },
  { title: "فواتير المشتريات", url: "/purchases", icon: PackageOpen, page: "purchases" },
  { title: "المرتجعات", url: "/returns", icon: Undo2, page: "returns" },
  { title: "الخزينة", url: "/treasury", icon: Landmark, page: "treasury" },
  { title: "الإيرادات", url: "/revenue", icon: CircleDollarSign, page: "revenue" },
  { title: "المصروفات", url: "/expenses-page", icon: Receipt, page: "expenses-page" },
  { title: "تحويلات المخزون", url: "/stock-transfers", icon: ArrowLeftRight, page: "stock-transfers" },
  { title: "تنبيهات المخزون", url: "/stock-alerts", icon: AlertTriangle, page: "stock-alerts" },
  { title: "المستحقات على العملاء", url: "/receivables", icon: TrendingUp, page: "receivables" },
  { title: "المستحقات للموردين", url: "/payables", icon: TrendingUp, page: "payables" },
  { title: "التقارير", url: "/reports", icon: BarChart3, page: "reports" },
];

const adminMenuItems = [
  { title: "الفروع", url: "/branches", icon: Building2, page: "branches" },
  { title: "المستخدمين", url: "/users", icon: UserCog, page: "users" },
  { title: "المحفظة", url: "/wallet", icon: Wallet, page: "wallet" },
  { title: "سجل العمليات", url: "/audit-log", icon: ScrollText, page: "audit-log" },
  { title: "سجل الدخول", url: "/login-logs", icon: Monitor, page: "login-logs" },
  { title: "إعدادات الشركة", url: "/settings", icon: Settings, page: "settings" },
];

type CompanyItem = { id: number; name: string; slug: string };

export function AppSidebar() {
  const [location] = useLocation();
  const { user, hasPermission, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isSuperAdmin = user?.role === "super_admin";
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  const { data: companiesList } = useQuery<CompanyItem[]>({
    queryKey: ["/api/admin/companies"],
    enabled: isSuperAdmin,
  });

  useEffect(() => {
    const stored = sessionStorage.getItem("adminCompanyId");
    if (stored) setSelectedCompanyId(stored);
  }, []);

  const handleCompanyChange = (value: string) => {
    if (value === "none") {
      sessionStorage.removeItem("adminCompanyId");
      setSelectedCompanyId("");
    } else {
      sessionStorage.setItem("adminCompanyId", value);
      setSelectedCompanyId(value);
    }
    queryClient.clear();
    queryClient.invalidateQueries();
    window.location.reload();
  };

  const clearCompanyView = () => {
    sessionStorage.removeItem("adminCompanyId");
    setSelectedCompanyId("");
    queryClient.clear();
    queryClient.invalidateQueries();
    window.location.reload();
  };

  const { data: notificationsData } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const unreadCount = notificationsData?.filter(n => !n.isRead).length || 0;

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PUT", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const getNotificationIcon = (type: string) => {
    if (type === "success") return <Check className="w-3.5 h-3.5 text-green-500" />;
    if (type === "warning") return <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />;
    return <Info className="w-3.5 h-3.5 text-blue-500" />;
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  const { data: searchResults } = useQuery<{
    customers: { id: number; name: string; code: string; phone: string | null }[];
    suppliers: { id: number; name: string; code: string; phone: string | null }[];
    products: { id: number; name: string; code: string; barcode: string | null }[];
    invoices: { id: number; invoiceNumber: string; type: string; total: string }[];
  }>({
    queryKey: ["/api/search", `?q=${encodeURIComponent(searchQuery)}`],
    enabled: searchQuery.length >= 1,
  });

  const handleSearchChange = useCallback((value: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(value);
      if (value.length >= 1) setSearchOpen(true);
    }, 300);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchResultClick = (url: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    navigate(url);
  };

  const hasSearchResults = searchResults && (
    searchResults.customers.length > 0 ||
    searchResults.suppliers.length > 0 ||
    searchResults.products.length > 0 ||
    searchResults.invoices.length > 0
  );

  const getInvoiceTypeLabel = (type: string) => {
    if (type === "sale") return "مبيعات";
    if (type === "purchase") return "مشتريات";
    if (type === "sale_return") return "مرتجع مبيعات";
    if (type === "purchase_return") return "مرتجع مشتريات";
    return type;
  };

  const getInvoiceUrl = (type: string) => {
    if (type === "sale") return "/sales";
    if (type === "purchase") return "/purchases";
    return "/returns";
  };

  const isViewingCompany = isSuperAdmin && !!selectedCompanyId;
  const selectedCompanyName = companiesList?.find(c => c.id === Number(selectedCompanyId))?.name;

  const visibleMainItems = isSuperAdmin
    ? (isViewingCompany ? mainMenuItems : [])
    : mainMenuItems.filter(item => hasPermission(item.page));
  const visibleAdminItems = isSuperAdmin
    ? (isViewingCompany ? adminMenuItems : [])
    : adminMenuItems.filter(item => hasPermission(item.page));

  return (
    <Sidebar side="right">
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="aiverce محاسب" className="w-8 h-8 rounded-md object-contain" />
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-sm" data-testid="text-app-title">aiverce محاسب</h2>
            <p className="text-xs text-muted-foreground truncate" data-testid="text-company-name">
              {isViewingCompany ? selectedCompanyName : (isSuperAdmin ? "الإدارة العامة للنظام" : user?.company?.name || "نظام ERP محاسبي")}
            </p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon" variant="ghost" className="relative" data-testid="button-notifications">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-medium" data-testid="badge-notification-count">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start" side="bottom">
              <div className="flex items-center justify-between gap-1 p-3 border-b">
                <h4 className="text-sm font-semibold" data-testid="text-notifications-title">الإشعارات</h4>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllAsReadMutation.mutate()}
                    disabled={markAllAsReadMutation.isPending}
                    data-testid="button-mark-all-read"
                  >
                    <CheckCheck className="w-3.5 h-3.5 ml-1" />
                    قراءة الكل
                  </Button>
                )}
              </div>
              <ScrollArea className="max-h-[300px]">
                {(!notificationsData || notificationsData.length === 0) ? (
                  <div className="p-4 text-center text-sm text-muted-foreground" data-testid="text-no-notifications">
                    لا توجد إشعارات
                  </div>
                ) : (
                  <div>
                    {notificationsData.map((notif) => (
                      <div
                        key={notif.id}
                        className={`flex items-start gap-2 p-3 border-b last:border-b-0 cursor-pointer hover-elevate ${!notif.isRead ? "bg-muted/50" : ""}`}
                        onClick={() => {
                          if (!notif.isRead) markAsReadMutation.mutate(notif.id);
                        }}
                        data-testid={`notification-item-${notif.id}`}
                      >
                        <div className="mt-0.5">{getNotificationIcon(notif.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium ${!notif.isRead ? "" : "text-muted-foreground"}`}>{notif.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{notif.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                          </p>
                        </div>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
        {isSuperAdmin && (
          <div className="mt-3">
            {isViewingCompany ? (
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="flex-1 justify-center text-xs py-1">
                  <Eye className="w-3 h-3 ml-1" />
                  عرض: {selectedCompanyName}
                </Badge>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={clearCompanyView} data-testid="button-exit-company-view">
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Select value={selectedCompanyId || "none"} onValueChange={handleCompanyChange}>
                <SelectTrigger className="h-8 text-xs" data-testid="select-admin-company">
                  <SelectValue placeholder="اختر شركة للعرض..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">الإدارة العامة فقط</SelectItem>
                  {companiesList?.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        {user?.companyId && (
          <div className="px-3 pt-3" ref={searchContainerRef}>
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="بحث عن عميل، مورد، منتج، فاتورة..."
                className="pr-9 text-xs"
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => { if (searchQuery.length >= 1) setSearchOpen(true); }}
                data-testid="input-global-search"
              />
              {searchOpen && searchQuery.length >= 1 && (
                <div className="absolute top-full right-0 left-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-[350px] overflow-auto">
                  {!hasSearchResults ? (
                    <div className="p-3 text-center text-xs text-muted-foreground" data-testid="text-no-search-results">
                      لا توجد نتائج
                    </div>
                  ) : (
                    <div>
                      {searchResults!.customers.length > 0 && (
                        <div>
                          <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground bg-muted/50">العملاء</div>
                          {searchResults!.customers.map((c) => (
                            <div
                              key={`c-${c.id}`}
                              className="px-3 py-2 text-xs cursor-pointer hover-elevate flex items-center gap-2"
                              onClick={() => handleSearchResultClick("/customers")}
                              data-testid={`search-result-customer-${c.id}`}
                            >
                              <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="flex-1 truncate">{c.name}</span>
                              <span className="text-muted-foreground text-[10px]">{c.code}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {searchResults!.suppliers.length > 0 && (
                        <div>
                          <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground bg-muted/50">الموردين</div>
                          {searchResults!.suppliers.map((s) => (
                            <div
                              key={`s-${s.id}`}
                              className="px-3 py-2 text-xs cursor-pointer hover-elevate flex items-center gap-2"
                              onClick={() => handleSearchResultClick("/suppliers")}
                              data-testid={`search-result-supplier-${s.id}`}
                            >
                              <Truck className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="flex-1 truncate">{s.name}</span>
                              <span className="text-muted-foreground text-[10px]">{s.code}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {searchResults!.products.length > 0 && (
                        <div>
                          <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground bg-muted/50">المنتجات</div>
                          {searchResults!.products.map((p) => (
                            <div
                              key={`p-${p.id}`}
                              className="px-3 py-2 text-xs cursor-pointer hover-elevate flex items-center gap-2"
                              onClick={() => handleSearchResultClick("/products")}
                              data-testid={`search-result-product-${p.id}`}
                            >
                              <Package className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="flex-1 truncate">{p.name}</span>
                              <span className="text-muted-foreground text-[10px]">{p.code}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {searchResults!.invoices.length > 0 && (
                        <div>
                          <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground bg-muted/50">الفواتير</div>
                          {searchResults!.invoices.map((inv) => (
                            <div
                              key={`i-${inv.id}`}
                              className="px-3 py-2 text-xs cursor-pointer hover-elevate flex items-center gap-2"
                              onClick={() => handleSearchResultClick(getInvoiceUrl(inv.type))}
                              data-testid={`search-result-invoice-${inv.id}`}
                            >
                              <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              <span className="flex-1 truncate">{inv.invoiceNumber}</span>
                              <Badge variant="secondary" className="text-[10px]">{getInvoiceTypeLabel(inv.type)}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>إدارة النظام</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {!isViewingCompany && superAdminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      data-active={location === item.url}
                      className="data-[active=true]:bg-sidebar-accent"
                    >
                      <Link href={item.url} data-testid="link-system-dashboard">
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    data-active={location === "/system-settings"}
                    className="data-[active=true]:bg-sidebar-accent"
                  >
                    <Link href="/system-settings" data-testid="link-system-settings">
                      <Shield className="w-4 h-4" />
                      <span>إعدادات النظام</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    data-active={location === "/platform-earnings"}
                    className="data-[active=true]:bg-sidebar-accent"
                  >
                    <Link href="/platform-earnings" data-testid="link-platform-earnings">
                      <TrendingUp className="w-4 h-4" />
                      <span>تقارير أرباح المنصة</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    data-active={location === "/audit-log"}
                    className="data-[active=true]:bg-sidebar-accent"
                  >
                    <Link href="/audit-log" data-testid="link-audit-log">
                      <ScrollText className="w-4 h-4" />
                      <span>سجل العمليات</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    data-active={location === "/login-logs"}
                    className="data-[active=true]:bg-sidebar-accent"
                  >
                    <Link href="/login-logs" data-testid="link-login-logs">
                      <Monitor className="w-4 h-4" />
                      <span>سجل الدخول</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    data-active={location === "/admin-support"}
                    className="data-[active=true]:bg-sidebar-accent"
                  >
                    <Link href="/admin-support" data-testid="link-admin-support">
                      <MessageSquare className="w-4 h-4" />
                      <span>تذاكر الدعم</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {visibleMainItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>{isViewingCompany ? `${selectedCompanyName}` : "القائمة الرئيسية"}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleMainItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      data-active={location === item.url}
                      className="data-[active=true]:bg-sidebar-accent"
                    >
                      <Link href={item.url} data-testid={`link-${item.url.replace("/", "") || "dashboard"}`}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {visibleAdminItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>الإدارة</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      data-active={location === item.url}
                      className="data-[active=true]:bg-sidebar-accent"
                    >
                      <Link href={item.url} data-testid={`link-${item.url.replace("/", "")}`}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  data-active={location === "/support"}
                  className="data-[active=true]:bg-sidebar-accent"
                >
                  <Link href="/support" data-testid="link-support">
                    <MessageCircle className="w-4 h-4" />
                    <span>الدعم الفني</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  data-active={location === "/guide"}
                  className="data-[active=true]:bg-sidebar-accent"
                >
                  <Link href="/guide" data-testid="link-guide">
                    <BookOpenCheck className="w-4 h-4" />
                    <span>دليل الاستخدام</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  data-active={location === "/terms"}
                  className="data-[active=true]:bg-sidebar-accent"
                >
                  <Link href="/terms" data-testid="link-terms-sidebar">
                    <ShieldCheck className="w-4 h-4" />
                    <span>سياسة الاستخدام</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t">
        <div className="px-2 py-1">
          <p className="text-xs font-medium" data-testid="text-sidebar-username">{user?.fullName}</p>
          <p className="text-xs text-muted-foreground">{user?.role === "super_admin" ? "مدير النظام" : user?.role === "company_owner" ? "مالك الشركة" : "مستخدم"}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="flex-1 justify-start" onClick={toggleTheme} data-testid="button-toggle-theme">
            {theme === "dark" ? <Sun className="w-4 h-4 ml-2" /> : <Moon className="w-4 h-4 ml-2" />}
            {theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => logout.mutate()} data-testid="button-logout">
          <LogOut className="w-4 h-4 ml-2" />
          تسجيل الخروج
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
