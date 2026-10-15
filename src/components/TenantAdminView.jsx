import React, { useState, useEffect, useMemo, useCallback } from "react";
import { formatMoney, formatDate } from "../utils/formatters";
import { APP_CONFIG } from "../config/api";
import { MemberDetailModal } from "./MemberDetailModal";
import { TemplatePreviewModal } from "./TemplatePreviewModal";

const removeAccents = (str) =>
  String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

const normalizeStr = (str) =>
  removeAccents(str).replace(/[^a-z0-9]/g, "");

const cleanTenantPrefix = (val, tenantSlug) => {
  if (!val) return "";
  let s = String(val).trim();
  if (tenantSlug) {
    s = s.replace(new RegExp(`^${tenantSlug}[_-]`, "i"), "");
  }
  return s.replace(/^(phamnga|ly|tranhuyen|lecuong|mailan|th|thanhhang|yenvy)[_-]/i, "");
};

// Khớp chuẩn xác theo tên/ID (bỏ qua dấu tiếng Việt, chữ hoa/thường: 'Ha' khớp 'Hà'/'Hạ', KHÔNG khớp 'Thu Hà')
const matchesExactIgnoredAccents = (targetStr, qStr) => {
  if (!targetStr || !qStr) return false;
  const t = String(targetStr).trim().toLowerCase();
  const q = String(qStr).trim().toLowerCase();
  if (t === q) return true;

  const tNorm = removeAccents(t).trim();
  const qNorm = removeAccents(q).trim();
  if (tNorm === qNorm) return true;

  const tNoSpace = tNorm.replace(/\s+/g, "");
  const qNoSpace = qNorm.replace(/\s+/g, "");
  if (tNoSpace === qNoSpace) return true;

  return false;
};

const matchesExactOrWords = matchesExactIgnoredAccents;

// Standard default bot templates helper
const CANONICAL_TEMPLATE_KEYS = [
  "template_link",
  "template_link_tiktok",
  "template_tiktok_not_configured",
  "template_welcome",
  "template_order_detail",
  "template_order_not_found",
  "template_wallet",
  "template_lookup",
  "template_save_bank_success",
  "template_invalid_bank_syntax",
  "template_withdraw_success",
  "template_withdraw_zero",
  "template_approve_payout",
  "template_payout_approved",
  "template_help",
  "template_invalid_command"
];

const TEMPLATE_META = {
  template_link: {
    title: "1. Mẫu tin nhắn Trả Link Mua Sắm Hoàn Tiền (Shopee)",
    badge: "Tự động phản hồi khi thành viên gửi Link Shopee",
    icon: "fa-solid fa-link text-orange-500",
    desc: "Tin nhắn Bot tự động tạo link hoàn tiền Shopee và phản hồi ngay sau khi thành viên gửi link Shopee vào nhóm Zalo."
  },
  template_link_tiktok: {
    title: "2. Mẫu tin nhắn Trả Link TikTok Shop (Khi có đủ API Key & Creator Username)",
    badge: "Tự động phản hồi khi gửi link TikTok Shop và đã kết nối API",
    icon: "fa-solid fa-music text-orange-500",
    desc: "Tin nhắn Bot tự động tạo link tiếp thị TikTok và lấy hoa hồng chuẩn từ TikTok về khi Kênh đã nhập đủ API Key & Creator Username."
  },
  template_tiktok_not_configured: {
    title: "3. Mẫu tin nhắn Báo Chưa Cấu Hình TikTok Shop (Khi thiếu API Key / Creator Username)",
    badge: "Phản hồi khi gửi link TikTok nhưng chưa kết nối API",
    icon: "fa-solid fa-triangle-exclamation text-orange-500",
    desc: "Tin nhắn Bot phản hồi khi thành viên gửi link TikTok Shop nhưng Kênh chưa nhập đủ cả 2 thông tin TikTok API Key & Creator Username."
  },
  template_welcome: {
    title: "4. Mẫu tin nhắn Chào Mừng Thành Viên Mới Gia Nhập Nhóm",
    badge: "Tự động khi có người mới vào nhóm Zalo",
    icon: "fa-solid fa-handshake text-orange-500",
    desc: "Tin nhắn Bot tag tên chào mừng và hướng dẫn đọc bài ghim khi có thành viên mới vào nhóm."
  },
  template_order_detail: {
    title: "5. Mẫu tin nhắn Danh Sách Các Đơn Hàng Đã Mua (Lệnh /donhang)",
    command: "/donhang hoặc /donhang2, /donhang3...",
    icon: "fa-solid fa-box text-orange-500",
    desc: "Tin nhắn Bot liệt kê danh sách đơn hàng khi gõ /donhang. Sửa mẫu hiển thị từng đơn ngay bên trong khối [don_hang]...[/don_hang] hoặc chèn biến {danh_sach_don}. Biến hỗ trợ: {stt}, {ten_san_pham}, {id} (hoặc {ma_don_hang}), {hoa_hong}, {trang_thai}, {icon_trang_thai}, {trang}, {tong_trang}, {tong_don}, {danh_sach_don}, {link_tra_cuu}."
  },
  template_order_not_found: {
    title: "6. Mẫu tin nhắn Báo Chưa Có Đơn Hàng Nào (Khi Chưa Có Đơn)",
    command: "/donhang hoặc #donhang (khi CHƯA CÓ đơn)",
    icon: "fa-solid fa-box-open text-orange-500",
    desc: "Tin nhắn thông báo khi thành viên gõ lệnh /donhang lúc chưa có đơn nào."
  },
  template_wallet: {
    title: "7. Mẫu tin nhắn Thông Tin Ví Hoàn Tiền (Lệnh /vitien)",
    command: "/vitien hoặc #vitien",
    icon: "fa-solid fa-wallet text-orange-500",
    desc: "Tin nhắn Bot hiển thị thông tin Ví khả dụng, Đơn đã hoàn thành (chưa đủ ngày), Đơn chờ đối soát và Đã rút thành công."
  },
  template_lookup: {
    title: "8. Mẫu tin nhắn Tra Cứu Đơn Hàng & Ví Tiền (Link Web 1 Chạm - Lệnh /tracuu)",
    command: "/tracuu hoặc #tracuu",
    icon: "fa-solid fa-magnifying-glass text-orange-500",
    desc: "Tin nhắn Bot phản hồi kèm đường link Web tra cứu cá nhân rút gọn 1 chạm khi thành viên gõ lệnh /tracuu."
  },
  template_save_bank_success: {
    title: "9. Mẫu tin nhắn Lưu Số Tài Khoản Thành Công (ĐÚNG cú pháp)",
    command: "/stk_[NGÂN_HÀNG]_[STK] (khi ĐÚNG cú pháp)",
    icon: "fa-solid fa-credit-card text-orange-500",
    desc: "Tin nhắn phản hồi khi thành viên lưu hoặc cập nhật thành công số tài khoản ngân hàng nhận tiền."
  },
  template_invalid_bank_syntax: {
    title: "10. Mẫu tin nhắn Báo Sai Cú Pháp Lưu Số Tài Khoản (SAI cú pháp)",
    command: "/stk (khi SAI cú pháp)",
    icon: "fa-solid fa-credit-card text-orange-500",
    desc: "Tin nhắn hướng dẫn lại cú pháp lưu số tài khoản ngân hàng khi người dùng gõ sai cú pháp /stk."
  },
  template_withdraw_success: {
    title: "11. Mẫu tin nhắn Yêu Cầu Rút Tiền Thành Công",
    command: "/ruttien hoặc /rut (khi ĐỦ hạn mức)",
    icon: "fa-solid fa-paper-plane text-orange-500",
    desc: "Tin nhắn thông báo khi thành viên lập lệnh rút tiền thành công và gửi thông tin STK chờ Trưởng Nhóm duyệt."
  },
  template_withdraw_zero: {
    title: "12. Mẫu tin nhắn Báo Chưa Đủ Hạn Mức Rút Tiền",
    command: "/ruttien hoặc /rut (khi CHƯA ĐỦ hạn mức)",
    icon: "fa-solid fa-wallet text-orange-500",
    desc: "Tin nhắn thông báo khi số dư khả dụng của thành viên chưa đạt hạn mức tối thiểu để lập lệnh rút."
  },
  template_approve_payout: {
    title: "13. Mẫu tin nhắn Thông Báo Duyệt Rút Tiền Trong Nhóm",
    command: "/duyet_[MÃ_ID] (Chỉ Trưởng Nhóm)",
    icon: "fa-solid fa-circle-check text-orange-500",
    desc: "Tin nhắn thông báo trong nhóm Zalo khi Trưởng Nhóm thực hiện lệnh duyệt tiền thành công cho thành viên."
  },
  template_payout_approved: {
    title: "14. Mẫu tin nhắn Riêng Chuyển Tiền Thành Công (Gửi Private cho Khách)",
    icon: "fa-solid fa-money-bill-transfer text-orange-500",
    desc: "Tin nhắn riêng Bot gửi tự động cho từng khách hàng khi Trưởng Nhóm bấm ĐÃ DUYỆT trên hệ thống web — thay thế việc nhắn tay. Biến: {ten_zalo}, {so_tien}, {ngan_hang}, {so_tai_khoan}, {ma_giao_dich}."
  },
  template_help: {
    title: "15. Mẫu tin nhắn Trợ Giúp & Danh Sách Các Câu Lệnh",
    command: "/help hoặc #help",
    icon: "fa-solid fa-circle-question text-orange-500",
    desc: "Danh sách tổng hợp toàn bộ các câu lệnh Bot hỗ trợ để gửi cho thành viên khi họ cần trợ giúp."
  },
  template_invalid_command: {
    title: "16. Mẫu tin nhắn Phản Hồi Khi Gõ Sai Cú Pháp Lệnh",
    badge: "Khi người dùng gõ sai lệnh",
    icon: "fa-solid fa-triangle-exclamation text-orange-500",
    desc: "Tin nhắn nhắc nhở kèm gợi ý gõ /help khi người dùng gõ một câu lệnh không có trong hệ thống."
  }
};

const getStandardBotTemplates = (tenant) => {
  const groupName = tenant?.name || "Affiliate Cashback";
  const splitRate = tenant?.customerSplitRate || 80;
  return {
    template_link: `@{ten_zalo}, link hoàn tiền hoa hồng đây ạ:\n🛍️ {ten_san_pham}\n📌 Link: {link_mua_sam}\n💰 Hoàn tiền: {tong_hoahong_phantram}% ({tong_hoahong_tien}) [Shopee: {shopee_hoahong_phantram}% | Shop: {shop_hoahong_phantram}%]\n💡 Lưu ý: Hãy mua ngay sau khi click (nên bấm link 2 lần để tăng tỉ lệ chuyển đổi), không xem Video/Live, dọn sạch giỏ trước khi click để được ghi nhận hoàn tiền nhé.`,
    template_link_tiktok: `Hi @{ten_zalo}, link của sếp đây ạ:\n📦 {ten_san_pham}\n💵 Giá tham khảo: {gia_san_pham}\n🔗 Link: {link_mua_sam}\n💵 Tổng hoa hồng: {tong_hoahong_phantram}% ({tong_hoahong_tien})\n💡 Mẹo nhỏ nhận hoa hồng chuẩn 100%: Xóa sp cũ trong giỏ ➔ Bấm link vào App ➔ Mua ngay (không xem Live/Video giữa chừng) nhé sếp ơi!`,
    template_tiktok_not_configured: `@{ten_zalo} Tính năng chuyển đổi link TikTok Shop hiện đang sắp ra mắt! 🚀\nHệ thống hiện tại hỗ trợ chuyển đổi link Shopee, bạn vui lòng gửi link Shopee giúp mình nhé!`,
    template_welcome: `Hi, chào @{ten_zalo}\n🎉 Chào mừng bạn đã tham gia nhóm {ten_nhom}!\n📌 Bạn vui lòng đọc kỹ BÀI GHIM của nhóm hoặc gõ lệnh /help để xem hướng dẫn cách gửi link mua sắm và nhận hoàn {ty_le_hoan}% hoa hồng nhé! 🥰`,
    template_order_detail: `@{ten_zalo} 🛒 DANH SÁCH ĐƠN HÀNG (Trang {trang}/{tong_trang} - Tổng {tong_don} đơn):\n\n[don_hang]\n{stt}. 🛍️ {ten_san_pham}\n🏷️ ID: {ma_don_hang}\n💰 Hoa hồng: {hoa_hong} {icon_trang_thai}\n📊 Trạng thái: {trang_thai}\n─────────────\n[/don_hang]\n\n👉 Tra cứu chi tiết & rút tiền tại:\n🌐 {link_tra_cuu}`,
    template_order_not_found: `@{ten_zalo} 🛒 Bạn chưa có đơn hàng nào trên hệ thống!`,
    template_wallet: `@{ten_zalo} 💳 THÔNG TIN VÍ HOÀN TIỀN {brand_name}:\n\n💰 Ví Khả Dụng (có thể rút): {so_du_vi}đ\n🟢 Đã hoàn thành (chưa đủ {so_ngay_giu} ngày): {hoahong_cho_du_ngay}đ\n⌛ Đơn chờ đối soát: {hoahong_cho}đ\n💸 Đã rút thành công: {hoahong_danhan}đ\n\n👉 Tra cứu chi tiết & Rút tiền 1 chạm tại:\n🌐 {link_tra_cuu}`,
    template_lookup: `@{ten_zalo} 🔍 TRA CỨU ĐƠN HÀNG & VÍ HOÀN TIỀN\n👉 Link tra cứu bảo mật (đã mã hóa định danh, click là xem ngay):\n🌐 {link_tra_cuu}\n\n💡 TÍNH NĂNG TRANG TRA CỨU:\n📦 Xem danh sách đơn đã mua & chi tiết hoa hồng từng đơn.\n💳 Quản lý 3 ví tiền: Đang chờ / Đã hoàn thành / Khả dụng.\n💸 Rút tiền hoa hồng & cập nhật tài khoản Ngân hàng 1 chạm.\n📌 Lưu ý: Đơn Hoàn thành sau 3 ngày sẽ tự chuyển xuống ví Khả Dụng để rút.`,
    template_save_bank_success: `@{ten_zalo} Bạn đã lưu thông tin thành công 🌷`,
    template_invalid_bank_syntax: `@{ten_zalo} ⚠️ Cú pháp không hợp lệ. Vui lòng sử dụng định dạng: /stk_[Tên ngân hàng]_[Số tài khoản] (Ví dụ: /stk_MB_0987654321)`,
    template_withdraw_success: `@{ten_zalo} 🎉 ĐÃ TẠO YÊU CẦU RÚT TIỀN THÀNH CÔNG!\n\n💸 Số tiền rút: {so_tien_rut}đ\n🏦 Về tài khoản: {ngan_hang} - {so_tai_khoan} ({chu_tai_khoan})\n⏳ Trạng thái: Đang chờ Admin {ten_nhom} duyệt giao dịch.`,
    template_withdraw_zero: `@{ten_zalo} ⚠️ Số dư khả dụng của bạn hiện là {so_du_vi}đ (chưa đủ hạn mức rút tối thiểu 10.000đ).\n💡 Bạn hãy gõ /tracuu để kiểm tra chi tiết trạng thái ví nhé!`,
    template_approve_payout: `@{ten_zalo} Đã duyệt và hoàn thành rút tiền cho giao dịch {ma_giao_dich}! Thành viên @{ten_thanh_vien} đã nhận tiền thành công.`,
    template_payout_approved: `✅ @{ten_zalo} ơi!\n\n💸 ${groupName} đã chuyển tiền thành công cho bạn:\n💰 Số tiền: {so_tien}\n🏦 Tài khoản: {ngan_hang} - {so_tai_khoan}\n\n🎉 Cảm ơn bạn đã đồng hành cùng ${groupName}! Hẹn gặp lại bạn ở những đơn tiếp theo nhé!`,
    template_help: `@{ten_zalo} 🤖 CÁC LỆNH BOT HỖ TRỢ SĂN SALE & HOÀN TIỀN:\n\n💳 /vitien hoặc #vitien — Xem ví tiền & hoa hồng hiện có\n🛒 /donhang hoặc #donhang — Xem danh sách các đơn đã đặt\n🔍 /tracuu hoặc #tracuu — Link tra cứu chi tiết bảo mật cá nhân\n🏦 /stk_[NGÂN_HÀNG]_[STK] — Lưu STK nhận tiền (VD: /stk_MB_0888728256)\n💸 /ruttien hoặc /rut — Yêu cầu rút toàn bộ hoa hồng khả dụng\n⚡ /duyet_[MÃ_ID] — Lệnh duyệt tiền (Chỉ Trưởng Nhóm)\n\n💡 Mẹo: Bạn chỉ cần gửi LINK sản phẩm Shopee/TikTok vào nhóm, bot sẽ tự động tạo link hoàn tiền ngay! 🥰`,
    template_invalid_command: `@{ten_zalo} ❓ Lệnh "{lenh_sai}" không hợp lệ.\n👉 Bạn có thể gõ /help để xem danh sách các lệnh được hỗ trợ nhé!`
  };
};

