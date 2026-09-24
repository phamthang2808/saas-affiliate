import React, { useState, useEffect } from "react";

// Từ điển giải nghĩa nguồn gốc và bản chất của từng biến động
export const VARIABLE_DEFINITIONS = {
  ten_zalo: {
    name: "@{ten_zalo}",
    example: "@Phạm Thắng",
    desc: "Tên hiển thị Zalo của thành viên vừa nhắn tin (Bot sẽ tự động Tag tên khách).",
    source: "Hệ thống Zalo tự động nhận diện người gửi"
  },
  brand_name: {
    name: "{brand_name}",
    example: "PHẠM NGA AFFILIATE",
    desc: "Tên thương hiệu hoặc Kênh của Trưởng nhóm (viết hoa trang trọng).",
    source: "Cài đặt tại tab Cấu hình Kênh"
  },
  ten_nhom: {
    name: "{ten_nhom}",
    example: "Phạm Nga Affiliate",
    desc: "Tên nhóm Zalo hoặc tên thương hiệu Kênh tiếp thị.",
    source: "Cài đặt tại tab Cấu hình Kênh"
  },
  ten_san_pham: {
    name: "{ten_san_pham}",
    example: "Giày Bóng Chuyền Cao Cấp Hỏa Trâu 2026",
    desc: "Tên sản phẩm Shopee hoặc TikTok Shop được khách gửi link.",
    source: "Bot tự động cào tên từ link sàn TMĐT"
  },
  gia_san_pham: {
    name: "{gia_san_pham}",
    example: "522.500đ",
    desc: "Giá bán tham khảo của sản phẩm trên sàn thương mại điện tử.",
    source: "Shopee Affiliate / TikTok Shop API"
  },
  tong_hoahong_phantram: {
    name: "{tong_hoahong_phantram}",
    example: "7.0%",
    desc: "Tỷ lệ phần trăm hoa hồng tiếp thị của sản phẩm.",
    source: "Tỷ lệ hoa hồng do Shopee/TikTok công bố"
  },
  tong_hoahong_tien: {
    name: "{tong_hoahong_tien}",
    example: "36.575đ",
    desc: "Số tiền hoa hồng dự kiến nhận được khi mua sản phẩm này.",
    source: "Tính tự động: Giá sản phẩm × % hoa hồng"
  },
  link_mua_sam: {
    name: "{link_mua_sam}",
    example: "https://s.shopee.vn/8A1B2C3D4E",
    desc: "Link tiếp thị liên kết rút gọn đã gắn mã định danh SubID riêng của khách.",
    source: "Bot tự động tạo qua Shopee API"
  },
  link_tra_cuu: {
    name: "{link_tra_cuu}",
    example: "https://28affihub.store/phamnga/1d3xolsyioywf",
    desc: "Đường link Web tra cứu cá nhân 1 chạm (đã mã hóa bảo mật định danh).",
    source: "Hệ thống tự tạo mã hóa cho từng thành viên"
  },
  so_du_vi: {
    name: "{so_du_vi}",
    example: "37.824đ",
    desc: "Số dư Ví Khả Dụng thực tế hiện tại mà thành viên có thể bấm rút tiền ngay.",
    source: "Hoa hồng đơn hoàn thành đủ ngày trừ tiền đã rút"
  },
  so_ngay_giu: {
    name: "{so_ngay_giu}",
    example: "3",
    desc: "Số ngày giữ đơn hoàn thành chờ đối soát.",
    source: "Cài đặt tại tab Cấu hình Kênh"
  },
  hoahong_cho_du_ngay: {
    name: "{hoahong_cho_du_ngay}",
    example: "25.000đ",
    desc: "Hoa hồng từ các đơn đã hoàn thành nhưng đang trong thời gian giữ.",
    source: "Tự động khóa tạm thời theo số ngày giữ quy định"
  },
  hoahong_cho: {
    name: "{hoahong_cho}",
    example: "23.079đ",
    desc: "Hoa hồng từ các đơn đang giao / đang xử lý chờ đối soát.",
    source: "Tổng các đơn chưa hoàn thành và chưa hủy"
  },
  hoahong_dangcho: {
    name: "{hoahong_dangcho}",
    example: "23.079đ",
    desc: "Hoa hồng chờ xử lý (tương tự như đơn chờ đối soát).",
    source: "Tổng các đơn chưa hoàn thành và chưa hủy"
  },
  hoahong_danhan: {
    name: "{hoahong_danhan}",
    example: "15.231đ",
    desc: "Tổng số tiền hoa hồng mà thành viên đã được Trưởng nhóm duyệt rút thành công.",
    source: "Tổng tiền các lệnh rút trạng thái COMPLETED"
  },
  ty_le_hoan: {
    name: "{ty_le_hoan}",
    example: "70%",
    desc: "Tỷ lệ phần trăm hoa hồng chia lại cho khách mua hàng.",
    source: "Cài đặt tại tab Cấu hình Kênh"
  },
  so_tien_rut: {
    name: "{so_tien_rut}",
    example: "37.000đ",
    desc: "Số tiền trong yêu cầu rút tiền của thành viên.",
    source: "Số dư khả dụng khi thành viên gõ lệnh rút"
  },
  ngan_hang: {
    name: "{ngan_hang}",
    example: "MB Bank",
    desc: "Tên ngân hàng nhận tiền mà thành viên đã lưu trong hệ thống.",
    source: "Dữ liệu STK thành viên đã lưu qua /stk"
  },
  so_tai_khoan: {
    name: "{so_tai_khoan}",
    example: "0987654321",
    desc: "Số tài khoản ngân hàng nhận tiền của thành viên.",
    source: "Dữ liệu STK thành viên đã lưu qua /stk"
  },
  chu_tai_khoan: {
    name: "{chu_tai_khoan}",
    example: "PHAM VAN THANG",
    desc: "Tên chủ tài khoản ngân hàng nhận tiền.",
    source: "Dữ liệu STK thành viên đã lưu qua /stk"
  },
  ma_giao_dich: {
    name: "{ma_giao_dich}",
    example: "PO-8291",
    desc: "Mã định danh giao dịch rút tiền cần duyệt.",
    source: "Hệ thống tự sinh khi thành viên lập lệnh rút"
  },
  ma_don_hang: {
    name: "{ma_don_hang}",
    example: "240923SHP8192301",
    desc: "Mã đơn hàng Shopee hoặc TikTok Shop.",
    source: "Mã đơn thực tế từ sàn TMĐT"
  },
  ten_thanh_vien: {
    name: "{ten_thanh_vien}",
    example: "Phạm Thắng",
    desc: "Tên thành viên nhận tiền duyệt rút.",
    source: "Tên Zalo của người nhận tiền"
  },
  lenh_sai: {
    name: "{lenh_sai}",
    example: "/donhangg",
    desc: "Câu lệnh người dùng gõ sai hoặc không tồn tại trong hệ thống.",
    source: "Tin nhắn người dùng vừa gửi vào nhóm"
  }
};

