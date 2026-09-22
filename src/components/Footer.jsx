import React from "react";
import logoImg from "../assets/logo.png";

export function Footer({ currentTenant, onNavigate, user }) {
  const groupName = currentTenant?.name || "28AffiHub";
  const zaloSupport = currentTenant?.contactZalo || "0888.728.256";

  return (
    <footer className="border-t border-slate-200/80 bg-white text-slate-600 mt-auto">
      {/* Upper Footer Links */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand & Bio */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2.5">
              <img
                src={logoImg}
                alt={groupName}
                className="h-9 w-auto max-w-[130px] object-contain"
              />
              <span className="font-display font-black text-lg text-slate-900 tracking-tight">
                28Affi<span className="text-orange-500">Hub</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Nền tảng công nghệ cho thuê Bot Zalo Affiliate Shopee & TikTok Shop, tạo Website tra cứu đơn hàng, đối soát hoa hồng và chi trả hoàn tiền tự động 24/7 cho Trưởng Nhóm và cộng đồng.
            </p>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Hệ thống Hoạt động 24/7 (99.9% Uptime)</span>
            </div>
          </div>

          {/* Col 2: Hệ Sinh Thái Nền Tảng */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider font-display">
              Hệ Sinh Thái Nền Tảng
            </h4>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <button
                  onClick={() => onNavigate && onNavigate("gioi-thieu")}
                  className="text-slate-500 hover:text-orange-600 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-angle-right text-[10px] text-slate-400"></i>
                  <span>Trang chủ & Tổng quan</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate && onNavigate("huong-dan")}
                  className="text-slate-500 hover:text-orange-600 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-angle-right text-[10px] text-slate-400"></i>
                  <span>Tính năng & Quy trình vận hành</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate && onNavigate("bao-gia")}
                  className="text-slate-500 hover:text-orange-600 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-angle-right text-[10px] text-slate-400"></i>
                  <span>Gói thuê Web & Bot Zalo</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Dành cho Trưởng Nhóm */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider font-display">
              Dành Cho Trưởng Nhóm
            </h4>
            <ul className="space-y-2 text-xs font-medium">
              <li>
                <button
                  onClick={() => onNavigate && onNavigate("bao-gia")}
                  className="text-slate-500 hover:text-orange-600 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-angle-right text-[10px] text-slate-400"></i>
                  <span>Báo giá thuê nền tảng SaaS</span>
                </button>
              </li>
              {(user?.role === "TENANT_ADMIN" || user?.role === "SUPER_ADMIN") && (
                <li>
                  <button
                    onClick={() => onNavigate && onNavigate("tenant-admin")}
                    className="text-slate-500 hover:text-orange-600 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <i className="fa-solid fa-angle-right text-[10px] text-slate-400"></i>
                    <span>Khu vực Quản trị Trưởng Nhóm</span>
                  </button>
                </li>
              )}
              <li>
                <a
                  href={`https://zalo.me/${zaloSupport.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-500 hover:text-orange-600 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-angle-right text-[10px] text-slate-400"></i>
                  <span>Liên hệ hỗ trợ kỹ thuật Zalo</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Liên hệ & Hỗ trợ */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider font-display">
              Hỗ Trợ & Bảo Mật
            </h4>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-slate-700 font-bold">
                <i className="fa-solid fa-shield-halved text-orange-500"></i>
                <span>Phân Lập Dữ Liệu 100%</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Mỗi Trưởng Nhóm sở hữu không gian dữ liệu độc lập, bảo mật số dư và danh sách đơn hàng tuyệt đối.
              </p>
            </div>
            <p className="text-[11px] text-slate-500">
              Hotline / Zalo hỗ trợ: <strong className="text-slate-800">{zaloSupport}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Sub-footer */}
      <div className="border-t border-slate-100 bg-slate-50/70 py-4 px-4 sm:px-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px]">
            Bản quyền © 2026 <strong className="text-slate-700">28AffiHub SaaS Platform</strong>. Toàn quyền bảo lưu.
          </p>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Tiếp thị liên kết minh bạch</span>
            <span>•</span>
            <span>Shopee & TikTok Shop</span>
            <span>•</span>
            <span>Tự động hóa 24/7</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
