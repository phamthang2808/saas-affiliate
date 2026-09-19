import React, { useState, useEffect } from "react";
import { formatMoney, formatDate } from "../utils/formatters";
import { APP_CONFIG } from "../config/api";

// Standard default bot templates helper
const getStandardBotTemplates = (tenant) => {
  const groupName = tenant?.name || "Affiliate Cashback";
  const splitRate = tenant?.customerSplitRate || 80;
  return {
    template_link: `@{user} 🛒 Link mua sắm hoàn tiền của bạn đã sẵn sàng:\n🔗 {affiliate_link}\n\n📌 Tỷ lệ hoàn: ${splitRate}% hoa hồng\n💡 Hãy bấm vào link trên để mở App Shopee/TikTok và hoàn tất đặt hàng để được ghi nhận đối soát nhé! 🥰`,
    template_lookup_has_orders: `@{user} 🔍 TRA CỨU ĐƠN HÀNG & VÍ HOÀN TIỀN\n👉 Link tra cứu cá nhân (bấm là xem ngay & rút tiền):\n🌐 {link}\n\n💡 TÍNH NĂNG TRANG TRA CỨU:\n📦 Xem chi tiết toàn bộ đơn đã mua & hoa hồng từng đơn.\n💳 Quản lý ví tiền: Đang chờ / Đã hoàn thành / Khả dụng.\n💸 Rút tiền hoa hồng về STK Ngân hàng 1 chạm nhanh chóng!`,
    template_lookup_no_orders: `@{user} 🔍 BẠN CHƯA CÓ ĐƠN HÀNG NÀO\n👉 Link tra cứu cá nhân: {link}\n\n💡 Hiện bạn chưa có đơn nào phát sinh tại nhóm ${groupName}.\n🛒 Hãy gửi bất kỳ link sản phẩm Shopee/TikTok vào nhóm để bot tạo link hoàn ${splitRate}% cho đơn đầu tiên nhé! 🥰`,
    template_welcome: `Hi, chào @{user}\n🎉 Chào mừng bạn đã tham gia nhóm ${groupName}!\n📌 Bạn vui lòng đọc kỹ BÀI GHIM của nhóm hoặc gõ lệnh /help để xem hướng dẫn cách gửi link mua sắm và nhận hoàn ${splitRate}% hoa hồng nhé! 🥰`,
    template_help: `@{user} 🤖 CÁC LỆNH BOT HỖ TRỢ SĂN SALE & HOÀN TIỀN:\n\n💳 /vitien hoặc #vitien — Xem ví tiền & hoa hồng hiện có\n🛒 /donhang hoặc #donhang — Xem danh sách các đơn đã đặt\n🔍 /tracuu hoặc #tracuu — Link tra cứu chi tiết bảo mật cá nhân\n🏦 /stk_[NGÂN_HÀNG]_[STK] — Lưu STK nhận tiền (VD: /stk_MB_0888728256)\n💸 /ruttien hoặc /rut — Yêu cầu rút toàn bộ hoa hồng khả dụng\n\n💡 Mẹo: Bạn chỉ cần gửi LINK sản phẩm Shopee/TikTok vào nhóm, bot sẽ tự động tạo link hoàn tiền ngay! 🥰`,
    template_order_not_found: `@{user} ⚠️ Không tìm thấy thông tin cho mã đơn: {order_id}.\n📌 Lưu ý: Đơn hàng mới đặt thường được cập nhật vào kỳ đối soát sau 1 ngày. Vui lòng kiểm tra lại mã đơn hoặc nhắn /tracuu để xem toàn bộ đơn của bạn nhé!`,
    template_invalid_command: `@{user} ❓ Lệnh "{command}" không hợp lệ.\n👉 Bạn có thể gõ /help để xem danh sách các lệnh được hỗ trợ nhé!`,
    template_invalid_bank_syntax: `@{user} ⚠️ Sai cú pháp lưu STK!\n👉 Cú pháp đúng: /stk_[TÊN_NGÂN_HÀNG]_[SỐ_TÀI_KHOẢN]\n📌 Ví dụ: /stk_MB_0888728256 (Tên viết tắt các ngân hàng: MB, VCB, TCB, ACB, VPB, TPB, CTG, BIDV...)`,
    template_withdraw_zero: `@{user} ⚠️ Số dư khả dụng của bạn hiện là {balance}đ (chưa đủ hạn mức rút tối thiểu 10.000đ).\n💡 Bạn hãy gõ /tracuu để kiểm tra chi tiết trạng thái ví nhé!`
  };
};