// Cấu hình kịch bản người dùng gửi tin nhắn trước khi Bot trả lời
const TRIGGER_SCENARIOS = {
  template_link: {
    userMsg: "https://shopee.vn/product/12345678/9876543210 - Giày này còn size 42 không sếp ơi?",
    userTime: "09:41",
    botTime: "09:41"
  },
  template_link_tiktok: {
    userMsg: "https://vt.tiktok.com/ZS6789abc/ - Mua cái này hoàn tiền ntn bạn?",
    userTime: "09:41",
    botTime: "09:41"
  },
  template_tiktok_not_configured: {
    userMsg: "https://vt.tiktok.com/ZS6789abc/",
    userTime: "09:41",
    botTime: "09:41"
  },
  template_welcome: {
    systemEvent: "🎉 Phạm Thắng vừa tham gia nhóm qua link giới thiệu",
    userTime: "09:41",
    botTime: "09:41"
  },
  template_order_detail: {
    userMsg: "/donhang",
    userTime: "09:42",
    botTime: "09:42"
  },
  template_order_not_found: {
    userMsg: "/donhang",
    userTime: "09:42",
    botTime: "09:42"
  },
  template_wallet: {
    userMsg: "/vitien",
    userTime: "09:43",
    botTime: "09:43"
  },
  template_lookup: {
    userMsg: "/tracuu",
    userTime: "09:44",
    botTime: "09:44"
  },
  template_save_bank_success: {
    userMsg: "/stk_MB_0987654321",
    userTime: "09:45",
    botTime: "09:45"
  },
  template_invalid_bank_syntax: {
    userMsg: "/stk 0987654321",
    userTime: "09:45",
    botTime: "09:45"
  },
  template_withdraw_success: {
    userMsg: "/ruttien",
    userTime: "09:46",
    botTime: "09:46"
  },
  template_withdraw_zero: {
    userMsg: "/ruttien",
    userTime: "09:46",
    botTime: "09:46"
  },
  template_approve_payout: {
    userMsg: "/duyet_PO-8291",
    userTime: "09:47",
    botTime: "09:47",
    isLeader: true
  },
  template_help: {
    userMsg: "/help",
    userTime: "09:48",
    botTime: "09:48"
  },
  template_invalid_command: {
    userMsg: "/donhangg",
    userTime: "09:49",
    botTime: "09:49"
  }
};

