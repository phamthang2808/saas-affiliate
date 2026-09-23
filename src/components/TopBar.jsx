import { useState } from "react";
import logoImg from "../assets/logo.png";
import { APP_CONFIG } from "../config/api";

export function TopBar({
  currentView,
  currentTenant,
  availableTenants,
  onSelectTenant,
  user,
  onOpenLogin,
  onLogout,
  onToggleMobile,
  onNavigate,
}) {
  const [showBellPopover, setShowBellPopover] = useState(false);
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
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-3 sm:px-4 md:px-8 py-2 md:py-3 flex items-center justify-between gap-2 sm:gap-4">
      {/* Left: Mobile Brand Logo & Dynamic Breadcrumb + Title */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 overflow-hidden">
        {/* Mobile Logo Link */}
        <div
          onClick={() => onNavigate && onNavigate("gioi-thieu")}
          className="lg:hidden flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <img
            src={logoImg}
            alt="28AffiHub"
            className="h-7 sm:h-8 w-auto object-contain"
          />
        </div>

        <div className="min-w-0 flex-1">
          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-0.5 truncate">
            <span
              onClick={() => onNavigate && onNavigate("gioi-thieu")}
              className="hover:text-orange-600 cursor-pointer"
            >
              28AffiHub
            </span>
            <span>/</span>
            {currentView === "tenant-admin" && (
              <>
                <span className="text-slate-500 font-bold truncate">{groupName}</span>
                <span>/</span>
              </>
            )}
            <span className="text-orange-600 font-bold">{info.breadcrumb}</span>
          </div>

          <h1 className="text-xs sm:text-sm md:text-base font-black text-slate-900 font-display flex items-center gap-1.5 truncate">
            {currentView === "tenant-admin" ? (
              <>
                <span className="sm:hidden truncate font-black">Trưởng Nhóm</span>
                <span className="hidden sm:inline truncate">
                  Quản Trị: <span className="text-orange-600">{groupName}</span>
                </span>
              </>
            ) : (
              <span className="truncate">{info.title}</span>
            )}
            {currentView === "tenant-admin" && currentTenant && (
              <span className="hidden lg:inline-block text-[10px] px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 border border-orange-200 font-bold font-mono shrink-0">
                /{currentTenant.slug}
              </span>
            )}
          </h1>
        </div>
      </div>

      {/* Right: Group Switcher (only in tenant-admin) + Profile / Login */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Show Group selector ONLY when user is SUPER_ADMIN */}
        {currentView === "tenant-admin" && user?.role === "SUPER_ADMIN" && availableTenants.length > 0 && (
          <div className="flex items-center gap-1 sm:gap-1.5 bg-gradient-to-r from-orange-50/90 to-amber-50/90 hover:from-orange-100/80 hover:to-amber-100/80 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl border border-orange-200/90 shadow-2xs transition shrink-0">
            <i className="fa-solid fa-users-viewfinder text-orange-600 text-[11px] shrink-0"></i>
            <span className="text-[10px] font-black text-orange-800 uppercase tracking-wider hidden md:inline">Nhóm:</span>
            <select
              value={currentTenant?.slug || ""}
              onChange={(e) => {
                const t = availableTenants.find((item) => item.slug === e.target.value);
                if (t) onSelectTenant(t);
              }}
              className="bg-transparent text-orange-950 font-black text-xs outline-none border-0 cursor-pointer font-sans max-w-[95px] sm:max-w-[150px] truncate"
              title="Lọc Kênh Trưởng Nhóm"
            >
              {availableTenants.map((t) => (
                <option key={t.id} value={t.slug} className="text-slate-800 font-medium bg-white">
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Notification Bell Button & Popover */}
        <div className="relative">
          <button
            onClick={() => setShowBellPopover(!showBellPopover)}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-500 hover:text-orange-600 flex items-center justify-center transition cursor-pointer shadow-2xs relative"
            title="Thông báo hệ thống"
          >
            <i className="fa-regular fa-bell text-xs"></i>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
          </button>

          {showBellPopover && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <i className="fa-solid fa-bell text-emerald-600"></i>
                  Thông báo hệ thống
                </span>
                <button onClick={() => setShowBellPopover(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                🟢 <strong>28AffiHub SaaS</strong> đang vận hành ổn định 24/7. Các tính năng tạo link và tự động đối soát Bot Zalo đang hoạt động bình thường!
              </p>
            </div>
          )}
        </div>

        {/* User profile / Login */}
        {user ? (
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* User Avatar + Info Pill */}
            <div className="flex items-center gap-1.5 bg-slate-100/90 pl-1 pr-1.5 sm:pr-2.5 py-0.5 rounded-full border border-slate-200/90 shadow-2xs shrink-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover border border-orange-400 shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-orange-500 text-white text-[11px] font-black flex items-center justify-center shrink-0">
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

            {/* Nút Đăng Xuất Đẹp & Rõ Ràng */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Đăng xuất tài khoản"
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/90 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
              >
                <i className="fa-solid fa-arrow-right-from-bracket text-xs text-rose-500"></i>
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            )}
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
