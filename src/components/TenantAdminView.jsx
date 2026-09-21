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

export function TenantAdminView({ apiRoot, currentTenant, availableTenants, onSelectTenant, user, token, onOpenLogin }) {
  const activeTenant =
    currentTenant ||
    (availableTenants && user?.tenantId
      ? availableTenants.find((t) => String(t.id) === String(user.tenantId))
      : null) ||
    (APP_CONFIG.isStandalone ? APP_CONFIG.tenant : null);

  // Tabs: 'overview' | 'users' | 'zalo_users' | 'payouts' | 'shopee' | 'tiktok' | 'templates' | 'settings'
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [zaloUsers, setZaloUsers] = useState([]);
  const [webUsers, setWebUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters for Orders Tab
  const [adminOrderSearchUser, setAdminOrderSearchUser] = useState("");
  const [adminOrderSearchId, setAdminOrderSearchId] = useState("");
  const [adminOrderSearchProduct, setAdminOrderSearchProduct] = useState("");
  const [adminOrderFilterStatus, setAdminOrderFilterStatus] = useState("Tất cả");
  const [adminOrderDateFrom, setAdminOrderDateFrom] = useState("");
  const [adminOrderDateTo, setAdminOrderDateTo] = useState("");
  const [adminOrderPage, setAdminOrderPage] = useState(1);
  const [showMultiIdBox, setShowMultiIdBox] = useState(false);

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
  const [isConnectingBot, setIsConnectingBot] = useState(false);

  const handleSyncTiktokManual = async () => {
    if (!activeTenant?.slug) {
      alert("❌ Chưa xác định được Kênh Trưởng Nhóm!");
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
  });
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
        });
      }
    } catch (e) {
      console.error("Fetch settings error:", e);
    }
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    if (!activeTenant?.slug) {
      alert("❌ Chưa xác định được Kênh Trưởng Nhóm! Vui lòng chọn Kênh hoặc liên hệ Super Admin.");
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
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/templates`, {
        headers: authHeaders,
      });
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

  const fetchRealQrImage = async () => {
    if (!activeTenant?.slug) return;
    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/bot/qr-image`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        if (data.qrBase64) {
          setRealQrBase64(data.qrBase64);
          setIsGeneratingQr(false);
          setQrMessage("🟢 Mã QR Zalo Đăng Nhập Thật đã sẵn sàng! Mở ứng dụng Zalo trên điện thoại quét ngay.");
        } else if (data.status === "GENERATING_QR") {
          setQrMessage("⏳ Đang nhận mã QR từ máy chủ Zalo (vui lòng chờ 2-3 giây)...");
        }
        if (data.status === "CONNECTED") {
          setShowQrModal(false);
          alert("🎉 Đã quét QR và đăng nhập Bot Zalo thành công!");
          fetchTenantBots();
        }
      }
    } catch (e) {
      console.error("Fetch real QR image error:", e);
    }
  };

  const handleGenerateQr = async () => {
    if (!activeTenant?.slug) {
      alert("❌ Chưa xác định được Kênh Trưởng Nhóm!");
      return;
    }
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
        // Immediately fetch once
        await fetchRealQrImage();
        // Polling QR image every 1.5 seconds
        const pollTimer = setInterval(async () => {
          await fetchRealQrImage();
        }, 1500);
        setTimeout(() => clearInterval(pollTimer), 60000);
      } else {
        alert("❌ " + (data.message || "Lỗi tạo phiên QR"));
        setIsGeneratingQr(false);
      }
    } catch (err) {
      alert("❌ Lỗi kết nối: " + err.message);
      setIsGeneratingQr(false);
    }
  };

  const handleConnectBotManually = async (e) => {
    e.preventDefault();
    if (!activeTenant?.slug) {
      alert("❌ Chưa xác định được Kênh Trưởng Nhóm!");
      return;
    }
    if (!newBotZaloId || !newBotZaloName) {
      alert("Vui lòng nhập Zalo ID và Tên Zalo nick phụ!");
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
        alert("🎉 " + data.message);
        setShowQrModal(false);
        setNewBotZaloId("");
        setNewBotZaloName("");
        setNewBotName("");
        fetchTenantBots();
      } else {
        alert("❌ " + (data.message || "Lỗi kết nối nick bot"));
      }
    } catch (err) {
      alert("❌ Lỗi kết nối: " + err.message);
    } finally {
      setIsConnectingBot(false);
    }
  };

  const handleDisconnectBot = async (botId) => {
    if (!activeTenant?.slug) return;
    if (!window.confirm("Bạn có chắc chắn muốn ngắt kết nối nick Bot Zalo này khỏi Kênh?")) return;
    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/bot/${botId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ " + (data.message || "Đã ngắt kết nối nick Bot thành công!"));
        fetchTenantBots();
      } else {
        alert("❌ " + (data.message || "Lỗi ngắt kết nối"));
      }
    } catch (err) {
      alert("❌ Lỗi kết nối: " + err.message);
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
      alert("❌ Chưa xác định được Kênh Trưởng Nhóm!");
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
    if (!currentTenant && activeTenant && onSelectTenant) {
      onSelectTenant(activeTenant);
    }
    fetchTenantData();
  }, [activeTenant?.slug, apiRoot]);

  const handleApprovePayout = async (payoutId) => {
    if (!activeTenant?.slug) {
      alert("❌ Chưa xác định được Kênh Trưởng Nhóm!");
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
    if (!activeTenant?.slug) {
      alert("❌ Chưa xác định được Kênh Trưởng Nhóm!");
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
    if (!activeTenant?.slug) {
      alert("❌ Chưa xác định được Kênh Trưởng Nhóm! Vui lòng chọn Kênh hoặc liên hệ Super Admin để gán Kênh cho tài khoản của bạn.");
      return;
    }
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
        setImportFile(null);
        fetchTenantData();
      } else {
        setImportResult({
          success: false,
          message: data.message || "Lỗi khi xử lý file Excel",
        });
        alert("❌ " + (data.message || "Lỗi khi xử lý file Excel"));
      }
    } catch (err) {
      setIsImporting(false);
      alert("❌ Lỗi kết nối máy chủ: " + err.message);
    }
  };

  const handleAssignOrder = async (e) => {
    if (e) e.preventDefault();
    if (!selectedOrderToAssign || !assignZaloId) {
      alert("Vui lòng chọn tài khoản Zalo để gán đơn!");
      return;
    }
    if (!activeTenant?.slug) return;

    setIsSubmittingAssign(true);
    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${activeTenant.slug}/orders/${selectedOrderToAssign.id}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ zaloId: assignZaloId }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ " + (data.message || "Đã gán đơn hàng cho thành viên thành công! 🎉"));
        setSelectedOrderToAssign(null);
        setAssignZaloId("");
        fetchTenantData();
      } else {
        alert("❌ " + (data.message || "Lỗi gán đơn hàng"));
      }
    } catch (err) {
      alert("❌ Lỗi máy chủ: " + err.message);
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const groupDisplayName = stats?.tenant?.name || activeTenant?.name || "Nhóm Đối Tác";
  const pendingPayouts = payouts.filter((p) => p.status === "PENDING");
  const totalPendingAmount = pendingPayouts.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const customerSplitRate = stats?.tenant?.customerSplitRate ?? activeTenant?.customerSplitRate ?? 80;
  const taxRate = stats?.tenant?.taxRate ?? activeTenant?.taxRate ?? 10;
  const adminSplitRate = 100 - customerSplitRate;

  // Split platform orders
  const shopeeOrders = orders.filter((o) => !o.platform || o.platform.toLowerCase().includes("shopee"));
  const tiktokOrders = orders.filter((o) => o.platform && o.platform.toLowerCase().includes("tiktok"));
  const targetOrders = activeTab === "tiktok" ? tiktokOrders : shopeeOrders;

  // Filter Orders
  const filteredOrders = targetOrders.filter((o) => {
    if (!o) return false;

    // Filter by Purchaser
    if (adminOrderSearchUser) {
      const qUser = adminOrderSearchUser.toLowerCase();
      const matchZaloId = o.zaloId && o.zaloId.toLowerCase().includes(qUser);
      const matchZaloName = o.zaloName && o.zaloName.toLowerCase().includes(qUser);
      const matchSubId = (o.subId || o.subId1) && String(o.subId || o.subId1).toLowerCase().includes(qUser);
      if (!matchZaloId && !matchZaloName && !matchSubId) return false;
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

    return true;
  });

  // Calculate order totals
  const totalRawSum = filteredOrders.reduce((sum, o) => sum + Math.round(Number(o.rawCommission || 0)), 0);
  const totalTaxSum = filteredOrders.reduce((sum, o) => {
    const raw = Math.round(Number(o.rawCommission || 0));
    const tax = o.taxAmount !== undefined && o.taxAmount !== null ? Math.round(Number(o.taxAmount)) : Math.round(raw * (taxRate / 100));
    return sum + tax;
  }, 0);
  const totalAfterTaxSum = totalRawSum - totalTaxSum;
  const totalUserFinalSum = filteredOrders.reduce((sum, o) => {
    const raw = Math.round(Number(o.rawCommission || 0));
    const tax = o.taxAmount !== undefined && o.taxAmount !== null ? Math.round(Number(o.taxAmount)) : Math.round(raw * (taxRate / 100));
    const afterTax = raw - tax;
    const userFinal = o.finalCommission !== undefined && o.finalCommission !== null ? Math.round(Number(o.finalCommission)) : Math.round(afterTax * (customerSplitRate / 100));
    return sum + userFinal;
  }, 0);
  const totalAdminProfitSum = totalAfterTaxSum - totalUserFinalSum;

  const handleExportOrdersExcel = (platform = "Shopee") => {
    if (!filteredOrders || filteredOrders.length === 0) {
      alert("Không có dữ liệu đơn hàng phù hợp với bộ lọc để xuất!");
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
      const rawVal = Math.round(Number(o.rawCommission || 0));
      const taxVal = o.taxAmount !== undefined && o.taxAmount !== null ? Math.round(Number(o.taxAmount)) : Math.round(rawVal * (taxRate / 100));
      const afterTaxVal = rawVal - taxVal;
      const userFinalVal = o.finalCommission !== undefined && o.finalCommission !== null ? Math.round(Number(o.finalCommission)) : Math.round(afterTaxVal * (customerSplitRate / 100));
      const adminProfitVal = afterTaxVal - userFinalVal;

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
    <div className="space-y-6 pb-12">
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
        {!APP_CONFIG.isStandalone && (user?.role === "SUPER_ADMIN" || !activeTenant?.slug) && availableTenants.length > 0 && (
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-2xl shadow-2xs">
            <span className="text-xs font-bold text-slate-400">
              {user?.role === "SUPER_ADMIN" ? "Nhóm (Super Admin):" : "Chọn Kênh Trưởng Nhóm:"}
            </span>
            <select
              value={activeTenant?.slug || ""}
              onChange={(e) => {
                const t = availableTenants.find((item) => item.slug === e.target.value);
                if (t) onSelectTenant(t);
              }}
              className="bg-transparent text-orange-600 font-extrabold text-xs outline-none border-0 cursor-pointer font-sans"
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
          <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 px-3.5 py-1.5 rounded-2xl shadow-2xs">
            <i className="fa-solid fa-store text-purple-600 text-xs"></i>
            <span className="text-xs font-black text-purple-900">
              Kênh quản trị: {groupDisplayName}
            </span>
          </div>
        )}
      </div>

      {/* ===================== 2. LỲ-STYLE TAB BAR ===================== */}
      <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
        {[
          { key: "overview", icon: "fa-solid fa-chart-pie", label: "Tổng quan" },
          { key: "zalo_bot", icon: "fa-solid fa-qrcode", label: `Bot Zalo (${tenantBots.length})` },
          { key: "zalo_users", icon: "fa-solid fa-comments", label: `Tài khoản Zalo (${zaloUsers.length})` },
          { key: "payouts", icon: "fa-solid fa-money-bill-transfer", label: "Rút tiền", badge: pendingPayouts.length },
          { key: "shopee", icon: "fa-solid fa-bag-shopping", label: `Đơn Shopee (${shopeeOrders.length})` },
          { key: "tiktok", icon: "fa-brands fa-tiktok", label: `Đơn TikTok (${tiktokOrders.length})` },
          { key: "templates", icon: "fa-solid fa-robot", label: "Cấu hình Bot Zalo" },
          { key: "settings", icon: "fa-solid fa-sliders", label: "Điều kiện Rút & Chia" },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border ${
                isActive
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent shadow-md shadow-orange-500/20 scale-[1.02]"
                  : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200/80 shadow-2xs"
              }`}
            >
              <i className={tab.icon}></i>
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold ml-1 animate-bounce">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
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
              <i className="fa-solid fa-chart-line text-purple-600"></i>
              <span>Hoạt động chung</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Tổng thành viên Zalo", value: zaloUsers.length, icon: "fa-users", color: "purple" },
                { label: "Tổng đơn hàng", value: orders.length, icon: "fa-boxes-stacked", color: "rose" },
                { label: "Yêu cầu rút chờ duyệt", value: pendingPayouts.length + " lệnh", icon: "fa-clock", color: "amber" },
                { label: "Tiền rút chờ duyệt", value: formatMoney(totalPendingAmount), icon: "fa-money-bill-wave", color: "emerald" },
              ].map((card, i) => (
                <div key={i} className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 text-lg shadow-inner">
                    <i className={`fa-solid ${card.icon}`}></i>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">{card.label}</p>
                  <p className="text-xl font-black text-slate-900 font-display">{card.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* TÀI CHÍNH SHOPEE (SAU ĐỐI SOÁT HOÀN THÀNH) */}
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2 font-display">
              <i className="fa-solid fa-coins text-amber-500"></i>
              <span>Tài chính Shopee & TikTok (Sau đối soát hoàn thành)</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: "1. Hoa hồng thô (Sàn trả)", value: formatMoney(stats?.totalRawCommission || totalRawSum), icon: "fa-file-invoice-dollar" },
                { label: `2. Thuế thu nhập (${taxRate}%)`, value: formatMoney(stats?.totalTaxAmount || totalTaxSum), icon: "fa-percent" },
                { label: `3. Hoa hồng sau thuế (${100 - taxRate}%)`, value: formatMoney(stats?.totalAfterTaxCommission || totalAfterTaxSum), icon: "fa-scale-balanced" },
                { label: `4. Thành viên nhận (${customerSplitRate}%)`, value: formatMoney(stats?.totalUserCommission || totalUserFinalSum), icon: "fa-user-tag" },
                { label: `5. Admin giữ lại (${adminSplitRate}%)`, value: formatMoney(stats?.totalAdminProfit || totalAdminProfitSum), icon: "fa-briefcase" },
              ].map((card, i) => (
                <div key={i} className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-2xs space-y-1.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-xs shadow-inner">
                    <i className={`fa-solid ${card.icon}`}></i>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">{card.label}</p>
                  <p className="text-base font-black text-slate-900 font-mono mt-1">{card.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: QUẢN LÝ BOT ZALO ===================== */}
      {activeTab === "zalo_bot" && !isLoading && (
        <div className="space-y-6">
          {/* BOT ZALO STATUS & CONNECT CARD */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-5">
            <div>
              <h3 className="text-base font-black text-slate-900 font-display flex items-center gap-2">
                <i className="fa-solid fa-qrcode text-emerald-600"></i>
                <span>Quản Lý Nick Bot Zalo (Kênh {groupDisplayName})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mỗi Kênh Trưởng Nhóm kết nối 1 Nick Zalo Phụ làm Bot. Muốn đổi nick Zalo khác, Trưởng Nhóm chỉ cần bấm <strong>"Ngắt kết nối / Quét Acc Khác"</strong> bên dưới.
              </p>
            </div>

            {tenantBots.length === 0 ? (
              /* CHƯA KẾT NỐI: HIỂN THỊ NÚT QUÉT QR */
              <div className="bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-white rounded-3xl border border-emerald-200 p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-emerald-600 text-white flex items-center justify-center text-3xl mx-auto shadow-md shadow-emerald-600/20">
                  <i className="fa-solid fa-qrcode"></i>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-900">Kênh Chưa Được Kết Nối Nick Bot Zalo</h4>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    Mở ứng dụng <strong>Zalo trên điện thoại</strong> của Nick Phụ ➔ Bấm nút bên dưới để hiện mã QR và quét đănh nhập kích hoạt Bot 24/7.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowQrModal(true);
                    handleGenerateQr();
                  }}
                  className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-600/25 cursor-pointer inline-flex items-center gap-2 transition scale-105 hover:scale-108"
                >
                  <i className="fa-solid fa-plus text-sm"></i>
                  <span>+ Kết Nối Nick Bot Zalo Mới & Quét QR</span>
                </button>
              </div>
            ) : (
              /* ĐÃ KẾT NỐI: HIỂN THỊ THÔNG TIN BOT & NÚT NGẮT KẾT NỐI / ĐỔI ACC */
              tenantBots.map((bot) => (
                <div key={bot.id} className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-700 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 font-black text-2xl flex items-center justify-center shrink-0">
                        {bot.zaloName ? bot.zaloName.charAt(0).toUpperCase() : "B"}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-black text-white">{bot.zaloName || bot.botName}</h4>
                          <span className={`text-[10px] font-extrabold px-3 py-0.5 rounded-full border ${
                            bot.status === "ACTIVE"
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                              : "bg-amber-500/20 text-amber-300 border-amber-400/30 animate-pulse"
                          }`}>
                            {bot.status === "ACTIVE" ? "🟢 ĐANG HOẠT ĐỘNG 24/7" : "⏳ CHỜ QUÉT QR"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-mono">
                          Zalo ID (UID): <span className="font-bold text-amber-300">{bot.zaloId || "Đang cập nhật..."}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDisconnectBot(bot.id)}
                      className="px-5 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-400/40 rounded-2xl font-black text-xs cursor-pointer transition flex items-center gap-2 self-start sm:self-auto shrink-0"
                    >
                      <i className="fa-solid fa-power-off text-xs"></i>
                      <span>Ngắt kết nối / Quét Acc Khác</span>
                    </button>
                  </div>

                  <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span>Tên phân loại Bot: <strong className="text-slate-200">{bot.botName || "Bot Zalo"}</strong></span>
                    <span>Ngày kết nối: <strong className="text-slate-200">{bot.createdAt ? formatDate(bot.createdAt) : "Vừa xong"}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 3: TÀI KHOẢN ZALO ===================== */}
      {activeTab === "zalo_users" && !isLoading && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 font-display">Tài khoản Thành Viên Zalo Bot</h3>
            <span className="text-xs font-bold text-slate-400">Tổng: {zaloUsers.length} thành viên</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 text-[11px] font-black uppercase tracking-wider border-b border-slate-100">
                  <th className="p-3.5">Tên Zalo / ID</th>
                  <th className="p-3.5">STK Ngân Hàng</th>
                  <th className="p-3.5 text-right">Tổng đơn</th>
                  <th className="p-3.5 text-right">Số dư khả dụng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {zaloUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">Chưa có thành viên Zalo nào phát sinh đơn tại Kênh này.</td>
                  </tr>
                ) : (
                  zaloUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5">
                        <p className="font-bold text-slate-900">{u.zaloName || "Khách Zalo"}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Zalo ID: {u.zaloId}</p>
                      </td>
                      <td className="p-3.5 font-mono">
                        {u.accountNumber ? `${u.bankName || "NH"} - ${u.accountNumber} (${u.accountName || ""})` : "— Chưa lưu STK"}
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-800">{u.totalOrdersCount || 0} đơn</td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-600">{formatMoney(u.availableBalance || 0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 text-[11px] font-black uppercase tracking-wider border-b border-slate-100">
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
                    <td colSpan={5} className="p-8 text-center text-slate-400">Chưa có yêu cầu rút tiền nào.</td>
                  </tr>
                ) : (
                  payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
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
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          p.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : p.status === "REJECTED"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                        }`}>
                          {p.status === "COMPLETED" ? "Đã duyệt" : p.status === "REJECTED" ? "Từ chối" : "Chờ duyệt"}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
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
          {/* TIKTOK SYNC CONTROL BANNER */}
          {activeTab === "tiktok" && (
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-700">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-2xl text-white shrink-0 shadow-inner">
                  <i className="fa-brands fa-tiktok"></i>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm tracking-wide text-white">
                      Quản lý Đơn Hàng TikTok Shop — Kênh {groupDisplayName}
                    </h3>
                    <span className="bg-orange-500/20 text-orange-300 text-[9px] font-black px-2.5 py-0.5 rounded-full border border-orange-400/30">
                      TỰ ĐỘNG SYNC RIOHUB 60S
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    Đơn hàng TikTok được tự động kéo về từ RioHub API và tự động khớp SubID thành viên Kênh {groupDisplayName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                <button
                  type="button"
                  onClick={handleSyncTiktokManual}
                  disabled={isSyncingTiktok}
                  className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-2xl text-xs font-black transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSyncingTiktok ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin text-orange-600"></i> Đang đồng bộ...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-arrows-rotate text-orange-600"></i> Đồng bộ đơn TikTok ngay
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border-2 border-dashed border-orange-200 bg-orange-50/40 hover:bg-orange-50/70 rounded-2xl p-4 transition cursor-pointer flex flex-col items-center justify-center relative overflow-hidden min-h-[110px]">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    setImportFile(e.target.files[0]);
                    setImportResult(null);
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />

                {importFile ? (
                  <div className="flex flex-col items-center text-center space-y-1">
                    <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-base shadow-xs">
                      <i className="fa-solid fa-file-excel"></i>
                    </div>
                    <span className="text-xs font-black text-slate-800 truncate max-w-[220px]">{importFile.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{(importFile.size / 1024).toFixed(1)} KB — Bấm để đổi file</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center space-y-1">
                    <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-base shadow-xs">
                      <i className="fa-solid fa-cloud-arrow-up"></i>
                    </div>
                    <span className="text-xs font-black text-slate-800">Chọn hoặc kéo thả file báo cáo</span>
                    <span className="text-[10px] text-slate-400 font-medium">Hỗ trợ .csv, .xlsx, .xls từ Shopee & TikTok</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-center space-y-3">
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Hệ thống sẽ tự động quét cột <strong>Mã đơn hàng</strong> và <strong>Sub ID / Mã phụ</strong> chứa thông tin định danh thành viên để liên kết chính xác hoa hồng cho Kênh {groupDisplayName}.
                </p>

                <button
                  onClick={handleUploadExcel}
                  disabled={isImporting || !importFile}
                  className={`w-full py-3 px-4 rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                    isImporting || !importFile
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                      : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/20"
                  }`}
                >
                  {isImporting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Đang nạp dữ liệu đơn hàng...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-upload"></i> Bắt đầu Import File
                    </>
                  )}
                </button>
              </div>
            </div>

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
            <p className="text-xs text-slate-500 font-medium">
              Hiển thị{" "}
              <span className="font-bold text-slate-800">
                {filteredOrders.length > 0 ? (adminOrderPage - 1) * 50 + 1 : 0} - {Math.min(adminOrderPage * 50, filteredOrders.length)}
              </span>{" "}
              / Kết quả {activeTab === "tiktok" ? "TikTok" : "Shopee"}: <strong className="text-orange-600">{filteredOrders.length} đơn</strong>
            </p>

            <button
              onClick={() => handleExportOrdersExcel(activeTab === "tiktok" ? "TikTok" : "Shopee")}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl text-xs font-black transition flex items-center gap-2 shadow-md shadow-orange-500/20 cursor-pointer"
            >
              <i className="fa-solid fa-file-excel text-sm"></i> Xuất Excel {activeTab === "tiktok" ? "TikTok" : "Shopee"} ({filteredOrders.length})
            </button>
          </div>

          {/* TABLE OF ORDERS */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 text-[11px] font-black uppercase tracking-wider border-b border-slate-100">
                    <th className="p-3.5">Ngày đơn</th>
                    <th className="p-3.5">Sản phẩm / Mã đơn</th>
                    <th className="p-3.5">Người mua</th>
                    <th className="p-3.5">Trạng thái</th>
                    <th className="p-3.5 text-right">Thô (Shopee)</th>
                    <th className="p-3.5 text-right">Thuế ({taxRate}%)</th>
                    <th className="p-3.5 text-right">Sau thuế</th>
                    <th className="p-3.5 text-right text-orange-600">Khách ({customerSplitRate}%)</th>
                    <th className="p-3.5 text-right text-purple-600">Admin ({adminSplitRate}%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400 font-bold">
                        <i className="fa-solid fa-folder-open text-2xl text-slate-300 mb-2 block"></i>
                        Không tìm thấy đơn hàng nào khớp với bộ lọc
                      </td>
                    </tr>
                  ) : (
                    filteredOrders
                      .slice((adminOrderPage - 1) * 50, adminOrderPage * 50)
                      .map((o) => {
                        const rawVal = Math.round(Number(o.rawCommission || 0));
                        const taxVal = o.taxAmount !== undefined && o.taxAmount !== null ? Math.round(Number(o.taxAmount)) : Math.round(rawVal * (taxRate / 100));
                        const afterTaxVal = rawVal - taxVal;
                        const userFinalVal = o.finalCommission !== undefined && o.finalCommission !== null ? Math.round(Number(o.finalCommission)) : Math.round(afterTaxVal * (customerSplitRate / 100));
                        const adminProfitVal = afterTaxVal - userFinalVal;

                        return (
                          <tr key={o.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-3.5 text-slate-400 whitespace-nowrap">
                              {o.orderDate ? new Date(o.orderDate).toLocaleDateString("vi-VN") : "—"}
                            </td>
                            <td className="p-3.5 max-w-[220px]">
                              <p className="font-bold text-slate-900 truncate" title={o.productName}>
                                {o.productName}
                              </p>
                              <span className="text-[10px] text-slate-400 font-mono">ID: {o.orderId}</span>
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="font-bold text-slate-800">
                                  {o.zaloName || o.zaloId || o.subId || "Khách ẩn"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedOrderToAssign(o);
                                    setAssignZaloId(o.zaloId || "");
                                  }}
                                  className="text-[10px] font-bold text-purple-600 hover:bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 cursor-pointer"
                                  title="Gán đơn này cho thành viên Zalo"
                                >
                                  Sửa gán
                                </button>
                              </div>
                            </td>
                            <td className="p-3.5">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {o.status || "Hoàn thành"}
                              </span>
                            </td>
                            <td className="p-3.5 text-right font-mono font-bold text-slate-700">{formatMoney(rawVal)}</td>
                            <td className="p-3.5 text-right font-mono text-rose-500">{formatMoney(taxVal)}</td>
                            <td className="p-3.5 text-right font-mono text-slate-800">{formatMoney(afterTaxVal)}</td>
                            <td className="p-3.5 text-right font-mono font-black text-orange-600">{formatMoney(userFinalVal)}</td>
                            <td className="p-3.5 text-right font-mono font-black text-purple-600">{formatMoney(adminProfitVal)}</td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
                {filteredOrders.length > 0 && (
                  <tfoot className="bg-slate-50/90 font-bold border-t-2 border-slate-200">
                    <tr>
                      <td colSpan={4} className="p-3.5 font-black text-slate-800 text-xs">
                        📊 TỔNG CỘNG ({filteredOrders.length} đơn {activeTab === "tiktok" ? "TikTok" : "Shopee"} đang lọc)
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-slate-800">
                        {formatMoney(totalRawSum)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-rose-600">
                        {formatMoney(totalTaxSum)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-slate-800">
                        {formatMoney(totalAfterTaxSum)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-orange-600">
                        {formatMoney(totalUserFinalSum)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-purple-600">
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
          </div>
        </div>
      )}

      {/* ===================== TAB 7: CẤU HÌNH BOT ZALO ===================== */}
      {activeTab === "templates" && !isLoading && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 font-display flex items-center gap-2">
                <i className="fa-solid fa-robot text-purple-600"></i>
                <span>Cấu Hình Câu Trả Lời Của Zalo Bot</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tự do cá nhân hóa câu từ, lời chào, tag @thành viên và các phản hồi lỗi cho Kênh {groupDisplayName}
              </p>
            </div>
            <button
              onClick={handleSaveTemplates}
              disabled={isSavingTemplates}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xs shadow-md shadow-purple-500/20 cursor-pointer"
            >
              {isSavingTemplates ? "Đang lưu..." : "Lưu Cấu Hình"}
            </button>
          </div>

          {templateSaveMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
              {templateSaveMessage}
            </div>
          )}

          {/* Placeholders Help Card */}
          <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-2">
            <h4 className="text-xs font-black text-purple-900 flex items-center gap-1.5">
              <i className="fa-solid fa-code text-purple-600"></i> BẢNG TỪ KHÓA ĐỘNG (PLACEHOLDER):
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2 bg-white rounded-xl border border-purple-100"><code className="font-bold text-purple-700">@{`{user}`}</code>: Tag tên Zalo</div>
              <div className="p-2 bg-white rounded-xl border border-purple-100"><code className="font-bold text-purple-700">{`{link}`}</code>: Link tra cứu</div>
              <div className="p-2 bg-white rounded-xl border border-purple-100"><code className="font-bold text-purple-700">{`{split_rate}`}</code>: Tỷ lệ hoàn ({customerSplitRate}%)</div>
              <div className="p-2 bg-white rounded-xl border border-purple-100"><code className="font-bold text-purple-700">{`{group_name}`}</code>: Tên nhóm</div>
              <div className="p-2 bg-white rounded-xl border border-purple-100"><code className="font-bold text-purple-700">{`{affiliate_link}`}</code>: Link mua sắm</div>
              <div className="p-2 bg-white rounded-xl border border-purple-100"><code className="font-bold text-purple-700">{`{order_id}`}</code>: Mã đơn</div>
              <div className="p-2 bg-white rounded-xl border border-purple-100"><code className="font-bold text-purple-700">{`{balance}`}</code>: Số dư ví</div>
              <div className="p-2 bg-white rounded-xl border border-purple-100"><code className="font-bold text-purple-700">{`{command}`}</code>: Lệnh gõ sai</div>
            </div>
          </div>

          <div className="space-y-4">
            {Object.keys(botTemplates).map((key) => (
              <div key={key} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 font-mono">{key}</label>
                  <button
                    onClick={() => handleResetTemplate(key)}
                    className="text-[10px] font-bold text-slate-400 hover:text-orange-600"
                  >
                    Khôi phục mặc định
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={botTemplates[key] || ""}
                  onChange={(e) => setBotTemplates({ ...botTemplates, [key]: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 outline-none focus:border-purple-500 transition"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================== TAB 8: ĐIỀU KIỆN RÚT & CHIA ===================== */}
      {activeTab === "settings" && !isLoading && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 font-display flex items-center gap-2">
                <i className="fa-solid fa-sliders text-orange-500"></i>
                <span>Cấu Hình Tỷ Lệ Chia & Hạn Mức Rút Tiền</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết lập tỷ lệ hoa hồng chia cho khách, tỷ lệ thuế và quy định rút tiền của Kênh {groupDisplayName}
              </p>
            </div>
            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl font-black text-xs shadow-md shadow-orange-500/20 cursor-pointer"
            >
              {isSavingSettings ? "Đang lưu..." : "Lưu Cấu Hình"}
            </button>
          </div>

          {settingsSaveMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
              {settingsSaveMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">Tên Nhóm / Thương Hiệu Kênh:</label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">Hạn mức rút tối thiểu (VNĐ):</label>
              <input
                type="number"
                value={settings.minWithdrawAmount}
                onChange={(e) => setSettings({ ...settings, minWithdrawAmount: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">Tỷ lệ chia cho khách mua (%):</label>
              <input
                type="number"
                value={settings.customerSplitRate}
                onChange={(e) => setSettings({ ...settings, customerSplitRate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Trưởng nhóm giữ lại: {100 - (Number(settings.customerSplitRate) || 80)}% hoa hồng sau thuế</span>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">Tỷ lệ trừ thuế TNCN (%):</label>
              <input
                type="number"
                value={settings.taxRate}
                onChange={(e) => setSettings({ ...settings, taxRate: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none"
              />
            </div>

            <div className="md:col-span-2 pt-3 border-t border-slate-100">
              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider mb-3 flex items-center gap-2">
                <i className="fa-brands fa-tiktok text-black"></i>
                <span>Cấu hình Kết nối API TikTok Shop (RioHub)</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">TikTok RioHub API Key:</label>
                  <input
                    type="text"
                    value={settings.tiktokApiKey}
                    onChange={(e) => setSettings({ ...settings, tiktokApiKey: e.target.value })}
                    placeholder="Để trống nếu Kênh không dùng TikTok..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-mono font-bold text-slate-800 outline-none focus:border-orange-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Khóa API kết nối RioHub để kéo đơn TikTok Shop tự động cho Kênh này.</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">TikTok Creator Username:</label>
                  <input
                    type="text"
                    value={settings.tiktokCreatorUsername}
                    onChange={(e) => setSettings({ ...settings, tiktokCreatorUsername: e.target.value })}
                    placeholder="VD: tran_huyen_affiliate..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-mono font-bold text-slate-800 outline-none focus:border-orange-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Tên tài khoản Creator TikTok Affiliate tương ứng.</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ===================== TAB 9: KẾT NỐI BOT ZALO & QUÉT QR ===================== */}
      {activeTab === "zalo_bot" && !isLoading && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900 font-display flex items-center gap-2">
                <i className="fa-solid fa-qrcode text-emerald-600"></i>
                <span>Quản Lý Bot Zalo & Mã QR Kết Nối Tự Động</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Đăng nhập nick Zalo phụ làm Bot cho Kênh {groupDisplayName}. Bot sẽ tự động bắt link Shopee/TikTok trong các nhóm Zalo!
              </p>
            </div>
            <button
              onClick={() => {
                setShowQrModal(true);
                handleGenerateQr();
              }}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl font-black text-xs shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-2"
            >
              <i className="fa-solid fa-plus-circle"></i>
              <span>+ Kết Nối Nick Bot Zalo Mới & Quét QR</span>
            </button>
          </div>

          {/* List of Connected Bots */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tenantBots.length === 0 ? (
              <div className="col-span-full bg-white rounded-3xl border border-slate-200/80 p-8 text-center space-y-3 shadow-2xs">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto">
                  <i className="fa-solid fa-robot"></i>
                </div>
                <h4 className="text-sm font-black text-slate-800">Chưa có Nick Bot Zalo nào kết nối</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Bấm nút <strong>"+ Kết Nối Nick Bot Zalo Mới & Quét QR"</strong> ở trên để quét mã QR bằng nick Zalo phụ và kích hoạt Bot hoạt động tự động!
                </p>
              </div>
            ) : (
              tenantBots.map((bot) => (
                <div key={bot.id} className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 font-black text-lg flex items-center justify-center border border-emerald-200">
                        {bot.zaloName ? bot.zaloName.charAt(0).toUpperCase() : "B"}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{bot.zaloName || bot.botName}</h4>
                        <span className="text-[11px] font-bold text-slate-500">Zalo ID: {bot.zaloId || "Chưa cập nhật"}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full ${
                      bot.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}>
                      {bot.status === "ACTIVE" ? "🟢 ĐÃ KẾT NỐI - 24/7" : "🟡 CHỜ QUÉT QR"}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1 text-slate-600">
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-400">Tên phân loại Bot:</span>
                      <span className="font-bold text-slate-800">{bot.botName || "Bot Zalo"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-400">Thời gian tạo:</span>
                      <span className="font-bold text-slate-800">{bot.createdAt ? formatDate(bot.createdAt) : "Gần đây"}</span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleDisconnectBot(bot.id)}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <i className="fa-solid fa-power-off text-xs"></i>
                      <span>Ngắt kết nối / Đổi Nick</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
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

            {/* Alternative Direct Nick Input */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
                ⚡ Hoặc Nhập Nhanh Thông Tin Nick Bot Đã Đăng Nhập:
              </p>
              <form onSubmit={handleConnectBotManually} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newBotZaloName}
                    onChange={(e) => setNewBotZaloName(e.target.value)}
                    placeholder="Tên Zalo Nick Phụ (VD: Bot Săn Sale 1)"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    required
                  />
                  <input
                    type="text"
                    value={newBotZaloId}
                    onChange={(e) => setNewBotZaloId(e.target.value)}
                    placeholder="Zalo ID Số (VD: 89234...)"
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isConnectingBot}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  {isConnectingBot ? "Đang kết nối..." : "✅ Kích Hoạt Nối Bot Ngay"}
                </button>
              </form>
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

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
