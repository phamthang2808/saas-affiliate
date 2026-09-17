import React from "react";

export function NavigationHeader({ currentView, setCurrentView, availableTenants, currentTenant, onSelectTenant, user, onOpenLogin, onLogout }) {
  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand Title with 28AffiHub Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView("super-admin")}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white text-base font-black shadow-md shadow-orange-500/25 border border-orange-300/40">
            <span>28</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg font-black tracking-tight text-slate-900 font-display">
                <span className="text-orange-600">28</span>Affi<span className="text-orange-500">Hub</span>
              </h2>
              <span className="bg-orange-100 text-orange-700 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider border border-orange-200">
                SaaS
              </span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 -mt-0.5">
              Nền Tảng Đối Soát & Hoàn Tiền Affiliate Tập Trung
            </p>
          </div>
        </div>

        {/* View Switcher Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setCurrentView("super-admin")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              currentView === "super-admin"
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <i className="fa-solid fa-crown text-amber-200"></i> Super Admin
          </button>

          <button
            onClick={() => setCurrentView("tenant-admin")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              currentView === "tenant-admin"
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <i className="fa-solid fa-building-user"></i> Tenant Admin
          </button>

          <button
            onClick={() => setCurrentView("public-lookup")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              currentView === "public-lookup"
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <i className="fa-solid fa-magnifying-glass"></i> Tra Cứu Khách
          </button>
        </div>

        {/* Right side: Tenant Switcher + Google Auth */}
        <div className="flex items-center gap-2.5">
          {availableTenants.length > 0 && (
            <div className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <select
                value={currentTenant?.slug || ""}
                onChange={(e) => {
                  const t = availableTenants.find((item) => item.slug === e.target.value);
                  if (t) onSelectTenant(t);
                }}
                className="bg-slate-100 text-orange-600 font-extrabold text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 outline-none cursor-pointer font-mono hover:border-orange-400 transition"
              >
                {availableTenants.map((t) => (
                  <option key={t.id} value={t.slug}>
                    {t.name} (/{t.slug})
                  </option>
                ))}
              </select>
            </div>
          )}

          {user ? (
            <div className="flex items-center gap-2 bg-slate-100/90 pl-1.5 pr-2.5 py-1 rounded-2xl border border-slate-200">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-full object-cover border border-orange-400" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
              )}
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-bold text-slate-800 truncate max-w-[100px] sm:max-w-[130px]">
                  {user.name || user.email}
                </span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md inline-block w-fit ${
                  user.role === "SUPER_ADMIN" ? "bg-amber-100 text-amber-700" :
                  user.role === "TENANT_ADMIN" ? "bg-blue-100 text-blue-700" :
                  "bg-slate-200 text-slate-600"
                }`}>
                  {user.role === "SUPER_ADMIN" ? "👑 Super Admin" :
                   user.role === "TENANT_ADMIN" ? "🏢 Admin Kênh" : "👤 Khách hàng"}
                </span>
              </div>
              <button
                onClick={onLogout}
                title="Đăng xuất"
                className="text-slate-400 hover:text-rose-600 p-1 hover:bg-white rounded-lg transition ml-1 cursor-pointer"
              >
                <i className="fa-solid fa-arrow-right-from-bracket text-xs"></i>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-3.5 py-1.5 rounded-xl border border-slate-300 shadow-xs flex items-center gap-1.5 transition cursor-pointer hover:border-orange-400"
            >
              <i className="fa-brands fa-google text-red-500"></i> Đăng nhập
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
