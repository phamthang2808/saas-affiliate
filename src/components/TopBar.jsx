import logoImg from "../assets/logo.png";
import { APP_CONFIG } from "../config/api";

export function TopBar({
  currentView,
  currentTenant,
  availableTenants,
  onSelectTenant,
  user,
  onOpenLogin,
  onToggleMobile,
  onNavigate,
}) {
  const groupName = currentTenant?.name || APP_CONFIG.tenant.name || "28AffiHub";

  const getHeaderInfo = () => {
    switch (currentView) {
      case "gioi-thieu":
        return {
          title: "Chính sách & Giới thiệu",
          subtitle: `Chương trình đối soát hoàn tiền của nhóm ${groupName}`,
          breadcrumb: "Giới thiệu",
        };
      case "tra-cuu":
        return {
          title: "Tra cứu & Rút tiền",
          subtitle: "Kiểm tra đơn hàng Shopee & TikTok Shop và rút tiền về ngân hàng",
          breadcrumb: "Tra cứu ví",
        };
      case "huong-dan":
        return {
          title: "Tính năng & Quy trình",
          subtitle: "Quy trình vận hành bot Zalo và web tra cứu hoàn tiền",
          breadcrumb: "Quy trình",
        };
      case "bao-gia":
        return {
          title: "Báo giá & Thuê nền tảng",
          subtitle: "Dịch vụ cung cấp web tra cứu & bot Zalo trọn gói cho Trưởng Nhóm / KOC",
          breadcrumb: "Báo giá SaaS",
        };
      case "tenant-admin":
        return {
          title: `Quản Trị Trưởng Nhóm: ${groupName}`,
          subtitle: "Đối soát đơn hàng, nạp file Excel và duyệt lệnh chuyển khoản",
          breadcrumb: "Quản trị nhóm",
        };
      case "super-admin":
        return {
          title: "Quản Trị Viên (Toàn Sàn)",
          subtitle: "Quản trị toàn bộ danh sách Trưởng Nhóm và doanh thu toàn sàn",
          breadcrumb: "Quản trị viên",
        };
      default:
        return {
          title: "28AffiHub Portal",
          subtitle: "Hệ thống tiếp thị liên kết tự động",
          breadcrumb: "Trang chủ",
        };
    }
  };

  const info = getHeaderInfo();

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-3.5 md:px-8 py-2.5 md:py-3 flex items-center justify-between gap-3">
      {/* Left: Mobile Brand Logo & Dynamic Breadcrumb + Title */}
      <div className="flex items-center gap-2.5">
        {/* Mobile Logo Link */}
        <div
          onClick={() => onNavigate && onNavigate("gioi-thieu")}
          className="lg:hidden flex items-center gap-2 cursor-pointer shrink-0"
        >
          <img
            src={logoImg}
            alt="28AffiHub"
            className="h-8 w-auto object-contain"
          />
        </div>

        <div>
          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-0.5">
            <span
              onClick={() => onNavigate && onNavigate("gioi-thieu")}
              className="hover:text-orange-600 cursor-pointer"
            >
              28AffiHub
            </span>
            <span>/</span>
            {currentView === "tenant-admin" && (
              <>
                <span className="text-slate-500 font-bold">{groupName}</span>
                <span>/</span>
              </>
            )}
            <span className="text-orange-600 font-bold">{info.breadcrumb}</span>
          </div>

          <h1 className="text-xs sm:text-sm md:text-base font-black text-slate-900 font-display flex items-center gap-2 truncate max-w-[200px] sm:max-w-none">
            <span>{info.title}</span>
            {currentView === "tenant-admin" && currentTenant && (
              <span className="hidden md:inline-block text-[10px] px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 border border-orange-200 font-bold font-mono">
                /{currentTenant.slug}
              </span>
            )}
          </h1>
        </div>
      </div>

      {/* Right: Group Switcher (only in tenant-admin) + Profile / Login */}
      <div className="flex items-center gap-2.5">
        {/* Show Group selector only in Tenant Admin area */}
        {currentView === "tenant-admin" && availableTenants.length > 0 && (
          <div className="flex items-center gap-1.5 bg-slate-100/90 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <i className="fa-solid fa-users text-[11px] text-slate-400"></i>
            <span className="text-[11px] font-bold text-slate-500 hidden md:inline">Nhóm:</span>
            <select
              value={currentTenant?.slug || ""}
              onChange={(e) => {
                const t = availableTenants.find((item) => item.slug === e.target.value);
                if (t) onSelectTenant(t);
              }}
              className="bg-transparent text-orange-600 font-black text-xs outline-none border-0 cursor-pointer font-sans max-w-[130px] sm:max-w-[170px]"
            >
              {availableTenants.map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Notification Bell Button */}
        <button
          onClick={() => alert("Thông báo: Hệ thống 28AffiHub đang hoạt động ổn định 24/7!")}
          className="w-8 h-8 rounded-full bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-500 hover:text-orange-600 flex items-center justify-center transition cursor-pointer shadow-2xs"
          title="Thông báo hệ thống"
        >
          <i className="fa-regular fa-bell text-xs"></i>
        </button>

        {/* User profile / Login */}
        {user ? (
          <div className="flex items-center gap-2 bg-slate-100 pl-1 pr-2.5 py-1 rounded-full border border-slate-200">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-7 h-7 rounded-full object-cover border border-orange-400"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-orange-500 text-white text-[11px] font-black flex items-center justify-center">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
            )}
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 truncate max-w-[90px] sm:max-w-[120px] leading-tight">
                {user.name || user.email}
              </span>
              <span className="text-[9px] font-bold text-orange-600">
                {user.role === "SUPER_ADMIN" ? "👑 Quản trị viên" : "👔 Trưởng nhóm"}
              </span>
            </div>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-full border border-slate-300 shadow-xs flex items-center gap-1.5 transition cursor-pointer hover:border-orange-400"
          >
            <i className="fa-brands fa-google text-red-500 text-xs"></i>
            <span className="hidden sm:inline">Đăng nhập</span>
          </button>
        )}
      </div>
    </header>
  );
}