export function TenantAdminView({ apiRoot, currentTenant, availableTenants, onSelectTenant, user, token, onOpenLogin, onLogout }) {
  const activeTenant =
    currentTenant ||
    (availableTenants && user?.tenantId
      ? availableTenants.find((t) => String(t.id) === String(user.tenantId))
      : null) ||
    (availableTenants && availableTenants.length > 0
      ? (availableTenants.find((t) => t.slug?.toLowerCase() === "phamnga" || t.slug?.toLowerCase().includes("phamnga")) || availableTenants[0])
      : null) ||
    (APP_CONFIG.isStandalone ? APP_CONFIG.tenant : null);

  // Dynamic Settings state
  const [settings, setSettings] = useState({
    holdingDays: 0,
    minWithdrawAmount: 10000,
    customerSplitRate: 80,
    taxRate: 10,
    name: "",
    adminZaloId: "",
    withdrawalRuleNote: "",
    shopeePubId: "",
    tiktokApiKey: "",
    tiktokCreatorUsername: "",
    isTiktokEnabled: activeTenant?.isTiktokEnabled ?? false,
    useShortLink: activeTenant?.useShortLink ?? true,
    notifyBothPayout: activeTenant?.notifyBothPayout ?? false,
    zaloGroupId: activeTenant?.zaloGroupId ?? "",
    botReplyDelayMode: "RANGE",
    botReplyDelayFixed: 2,
    botReplyDelayMin: 1,
    botReplyDelayMax: 3,
  });

  const isTiktokEnabled = Boolean(activeTenant?.isTiktokEnabled ?? settings.isTiktokEnabled);

  // Tabs: 'overview' | 'shopee' | 'tiktok' | 'payouts' | 'members' | 'settings' | 'templates' | 'bots'
  const VALID_TENANT_TABS = ["overview", "shopee", "tiktok", "payouts", "members", "settings", "templates", "bots"];
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem("saasTenantAdminTab");
    return (saved && VALID_TENANT_TABS.includes(saved)) ? saved : "overview";
  });

  useEffect(() => {
    if (activeTab && VALID_TENANT_TABS.includes(activeTab)) {
      localStorage.setItem("saasTenantAdminTab", activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "tiktok" && !isTiktokEnabled) {
      setActiveTab("overview");
    }
  }, [activeTab, isTiktokEnabled]);
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [zaloUsers, setZaloUsers] = useState([]);
  const [webUsers, setWebUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [overviewFinanceMode, setOverviewFinanceMode] = useState("all"); // "all" | "completed" | "pending"

  // Filters for Orders Tab
  const [adminOrderSearchUser, setAdminOrderSearchUser] = useState("");
  const [adminOrderSearchId, setAdminOrderSearchId] = useState("");
  const [adminOrderSearchProduct, setAdminOrderSearchProduct] = useState("");
  const [adminOrderFilterStatus, setAdminOrderFilterStatus] = useState("Tất cả");
  const [adminOrderFilterPayment, setAdminOrderFilterPayment] = useState("Tất cả"); // Tất cả | PAID | UNPAID
  const [adminOrderDateFrom, setAdminOrderDateFrom] = useState("");
  const [adminOrderDateTo, setAdminOrderDateTo] = useState("");
  const [adminOrderPage, setAdminOrderPage] = useState(1);
  const [showMultiIdBox, setShowMultiIdBox] = useState(false);

  // Checkbox đánh dấu đã thanh toán cho đối chiếu App Script
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());

  // Members Tab State (Lỳ-style)
  const [memberSearch, setMemberSearch] = useState("");
  const [memberPage, setMemberPage] = useState(1);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editingMemberBank, setEditingMemberBank] = useState(null); // { zaloId, zaloName, bankName, accountNumber, accountName }
  const [isUpdatingBank, setIsUpdatingBank] = useState(false);

  // Modal Gán / Liên kết đơn hàng
  const [selectedOrderToAssign, setSelectedOrderToAssign] = useState(null);
  const [assignZaloId, setAssignZaloId] = useState("");
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  // Import Excel & TikTok Sync state
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [isSyncingTiktok, setIsSyncingTiktok] = useState(false);
  const [tiktokSyncResult, setTiktokSyncResult] = useState(null);

  // Dynamic Zalo Bot QR state
  const [tenantBots, setTenantBots] = useState([]);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [qrMessage, setQrMessage] = useState("");
  const [newBotZaloId, setNewBotZaloId] = useState("");
  const [newBotZaloName, setNewBotZaloName] = useState("");
  const [newBotName, setNewBotName] = useState("");
  const handleSyncTiktokManual = async () => {
    if (!activeTenant?.slug) {
      showNotification("❌ Chưa xác định được Kênh Trưởng Nhóm!", "error");
      return;
    }
    setIsSyncingTiktok(true);
    setTiktokSyncResult(null);
    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/orders/sync-tiktok`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.ok) {
        setTiktokSyncResult({
          success: true,
          message: data.message || `Đã đồng bộ đơn hàng TikTok Shop cho Kênh ${activeTenant?.name} thành công! 🎉`,
        });
        fetchTenantData();
      } else {
        setTiktokSyncResult({
          success: false,
          message: data.message || "Lỗi đồng bộ TikTok",
        });
      }
    } catch (err) {
      setTiktokSyncResult({
        success: false,
        message: "Lỗi kết nối máy chủ: " + err.message,
      });
    } finally {
      setIsSyncingTiktok(false);
    }
  };

  // Bot Templates state
  const initialTemplates = getStandardBotTemplates(activeTenant);
  const [botTemplates, setBotTemplates] = useState(initialTemplates);
  const [defaultTemplates, setDefaultTemplates] = useState(initialTemplates);
  const [isSavingTemplates, setIsSavingTemplates] = useState(false);
  const [templateSaveMessage, setTemplateSaveMessage] = useState("");
  const [templateSubTab, setTemplateSubTab] = useState("all");
  const [previewModalKey, setPreviewModalKey] = useState(null);

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaveMessage, setSettingsSaveMessage] = useState("");

  const authToken = token || localStorage.getItem("saasToken") || "";
  const authHeaders = {
    Authorization: authToken ? `Bearer ${authToken}` : "",
  };

  const fetchTenantSettings = async () => {
    if (!activeTenant?.slug) return;
    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/settings`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({
          holdingDays: data.holdingDays ?? 0,
          minWithdrawAmount: data.minWithdrawAmount ?? 10000,
          customerSplitRate: data.customerSplitRate ?? 80,
          taxRate: data.taxRate ?? 10,
          name: data.name || "",
          adminZaloId: data.adminZaloId || "",
          withdrawalRuleNote: data.withdrawalRuleNote || "",
          shopeePubId: data.shopeePubId || "",
          tiktokApiKey: data.tiktokApiKey || "",
          tiktokCreatorUsername: data.tiktokCreatorUsername || "",
          isTiktokEnabled: data.isTiktokEnabled ?? activeTenant?.isTiktokEnabled ?? false,
          useShortLink: data.useShortLink ?? activeTenant?.useShortLink ?? true,
          notifyBothPayout: data.notifyBothPayout ?? activeTenant?.notifyBothPayout ?? false,
          zaloGroupId: data.zaloGroupId ?? activeTenant?.zaloGroupId ?? "",
          botReplyDelayMode: data.botReplyDelayMode || "RANGE",
          botReplyDelayFixed: data.botReplyDelayFixed ?? 2,
          botReplyDelayMin: data.botReplyDelayMin ?? 1,
          botReplyDelayMax: data.botReplyDelayMax ?? 3,
        });
        if (onSelectTenant && activeTenant) {
          onSelectTenant({
            ...activeTenant,
            customerSplitRate: data.customerSplitRate ?? 80,
            taxRate: data.taxRate ?? 10,
            holdingDays: data.holdingDays ?? 0,
            name: data.name || activeTenant.name,
          });
        }
      }
    } catch (e) {
      console.error("Fetch settings error:", e);
    }
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    if (!activeTenant?.slug) {
      showNotification("❌ Chưa xác định được Kênh Trưởng Nhóm! Vui lòng chọn Kênh hoặc liên hệ Super Admin.", "error");
      return;
    }
    setIsSavingSettings(true);
    setSettingsSaveMessage("");
    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok) {
        setSettingsSaveMessage("✅ Đã lưu cấu hình điều kiện rút tiền & tỷ lệ chia thành công!");
        showNotification("✅ Đã lưu cấu hình điều kiện rút tiền & tỷ lệ chia thành công!", "success");
        setTimeout(() => setSettingsSaveMessage(""), 4000);
        if (onSelectTenant && activeTenant) {
          onSelectTenant({ ...activeTenant, ...settings });
        }
        fetchTenantData();
      } else {
        showNotification("❌ " + (data.message || "Lỗi lưu cấu hình"), "error");
      }
    } catch (err) {
      showNotification("❌ Lỗi kết nối máy chủ: " + err.message, "error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const convertEnglishToVietnamesePlaceholders = (text) => {
    if (!text) return text;
    return String(text)
      .replace(/@\{user\}/g, "@{ten_zalo}")
      .replace(/\{user\}/g, "{ten_zalo}")
      .replace(/\{affiliate_link\}/g, "{link_mua_sam}")
      .replace(/\{link\}/g, "{link_tra_cuu}")
      .replace(/\{split_rate\}/g, "{ty_le_hoan}")
      .replace(/\{group_name\}/g, "{ten_nhom}")
      .replace(/\{product_name\}/g, "{ten_san_pham}")
      .replace(/\{price\}/g, "{gia_san_pham}")
      .replace(/\{total_rate\}/g, "{tong_hoahong_phantram}")
      .replace(/\{commission_rate\}/g, "{tong_hoahong_phantram}")
      .replace(/\{commission_amount\}/g, "{tong_hoahong_tien}")
      .replace(/\{pending_commission\}/g, "{hoahong_dangcho}")
      .replace(/\{completed_commission\}/g, "{hoahong_dahoanthanh}")
      .replace(/\{received_commission\}/g, "{hoahong_danhan}")
      .replace(/\{balance\}/g, "{so_du_vi}")
      .replace(/\{holding_days\}/g, "{so_ngay_giu}")
      .replace(/\{order_id\}/g, "{ma_don_hang}")
      .replace(/\{status\}/g, "{trang_thai}")
      .replace(/\{commission\}/g, "{hoa_hong}")
      .replace(/\{command\}/g, "{lenh_sai}");
  };

  const fetchTenantTemplates = async () => {
    const standard = getStandardBotTemplates(activeTenant);
    if (!activeTenant?.slug) {
      setBotTemplates(standard);
      setDefaultTemplates(standard);
      return;
    }
    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/templates`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        const rawDefs = { ...standard, ...(data.defaultTemplates || {}) };
        const defs = {};
        Object.keys(rawDefs).forEach((k) => {
          defs[k] = convertEnglishToVietnamesePlaceholders(rawDefs[k]);
        });
        const hasOrderList = (str) => str && (str.includes("[don_hang]") || str.includes("[danh_sach_don]") || str.includes("{danh_sach_don}") || str.includes("{orders_list}"));
        if (!defs.template_order_detail || String(defs.template_order_detail).includes("(Tự động hiển thị đơn hàng") || !hasOrderList(defs.template_order_detail)) {
          defs.template_order_detail = standard.template_order_detail;
        }
        setDefaultTemplates(defs);

        let custom = {};
        if (data.customTemplatesJson) {
          try {
            custom = JSON.parse(data.customTemplatesJson);
          } catch (e) {}
        }
        if (custom.template_lookup_has_orders && !custom.template_lookup) {
          custom.template_lookup = custom.template_lookup_has_orders;
        }
        if (custom.template_wallet_has_orders && !custom.template_wallet) {
          custom.template_wallet = custom.template_wallet_has_orders;
        }

        // Tự động nâng cấp mẫu cũ "VÍ TIỀN CỦA BẠN" sang mẫu mặc định chuẩn mới
        if (!custom.template_wallet || String(custom.template_wallet).includes("VÍ TIỀN CỦA BẠN")) {
          custom.template_wallet = standard.template_wallet;
        }
        if (custom.template_wallet_has_orders && String(custom.template_wallet_has_orders).includes("VÍ TIỀN CỦA BẠN")) {
          custom.template_wallet_has_orders = standard.template_wallet;
        }

        // Tự động nâng cấp mẫu cũ "(Tự động hiển thị đơn hàng...)" sang mẫu mặc định chuẩn mới có [don_hang]
        if (!custom.template_order_detail || String(custom.template_order_detail).includes("(Tự động hiển thị đơn hàng") || !hasOrderList(custom.template_order_detail)) {
          custom.template_order_detail = standard.template_order_detail;
        }

        const merged = { ...defs };
        CANONICAL_TEMPLATE_KEYS.forEach((k) => {
          if (custom[k] !== undefined && custom[k] !== null && String(custom[k]).trim() !== "") {
            merged[k] = convertEnglishToVietnamesePlaceholders(custom[k]);
          }
        });
        if (merged.template_wallet && String(merged.template_wallet).includes("VÍ TIỀN CỦA BẠN")) {
          merged.template_wallet = standard.template_wallet;
        }
        if (!merged.template_order_detail || String(merged.template_order_detail).includes("(Tự động hiển thị đơn hàng") || !hasOrderList(merged.template_order_detail)) {
          merged.template_order_detail = standard.template_order_detail;
        }
        setBotTemplates(merged);
      } else {
        setBotTemplates(standard);
        setDefaultTemplates(standard);
      }
    } catch (e) {
      console.error("Fetch templates error:", e);
      setBotTemplates(standard);
      setDefaultTemplates(standard);
    }
  };

  const fetchTenantBots = async () => {
    if (!activeTenant?.slug) return;
    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/bot/list`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setTenantBots(data || []);
      }
    } catch (e) {
      console.error("Fetch tenant bots error:", e);
    }
  };

  const [realQrBase64, setRealQrBase64] = useState(null);
  const [toast, setToast] = useState(null);
  const pollTimerRef = React.useRef(null);

  const showNotification = (message, type = "success") => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 4500);
  };

  const stopQrPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const fetchRealQrImage = async () => {
    if (!activeTenant?.slug) return;
    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/bot/qr-image`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "CONNECTED" || data.status === "ACTIVE") {
          stopQrPolling();
          setShowQrModal(false);
          setIsGeneratingQr(false);
          setRealQrBase64(null);
          showNotification("🎉 Đã quét mã QR và đăng nhập Bot Zalo thành công!", "success");
          fetchTenantBots();
          return;
        }
        if (data.qrBase64) {
          setRealQrBase64(data.qrBase64);
          setIsGeneratingQr(false);
          setQrMessage("🟢 Mã QR Zalo Đăng Nhập Thật đã sẵn sàng! Mở ứng dụng Zalo trên điện thoại quét ngay.");
        } else if (data.status === "GENERATING_QR") {
          setQrMessage("⏳ Đang nhận mã QR từ máy chủ Zalo (vui lòng chờ 2-3 giây)...");
        }
      }
    } catch (e) {
      console.error("Fetch real QR image error:", e);
    }
  };

  const handleGenerateQr = async () => {
    if (!activeTenant?.slug) {
      showNotification("❌ Chưa xác định được Kênh Trưởng Nhóm!", "error");
      return;
    }
    stopQrPolling();
    setIsGeneratingQr(true);
    setRealQrBase64(null);
    setQrMessage("⏳ Đang kết nối máy chủ Zalo để tạo mã QR thực...");
    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/bot/generate-qr`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.ok) {
        setQrMessage("⏳ Đang tải mã QR từ Server Zalo...");
        fetchTenantBots();
        await fetchRealQrImage();
        pollTimerRef.current = setInterval(async () => {
          await fetchRealQrImage();
        }, 1500);
        setTimeout(() => stopQrPolling(), 60000);
      } else {
        showNotification("❌ " + (data.message || "Lỗi tạo phiên QR"), "error");
        setIsGeneratingQr(false);
      }
    } catch (err) {
      showNotification("❌ Lỗi kết nối: " + err.message, "error");
      setIsGeneratingQr(false);
    }
  };

  const handleConnectBotManually = async (e) => {
    e.preventDefault();
    if (!activeTenant?.slug) {
      showNotification("❌ Chưa xác định được Kênh Trưởng Nhóm!", "error");
      return;
    }
    if (!newBotZaloId || !newBotZaloName) {
      showNotification("Vui lòng nhập Zalo ID và Tên Zalo nick phụ!", "error");
      return;
    }
    setIsConnectingBot(true);
    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/bot/connect-bot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          zaloId: newBotZaloId,
          zaloName: newBotZaloName,
          botName: newBotName || `Bot ${newBotZaloName}`
        })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("🎉 " + data.message, "success");
        stopQrPolling();
        setShowQrModal(false);
        setNewBotZaloId("");
        setNewBotZaloName("");
        setNewBotName("");
        fetchTenantBots();
      } else {
        showNotification("❌ " + (data.message || "Lỗi kết nối nick bot"), "error");
      }
    } catch (err) {
      showNotification("❌ Lỗi kết nối: " + err.message, "error");
    } finally {
      setIsConnectingBot(false);
    }
  };

  const handleDisconnectBot = async (botId) => {
    if (!activeTenant?.slug) return;
    if (!window.confirm("Bạn có chắc chắn muốn ngắt kết nối và đăng xuất hoàn toàn nick Bot Zalo này khỏi Kênh?")) return;
    stopQrPolling();
    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/bot/${botId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("✅ " + (data.message || "Đã ngắt kết nối và đăng xuất Bot thành công!"), "success");
        setTenantBots([]);
        setRealQrBase64(null);
        await fetchTenantBots();
      } else {
        showNotification("❌ " + (data.message || "Lỗi ngắt kết nối"), "error");
      }
    } catch (err) {
      showNotification("❌ Lỗi kết nối: " + err.message, "error");
    }
  };

  const fetchTenantData = async () => {
    if (!activeTenant?.slug) return;
    setIsLoading(true);
    try {
      const slug = activeTenant.slug;
      const [resStats, resOrders, resPayouts, resUsers] = await Promise.all([
        fetch(`${apiRoot}/api/saas/admin/${slug}/stats`, { headers: authHeaders }),
        fetch(`${apiRoot}/api/saas/admin/${slug}/orders`, { headers: authHeaders }),
        fetch(`${apiRoot}/api/saas/admin/${slug}/payouts`, { headers: authHeaders }),
        fetch(`${apiRoot}/api/saas/admin/${slug}/zalo-users`, { headers: authHeaders }),
      ]);

      if (resStats.ok) setStats(await resStats.json());
      if (resOrders.ok) setOrders(await resOrders.json());
      if (resPayouts.ok) setPayouts(await resPayouts.json());
      if (resUsers.ok) setZaloUsers(await resUsers.json());
      fetchTenantTemplates();
      fetchTenantSettings();
      fetchTenantBots();
    } catch (e) {
      console.error("Tenant admin fetch error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTemplates = async () => {
    if (!activeTenant?.slug) {
      showNotification("❌ Chưa xác định được Kênh Trưởng Nhóm!", "error");
      return;
    }
    setIsSavingTemplates(true);
    setTemplateSaveMessage("");
    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/templates`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          templatesJson: JSON.stringify(botTemplates),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTemplateSaveMessage("✅ Đã lưu cấu hình tin nhắn Bot thành công!");
        showNotification("✅ Đã lưu cấu hình tin nhắn Bot thành công!", "success");
        setTimeout(() => setTemplateSaveMessage(""), 4000);
      } else {
        showNotification("❌ " + (data.message || "Lỗi lưu cấu hình tin nhắn"), "error");
      }
    } catch (err) {
      showNotification("❌ Lỗi kết nối máy chủ: " + err.message, "error");
    } finally {
      setIsSavingTemplates(false);
    }
  };

  const handleResetTemplate = (key) => {
    if (!window.confirm("Khôi phục mẫu này về bản MẶC ĐỊNH CHUẨN của hệ thống?")) return;
    const std = getStandardBotTemplates(activeTenant);
    let defVal = defaultTemplates[key] || std[key];
    if (key === "template_wallet" && (!defVal || String(defVal).includes("VÍ TIỀN CỦA BẠN"))) {
      defVal = std.template_wallet;
    }
    if (key === "template_order_detail" && (!defVal || String(defVal).includes("(Tự động hiển thị đơn hàng"))) {
      defVal = std.template_order_detail;
    }
    if (defVal) {
      setBotTemplates((prev) => ({ ...prev, [key]: defVal }));
    }
  };

  const handleResetAllTemplates = () => {
    if (!window.confirm("Bạn có chắc chắn muốn khôi phục TẤT CẢ các mẫu tin nhắn về mặc định của hệ thống?")) return;
    const std = getStandardBotTemplates(activeTenant);
    setBotTemplates({ ...std, ...defaultTemplates, template_wallet: std.template_wallet, template_order_detail: std.template_order_detail });
  };

  useEffect(() => {
    if (!currentTenant && activeTenant && onSelectTenant) {
      onSelectTenant(activeTenant);
    }
    fetchTenantData();
  }, [activeTenant?.slug, apiRoot]);

  const handleApprovePayout = async (payoutId) => {
    if (!activeTenant?.slug) {
      showNotification("❌ Chưa xác định được Kênh Trưởng Nhóm!", "error");
      return;
    }
    if (!window.confirm("Xác nhận ĐÃ CHUYỂN TIỀN thành công cho yêu cầu rút tiền này?")) return;

    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/payouts/${payoutId}/approve`, {
        method: "PUT",
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("✅ " + (data.message || "Đã duyệt rút tiền thành công!"), "success");
        fetchTenantData();
      } else {
        showNotification("❌ " + (data.message || "Lỗi duyệt rút tiền"), "error");
      }
    } catch (err) {
      showNotification("❌ Lỗi kết nối máy chủ: " + err.message, "error");
    }
  };

  const handleRejectPayout = async (payoutId) => {
    if (!activeTenant?.slug) {
      showNotification("❌ Chưa xác định được Kênh Trưởng Nhóm!", "error");
      return;
    }
    const note = prompt("Nhập lý do từ chối (ví dụ: Sai số tài khoản, chưa đủ số dư):", "Sai thông tin ngân hàng");
    if (note === null) return;

    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/payouts/${payoutId}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("✅ " + (data.message || "Đã từ chối yêu cầu rút tiền"), "success");
        fetchTenantData();
      } else {
        showNotification("❌ " + (data.message || "Lỗi khi từ chối"), "error");
      }
    } catch (err) {
      showNotification("❌ Lỗi kết nối máy chủ: " + err.message, "error");
    }
  };

  const handleDeleteMember = async (member) => {
    if (!activeTenant?.slug || !member) return;
    const name = member.zaloName || member.zalo_name || member.zaloId || "thành viên này";
    const zId = member.zaloId || member.zalo_id || member.id;
    if (!window.confirm(`⚠️ Bạn có chắc chắn muốn XÓA thành viên "${name}" (Zalo ID: ${zId}) khỏi Kênh?\n\nThao tác này sẽ xóa hồ sơ thành viên này và không thể hoàn tác!`)) {
      return;
    }

    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/zalo-users/${member.id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("✅ " + (data.message || "Đã xóa thành viên thành công!"), "success");
        setZaloUsers((prev) => prev.filter((u) => u.id !== member.id));
        if (selectedMember?.id === member.id) {
          setSelectedMember(null);
        }
      } else {
        showNotification("❌ " + (data.message || "Lỗi xóa thành viên"), "error");
      }
    } catch (err) {
      showNotification("❌ Lỗi kết nối máy chủ: " + err.message, "error");
    }
  };

  const handleUploadExcel = async () => {
    if (!activeTenant?.slug) {
      showNotification("❌ Chưa xác định được Kênh Trưởng Nhóm! Vui lòng chọn Kênh hoặc liên hệ Super Admin để gán Kênh cho tài khoản của bạn.", "error");
      return;
    }
    if (!importFile) {
      showNotification("Vui lòng chọn file Excel trước!", "error");
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/orders/import`, {
        method: "POST",
        headers: authHeaders,
        body: formData,
      });

      const data = await res.json();
      setIsImporting(false);

      if (res.ok) {
        setImportResult({
          success: true,
          message: data.message || `Đã nạp thành công báo cáo đơn hàng cho ${activeTenant?.name}!`,
        });
        showNotification(`Đã nạp thành công báo cáo đơn hàng cho ${activeTenant?.name}! 🎉`, "success");
        setImportFile(null);
        fetchTenantData();
      } else {
        setImportResult({
          success: false,
          message: data.message || "Lỗi khi xử lý file Excel",
        });
        showNotification("❌ " + (data.message || "Lỗi khi xử lý file Excel"), "error");
      }
    } catch (err) {
      setIsImporting(false);
      showNotification("❌ Lỗi kết nối máy chủ: " + err.message, "error");
    }
  };

  const [isDeletingAllOrders, setIsDeletingAllOrders] = useState(false);

  const handleDeleteAllOrders = async (platform = "shopee") => {
    if (!activeTenant?.slug) {
      showNotification("❌ Chưa xác định được Kênh Trưởng Nhóm!", "error");
      return;
    }
    const platformLabel = platform === "tiktok" ? "TikTok" : "Shopee";
    const confirmed = window.confirm(
      `⚠️ BẠN CÓ CHẮC CHẮN MUỐN XÓA ĐƠN HÀNG ${platformLabel.toUpperCase()} GẦN ĐÂY CỦA KÊNH "${activeTenant?.name || ""}"?\n\n` +
      `🛡️ CHÍNH SÁCH BẢO VỆ DỮ LIỆU LỊCH SỬ:\n` +
      `• Hệ thống CHỈ xóa các đơn thuộc THÁNG HIỆN TẠI VÀ 2 THÁNG GẦN NHẤT (vì Shopee vẫn hỗ trợ xuất lại báo cáo đối soát).\n` +
      `• Toàn bộ đơn hàng lịch sử cũ hơn (trước 2 tháng) sẽ được TỰ ĐỘNG BẢO VỆ NGUYÊN VẸN, không bị xóa để bảo toàn lịch sử và số dư ví của thành viên!\n\n` +
      `Bạn có chắc chắn muốn tiến hành xóa các đơn trong 3 tháng gần nhất?`
    );
    if (!confirmed) return;

    setIsDeletingAllOrders(true);
    try {
      const res = await fetch(
        `${apiRoot}/api/saas/admin/${activeTenant.slug}/orders/delete-all?platform=${platform}`,
        {
          method: "DELETE",
          headers: authHeaders,
        }
      );
      const data = await res.json();
      if (res.ok) {
        showNotification(
          `🗑️ ${data.message || `Đã xóa toàn bộ đơn ${platformLabel} thành công!`}`,
          "success"
        );
        setImportResult(null);
        setImportFile(null);
        fetchTenantData();
      } else {
        showNotification("❌ " + (data.message || `Lỗi khi xóa đơn ${platformLabel}`), "error");
      }
    } catch (err) {
      showNotification("❌ Lỗi kết nối máy chủ: " + err.message, "error");
    } finally {
      setIsDeletingAllOrders(false);
    }
  };

  const handleAssignOrder = async (e, unassign = false) => {
    if (e) e.preventDefault();
    if (!unassign && (!selectedOrderToAssign || !assignZaloId)) {
      showNotification("Vui lòng chọn tài khoản Zalo để gán đơn!", "error");
      return;
    }
    if (!activeTenant?.slug) return;

    setIsSubmittingAssign(true);
    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/orders/${selectedOrderToAssign.id}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(unassign ? { unassign: true } : { zaloId: assignZaloId }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification("✅ " + (data.message || "Đã gán đơn hàng cho thành viên thành công! 🎉"), "success");
        setSelectedOrderToAssign(null);
        setAssignZaloId("");
        fetchTenantData();
      } else {
        showNotification("❌ " + (data.message || "Lỗi gán đơn hàng"), "error");
      }
    } catch (err) {
      showNotification("❌ Lỗi máy chủ: " + err.message, "error");
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  // === ĐỐI CHIẾU APP SCRIPT: Đánh dấu đã thanh toán hàng loạt cho đơn hàng ===
  const handleMarkPaid = async (action = "PAID") => {
    if (!activeTenant?.slug) return;
    if (selectedOrderIds.size === 0) {
      showNotification("⚠️ Vui lòng tích chọn ít nhất 1 đơn hàng!", "error");
      return;
    }
    const confirmMsg = action === "PAID"
      ? `Đánh dấu ${selectedOrderIds.size} đơn hàng là ĐÃ THANH TOÁN?`
      : `Bỏ đánh dấu thanh toán cho ${selectedOrderIds.size} đơn hàng?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/orders/mark-paid`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ orderIds: Array.from(selectedOrderIds), action }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message || "Thành công!", "success");
        setSelectedOrderIds(new Set());
        fetchTenantData();
      } else {
        showNotification("❌ " + (data.message || "Lỗi"), "error");
      }
    } catch (err) {
      showNotification("❌ Lỗi máy chủ: " + err.message, "error");
    }
  };

  // Toggle chọn/bỏ 1 đơn
  const toggleSelectOrder = (orderId) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  // Chọn/bỏ tất cả đơn đang hiển thị (theo bộ lọc + trang hiện tại)
  const toggleSelectAllOrders = (currentPageOrders) => {
    const allIds = currentPageOrders.map((o) => o.id);
    const allSelected = allIds.every((id) => selectedOrderIds.has(id));
    if (allSelected) {
      setSelectedOrderIds((prev) => {
        const next = new Set(prev);
        allIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedOrderIds((prev) => {
        const next = new Set(prev);
        allIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  // Chọn tất cả đơn đang lọc (đối chiếu App Script toàn bộ)
  const toggleSelectAllFiltered = (allFilteredOrders) => {
    const allIds = allFilteredOrders.map((o) => o.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedOrderIds.has(id));
    if (allSelected) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(allIds));
    }
  };

  // === SỬA STK THÀNH VIÊN ===
  const handleUpdateMemberBank = async (zaloId, bankName, accountNumber, accountName) => {
    if (!activeTenant?.slug || !zaloId) return;
    setIsUpdatingBank(true);
    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/members/${zaloId}/bank-info`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ bankName, accountNumber, accountName }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message || "✅ Đã cập nhật STK thành công!", "success");
        setEditingMemberBank(null);
        setZaloUsers((prev) =>
          prev.map((u) => {
            if (String(u.zaloId || u.zalo_id) === String(zaloId)) {
              return { ...u, bankName, accountNumber, accountName };
            }
            return u;
          })
        );
      } else {
        showNotification("❌ " + (data.message || "Lỗi cập nhật STK"), "error");
      }
    } catch (err) {
      showNotification("❌ Lỗi máy chủ: " + err.message, "error");
    } finally {
      setIsUpdatingBank(false);
    }
  };

  const groupDisplayName = stats?.tenant?.name || activeTenant?.name || "Nhóm Đối Tác";
  const pendingPayouts = payouts.filter((p) => p.status === "PENDING");
  const totalPendingAmount = pendingPayouts.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const customerSplitRate = Number(
    settings.customerSplitRate ??
    stats?.tenant?.customerSplitRate ??
    activeTenant?.customerSplitRate ??
    80
  );
  const taxRate = Number(
    settings.taxRate !== undefined && settings.taxRate !== null
      ? settings.taxRate
      : (stats?.tenant?.taxRate ?? activeTenant?.taxRate ?? 10)
  );
  const holdingDays = Number(
    settings.holdingDays !== undefined && settings.holdingDays !== null
      ? settings.holdingDays
      : (stats?.tenant?.holdingDays ?? activeTenant?.holdingDays ?? 0)
  );
  const adminSplitRate = Math.max(0, 100 - customerSplitRate);

  // === TỐI ƯU HÓA HIỆU NĂNG: TÍNH TOÁN VÍ THÀNH VIÊN 1 LẦN DUY NHẤT (O(N) thay vì O(M*N)) ===
  const memberWalletsMap = useMemo(() => {
    if (!Array.isArray(zaloUsers) || zaloUsers.length === 0) return new Map();

    const mSlug = String(activeTenant?.slug || "").toLowerCase();
    const currentSplit = customerSplitRate || 80;
    const currentTax = taxRate !== undefined ? taxRate : 10;
    const tenantHoldingDays = Number(holdingDays || 0);

    // 1. Chuẩn hóa định danh của 123 thành viên 1 lần duy nhất
    const membersMeta = zaloUsers.map((m) => {
      const mZaloId = String(m.zaloId || m.zalo_id || "").trim().toLowerCase();
      const mId = m.id ? String(m.id) : null;
      const mNormName = removeAccents(m.zaloName || m.zalo_name || m.name).replace(/[^a-z0-9]/g, "");
      const mNormAcc = removeAccents(m.accountName).replace(/[^a-z0-9]/g, "");
      return {
        key: m.id || m.zaloId,
        member: m,
        mZaloId,
        mId,
        mNormName,
        mNormAcc,
        matchedOrders: [],
        matchedPayouts: [],
        matchedOrderUserIds: new Set(),
        matchedOrderZaloIds: new Set(),
      };
    });

    const memberByZaloId = new Map();
    const memberByUserId = new Map();
    const memberByNormName = new Map();
    const memberByNormAcc = new Map();

    membersMeta.forEach((meta) => {
      if (meta.mZaloId) memberByZaloId.set(meta.mZaloId, meta);
      if (meta.mId) memberByUserId.set(meta.mId, meta);
      if (meta.mNormName && meta.mNormName.length >= 2 && !/^\d+$/.test(meta.mNormName)) {
        memberByNormName.set(meta.mNormName, meta);
      }
      if (meta.mNormAcc && meta.mNormAcc.length >= 2 && !/^\d+$/.test(meta.mNormAcc)) {
        memberByNormAcc.set(meta.mNormAcc, meta);
      }
    });

    // 2. Quét toàn bộ 3,177 đơn đúng 1 vòng (O(N)) thay vì lặp hàng trăm ngàn lần
    const safeOrders = Array.isArray(orders) ? orders : [];
    for (let i = 0; i < safeOrders.length; i++) {
      const o = safeOrders[i];
      if (!o) continue;

      const oZaloId = String(o.zaloId || "").trim().toLowerCase();
      const oSubId = String(o.subId || o.sub_id || "").trim().toLowerCase();
      const oUserId = o.userId ? String(o.userId) : null;

      let matchedMeta = null;
      if (oZaloId && memberByZaloId.has(oZaloId)) {
        matchedMeta = memberByZaloId.get(oZaloId);
      } else if (oSubId && memberByZaloId.has(oSubId)) {
        matchedMeta = memberByZaloId.get(oSubId);
      } else if (mSlug && oSubId.startsWith(`${mSlug}_`) && memberByZaloId.has(oSubId.substring(mSlug.length + 1))) {
        matchedMeta = memberByZaloId.get(oSubId.substring(mSlug.length + 1));
      } else if (oUserId && memberByUserId.has(oUserId)) {
        matchedMeta = memberByUserId.get(oUserId);
      } else if (oSubId.startsWith("u") && memberByUserId.has(oSubId.substring(1))) {
        matchedMeta = memberByUserId.get(oSubId.substring(1));
      } else if (mSlug && oSubId.startsWith(`${mSlug}_u`) && memberByUserId.has(oSubId.substring(mSlug.length + 2))) {
        matchedMeta = memberByUserId.get(oSubId.substring(mSlug.length + 2));
      } else {
        for (let j = 0; j < membersMeta.length; j++) {
          const meta = membersMeta[j];
          if (meta.mZaloId && /^\d{6,}$/.test(meta.mZaloId) && oSubId.includes(meta.mZaloId)) {
            matchedMeta = meta;
            break;
          }
        }
        if (!matchedMeta && oSubId) {
          const cleanSub = cleanTenantPrefix(oSubId, mSlug);
          const cleanSubNorm = normalizeStr(cleanSub);
          if (cleanSubNorm && cleanSubNorm.length >= 2 && !/^\d+$/.test(cleanSubNorm)) {
            if (memberByNormName.has(cleanSubNorm)) {
              matchedMeta = memberByNormName.get(cleanSubNorm);
            } else if (memberByNormAcc.has(cleanSubNorm)) {
              matchedMeta = memberByNormAcc.get(cleanSubNorm);
            }
          }
        }
      }

      if (matchedMeta) {
        matchedMeta.matchedOrders.push(o);
        if (o.userId != null) matchedMeta.matchedOrderUserIds.add(String(o.userId));
        if (o.zaloId) matchedMeta.matchedOrderZaloIds.add(String(o.zaloId).trim().toLowerCase());
        if (o.subId) {
          const cleanSub = cleanTenantPrefix(o.subId, mSlug).toLowerCase();
          matchedMeta.matchedOrderZaloIds.add(cleanSub);
        }
      }
    }

    // 3. Phân bổ các lệnh rút tiền (O(P))
    const safePayouts = Array.isArray(payouts) ? payouts : [];
    for (let i = 0; i < safePayouts.length; i++) {
      const p = safePayouts[i];
      if (!p) continue;

      const pZaloId = String(p.zaloId || "").trim().toLowerCase();
      const pUserId = p.userId ? String(p.userId) : null;
      const pNote = String(p.note || "").toLowerCase();
      const cleanPZalo = cleanTenantPrefix(pZaloId, mSlug).toLowerCase();
      const pNormZalo = normalizeStr(cleanPZalo || pZaloId);

      const pNormAcc = normalizeStr(p.accountName || "");

      let matchedMeta = null;
      if (pZaloId && memberByZaloId.has(pZaloId)) {
        matchedMeta = memberByZaloId.get(pZaloId);
      } else if (cleanPZalo && memberByZaloId.has(cleanPZalo)) {
        matchedMeta = memberByZaloId.get(cleanPZalo);
      } else if (pUserId && memberByUserId.has(pUserId)) {
        matchedMeta = memberByUserId.get(pUserId);
      } else {
        for (let j = 0; j < membersMeta.length; j++) {
          const meta = membersMeta[j];
          const hasZaloMatch = Boolean(
            (meta.mZaloId && /^\d{6,}$/.test(meta.mZaloId) && pNote.includes(meta.mZaloId)) ||
            (pUserId && meta.matchedOrderUserIds.has(pUserId)) ||
            (pZaloId && meta.matchedOrderZaloIds.has(pZaloId)) ||
            (cleanPZalo && meta.matchedOrderZaloIds.has(cleanPZalo)) ||
            (pNormZalo && meta.matchedOrderZaloIds.has(pNormZalo))
          );
          if (!hasZaloMatch) continue;

          // Bắt buộc phải trùng cả điều kiện tên không dấu nếu có định danh tên
          const hasNameMatch = Boolean(
            !pNormZalo || pNormZalo.length < 2 || meta.mNormName === pNormZalo || meta.mNormAcc === pNormZalo
          );

          if (hasZaloMatch && hasNameMatch) {
            matchedMeta = meta;
            break;
          }
        }
      }

      // Kiểm tra chặt tên chủ tài khoản nhận (accountName) nếu có: không được gán cho người khác tên
      if (matchedMeta && pNormAcc && pNormAcc.length >= 2) {
        const m = matchedMeta;
        const matchesName = Boolean(
          (m.mNormName && (pNormAcc === m.mNormName || pNormAcc.includes(m.mNormName) || m.mNormName.includes(pNormAcc))) ||
          (m.mNormAcc && (pNormAcc === m.mNormAcc || pNormAcc.includes(m.mNormAcc) || m.mNormAcc.includes(pNormAcc)))
        );
        if (!matchesName) {
          matchedMeta = null; // Tên tài khoản khác hẳn -> loại bỏ
        }
      }

      if (matchedMeta) {
        matchedMeta.matchedPayouts.push(p);
      }
    }

    // 4. Tính toán Ví tiền cho từng thành viên
    const resultMap = new Map();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thresholdTime = tenantHoldingDays > 0 ? new Date(now.getTime() - tenantHoldingDays * 24 * 60 * 60 * 1000) : null;

    membersMeta.forEach((meta) => {
      let pendingCommission = 0;
      let completedCommission = 0;
      let eligibleCommission = 0;
      let paidOrdersCommission = 0;

      for (let i = 0; i < meta.matchedOrders.length; i++) {
        const o = meta.matchedOrders[i];
        const st = String(o.status || "").toLowerCase();
        const isCompleted = st.includes("hoàn thành") || st.includes("completed") || st.includes("thành công") || st.includes("thanh toán") || st.includes("duyệt") || st === "2";
        const isCancelled = st.includes("hủy") || st.includes("cancel") || st.includes("refund") || st === "3";

        const raw = Number(o.rawCommission || 0);
        let comm = 0;
        if (raw > 0) {
          const tax = Math.round((raw * currentTax) / 100);
          const afterTax = Math.max(0, raw - tax);
          comm = Math.round((afterTax * currentSplit) / 100);
        } else {
          comm = Math.round(Number(o.finalCommission || 0));
        }

        if (isCompleted) {
          completedCommission += comm;

          let eligible = true;
          if (tenantHoldingDays > 0) {
            const dateStr = o.completeTime || o.completedAt || o.orderDate || o.createdAt;
            if (dateStr) {
              const oDate = new Date(dateStr);
              if (!isNaN(oDate.getTime())) {
                if (oDate > thresholdTime) {
                  const oDay = new Date(oDate.getFullYear(), oDate.getMonth(), oDate.getDate());
                  oDay.setDate(oDay.getDate() + tenantHoldingDays);
                  eligible = oDay <= today;
                }
              }
            }
          }
          if (eligible) eligibleCommission += comm;
          if (String(o.paymentStatus || "").toUpperCase() === "PAID") paidOrdersCommission += comm;
        } else if (!isCancelled) {
          pendingCommission += comm;
        }
      }

      let totalPayoutsWithdrawn = 0;
      let pendingWithdrawn = 0;
      for (let i = 0; i < meta.matchedPayouts.length; i++) {
        const p = meta.matchedPayouts[i];
        const pst = String(p.status || "").toUpperCase();
        const amt = Number(p.amount) || 0;
        if (pst === "COMPLETED" || pst === "APPROVED") {
          totalPayoutsWithdrawn += amt;
        } else if (pst === "PENDING") {
          pendingWithdrawn += amt;
        }
      }

      const totalWithdrawn = Math.max(totalPayoutsWithdrawn, paidOrdersCommission);
      const availableBalance = Math.max(0, eligibleCommission - totalWithdrawn - pendingWithdrawn);
      const finalCompletedCommission = Math.max(completedCommission, totalWithdrawn + availableBalance);

      const walletObj = {
        pendingCommission,
        completedCommission: finalCompletedCommission,
        availableBalance,
        totalWithdrawn,
        pendingWithdrawn,
        totalOrders: meta.matchedOrders.length,
        orders: meta.matchedOrders,
        payouts: meta.matchedPayouts,
        orderIdSet: new Set(meta.matchedOrders.flatMap((mo) => [String(mo.id), String(mo.orderId || "")]).filter(Boolean)),
      };
      resultMap.set(meta.key, walletObj);
      if (meta.mId) resultMap.set(String(meta.mId), walletObj);
      if (meta.mZaloId) resultMap.set(String(meta.mZaloId), walletObj);
    });

    return resultMap;
  }, [orders, payouts, zaloUsers, customerSplitRate, taxRate, holdingDays, activeTenant?.slug]);

  // Danh sách thành viên sau lọc tìm kiếm (memoized để không re-filter khi gõ modal)
  const filteredMembers = useMemo(() => {
    const list = Array.isArray(zaloUsers) ? zaloUsers : [];
    const q = String(memberSearch || "").toLowerCase().trim();
    if (!q) return list;
    const qNoAccent = removeAccents(q);

    return list.filter((u) => {
      if (!u) return false;
      const zaloId = String(u.zaloId || u.zalo_id || "").toLowerCase();
      const zaloName = String(u.zaloName || u.zalo_name || "").toLowerCase();
      const bankName = String(u.bankName || u.bank_name || "").toLowerCase();
      const accountNumber = String(u.accountNumber || u.account_number || "").toLowerCase();
      const accountName = String(u.accountName || u.account_name || "").toLowerCase();

      return (
        zaloId.includes(q) ||
        zaloName.includes(q) ||
        bankName.includes(q) ||
        accountNumber.includes(q) ||
        accountName.includes(q) ||
        removeAccents(zaloName).includes(qNoAccent)
      );
    });
  }, [zaloUsers, memberSearch]);

  const memberItemsPerPage = 20;
  const totalMemberPages = Math.max(1, Math.ceil(filteredMembers.length / memberItemsPerPage));
  const currentMemberPage = Math.min(memberPage, totalMemberPages);
  const currentMembers = useMemo(() => {
    return filteredMembers.slice((currentMemberPage - 1) * memberItemsPerPage, currentMemberPage * memberItemsPerPage);
  }, [filteredMembers, currentMemberPage]);

  // Tổng cộng trang hiện tại cho footer (tính từ Map đã memoized, cực nhanh)
  const pageTotals = useMemo(() => {
    let pending = 0;
    let completed = 0;
    let available = 0;
    let withdrawn = 0;
    for (let i = 0; i < currentMembers.length; i++) {
      const u = currentMembers[i];
      const w = memberWalletsMap.get(u.id || u.zaloId);
      if (w) {
        pending += w.pendingCommission || 0;
        completed += w.completedCommission || 0;
        available += w.availableBalance || 0;
        withdrawn += w.totalWithdrawn || 0;
      }
    }
    return { pending, completed, available, withdrawn };
  }, [currentMembers, memberWalletsMap]);

  // Split platform orders
  const shopeeOrders = orders.filter((o) => !o.platform || o.platform.toLowerCase().includes("shopee"));
  const tiktokOrders = orders.filter((o) => o.platform && o.platform.toLowerCase().includes("tiktok"));
  const targetOrders = activeTab === "tiktok" ? tiktokOrders : shopeeOrders;

  // 1. Pre-built Maps tra cứu thành viên O(1)
  const userLookups = useMemo(() => {
    const byZaloId = new Map();
    const byId = new Map();
    const byNormName = new Map();
    const byNormAcc = new Map();

    (zaloUsers || []).forEach((u) => {
      if (!u) return;
      const zId = String(u.zaloId || u.zalo_id || "").trim().toLowerCase();
      const uId = u.id ? String(u.id).trim() : "";
      if (zId) byZaloId.set(zId, u);
      if (uId) byId.set(uId, u);

      const normName = normalizeStr(u.zaloName || u.zalo_name || u.name);
      if (normName && normName.length >= 2 && !/^\d+$/.test(normName)) {
        if (!byNormName.has(normName)) byNormName.set(normName, u);
      }
      const normAcc = normalizeStr(u.accountName);
      if (normAcc && normAcc.length >= 2 && !/^\d+$/.test(normAcc)) {
        if (!byNormAcc.has(normAcc)) byNormAcc.set(normAcc, u);
      }
    });

    return { byZaloId, byId, byNormName, byNormAcc };
  }, [zaloUsers]);

  // 2. Hàm định danh người mua cho đơn hàng (dùng chung cho cả bộ lọc và hiển thị bảng)
  const getOrderBuyerInfo = useCallback(
    (orderObj) => {
      if (!orderObj) return { name: "Khách ẩn", isAssigned: false, isZaloName: false, zaloId: "", cleanSub: "" };
      const rawSubId = String(orderObj.subId || orderObj.sub_id || orderObj.subId1 || "").trim();
      const targetZaloId = String(orderObj.zaloId || "").trim();
      const cleanSub = cleanTenantPrefix(rawSubId, activeTenant?.slug);
      const lookupKey = targetZaloId || cleanSub || rawSubId;

      // 2.1. Tra theo Zalo ID hoặc User ID
      let zUser = null;
      if (targetZaloId && userLookups.byZaloId.has(targetZaloId.toLowerCase())) {
        zUser = userLookups.byZaloId.get(targetZaloId.toLowerCase());
      } else if (cleanSub && userLookups.byZaloId.has(cleanSub.toLowerCase())) {
        zUser = userLookups.byZaloId.get(cleanSub.toLowerCase());
      } else if (lookupKey && userLookups.byId.has(lookupKey)) {
        zUser = userLookups.byId.get(lookupKey);
      } else if (lookupKey && lookupKey.length >= 8) {
        zUser = (zaloUsers || []).find((z) => {
          const zid = String(z?.zaloId || z?.zalo_id || "");
          return zid.length >= 8 && (zid.startsWith(lookupKey) || lookupKey.startsWith(zid));
        });
      }

      // 2.2. Tra theo tên không dấu nếu Sub ID là tên chữ (như HongPhuc)
      if (!zUser) {
        const normSub = normalizeStr(cleanSub || rawSubId);
        if (normSub && normSub.length >= 2 && !/^\d+$/.test(normSub)) {
          if (userLookups.byNormName.has(normSub)) {
            zUser = userLookups.byNormName.get(normSub);
          } else if (userLookups.byNormAcc.has(normSub)) {
            zUser = userLookups.byNormAcc.get(normSub);
          }
        }
      }

      if (zUser) {
        const zName = (zUser.zaloName || zUser.zalo_name || zUser.name || "").trim();
        const zAccName = (zUser.accountName || "").trim();
        const resolvedName = zName || zAccName;
        if (resolvedName && !resolvedName.toLowerCase().startsWith("zalo id") && !resolvedName.toLowerCase().startsWith("sub id")) {
          return {
            name: resolvedName,
            isAssigned: true,
            isZaloName: true,
            zaloId: zUser.zaloId || lookupKey,
            zaloUser: zUser,
            cleanSub,
          };
        }
      }

      // 2.3. Khớp tên zaloName lưu trên đơn
      if (orderObj.zaloName && !orderObj.zaloName.toLowerCase().startsWith("zalo id") && !orderObj.zaloName.toLowerCase().startsWith("sub id")) {
        return {
          name: orderObj.zaloName,
          isAssigned: true,
          isZaloName: true,
          zaloId: targetZaloId || cleanSub,
          cleanSub,
        };
      }

      // 2.4. Khớp User object nếu có
      if (orderObj.user) {
        const uZaloName = (orderObj.user.zaloName || "").trim();
        const uName = (orderObj.user.name || "").trim();
        const uEmail = (orderObj.user.email || "").trim();
        const displayName = uZaloName || (uName && !uName.startsWith("Khách Zalo ") ? uName : null) || uEmail;
        if (displayName) {
          return {
            name: displayName,
            isAssigned: true,
            isZaloName: true,
            zaloId: orderObj.user.zaloId || targetZaloId,
            cleanSub,
          };
        }
      }

      // 2.5. Sub ID định danh sạch
      const finalId = cleanSub || targetZaloId || rawSubId;
      if (finalId) {
        return {
          name: `Sub ID: ${finalId}`,
          isAssigned: true,
          isZaloName: false,
          zaloId: finalId,
          cleanSub,
        };
      }

      return { name: "Khách ẩn", isAssigned: false, isZaloName: false, zaloId: "", cleanSub: "" };
    },
    [userLookups, activeTenant?.slug, zaloUsers]
  );

  // Filter by Purchaser: tập hợp các ID đơn của thành viên được tìm kiếm (chuẩn luôn theo tên/ID)
  const matchedMemberOrderIds = useMemo(() => {
    if (!adminOrderSearchUser || !adminOrderSearchUser.trim()) return null;
    const qUser = adminOrderSearchUser.trim().toLowerCase();

    const matchedKeys = [];
    (zaloUsers || []).forEach((z) => {
      if (!z) return;
      const zZaloId = String(z.zaloId || z.zalo_id || "").trim().toLowerCase();
      const zName = String(z.zaloName || z.zalo_name || z.name || "").trim();
      const zAcc = String(z.accountName || "").trim();

      const matchId = Boolean(zZaloId && (zZaloId === qUser || (/^\d+$/.test(qUser) && qUser.length >= 8 && zZaloId.startsWith(qUser))));
      const matchName = matchesExactOrWords(zName, qUser);
      const matchAcc = matchesExactOrWords(zAcc, qUser);

      if (matchId || matchName || matchAcc) {
        matchedKeys.push(String(z.id || z.zaloId));
        if (z.zaloId) matchedKeys.push(String(z.zaloId));
        if (z.id) matchedKeys.push(String(z.id));
      }
    });

    if (matchedKeys.length === 0) return null;
    const set = new Set();
    matchedKeys.forEach((k) => {
      const w = memberWalletsMap.get(k) || memberWalletsMap.get(String(k));
      if (w && w.orderIdSet) {
        w.orderIdSet.forEach((id) => set.add(id));
      }
    });
    return set;
  }, [adminOrderSearchUser, zaloUsers, memberWalletsMap]);

  // Filter Orders
  const filteredOrders = targetOrders.filter((o) => {
    if (!o) return false;

    // Filter by Purchaser (Chuẩn luôn, không dùng LIKE substring)
    if (adminOrderSearchUser && adminOrderSearchUser.trim()) {
      const qUser = adminOrderSearchUser.trim().toLowerCase();

      const buyer = getOrderBuyerInfo(o);
      const buyerName = String(buyer?.name || "").trim();
      const buyerZaloId = String(buyer?.zaloId || o.zaloId || "").trim().toLowerCase();
      const cleanSub = String(buyer?.cleanSub || cleanTenantPrefix(o.subId || o.subId1, activeTenant?.slug) || "").trim();

      // 1. Khớp chuẩn xác hoặc trọn vẹn từ theo Tên người mua
      const matchBuyerName = matchesExactOrWords(buyerName, qUser);

      // 2. Khớp chuẩn xác theo Zalo ID người mua
      const matchZaloId = Boolean(
        buyerZaloId &&
        (buyerZaloId === qUser || (/^\d+$/.test(qUser) && qUser.length >= 8 && buyerZaloId.startsWith(qUser)))
      );

      // 3. Khớp chuẩn xác theo Clean Sub ID (đã loại bỏ tiền tố Kênh như thanhhang_, th_...)
      const matchSubId = Boolean(
        cleanSub &&
        matchesExactOrWords(cleanSub, qUser)
      );

      // 4. Khớp theo thông tin tài khoản ngân hàng / nick phụ
      const u = buyer?.zaloUser;
      const matchUserMeta = Boolean(
        u &&
        (
          matchesExactOrWords(u.accountName, qUser) ||
          String(u.accountNumber || "").trim() === qUser
        )
      );

      // 5. Khớp theo ID đơn thuộc thành viên trong ví
      const matchMemberOrders = Boolean(
        matchedMemberOrderIds &&
        (matchedMemberOrderIds.has(String(o.id)) || (o.orderId && matchedMemberOrderIds.has(String(o.orderId))))
      );

      if (!matchBuyerName && !matchZaloId && !matchSubId && !matchUserMeta && !matchMemberOrders) {
        return false;
      }
    }

    // Filter by Order ID (supports multiple IDs)
    if (adminOrderSearchId) {
      const ids = adminOrderSearchId.split(/[\n,;\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (ids.length > 0) {
        const orderIdLower = String(o.orderId || "").toLowerCase();
        const matched = ids.some((id) => orderIdLower.includes(id));
        if (!matched) return false;
      }
    }

    // Filter by Product Name
    if (adminOrderSearchProduct) {
      const qProd = adminOrderSearchProduct.toLowerCase();
      if (!o.productName || !o.productName.toLowerCase().includes(qProd)) return false;
    }

    // Filter by Status
    if (adminOrderFilterStatus && adminOrderFilterStatus !== "Tất cả") {
      const st = String(o.status || "").toLowerCase();
      const targetSt = adminOrderFilterStatus.toLowerCase();
      if (targetSt === "hoàn thành") {
        const isCompleted = !st.includes("chưa") && (st.includes("hoàn thành") || st.includes("completed") || st.includes("success") || st.includes("thành công") || st.includes("thanh toán"));
        if (!isCompleted) return false;
      } else if (targetSt === "chờ kiểm duyệt") {
        const isPending = st.includes("chờ") || st.includes("pending") || st.includes("xử lý") || st.includes("chưa");
        if (!isPending) return false;
      } else if (targetSt === "đã hủy") {
        const isCancelled = st.includes("hủy") || st.includes("cancel");
        if (!isCancelled) return false;
      } else {
        if (!st.includes(targetSt)) return false;
      }
    }

    // Filter by Date From
    if (adminOrderDateFrom) {
      const oDateStr = o.orderDate || o.createdAt;
      if (oDateStr) {
        const oDate = new Date(oDateStr);
        const fromDate = new Date(adminOrderDateFrom + "T00:00:00");
        if (oDate < fromDate) return false;
      }
    }

    // Filter by Date To
    if (adminOrderDateTo) {
      const oDateStr = o.orderDate || o.createdAt;
      if (oDateStr) {
        const oDate = new Date(oDateStr);
        const toDate = new Date(adminOrderDateTo + "T23:59:59");
        if (oDate > toDate) return false;
      }
    }

    // Filter by Payment Status (Đối chiếu App Script)
    if (adminOrderFilterPayment && adminOrderFilterPayment !== "Tất cả") {
      const isPaid = String(o.paymentStatus || "").toUpperCase() === "PAID";
      if (adminOrderFilterPayment === "PAID" && !isPaid) return false;
      if (adminOrderFilterPayment === "UNPAID" && isPaid) return false;
    }

    return true;
  });

  // Helper parse order timestamp safely for sorting
  const parseOrderTimeForSort = (o) => {
    if (!o) return 0;
    const val = o.orderDate || o.createdAt;
    if (!val) return o.id ? Number(o.id) || 0 : 0;
    if (typeof val === "number") return val;
    if (Array.isArray(val)) {
      const [y, m, d, h = 0, min = 0, s = 0] = val;
      return new Date(y, m - 1, d, h, min, s).getTime();
    }
    if (typeof val === "string") {
      const str = val.trim();
      if (str.includes("/")) {
        const parts = str.split(/[\s/:]+/);
        if (parts.length >= 3) {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const y = parseInt(parts[2], 10);
          const h = parts[3] ? parseInt(parts[3], 10) : 0;
          const min = parts[4] ? parseInt(parts[4], 10) : 0;
          const s = parts[5] ? parseInt(parts[5], 10) : 0;
          const time = new Date(y, m, d, h, min, s).getTime();
          if (!isNaN(time)) return time;
        }
      }
      const parsed = new Date(str).getTime();
      if (!isNaN(parsed)) return parsed;
    }
    return o.id ? Number(o.id) || 0 : 0;
  };

  // Sort filtered orders descending by order date (newest first)
  filteredOrders.sort((a, b) => {
    const timeA = parseOrderTimeForSort(a);
    const timeB = parseOrderTimeForSort(b);
    if (timeA !== timeB) return timeB - timeA;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });

  // Calculate order totals
  const totalRawSum = filteredOrders.reduce((sum, o) => sum + Math.round(Number(o.rawCommission || o.finalCommission || 0)), 0);
  const totalTaxSum = filteredOrders.reduce((sum, o) => {
    const raw = Math.round(Number(o.rawCommission || o.finalCommission || 0));
    return sum + Math.round(raw * (taxRate / 100));
  }, 0);
  const totalAfterTaxSum = Math.max(0, totalRawSum - totalTaxSum);
  const totalUserFinalSum = filteredOrders.reduce((sum, o) => {
    const raw = Math.round(Number(o.rawCommission || o.finalCommission || 0));
    const tax = Math.round(raw * (taxRate / 100));
    const afterTax = Math.max(0, raw - tax);
    return sum + Math.round(afterTax * (customerSplitRate / 100));
  }, 0);
  const totalAdminProfitSum = Math.max(0, totalAfterTaxSum - totalUserFinalSum);

  // Tính tổng hoa hồng cho các đơn hàng đang được tích chọn (đối chiếu App Script)
  const selectedOrdersList = orders.filter((o) => selectedOrderIds.has(o.id));
  const selectedUserFinalSum = selectedOrdersList.reduce((sum, o) => {
    const raw = Math.round(Number(o.rawCommission || o.finalCommission || 0));
    const tax = Math.round(raw * (taxRate / 100));
    const afterTax = Math.max(0, raw - tax);
    return sum + Math.round(afterTax * (customerSplitRate / 100));
  }, 0);
  const selectedRawSum = selectedOrdersList.reduce((sum, o) => sum + Math.round(Number(o.rawCommission || o.finalCommission || 0)), 0);

  const handleExportOrdersExcel = (platform = "Shopee") => {
    if (!filteredOrders || filteredOrders.length === 0) {
      showNotification("Không có dữ liệu đơn hàng phù hợp với bộ lọc để xuất!", "info");
      return;
    }

    const headers = [
      "STT",
      "Ngày đơn",
      "Mã đơn hàng",
      "Tên sản phẩm",
      "Người mua (Zalo ID)",
      "Trạng thái đơn hàng",
      "Hoa hồng thô (VNĐ)",
      `Thuế ${taxRate}% (VNĐ)`,
      "Hoa hồng sau thuế (VNĐ)",
      `Khách nhận ${customerSplitRate}% (VNĐ)`,
      `Admin giữ ${adminSplitRate}% (VNĐ)`,
    ];

    const cleanCell = (str) => `"${(str || "").toString().replace(/"/g, '""')}"`;

    const rows = filteredOrders.map((o, idx) => {
      const rawVal = Math.round(Number(o.rawCommission || o.finalCommission || 0));
      const taxVal = Math.round(rawVal * (taxRate / 100));
      const afterTaxVal = Math.max(0, rawVal - taxVal);
      const userFinalVal = Math.round(afterTaxVal * (customerSplitRate / 100));
      const adminProfitVal = Math.max(0, afterTaxVal - userFinalVal);

      const orderDateStr = o.orderDate ? new Date(o.orderDate).toLocaleDateString("vi-VN") : "";

      return [
        idx + 1,
        cleanCell(orderDateStr),
        cleanCell(o.orderId || ""),
        cleanCell(o.productName || ""),
        cleanCell(o.zaloName || o.zaloId || o.subId || "—"),
        cleanCell(o.status || "Hoàn thành"),
        rawVal,
        taxVal,
        afterTaxVal,
        userFinalVal,
        adminProfitVal,
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Bao_Cao_Don_Hang_${platform}_${activeTenant?.slug || "export"}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 relative w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-5 right-5 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`px-5 py-3.5 rounded-2xl shadow-xl border flex items-center gap-3 backdrop-blur-md font-bold text-xs max-w-md ${
            toast.type === "error"
              ? "bg-rose-500/95 text-white border-rose-400 shadow-rose-500/20"
              : toast.type === "info"
              ? "bg-sky-500/95 text-white border-sky-400 shadow-sky-500/20"
              : "bg-emerald-600/95 text-white border-emerald-400 shadow-emerald-600/20"
          }`}>
            <i className={`fa-solid ${toast.type === "error" ? "fa-circle-exclamation text-lg" : "fa-circle-check text-lg"}`}></i>
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-white/70 hover:text-white ml-2 text-sm cursor-pointer">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      )}

      {/* Warning banner if tenant is not selected or assigned */}
      {!activeTenant?.slug && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-3 shadow-2xs">
          <i className="fa-solid fa-triangle-exclamation text-xl text-amber-600 shrink-0"></i>
          <div>
            <p className="font-extrabold text-sm text-amber-950">Chưa xác định Kênh Quản Trị Trưởng Nhóm</p>
            <p className="font-normal text-slate-700 text-xs mt-0.5">
              Tài khoản của bạn chưa được gán Kênh Trưởng Nhóm cụ thể. Vui lòng chọn Kênh từ menu bên phải hoặc liên hệ Super Admin để kiểm tra phân quyền.
            </p>
          </div>
        </div>
      )}

      {/* ===================== 1. HEADER ===================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full sm:w-auto gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-lg sm:text-xl font-black shadow-md shadow-purple-500/20 shrink-0">
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 font-display tracking-tight">
                Bảng Quản Trị
              </h1>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[200px] sm:max-w-none">
                Dành riêng cho Admin — {groupDisplayName} System
              </p>
            </div>
          </div>
        </div>

        {/* Quick Group Switcher for Multi-tenant mode */}
        {!APP_CONFIG.isStandalone && (user?.role === "SUPER_ADMIN" || !activeTenant?.slug) && availableTenants.length > 0 && (
          <div className="flex items-center gap-2 bg-white border border-slate-200 shadow-2xs px-3.5 py-1.5 rounded-xl w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
              <i className="fa-solid fa-users-viewfinder text-orange-500"></i>
              {user?.role === "SUPER_ADMIN" ? "Lọc Trưởng Nhóm:" : "Chọn Kênh:"}
            </span>
            <select
              value={activeTenant?.slug || ""}
              onChange={(e) => {
                const t = availableTenants.find((item) => item.slug === e.target.value);
                if (t) onSelectTenant(t);
              }}
              className="bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs px-2.5 py-1 rounded-lg border border-slate-200 outline-none cursor-pointer font-sans truncate max-w-[200px]"
            >
              <option value="">-- Chọn 1 Kênh Đối Tác --</option>
              {availableTenants.map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.name} (/{t.slug})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Khóa kênh hiển thị cho Trưởng Nhóm khi đã có activeTenant */}
        {!APP_CONFIG.isStandalone && user?.role === "TENANT_ADMIN" && activeTenant?.slug && (
          <div className="flex items-center gap-2 bg-white border border-slate-200 shadow-2xs px-3.5 py-1.5 rounded-xl">
            <i className="fa-solid fa-store text-orange-500 text-xs"></i>
            <span className="text-xs font-medium text-slate-600">
              Kênh quản trị: <strong className="font-bold text-slate-900">{groupDisplayName}</strong>
            </span>
          </div>
        )}
      </div>

      {/* ===================== 2. MODERN CLEAN TAB BAR ===================== */}
      <div className="space-y-2.5">
        {/* HÀNG 1: THIẾT LẬP KÊNH */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 px-1">
            <i className="fa-solid fa-gear text-slate-400 text-[10px]"></i>
            <span>Thiết lập:</span>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5">
            {[
              { key: "settings", icon: "fa-solid fa-gear", label: "Cấu hình" },
              { key: "templates", icon: "fa-solid fa-robot", label: "Mẫu Tin Nhắn Bot" },
              { key: "zalo_bot", icon: "fa-solid fa-qrcode", label: `Kết Nối Bot Zalo (${tenantBots.length})` },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-orange-500 text-white shadow-sm shadow-orange-500/20"
                      : "bg-white text-slate-600 hover:text-orange-600 hover:bg-orange-50/50 border border-slate-200/90 shadow-2xs"
                  }`}
                >
                  <i className={tab.icon}></i>
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* HÀNG 2: DỮ LIỆU & ĐỐI SOÁT */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-0.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 px-1">
            <i className="fa-solid fa-chart-pie text-slate-400 text-[10px]"></i>
            <span>Dữ liệu:</span>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5">
            {[
              { key: "overview", icon: "fa-solid fa-chart-pie", label: "Tổng quan" },
              { key: "shopee", icon: "fa-solid fa-bag-shopping", label: `Đơn Shopee (${shopeeOrders.length})` },
              ...(isTiktokEnabled ? [{ key: "tiktok", icon: "fa-brands fa-tiktok", label: `Đơn TikTok (${tiktokOrders.length})` }] : []),
              { key: "payouts", icon: "fa-solid fa-money-bill-transfer", label: "Lệnh Rút tiền", badge: pendingPayouts.length },
              { key: "zalo_users", icon: "fa-solid fa-users", label: `Thành viên (${zaloUsers.length})` },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-orange-500 text-white shadow-sm shadow-orange-500/20"
                      : "bg-white text-slate-600 hover:text-orange-600 hover:bg-orange-50/50 border border-slate-200/90 shadow-2xs"
                  }`}
                >
                  <i className={tab.icon}></i>
                  <span className="truncate">{tab.label}</span>
                  {tab.badge > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
          <span className="ml-3 text-sm font-bold text-slate-500">Đang tải dữ liệu Kênh {groupDisplayName}...</span>
        </div>
      )}

      {/* ===================== TAB 1: TỔNG QUAN (STATS) ===================== */}
      {activeTab === "overview" && !isLoading && (
        <div className="space-y-6">
          {/* HOẠT ĐỘNG CHUNG */}
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2 font-display">
              <i className="fa-solid fa-chart-line text-orange-500"></i>
              <span>Hoạt động chung</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Tổng thành viên Zalo", value: zaloUsers.length, icon: "fa-users" },
                { label: "Tổng đơn hàng", value: orders.length, icon: "fa-boxes-stacked" },
                { label: "Yêu cầu rút chờ duyệt", value: pendingPayouts.length + " lệnh", icon: "fa-clock" },
                { label: "Tiền rút chờ duyệt", value: formatMoney(totalPendingAmount), icon: "fa-money-bill-wave" },
              ].map((card, i) => (
                <div key={i} className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center text-lg shadow-inner">
                    <i className={`fa-solid ${card.icon}`}></i>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">{card.label}</p>
                  <p className="text-xl font-black text-slate-900 font-display">{card.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* TÀI CHÍNH SHOPEE & TIKTOK THEO CHẾ ĐỘ CHỌN */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2 font-display">
                <i className="fa-solid fa-coins text-orange-500"></i>
                <span>Tài chính Shopee {isTiktokEnabled ? "& TikTok " : ""}
                  {overviewFinanceMode === "all" && `(Tất cả ${stats?.validOrdersCount ?? orders.length} đơn hợp lệ)`}
                  {overviewFinanceMode === "completed" && `(Đã đối soát hoàn thành: ${stats?.completedOrdersCount ?? 0} đơn)`}
                  {overviewFinanceMode === "pending" && `(Đang chờ đối soát: ${stats?.pendingOrdersCount ?? 0} đơn)`}
                </span>
              </h3>

              {/* Bộ lọc chế độ xem tài chính */}
              <div className="inline-flex bg-slate-100 p-1 rounded-2xl border border-slate-200/80 gap-1 text-[11px] font-bold self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setOverviewFinanceMode("all")}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                    overviewFinanceMode === "all"
                      ? "bg-white text-slate-900 shadow-xs font-black"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <i className="fa-solid fa-layer-group text-orange-500"></i>
                  <span>Tất cả đơn ({stats?.validOrdersCount ?? orders.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOverviewFinanceMode("completed")}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                    overviewFinanceMode === "completed"
                      ? "bg-emerald-600 text-white shadow-xs font-black"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <i className="fa-solid fa-circle-check"></i>
                  <span>Đã hoàn thành ({stats?.completedOrdersCount ?? 0})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOverviewFinanceMode("pending")}
                  className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                    overviewFinanceMode === "pending"
                      ? "bg-amber-500 text-white shadow-xs font-black"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <i className="fa-solid fa-clock"></i>
                  <span>Chờ đối soát ({stats?.pendingOrdersCount ?? 0})</span>
                </button>
              </div>
            </div>

            {/* Tính toán giá trị tương ứng */}
            {(() => {
              let rawVal = stats?.totalRawCommission ?? totalRawSum;
              let taxVal = stats?.totalTaxAmount ?? totalTaxSum;
              let afterTaxVal = stats?.totalAfterTaxCommission ?? totalAfterTaxSum;
              let userVal = stats?.totalUserCommission ?? totalUserFinalSum;
              let adminVal = stats?.totalAdminProfit ?? totalAdminProfitSum;

              if (overviewFinanceMode === "completed") {
                rawVal = stats?.completedRawCommission ?? 0;
                taxVal = stats?.completedTaxAmount ?? 0;
                afterTaxVal = stats?.completedAfterTaxCommission ?? 0;
                userVal = stats?.completedUserCommission ?? 0;
                adminVal = stats?.completedAdminProfit ?? 0;
              } else if (overviewFinanceMode === "pending") {
                rawVal = stats?.pendingRawCommission ?? 0;
                taxVal = stats?.pendingTaxAmount ?? 0;
                afterTaxVal = stats?.pendingAfterTaxCommission ?? 0;
                userVal = stats?.pendingUserCommission ?? 0;
                adminVal = stats?.pendingAdminProfit ?? 0;
              }

              return (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { label: "1. Hoa hồng thô (Sàn trả)", value: formatMoney(rawVal), icon: "fa-file-invoice-dollar", color: "orange" },
                    { label: `2. Thuế thu nhập (${taxRate}%)`, value: formatMoney(taxVal), icon: "fa-percent", color: "rose" },
                    { label: `3. Hoa hồng sau thuế (${100 - taxRate}%)`, value: formatMoney(afterTaxVal), icon: "fa-scale-balanced", color: "slate" },
                    { label: `4. Thành viên nhận (${customerSplitRate}%)`, value: formatMoney(userVal), icon: "fa-user-tag", color: "amber" },
                    { label: `5. Admin giữ lại (${adminSplitRate}%)`, value: formatMoney(adminVal), icon: "fa-briefcase", color: "purple" },
                  ].map((card, i) => (
                    <div key={i} className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-2xs space-y-1.5 hover:shadow-xs transition">
                      <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-xs shadow-inner">
                        <i className={`fa-solid ${card.icon}`}></i>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">{card.label}</p>
                      <p className="text-base font-black text-slate-900 font-mono mt-1">{card.value}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ===================== TAB 2: QUẢN LÝ BOT ZALO (FLAT LIGHT SAAS) ===================== */}
      {activeTab === "zalo_bot" && !isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <i className="fa-solid fa-qrcode text-orange-500"></i>
              <span>Quản Lý Nick Bot Zalo (Kênh {groupDisplayName})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Mỗi Kênh Trưởng Nhóm kết nối 1 Nick Zalo Phụ làm Bot tự động 24/7.
            </p>
          </div>

          {tenantBots.length === 0 ? (
            /* CHƯA KẾT NỐI */
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center text-2xl mx-auto shadow-sm">
                <i className="fa-solid fa-qrcode"></i>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">Kênh Chưa Được Kết Nối Nick Bot Zalo</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Mở ứng dụng <strong>Zalo trên điện thoại</strong> của Nick Phụ ➔ Bấm nút bên dưới để hiện mã QR và quét đăng nhập.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowQrModal(true);
                  handleGenerateQr();
                }}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer inline-flex items-center gap-2 transition"
              >
                <i className="fa-solid fa-plus text-xs"></i>
                <span>Kết Nối Nick Bot Zalo Mới & Quét QR</span>
              </button>
            </div>
          ) : (
            /* ĐÃ KẾT NỐI */
            tenantBots.map((bot) => (
              <div key={bot.id} className="bg-slate-50/70 rounded-xl p-5 border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-orange-500 text-white font-bold text-xl flex items-center justify-center shrink-0">
                      {bot.zaloName ? bot.zaloName.charAt(0).toUpperCase() : "B"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900">{bot.zaloName || bot.botName}</h4>
                        <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                          bot.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          {bot.status === "ACTIVE" ? "🟢 Đang hoạt động 24/7" : "⏳ Chờ quét QR"}
                        </span>
                      </div>
                      {bot.zaloId && bot.zaloId !== "Đang cập nhật..." && (
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Zalo ID: <span className="font-mono text-slate-700 font-semibold">{bot.zaloId}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDisconnectBot(bot.id)}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 rounded-xl font-bold text-xs cursor-pointer transition flex items-center gap-1.5 self-start sm:self-auto shrink-0"
                  >
                    <i className="fa-solid fa-power-off text-[11px]"></i>
                    <span>Ngắt kết nối / Đổi Nick Khác</span>
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
                  <span>Phân loại: <strong className="text-slate-700 font-medium">{bot.botName || `Bot Phụ Zalo (${groupDisplayName})`}</strong></span>
                  <span>Ngày kết nối: <strong className="text-slate-700 font-medium">{bot.createdAt ? formatDate(bot.createdAt) : "Vừa xong"}</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ===================== TAB 3: THÀNH VIÊN (LỲ-STYLE) ===================== */}
      {activeTab === "zalo_users" && !isLoading && (
        <div className="space-y-4">
          {/* Search Header */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => {
                  setMemberSearch(e.target.value);
                  setMemberPage(1);
                }}
                placeholder="Tìm kiếm thành viên (Tên, Zalo ID, Ngân hàng, STK, Chủ TK)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-bold text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition"
              />
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-3.5 text-slate-400 text-xs"></i>
            </div>

            <span className="text-xs font-bold text-slate-500">
              Tổng số:{" "}
              <span className="text-orange-600 font-extrabold">{filteredMembers.length}</span>{" "}
              thành viên
            </span>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
              <i className="fa-solid fa-users text-3xl mb-3 block text-slate-300"></i>
              <p className="font-bold text-sm">Không tìm thấy thành viên phù hợp</p>
            </div>
          ) : (
            <>
              {/* Members Table */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b-2 border-slate-200">
                        <th className="px-4 py-3.5 font-black text-slate-700 whitespace-nowrap">Tên thành viên</th>
                        <th className="px-4 py-3.5 font-black text-slate-700 whitespace-nowrap">Zalo ID</th>
                        <th className="px-4 py-3.5 font-black text-slate-700 whitespace-nowrap min-w-[200px]">Tài khoản nhận tiền</th>
                        <th className="px-4 py-3.5 font-black text-slate-700 whitespace-nowrap text-right">Chờ xử lý</th>
                        <th className="px-4 py-3.5 font-black text-slate-700 whitespace-nowrap text-right">Tích lũy hoàn thành</th>
                        <th className="px-4 py-3.5 font-black text-slate-700 whitespace-nowrap text-right">Khả dụng rút</th>
                        <th className="px-4 py-3.5 font-black text-slate-700 whitespace-nowrap text-right">Đã rút</th>
                        <th className="px-4 py-3.5 font-black text-slate-700 whitespace-nowrap text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentMembers.map((u) => {
                        const wallet = memberWalletsMap.get(u.id || u.zaloId) || {
                          pendingCommission: 0,
                          completedCommission: 0,
                          availableBalance: 0,
                          totalWithdrawn: 0,
                        };
                        const bankN = u.bankName || u.bank_name || "";
                        const accNum = u.accountNumber || u.account_number || "";
                        const accName = u.accountName || u.account_name || "";
                        return (
                          <tr key={u.id || u.zaloId} className="border-b border-slate-100 hover:bg-orange-50/30 transition">
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="font-black text-slate-900 text-sm truncate block max-w-[170px]" title={u.zaloName || u.zalo_name}>
                                {u.zaloName || u.zalo_name || "Thành viên Zalo"}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <code className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                                {u.zaloId || u.zalo_id || "—"}
                              </code>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap min-w-[130px]">
                              <div className="flex items-center justify-between gap-2">
                                {bankN ? (
                                  <div className="min-w-0">
                                    <div className="font-black text-slate-800 text-xs">
                                      {bankN}
                                    </div>
                                    {accNum && (
                                      <div className="text-[11px] font-mono text-slate-600 font-bold mt-0.5 whitespace-nowrap flex items-center gap-1">
                                        <span className="text-slate-400 font-normal">STK:</span>
                                        <span>{accNum}</span>
                                      </div>
                                    )}
                                    {accName && (
                                      <div className="mt-0.5">
                                        <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded font-extrabold uppercase whitespace-nowrap tracking-wide inline-block">
                                          {accName}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">Chưa lưu STK</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setEditingMemberBank({
                                    zaloId: u.zaloId || u.zalo_id,
                                    zaloName: u.zaloName || u.zalo_name || u.name,
                                    bankName: bankN,
                                    accountNumber: accNum,
                                    accountName: accName
                                  })}
                                  className="p-1.5 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition cursor-pointer shrink-0"
                                  title="Sửa thông tin STK"
                                >
                                  <i className="fa-solid fa-pen text-[11px]"></i>
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono font-bold text-amber-600 whitespace-nowrap">
                              {formatMoney(wallet.pendingCommission)}
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono font-black text-slate-800 whitespace-nowrap">
                              {formatMoney(wallet.completedCommission)}
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                              {formatMoney(wallet.availableBalance)}
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-500 whitespace-nowrap">
                              {formatMoney(wallet.totalWithdrawn)}
                            </td>
                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingMemberBank({
                                    zaloId: u.zaloId || u.zalo_id,
                                    zaloName: u.zaloName || u.zalo_name || u.name,
                                    bankName: bankN,
                                    accountNumber: accNum,
                                    accountName: accName
                                  })}
                                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 border border-blue-200/80 rounded-xl text-[11px] font-bold transition shadow-2xs cursor-pointer inline-flex items-center gap-1"
                                  title="Sửa thông tin STK nhận tiền"
                                >
                                  <i className="fa-solid fa-pen-to-square text-[10px]"></i> Sửa STK
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedMember(u)}
                                  className="px-2.5 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-[11px] font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-1"
                                  title="Xem chi tiết ví & đơn hàng"
                                >
                                  <i className="fa-solid fa-eye text-[10px]"></i> Chi tiết
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMember(u)}
                                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200/80 rounded-xl text-[11px] font-bold transition shadow-2xs cursor-pointer inline-flex items-center gap-1"
                                  title="Xóa thành viên khỏi danh sách"
                                >
                                  <i className="fa-regular fa-trash-can text-[10px]"></i> Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {currentMembers.length > 0 && (
                      <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-xs sticky bottom-0 z-10 shadow-xs">
                        <tr className="bg-slate-100/95">
                          <td colSpan="3" className="px-4 py-3.5 text-slate-900 font-black">
                            <div className="flex items-center gap-1.5">
                              <span className="text-base">📊</span>
                              <span>
                                Tổng cộng trang {currentMemberPage}{" "}
                                <span className="text-[11px] font-semibold text-slate-500">
                                  ({currentMembers.length} thành viên)
                                </span>
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-black text-amber-600 whitespace-nowrap">
                            {formatMoney(pageTotals.pending)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-black text-slate-800 whitespace-nowrap">
                            {formatMoney(pageTotals.completed)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-black text-emerald-600 whitespace-nowrap">
                            {formatMoney(pageTotals.available)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-black text-slate-500 whitespace-nowrap">
                            {formatMoney(pageTotals.withdrawn)}
                          </td>
                          <td className="px-4 py-3.5 text-center text-slate-400 font-bold text-[11px] whitespace-nowrap">
                            Trang {currentMemberPage}/{totalMemberPages}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Pagination */}
                {totalMemberPages > 1 && (
                  <div className="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium">
                    <div className="text-slate-500">
                      Hiển thị{" "}
                      <strong className="text-slate-800">
                        {(currentMemberPage - 1) * memberItemsPerPage + 1} -{" "}
                        {Math.min(currentMemberPage * memberItemsPerPage, filteredMembers.length)}
                      </strong>{" "}
                      trong tổng số <strong className="text-orange-600">{filteredMembers.length}</strong> thành viên (Trang {currentMemberPage}/{totalMemberPages})
                    </div>

                    <div className="flex items-center gap-1 font-bold">
                      <button
                        onClick={() => setMemberPage(1)}
                        disabled={currentMemberPage === 1}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer transition flex items-center justify-center text-xs"
                        title="Trang đầu"
                      >
                        «
                      </button>
                      <button
                        onClick={() => setMemberPage((p) => Math.max(1, p - 1))}
                        disabled={currentMemberPage === 1}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer transition flex items-center justify-center text-xs"
                        title="Trang trước"
                      >
                        ‹
                      </button>

                      {Array.from({ length: totalMemberPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalMemberPages || Math.abs(p - currentMemberPage) <= 2)
                        .map((p, idx, arr) => (
                          <React.Fragment key={p}>
                            {idx > 0 && arr[idx - 1] !== p - 1 && (
                              <span className="px-1 text-slate-400">...</span>
                            )}
                            <button
                              onClick={() => setMemberPage(p)}
                              className={`w-8 h-8 rounded-xl text-xs font-black transition cursor-pointer ${
                                currentMemberPage === p
                                  ? "bg-orange-600 text-white shadow-xs"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              }`}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        ))}

                      <button
                        onClick={() => setMemberPage((p) => Math.min(totalMemberPages, p + 1))}
                        disabled={currentMemberPage === totalMemberPages}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer transition flex items-center justify-center text-xs"
                        title="Trang sau"
                      >
                        ›
                      </button>
                      <button
                        onClick={() => setMemberPage(totalMemberPages)}
                        disabled={currentMemberPage === totalMemberPages}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer transition flex items-center justify-center text-xs"
                        title="Trang cuối"
                      >
                        »
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Member Detail Modal */}
          {selectedMember && (
            <MemberDetailModal
              member={selectedMember}
              orders={memberWalletsMap.get(selectedMember.id || selectedMember.zaloId)?.orders || orders}
              payouts={memberWalletsMap.get(selectedMember.id || selectedMember.zaloId)?.payouts || payouts}
              onClose={() => setSelectedMember(null)}
              onDelete={() => handleDeleteMember(selectedMember)}
              apiRoot={apiRoot}
              activeTenant={{
                ...activeTenant,
                customerSplitRate,
                taxRate,
                holdingDays,
              }}
              formatMoney={formatMoney}
              formatDate={formatDate}
              authHeaders={authHeaders}
              onOrdersUpdated={fetchTenantData}
              showNotification={showNotification}
            />
          )}
        </div>
      )}

      {/* ===================== TAB 4: RÚT TIỀN (PAYOUTS) ===================== */}
      {activeTab === "payouts" && !isLoading && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 font-display">Yêu Cầu Rút Tiền</h3>
            <span className="text-xs font-bold text-slate-400">Chờ duyệt: {pendingPayouts.length} lệnh</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 text-[11px] font-black uppercase tracking-wider border-b border-slate-100">
                  <th className="p-3.5 text-center">Mã ID / Lệnh</th>
                  <th className="p-3.5">Thành viên</th>
                  <th className="p-3.5 text-right">Số tiền rút</th>
                  <th className="p-3.5">Thông tin Chuyển Khoản STK</th>
                  <th className="p-3.5 text-center">Trạng thái</th>
                  <th className="p-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">Chưa có yêu cầu rút tiền nào.</td>
                  </tr>
                ) : (
                  payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-orange-50 text-orange-800 font-mono font-black rounded-xl text-xs inline-block">
                          #{p.id}
                        </span>
                        <p className="text-[10px] text-orange-600 font-mono font-bold mt-1">/duyet_{p.id}</p>
                      </td>
                      <td className="p-3.5">
                        <p className="font-bold text-slate-900">{p.zaloName || p.zaloId}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{formatDate(p.createdAt)}</p>
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-rose-600 text-sm">
                        {formatMoney(p.amount)}
                      </td>
                      <td className="p-3.5 font-mono">
                        <p className="font-bold text-slate-900">{p.bankName} — {p.accountNumber}</p>
                        <p className="text-[11px] text-slate-500">{p.accountName}</p>
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className={`text-xs font-bold inline-flex items-center gap-1 ${
                          p.status === "COMPLETED"
                            ? "text-emerald-600"
                            : p.status === "REJECTED"
                            ? "text-rose-600"
                            : "text-amber-600 animate-pulse"
                        }`}>
                          <i className={`fa-solid ${p.status === "COMPLETED" ? "fa-circle-check" : p.status === "REJECTED" ? "fa-circle-xmark" : "fa-clock"}`}></i>
                          <span>{p.status === "COMPLETED" ? "Đã duyệt" : p.status === "REJECTED" ? "Từ chối" : "Chờ duyệt"}</span>
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                        {p.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleApprovePayout(p.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs cursor-pointer shadow-xs"
                            >
                              Duyệt Đã CK
                            </button>
                            <button
                              onClick={() => handleRejectPayout(p.id)}
                              className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl font-bold text-xs cursor-pointer"
                            >
                              Từ chối
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== TAB 5 & 6: ĐƠN SHOPEE & TIKTOK ===================== */}
      {(activeTab === "shopee" || activeTab === "tiktok") && !isLoading && (
        <div className="space-y-6">
          {/* BANNER TIKTOK SHOP - NỀN SÁNG ĐỒNG BỘ MÀU SẮC GIAO DIỆN MÀU ĐEN SANG TRỌNG */}
          {activeTab === "tiktok" && (
            <div className="bg-gradient-to-br from-slate-100 via-slate-50 to-white rounded-3xl p-5 sm:p-6 text-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-200/90">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center text-2xl shrink-0 shadow-md shadow-slate-900/20">
                  <i className="fa-brands fa-tiktok"></i>
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-wide text-slate-900 font-display">
                    Quản lý Đơn Hàng TikTok Shop — Kênh {groupDisplayName}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                <button
                  type="button"
                  onClick={handleSyncTiktokManual}
                  disabled={isSyncingTiktok}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-2xl text-xs font-black transition flex items-center gap-2 shadow-md shadow-slate-900/20 cursor-pointer disabled:opacity-50"
                >
                  {isSyncingTiktok ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Đang đồng bộ...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-arrows-rotate"></i> Đồng bộ đơn TikTok ngay
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {tiktokSyncResult && activeTab === "tiktok" && (
            <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 ${tiktokSyncResult.success ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
              <div className="flex items-center gap-2.5">
                <i className={`fa-solid ${tiktokSyncResult.success ? "fa-circle-check text-emerald-600" : "fa-circle-exclamation text-rose-600"} text-base`}></i>
                <span>{tiktokSyncResult.message}</span>
              </div>
              <button onClick={() => setTiktokSyncResult(null)} className="text-xs opacity-60 hover:opacity-100">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          )}
          {/* EMBEDDED IMPORT BOX FOR SHOPEE/TIKTOK */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-black text-slate-900 font-display flex items-center gap-2">
                <i className="fa-solid fa-file-import text-orange-500"></i>
                <span>IMPORT BÁO CÁO ĐỐI SOÁT {activeTab === "tiktok" ? "TIKTOK SHOP" : "SHOPEE"} (CSV/EXCEL)</span>
              </h3>
              <button
                type="button"
                onClick={() => handleDeleteAllOrders(activeTab === "tiktok" ? "tiktok" : "shopee")}
                disabled={isDeletingAllOrders}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 text-[11px] font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title={`Xóa đơn hàng ${activeTab === "tiktok" ? "TikTok" : "Shopee"} gần đây (chỉ xóa tháng hiện tại và 2 tháng gần nhất, tự động bảo vệ an toàn các đơn lịch sử cũ hơn)`}
              >
                {isDeletingAllOrders ? (
                  <><i className="fa-solid fa-spinner fa-spin"></i> Đang xóa...</>
                ) : (
                  <><i className="fa-solid fa-trash-can"></i> Xóa Đơn (3 tháng gần nhất)</>
                )}
              </button>
            </div>

            {!importFile ? (
              <div className="relative border-2 border-dashed border-orange-200 hover:border-orange-400 bg-orange-50/30 hover:bg-orange-50/60 rounded-2xl p-5 sm:p-6 transition cursor-pointer group flex flex-col items-center justify-center text-center">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setImportFile(e.target.files[0]);
                      setImportResult(null);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pointer-events-none">
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition shadow-xs">
                    <i className="fa-solid fa-cloud-arrow-up"></i>
                  </div>
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                      <span className="text-sm font-black text-slate-800">
                        Chọn hoặc kéo thả file báo cáo đối soát {activeTab === "tiktok" ? "TikTok Shop" : "Shopee"}
                      </span>
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-black rounded-md">
                        .csv, .xlsx, .xls
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                      Hệ thống sẽ tự động quét cột <strong>Mã đơn hàng</strong> và <strong>Sub ID / Mã phụ</strong> để liên kết chính xác hoa hồng cho Kênh {groupDisplayName}.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-orange-50/80 via-amber-50/50 to-orange-50/80 border border-orange-200/90 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-xl shrink-0 shadow-md shadow-emerald-500/20">
                    <i className="fa-solid fa-file-excel"></i>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md shrink-0">
                        File đã sẵn sàng
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {(importFile.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <p className="text-sm font-black text-slate-900 truncate mt-0.5" title={importFile.name}>
                      {importFile.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
                  <label className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs">
                    <i className="fa-solid fa-arrow-rotate-right text-slate-400"></i>
                    <span>Đổi file</span>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setImportFile(e.target.files[0]);
                          setImportResult(null);
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setImportFile(null);
                      setImportResult(null);
                    }}
                    disabled={isImporting}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-400 text-xs transition cursor-pointer disabled:opacity-50"
                    title="Hủy chọn file này"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>

                  <button
                    type="button"
                    onClick={handleUploadExcel}
                    disabled={isImporting}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                      isImporting
                        ? "bg-orange-300 text-white cursor-not-allowed shadow-none"
                        : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/25 active:scale-[0.98]"
                    }`}
                  >
                    {isImporting ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        <span>Đang nạp dữ liệu...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-file-import"></i>
                        <span>Bắt đầu Import File Ngay</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {importResult && (
              <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 ${importResult.success ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
                <i className={`fa-solid ${importResult.success ? "fa-circle-check text-emerald-600" : "fa-circle-exclamation text-rose-600"} text-base shrink-0`}></i>
                <span>{importResult.message}</span>
              </div>
            )}
          </div>

          {/* LỲ-STYLE SEARCH & FILTER BAR */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Người mua
                </label>
                <input
                  type="text"
                  value={adminOrderSearchUser}
                  onChange={(e) => setAdminOrderSearchUser(e.target.value)}
                  placeholder="Tên / Email / Sub ID..."
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 text-xs font-bold text-slate-800 outline-none focus:border-orange-500 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Mã đơn hàng
                  </label>
                  {adminOrderSearchId.trim() && (
                    <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.2 rounded border border-orange-100">
                      {adminOrderSearchId.split(/[\n,;\s]+/).filter(Boolean).length} mã
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={adminOrderSearchId}
                    onChange={(e) => setAdminOrderSearchId(e.target.value)}
                    placeholder="Nhập hoặc dán mã đơn..."
                    className="w-full h-10 bg-slate-50 border border-slate-200 rounded-2xl pl-3.5 pr-9 text-xs font-bold text-slate-800 outline-none focus:border-orange-500 transition font-mono truncate"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMultiIdBox(!showMultiIdBox)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-orange-500 text-xs transition cursor-pointer"
                    title="Mở khung dán danh sách nhiều mã đơn"
                  >
                    <i className="fa-solid fa-paste"></i>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Tên sản phẩm
                </label>
                <input
                  type="text"
                  value={adminOrderSearchProduct}
                  onChange={(e) => setAdminOrderSearchProduct(e.target.value)}
                  placeholder="Tên SP..."
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 text-xs font-bold text-slate-800 outline-none focus:border-orange-500 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Trạng thái
                </label>
                <select
                  value={adminOrderFilterStatus}
                  onChange={(e) => {
                    setAdminOrderFilterStatus(e.target.value);
                    setAdminOrderPage(1);
                  }}
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 text-xs font-bold text-slate-800 outline-none focus:border-orange-500 transition cursor-pointer"
                >
                  <option value="Tất cả">Tất cả trạng thái</option>
                  <option value="Hoàn thành">Hoàn thành</option>
                  <option value="Chờ kiểm duyệt">Chờ kiểm duyệt</option>
                  <option value="Đã hủy">Đã hủy</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Thanh toán (App Script)
                </label>
                <select
                  value={adminOrderFilterPayment}
                  onChange={(e) => {
                    setAdminOrderFilterPayment(e.target.value);
                    setAdminOrderPage(1);
                  }}
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 text-xs font-bold text-slate-800 outline-none focus:border-orange-500 transition cursor-pointer"
                >
                  <option value="Tất cả">Tất cả thanh toán</option>
                  <option value="PAID">✅ Đã thanh toán</option>
                  <option value="UNPAID">⏳ Chưa thanh toán</option>
                </select>
              </div>
            </div>

            {/* Expandable Multi-ID Textarea */}
            {(showMultiIdBox || (adminOrderSearchId && adminOrderSearchId.includes("\n"))) && (
              <div className="p-3.5 bg-orange-50/60 border border-orange-200 rounded-2xl space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-orange-800 flex items-center gap-1.5 text-[11px]">
                    <i className="fa-solid fa-list-check"></i> Dán danh sách nhiều mã đơn (mỗi dòng 1 mã, copy từ Excel)
                  </span>
                  <button
                    type="button"
                    onClick={() => setAdminOrderSearchId("")}
                    className="text-[10px] text-rose-500 font-bold hover:underline cursor-pointer"
                  >
                    Xóa tất cả mã
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={adminOrderSearchId}
                  onChange={(e) => setAdminOrderSearchId(e.target.value)}
                  placeholder={`Dán danh sách mã từ Excel:\n2608139NMQT2PF\n240814A1B2C3...`}
                  className="w-full bg-white border border-orange-200 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-800 outline-none focus:border-orange-500 transition"
                />
              </div>
            )}

            {/* Date range & Reset filter */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase">Từ:</span>
                <input
                  type="date"
                  value={adminOrderDateFrom}
                  onChange={(e) => setAdminOrderDateFrom(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
                />
                <span className="text-[10px] font-black text-slate-400 uppercase">Đến:</span>
                <input
                  type="date"
                  value={adminOrderDateTo}
                  onChange={(e) => setAdminOrderDateTo(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none"
                />
              </div>

              <button
                onClick={() => {
                  setAdminOrderSearchUser("");
                  setAdminOrderSearchId("");
                  setAdminOrderSearchProduct("");
                  setAdminOrderFilterStatus("Tất cả");
                  setAdminOrderFilterPayment("Tất cả");
                  setAdminOrderDateFrom("");
                  setAdminOrderDateTo("");
                }}
                className="text-xs text-rose-500 font-bold hover:underline cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>

          {/* RESULTS CONTROL HEADER */}
          <div className="flex items-center justify-between flex-wrap gap-2 px-1">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-xs text-slate-500 font-medium">
                Hiển thị{" "}
                <span className="font-bold text-slate-800">
                  {filteredOrders.length > 0 ? (adminOrderPage - 1) * 50 + 1 : 0} - {Math.min(adminOrderPage * 50, filteredOrders.length)}
                </span>{" "}
                / Kết quả {activeTab === "tiktok" ? "TikTok" : "Shopee"}: <strong className="text-orange-600">{filteredOrders.length} đơn</strong>
              </p>

              {filteredOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleSelectAllFiltered(filteredOrders)}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <i className="fa-solid fa-list-check text-xs"></i>
                  {filteredOrders.every((o) => selectedOrderIds.has(o.id))
                    ? "Bỏ chọn tất cả"
                    : `Chọn tất cả ${filteredOrders.length} đơn đang lọc`}
                </button>
              )}
            </div>

            <button
              onClick={() => handleExportOrdersExcel(activeTab === "tiktok" ? "TikTok" : "Shopee")}
              className={`px-4 py-2 text-white rounded-2xl text-xs font-black transition flex items-center gap-2 shadow-md cursor-pointer ${
                activeTab === "tiktok"
                  ? "bg-slate-900 hover:bg-black shadow-slate-900/20"
                  : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/20"
              }`}
            >
              <i className="fa-solid fa-file-excel text-sm"></i> Xuất Excel {activeTab === "tiktok" ? "TikTok" : "Shopee"} ({filteredOrders.length})
            </button>
          </div>

          {/* TABLE OF ORDERS (BẢNG HÀNG NGANG ĐỒNG BỘ TRÊN ĐIỆN THOẠI VÀ LAPTOP) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden w-full max-w-full">
            {/* Hướng dẫn vuốt ngang trên điện thoại */}
            <div className="sm:hidden bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200/80 text-orange-900 text-xs font-bold p-2.5 px-3.5 flex items-center justify-between shadow-2xs">
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-arrows-left-right text-orange-500 text-xs animate-pulse"></i>
                👈 Vuốt sang ngang để xem đủ 9 cột đối soát ➔
              </span>
              <span className="text-[10px] bg-orange-200/80 text-orange-900 px-2 py-0.5 rounded-full font-black">
                Hàng ngang
              </span>
            </div>

            <div className="overflow-x-auto w-full max-w-full scrollbar-thin">
              <table className="w-full min-w-[780px] sm:min-w-[900px] text-left border-collapse text-xs sm:text-xs">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-600 text-xs font-black uppercase tracking-wider border-b border-slate-200">
                    <th className="p-2 sm:p-3 text-center w-10">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-orange-500 cursor-pointer"
                        checked={filteredOrders.length > 0 && filteredOrders.slice((adminOrderPage - 1) * 50, adminOrderPage * 50).every((o) => selectedOrderIds.has(o.id))}
                        onChange={() => toggleSelectAllOrders(filteredOrders.slice((adminOrderPage - 1) * 50, adminOrderPage * 50))}
                        title="Chọn tất cả đơn trang này"
                      />
                    </th>
                    <th className="p-3.5 sm:p-4 whitespace-nowrap">Ngày đơn</th>
                    <th className="p-3.5 sm:p-4">Sản phẩm / Mã đơn</th>
                    <th className="p-3.5 sm:p-4 whitespace-nowrap">Người mua</th>
                    <th className="p-3.5 sm:p-4 whitespace-nowrap">Trạng thái</th>
                    <th className="p-2 sm:p-3 text-center whitespace-nowrap" title="Đã thanh toán (đối chiếu App Script)">Đã TT</th>
                    <th className="p-3.5 sm:p-4 text-right whitespace-nowrap">Thô ({activeTab === "tiktok" ? "TikTok" : "Shopee"})</th>
                    <th className="p-3.5 sm:p-4 text-right whitespace-nowrap">Thuế ({taxRate}%)</th>
                    <th className="p-3.5 sm:p-4 text-right whitespace-nowrap">Sau thuế</th>
                    <th className="p-3.5 sm:p-4 text-right text-orange-600 whitespace-nowrap">Khách ({customerSplitRate}%)</th>
                    <th className="p-3.5 sm:p-4 text-right text-orange-600 whitespace-nowrap">Admin ({adminSplitRate}%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-12 text-center text-slate-400 font-bold">
                        <i className="fa-solid fa-folder-open text-2xl text-slate-300 mb-2 block"></i>
                        Không tìm thấy đơn hàng nào khớp với bộ lọc
                      </td>
                    </tr>
                  ) : (
                    filteredOrders
                      .slice((adminOrderPage - 1) * 50, adminOrderPage * 50)
                      .map((o) => {
                        const rawVal = Math.round(Number(o.rawCommission || o.finalCommission || 0));
                        const taxVal = Math.round(rawVal * (taxRate / 100));
                        const afterTaxVal = Math.max(0, rawVal - taxVal);
                        const userFinalVal = Math.round(afterTaxVal * (customerSplitRate / 100));
                        const adminProfitVal = Math.max(0, afterTaxVal - userFinalVal);
                        const buyer = getOrderBuyerInfo(o);

                        return (
                          <tr key={o.id} className={`hover:bg-slate-50/80 transition ${selectedOrderIds.has(o.id) ? "bg-orange-50/60" : ""}`}>
                            <td className="p-2 sm:p-3 text-center">
                              <input
                                type="checkbox"
                                className="w-4 h-4 accent-orange-500 cursor-pointer"
                                checked={selectedOrderIds.has(o.id)}
                                onChange={() => toggleSelectOrder(o.id)}
                              />
                            </td>
                            <td className="p-3.5 sm:p-4 text-slate-600 font-bold whitespace-nowrap text-xs sm:text-xs">
                              {o.orderDate ? new Date(o.orderDate).toLocaleDateString("vi-VN") : "—"}
                            </td>
                            <td className="p-3.5 sm:p-4 min-w-[180px] max-w-[260px]">
                              <p className="font-bold text-slate-900 text-xs sm:text-xs leading-snug truncate" title={o.productName}>
                                {o.productName}
                              </p>
                              <span className="inline-block mt-0.5 text-[10px] sm:text-[11px] text-slate-500 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded">
                                ID: {o.orderId}
                              </span>
                            </td>
                            <td className="p-3.5 sm:p-4 min-w-[160px] whitespace-nowrap text-xs sm:text-xs">
                              <div className="flex flex-col items-start gap-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`font-bold leading-snug ${
                                      buyer.isZaloName
                                        ? "text-slate-900"
                                        : buyer.isAssigned
                                        ? "text-slate-700 font-mono text-xs"
                                        : "text-slate-400 italic"
                                    }`}
                                    title={buyer.name}
                                  >
                                    {buyer.name}
                                  </span>
                                  {Boolean(o.isManuallyAssigned) && (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded shadow-2xs" title="Đơn đã được Admin gán thủ công, vĩnh viễn không bị ghi đè khi import lại Excel">
                                      <i className="fa-solid fa-lock text-[8px]"></i> Đã gán
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedOrderToAssign(o);
                                    setAssignZaloId(o.zaloId || buyer.zaloId || "");
                                  }}
                                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100/90 hover:bg-slate-200/90 px-2.5 py-1 rounded-md border border-slate-200/80 cursor-pointer transition shadow-2xs"
                                  title="Đổi / Gán đơn này cho thành viên Zalo"
                                >
                                  <i className="fa-solid fa-link text-[10px] text-slate-500"></i> Đổi người nhận
                                </button>
                              </div>
                            </td>
                            <td className="p-3.5 sm:p-4 whitespace-nowrap">
                              {(() => {
                                const rawSt = String(o.status || "").trim().toLowerCase();
                                let badgeLabel = "Chờ xử lý";
                                let badgeClass = "bg-amber-50 text-amber-700";

                                if (rawSt === "3" || rawSt === "300" || rawSt.includes("hủy") || rawSt.includes("cancel") || rawSt.includes("refund")) {
                                  badgeLabel = "Đã hủy";
                                  badgeClass = "bg-rose-50 text-rose-700";
                                } else if (rawSt === "2" || rawSt === "200" || rawSt.includes("hoàn thành") || rawSt.includes("complete") || rawSt.includes("finish") || rawSt.includes("success") || rawSt.includes("settled") || rawSt.includes("paid")) {
                                  badgeLabel = "Hoàn thành";
                                  badgeClass = "bg-emerald-50 text-emerald-700";
                                } else if (rawSt === "1" || rawSt === "100" || rawSt.includes("chờ") || rawSt.includes("pending") || rawSt.includes("xử lý") || rawSt.includes("unpaid") || rawSt.includes("vận chuyển")) {
                                  badgeLabel = "Chờ xử lý";
                                  badgeClass = "bg-amber-50 text-amber-700";
                                }

                                const isCompleted = badgeLabel.includes("Hoàn thành");
                                const completedDateRaw = o.completeTime || o.completedDate || o.completedAt || o.updatedAt || o.orderDate;

                                return (
                                  <div className="flex flex-col items-start gap-1">
                                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold whitespace-nowrap inline-block ${badgeClass}`}>
                                      {badgeLabel}
                                    </span>
                                    {isCompleted && (
                                      <div
                                        className="text-[11px] font-semibold text-emerald-700/90 flex items-center gap-1.5 mt-0.5"
                                        title={completedDateRaw ? `Ngày hoàn thành: ${new Date(completedDateRaw).toLocaleString("vi-VN")}` : "Ngày hoàn thành"}
                                      >
                                        <i className="fa-regular fa-calendar-check text-[10px] text-emerald-600"></i>
                                        <span>
                                          {completedDateRaw ? new Date(completedDateRaw).toLocaleDateString("vi-VN") : "—"}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            {/* CỘT ĐÃ THANH TOÁN (ĐỐI CHIẾU APP SCRIPT) */}
                            <td className="p-2 sm:p-3 text-center whitespace-nowrap">
                              {o.paymentStatus === "PAID" ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedOrderIds(new Set([o.id]));
                                    handleMarkPaid("UNPAID");
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 py-0.5 px-2 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                  title="Đã thanh toán (bấm để đổi thành Chưa thanh toán)"
                                >
                                  <i className="fa-solid fa-check text-[10px]"></i> Đã TT
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedOrderIds(new Set([o.id]));
                                    handleMarkPaid("PAID");
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-600 py-0.5 px-2 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                  title="Chưa thanh toán (bấm để đánh dấu Đã thanh toán)"
                                >
                                  Chưa TT
                                </button>
                              )}
                            </td>
                            <td className="p-3.5 sm:p-4 text-right font-mono font-bold text-slate-700 text-xs sm:text-xs whitespace-nowrap">{formatMoney(rawVal)}</td>
                            <td className="p-3.5 sm:p-4 text-right font-mono font-bold text-rose-500 text-xs sm:text-xs whitespace-nowrap">{formatMoney(taxVal)}</td>
                            <td className="p-3.5 sm:p-4 text-right font-mono font-bold text-slate-800 text-xs sm:text-xs whitespace-nowrap">{formatMoney(afterTaxVal)}</td>
                            <td className="p-3.5 sm:p-4 text-right font-mono font-black text-orange-600 text-xs sm:text-xs whitespace-nowrap">{formatMoney(userFinalVal)}</td>
                            <td className="p-3.5 sm:p-4 text-right font-mono font-black text-orange-600 text-xs sm:text-xs whitespace-nowrap">{formatMoney(adminProfitVal)}</td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
                {filteredOrders.length > 0 && (
                  <tfoot className="bg-slate-100/90 font-bold border-t-2 border-slate-200 text-xs sm:text-xs">
                    <tr>
                      <td colSpan={6} className="p-3.5 sm:p-4 font-black text-slate-800 whitespace-nowrap">
                        📊 TỔNG CỘNG ({filteredOrders.length} đơn {activeTab === "tiktok" ? "TikTok" : "Shopee"} đang lọc)
                      </td>
                      <td className="p-3.5 sm:p-4 text-right font-mono font-black text-slate-800 whitespace-nowrap">
                        {formatMoney(totalRawSum)}
                      </td>
                      <td className="p-3.5 sm:p-4 text-right font-mono font-black text-rose-600 whitespace-nowrap">
                        {formatMoney(totalTaxSum)}
                      </td>
                      <td className="p-3.5 sm:p-4 text-right font-mono font-black text-slate-800 whitespace-nowrap">
                        {formatMoney(totalAfterTaxSum)}
                      </td>
                      <td className="p-3.5 sm:p-4 text-right font-mono font-black text-orange-600 whitespace-nowrap">
                        {formatMoney(totalUserFinalSum)}
                      </td>
                      <td className="p-3.5 sm:p-4 text-right font-mono font-black text-orange-600 whitespace-nowrap">
                        {formatMoney(totalAdminProfitSum)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* LỲ-STYLE RICH PAGINATION BAR */}
            {(() => {
              const totalPages = Math.max(1, Math.ceil(filteredOrders.length / 50));
              const getPageNumbers = () => {
                const delta = 2;
                const range = [];
                for (
                  let i = Math.max(2, adminOrderPage - delta);
                  i <= Math.min(totalPages - 1, adminOrderPage + delta);
                  i++
                ) {
                  range.push(i);
                }
                if (adminOrderPage - delta > 2) range.unshift("...");
                range.unshift(1);
                if (adminOrderPage + delta < totalPages - 1) range.push("...");
                if (totalPages > 1) range.push(totalPages);
                return range;
              };

              return (
                <div className="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium">
                  <div className="text-slate-500">
                    Hiển thị{" "}
                    <strong className="text-slate-800">
                      {filteredOrders.length > 0 ? (adminOrderPage - 1) * 50 + 1 : 0} -{" "}
                      {Math.min(adminOrderPage * 50, filteredOrders.length)}
                    </strong>{" "}
                    trong tổng số <strong className="text-orange-600">{filteredOrders.length}</strong> đơn (Trang {adminOrderPage}/{totalPages})
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1 font-bold">
                      <button
                        onClick={() => setAdminOrderPage(1)}
                        disabled={adminOrderPage === 1}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer transition flex items-center justify-center text-xs"
                        title="Trang đầu"
                      >
                        «
                      </button>
                      <button
                        onClick={() => setAdminOrderPage((p) => Math.max(1, p - 1))}
                        disabled={adminOrderPage === 1}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer transition flex items-center justify-center text-xs"
                        title="Trang trước"
                      >
                        ‹
                      </button>

                      {getPageNumbers().map((p, i) =>
                        p === "..." ? (
                          <span key={`ell-${i}`} className="px-1 text-slate-400">
                            ...
                          </span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => setAdminOrderPage(p)}
                            className={`w-8 h-8 rounded-xl text-xs font-black transition cursor-pointer ${
                              adminOrderPage === p
                                ? "bg-purple-600 text-white shadow-xs"
                                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {p}
                          </button>
                        )
                      )}

                      <button
                        onClick={() => setAdminOrderPage((p) => Math.min(totalPages, p + 1))}
                        disabled={adminOrderPage === totalPages}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer transition flex items-center justify-center text-xs"
                        title="Trang sau"
                      >
                        ›
                      </button>
                      <button
                        onClick={() => setAdminOrderPage(totalPages)}
                        disabled={adminOrderPage === totalPages}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer transition flex items-center justify-center text-xs"
                        title="Trang cuối"
                      >
                        »
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* FLOATING ACTION BAR FOR SELECTED ORDERS (ĐỐI CHIẾU APP SCRIPT) */}
            {selectedOrderIds.size > 0 && (
              <div className="sticky bottom-4 z-40 bg-white/95 backdrop-blur-md text-slate-800 rounded-3xl p-3.5 px-5 shadow-2xl border-2 border-orange-200/90 flex items-center justify-between gap-4 flex-wrap animate-fade-in-up mt-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-center font-black text-xs shadow-sm">
                    {selectedOrderIds.size}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>Khách nhận (đang chọn):</span>
                      <strong className="text-orange-600 font-black font-mono text-base">{formatMoney(selectedUserFinalSum)}</strong>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono font-medium">
                      Tổng thô {activeTab === "tiktok" ? "TikTok" : "Shopee"}: {formatMoney(selectedRawSum)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleMarkPaid("PAID")}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black rounded-2xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                    title="Đánh dấu tất cả đơn đang chọn là Đã thanh toán"
                  >
                    <i className="fa-solid fa-check"></i> Đánh dấu ĐÃ THANH TOÁN
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMarkPaid("UNPAID")}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition cursor-pointer flex items-center gap-1.5 border border-slate-200"
                    title="Bỏ đánh dấu thanh toán (chuyển về Chưa thanh toán)"
                  >
                    <i className="fa-solid fa-rotate-left text-[11px]"></i> Chưa thanh toán
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedOrderIds(new Set())}
                    className="px-3 py-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition cursor-pointer text-xs font-bold"
                    title="Bỏ chọn tất cả"
                  >
                    <i className="fa-solid fa-xmark text-sm"></i> Bỏ chọn
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 7: CẤU HÌNH BOT ZALO (FLAT LIGHT SAAS) ===================== */}
      {activeTab === "templates" && !isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-5 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <i className="fa-solid fa-robot text-orange-500"></i>
                <span>Cấu Hình Câu Trả Lời Của Zalo Bot</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tự do cá nhân hóa câu từ, lời chào, tag @thành viên và các phản hồi lỗi cho Kênh {groupDisplayName}
              </p>
            </div>
            <button
              onClick={handleSaveTemplates}
              disabled={isSavingTemplates}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer"
            >
              {isSavingTemplates ? "Đang lưu..." : "Lưu Cấu Hình"}
            </button>
          </div>

          {templateSaveMessage && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold">
              {templateSaveMessage}
            </div>
          )}

          {/* Placeholders Help Card */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <i className="fa-solid fa-code text-orange-500"></i> BẢNG TỪ KHÓA ĐỘNG (PLACEHOLDER & VÍ DỤ):
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col justify-between shadow-2xs">
                <div><code className="font-semibold text-orange-600">@{`{ten_zalo}`}</code>: Tag tên Zalo</div>
                <div className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded mt-1.5">👉 VD: @Phạm Thắng</div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col justify-between shadow-2xs">
                <div><code className="font-semibold text-orange-600">{`{brand_name}`}</code>: Tên Kênh</div>
                <div className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded mt-1.5 truncate">👉 VD: {groupDisplayName.toUpperCase()}</div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col justify-between shadow-2xs">
                <div><code className="font-semibold text-orange-600">{`{so_du_vi}`}</code>: Ví Khả Dụng</div>
                <div className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded mt-1.5">👉 VD: 37.824đ</div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col justify-between shadow-2xs">
                <div><code className="font-semibold text-orange-600">{`{so_ngay_giu}`}</code>: Số ngày giữ</div>
                <div className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded mt-1.5">👉 VD: {holdingDays} ngày</div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col justify-between shadow-2xs">
                <div><code className="font-semibold text-orange-600">{`{hoahong_cho_du_ngay}`}</code>: Đã HT chưa đủ ngày</div>
                <div className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded mt-1.5">👉 VD: 0đ</div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col justify-between shadow-2xs">
                <div><code className="font-semibold text-orange-600">{`{hoahong_cho}`}</code>: Đơn chờ đối soát</div>
                <div className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded mt-1.5">👉 VD: 23.079đ</div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col justify-between shadow-2xs">
                <div><code className="font-semibold text-orange-600">{`{hoahong_danhan}`}</code>: Đã rút thành công</div>
                <div className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded mt-1.5">👉 VD: 15.231đ</div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col justify-between shadow-2xs">
                <div><code className="font-semibold text-orange-600">{`{link_tra_cuu}`}</code>: Link tra cứu</div>
                <div className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded mt-1.5 truncate">👉 VD: https://28affihub.store/...</div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col justify-between shadow-2xs">
                <div><code className="font-semibold text-orange-600">{`{link_mua_sam}`}</code>: Link mua sắm</div>
                <div className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded mt-1.5 truncate">👉 VD: https://s.shopee.vn/...</div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col justify-between shadow-2xs">
                <div><code className="font-semibold text-orange-600">{`{ty_le_hoan}`}</code>: Tỷ lệ hoàn tiền</div>
                <div className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded mt-1.5">👉 VD: {customerSplitRate}%</div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col justify-between shadow-2xs">
                <div><code className="font-semibold text-orange-600">{`{ten_nhom}`}</code>: Tên Kênh</div>
                <div className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded mt-1.5 truncate">👉 VD: {groupDisplayName}</div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col justify-between shadow-2xs">
                <div><code className="font-semibold text-orange-600">{`{ma_don_hang}`}</code>: Mã đơn hàng</div>
                <div className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded mt-1.5">👉 VD: 28378388192</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {CANONICAL_TEMPLATE_KEYS.filter((key) => isTiktokEnabled || !key.includes("tiktok")).map((key) => {
              const meta = TEMPLATE_META[key] || { title: key, desc: "" };
              const val = botTemplates[key] || defaultTemplates[key] || "";
              const lineCount = (val.match(/\n/g) || []).length + 1;
              const dynamicRows = Math.max(4, Math.min(16, lineCount + 2));

              return (
                <div key={key} className="p-4 sm:p-5 bg-slate-50/60 rounded-xl border border-slate-200 space-y-3 transition">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-sm text-orange-500 shrink-0">
                        <i className={meta.icon || "fa-solid fa-message text-orange-500"}></i>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                          <span>{meta.title}</span>
                        </h4>
                        {meta.desc && (
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">{meta.desc}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {meta.command && (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold font-mono">
                          Lệnh: {meta.command}
                        </span>
                      )}
                      {meta.badge && (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-[11px] font-semibold">
                          📌 {meta.badge}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setPreviewModalKey(key)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-orange-600 hover:bg-orange-50 bg-white rounded-lg border border-slate-200 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Xem mô phỏng tin nhắn Bot Zalo thực tế kèm giải nghĩa biến động"
                      >
                        <i className="fa-solid fa-eye text-orange-500 text-[10px]"></i>
                        <span>Ví dụ thực tế</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResetTemplate(key)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-orange-600 hover:bg-orange-50 bg-white rounded-lg border border-slate-200 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Khôi phục mẫu này về mặc định hệ thống"
                      >
                        <i className="fa-solid fa-rotate-left text-[10px]"></i>
                        <span>Khôi phục</span>
                      </button>
                    </div>
                  </div>

                  <textarea
                    rows={dynamicRows}
                    value={val}
                    onChange={(e) => setBotTemplates({ ...botTemplates, [key]: e.target.value })}
                    onInput={(e) => {
                      e.target.style.height = "auto";
                      e.target.style.height = Math.max(110, e.target.scrollHeight) + "px";
                    }}
                    placeholder="Nhập nội dung mẫu tin nhắn bot..."
                    className="w-full bg-white border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 rounded-xl p-3.5 text-xs text-slate-800 outline-none transition resize-y min-h-[110px]"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================== TAB 8: CẤU HÌNH KÊNH (FLAT LIGHT SAAS) ===================== */}
      {activeTab === "settings" && !isLoading && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* HEADER FORM */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <i className="fa-solid fa-gear text-orange-500"></i>
                <span>Cấu Hình Kênh (Thiết Lập Chung)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết lập thông tin kênh, điều kiện rút tiền, tỷ lệ chia hoa hồng và cấu hình bot Zalo của Kênh {groupDisplayName}
              </p>
            </div>
            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs shadow-xs hover:shadow transition cursor-pointer flex items-center gap-2"
            >
              <i className="fa-solid fa-floppy-disk text-xs"></i>
              <span>{isSavingSettings ? "Đang lưu..." : "Lưu Cấu Hình"}</span>
            </button>
          </div>

          {settingsSaveMessage && (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <i className="fa-solid fa-circle-check text-emerald-600"></i>
              <span>{settingsSaveMessage}</span>
            </div>
          )}

          {/* CARD 1: THÔNG TIN KÊNH & QUẢN TRỊ */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <i className="fa-solid fa-store text-orange-500"></i>
                <span>1. Thông Tin Kênh & Quản Trị</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Tên nhận diện Kênh, tài khoản Zalo duyệt lệnh và mã Shopee Affiliate tiếp thị
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Tên Nhóm / Thương Hiệu Kênh:</label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Zalo ID Trưởng Nhóm (Admin):</label>
                <input
                  type="text"
                  placeholder="Nhập Zalo ID của Trưởng Nhóm..."
                  value={settings.adminZaloId || ""}
                  onChange={(e) => setSettings({ ...settings, adminZaloId: e.target.value })}
                  className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Dùng để kiểm tra quyền duyệt lệnh /duyet trong nhóm Zalo.</span>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Mã Shopee Affiliate Publisher ID (Shopee Pub ID):</label>
                <input
                  type="text"
                  placeholder="Ví dụ: 1730052001 hoặc an_1730052001"
                  value={settings.shopeePubId || ""}
                  onChange={(e) => setSettings({ ...settings, shopeePubId: e.target.value })}
                  className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Mã ID tiếp thị Shopee Affiliate của Trưởng Nhóm dùng để gắn vào link tạo hoa hồng.</span>
              </div>
            </div>
          </div>

          {/* CARD 2: ĐIỀU KIỆN RÚT TIỀN & TỶ LỆ CHIA HOA HỒNG */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <i className="fa-solid fa-coins text-orange-500"></i>
                  <span>2. Điều Kiện Rút Tiền & Tỷ Lệ Chia Hoa Hồng</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tỷ lệ chia sẻ hoa hồng cho khách mua, quy định hạn mức và thời gian đối soát tiền rút
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-600">
                Trưởng nhóm giữ lại: {100 - (Number(settings.customerSplitRate) || 80)}% hoa hồng sau thuế
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Tỷ lệ chia cho khách mua (%):</label>
                <input
                  type="number"
                  value={settings.customerSplitRate}
                  onChange={(e) => setSettings({ ...settings, customerSplitRate: e.target.value })}
                  className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Khách được hưởng {settings.customerSplitRate || 80}% hoa hồng sau khấu trừ thuế TNCN.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Hạn mức rút tối thiểu (VNĐ):</label>
                <input
                  type="number"
                  value={settings.minWithdrawAmount}
                  onChange={(e) => setSettings({ ...settings, minWithdrawAmount: e.target.value })}
                  className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Số tiền tối thiểu trong Ví Khả Dụng để thành viên lập lệnh rút.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Số ngày giữ đơn sau hoàn thành (ngày):</label>
                <input
                  type="number"
                  min="0"
                  value={settings.holdingDays}
                  onChange={(e) => setSettings({ ...settings, holdingDays: e.target.value })}
                  className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Sau số ngày này đơn hoàn thành mới chuyển sang Ví Khả Dụng để rút (mặc định 3 ngày Shopee). Nếu cài 0 ngày: Khách được rút ngay khi hoàn thành.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Tỷ lệ trừ thuế TNCN (%):</label>
                <input
                  type="number"
                  value={settings.taxRate}
                  onChange={(e) => setSettings({ ...settings, taxRate: e.target.value })}
                  className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Tỷ lệ khấu trừ thuế theo quy định Shopee Affiliate (mặc định 10%).</span>
              </div>
            </div>
          </div>

          {/* CARD 3: ĐỊNH DẠNG LINK TIẾP THỊ MUA SẮM */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <i className="fa-solid fa-link text-orange-500"></i>
                  <span>3. Định Dạng Link Tiếp Thị Mua Sắm</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Định dạng link hoàn tiền trả về cho thành viên khi chuyển đổi link trong nhóm Zalo
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                settings.useShortLink
                  ? "bg-orange-50 text-orange-600"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {settings.useShortLink ? "Link Ngắn (Rút gọn)" : "Link Dài Shopee"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div
                onClick={() => setSettings({ ...settings, useShortLink: true })}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                  settings.useShortLink
                    ? "border-orange-500 bg-orange-50/40 text-orange-950 shadow-2xs"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <input
                  type="radio"
                  name="useShortLink"
                  checked={settings.useShortLink === true}
                  onChange={() => setSettings({ ...settings, useShortLink: true })}
                  className="accent-orange-500 mt-0.5 cursor-pointer"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Link Rút Gọn (Khuyên Dùng)</span>
                    <span className="px-1.5 py-0.2 bg-orange-100 text-orange-700 text-[10px] font-semibold rounded">Mặc định</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tự động rút gọn link tiếp thị sang tên miền thương hiệu Kênh
                  </p>
                  <div className="mt-2 text-[10px] font-mono text-slate-500 truncate">
                    https://www.28affihub.store/s/MNx5TJ4
                  </div>
                </div>
              </div>

              <div
                onClick={() => setSettings({ ...settings, useShortLink: false })}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                  !settings.useShortLink
                    ? "border-orange-500 bg-orange-50/40 text-orange-950 shadow-2xs"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <input
                  type="radio"
                  name="useShortLink"
                  checked={settings.useShortLink === false}
                  onChange={() => setSettings({ ...settings, useShortLink: false })}
                  className="accent-orange-500 mt-0.5 cursor-pointer"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Link Dài Gốc Shopee</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Sử dụng trực tiếp link tiếp thị dài gốc từ Shopee Affiliate
                  </p>
                  <div className="mt-2 text-[10px] font-mono text-slate-500 truncate">
                    https://s.shopee.vn/an_redir?origin_link=...
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 4: CẤU HÌNH THÔNG BÁO DUYỆT RÚT TIỀN */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <i className="fa-solid fa-bell text-orange-500"></i>
                  <span>4. Thông Báo Duyệt Rút Tiền (Đồng Thời Tất Cả Nhóm & Riêng)</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Khi bật: Duyệt trên web hay gõ <code className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 font-mono text-[10px]">/duyet_ID</code>, bot sẽ gửi tin riêng cho thành viên VÀ tự động thông báo tới tất cả các nhóm Zalo bot đang có mặt
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSettings({ ...settings, notifyBothPayout: !settings.notifyBothPayout })}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none cursor-pointer ${
                  settings.notifyBothPayout ? "bg-orange-500" : "bg-slate-200"
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform duration-200 ${
                  settings.notifyBothPayout ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </div>

            {settings.notifyBothPayout && (
              <div className="pt-1">
                <div className="flex items-center gap-2 text-xs text-orange-700 font-semibold">
                  <i className="fa-solid fa-circle-check text-[11px] text-orange-500"></i>
                  <span>Đang BẬT: Bot tự động gửi tin riêng và thông báo tới tất cả các nhóm Zalo</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Trưởng nhóm không cần nhập ID nhóm Zalo. Bot sẽ tự động quét toàn bộ nhóm đang tham gia.
                </p>
              </div>
            )}
          </div>

          {/* CARD 5: THỜI GIAN BOT PHẢN HỒI TIN NHẮN (DELAY & THẢ TIM) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <i className="fa-solid fa-stopwatch text-orange-500"></i>
                  <span>5. Thời Gian Bot Phản Hồi Tin Nhắn (Delay)</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Điều chỉnh độ trễ trả lời tin nhắn tạo link hoàn tiền tự nhiên như người thật
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600">
                <span>❤️</span> Tự động thả tim tin nhắn Shopee
              </span>
            </div>

            <div className="flex items-center gap-5 pt-1 text-xs">
              <span className="text-slate-500 font-medium">Kiểu thời gian:</span>
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                <input
                  type="radio"
                  name="botReplyDelayMode"
                  value="FIXED"
                  checked={settings.botReplyDelayMode === "FIXED"}
                  onChange={() => setSettings({ ...settings, botReplyDelayMode: "FIXED" })}
                  className="accent-orange-500"
                />
                <span>Cố định (Fixed)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                <input
                  type="radio"
                  name="botReplyDelayMode"
                  value="RANGE"
                  checked={settings.botReplyDelayMode === "RANGE"}
                  onChange={() => setSettings({ ...settings, botReplyDelayMode: "RANGE" })}
                  className="accent-orange-500"
                />
                <span>Ngẫu nhiên (Min – Max)</span>
              </label>
            </div>

            {settings.botReplyDelayMode === "FIXED" ? (
              <div className="max-w-xs pt-1">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Thời gian chờ (giây):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={settings.botReplyDelayFixed}
                    onChange={(e) => setSettings({ ...settings, botReplyDelayFixed: e.target.value })}
                    className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium">giây</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-w-sm pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Tối thiểu (giây):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={settings.botReplyDelayMin}
                      onChange={(e) => setSettings({ ...settings, botReplyDelayMin: e.target.value })}
                      className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium">giây</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Tối đa (giây):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={settings.botReplyDelayMax}
                      onChange={(e) => setSettings({ ...settings, botReplyDelayMax: e.target.value })}
                      className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium">giây</span>
                  </div>
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-500">
              💡 Bot sẽ tự động thả tim ❤️ ngay khi có link và chờ thời gian cài đặt trước khi trả lời.
            </p>
          </div>

          {/* CARD 6: CẤU HÌNH API TIKTOK SHOP (NẾU BẬT) */}
          {isTiktokEnabled && (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <i className="fa-brands fa-tiktok text-orange-500"></i>
                  <span>6. Kết Nối API TikTok Shop</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Cấu hình khóa API kết nối để kéo đơn TikTok Shop tự động cho Kênh này
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">TikTok API Key:</label>
                  <input
                    type="text"
                    value={settings.tiktokApiKey}
                    onChange={(e) => setSettings({ ...settings, tiktokApiKey: e.target.value })}
                    placeholder="Để trống nếu không dùng..."
                    className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">TikTok Creator Username:</label>
                  <input
                    type="text"
                    value={settings.tiktokCreatorUsername}
                    onChange={(e) => setSettings({ ...settings, tiktokCreatorUsername: e.target.value })}
                    placeholder="VD: tran_huyen_affiliate..."
                    className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* FOOTER ACTION */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs shadow-xs hover:shadow transition cursor-pointer flex items-center gap-2"
            >
              <i className="fa-solid fa-floppy-disk text-xs"></i>
              <span>{isSavingSettings ? "Đang lưu..." : "Lưu Cấu Hình Kênh"}</span>
            </button>
          </div>
        </form>
      )}



      {/* MODAL POPUP QUÉT QR BOT ZALO */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <i className="fa-solid fa-qrcode text-emerald-600"></i>
                <span>Quét Mã QR Đăng Nhập Bot Zalo</span>
              </h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Instruction Steps */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-1 text-emerald-900 font-medium">
              <p className="font-bold flex items-center gap-1.5 text-emerald-950">
                <i className="fa-solid fa-circle-info text-emerald-600"></i> HƯỚNG DẪN QUÉT MÃ QR:
              </p>
              <ol className="list-decimal list-inside space-y-0.5 pl-1 text-[11px]">
                <li>Mở ứng dụng <strong>Zalo trên điện thoại</strong> của Nick Zalo Phụ.</li>
                <li>Chọn biểu tượng <strong>Quét mã QR</strong> ở góc trên bên phải màn hình.</li>
                <li>Hướng camera điện thoại quét mã bên dưới để kích hoạt Bot.</li>
              </ol>
            </div>

            {/* QR Code Container */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 text-center space-y-3">
              <div className="w-52 h-52 bg-white rounded-2xl border-2 border-emerald-500 p-2 mx-auto shadow-md flex items-center justify-center relative overflow-hidden">
                {isGeneratingQr ? (
                  <div className="space-y-2">
                    <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
                    <span className="text-xs font-bold text-slate-500">Đang khởi tạo phiên QR Zalo từ Server...</span>
                  </div>
                ) : realQrBase64 ? (
                  <img
                    src={realQrBase64}
                    alt="Mã QR Đăng Nhập Zalo Thật"
                    className="w-full h-full object-contain rounded-xl"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 p-3 text-center">
                    <i className="fa-solid fa-qrcode text-4xl text-slate-300"></i>
                    <button
                      type="button"
                      onClick={handleGenerateQr}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      ⚡ Bắt Đầu Khởi Tạo QR Zalo Thật
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs font-bold text-slate-600">{qrMessage || "Mã QR cập nhật từ Zalo Server. Mở App Zalo trên điện thoại để quét mã."}</p>
            </div>



            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SỬA STK THÀNH VIÊN */}
      {editingMemberBank && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <i className="fa-solid fa-building-columns text-orange-500"></i>
                  <span>Cập Nhật Tài Khoản Ngân Hàng</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thành viên: <strong className="text-slate-800">{editingMemberBank.zaloName || editingMemberBank.zaloId}</strong> (Zalo ID: <span className="font-mono text-blue-600">{editingMemberBank.zaloId}</span>)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingMemberBank(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateMemberBank(
                  editingMemberBank.zaloId,
                  editingMemberBank.bankName,
                  editingMemberBank.accountNumber,
                  editingMemberBank.accountName
                );
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Tên Ngân Hàng:
                </label>
                <input
                  type="text"
                  required
                  value={editingMemberBank.bankName || ""}
                  onChange={(e) => setEditingMemberBank({ ...editingMemberBank, bankName: e.target.value })}
                  placeholder="VD: MBBank, Vietcombank, Techcombank, VPBank, ACB..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition"
                />
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {["MBBank", "Vietcombank", "Techcombank", "VPBank", "ACB", "BIDV", "TPBank"].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setEditingMemberBank({ ...editingMemberBank, bankName: b })}
                      className="text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-orange-50 hover:text-orange-600 px-2 py-0.5 rounded-md transition cursor-pointer"
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Số Tài Khoản (STK):
                </label>
                <input
                  type="text"
                  required
                  value={editingMemberBank.accountNumber || ""}
                  onChange={(e) => setEditingMemberBank({ ...editingMemberBank, accountNumber: e.target.value })}
                  placeholder="Nhập số tài khoản ngân hàng..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  Tên Chủ Tài Khoản:
                </label>
                <input
                  type="text"
                  value={editingMemberBank.accountName || ""}
                  onChange={(e) => setEditingMemberBank({ ...editingMemberBank, accountName: e.target.value.toUpperCase() })}
                  placeholder="VD: NGUYEN VAN A (không dấu, viết hoa)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 uppercase outline-none focus:border-orange-500 focus:bg-white transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMemberBank(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingBank}
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition flex items-center gap-1.5"
                >
                  {isUpdatingBank ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Đang lưu...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-floppy-disk"></i> Lưu STK
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GÁN ĐƠN HÀNG */}
      {selectedOrderToAssign && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Gán Đơn Hàng Cho Thành Viên Zalo</h3>
              <button onClick={() => setSelectedOrderToAssign(null)} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p><span className="text-slate-400">Mã đơn:</span> <strong className="font-mono">{selectedOrderToAssign.orderId}</strong></p>
              <p><span className="text-slate-400">Sản phẩm:</span> <strong>{selectedOrderToAssign.productName}</strong></p>
            </div>

            <form onSubmit={handleAssignOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">Chọn hoặc nhập Zalo ID thành viên:</label>
                <input
                  type="text"
                  value={assignZaloId}
                  onChange={(e) => setAssignZaloId(e.target.value)}
                  placeholder="Nhập Zalo ID..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none mb-2"
                />
                <select
                  onChange={(e) => setAssignZaloId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="">-- Hoặc chọn từ danh sách Zalo User --</option>
                  {zaloUsers.map((u) => (
                    <option key={u.id} value={u.zaloId}>
                      {u.zaloName || "Khách Zalo"} (Zalo ID: {u.zaloId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div>
                  {(selectedOrderToAssign.zaloId || selectedOrderToAssign.isManuallyAssigned) && (
                    <button
                      type="button"
                      disabled={isSubmittingAssign}
                      onClick={() => handleAssignOrder(null, true)}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl border border-rose-200 cursor-pointer transition flex items-center gap-1"
                      title="Gỡ gán đơn hàng này về trạng thái chưa gán"
                    >
                      <i className="fa-solid fa-unlink text-[10px]"></i> Gỡ gán
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrderToAssign(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAssign}
                    className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer"
                  >
                    {isSubmittingAssign ? "Đang gán..." : "Xác nhận gán đơn"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem trước ví dụ tin nhắn thực tế trên Zalo */}
      {previewModalKey && (
        <TemplatePreviewModal
          isOpen={!!previewModalKey}
          onClose={() => setPreviewModalKey(null)}
          templateKey={previewModalKey}
          templateContent={botTemplates[previewModalKey] || defaultTemplates[previewModalKey] || ""}
          templateMeta={TEMPLATE_META[previewModalKey] || { title: previewModalKey }}
          tenant={activeTenant}
          settings={settings}
        />
      )}
    </div>
  );
}
