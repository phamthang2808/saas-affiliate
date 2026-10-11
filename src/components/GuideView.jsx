import React from "react";

export function GuideView({ currentTenant, onNavigate }) {
  const groupName = currentTenant?.name || "28AffiHub";
  const customerSplit = currentTenant?.customerSplitRate || 80;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-xs">
        <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-3">
          <i className="fa-solid fa-book-open text-orange-500"></i> Hướng Dẫn Chi Tiết
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 font-display">
          Quy Trình Nhận Hoa Hồng & Tra Cứu Tại Nhóm {groupName}
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-2 font-medium">
          Chỉ với 4 bước đơn giản để mua sắm tiết kiệm và nhận tiền hoa hồng hoàn lại về tài khoản ngân hàng của bạn.
        </p>
      </div>

      {/* 4 Steps Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Step 1 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white font-black text-base flex items-center justify-center shadow-md shadow-orange-500/20">
              1
            </div>
            <h3 className="font-extrabold text-sm text-slate-900">Gửi Link Sản Phẩm Cho Bot Zalo</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            Copy link món hàng bạn muốn mua trên Shopee hoặc TikTok Shop, sau đó gửi tin nhắn vào nhóm Zalo hoặc Chat riêng với Bot của nhóm. Bot sẽ trả về link mua hàng gắn mã hoàn tiền cho bạn.
          </p>
        </div>

        {/* Step 2 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white font-black text-base flex items-center justify-center shadow-md shadow-orange-500/20">
              2
            </div>
            <h3 className="font-extrabold text-sm text-slate-900">Bấm Vào Link & Đặt Hàng</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            Nhấn vào đường link mua hàng do Bot gửi để mở ứng dụng Shopee / TikTok và thanh toán đơn hàng như bình thường.
          </p>
        </div>

        {/* Step 3 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white font-black text-base flex items-center justify-center shadow-md shadow-orange-500/20">
              3
            </div>
            <h3 className="font-extrabold text-sm text-slate-900">Tra Cứu Đơn & Tích Lũy Ví</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            Vào mục <strong className="text-orange-600">"Tra cứu & Rút tiền"</strong>, nhập Zalo ID hoặc SĐT của bạn. Bạn sẽ thấy đơn hàng đã được ghi nhận tự động và hoa hồng ({customerSplit}%) chuyển vào ví khả dụng sau khi đơn hoàn thành.
          </p>
        </div>

        {/* Step 4 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white font-black text-base flex items-center justify-center shadow-md shadow-orange-500/20">
              4
            </div>
            <h3 className="font-extrabold text-sm text-slate-900">Cài Đặt Ngân Hàng & Rút Tiền</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            Điền số tài khoản ngân hàng nhận tiền và gửi yêu cầu rút tiền (tối thiểu 10.000đ). Trưởng nhóm sẽ duyệt và tiền được chuyển khoản trực tiếp qua VietQR.
          </p>
        </div>
      </div>

      {/* Action CTA */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 text-center shadow-xs">
        <h3 className="font-extrabold text-slate-900 text-base mb-2">Bạn đã có đơn hàng cần kiểm tra?</h3>
        <p className="text-xs text-slate-500 mb-4">Hãy tra cứu ngay để kiểm tra số dư ví tiền của bạn!</p>
        <button
          onClick={() => onNavigate("tra-cuu")}
          className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer inline-flex items-center gap-2"
        >
          <i className="fa-solid fa-magnifying-glass"></i> Đi Đến Trang Tra Cứu
        </button>
      </div>
    </div>
  );
}
