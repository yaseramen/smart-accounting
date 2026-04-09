import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import AccountsPage from "@/pages/accounts";
import CustomersPage from "@/pages/customers";
import SuppliersPage from "@/pages/suppliers";
import JournalEntriesPage from "@/pages/journal-entries";
import LedgerPage from "@/pages/ledger";
import ProductsPage from "@/pages/products";
import WarehousesPage from "@/pages/warehouses";
import SalesPage from "@/pages/sales";
import PurchasesPage from "@/pages/purchases";
import StockAlertsPage from "@/pages/stock-alerts";
import StockTransfersPage from "@/pages/stock-transfers";
import ReturnsPage from "@/pages/returns";
import BranchesPage from "@/pages/admin/branches";
import UsersPage from "@/pages/admin/users";
import WalletPage from "@/pages/admin/wallet";
import AuditLogPage from "@/pages/admin/audit-log";
import SettingsPage from "@/pages/admin/settings";
import SystemSettingsPage from "@/pages/admin/system-settings";
import SystemDashboardPage from "@/pages/admin/system-dashboard";
import PlatformEarningsPage from "@/pages/admin/platform-earnings";
import AdminSupportTicketsPage from "@/pages/admin/support-tickets";
import SupportPage from "@/pages/support";
import CustomerStatementPage from "@/pages/customer-statement";
import SupplierStatementPage from "@/pages/supplier-statement";
import ProductReportPage from "@/pages/product-report";
import ReportsPage from "@/pages/reports";
import LoginLogsPage from "@/pages/admin/login-logs";
import TreasuryPage from "@/pages/treasury";
import RevenuePage from "@/pages/revenue";
import ExpensesPageComponent from "@/pages/expenses-page";
import ReceivablesPage from "@/pages/receivables";
import PayablesPage from "@/pages/payables";
import TermsPage from "@/pages/terms";
import GuidePage from "@/pages/guide";

function AuthenticatedRouter() {
  const { hasPermission, user } = useAuth();

  const isSuperAdmin = user?.role === "super_admin";
  const isViewingCompany = isSuperAdmin && !!sessionStorage.getItem("adminCompanyId");

  return (
    <Switch>
      <Route path="/">{isSuperAdmin && !isViewingCompany ? <SystemDashboardPage /> : <Dashboard />}</Route>
      {hasPermission("accounts") && <Route path="/accounts" component={AccountsPage} />}
      {hasPermission("journal-entries") && <Route path="/journal-entries" component={JournalEntriesPage} />}
      {hasPermission("ledger") && <Route path="/ledger" component={LedgerPage} />}
      {hasPermission("customers") && <Route path="/customers" component={CustomersPage} />}
      {hasPermission("suppliers") && <Route path="/suppliers" component={SuppliersPage} />}
      {hasPermission("products") && <Route path="/products" component={ProductsPage} />}
      {hasPermission("warehouses") && <Route path="/warehouses" component={WarehousesPage} />}
      {hasPermission("sales") && <Route path="/sales" component={SalesPage} />}
      {hasPermission("purchases") && <Route path="/purchases" component={PurchasesPage} />}
      {hasPermission("returns") && <Route path="/returns" component={ReturnsPage} />}
      {hasPermission("stock-transfers") && <Route path="/stock-transfers" component={StockTransfersPage} />}
      {hasPermission("stock-alerts") && <Route path="/stock-alerts" component={StockAlertsPage} />}
      {hasPermission("reports") && <Route path="/reports" component={ReportsPage} />}
      {hasPermission("treasury") && <Route path="/treasury" component={TreasuryPage} />}
      {hasPermission("revenue") && <Route path="/revenue" component={RevenuePage} />}
      {hasPermission("expenses-page") && <Route path="/expenses-page" component={ExpensesPageComponent} />}
      {hasPermission("receivables") && <Route path="/receivables" component={ReceivablesPage} />}
      {hasPermission("payables") && <Route path="/payables" component={PayablesPage} />}
      <Route path="/customers/:id/statement" component={CustomerStatementPage} />
      <Route path="/suppliers/:id/statement" component={SupplierStatementPage} />
      <Route path="/products/:id/report" component={ProductReportPage} />
      {hasPermission("branches") && <Route path="/branches" component={BranchesPage} />}
      {hasPermission("users") && <Route path="/users" component={UsersPage} />}
      {hasPermission("wallet") && <Route path="/wallet" component={WalletPage} />}
      {hasPermission("audit-log") && <Route path="/audit-log" component={AuditLogPage} />}
      {(user?.role === "company_owner" || user?.role === "super_admin") && <Route path="/login-logs" component={LoginLogsPage} />}
      {hasPermission("settings") && <Route path="/settings" component={SettingsPage} />}
      {user?.role === "super_admin" && <Route path="/system-settings" component={SystemSettingsPage} />}
      {user?.role === "super_admin" && <Route path="/platform-earnings" component={PlatformEarningsPage} />}
      {user?.role === "super_admin" && <Route path="/admin-support" component={AdminSupportTicketsPage} />}
      <Route path="/support" component={SupportPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/guide" component={GuidePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { user } = useAuth();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full" dir="rtl">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-1 p-2 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground" data-testid="text-user-name">{user?.fullName}</span>
              <h3 className="text-sm font-medium text-muted-foreground">aiverce محاسب</h3>
            </div>
          </header>
          <main className="flex-1 overflow-hidden">
            <AuthenticatedRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    if (location === "/terms") return <TermsPage />;
    if (location === "/guide") return <GuidePage />;
    if (location !== "/login") return <Redirect to="/login" />;
    return <LoginPage />;
  }

  if (location === "/login") return <Redirect to="/" />;

  return <AuthenticatedApp />;
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
