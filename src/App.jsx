import { useEffect, useState } from "react";
import { AccessDeniedView } from "./components/AccessDeniedView";
import { AuthModal } from "./components/AuthModal";
import { Footer } from "./components/Footer";
import { GuideView } from "./components/GuideView";
import { LandingIntroView } from "./components/LandingIntroView";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { PricingContactView } from "./components/PricingContactView";
import { PublicLookupView } from "./components/PublicLookupView";
import { Sidebar } from "./components/Sidebar";
import { SuperAdminView } from "./components/SuperAdminView";
import { TenantAdminView } from "./components/TenantAdminView";
import { TopBar } from "./components/TopBar";
import { API_URL_ROOT, APP_CONFIG } from "./config/api";

export default function App() {
  // Views: 'gioi-thieu' | 'tra-cuu' | 'huong-dan' | 'bao-gia' | 'tenant-admin' | 'super-admin'
  const [currentView, setCurrentView] = useState("gioi-thieu");
  const [initialLookupQuery, setInitialLookupQuery] = useState("");
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Tenant state - prioritize environment variables if configured
  const [availableTenants, setAvailableTenants] = useState([]);
  const [currentTenant, setCurrentTenant] = useState(() => {
    if (APP_CONFIG.isStandalone && APP_CONFIG.tenant.slug) {
      return {
        id: APP_CONFIG.tenant.id || 1,
        slug: APP_CONFIG.tenant.slug,
        name: APP_CONFIG.tenant.name,
        contactZalo: APP_CONFIG.tenant.contactZalo,
        customerSplitRate: APP_CONFIG.tenant.customerSplitRate,
        taxRate: APP_CONFIG.tenant.taxRate,
        platformFeeRate: APP_CONFIG.tenant.platformFeeRate,
        primaryColor: APP_CONFIG.tenant.primaryColor,
      };
    }
    return null;
  });

  // Auth state
  const [token, setToken] = useState(() => localStorage.getItem("saasToken") || "");
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("saasUser");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Fetch tenants on mount & parse URL slug / environment config
  useEffect(() => {
    // Set dynamic document title if configured
    if (APP_CONFIG.tenant.brandTitle) {
      document.title = APP_CONFIG.tenant.brandTitle;
    }

    const fetchTenants = async () => {
      try {
        const res = await fetch(`${API_URL_ROOT}/api/saas/public/tenants`);
        if (res.ok) {
          const tenants = await res.json();
          setAvailableTenants(tenants);

          // 1. If configured in .env (standalone mode)
          if (APP_CONFIG.isStandalone && APP_CONFIG.tenant.slug) {
            const matchedEnv = tenants.find(
              (t) => t.slug.toLowerCase() === APP_CONFIG.tenant.slug.toLowerCase()
            );
            if (matchedEnv) {
              setCurrentTenant(matchedEnv);
              return;
            }
          }

          // 2. Check URL pathname or hash (e.g. /lecuong/k9A2b, /lananh/tra-cuu, /lananh)
          const cleanPath = window.location.pathname.replace(/^\/+|\/+$/g, "");
          const cleanHash = window.location.hash.replace(/^#\/?/, "");
          const pathToCheck = cleanPath || cleanHash;

          if (pathToCheck) {
            const segments = pathToCheck.split("/").filter(Boolean);
            const firstSegment = segments[0];
            const secondSegment = segments[1];

            const matched = tenants.find((t) => t.slug.toLowerCase() === firstSegment.toLowerCase());
            if (matched) {
              setCurrentTenant(matched);

              if (secondSegment) {
                const lowerSecond = secondSegment.toLowerCase();
                if (lowerSecond === "admin" || lowerSecond === "quan-tri") {
                  setCurrentView("tenant-admin");
                } else if (lowerSecond === "chinh-sach" || lowerSecond === "huong-dan") {
                  setCurrentView("chinh-sach");
                } else if (lowerSecond === "tra-cuu" || lowerSecond === "lookup") {
                  setCurrentView("tra-cuu");
                } else {
                  // Mẫu 3 Short Code: /{tenantSlug}/{shortCode} (VD: /lecuong/k9A2b)
                  setCurrentView("tra-cuu");
                  setInitialLookupQuery(secondSegment);
                }
              }
            }
          }

          // 3. If URL contains ?zaloId=... or ?query=... (sent by Zalo Bot), auto switch to lookup view
          const urlParams = new URLSearchParams(window.location.search);
          const queryParam = urlParams.get("zaloId") || urlParams.get("query");
          if (queryParam) {
            setCurrentView("tra-cuu");
            setInitialLookupQuery(queryParam);
          }

          if (tenants.length > 0 && !currentTenant && !pathToCheck) {
            setCurrentTenant(tenants[0]);
          }
        }
      } catch (err) {
        console.error("Error fetching tenants:", err);
      }
    };

    fetchTenants();
  }, []);

  // Sync / verify user session with backend
  useEffect(() => {
    if (token) {
      fetch(`${API_URL_ROOT}/api/saas/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : Promise.reject("Invalid session")))
        .then((userData) => {
          setUser(userData);
          localStorage.setItem("saasUser", JSON.stringify(userData));
        })
        .catch(() => {
          // Token expired or invalid
          setToken("");
          setUser(null);
          localStorage.removeItem("saasToken");
          localStorage.removeItem("saasUser");
        });
    }
  }, [token]);

  // Auto-redirect unauthorized users away from restricted admin views
  useEffect(() => {
    if (currentView === "super-admin" && user?.role !== "SUPER_ADMIN") {
      setCurrentView("gioi-thieu");
    } else if (
      currentView === "tenant-admin" &&
      user?.role !== "TENANT_ADMIN" &&
      user?.role !== "SUPER_ADMIN"
    ) {
      setCurrentView("gioi-thieu");
    }
  }, [currentView, user]);

  // If user is TENANT_ADMIN, auto select their assigned tenant
  useEffect(() => {
    if (user?.role === "TENANT_ADMIN" && user?.tenantId && availableTenants.length > 0) {
      const assigned = availableTenants.find(
        (t) => String(t.id) === String(user.tenantId)
      );
      if (assigned && (!currentTenant || String(currentTenant.id) !== String(assigned.id))) {
        setCurrentTenant(assigned);
      }
    }
  }, [user, availableTenants, currentTenant]);

  const handleGoogleSuccess = async (googleResponse) => {
    let authData = googleResponse;

    // If receiving raw Google response containing ID token credential
    if (googleResponse?.credential) {
      const res = await fetch(`${API_URL_ROOT}/api/saas/auth/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: googleResponse.credential }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Xác thực tài khoản Google thất bại");
      }
      authData = data;
    }

    if (!authData?.token || !authData?.user) {
      throw new Error("Không nhận được phản hồi hợp lệ từ máy chủ");
    }

    setToken(authData.token);
    setUser(authData.user);
    localStorage.setItem("saasToken", authData.token);
    localStorage.setItem("saasUser", JSON.stringify(authData.user));
    setIsAuthModalOpen(false);

    // Auto set assigned tenant if user is TENANT_ADMIN
    if (authData.user.role === "TENANT_ADMIN" && authData.user.tenantId && availableTenants.length > 0) {
      const assigned = availableTenants.find(
        (t) => String(t.id) === String(authData.user.tenantId)
      );
      if (assigned) {
        setCurrentTenant(assigned);
      }
    }

    // If Super Admin, switch to super-admin view
    if (authData.user.role === "SUPER_ADMIN") {
      setCurrentView("super-admin");
    } else if (authData.user.role === "TENANT_ADMIN") {
      setCurrentView("tenant-admin");
    }
  };

  const handleLogout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("saasToken");
    localStorage.removeItem("saasUser");
    setCurrentView("gioi-thieu");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans pb-20 lg:pb-0">
      {/* Backdrop overlay for mobile drawer */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Left Sidebar Layout (Desktop) */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentTenant={currentTenant}
        user={user}
        onOpenLogin={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Body */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen min-w-0 max-w-full overflow-x-hidden">
        {/* Dynamic TopBar */}
        <TopBar
          currentView={currentView}
          currentTenant={currentTenant}
          availableTenants={availableTenants}
          onSelectTenant={setCurrentTenant}
          user={user}
          onOpenLogin={() => setIsAuthModalOpen(true)}
          onToggleMobile={() => setIsMobileOpen((prev) => !prev)}
          onNavigate={(view) => setCurrentView(view)}
        />

        {/* View Router */}
        <main className="flex-1 p-3 sm:p-4 md:p-8 max-w-6xl w-full mx-auto min-w-0">
          {/* 1. Trang chủ & Giới thiệu */}
          {currentView === "gioi-thieu" && (
            <LandingIntroView
              currentTenant={currentTenant}
              availableTenants={availableTenants}
              onSelectTenant={setCurrentTenant}
              onNavigate={(view) => setCurrentView(view)}
              user={user}
            />
          )}

          {/* 2. Tra cứu & Rút tiền */}
          {currentView === "tra-cuu" && (
            <PublicLookupView
              apiRoot={API_URL_ROOT}
              currentTenant={currentTenant}
              availableTenants={availableTenants}
              onSelectTenant={setCurrentTenant}
              initialQuery={initialLookupQuery}
              user={user}
              token={token}
            />
          )}

          {/* 3. Hướng dẫn nhận hoa hồng */}
          {currentView === "huong-dan" && (
            <GuideView
              currentTenant={currentTenant}
              onNavigate={(view) => setCurrentView(view)}
            />
          )}

          {/* 4. Báo giá & Thuê nền tảng */}
          {currentView === "bao-gia" && <PricingContactView />}

          {/* 5. Quản trị Kênh (Admin Tenant) */}
          {currentView === "tenant-admin" && (
            !token || !user ? (
              <AccessDeniedView
                type="login_required"
                title="Khu Vực Quản Trị Trưởng Nhóm"
                requiredRole="Trưởng Nhóm (TENANT_ADMIN)"
                onOpenLogin={() => setIsAuthModalOpen(true)}
                onNavigateHome={() => setCurrentView("gioi-thieu")}
              />
            ) : user.role !== "TENANT_ADMIN" && user.role !== "SUPER_ADMIN" ? (
              <AccessDeniedView
                type="forbidden"
                title="Chưa Được Cấp Quyền Trưởng Nhóm"
                requiredRole="TENANT_ADMIN"
                user={user}
                onOpenLogin={() => setIsAuthModalOpen(true)}
                onLogout={handleLogout}
                onNavigateHome={() => setCurrentView("gioi-thieu")}
              />
            ) : (
              <TenantAdminView
                apiRoot={API_URL_ROOT}
                currentTenant={currentTenant}
                availableTenants={availableTenants}
                onSelectTenant={setCurrentTenant}
                user={user}
                token={token}
                onOpenLogin={() => setIsAuthModalOpen(true)}
              />
            )
          )}

          {/* 6. Super Admin Portal */}
          {currentView === "super-admin" && (
            !token || !user ? (
              <AccessDeniedView
                type="login_required"
                title="Khu Vực Quản Trị Toàn Sàn (Super Admin)"
                requiredRole="SUPER_ADMIN"
                onOpenLogin={() => setIsAuthModalOpen(true)}
                onNavigateHome={() => setCurrentView("gioi-thieu")}
              />
            ) : user.role !== "SUPER_ADMIN" ? (
              <AccessDeniedView
                type="forbidden"
                title="Không Có Quyền Super Admin"
                requiredRole="SUPER_ADMIN"
                user={user}
                onOpenLogin={() => setIsAuthModalOpen(true)}
                onLogout={handleLogout}
                onNavigateHome={() => setCurrentView("gioi-thieu")}
              />
            ) : (
              <SuperAdminView
                apiRoot={API_URL_ROOT}
                user={user}
                token={token}
                onOpenLogin={() => setIsAuthModalOpen(true)}
              />
            )
          )}
        </main>

        {/* Comprehensive Multi-Column Footer */}
        <Footer
          currentTenant={currentTenant}
          onNavigate={(view) => setCurrentView(view)}
          user={user}
        />
      </div>

      {/* Mobile Horizontal Bottom Navigation Bar */}
      <MobileBottomNav
        currentView={currentView}
        setCurrentView={setCurrentView}
        user={user}
      />

      {/* Google Login Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onGoogleSuccess={handleGoogleSuccess}
      />
    </div>
  );
}
