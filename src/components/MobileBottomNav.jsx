import React from "react";

export function MobileBottomNav({ currentView, setCurrentView, user, onOpenLogin }) {
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isTenantAdmin = user?.role === "TENANT_ADMIN" || isSuperAdmin;

  const navItems = [
    {
      key: "gioi-thieu",
      label: "Trang chủ",
      icon: "fa-solid fa-house",
    },
    {
      key: "tra-cuu",
      label: "Tra cứu ví",
      icon: "fa-solid fa-magnifying-glass-dollar",
    },
    {
      key: "bao-gia",
      label: "Báo giá",
      icon: "fa-solid fa-rocket",
    },
    ...(isTenantAdmin
      ? [
          {
            key: "tenant-admin",
            label: "Trưởng nhóm",
            icon: "fa-solid fa-user-tie",
          },
        ]
      : []),
    ...(isSuperAdmin
      ? [
          {
            key: "super-admin",
            label: "Quản trị",
            icon: "fa-solid fa-shield-halved",
          },
        ]
      : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/90 lg:hidden shadow-[0_-2px_12px_rgba(0,0,0,0.06)] px-1 pb-[max(4px,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = currentView === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setCurrentView(item.key)}
              className="relative flex-1 flex flex-col items-center justify-center pt-2 pb-1.5 px-1 cursor-pointer transition-colors"
            >
              {/* Active Orange Top Indicator Dash */}
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-orange-500 rounded-b-full"></div>
              )}

              {/* Icon Container */}
              <div
                className={`w-7 h-7 flex items-center justify-center transition-all ${
                  isActive ? "text-orange-500" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <i className={`${item.icon} text-lg`}></i>
              </div>

              {/* Label */}
              <span
                className={`text-[11px] tracking-tight mt-0.5 leading-tight ${
                  isActive ? "font-black text-orange-600" : "font-semibold text-slate-500"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
