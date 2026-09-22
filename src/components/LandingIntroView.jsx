import React, { useState } from "react";
import logoImg from "../assets/logo.png";

export function LandingIntroView({ currentTenant, availableTenants, onSelectTenant, onNavigate, user }) {
  const groupName = currentTenant?.name || "28AffiHub";
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const faqs = [
    {
      q: "Dịch vụ cho thuê Bot Zalo Affiliate hoạt động như thế nào?",
      a: "Hệ thống cấp riêng cho bạn một Bot Zalo tự động 24/7. Khi thành viên trong nhóm Zalo của bạn gửi link sản phẩm Shopee hoặc TikTok Shop, Bot sẽ lập tức chuyển đổi sang link tiếp thị liên kết (Affiliate) có gắn SubID định danh của thành viên đó. Mọi đơn hàng phát sinh sẽ được ghi nhận và tự động đối soát vào ví của thành viên."
    },
    {
      q: "Trưởng nhóm có được sở hữu Website Tra Cứu Hoàn Tiền mang thương hiệu riêng không?",
      a: "Có! Bạn sẽ có ngay một Website tra cứu đơn hàng và quản lý ví hoàn tiền độc lập (dạng domain riêng như hoantien47.store hoặc đường dẫn con 28affihub.com/kenh-cua-ban). Giao diện hiển thị thương hiệu, logo, tỷ lệ chia hoa hồng và quy định rút tiền hoàn toàn do bạn tùy chỉnh."
    },
    {
      q: "Hệ thống quản lý đơn hàng và đối soát hoa hồng hỗ trợ những sàn nào?",
      a: "28AffiHub hỗ trợ đầy đủ 2 sàn thương mại điện tử lớn nhất hiện nay là Shopee Affiliate và TikTok Shop (kết nối trực tiếp qua RioHub API hoặc nhập file đối soát Excel). Hệ thống tự động phân loại trạng thái: Đang chờ xử lý, Đã hoàn thành, Đã hủy và phân bổ chính xác theo từng SubID thành viên."
    },
    {
      q: "Cơ chế tính thuế TNCN, tỷ lệ chia hoa hồng và thời gian giữ tiền (holding days) ra sao?",
      a: "Trưởng nhóm có toàn quyền cấu hình: Tỷ lệ trừ thuế TNCN (VD: 10%), Tỷ lệ hoa hồng chia cho khách (VD: 80% khách - 20% Trưởng nhóm), và Số ngày giữ tiền đối soát sau khi đơn hoàn thành (mặc định 3 ngày Shopee để chống hoàn trả hàng, TikTok rút ngay). Hệ thống tự động tính toán chính xác 100%."
    },
    {
      q: "Bảo mật rút tiền trên Website và Bot Zalo như thế nào?",
      a: "Thành viên rút tiền được bảo vệ bằng Mã PIN bảo mật 6 số cá nhân kết hợp xác thực OTP gửi trực tiếp qua tin nhắn Zalo 1 chạm. Trưởng nhóm dễ dàng duyệt lệnh rút tiền trên Bảng quản trị Web hoặc duyệt tức thì qua câu lệnh Bot Zalo /duyet_[MÃ_GIAO_DỊCH]."
    }
  ];

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-16">
      {/* ===================== HERO SECTION ===================== */}
      <section
        className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-10 shadow-xs relative overflow-hidden"
        style={{ boxShadow: "0 10px 30px -5px rgba(0,0,0,0.04)" }}
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
                alt="28AffiHub - Cho Thuê Bot Zalo Affiliate & Website Hoàn Tiền"
                className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-md"
              />
              <span className="text-[10px] md:text-[11px] font-black text-orange-600 block mt-1 tracking-wider uppercase">
                28AffiHub
              </span>
            </div>
          </div>

          {/* Text Info */}
          <div className="text-center md:text-left flex-1 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100/80 border border-orange-200 text-orange-800 text-[11px] font-black uppercase tracking-wider">
              <i className="fa-solid fa-bolt text-orange-600"></i> Nền Tảng SaaS Affiliate Marketing Đa Kênh Tự Động
            </div>

            <h1 className="text-2xl md:text-4xl font-black text-slate-900 font-display tracking-tight leading-tight">
              Cho Thuê Bot Zalo Affiliate & Hệ Thống Website Tra Cứu Hoàn Tiền Tự Động
            </h1>

            <p className="text-xs md:text-sm text-slate-600 leading-relaxed max-w-2xl font-medium">
              Giải pháp công nghệ chuyên nghiệp dành cho KOC, KOL, Group Admin & Trưởng Nhóm Affiliate Shopee & TikTok Shop. Tự động hóa chuyển đổi link tiếp thị, phân tách SubID thành viên, đối soát đơn hàng, tính hoa hồng sau thuế và quản lý ví rút tiền 24/7.
            </p>

            <div className="pt-2 flex flex-wrap gap-3 justify-center md:justify-start">
              <button
                id="btn-hero-lookup"
                onClick={() => onNavigate("tra-cuu")}
                className="px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black rounded-2xl shadow-md shadow-orange-500/25 transition transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2"
              >
                <i className="fa-solid fa-magnifying-glass-dollar"></i> Tra Cứu Đơn & Ví Tiền
              </button>

              <button
                id="btn-hero-pricing"
                onClick={() => onNavigate("bao-gia")}
                className="px-5 py-3.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold rounded-2xl transition cursor-pointer flex items-center gap-2"
              >
                <i className="fa-solid fa-rocket text-orange-500"></i> Báo Giá Thuê Bot Zalo & Web
              </button>

              {user && (user.role === "TENANT_ADMIN" || user.role === "SUPER_ADMIN") ? (
                <button
                  id="btn-hero-admin"
                  onClick={() => onNavigate("tenant-admin")}
                  className="px-5 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black rounded-2xl shadow-md shadow-purple-500/25 transition cursor-pointer flex items-center gap-2"
                >
                  <i className="fa-solid fa-shield-halved"></i> Quản Trị Trưởng Nhóm
                </button>
              ) : (
                <button
                  id="btn-hero-guide"
                  onClick={() => onNavigate("huong-dan")}
                  className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl transition cursor-pointer flex items-center gap-2"
                >
                  <i className="fa-solid fa-book-open-reader text-slate-500"></i> Hướng Dẫn Vận Hành
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== 4 TRỤ CỘT NỀN TẢNG ===================== */}
      <section className="space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 font-display">
            Hạ Tầng Công Nghệ Toàn Diện Cho Trưởng Nhóm Affiliate
          </h2>
          <p className="text-xs md:text-sm text-slate-500 font-medium">
            Tự động hóa 100% quy trình từ khâu gửi link, ghi nhận đơn hàng đến đối soát hoa hồng và chi trả
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Trụ cột 1 */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-xl font-bold">
              <i className="fa-solid fa-robot"></i>
            </div>
            <h3 className="text-base font-black text-slate-900 font-display">
              1. Cho Thuê Bot Zalo Affiliate Shopee & TikTok Shop
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Bot Zalo trực 24/7 trong nhóm Zalo của bạn. Khi thành viên gửi link mua sắm, Bot tự động chuyển đổi thành link tiếp thị liên kết gắn SubID riêng biệt, hướng dẫn khách mẹo mua hàng không mất cookie, và phản hồi tức thì với các câu lệnh <code className="text-orange-600 bg-orange-50 px-1 py-0.5 rounded">/vitien</code>, <code className="text-orange-600 bg-orange-50 px-1 py-0.5 rounded">/donhang</code>, <code className="text-orange-600 bg-orange-50 px-1 py-0.5 rounded">/tracuu</code>, <code className="text-orange-600 bg-orange-50 px-1 py-0.5 rounded">/ruttien</code>.
            </p>
          </div>

          {/* Trụ cột 2 */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl font-bold">
              <i className="fa-solid fa-globe"></i>
            </div>
            <h3 className="text-base font-black text-slate-900 font-display">
              2. Website Tra Cứu Hoàn Tiền & Rút Tiền Độc Lập
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Cổng tra cứu mang tên thương hiệu riêng của Trưởng Nhóm. Thành viên chỉ cần bấm vào link cá nhân hóa 1 chạm là xem ngay 4 thẻ thống kê ví tiền: Đang chờ xử lý, Đã hoàn thành, Số dư khả dụng và Tiền đã rút. Hỗ trợ rút tiền an toàn với mã PIN 6 số và OTP Zalo tự động.
            </p>
          </div>

          {/* Trụ cột 3 */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold">
              <i className="fa-solid fa-boxes-stacked"></i>
            </div>
            <h3 className="text-base font-black text-slate-900 font-display">
              3. Quản Lý Đơn Hàng & Đối Soát Hoa Hồng Thông Minh
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Tích hợp trực tiếp API TikTok Shop (RioHub) và Shopee Affiliate. Đơn hàng phát sinh được tự động map với SubID thành viên, phân tách trạng thái Đang vận chuyển, Hoàn thành, Đã hủy. Tự động trừ thuế TNCN 10% và tính toán hoa hồng thực nhận của khách theo đúng tỷ lệ chia sẻ.
            </p>
          </div>

          {/* Trụ cột 4 */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs hover:shadow-md transition space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-xl font-bold">
              <i className="fa-solid fa-sliders"></i>
            </div>
            <h3 className="text-base font-black text-slate-900 font-display">
              4. Cấu Hình Tỷ Lệ Chia & Thời Gian Giữ Tiền (Holding Days)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Tùy biến 100% chính sách kênh của bạn: Tỷ lệ chia khách (VD: 80% cho khách - 20% Trưởng nhóm giữ lại), Số ngày giữ tiền sau hoàn thành (Holding Days: 0 ngày, 3 ngày hoặc 7 ngày đối soát Shopee chống trả hàng), Hạn mức rút tối thiểu và Tùy chỉnh toàn bộ 15 mẫu tin nhắn Bot Zalo.
            </p>
          </div>
        </div>
      </section>

      {/* ===================== SO SÁNH VẬN HÀNH ===================== */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-xs space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 font-display">
            So Sánh: Quản Lý Thủ Công vs Nền Tảng 28AffiHub
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Tại sao các Trưởng nhóm Affiliate hàng đầu đều chuyển sang tự động hóa hoàn toàn với 28AffiHub?
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700">
                <th className="p-3.5 font-black uppercase text-[11px]">Tiêu chí so sánh</th>
                <th className="p-3.5 font-black uppercase text-[11px] text-rose-600">Cách làm thủ công (Excel / Nhóm Zalo)</th>
                <th className="p-3.5 font-black uppercase text-[11px] text-emerald-600">Hạ tầng tự động 28AffiHub</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              <tr>
                <td className="p-3.5 font-bold text-slate-900">Tạo link hoàn tiền cho khách</td>
                <td className="p-3.5 text-rose-600">Phải trực máy tính, copy-paste link thủ công rất mất thời gian</td>
                <td className="p-3.5 text-emerald-700 font-bold">Bot Zalo tự động tạo link trong 1 giây 24/7</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold text-slate-900">Ghi nhận và gắn SubID đơn hàng</td>
                <td className="p-3.5 text-rose-600">Dễ nhầm lẫn, mất đơn, không biết đơn hàng của thành viên nào</td>
                <td className="p-3.5 text-emerald-700 font-bold">Tự động sinh SubID độc nhất cho từng Zalo ID cá nhân</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold text-slate-900">Tra cứu đơn hàng & Số dư ví</td>
                <td className="p-3.5 text-rose-600">Khách liên tục hỏi inbox gây quá tải, phải tra file Excel tay</td>
                <td className="p-3.5 text-emerald-700 font-bold">Gõ /vitien trên Zalo hoặc xem Cổng Web 1 chạm tự động</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold text-slate-900">Tính thuế TNCN & Chia hoa hồng</td>
                <td className="p-3.5 text-rose-600">Tự bấm máy tính trừ 10% thuế, dễ sai sót gây tranh cãi</td>
                <td className="p-3.5 text-emerald-700 font-bold">Hệ thống tự động tính thuế và chia hoa hồng chuẩn 100%</td>
              </tr>
              <tr>
                <td className="p-3.5 font-bold text-slate-900">Bảo mật chi trả & Rút tiền</td>
                <td className="p-3.5 text-rose-600">Dễ bị giả mạo tên Zalo để lừa chuyển khoản rút trộm tiền</td>
                <td className="p-3.5 text-emerald-700 font-bold">Xác thực mã PIN 6 số và OTP Zalo chống gian lận tuyệt đối</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ===================== FAQ SECTION ===================== */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-xs space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-[10px] font-black uppercase tracking-wider">
            <i className="fa-solid fa-circle-question"></i> Giải Đáp Thắc Mắc
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 font-display">
            Câu Hỏi Thường Gặp Về Thuê Bot Zalo & Web Affiliate
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Tất cả những gì bạn cần biết trước khi bắt đầu triển khai hệ thống hoàn tiền riêng
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((item, idx) => (
            <div
              key={idx}
              className="border border-slate-200 rounded-2xl p-4 transition bg-slate-50/50 hover:bg-slate-50"
            >
              <button
                type="button"
                onClick={() => toggleFaq(idx)}
                className="w-full flex items-center justify-between text-left gap-3 text-xs md:text-sm font-black text-slate-900 cursor-pointer"
              >
                <span>{item.q}</span>
                <i className={`fa-solid fa-chevron-down text-slate-400 text-xs transition-transform ${openFaq === idx ? "rotate-180 text-orange-600" : ""}`}></i>
              </button>
              {openFaq === idx && (
                <p className="mt-3 text-xs text-slate-600 leading-relaxed font-medium pt-2 border-t border-slate-200/70">
                  {item.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ===================== CALL TO ACTION ===================== */}
      <section className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-3xl p-8 md:p-10 text-white text-center space-y-4 shadow-xl shadow-orange-500/20">
        <h2 className="text-2xl md:text-3xl font-black font-display">
          Sẵn Sàng Xây Dựng Đế Chế Hoàn Tiền Affiliate Tự Động Của Bạn?
        </h2>
        <p className="text-xs md:text-sm text-orange-100 max-w-xl mx-auto font-medium">
          Liên hệ ngay hôm nay để nhận tư vấn cài đặt Bot Zalo và kích hoạt Website Tra Cứu Hoàn Tiền mang tên riêng của bạn chỉ trong 15 phút.
        </p>
        <div className="pt-2 flex flex-wrap gap-3 justify-center">
          <a
            href="https://zalo.me/0888728256"
            target="_blank"
            rel="noreferrer"
            className="px-6 py-3.5 bg-white text-orange-600 hover:bg-orange-50 font-black text-xs rounded-2xl shadow-lg transition transform hover:-translate-y-0.5 flex items-center gap-2"
          >
            <i className="fa-solid fa-phone"></i> Liên Hệ Thuê Nền Tảng Zalo: 0888.728.256
          </a>
          <button
            onClick={() => onNavigate("bao-gia")}
            className="px-6 py-3.5 bg-orange-700/60 hover:bg-orange-700 text-white font-black text-xs rounded-2xl border border-white/20 transition flex items-center gap-2"
          >
            <i className="fa-solid fa-file-invoice-dollar"></i> Xem Chi Tiết Các Gói Dịch Vụ
          </button>
        </div>
      </section>
    </div>
  );
}