export function TemplatePreviewModal({
  isOpen,
  onClose,
  templateKey,
  templateContent,
  templateMeta,
  tenant,
  settings
}) {
  if (!isOpen || !templateKey) return null;

  const currentHoldingDays = settings?.holdingDays !== undefined 
    ? Number(settings.holdingDays) 
    : (tenant?.holdingDays !== undefined ? Number(tenant.holdingDays) : 0);

  // Cho phép tương tác thử nghiệm số ngày giữ (0 ngày vs 3 ngày) ngay trong modal
  const [testHoldingDays, setTestHoldingDays] = useState(currentHoldingDays);

  const brandName = (settings?.name || tenant?.name || "PHẠM NGA AFFILIATE").toUpperCase();
  const groupName = settings?.name || tenant?.name || "Phạm Nga Affiliate";
  const splitRate = settings?.customerSplitRate || tenant?.customerSplitRate || 70;
  const lookupDomain = tenant?.publicLookupDomain 
    ? (tenant.publicLookupDomain.startsWith("http") ? tenant.publicLookupDomain : `https://${tenant.publicLookupDomain}`)
    : "https://28affihub.store";
  const slug = tenant?.slug || "phamnga";
  const lookupUrl = `${lookupDomain}/${slug}/1d3xolsyioywf`;

  // Từ điển giá trị thay thế thực tế
  const mockValues = {
    ten_zalo: "Phạm Thắng",
    user: "Phạm Thắng",
    brand_name: brandName,
    ten_thuong_hieu: brandName,
    ten_nhom: groupName,
    group_name: groupName,
    ten_kenh: groupName,
    ty_le_hoan: `${splitRate}%`,
    split_rate: `${splitRate}%`,
    ten_san_pham: "Giày Bóng Chuyền Cao Cấp Hỏa Trâu 2026",
    product_name: "Giày Bóng Chuyền Cao Cấp Hỏa Trâu 2026",
    gia_san_pham: "522.500đ",
    price: "522.500đ",
    tong_hoahong_phantram: "7.0%",
    commission_rate: "7.0%",
    tong_hoahong_tien: "36.575đ",
    commission_amount: "36.575đ",
    link_mua_sam: "https://s.shopee.vn/8A1B2C3D4E",
    affiliate_link: "https://s.shopee.vn/8A1B2C3D4E",
    link_tra_cuu: lookupUrl,
    link: lookupUrl,
    so_du_vi: testHoldingDays > 0 ? "37.824đ" : "62.824đ",
    balance: testHoldingDays > 0 ? "37.824đ" : "62.824đ",
    so_ngay_giu: String(testHoldingDays),
    holding_days: String(testHoldingDays),
    hoahong_cho_du_ngay: testHoldingDays > 0 ? "25.000đ" : "0đ",
    hoahong_chua_du_ngay: testHoldingDays > 0 ? "25.000đ" : "0đ",
    hoahong_cho: "23.079đ",
    hoahong_dangcho: "23.079đ",
    pending_commission: "23.079đ",
    hoahong_danhan: "15.231đ",
    withdrawn_commission: "15.231đ",
    hoahong_dahoanthanh: "50.000đ",
    completed_commission: "50.000đ",
    so_tien_rut: "37.000đ",
    ngan_hang: "MB Bank",
    so_tai_khoan: "0987654321",
    chu_tai_khoan: "PHAM VAN THANG",
    ma_giao_dich: "PO-8291",
    ma_don_hang: "240923SHP8192301",
    order_id: "240923SHP8192301",
    ten_thanh_vien: "Phạm Thắng",
    lenh_sai: "/donhangg"
  };

  // Tiến hành thay thế biến thực tế
  let simulatedText = templateContent || "";

  // Nếu là mẫu ví tiền và số ngày giữ <= 0: áp dụng logic tự động ẩn dòng chưa đủ ngày
  if (templateKey === "template_wallet" && testHoldingDays <= 0) {
    simulatedText = simulatedText.replaceAll("(?m)^.*\\{(hoahong_cho_du_ngay|hoahong_chua_du_ngay|so_ngay_giu)\\}.*\\r?\\n?", "");
    simulatedText = simulatedText.replaceAll(/(\r?\n){3,}/g, "\n\n");
  }

  // Thực hiện thay thế tất cả placeholder
  Object.keys(mockValues).forEach((key) => {
    const val = mockValues[key];
    const regexTag = new RegExp(`@\\{${key}\\}`, "g");
    const regexPlain = new RegExp(`\\{${key}\\}`, "g");
    simulatedText = simulatedText.replace(regexTag, `@${val}`);
    simulatedText = simulatedText.replace(regexPlain, val);
  });

  // Tìm danh sách các biến động có mặt trong mẫu này
  const foundPlaceholders = [];
  const placeholderRegex = /\{([a-zA-Z0-9_]+)\}/g;
  let match;
  while ((match = placeholderRegex.exec(templateContent || "")) !== null) {
    const varName = match[1];
    if (!foundPlaceholders.includes(varName) && VARIABLE_DEFINITIONS[varName]) {
      foundPlaceholders.push(varName);
    }
  }

  const scenario = TRIGGER_SCENARIOS[templateKey] || {
    userMsg: `Kích hoạt lệnh: ${templateMeta?.command || "Nhắn tin vào nhóm"}`,
    userTime: "09:41",
    botTime: "09:41"
  };

  // Close modal on Escape key & lock background body scroll
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="relative w-full max-w-3xl max-h-[88dvh] sm:max-h-[90vh] flex flex-col bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="shrink-0 px-4 py-3 sm:px-5 sm:py-4 bg-linear-to-r from-purple-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-base sm:text-lg shadow-inner shrink-0">
              <i className={templateMeta?.icon || "fa-solid fa-message"}></i>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black font-display tracking-tight text-white truncate">
                  Mô Phỏng Tin Nhắn Zalo Thực Tế
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-purple-100 border border-white/20">
                  {templateMeta?.title?.split(".")[0] || "Mẫu"}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-purple-200/90 font-medium truncate mt-0.5">
                {templateMeta?.title || templateKey}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition cursor-pointer shrink-0 ml-2"
            title="Đóng xem trước"
          >
            <i className="fa-solid fa-xmark text-sm sm:text-base"></i>
          </button>
        </div>

        {/* Modal Sub-Header: Command & Tips */}
        <div className="shrink-0 px-4 py-2 sm:px-5 sm:py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-bold text-slate-500 text-[11px] sm:text-xs">Lệnh kích hoạt:</span>
            <span className="font-mono font-bold text-purple-700 bg-purple-100/70 border border-purple-200 px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px]">
              {templateMeta?.command || templateMeta?.badge || "Tự động phản hồi"}
            </span>
          </div>

          {templateKey === "template_wallet" && (
            <div className="flex items-center gap-1 sm:gap-1.5 bg-white border border-slate-200 px-2 sm:px-2.5 py-1 rounded-xl shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-600">Thử số ngày giữ:</span>
              <button
                type="button"
                onClick={() => setTestHoldingDays(0)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                  testHoldingDays === 0
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                0 ngày (Ẩn dòng giữ)
              </button>
              <button
                type="button"
                onClick={() => setTestHoldingDays(3)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                  testHoldingDays > 0
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                3 ngày (Hiện dòng giữ)
              </button>
            </div>
          )}
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-6 space-y-4 sm:space-y-6 pb-6">
          {/* 1. GIAO DIỆN MÔ PHỎNG ZALO CHAT THỰC TẾ */}
          <div className="bg-[#E4E8F0] rounded-3xl p-4 sm:p-5 border border-slate-300 shadow-inner flex flex-col space-y-4">
            {/* Header phòng chat Zalo */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-300/80 px-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-2xs">
                  {groupName.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 line-clamp-1">{groupName}</h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                    <span>248 thành viên • Zalo Bot trực tuyến</span>
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">Zalo Preview</div>
            </div>

            {/* Mốc thời gian ngày */}
            <div className="text-center">
              <span className="text-[10px] font-bold text-slate-500 bg-white/70 px-2.5 py-0.5 rounded-full shadow-2xs">
                Hôm nay
              </span>
            </div>

            {/* Tin nhắn từ người dùng / sự kiện kích hoạt */}
            {scenario.systemEvent ? (
              <div className="text-center">
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full shadow-2xs">
                  {scenario.systemEvent}
                </span>
              </div>
            ) : scenario.userMsg ? (
              <div className="flex justify-end items-end gap-2">
                <div className="max-w-[80%] bg-[#0068FF] text-white rounded-2xl rounded-br-xs px-3.5 py-2 shadow-xs text-xs font-medium leading-relaxed">
                  <div className="text-[10px] text-blue-200 font-bold mb-0.5">
                    {scenario.isLeader ? "👑 Trưởng Nhóm" : "Phạm Thắng"}
                  </div>
                  <div>{scenario.userMsg}</div>
                  <div className="text-[9px] text-blue-100 text-right mt-1 font-mono">
                    {scenario.userTime} ✓✓
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                  {scenario.isLeader ? "AD" : "PT"}
                </div>
              </div>
            ) : null}

            {/* Tin nhắn phản hồi từ Zalo Bot */}
            <div className="flex justify-start items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-linear-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0 mt-0.5">
                <i className="fa-solid fa-robot"></i>
              </div>

              <div className="max-w-[88%] sm:max-w-[82%] flex flex-col items-start">
                <div className="text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <span>{groupName} Bot</span>
                  <span className="text-[9px] font-black bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded-md">
                    Trợ lý Bot
                  </span>
                </div>

                <div className="bg-white rounded-2xl rounded-tl-xs p-4 shadow-sm border border-slate-200/80 text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-wrap break-words w-full">
                  {simulatedText}
                </div>

                <div className="text-[9px] text-slate-400 font-mono mt-1 px-1">
                  {scenario.botTime} • Gửi tự động 100%
                </div>
              </div>
            </div>
          </div>

          {/* 2. BẢNG GIẢI MÃ CÁC BIẾN ĐỘNG TRONG MẪU NÀY */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                <i className="fa-solid fa-table-list text-purple-600"></i>
                <span>BẢNG ĐỐI CHIẾU CÁC BIẾN ĐỘNG ({foundPlaceholders.length} biến được dùng trong mẫu này):</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">
                👉 Khi gửi thật, Bot tự động điền các giá trị tương ứng vào
              </span>
            </div>

            {foundPlaceholders.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-black text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Tên Biến Trong Mẫu</th>
                      <th className="py-2.5 px-3">Dữ Liệu Thay Thế Thực Tế</th>
                      <th className="py-2.5 px-3">Ý Nghĩa & Nguồn Gốc Dữ Liệu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {foundPlaceholders.map((varKey) => {
                      const def = VARIABLE_DEFINITIONS[varKey];
                      const val = mockValues[varKey] || def?.example || "";
                      return (
                        <tr key={varKey} className="hover:bg-purple-50/40 transition">
                          <td className="py-2.5 px-3 font-mono font-bold text-purple-700 whitespace-nowrap">
                            {`{${varKey}}`}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                            <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg text-emerald-800 font-mono text-[11px]">
                              {val}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-medium">
                            <div>{def?.desc || "Biến động tự động"}</div>
                            {def?.source && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                💡 Nguồn: <span className="font-semibold text-slate-500">{def.source}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500 font-medium">
                Mẫu này là văn bản cố định, không sử dụng biến động nào.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
          <div className="text-[11px] sm:text-xs text-slate-500 font-medium text-center sm:text-left leading-relaxed">
            💡 Bạn có thể chỉnh sửa nội dung mẫu ngoài màn hình, bấm <strong className="text-purple-700 font-bold">Ví dụ thực tế</strong> để xem ngay kết quả.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-[0.98] text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-2 shrink-0"
          >
            <i className="fa-solid fa-check text-xs"></i>
            <span>Đã hiểu & Đóng</span>
          </button>
        </div>
      </div>
    </div>
  );
}