export function TenantAdminView({ apiRoot, currentTenant, availableTenants, onSelectTenant, user, onOpenLogin }) {
  const activeTenant = currentTenant || (APP_CONFIG.isStandalone ? APP_CONFIG.tenant : null);
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'users' | 'payouts' | 'shopee' | 'tiktok' | 'import' | 'settings' | 'templates'
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [zaloUsers, setZaloUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Import Excel state
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Bot Templates state - ALWAYS prefilled with rich standard templates
  const initialTemplates = getStandardBotTemplates(activeTenant);
  const [botTemplates, setBotTemplates] = useState(initialTemplates);
  const [defaultTemplates, setDefaultTemplates] = useState(initialTemplates);
  const [isSavingTemplates, setIsSavingTemplates] = useState(false);
  const [templateSaveMessage, setTemplateSaveMessage] = useState("");
  const [templateSubTab, setTemplateSubTab] = useState("all");

  // Dynamic Settings state (Holding days, min withdraw, split rates)
  const [settings, setSettings] = useState({
    holdingDays: 0,
    minWithdrawAmount: 10000,
    customerSplitRate: 80,
    taxRate: 10,
    name: "",
    adminZaloId: "",
    withdrawalRuleNote: "",
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaveMessage, setSettingsSaveMessage] = useState("");

  const fetchTenantSettings = async () => {
    if (!activeTenant?.slug) return;
    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/settings`);
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
        });
      }
    } catch (e) {
      console.error("Fetch settings error:", e);
    }
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSaveMessage("");
    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok) {
        setSettingsSaveMessage("✅ Đã lưu cấu hình điều kiện rút tiền & tỷ lệ chia thành công!");
        setTimeout(() => setSettingsSaveMessage(""), 4000);
        fetchTenantData();
      } else {
        alert("❌ " + (data.message || "Lỗi lưu cấu hình"));
      }
    } catch (err) {
      alert("❌ Lỗi kết nối máy chủ: " + err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const fetchTenantTemplates = async () => {
    const standard = getStandardBotTemplates(activeTenant);
    if (!activeTenant?.slug) {
      setBotTemplates(standard);
      setDefaultTemplates(standard);
      return;
    }
    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/templates`);
      if (res.ok) {
        const data = await res.json();
        const defs = data.defaultTemplates && Object.keys(data.defaultTemplates).length > 0 ? data.defaultTemplates : standard;
        setDefaultTemplates(defs);
        let custom = {};
        if (data.customTemplatesJson) {
          try {
            custom = JSON.parse(data.customTemplatesJson);
          } catch (e) {}
        }
        const merged = { ...defs };
        Object.keys(defs).forEach((k) => {
          if (custom[k] !== undefined && custom[k] !== null && String(custom[k]).trim() !== "") {
            merged[k] = custom[k];
          }
        });
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

  const fetchTenantData = async () => {
    if (!activeTenant?.slug) return;
    setIsLoading(true);
    try {
      const slug = activeTenant.slug;
      const [resStats, resOrders, resPayouts, resUsers] = await Promise.all([
        fetch(`${apiRoot}/api/saas/admin/${slug}/stats`),
        fetch(`${apiRoot}/api/saas/admin/${slug}/orders`),
        fetch(`${apiRoot}/api/saas/admin/${slug}/payouts`),
        fetch(`${apiRoot}/api/saas/admin/${slug}/zalo-users`),
      ]);

      if (resStats.ok) setStats(await resStats.json());
      if (resOrders.ok) setOrders(await resOrders.json());
      if (resPayouts.ok) setPayouts(await resPayouts.json());
      if (resUsers.ok) setZaloUsers(await resUsers.json());
      fetchTenantTemplates();
      fetchTenantSettings();
    } catch (e) {
      console.error("Tenant admin fetch error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTemplates = async () => {
    setIsSavingTemplates(true);
    setTemplateSaveMessage("");
    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/templates`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templatesJson: JSON.stringify(botTemplates),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTemplateSaveMessage("✅ Đã lưu cấu hình tin nhắn Bot thành công!");
        setTimeout(() => setTemplateSaveMessage(""), 4000);
      } else {
        alert("❌ " + (data.message || "Lỗi lưu cấu hình tin nhắn"));
      }
    } catch (err) {
      alert("❌ Lỗi kết nối máy chủ: " + err.message);
    } finally {
      setIsSavingTemplates(false);
    }
  };

  const handleResetTemplate = (key) => {
    if (!window.confirm("Khôi phục mẫu này về bản MẶC ĐỊNH CHUẨN của hệ thống?")) return;
    if (defaultTemplates[key]) {
      setBotTemplates((prev) => ({ ...prev, [key]: defaultTemplates[key] }));
    }
  };

  const handleResetAllTemplates = () => {
    if (!window.confirm("Bạn có chắc chắn muốn khôi phục TẤT CẢ các mẫu tin nhắn về mặc định của hệ thống?")) return;
    setBotTemplates({ ...defaultTemplates });
  };

  useEffect(() => {
    fetchTenantData();
  }, [activeTenant?.slug, apiRoot]);

  const handleApprovePayout = async (payoutId) => {
    if (!window.confirm("Xác nhận ĐÃ CHUYỂN TIỀN thành công cho yêu cầu rút tiền này?")) return;

    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/payouts/${payoutId}/approve`, {
        method: "PUT",
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ " + (data.message || "Đã duyệt rút tiền thành công!"));
        fetchTenantData();
      } else {
        alert("❌ " + (data.message || "Lỗi duyệt rút tiền"));
      }
    } catch (err) {
      alert("❌ Lỗi kết nối máy chủ: " + err.message);
    }
  };

  const handleRejectPayout = async (payoutId) => {
    const note = prompt("Nhập lý do từ chối (ví dụ: Sai số tài khoản, chưa đủ số dư):", "Sai thông tin ngân hàng");
    if (note === null) return;

    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/payouts/${payoutId}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ " + (data.message || "Đã từ chối yêu cầu rút tiền"));
        fetchTenantData();
      } else {
        alert("❌ " + (data.message || "Lỗi khi từ chối"));
      }
    } catch (err) {
      alert("❌ Lỗi kết nối máy chủ: " + err.message);
    }
  };

  const handleUploadExcel = async () => {
    if (!importFile) {
      alert("Vui lòng chọn file Excel trước!");
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/orders/import`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setIsImporting(false);

      if (res.ok) {
        setImportResult({
          success: true,
          message: data.message || `Đã nạp thành công báo cáo đơn hàng cho ${activeTenant?.name}!`,
        });
        setImportFile(null);
        fetchTenantData();
      } else {
        alert("❌ " + (data.message || "Lỗi khi xử lý file Excel"));
      }
    } catch (err) {
      setIsImporting(false);
      alert("❌ Lỗi kết nối máy chủ: " + err.message);
    }
  };

  const groupDisplayName = stats?.tenant?.name || activeTenant?.name || "Nhóm Đối Tác";
  const pendingPayouts = payouts.filter((p) => p.status === "PENDING");
  const customerSplitRate = stats?.tenant?.customerSplitRate ?? activeTenant?.customerSplitRate ?? 80;
  const taxRate = stats?.tenant?.taxRate ?? activeTenant?.taxRate ?? 10;
  const afterTaxRate = 100 - taxRate;
  const adminSplitRate = 100 - customerSplitRate;

  // Filter orders
  const shopeeOrders = orders.filter((o) => !o.platform || o.platform.toLowerCase().includes("shopee"));
  const tiktokOrders = orders.filter((o) => o.platform && o.platform.toLowerCase().includes("tiktok"));

  const filteredOrders = (activeTab === "shopee" ? shopeeOrders : activeTab === "tiktok" ? tiktokOrders : orders).filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (o.orderId && o.orderId.toLowerCase().includes(q)) ||
      (o.productName && o.productName.toLowerCase().includes(q)) ||
      (o.zaloId && o.zaloId.toLowerCase().includes(q))
    );
  });

  const filteredUsers = zaloUsers.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u.zaloId && u.zaloId.toLowerCase().includes(q)) ||
      (u.zaloName && u.zaloName.toLowerCase().includes(q)) ||
      (u.accountNumber && u.accountNumber.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* ===================== 1. HEADER ===================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-md shadow-purple-500/20 shrink-0">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 font-display tracking-tight">
              Bảng Quản Trị
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Dành riêng cho Admin — {groupDisplayName} System
            </p>
          </div>
        </div>

        {/* Quick Group Switcher for Multi-tenant mode */}
        {!APP_CONFIG.isStandalone && availableTenants.length > 0 && (
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-2xl shadow-2xs">
            <span className="text-xs font-bold text-slate-400">Chọn nhóm:</span>
            <select
              value={activeTenant?.slug || ""}
              onChange={(e) => {
                const t = availableTenants.find((item) => item.slug === e.target.value);
                if (t) onSelectTenant(t);
              }}
              className="bg-transparent text-orange-600 font-extrabold text-xs outline-none border-0 cursor-pointer font-sans"
            >
              {availableTenants.map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ===================== 2. MOBILE TAB SELECTOR (DROPDOWN) & APPLE-STYLE TABS ===================== */}
      {/* Mobile / Tablet Direct Tab Chooser */}
      <div className="md:hidden">
        <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
          <i className="fa-solid fa-list-check text-purple-600 mr-1"></i> Chọn mục quản trị:
        </label>
        <div className="relative">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full bg-white border-2 border-purple-400/95 rounded-2xl py-3 px-4 text-xs font-black text-slate-900 shadow-sm outline-none appearance-none cursor-pointer pr-10"
          >
            <option value="overview">📊 1. Tổng quan hoạt động</option>
            <option value="users">👥 2. Người dùng ({zaloUsers.length})</option>
            <option value="payouts">💸 3. Quản lý Rút tiền ({pendingPayouts.length > 0 ? `${pendingPayouts.length} chờ duyệt` : "0"})</option>
            <option value="shopee">🛍️ 4. Đơn hàng Shopee ({shopeeOrders.length})</option>
            <option value="tiktok">🎵 5. Đơn hàng TikTok ({tiktokOrders.length})</option>
            <option value="import">☁️ 6. Nạp Excel dữ liệu</option>
            <option value="settings">⚙️ 7. Điều kiện Rút & Tỷ lệ chia</option>
            <option value="templates">💬 8. Cấu hình Tin nhắn Bot</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-purple-600">
            <i className="fa-solid fa-chevron-down text-xs"></i>
          </div>
        </div>
      </div>

      {/* Tabs with Multi-Row Wrapping (Flex-Wrap) - Never gets cut off */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1 pb-1">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "overview"
              ? "bg-purple-600 text-white shadow-md shadow-purple-500/25 scale-[1.02]"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <i className="fa-solid fa-globe text-xs"></i>
          <span>Tổng quan</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "users"
              ? "bg-purple-600 text-white shadow-md shadow-purple-500/25 scale-[1.02]"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <i className="fa-solid fa-users text-xs"></i>
          <span>Người dùng ({zaloUsers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("payouts")}
          className={`flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "payouts"
              ? "bg-purple-600 text-white shadow-md shadow-purple-500/25 scale-[1.02]"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <i className="fa-solid fa-money-bill-transfer text-xs"></i>
          <span>Rút tiền</span>
          {pendingPayouts.length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold ml-1 animate-bounce">
              {pendingPayouts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("shopee")}
          className={`flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "shopee"
              ? "bg-purple-600 text-white shadow-md shadow-purple-500/25 scale-[1.02]"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <i className="fa-solid fa-bag-shopping text-xs text-orange-500"></i>
          <span>Đơn Shopee ({shopeeOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("tiktok")}
          className={`flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "tiktok"
              ? "bg-purple-600 text-white shadow-md shadow-purple-500/25 scale-[1.02]"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <i className="fa-brands fa-tiktok text-xs text-slate-800"></i>
          <span>Đơn TikTok ({tiktokOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("import")}
          className={`flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "import"
              ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25 scale-[1.02]"
              : "bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200"
          }`}
        >
          <i className="fa-solid fa-cloud-arrow-up text-xs"></i>
          <span>Nạp Excel</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "settings"
              ? "bg-purple-600 text-white shadow-md shadow-purple-500/25 scale-[1.02]"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <i className="fa-solid fa-sliders text-xs"></i>
          <span>Điều kiện Rút & Chia</span>
        </button>

        <button
          onClick={() => setActiveTab("templates")}
          className={`flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "templates"
              ? "bg-purple-600 text-white shadow-md shadow-purple-500/25 scale-[1.02]"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <i className="fa-solid fa-comment-dots text-xs"></i>
          <span>Cấu hình Bot Zalo</span>
        </button>
      </div>

      {/* ===================== TAB CONTENT: TỔNG QUAN ===================== */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* SECTION 1: HOẠT ĐỘNG CHUNG */}
          <div className="space-y-3">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider font-display">
              HOẠT ĐỘNG CHUNG
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {/* Card 1: Tổng Thành Viên */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 md:p-5 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold mb-2 md:mb-3">
                  <i className="fa-solid fa-users"></i>
                </div>
                <div className="text-[10px] md:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  TỔNG THÀNH VIÊN
                </div>
                <div className="text-xl md:text-3xl font-black text-slate-900 mt-1 font-display">
                  {stats?.totalUsers || zaloUsers.length || 0}
                </div>
              </div>

              {/* Card 2: Tổng Đơn Hàng */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 md:p-5 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center text-sm font-bold mb-2 md:mb-3">
                  <i className="fa-solid fa-box"></i>
                </div>
                <div className="text-[10px] md:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  TỔNG ĐƠN HÀNG
                </div>
                <div className="text-xl md:text-3xl font-black text-slate-900 mt-1 font-display">
                  {stats?.totalOrders || orders.length || 0}
                </div>
              </div>

              {/* Card 3: Yêu Cầu Rút Chờ Duyệt */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 md:p-5 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-sm font-bold mb-2 md:mb-3">
                  <i className="fa-solid fa-clock"></i>
                </div>
                <div className="text-[10px] md:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  YÊU CẦU RÚT CHỜ DUYỆT
                </div>
                <div className="text-xl md:text-3xl font-black text-slate-900 mt-1 font-display">
                  {pendingPayouts.length} <span className="text-xs md:text-sm font-bold text-slate-500">lệnh</span>
                </div>
              </div>

              {/* Card 4: Tiền Rút Chờ Duyệt */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 md:p-5 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center text-sm font-bold mb-2 md:mb-3">
                  <i className="fa-solid fa-money-bill"></i>
                </div>
                <div className="text-[10px] md:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  TIỀN RÚT CHỜ DUYỆT
                </div>
                <div className="text-lg md:text-2xl font-black text-slate-900 mt-1 font-display truncate">
                  {formatMoney(stats?.totalPendingAmount || 0)}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: TÀI CHÍNH (SAU ĐỐI SOÁT HOÀN THÀNH) */}
          <div className="space-y-3">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider font-display">
              TÀI CHÍNH (SAU ĐỐI SOÁT HOÀN THÀNH)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Card 1: 1. Hoa Hồng Thô */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
                  <i className="fa-solid fa-money-bill-wave"></i>
                </div>
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider leading-tight">
                  1. HOA HỒNG THÔ (SÀN TRẢ)
                </div>
                <div className="text-base md:text-lg font-black text-slate-900 font-display truncate">
                  {formatMoney(stats?.totalRawCommission || 0)}
                </div>
              </div>

              {/* Card 2: 2. Thuế Thu Nhập (10%) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-2">
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center text-xs font-black">
                  %
                </div>
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider leading-tight">
                  2. THUẾ THU NHẬP ({taxRate}%)
                </div>
                <div className="text-base md:text-lg font-black text-rose-600 font-display truncate">
                  {formatMoney(stats?.totalTaxAmount || 0)}
                </div>
              </div>

              {/* Card 3: 3. Hoa Hồng Sau Thuế (90%) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center text-xs font-black">
                  <i className="fa-solid fa-scale-balanced"></i>
                </div>
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider leading-tight">
                  3. HOA HỒNG SAU THUẾ ({afterTaxRate}%)
                </div>
                <div className="text-base md:text-lg font-black text-indigo-600 font-display truncate">
                  {formatMoney(stats?.totalAfterTaxCommission || 0)}
                </div>
              </div>

              {/* Card 4: 4. Thành Viên Nhận (80%) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center text-xs font-black">
                  <i className="fa-solid fa-user-check"></i>
                </div>
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider leading-tight">
                  4. THÀNH VIÊN NHẬN ({customerSplitRate}%)
                </div>
                <div className="text-base md:text-lg font-black text-emerald-600 font-display truncate">
                  {formatMoney(stats?.totalCustomerCommission || 0)}
                </div>
              </div>

              {/* Card 5: 5. Admin Giữ Lại (20%) */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-black">
                  <i className="fa-solid fa-briefcase"></i>
                </div>
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider leading-tight">
                  5. ADMIN GIỮ LẠI ({adminSplitRate}%)
                </div>
                <div className="text-base md:text-lg font-black text-amber-600 font-display truncate">
                  {formatMoney(stats?.totalAdminProfit || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB CONTENT: NGƯỜI DÙNG ===================== */}
      {activeTab === "users" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">Danh Sách Thành Viên ({zaloUsers.length})</h3>
              <p className="text-[11px] text-slate-500">Người mua hàng liên kết Zalo ID với nhóm {groupDisplayName}</p>
            </div>
            <input
              type="text"
              placeholder="Tìm theo Zalo ID, Tên, STK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-500 w-full sm:w-64"
            />
          </div>

          {/* Mobile Card View (sm:hidden) */}
          <div className="block sm:hidden divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Chưa có thành viên nào trong danh sách.
              </div>
            ) : (
              filteredUsers.map((u) => (
                <div key={u.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                      ID: {u.zaloId}
                    </span>
                    <span className="text-xs font-bold text-slate-700">{u.zaloName || "—"}</span>
                  </div>

                  <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                    <div className="text-slate-500 text-[11px]">Thông tin ngân hàng:</div>
                    {u.bankName ? (
                      <div className="font-bold text-slate-900">
                        {u.bankName} - {u.accountNumber} <span className="font-normal text-slate-600">({u.accountName})</span>
                      </div>
                    ) : (
                      <div className="text-slate-400 italic text-[11px]">Chưa liên kết tài khoản ngân hàng</div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Số dư tích lũy</span>
                      <span className="font-black text-emerald-600 text-sm font-display">{formatMoney(u.balance || 0)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Đã rút</span>
                      <span className="font-bold text-slate-600 text-xs font-display">{formatMoney(u.totalWithdrawn || 0)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View (hidden sm:block) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-extrabold border-b border-slate-200/80 text-[11px] uppercase tracking-wider">
                  <th className="p-3.5">Zalo ID</th>
                  <th className="p-3.5">Tên hiển thị</th>
                  <th className="p-3.5">Ngân hàng & STK</th>
                  <th className="p-3.5 text-right">Số dư tích lũy</th>
                  <th className="p-3.5 text-right">Đã rút</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400 text-xs">
                      Chưa có thành viên nào trong danh sách.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/60">
                      <td className="p-3.5 font-mono font-bold text-slate-900">{u.zaloId}</td>
                      <td className="p-3.5 font-bold">{u.zaloName || "—"}</td>
                      <td className="p-3.5">
                        {u.bankName ? (
                          <span>
                            <strong className="text-slate-900">{u.bankName}</strong> - {u.accountNumber} ({u.accountName})
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Chưa liên kết</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right font-black text-emerald-600 font-display">
                        {formatMoney(u.balance || 0)}
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-500 font-display">
                        {formatMoney(u.totalWithdrawn || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== TAB CONTENT: RÚT TIỀN ===================== */}
      {activeTab === "payouts" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">Yêu Cầu Rút Tiền ({payouts.length})</h3>
              <p className="text-[11px] text-slate-500">Duyệt chuyển khoản hoa hồng cho thành viên</p>
            </div>
          </div>

          {/* Mobile Card View (sm:hidden) */}
          <div className="block sm:hidden divide-y divide-slate-100">
            {payouts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Không có yêu cầu rút tiền nào.
              </div>
            ) : (
              payouts.map((p) => {
                const isPending = p.status === "PENDING";
                return (
                  <div key={p.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          #{p.id}
                        </span>
                        <span className="text-[11px] text-slate-400">{formatDate(p.createdAt)}</span>
                      </div>
                      <div>
                        {isPending ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                            Chờ duyệt
                          </span>
                        ) : p.status === "COMPLETED" ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Đã chuyển
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                            Từ chối
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Thành viên (Zalo ID):</span>
                        <span className="font-mono font-bold text-slate-900">{p.zaloId}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Ngân hàng:</span>
                        <span className="font-bold text-slate-900">{p.bankName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Số tài khoản:</span>
                        <span className="font-mono font-bold text-slate-900">{p.accountNumber}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">Chủ tài khoản:</span>
                        <span className="font-bold text-slate-700">{p.accountName}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Số tiền rút</span>
                        <span className="font-black text-rose-600 text-base font-display">{formatMoney(p.amount || 0)}</span>
                      </div>

                      {isPending && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRejectPayout(p.id)}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold border border-rose-200 transition cursor-pointer"
                          >
                            Từ chối
                          </button>
                          <button
                            onClick={() => handleApprovePayout(p.id)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/20 transition cursor-pointer flex items-center gap-1.5"
                          >
                            <i className="fa-solid fa-check text-xs"></i>
                            <span>Duyệt Rút</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View (hidden sm:block) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-extrabold border-b border-slate-200/80 text-[11px] uppercase tracking-wider">
                  <th className="p-3.5">Mã / Ngày tạo</th>
                  <th className="p-3.5">Zalo ID</th>
                  <th className="p-3.5">Ngân hàng nhận</th>
                  <th className="p-3.5 text-right">Số tiền rút</th>
                  <th className="p-3.5 text-center">Trạng thái</th>
                  <th className="p-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400 text-xs">
                      Không có yêu cầu rút tiền nào.
                    </td>
                  </tr>
                ) : (
                  payouts.map((p) => {
                    const isPending = p.status === "PENDING";
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60">
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-slate-900">#{p.id}</div>
                          <div className="text-[10px] text-slate-400">{formatDate(p.createdAt)}</div>
                        </td>
                        <td className="p-3.5 font-mono font-bold">{p.zaloId}</td>
                        <td className="p-3.5">
                          <strong className="text-slate-900">{p.bankName}</strong>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {p.accountNumber} ({p.accountName})
                          </div>
                        </td>
                        <td className="p-3.5 text-right font-black text-slate-900 font-display text-sm">
                          {formatMoney(p.amount || 0)}
                        </td>
                        <td className="p-3.5 text-center">
                          {isPending ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                              Chờ duyệt
                            </span>
                          ) : p.status === "COMPLETED" ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Đã chuyển
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                              Từ chối
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleApprovePayout(p.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                              >
                                Duyệt
                              </button>
                              <button
                                onClick={() => handleRejectPayout(p.id)}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold border border-rose-200 transition cursor-pointer"
                              >
                                Từ chối
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Đã xong</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== TAB CONTENT: ĐƠN SHOPEE & TIKTOK ===================== */}
      {(activeTab === "shopee" || activeTab === "tiktok") && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                {activeTab === "shopee" ? "Đơn Hàng Shopee" : "Đơn Hàng TikTok Shop"} ({filteredOrders.length})
              </h3>
              <p className="text-[11px] text-slate-500">Danh sách đơn hàng đối soát của nhóm {groupDisplayName}</p>
            </div>
            <input
              type="text"
              placeholder="Tìm theo Mã đơn, Sản phẩm, Zalo ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-500 w-full sm:w-64"
            />
          </div>

          {/* Mobile Card View (sm:hidden) */}
          <div className="block sm:hidden divide-y divide-slate-100">
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Không tìm thấy đơn hàng nào.
              </div>
            ) : (
              filteredOrders.map((o) => (
                <div key={o.id} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-slate-900 text-xs bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      #{o.orderId}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {o.status || "Hoàn thành"}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-800 line-clamp-2">
                    {o.productName || "Sản phẩm Shopee / TikTok Shop"}
                  </div>

                  <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[11px]">Zalo ID:</span>
                    <span className="font-mono font-bold text-slate-900">{o.zaloId || "—"}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Hoa hồng thô</span>
                      <span className="font-mono font-bold text-slate-700">{formatMoney(o.rawCommission || 0)}</span>
                    </div>
                    <div className="bg-emerald-50/60 p-2 rounded-xl border border-emerald-100 text-right">
                      <span className="text-[10px] text-emerald-600 uppercase font-black block">Khách nhận ({customerSplitRate}%)</span>
                      <span className="font-black text-emerald-700 font-display">{formatMoney(o.finalCommission || 0)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View (hidden sm:block) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-extrabold border-b border-slate-200/80 text-[11px] uppercase tracking-wider">
                  <th className="p-3.5">Mã đơn</th>
                  <th className="p-3.5">Sản phẩm</th>
                  <th className="p-3.5">Zalo ID</th>
                  <th className="p-3.5 text-right">Hoa hồng thô</th>
                  <th className="p-3.5 text-right">Khách nhận ({customerSplitRate}%)</th>
                  <th className="p-3.5 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400 text-xs">
                      Không tìm thấy đơn hàng nào.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/60">
                      <td className="p-3.5 font-mono font-bold text-slate-900">{o.orderId}</td>
                      <td className="p-3.5 max-w-xs truncate" title={o.productName}>
                        {o.productName || "Sản phẩm Shopee / TikTok"}
                      </td>
                      <td className="p-3.5 font-mono">{o.zaloId || "—"}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-600">
                        {formatMoney(o.rawCommission || 0)}
                      </td>
                      <td className="p-3.5 text-right font-black text-emerald-600 font-display">
                        {formatMoney(o.finalCommission || 0)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {o.status || "Hoàn thành"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== TAB CONTENT: NẠP EXCEL ===================== */}
      {activeTab === "import" && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-2xs space-y-6">
          <div>
            <h3 className="text-base md:text-lg font-black text-slate-900 font-display flex items-center gap-2">
              <i className="fa-solid fa-cloud-arrow-up text-orange-500"></i>
              <span>Nhập Báo Cáo Đối Soát Đơn Hàng Cho {groupDisplayName}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Dữ liệu đơn sau khi nạp sẽ được lưu độc lập vào kho riêng biệt của nhóm này.
            </p>
          </div>

          {/* Styled Dropzone */}
          <div className="border-2 border-dashed border-orange-200/90 bg-orange-50/40 rounded-3xl p-8 md:p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white text-orange-500 flex items-center justify-center text-3xl shadow-xs border border-orange-200 mx-auto">
              <i className="fa-solid fa-file-csv"></i>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-extrabold text-slate-900">
                Chọn file Excel (.xlsx / .xls) hoặc CSV từ Shopee & TikTok
              </p>
              <p className="text-xs text-slate-500">
                Hệ thống tự nhận diện cột: Mã đơn, Tên sản phẩm, Hoa hồng, Trạng thái
              </p>
            </div>

            <div className="flex flex-col items-center justify-center gap-3 pt-2">
              <label className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-black text-xs rounded-2xl border border-slate-300 shadow-2xs cursor-pointer inline-flex items-center gap-2 transition hover:border-orange-400">
                <i className="fa-solid fa-folder-open text-orange-500"></i>
                <span>{importFile ? importFile.name : "Chọn file từ máy tính"}</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => setImportFile(e.target.files[0])}
                />
              </label>

              {importFile && (
                <button
                  onClick={handleUploadExcel}
                  disabled={isImporting}
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs rounded-2xl shadow-md shadow-orange-500/25 transition cursor-pointer flex items-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Đang xử lý file...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-upload"></i> Nạp Báo Cáo Ngay
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {importResult && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5">
              <i className="fa-solid fa-circle-check text-lg text-emerald-600 shrink-0"></i>
              <span>{importResult.message}</span>
            </div>
          )}

          {/* Info cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <i className="fa-solid fa-calculator text-orange-500"></i> Thuật toán chia hoa hồng tự động:
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hoa hồng sau thuế = Hoa hồng gốc × (100% - {taxRate}%)
                <br />
                Khách nhận = Hoa hồng sau thuế × {customerSplitRate}%
                <br />
                Trưởng nhóm giữ = Hoa hồng sau thuế × {adminSplitRate}%
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <i className="fa-solid fa-shield-halved text-emerald-600"></i> Bảo mật và phân quyền:
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Đơn hàng và ví tiền của nhóm {groupDisplayName} được lưu trữ độc lập trên cơ sở dữ liệu saas_db, bảo mật 100% không lo bị rò rỉ hay nghẽn hệ thống.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB CONTENT: CẤU HÌNH TIN NHẮN BOT ===================== */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-lg font-bold">
                  <i className="fa-solid fa-robot"></i>
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 font-display">
                    Tùy Chỉnh Câu Trả Lời Của Zalo Bot
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Tự do cá nhân hóa câu từ, lời chào, tag @ thành viên và các phản hồi lỗi theo phong cách nhóm
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetAllTemplates}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-rotate-left text-[11px]"></i>
                  <span>Khôi phục tất cả về mặc định</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveTemplates}
                  disabled={isSavingTemplates}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black shadow-md shadow-purple-500/25 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingTemplates ? (
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                  ) : (
                    <i className="fa-solid fa-floppy-disk"></i>
                  )}
                  <span>Lưu Cấu Hình</span>
                </button>
              </div>
            </div>

            {templateSaveMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <i className="fa-solid fa-circle-check text-emerald-600 text-sm"></i>
                <span>{templateSaveMessage}</span>
              </div>
            )}

            {/* Placeholder Cheatsheet */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5">
              <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                <i className="fa-solid fa-code text-purple-600"></i> Bảng Từ Khóa Động (Placeholder):
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Bạn có thể chèn các từ khóa sau vào câu chữ. Khi Bot gửi tin nhắn, hệ thống sẽ tự động thay thế bằng dữ liệu thật của khách hàng:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 bg-white rounded-xl border border-slate-200/80 font-mono">
                  <span className="font-black text-purple-600">{"@{user}"}</span>
                  <p className="text-[10px] text-slate-500 font-sans font-medium mt-0.5">Tag tên Zalo rung chuông</p>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200/80 font-mono">
                  <span className="font-black text-orange-600">{"{link}"}</span>
                  <p className="text-[10px] text-slate-500 font-sans font-medium mt-0.5">Link tra cứu rút gọn</p>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200/80 font-mono">
                  <span className="font-black text-emerald-600">{"{split_rate}"}</span>
                  <p className="text-[10px] text-slate-500 font-sans font-medium mt-0.5">Tỷ lệ hoàn ({customerSplitRate}%)</p>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200/80 font-mono">
                  <span className="font-black text-blue-600">{"{group_name}"}</span>
                  <p className="text-[10px] text-slate-500 font-sans font-medium mt-0.5">Tên nhóm ({groupDisplayName})</p>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200/80 font-mono">
                  <span className="font-black text-indigo-600">{"{affiliate_link}"}</span>
                  <p className="text-[10px] text-slate-500 font-sans font-medium mt-0.5">Link mua hàng đã chuyển đổi</p>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200/80 font-mono">
                  <span className="font-black text-amber-600">{"{order_id}"}</span>
                  <p className="text-[10px] text-slate-500 font-sans font-medium mt-0.5">Mã đơn hàng</p>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200/80 font-mono">
                  <span className="font-black text-rose-600">{"{balance}"}</span>
                  <p className="text-[10px] text-slate-500 font-sans font-medium mt-0.5">Số dư khả dụng</p>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200/80 font-mono">
                  <span className="font-black text-slate-700">{"{command}"}</span>
                  <p className="text-[10px] text-slate-500 font-sans font-medium mt-0.5">Lệnh khách nhập sai</p>
                </div>
              </div>
            </div>
          </div>

          {/* Subtabs Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setTemplateSubTab("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                templateSubTab === "all" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Tất cả (9 mẫu)
            </button>
            <button
              onClick={() => setTemplateSubTab("main")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                templateSubTab === "main" ? "bg-purple-600 text-white" : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Lệnh Chính (/tracuu, trả link, chào mừng)
            </button>
            <button
              onClick={() => setTemplateSubTab("errors")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                templateSubTab === "errors" ? "bg-rose-600 text-white" : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              Phủ Định & Báo Lỗi (Không có đơn, sai lệnh)
            </button>
          </div>

          {/* Templates Grid */}
          <div className="space-y-4">
            {/* 1. Mẫu Trả Link */}
            {(templateSubTab === "all" || templateSubTab === "main") && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">
                      <i className="fa-solid fa-link"></i>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">
                        1. Mẫu tin nhắn Trả Link Mua Hàng Hoàn Tiền
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Phát ra khi khách gửi link sản phẩm Shopee / TikTok vào nhóm
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResetTemplate("template_link")}
                    className="text-slate-400 hover:text-purple-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <i className="fa-solid fa-rotate-left text-[10px]"></i> Mặc định
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={botTemplates.template_link || defaultTemplates.template_link || ""}
                  onChange={(e) => setBotTemplates({ ...botTemplates, template_link: e.target.value })}
                  placeholder={defaultTemplates.template_link || ""}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:border-purple-500 outline-hidden font-mono leading-relaxed"
                />
              </div>
            )}

            {/* 2. Mẫu Tra Cứu (Có Đơn) */}
            {(templateSubTab === "all" || templateSubTab === "main") && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                      <i className="fa-solid fa-magnifying-glass"></i>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">
                        2. Mẫu tin nhắn Tra Cứu Khi ĐÃ CÓ ĐƠN HÀNG (/tracuu)
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Gửi kèm đường link tra cứu rút gọn Mẫu 3 cho khách đã có tích lũy
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResetTemplate("template_lookup_has_orders")}
                    className="text-slate-400 hover:text-purple-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <i className="fa-solid fa-rotate-left text-[10px]"></i> Mặc định
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={botTemplates.template_lookup_has_orders || defaultTemplates.template_lookup_has_orders || ""}
                  onChange={(e) => setBotTemplates({ ...botTemplates, template_lookup_has_orders: e.target.value })}
                  placeholder={defaultTemplates.template_lookup_has_orders || ""}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:border-purple-500 outline-hidden font-mono leading-relaxed"
                />
              </div>
            )}

            {/* 3. Mẫu Tra Cứu (Chưa Có Đơn) */}
            {(templateSubTab === "all" || templateSubTab === "main" || templateSubTab === "errors") && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">
                      <i className="fa-solid fa-circle-question"></i>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">
                        3. Mẫu tin nhắn Tra Cứu Khi CHƯA CÓ ĐƠN HÀNG
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Phản hồi khi khách mới gõ /tracuu nhưng chưa phát sinh đơn nào qua link nhóm
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResetTemplate("template_lookup_no_orders")}
                    className="text-slate-400 hover:text-purple-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <i className="fa-solid fa-rotate-left text-[10px]"></i> Mặc định
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={botTemplates.template_lookup_no_orders || defaultTemplates.template_lookup_no_orders || ""}
                  onChange={(e) => setBotTemplates({ ...botTemplates, template_lookup_no_orders: e.target.value })}
                  placeholder={defaultTemplates.template_lookup_no_orders || ""}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:border-purple-500 outline-hidden font-mono leading-relaxed"
                />
              </div>
            )}

            {/* 4. Mẫu Chào Mừng Thành Viên Mới */}
            {(templateSubTab === "all" || templateSubTab === "main") && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center text-xs font-bold">
                      <i className="fa-solid fa-hand-peace"></i>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">
                        4. Mẫu tin nhắn Chào Mừng Thành Viên Mới
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Tự động tag tên và gửi vào nhóm khi có người mới tham gia
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResetTemplate("template_welcome")}
                    className="text-slate-400 hover:text-purple-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <i className="fa-solid fa-rotate-left text-[10px]"></i> Mặc định
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={botTemplates.template_welcome || defaultTemplates.template_welcome || ""}
                  onChange={(e) => setBotTemplates({ ...botTemplates, template_welcome: e.target.value })}
                  placeholder={defaultTemplates.template_welcome || ""}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:border-purple-500 outline-hidden font-mono leading-relaxed"
                />
              </div>
            )}

            {/* 5. Mẫu Hướng Dẫn Trợ Giúp */}
            {(templateSubTab === "all" || templateSubTab === "main") && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                      <i className="fa-solid fa-circle-info"></i>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">
                        5. Mẫu tin nhắn Trợ Giúp / Danh Sách Lệnh (/help)
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Bảng hướng dẫn cú pháp lệnh hiển thị khi gõ /help hoặc /hd
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResetTemplate("template_help")}
                    className="text-slate-400 hover:text-purple-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <i className="fa-solid fa-rotate-left text-[10px]"></i> Mặc định
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={botTemplates.template_help || defaultTemplates.template_help || ""}
                  onChange={(e) => setBotTemplates({ ...botTemplates, template_help: e.target.value })}
                  placeholder={defaultTemplates.template_help || ""}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:border-purple-500 outline-hidden font-mono leading-relaxed"
                />
              </div>
            )}

            {/* 6. Mẫu Báo Lỗi: Mã đơn không tồn tại */}
            {(templateSubTab === "all" || templateSubTab === "errors") && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold">
                      <i className="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">
                        6. Mẫu Báo Lỗi: Không Tìm Thấy Mã Đơn Hàng
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Phản hồi khi khách nhập một mã đơn không tồn tại trong báo cáo đối soát
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResetTemplate("template_order_not_found")}
                    className="text-slate-400 hover:text-purple-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <i className="fa-solid fa-rotate-left text-[10px]"></i> Mặc định
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={botTemplates.template_order_not_found || defaultTemplates.template_order_not_found || ""}
                  onChange={(e) => setBotTemplates({ ...botTemplates, template_order_not_found: e.target.value })}
                  placeholder={defaultTemplates.template_order_not_found || ""}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:border-purple-500 outline-hidden font-mono leading-relaxed"
                />
              </div>
            )}

            {/* 7. Mẫu Báo Lỗi: Lệnh không hợp lệ */}
            {(templateSubTab === "all" || templateSubTab === "errors") && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
                      <i className="fa-solid fa-circle-xmark"></i>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">
                        7. Mẫu Báo Lỗi: Nhập Lệnh Không Hợp Lệ
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Phản hồi khi khách gõ các lệnh không tồn tại (VD: /abc, /xyz...)
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResetTemplate("template_invalid_command")}
                    className="text-slate-400 hover:text-purple-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <i className="fa-solid fa-rotate-left text-[10px]"></i> Mặc định
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={botTemplates.template_invalid_command || defaultTemplates.template_invalid_command || ""}
                  onChange={(e) => setBotTemplates({ ...botTemplates, template_invalid_command: e.target.value })}
                  placeholder={defaultTemplates.template_invalid_command || ""}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:border-purple-500 outline-hidden font-mono leading-relaxed"
                />
              </div>
            )}

            {/* 8. Mẫu Báo Lỗi: Sai cú pháp lưu Ngân Hàng */}
            {(templateSubTab === "all" || templateSubTab === "errors") && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">
                      <i className="fa-solid fa-building-columns"></i>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">
                        8. Mẫu Báo Lỗi: Sai Cú Pháp Lưu Ngân Hàng (/stk)
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Nhắc nhở cú pháp đúng khi khách gõ thiếu tên ngân hàng hoặc STK
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResetTemplate("template_invalid_bank_syntax")}
                    className="text-slate-400 hover:text-purple-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <i className="fa-solid fa-rotate-left text-[10px]"></i> Mặc định
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={botTemplates.template_invalid_bank_syntax || defaultTemplates.template_invalid_bank_syntax || ""}
                  onChange={(e) => setBotTemplates({ ...botTemplates, template_invalid_bank_syntax: e.target.value })}
                  placeholder={defaultTemplates.template_invalid_bank_syntax || ""}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:border-purple-500 outline-hidden font-mono leading-relaxed"
                />
              </div>
            )}

            {/* 9. Mẫu Báo Lỗi: Ví 0đ hoặc chưa đủ hạn mức rút */}
            {(templateSubTab === "all" || templateSubTab === "errors") && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">
                      <i className="fa-solid fa-wallet"></i>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">
                        9. Mẫu Báo Lỗi: Số Dư Bằng 0đ / Chưa Đủ Min Rút (/ruttien)
                      </h4>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Phản hồi khi khách yêu cầu rút tiền nhưng ví khả dụng chưa đủ hạn mức
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResetTemplate("template_withdraw_zero")}
                    className="text-slate-400 hover:text-purple-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <i className="fa-solid fa-rotate-left text-[10px]"></i> Mặc định
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={botTemplates.template_withdraw_zero || defaultTemplates.template_withdraw_zero || ""}
                  onChange={(e) => setBotTemplates({ ...botTemplates, template_withdraw_zero: e.target.value })}
                  placeholder={defaultTemplates.template_withdraw_zero || ""}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:border-purple-500 outline-hidden font-mono leading-relaxed"
                />
              </div>
            )}
          </div>

          {/* Bottom Save bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetAllTemplates}
              className="px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer transition"
            >
              Khôi phục tất cả về mặc định
            </button>
            <button
              type="button"
              onClick={handleSaveTemplates}
              disabled={isSavingTemplates}
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black shadow-md shadow-purple-500/25 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isSavingTemplates ? (
                <i className="fa-solid fa-spinner fa-spin"></i>
              ) : (
                <i className="fa-solid fa-floppy-disk"></i>
              )}
              <span>Lưu Cấu Hình Tin Nhắn</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================== TAB CONTENT: CÀI ĐẶT ĐIỀU KIỆN RÚT & TỶ LỆ ===================== */}
      {activeTab === "settings" && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 text-[10px] font-black uppercase tracking-wider border border-purple-400/30">
                  Dành riêng cho Trưởng Nhóm
                </span>
                <h2 className="text-xl sm:text-2xl font-black font-display mt-2 tracking-tight">
                  Cài Đặt Điều Kiện Rút Tiền & Tỷ Lệ Chia
                </h2>
                <p className="text-xs text-slate-300 font-medium mt-1 max-w-2xl">
                  Bạn có toàn quyền tùy chỉnh số ngày giữ tiền sau khi hoàn thành đơn (cho rút liền hoặc chờ 3 ngày, 7 ngày...), hạn mức rút tối thiểu và tỷ lệ chia % hoa hồng cho các thành viên trong nhóm.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black shadow-lg shadow-emerald-500/25 transition cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap active:scale-[0.98] disabled:opacity-50 shrink-0"
              >
                {isSavingSettings ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-floppy-disk"></i>
                )}
                <span>Lưu Cài Đặt Ngay</span>
              </button>
            </div>
          </div>

          {settingsSaveMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-2xs">
              <i className="fa-solid fa-circle-check text-emerald-600 text-base"></i>
              <span>{settingsSaveMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* THẺ 1: ĐIỀU KIỆN SỐ NGÀY GIỮ TIỀN (HOLDING DAYS) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-base font-bold shadow-2xs">
                  <i className="fa-solid fa-hourglass-half"></i>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    1. Số Ngày Giữ Tiền Sau Khi Đơn Hoàn Thành
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Quyết định thời điểm chuyển hoa hồng từ "Đã hoàn thành" sang "Số dư được rút".
                  </p>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-slate-700">
                  Chọn chính sách giữ tiền nhanh:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, holdingDays: 0 })}
                    className={`p-3 rounded-2xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      Number(settings.holdingDays) === 0
                        ? "bg-purple-50 border-purple-500 text-purple-700 shadow-2xs ring-2 ring-purple-500/20"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-base">⚡</span>
                    <span className="font-black">Rút Liền</span>
                    <span className="text-[10px] text-slate-500 font-normal">(0 ngày)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, holdingDays: 3 })}
                    className={`p-3 rounded-2xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      Number(settings.holdingDays) === 3
                        ? "bg-purple-50 border-purple-500 text-purple-700 shadow-2xs ring-2 ring-purple-500/20"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-base">⏳</span>
                    <span className="font-black">3 Ngày</span>
                    <span className="text-[10px] text-emerald-600 font-bold">(Shopee chuẩn)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, holdingDays: 7 })}
                    className={`p-3 rounded-2xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      Number(settings.holdingDays) === 7
                        ? "bg-purple-50 border-purple-500 text-purple-700 shadow-2xs ring-2 ring-purple-500/20"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-base">🗓️</span>
                    <span className="font-black">7 Ngày</span>
                    <span className="text-[10px] text-slate-500 font-normal">(1 tuần)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, holdingDays: 14 })}
                    className={`p-3 rounded-2xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      Number(settings.holdingDays) === 14
                        ? "bg-purple-50 border-purple-500 text-purple-700 shadow-2xs ring-2 ring-purple-500/20"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-base">📅</span>
                    <span className="font-black">14 Ngày</span>
                    <span className="text-[10px] text-slate-500 font-normal">(2 tuần)</span>
                  </button>
                </div>
              </div>

              {/* Custom number input */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-extrabold text-slate-700">
                  Hoặc nhập số ngày giữ tùy chỉnh:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={settings.holdingDays}
                    onChange={(e) => setSettings({ ...settings, holdingDays: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-purple-500 shadow-2xs"
                  />
                  <span className="absolute right-4 top-2.5 text-xs font-bold text-slate-400">
                    ngày
                  </span>
                </div>
              </div>

              {/* Explanatory Live Box */}
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 text-xs text-purple-950 space-y-1.5">
                <div className="font-black flex items-center gap-1.5 text-purple-800">
                  <i className="fa-solid fa-circle-info"></i>
                  <span>Quy tắc hiển thị trên trang tra cứu cá nhân:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-purple-900">
                  {Number(settings.holdingDays) === 0 ? (
                    <>
                      ⚡ <strong>Chế độ Rút Liền (0 ngày):</strong> Thành viên có thể rút toàn bộ hoa hồng ngay khi đơn hàng chuyển sang trạng thái <strong>Hoàn thành</strong>.
                    </>
                  ) : (
                    <>
                      ⏳ <strong>Chế độ Giữ {settings.holdingDays} ngày:</strong> Khi đơn hoàn thành, hoa hồng sẽ hiển thị ở mục <em>Đã hoàn thành</em>. Sau đúng <strong>{settings.holdingDays} ngày</strong> (hết thời gian khiếu nại/đổi trả của Shopee/TikTok), tiền sẽ tự động chuyển sang <strong>Số dư khả dụng</strong> để thành viên đặt lệnh rút.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* THẺ 2: HẠN MỨC RÚT TIỀN TỐI THIỂU */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-base font-bold shadow-2xs">
                  <i className="fa-solid fa-money-bill-transfer"></i>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    2. Hạn Mức Rút Tiền Tối Thiểu (Min Payout)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Số tiền tối thiểu thành viên cần tích lũy trong ví khả dụng để tạo lệnh rút về ngân hàng.
                  </p>
                </div>
              </div>

              {/* Quick Min Preset Buttons */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-slate-700">
                  Chọn mức rút tối thiểu phổ biến:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[10000, 20000, 50000, 100000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSettings({ ...settings, minWithdrawAmount: amt })}
                      className={`p-3 rounded-2xl text-xs font-black border transition flex items-center justify-center cursor-pointer ${
                        Number(settings.minWithdrawAmount) === amt
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-2xs ring-2 ring-emerald-500/20"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {formatMoney(amt)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Min input */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-extrabold text-slate-700">
                  Hoặc nhập số tiền rút tối thiểu tùy ý (VNĐ):
                </label>
                <input
                  type="number"
                  step="1000"
                  min="1000"
                  value={settings.minWithdrawAmount}
                  onChange={(e) => setSettings({ ...settings, minWithdrawAmount: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 shadow-2xs"
                />
              </div>

              {/* Ghi chú điều kiện rút */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-extrabold text-slate-700">
                  Ghi chú điều kiện rút hiển thị cho người mua (Tùy chọn):
                </label>
                <input
                  type="text"
                  value={settings.withdrawalRuleNote || ""}
                  onChange={(e) => setSettings({ ...settings, withdrawalRuleNote: e.target.value })}
                  placeholder={`VD: Rút tiền duyệt tự động vào 20h hàng ngày...`}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-emerald-500 shadow-2xs"
                />
              </div>
            </div>

            {/* THẺ 3: TỶ LỆ CHIA HOA HỒNG & THUẾ */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-base font-bold shadow-2xs">
                  <i className="fa-solid fa-chart-pie"></i>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    3. Tỷ Lệ Chia Hoa Hồng Cho Thành Viên (%)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Quy định tỷ lệ phần trăm tiền hoàn trả lại cho người mua sau khi trừ thuế.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-700">
                    Khách hàng nhận (% sau thuế):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="100"
                      value={settings.customerSplitRate}
                      onChange={(e) => setSettings({ ...settings, customerSplitRate: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 shadow-2xs"
                    />
                    <span className="absolute right-4 top-2.5 text-xs font-black text-slate-400">%</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-700">
                    Thuế VAT / TNCN sàn trừ (%):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="30"
                      value={settings.taxRate}
                      onChange={(e) => setSettings({ ...settings, taxRate: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-500 shadow-2xs"
                    />
                    <span className="absolute right-4 top-2.5 text-xs font-black text-slate-400">%</span>
                  </div>
                </div>
              </div>

              {/* Profit preview card */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-center justify-between text-xs font-bold text-indigo-950">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-calculator text-indigo-600"></i>
                  <span>Lợi nhuận Admin (Trưởng nhóm) thực giữ lại:</span>
                </div>
                <span className="text-base font-black text-indigo-600 font-display">
                  {Math.max(0, 100 - Number(settings.taxRate) - Number(settings.customerSplitRate))}%
                </span>
              </div>
            </div>

            {/* THẺ 4: THÔNG TIN NHẬN DIỆN NHÓM & ADMIN */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-base font-bold shadow-2xs">
                  <i className="fa-solid fa-id-badge"></i>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    4. Thông Tin Nhận Diện Nhóm & Zalo Admin
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tên hiển thị thương hiệu của bạn trên trang tra cứu và bot tin nhắn.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-700">
                    Tên nhóm / Thương hiệu đối soát:
                  </label>
                  <input
                    type="text"
                    value={settings.name || ""}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                    placeholder={`VD: Lê Cường Affiliate, Trần Huyền Cashback...`}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-orange-500 shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-700">
                    Zalo ID Admin nhận thông báo lệnh rút:
                  </label>
                  <input
                    type="text"
                    value={settings.adminZaloId || ""}
                    onChange={(e) => setSettings({ ...settings, adminZaloId: e.target.value })}
                    placeholder={`VD: 0888728256 hoặc ID Zalo...`}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-orange-500 shadow-2xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Save Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black shadow-lg shadow-purple-500/25 transition cursor-pointer flex items-center gap-2 disabled:opacity-50 active:scale-[0.98]"
            >
              {isSavingSettings ? (
                <i className="fa-solid fa-spinner fa-spin"></i>
              ) : (
                <i className="fa-solid fa-floppy-disk"></i>
              )}
              <span>Lưu Toàn Bộ Cài Đặt Hệ Thống</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
