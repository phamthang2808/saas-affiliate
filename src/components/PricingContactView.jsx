import React, { useState } from "react";

export function PricingContactView() {
  const [formData, setFormData] = useState({
    name: "",
    zalo: "",
    facebook: "",
    shopeePubId: "",
    note: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.zalo) {
      notify("Vui lòng điền Họ tên và Số Zalo liên hệ!", "error");
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 relative">
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
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-xs text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
          <i className="fa-solid fa-crown text-amber-500"></i> Bảng Giá & Giải Pháp Hợp Tác Trưởng Nhóm
        </div>
        <h1 className="text-2xl md:text-4xl font-black text-slate-900 font-display">
          Bảng Giá Dịch Vụ Cho Thuê Bot Zalo Affiliate & Tạo Website Hoàn Tiền Riêng
        </h1>
        <p className="text-xs md:text-sm text-slate-500 max-w-2xl mx-auto font-medium">
          Giải pháp công nghệ chuyên biệt cho KOC, Hot Tiktoker, Group Admin & Trưởng Nhóm Affiliate Shopee, TikTok Shop: Sở hữu cổng tra cứu đơn hàng, ví tiền và Bot Zalo tự động 100%.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Package 1: Khởi Đầu */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                Gói Trưởng Nhóm Cơ Bản
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-2 font-display">Starter Hub</h3>
              <p className="text-xs text-slate-500 mt-1">Phù hợp Trưởng nhóm mới bắt đầu làm hoàn tiền Shopee & TikTok</p>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2.5 text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-check text-emerald-500"></i> Cấp 1 Cổng tra cứu riêng (<code className="text-orange-600 font-mono">28affihub.com/tenban</code>)
              </div>
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-check text-emerald-500"></i> 1 Bot Zalo tự động tạo link hoàn tiền
              </div>
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-check text-emerald-500"></i> Trang Trưởng Nhóm duyệt rút tiền & quản lý đơn
              </div>
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-check text-emerald-500"></i> Tự động tính thuế & chia tỷ lệ 8-2
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <i className="fa-solid fa-xmark text-slate-300"></i> Chưa hỗ trợ Tên miền .com/.vn riêng
              </div>
            </div>
          </div>

          <a
            href="https://zalo.me/0888728256"
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-extrabold text-xs rounded-xl transition text-center block"
          >
            Liên Hệ Tư Vấn Zalo
          </a>
        </div>

        {/* Package 2: Chuyên Nghiệp (Highlight) */}
        <div
          className="rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6 relative overflow-hidden text-white"
          style={{
            background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
            border: "2px solid #fdba74",
          }}
        >
          <div className="absolute top-3 right-3 bg-white text-orange-600 text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow-xs">
            Phổ biến nhất
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-100 bg-white/20 px-2.5 py-1 rounded-md">
                Gói Nhóm Lớn
              </span>
              <h3 className="text-xl font-black text-white mt-2 font-display">Pro Brand Hub</h3>
              <p className="text-xs text-orange-100 mt-1">Hệ thống trọn gói tên miền riêng & tùy biến giao diện</p>
            </div>

            <div className="border-t border-white/20 pt-4 space-y-2.5 text-xs text-white font-medium">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-circle-check text-amber-200"></i> Hỗ trợ Tên miền riêng (<code className="bg-white/20 px-1 rounded font-mono">hoantiencuaban.com</code>)
              </div>
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-circle-check text-amber-200"></i> Bot Zalo chạy trên Server riêng 24/7
              </div>
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-circle-check text-amber-200"></i> Tùy chỉnh màu sắc & tên thương hiệu riêng
              </div>
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-circle-check text-amber-200"></i> Cấu hình tỷ lệ chia % và thuế linh hoạt
              </div>
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-circle-check text-amber-200"></i> Bảo trì & hỗ trợ kỹ thuật 24/7 trực tiếp
              </div>
            </div>
          </div>

          <a
            href="https://zalo.me/0888728256"
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 bg-white text-orange-600 hover:bg-orange-50 font-black text-xs rounded-xl shadow-md transition text-center block"
          >
            Đăng Ký Thuê Ngay (Ưu Đãi)
          </a>
        </div>

        {/* Package 3: Doanh Nghiệp */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                Agency / MCN
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-2 font-display">Enterprise Hub</h3>
              <p className="text-xs text-slate-500 mt-1">Dành cho công ty truyền thông & hệ thống đa Trưởng Nhóm</p>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2.5 text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-check text-emerald-500"></i> Không giới hạn số lượng Trưởng Nhóm
              </div>
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-check text-emerald-500"></i> Tích hợp API Shopee / TikTok Shop tự động
              </div>
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-check text-emerald-500"></i> Cơ sở dữ liệu riêng biệt tốc độ cao
              </div>
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-check text-emerald-500"></i> Xuất hóa đơn & hợp đồng dịch vụ
              </div>
            </div>
          </div>

          <a
            href="https://zalo.me/0888728256"
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-extrabold text-xs rounded-xl transition text-center block"
          >
            Liên Hệ Báo Giá Doanh Nghiệp
          </a>
        </div>
      </div>

      {/* Contact Form & Direct Zalo Box */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-black uppercase">
              <i className="fa-solid fa-headset text-orange-500"></i> Hỗ Trợ Trực Tiếp
            </div>
            <h3 className="text-xl md:text-2xl font-black text-slate-900 font-display">
              Liên Hệ Trực Tiếp Với Đội Ngũ Phát Triển 28AffiHub
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Chúng tôi luôn sẵn sàng lắng nghe nhu cầu và setup hệ thống cho Trưởng Nhóm trong vòng 15 phút.
            </p>

            <div className="space-y-3 pt-2 text-xs font-bold text-slate-700">
              <a
                href="https://zalo.me/0888728256"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-orange-50/50 border border-slate-200/60 transition cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center text-sm font-black shrink-0">
                  Z
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">ZALO HỖ TRỢ / BÁO GIÁ</div>
                  <div className="text-slate-900 font-black">0888.728.256 (Phạm Thắng)</div>
                </div>
              </a>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/60">
                <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center text-sm">
                  <i className="fa-solid fa-envelope"></i>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">EMAIL LIÊN HỆ</div>
                  <div className="text-slate-900 font-black">thangcutehuhu2808@gmail.com</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Request Form */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6">
            <h4 className="font-extrabold text-slate-900 text-sm mb-4">Gửi Yêu Cầu Tư Vấn Setup Nhóm</h4>
            {submitted ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2 text-emerald-800">
                <i className="fa-solid fa-circle-check text-3xl text-emerald-500"></i>
                <p className="font-extrabold text-sm">Cảm ơn sếp đã gửi thông tin!</p>
                <p className="text-xs text-emerald-600">Đội ngũ kỹ thuật 28AffiHub sẽ liên hệ qua Zalo trong ít phút.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Họ và tên của bạn</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Nguyễn Văn A..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-orange-500"
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
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Tên nhóm mong muốn</label>
                  <textarea
                    rows={2}
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder="VD: Mình muốn tạo nhóm hoantien28.store/nhuy và 1 bot Zalo..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-orange-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer"
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
