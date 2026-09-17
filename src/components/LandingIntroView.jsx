import React from "react";
import logoImg from "../assets/logo.png";

export function LandingIntroView({ currentTenant, availableTenants, onSelectTenant, onNavigate }) {
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
            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
              <i className="fa-solid fa-sparkles text-amber-500"></i>
              <span>Nền Tảng Hoàn Tiền Tiếp Thị Liên Kết 4.0</span>
            </div>

            <h1 className="text-2xl md:text-4xl font-black text-slate-900 font-display tracking-tight">
              28AffiHub — Cổng Đối Soát & Quản Trị Hoàn Tiền Tự Động
            </h1>

            <p className="text-xs md:text-sm text-slate-600 leading-relaxed max-w-2xl font-medium">
              Nền tảng hạ tầng SaaS chuyên nghiệp cung cấp hệ thống Zalo Bot và Website Tra Cứu Hoàn Tiền Độc Lập cho từng Trưởng Nhóm Affiliate Shopee & TikTok Shop. Quản trị đơn hàng, đối soát hoa hồng và chi trả tự động 24/7.
            </p>

            <div className="pt-2 flex flex-wrap gap-3 justify-center md:justify-start">
              <button
                onClick={() => onNavigate("tenant-admin")}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black rounded-2xl shadow-md shadow-orange-500/25 transition transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2"
              >
                <i className="fa-solid fa-user-tie"></i> Đăng Nhập Trưởng Nhóm
              </button>

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

      {/* ===================== METRICS COUNTERS ===================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs text-center">
          <div className="text-3xl font-black text-slate-900 font-display">1,500+</div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
            Thành Viên Mua Hàng
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs text-center">
          <div className="text-3xl font-black text-orange-600 font-display">25,000+</div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
            Đơn Hàng Đã Đối Soát
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs text-center">
          <div className="text-3xl font-black text-emerald-600 font-display">99.9%</div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">
            Tỷ Lệ Chi Trả Đúng Hẹn
          </p>
        </div>
      </div>

      {/* ===================== WHY CHOOSE SECTION ===================== */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-lg md:text-xl font-black text-slate-900 font-display">
            Tại Sao Nên Chọn Nền Tảng 28AffiHub?
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Hạ tầng công nghệ tự động hóa tối ưu hóa toàn diện cho cả Người Mua Hàng và Trưởng Nhóm
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-lg font-bold">
              <i className="fa-solid fa-bolt"></i>
            </div>
            <h3 className="font-extrabold text-sm text-slate-900">Tra Cứu Tức Thì 24/7</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Chỉ cần nhập Zalo ID hoặc Mã đơn hàng, hệ thống tự động kiểm tra trạng thái từ Shopee và TikTok Shop trong 1 giây.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg font-bold">
              <i className="fa-solid fa-shield-check"></i>
            </div>
            <h3 className="font-extrabold text-sm text-slate-900">Minh Bạch & Tự Động Trừ Thuế</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Công thức phân chia hoa hồng rõ ràng ({currentTenant?.customerSplitRate || 80}% cho khách), trừ thuế theo quy định, không lo sai sót số liệu.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-lg font-bold">
              <i className="fa-solid fa-building-columns"></i>
            </div>
            <h3 className="font-extrabold text-sm text-slate-900">Rút Tiền Nhanh Qua VietQR</h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Lưu thông tin ngân hàng 1 lần, gửi lệnh rút tiền tự động và nhận tiền chuyển khoản về mọi ngân hàng tại Việt Nam.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
