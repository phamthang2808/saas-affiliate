import logoImg from "../assets/logo.png";

export function Sidebar({
  currentView,
  setCurrentView,
  currentTenant,
  user,
  onOpenLogin,
  onLogout,
  isMobileOpen,
  onCloseMobile,
}) {
  const groupName = currentTenant?.name || "28AffiHub";

  const handleNav = (viewKey) => {
    setCurrentView(viewKey);
    if (onCloseMobile) onCloseMobile();
  };

  const navItemClass = (viewKey) => {
    const isActive = currentView === viewKey;
    return `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-bold transition-all cursor-pointer ${
      isActive
        ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20 font-black"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;
  };

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 w-64 bg-white border-r border-slate-200/80 z-50 flex flex-col justify-between p-4 transition-transform duration-300 ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      <div className="space-y-6 overflow-y-auto">
        {/* ===================== LOGO BRAND CARD ===================== */}
        <div className="relative">
          <div
            onClick={() => handleNav("gioi-thieu")}
            className="p-3 rounded-2xl cursor-pointer text-center space-y-2 border border-orange-100 bg-orange-50/40 hover:bg-orange-50 transition transform hover:scale-[1.01]"
          >
            <div className="flex items-center justify-center">
              <img
                src={logoImg}
                alt="28AffiHub"
                className="h-12 w-auto max-w-[140px] md:max-w-[160px] object-contain drop-shadow-xs transition-all duration-200"
              />
            </div>
            <div>
              <h2 className="text-xs md:text-sm font-black text-slate-900 font-display tracking-tight">
                28AffiHub
              </h2>
              <p className="text-[9px] md:text-[10px] font-black text-orange-600 uppercase tracking-wider">
                Affiliate Cashback SaaS
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden absolute -top-1 -right-1 w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full flex items-center justify-center text-xs cursor-pointer border border-slate-200"
            title="Đóng menu"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* ===================== MENU CHÍNH ===================== */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
            MENU CHÍNH
          </p>

          <button
            onClick={() => handleNav("gioi-thieu")}
            className={navItemClass("gioi-thieu")}
          >
            <i className="fa-solid fa-house text-sm w-4 text-center"></i>
            <span>Trang chủ & Giới thiệu</span>
          </button>

          <button
            onClick={() => handleNav("tra-cuu")}
            className={navItemClass("tra-cuu")}
          >
            <i className="fa-solid fa-magnifying-glass text-sm w-4 text-center"></i>
            <span>Tra cứu & Rút tiền</span>
          </button>

          <button
            onClick={() => handleNav("bao-gia")}
            className={navItemClass("bao-gia")}
          >
            <i className="fa-solid fa-rocket text-sm w-4 text-center"></i>
            <span>Báo giá & Thuê nền tảng</span>
          </button>

          <button
            onClick={() => handleNav("huong-dan")}
            className={navItemClass("huong-dan")}
          >
            <i className="fa-solid fa-book-open-reader text-sm w-4 text-center"></i>
            <span>Hướng dẫn nhận hoa hồng</span>
          </button>
        </div>

        {/* ===================== HỆ THỐNG QUẢN TRỊ ===================== */}
        {(user?.role === "TENANT_ADMIN" || user?.role === "SUPER_ADMIN") && (
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
              HỆ THỐNG QUẢN TRỊ
            </p>

            {/* Trưởng nhóm: Hiển thị cho cả TENANT_ADMIN và SUPER_ADMIN */}
            <button
              onClick={() => handleNav("tenant-admin")}
              className={navItemClass("tenant-admin")}
            >
              <i className="fa-solid fa-user-tie text-sm w-4 text-center"></i>
              <span className="flex-1 text-left">Trưởng Nhóm</span>
            </button>

            {/* Super Admin: CHỈ hiển thị duy nhất khi là SUPER_ADMIN */}
            {user?.role === "SUPER_ADMIN" && (
              <button
                onClick={() => handleNav("super-admin")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-bold transition-all cursor-pointer mt-1 ${
                  currentView === "super-admin"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20 font-black"
                    : "text-amber-800 bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200/60"
                }`}
              >
                <i className="fa-solid fa-crown text-amber-500 text-sm w-4 text-center"></i>
                <span className="flex-1 text-left">Super Admin</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ===================== USER PROFILE BOX ===================== */}
      <div className="pt-4 border-t border-slate-100">
        {user ? (
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2.5">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-9 h-9 rounded-xl object-cover border border-orange-400 shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-orange-500 text-white text-xs font-black flex items-center justify-center shrink-0">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-extrabold text-slate-900 truncate">
                  {user.name || user.email}
                </p>
                <span
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded inline-block uppercase ${
                    user.role === "SUPER_ADMIN"
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : user.role === "TENANT_ADMIN"
                      ? "bg-purple-100 text-purple-800 border border-purple-300"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {user.role === "SUPER_ADMIN"
                    ? "👑 Super Admin"
                    : user.role === "TENANT_ADMIN"
                    ? "👔 Trưởng Nhóm"
                    : "🛍️ Thành Viên"}
                </span>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="w-full py-1.5 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl text-[11px] font-bold border border-slate-200 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <i className="fa-solid fa-arrow-right-from-bracket text-[10px]"></i>
              <span>Đăng xuất</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-2xl text-xs font-bold shadow-xs hover:border-orange-300 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <i className="fa-brands fa-google text-red-500"></i>
            <span>Đăng nhập Google</span>
          </button>
        )}
      </div>
    </aside>
  );
}
