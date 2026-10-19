import React, { useState } from "react";

export function PricingContactView() {
  const [formData, setFormData] = useState({
    name: "",
    zalo: "",
    package: "299k",
    note: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSelectPackage = (pkgId) => {
    setFormData((prev) => ({ ...prev, package: pkgId }));
    const formElement = document.getElementById("tu-van-form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.zalo) {
      notify("Vui lòng điền Họ tên và Số Zalo liên hệ!", "error");
      return;
    }
    setSubmitted(true);
  };

  const PACKAGES = [
    {
      id: "199k",
      name: "Zalo Bot Auto Link",
      tag: "GÓI CHUYỂN ĐỔI 24/7",
      price: "199.000đ",
      period: "/ tháng",
      desc: "Tự động chuyển đổi link tiếp thị liên kết Shopee & TikTok Shop 24/7 trực tiếp trong nhóm Zalo",
      featured: false,
      isVip: false,
      badge: null,
      features: [
        "Tự động đổi link mua sắm Shopee & TikTok Shop sang link nhận 100% hoa hồng về tài khoản của bạn.",
        "Hoạt động tự động 24/7 trong nhóm Zalo, phản hồi tức thì 1-2 giây không cần trực máy.",
        "Tự nhận biết thành viên gửi link trong nhóm để bạn dễ dàng theo dõi hoạt động mua sắm.",
        "Tin nhắn tối ưu mua hàng: Tự động tag tên người gửi, định dạng link ngắn gọn, kích thích bấm mua.",
        "Vận hành siêu nhẹ nhàng: Không tốn thời gian quản lý đối soát ví, tập trung tối đa đẩy số."
      ],
      ctaText: "Đăng Ký Gói 199k",
      ctaClass: "bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border border-slate-200/80",
    },
    {
      id: "299k",
      name: "SaaS Zalo Bot Affiliate",
      tag: "GÓI SAAS PHỔ BIẾN NHẤT",
      price: "299.000đ",
      period: "/ tháng",
      desc: "Bot Zalo + Nền tảng SaaS: Cổng tra cứu ví hoa hồng cho khách & Dashboard quản trị Kênh riêng",
      featured: true,
      isVip: false,
      badge: "Phổ biến nhất",
      features: [
        "Bao gồm toàn bộ tính năng chuyển đổi link 24/7 của gói Auto Link.",
        "Cấp Cổng Tra Cứu Khách Hàng chuyên nghiệp trên nền tảng SaaS (28affihub.store/ten-kenh).",
        "Đầy đủ 16 lệnh Bot Zalo thông minh: Khách tự tra cứu ví (/vitien), đơn (/donhang), rút tiền (/ruttien).",
        "Dashboard Quản Trị Trưởng Nhóm: Đăng nhập đối soát đơn, quản lý thành viên & duyệt thanh toán 1-click.",
        "Tùy biến chính sách kênh: Tự cài đặt tỷ lệ chia hoa hồng (80/20, 70/30), trừ thuế TNCN & ngày giữ tiền.",
        "Duyệt rút tiền tức thì qua Zalo: Trưởng nhóm duyệt chi trả siêu tốc bằng lệnh /duyet_[MÃ_ID]."
      ],
      ctaText: "Đăng Ký Gói 299k (Ưu Đãi)",
      ctaClass: "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black shadow-md shadow-orange-500/25",
    },
    {
      id: "399k",
      name: "Web Brand Độc Lập",
      tag: "TÊN MIỀN RIÊNG BIỆT",
      price: "399.000đ",
      period: "/ tháng",
      desc: "Sở hữu Website Affiliate hoàn tiền độc lập, chạy trên Tên Miền Riêng biệt (Mô hình Website Mai Lan)",
      featured: false,
      isVip: false,
      badge: null,
      features: [
        "Website Riêng Biệt & Tên Miền Riêng: Cài đặt Web chạy trên domain thương hiệu của bạn (hoantiencuaban.com).",
        "Nhận diện thương hiệu độc quyền 100%: Tùy biến toàn bộ Logo, màu sắc giao diện & banner mang bản sắc riêng.",
        "Hệ thống Web Tra Cứu & Tích Lũy Ví chuyên sâu: Trải nghiệm hoàn hảo trên cả Mobile App Web và Desktop.",
        "Bảng Quản Trị Admin Web Độc Lập: Phân loại sản phẩm, quản lý đơn Shopee/TikTok & xử lý thanh toán.",
        "Hạ tầng & Cơ sở dữ liệu riêng biệt: Vận hành ổn định, tải trang siêu tốc, bảo mật tuyệt đối không lo nghẽn mạng.",
        "Hỗ trợ trỏ tên miền & cài đặt chứng chỉ bảo mật SSL (HTTPS) miễn phí trọn đời."
      ],
      ctaText: "Đăng Ký Gói 399k",
      ctaClass: "bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border border-slate-200/80",
    },
    {
      id: "499k",
      name: "Omnichannel All-in-One",
      tag: "HỆ SINH THÁI CAO CẤP",
      price: "499.000đ",
      period: "/ tháng",
      desc: "Giải pháp tối cao: Chuyển đổi link trực tiếp ngay trên Web & Bot Zalo 24/7, kết hợp tên miền riêng & liên kết Google (Mô hình Trần Huyền)",
      featured: false,
      isVip: true,
      badge: "VIP Toàn Diện",
      features: [
        "Chuyển đổi link Đa Nền Tảng (Web & Zalo): Hỗ trợ khách tự dán link chuyển đổi nhận hoàn tiền ngay trên Website và tự động chuyển đổi trong nhóm Zalo 24/7.",
        "Website Tên Miền Riêng Độc Quyền: Cài đặt Web chạy trên domain thương hiệu của bạn, giao diện chuẩn SEO và tương thích 100% di động.",
        "Liên kết Tài khoản Song Song: Thành viên Đăng nhập Google 1 chạm trên Web & Liên kết tài khoản Zalo ID mượt mà.",
        "Đồng bộ hóa Ví & Đơn hàng 2 chiều: Khách tra cứu trên Web hay gõ lệnh Zalo (/vitien, /donhang) đều nhận cùng số dư chuẩn 100%.",
        "Thông Báo Biến Động Số Dư Tự Động: Bot tự động gửi tin nhắn riêng cho khách khi đơn hoàn thành hoặc có lệnh duyệt thanh toán.",
        "Hỗ Trợ Kỹ Thuật VIP 1-1 Riêng Biệt: Ưu tiên cập nhật tính năng mới nhất, setup trọn gói A-Z & hỗ trợ kỹ thuật trực tiếp 24/7."
      ],
      ctaText: "Đăng Ký Gói VIP 499k",
      ctaClass: "bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-black shadow-md shadow-amber-500/25",
    }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 relative">
      {/* Toast Banner */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs font-black transition-all animate-fade-in ${
          toast.type === "success"
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : toast.type === "warning"
            ? "bg-amber-50 text-amber-800 border-amber-200"
            : "bg-rose-50 text-rose-800 border-rose-200"
        }`}>
          <i className={
            toast.type === "success"
              ? "fa-solid fa-circle-check text-emerald-600 text-sm"
              : toast.type === "warning"
              ? "fa-solid fa-triangle-exclamation text-amber-600 text-sm"
              : "fa-solid fa-circle-exclamation text-rose-600 text-sm"
          }></i>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-10 shadow-xs text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
          <i className="fa-solid fa-crown text-amber-500"></i> Bảng Giá & Nền Tảng Hợp Tác Trưởng Nhóm
        </div>
        <h1 className="text-2xl md:text-4xl font-black text-slate-900 font-display">
          Bảng Giá Dịch Vụ Cho Thuê Bot Zalo Affiliate & Hệ Thống Website Hoàn Tiền
        </h1>
        <p className="text-xs md:text-sm text-slate-500 max-w-3xl mx-auto font-medium leading-relaxed">
          Giải pháp công nghệ chuyên biệt cho KOC, Hot Tiktoker, Group Admin & Trưởng Nhóm Affiliate Shopee, TikTok Shop:
          Sở hữu cổng tra cứu đơn hàng, ví tiền và Bot Zalo tự động 100%, nâng cao doanh số và tối đa hoa hồng.
        </p>
      </div>

      {/* 4 Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        {PACKAGES.map((pkg) => {
          const isFeatured = pkg.featured;
          const isVip = pkg.isVip;

          return (
            <div
              key={pkg.id}
              className={`bg-white rounded-3xl p-6 flex flex-col justify-between space-y-6 relative transition-all duration-300 ${
                isFeatured
                  ? "border-2 border-orange-500 shadow-xl shadow-orange-500/10 ring-4 ring-orange-500/10 md:-translate-y-1"
                  : isVip
                  ? "border-2 border-amber-400 shadow-xl shadow-amber-500/10 ring-4 ring-amber-400/10 md:-translate-y-1"
                  : "border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300"
              }`}
            >
              {/* Badge at top right */}
              {pkg.badge && (
                <div
                  className={`absolute top-3 right-3 text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-xs tracking-wider flex items-center gap-1 ${
                    isFeatured
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white"
                      : "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950"
                  }`}
                >
                  <i className={`text-[10px] ${isFeatured ? "fa-solid fa-fire" : "fa-solid fa-crown"}`}></i>
                  <span>{pkg.badge}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md inline-block ${
                      isFeatured
                        ? "text-orange-700 bg-orange-50 border border-orange-200"
                        : isVip
                        ? "text-amber-800 bg-amber-50 border border-amber-200"
                        : pkg.id === "399k"
                        ? "text-indigo-700 bg-indigo-50 border border-indigo-200"
                        : "text-slate-600 bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {pkg.tag}
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-2 font-display">{pkg.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">{pkg.desc}</p>
                </div>

                <div className="pt-2 pb-1 border-y border-slate-100 flex items-baseline gap-1">
                  <span
                    className={`text-3xl font-black font-mono tracking-tight ${
                      isFeatured ? "text-orange-600" : isVip ? "text-amber-600" : "text-slate-900"
                    }`}
                  >
                    {pkg.price}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">{pkg.period}</span>
                </div>

                <div className="space-y-2.5 text-xs text-slate-700 font-medium">
                  {pkg.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <i
                        className={`text-xs shrink-0 mt-0.5 ${
                          isFeatured
                            ? "fa-solid fa-circle-check text-orange-500"
                            : isVip
                            ? "fa-solid fa-crown text-amber-500"
                            : pkg.id === "399k"
                            ? "fa-solid fa-check text-indigo-500"
                            : "fa-solid fa-check text-emerald-500"
                        }`}
                      ></i>
                      <span className="leading-relaxed">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => handleSelectPackage(pkg.id)}
                  className={`w-full py-3 font-extrabold text-xs rounded-xl transition text-center block cursor-pointer active:scale-95 ${pkg.ctaClass}`}
                >
                  {pkg.ctaText}
                </button>
                <a
                  href="https://zalo.me/0888728256"
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center text-[11px] font-bold text-slate-400 hover:text-slate-700 transition"
                >
                  💬 Hoặc chat Zalo ngay: 0888.728.256
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contact Form & Direct Zalo Box */}
      <div id="tu-van-form" className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-10 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-black uppercase">
              <i className="fa-solid fa-headset text-orange-500"></i> Hỗ Trợ Trực Tiếp 24/7
            </div>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 font-display">
              Liên Hệ Trực Tiếp Với Đội Ngũ Phát Triển 28AffiHub
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Chúng tôi luôn sẵn sàng lắng nghe nhu cầu và setup hệ thống bot & website hoàn tiền riêng cho Trưởng Nhóm trong vòng 15 phút.
            </p>

            <div className="space-y-3 pt-2 text-xs font-bold text-slate-700">
              <a
                href="https://zalo.me/0888728256"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-orange-50/50 border border-slate-200/60 transition cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center text-sm font-black shrink-0">
                  Z
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">ZALO HỖ TRỢ / BÁO GIÁ TRỰC TIẾP</div>
                  <div className="text-slate-900 font-black text-sm">0888.728.256 (Phạm Thắng)</div>
                </div>
              </a>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
                <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center text-sm shrink-0">
                  <i className="fa-solid fa-envelope"></i>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">EMAIL HỖ TRỢ KỸ THUẬT</div>
                  <div className="text-slate-900 font-black text-sm">thangcutehuhu2808@gmail.com</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Request Form */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 sm:p-7">
            <h4 className="font-extrabold text-slate-900 text-sm mb-4 flex items-center gap-2">
              <i className="fa-solid fa-paper-plane text-orange-500"></i>
              <span>Gửi Yêu Cầu Tư Vấn & Setup Hệ Thống</span>
            </h4>
            {submitted ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2 text-emerald-800">
                <i className="fa-solid fa-circle-check text-3xl text-emerald-500"></i>
                <p className="font-extrabold text-sm">Cảm ơn sếp đã gửi thông tin!</p>
                <p className="text-xs text-emerald-600">Đội ngũ kỹ thuật 28AffiHub sẽ liên hệ qua Zalo trong ít phút để kích hoạt Kênh.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Gói dịch vụ bạn quan tâm</label>
                  <select
                    value={formData.package}
                    onChange={(e) => setFormData({ ...formData, package: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-orange-500"
                  >
                    <option value="199k">Gói 199.000đ/tháng — Zalo Bot Auto Link (Chuyển đổi 24/7)</option>
                    <option value="299k">Gói 299.000đ/tháng — SaaS Zalo Bot Affiliate (Phổ biến nhất)</option>
                    <option value="399k">Gói 399.000đ/tháng — Web Brand Độc Lập (Tên miền riêng)</option>
                    <option value="499k">Gói 499.000đ/tháng — Omnichannel All-in-One (Web + Zalo + Google Auth)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Họ và tên của bạn</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Nguyễn Văn A..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Số điện thoại / Zalo liên hệ</label>
                  <input
                    type="text"
                    required
                    value={formData.zalo}
                    onChange={(e) => setFormData({ ...formData, zalo: e.target.value })}
                    placeholder="VD: 0988xxxxxx..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Tên nhóm / Tên miền mong muốn</label>
                  <textarea
                    rows={2}
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="VD: Mình muốn tạo kênh hoantien28.store/nhuy hoặc tên miền hoantiencuaban.com..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-orange-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer active:scale-95"
                >
                  Gửi Yêu Cầu Cho Đội Kỹ Thuật
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
