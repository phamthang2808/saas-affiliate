import React from "react";

export function AccessDeniedView({
  type = "forbidden", // 'login_required' | 'forbidden'
  title = "Không Có Quyền Truy Cập",
  requiredRole = "ADMIN",
  user = null,
  onOpenLogin,
  onNavigateHome,
  onLogout,
}) {
  const isLoginRequired = type === "login_required" || !user;

  const roleLabel = (role) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "👑 Super Admin (Chủ Sàn)";
      case "TENANT_ADMIN":
        return "👔 Trưởng Nhóm (Đối Tác)";
      case "BUYER":
        return "🛍️ Thành Viên Săn Sale";
      default:
        return role || "Chưa xác định";
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 sm:p-12 max-w-md w-full shadow-xl border border-slate-100 text-center relative overflow-hidden">
        {/* Glow ambient background */}
        <div
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl pointer-events-none ${
            isLoginRequired ? "bg-amber-500/15" : "bg-rose-500/15"
          }`}
        ></div>

        {/* Icon */}
        <div className="relative z-10 mb-5">
          <div
            className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-3xl shadow-lg ${
              isLoginRequired
                ? "bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-amber-500/20"
                : "bg-gradient-to-tr from-rose-500 to-red-600 text-white shadow-rose-500/20"
            }`}
          >
            <i
              className={
                isLoginRequired
                  ? "fa-solid fa-lock"
                  : "fa-solid fa-shield-halved"
              }
            ></i>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display mb-2 relative z-10">
          {isLoginRequired ? "Yêu Cầu Đăng Nhập" : "Truy Cập Bị Giới Hạn"}
        </h2>

        {/* Subtitle / Description */}
        <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed mb-6 relative z-10">
          {isLoginRequired ? (
            <>
              Khu vực quản trị dành riêng cho cán bộ quản lý. Vui lòng đăng nhập
              bằng tài khoản Google có thẩm quyền để tiếp tục.
            </>
          ) : (
            <>
              Tài khoản{" "}
              <strong className="text-slate-800 font-bold">{user?.email}</strong>{" "}
              hiện có vai trò là{" "}
              <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-700 text-xs">
                {roleLabel(user?.role)}
              </span>
              . Bạn không có quyền truy cập khu vực yêu cầu quyền{" "}
              <span className="font-bold text-rose-600">{requiredRole}</span>.
            </>
          )}
        </p>

        {/* User profile card if logged in but unauthorized */}
        {!isLoginRequired && user && (
          <div className="mb-6 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3 text-left relative z-10">
            <img
              src={
                user.avatarUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  user.name || "User"
                )}&background=f97316&color=fff`
              }
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover border border-white shadow-xs"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">
                {user.name || "Người dùng"}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            </div>
            <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 shrink-0">
              Chưa cấp quyền
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5 relative z-10">
          {isLoginRequired ? (
            <button
              onClick={onOpenLogin}
              className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black shadow-md shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <i className="fa-brands fa-google"></i>
              <span>Đăng Nhập Tài Khoản Google</span>
            </button>
          ) : (
            <button
              onClick={onLogout}
              className="w-full py-3 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md shadow-slate-900/10 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-arrow-right-from-bracket"></i>
              <span>Đăng Xuất & Đổi Tài Khoản Khác</span>
            </button>
          )}

          <button
            onClick={onNavigateHome}
            className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            Quay Về Trang Chủ
          </button>
        </div>

        {/* Footer help note */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400 font-medium relative z-10">
          <i className="fa-solid fa-circle-info mr-1 text-slate-300"></i>
          Cần cấp quyền? Hãy liên hệ Quản trị viên hệ thống qua Zalo.
        </div>
      </div>
    </div>
  );
}
