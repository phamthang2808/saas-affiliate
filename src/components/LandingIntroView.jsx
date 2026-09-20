import React from "react";
import logoImg from "../assets/logo.png";

export function LandingIntroView({ currentTenant, availableTenants, onSelectTenant, onNavigate, user }) {
  const groupName = currentTenant?.name || "28AffiHub";
  const primaryColor = currentTenant?.primaryColor || "#f97316";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* ===================== HERO INTRO CARD ===================== */}
      <div
        className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-10 shadow-xs relative overflow-hidden"
        style={{
          boxShadow: "0 10px 30px -5px rgba(0,0,0,0.04)",
        }}
      >
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
          {/* Logo Badge / Mascot */}
          <div
            className="w-28 h-28 md:w-36 md:h-36 rounded-3xl p-3 flex items-center justify-center shadow-lg shrink-0 bg-white"
            style={{
              background: `linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)`,
              border: `2px solid #fed7aa`,
            }}
          >
            <div className="text-center flex flex-col items-center justify-center">
              <img
                src={logoImg}
                alt="28AffiHub"
                className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-md"
              />
              <span className="text-[10px] md:text-[11px] font-black text-orange-600 block mt-1 tracking-wider uppercase">
                28AffiHub
              </span>
            </div>
          </div>

          {/* Text Info */}
          <div className="text-center md:text-left flex-1 space-y-3">
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 font-display tracking-tight">
              28AffiHub — Cổng Đối Soát & Quản Trị Hoàn Tiền Tự Động
            </h1>

            <p className="text-xs md:text-sm text-slate-600 leading-relaxed max-w-2xl font-medium">
              Nền tảng hạ tầng SaaS chuyên nghiệp cung cấp hệ thống Zalo Bot và Website Tra Cứu Hoàn Tiền Độc Lập cho từng Trưởng Nhóm Affiliate Shopee & TikTok Shop. Quản trị đơn hàng, đối soát hoa hồng và chi trả tự động 24/7.
            </p>

            <div className="pt-2 flex flex-wrap gap-3 justify-center md:justify-start">
              <button
                onClick={() => onNavigate("tra-cuu")}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black rounded-2xl shadow-md shadow-orange-500/25 transition transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2"
              >
                <i className="fa-solid fa-magnifying-glass-dollar"></i> Tra Cứu Hoàn Tiền Ngay
              </button>

              {user && (user.role === "TENANT_ADMIN" || user.role === "SUPER_ADMIN") && (
                <button
                  onClick={() => onNavigate("tenant-admin")}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black rounded-2xl shadow-md shadow-purple-500/25 transition transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2"
                >
                  <i className="fa-solid fa-shield-halved"></i> Vào Bảng Quản Trị Trưởng Nhóm
                </button>
              )}

              <button
                onClick={() => onNavigate("bao-gia")}
                className="px-5 py-3 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold rounded-2xl transition cursor-pointer flex items-center gap-2"
              >
                <i className="fa-solid fa-rocket text-orange-500"></i> Báo Giá Thuê Nền Tảng
              </button>

              <button
                onClick={() => onNavigate("huong-dan")}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl transition cursor-pointer flex items-center gap-2"
              >
                <i className="fa-solid fa-book-open-reader text-slate-500"></i> Quy Trình Vận Hành
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== 3 TÍNH NĂNG NỔI BẬT ===================== */}
      <div className="space-y-4 pt-2">
        <div className="text-center space-y-1">
          <h2 className="text-lg md:text-xl font-black text-slate-900 font-display">
            Tại Sao Nên Chọn Nền Tảng 28AffiHub?
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Hạ tầng công nghệ chuyên biệt tối ưu cho hệ sinh thái Affiliate Marketing tự động
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-md transition group">
            <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center text-xl mb-3.5 group-hover:scale-110 transition">
              <i className="fa-solid fa-robot"></i>
            </div>
            <h3 className="text-sm font-black text-slate-900 mb-1.5 font-display">
              Bot Zalo Tự Động 24/7
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Mỗi Trưởng Nhóm sở hữu Bot Zalo riêng biệt, tự động chuyển đổi link Shopee & TikTok, tra cứu mã đơn và tương tác tự động.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-md transition group">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center text-xl mb-3.5 group-hover:scale-110 transition">
              <i className="fa-solid fa-bolt"></i>
            </div>
            <h3 className="text-sm font-black text-slate-900 mb-1.5 font-display">
              Đối Soát & Rút Tự Động
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Tự động tính hoa hồng thực nhận sau thuế, cấu hình thời gian giữ tiền linh hoạt (0-14 ngày) và hỗ trợ rút tiền nhanh chóng.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-md transition group">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center text-xl mb-3.5 group-hover:scale-110 transition">
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <h3 className="text-sm font-black text-slate-900 mb-1.5 font-display">
              Hạ Tầng Multi-Tenant Độc Lập
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Dữ liệu từng Trưởng Nhóm được cô lập an toàn, thương hiệu và giao diện tra cứu riêng biệt, tích hợp xác thực Google OAuth 2.0.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
