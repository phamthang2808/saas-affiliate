import { useEffect, useState } from "react";
import { AccessDeniedView } from "./components/AccessDeniedView";
import { AuthModal } from "./components/AuthModal";
import { Footer } from "./components/Footer";
import { GuideView } from "./components/GuideView";
import { LandingIntroView } from "./components/LandingIntroView";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { PricingContactView } from "./components/PricingContactView";
import { PublicLookupView } from "./components/PublicLookupView";
import { ShortLinkRedirectView } from "./components/ShortLinkRedirectView";
import { Sidebar } from "./components/Sidebar";
import { SuperAdminView } from "./components/SuperAdminView";
import { TenantAdminView } from "./components/TenantAdminView";
import { AnnouncementModal } from "./components/AnnouncementModal";
import { TopBar } from "./components/TopBar";
import { API_URL_ROOT, APP_CONFIG } from "./config/api";
import { isZaloBrowser, isAndroidDevice, openExternalBrowser } from "./utils/browserDetect";

export default function App() {
  const [shortCodeToResolve, setShortCodeToResolve] = useState(() => {
    const cleanPath = window.location.pathname.replace(/^\/+|\/+$/g, "");
    const cleanHash = window.location.hash.replace(/^#\/?/, "");
    const pathToCheck = cleanPath || cleanHash;
    if (pathToCheck) {
      const segments = pathToCheck.split("/").filter(Boolean);
      if (segments[0].toLowerCase() === "s" && segments[1]) {
        return segments[1];
      }
    }
    return null;
  });

  // Views: 'gioi-thieu' | 'tra-cuu' | 'huong-dan' | 'bao-gia' | 'tenant-admin' | 'super-admin' | 'short-link'
  const [currentView, setCurrentView] = useState(() => {
    const cleanPath = window.location.pathname.replace(/^\/+|\/+$/g, "");
    const cleanHash = window.location.hash.replace(/^#\/?/, "");
    const pathToCheck = cleanPath || cleanHash;
    if (pathToCheck) {
      const segments = pathToCheck.split("/").filter(Boolean);
      if (segments[0].toLowerCase() === "s" && segments[1]) {
        return "short-link";
      }
    }

    // 1. Kiểm tra URL hash (VD: #tenant-admin hoặc #super-admin)
    if (cleanHash && ["tenant-admin", "super-admin", "tra-cuu", "bao-gia", "huong-dan", "gioi-thieu"].includes(cleanHash)) {
      return cleanHash;
    }
    // 2. Khôi phục tab từ localStorage nếu đã đăng nhập quyền tương ứng
    const saved = localStorage.getItem("saasActiveView");
    const savedUserStr = localStorage.getItem("saasUser");
    let savedUser = null;
    try {
      savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
    } catch {}

    if (saved === "tenant-admin") {
      if (savedUser && (savedUser.role === "TENANT_ADMIN" || savedUser.role === "SUPER_ADMIN")) {
        return "tenant-admin";
      }
    } else if (saved === "super-admin") {
      if (savedUser && savedUser.role === "SUPER_ADMIN") {
        return "super-admin";
      }
    } else if (saved && ["tra-cuu", "bao-gia", "huong-dan", "gioi-thieu"].includes(saved)) {
      return saved;
    }
    return "gioi-thieu";
  });

  // Tự động lưu view hiện tại vào localStorage khi người dùng chuyển tab
  useEffect(() => {
    if (currentView) {
      localStorage.setItem("saasActiveView", currentView);
    }
  }, [currentView]);

  const [initialLookupQuery, setInitialLookupQuery] = useState("");
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("saasSidebarCollapsed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("saasSidebarCollapsed", isSidebarCollapsed ? "true" : "false");
    } catch {}
  }, [isSidebarCollapsed]);

  const handleToggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

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

  // Unified login opener with auto-breakout for Zalo Android
  const handleOpenLogin = () => {
    if (isZaloBrowser() && isAndroidDevice()) {
      try {
        openExternalBrowser(true);
      } catch (e) {
        console.error("Android breakout error:", e);
      }
    }
    setIsAuthModalOpen(true);
  };

  // Listen for ?auth=1 when jumping from Zalo into Safari/Chrome
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("auth") === "1" || params.get("login") === "true") {
        setIsAuthModalOpen(true);
        params.delete("auth");
        params.delete("login");
        const newQuery = params.toString() ? `?${params.toString()}` : "";
        window.history.replaceState({}, "", window.location.pathname + newQuery + window.location.hash);
      }
    } catch (e) {
      console.error("Auth param check error:", e);
    }
  }, []);

  // Dynamic SEO Title & Meta Description based on active view and tenant
  useEffect(() => {
    const tenantName = currentTenant?.name || "28AffiHub";
    let title = "";
    let desc = "";

    switch (currentView) {
      case "gioi-thieu":
        title = "28AffiHub — Nền Tảng Cho Thuê Bot Zalo Affiliate & Website Tra Cứu Hoàn Tiền Tự Động";
        desc = "Hạ tầng SaaS chuyên nghiệp cho thuê Bot Zalo Affiliate Shopee, TikTok Shop và tạo Website Affiliate hoàn tiền tự động 24/7.";
        break;
      case "tra-cuu":
        title = `Tra Cứu Đơn Hàng & Ví Tiền Hoàn Tiền Affiliate — ${tenantName}`;
        desc = `Cổng tra cứu đơn hàng Shopee, TikTok Shop và quản lý ví hoa hồng khả dụng, rút tiền 1 chạm tại ${tenantName}.`;
        break;
      case "bao-gia":
        title = "Bảng Giá Dịch Vụ Cho Thuê Bot Zalo Affiliate & Tạo Website Riêng — 28AffiHub";
        desc = "Bảng giá thuê Bot Zalo tự động tạo link hoàn tiền và hạ tầng Website Affiliate riêng cho Trưởng Nhóm, KOC, KOL.";
        break;
      case "huong-dan":
        title = `Hướng Dẫn Mua Sắm Nhận Hoàn Tiền & Quy Trình Vận Hành — ${tenantName}`;
        desc = `Xem hướng dẫn chi tiết cách gửi link Shopee, TikTok Shop vào nhóm Zalo để nhận hoàn tiền hoa hồng tự động tại ${tenantName}.`;
        break;
      case "tenant-admin":
        title = `Bảng Quản Trị Trưởng Nhóm & Đối Soát Đơn Hàng — ${tenantName}`;
        desc = `Quản trị đơn hàng, cấu hình tỷ lệ chia hoa hồng, duyệt lệnh rút tiền và cài đặt Bot Zalo tại ${tenantName}.`;
        break;
      case "super-admin":
        title = "Super Admin — Quản Trị Hệ Thống Nền Tảng 28AffiHub";
        desc = "Bảng điều khiển quản trị trung tâm SaaS 28AffiHub.";
        break;
      default:
        title = `${tenantName} — Hệ Thống Đối Soát & Hoàn Tiền Affiliate Tự Động`;
        desc = "Nền tảng cho thuê Bot Zalo Affiliate và tạo Website hoàn tiền tự động Shopee, TikTok Shop.";
    }

    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", desc);
    }
  }, [currentView, currentTenant]);

  // Fetch tenants on mount & parse URL slug / environment config
  useEffect(() => {

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

          let matchedTenant = null;
          if (pathToCheck) {
            const segments = pathToCheck.split("/").filter(Boolean);
            const firstSegment = segments[0];
            const secondSegment = segments[1];

            // Direct short link route: /s/{code}
            if (firstSegment.toLowerCase() === "s" && secondSegment) {
              setShortCodeToResolve(secondSegment);
              setCurrentView("short-link");
              return;
            }

            matchedTenant = tenants.find((t) => t.slug.toLowerCase() === firstSegment.toLowerCase());
            if (matchedTenant) {
              setCurrentTenant(matchedTenant);

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

          // 4. Nếu chưa chọn kênh qua URL cụ thể, luôn ưu tiên chọn Kênh Test "A Thắng cá chép Affiliate (/phamnga)" làm mặc định
          if (tenants.length > 0 && !matchedTenant) {
            const defaultTestTenant = tenants.find(
              (t) => t.slug?.toLowerCase() === "phamnga" || t.slug?.toLowerCase().includes("phamnga")
            ) || tenants[0];
            setCurrentTenant(defaultTestTenant);
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
    localStorage.removeItem("saasActiveView");
    localStorage.removeItem("saasTenantAdminTab");
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

      {/* Left Sidebar Layout */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentTenant={currentTenant}
        user={user}
        onOpenLogin={handleOpenLogin}
        onLogout={handleLogout}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Content Body */}
      <div
        className={`flex-1 flex flex-col min-h-screen min-w-0 max-w-full overflow-x-hidden transition-[margin] duration-300 ease-in-out ${
          isSidebarCollapsed ? "lg:ml-0" : "lg:ml-64"
        }`}
      >
        {/* Dynamic TopBar */}
        <TopBar
          currentView={currentView}
          currentTenant={currentTenant}
          availableTenants={availableTenants}
          onSelectTenant={setCurrentTenant}
          user={user}
          onOpenLogin={handleOpenLogin}
          onLogout={handleLogout}
          onToggleSidebar={handleToggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
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
                onOpenLogin={handleOpenLogin}
                onNavigateHome={() => setCurrentView("gioi-thieu")}
              />
            ) : user.role !== "TENANT_ADMIN" && user.role !== "SUPER_ADMIN" ? (
              <AccessDeniedView
                type="forbidden"
                title="Chưa Được Cấp Quyền Trưởng Nhóm"
                requiredRole="TENANT_ADMIN"
                user={user}
                onOpenLogin={handleOpenLogin}
                onLogout={handleLogout}
                onNavigateHome={() => setCurrentView("gioi-thieu")}
              />
            ) : (
              <>
                <TenantAdminView
                  apiRoot={API_URL_ROOT}
                  currentTenant={currentTenant}
                  availableTenants={availableTenants}
                  onSelectTenant={setCurrentTenant}
                  user={user}
                  token={token}
                  onOpenLogin={handleOpenLogin}
                  onLogout={handleLogout}
                />
                <AnnouncementModal apiRoot={API_URL_ROOT} />
              </>
            )
          )}

          {/* 6. Super Admin Portal */}
          {currentView === "super-admin" && (
            !token || !user ? (
              <AccessDeniedView
                type="login_required"
                title="Khu Vực Quản Trị Toàn Sàn (Super Admin)"
                requiredRole="SUPER_ADMIN"
                onOpenLogin={handleOpenLogin}
                onNavigateHome={() => setCurrentView("gioi-thieu")}
              />
            ) : user.role !== "SUPER_ADMIN" ? (
              <AccessDeniedView
                type="forbidden"
                title="Không Có Quyền Super Admin"
                requiredRole="SUPER_ADMIN"
                user={user}
                onOpenLogin={handleOpenLogin}
                onLogout={handleLogout}
                onNavigateHome={() => setCurrentView("gioi-thieu")}
              />
            ) : (
              <SuperAdminView
                apiRoot={API_URL_ROOT}
                user={user}
                token={token}
                onOpenLogin={handleOpenLogin}
                onLogout={handleLogout}
              />
            )
          )}

          {/* 7. Short Link Redirect Router */}
          {currentView === "short-link" && (
            <ShortLinkRedirectView
              shortCode={shortCodeToResolve}
              onNavigateHome={() => setCurrentView("gioi-thieu")}
            />
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
        onOpenLogin={handleOpenLogin}
        onLogout={handleLogout}
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
