import React, { useState, useEffect } from "react";
import { formatMoney, formatDate } from "../utils/formatters";

export function SuperAdminView({ apiRoot, user, token, onOpenLogin, onLogout }) {
  const [adminSubTab, setAdminSubTab] = useState("tenants"); // 'tenants' | 'users'
  const [tenantViewMode, setTenantViewMode] = useState("matrix"); // 'matrix' | 'table'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [togglingMonth, setTogglingMonth] = useState({}); // { [`${tenantId}-${monthKey}`]: boolean }
  const [tenants, setTenants] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("ALL"); // 'ALL' | 'PAID' | 'UNPAID'
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);

  // Users & Role Management state
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL"); // 'ALL' | 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'BUYER'
  const [editingUserRole, setEditingUserRole] = useState(null);
  const [userRoleForm, setUserRoleForm] = useState({ role: "BUYER", tenantId: "" });
  const [isSavingUserRole, setIsSavingUserRole] = useState(false);

  // Backup state
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [lastBackupInfo, setLastBackupInfo] = useState(null);

  const [formData, setFormData] = useState({
    slug: "",
    name: "",
    monthlyFee: "500000",
    billingCycleDay: "15",
    subscriptionStatus: "PAID",
    isTiktokEnabled: false,
    billingNote: "",
  });

  const authToken = token || localStorage.getItem("saasToken") || "";
  const authHeaders = {
    Authorization: authToken ? `Bearer ${authToken}` : "",
    "Content-Type": "application/json",
  };

  const fetchTenantsAndStats = async () => {
    setIsLoading(true);
    try {
      const [resTenants, resStats] = await Promise.all([
        fetch(`${apiRoot}/api/saas/super-admin/tenants`, { headers: authHeaders }),
        fetch(`${apiRoot}/api/saas/super-admin/stats`, { headers: authHeaders }),
      ]);

      if (resTenants.ok) {
        const dataTenants = await resTenants.json();
        setTenants(dataTenants);
      }
      if (resStats.ok) {
        const dataStats = await resStats.json();
        setStats(dataStats);
      }
    } catch (e) {
      console.error("Super admin fetch error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch(`${apiRoot}/api/saas/super-admin/users`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error("Fetch users error:", e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchTenantsAndStats();
    fetchUsers();
  }, [apiRoot, token]);

  const [toast, setToast] = useState(null);
  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleTriggerBackup = async () => {
    if (isBackingUp) return;
    if (!window.confirm("Bạn có chắc muốn sao lưu toàn bộ Database SaaS và gửi file nén ngay sang kho lưu trữ Telegram không?")) {
      return;
    }
    setIsBackingUp(true);
    try {
      const res = await fetch(`${apiRoot}/api/saas/super-admin/backup/trigger`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLastBackupInfo(data);
        notify(data.message || "Đã sao lưu Database và gửi sang Telegram thành công! 🎉", "success");
      } else {
        notify(data.message || "Sao lưu thất bại!", "error");
      }
    } catch (err) {
      notify("Lỗi kết nối máy chủ khi sao lưu: " + err.message, "error");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingTenant(null);
    setFormData({
      slug: "",
      name: "",
      monthlyFee: "500000",
      billingCycleDay: "15",
      subscriptionStatus: "PAID",
      isTiktokEnabled: false,
      billingNote: "",
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (t) => {
    setEditingTenant(t);
    setFormData({
      slug: t.slug || "",
      name: t.name || "",
      monthlyFee: t.monthlyFee !== undefined ? String(t.monthlyFee) : "500000",
      billingCycleDay: t.billingCycleDay !== undefined ? String(t.billingCycleDay) : "15",
      subscriptionStatus: t.subscriptionStatus || "PAID",
      isTiktokEnabled: Boolean(t.isTiktokEnabled),
      billingNote: t.billingNote || "",
    });
    setShowAddModal(true);
  };

  const handleSaveTenant = async (e) => {
    e.preventDefault();
    if (!formData.slug || !formData.name) {
      notify("Vui lòng nhập Đường dẫn (Slug) và Tên Trưởng Nhóm!", "error");
      return;
    }

    try {
      const url = editingTenant
        ? `${apiRoot}/api/saas/super-admin/tenants/${editingTenant.id}`
        : `${apiRoot}/api/saas/super-admin/tenants`;

      const method = editingTenant ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        notify(data.message || (editingTenant ? "Đã cập nhật Trưởng Nhóm!" : "Đã tạo mới Trưởng Nhóm!"));
        setShowAddModal(false);
        fetchTenantsAndStats();
      } else {
        notify(data.message || "Lưu thất bại", "error");
      }
    } catch (err) {
      notify("Lỗi kết nối máy chủ: " + err.message, "error");
    }
  };

  const getPaidMonths = (tenant) => {
    if (!tenant) return new Set();
    const note = tenant.billingNote;
    if (!note || typeof note !== "string" || !note.trim()) {
      if ((tenant.subscriptionStatus || "PAID").toUpperCase() === "PAID") {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        return new Set([currentMonth]);
      }
      return new Set();
    }
    try {
      if (note.trim().startsWith("{") && note.includes("paidMonths")) {
        const parsed = JSON.parse(note);
        if (Array.isArray(parsed.paidMonths)) {
          return new Set(parsed.paidMonths);
        }
      }
      return new Set(note.split(",").map((s) => s.trim()).filter(Boolean));
    } catch {
      return new Set();
    }
  };

  const handleToggleMonth = async (tenant, monthKey) => {
    const toggleKey = `${tenant.id}-${monthKey}`;
    if (togglingMonth[toggleKey]) return;

    setTogglingMonth((prev) => ({ ...prev, [toggleKey]: true }));

    const currentPaid = getPaidMonths(tenant);
    const willBePaid = !currentPaid.has(monthKey);
    const nextPaid = new Set(currentPaid);
    if (willBePaid) nextPaid.add(monthKey);
    else nextPaid.delete(monthKey);

    const newNote = JSON.stringify({ paidMonths: Array.from(nextPaid) });
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const newSubStatus = nextPaid.has(currentMonthKey) ? "PAID" : "UNPAID";

    // Cập nhật giao diện tức thì (Optimistic UI)
    setTenants((prev) =>
      prev.map((t) =>
        t.id === tenant.id
          ? { ...t, billingNote: newNote, subscriptionStatus: newSubStatus }
          : t
      )
    );

    try {
      const res = await fetch(`${apiRoot}/api/saas/super-admin/tenants/${tenant.id}/toggle-month`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ month: monthKey, paid: willBePaid }),
      });
      const data = await res.json();
      if (res.ok && data.tenant) {
        setTenants((prev) =>
          prev.map((t) => (t.id === tenant.id ? { ...t, ...data.tenant } : t))
        );
        notify(data.message || (willBePaid ? `Đã xác nhận Tháng ${monthKey}` : `Đã hủy Tháng ${monthKey}`));
      } else {
        notify(data.message || "Lỗi cập nhật tháng", "error");
        fetchTenantsAndStats();
      }
    } catch (err) {
      notify("Lỗi kết nối máy chủ: " + err.message, "error");
      fetchTenantsAndStats();
    } finally {
      setTogglingMonth((prev) => {
        const next = { ...prev };
        delete next[toggleKey];
        return next;
      });
    }
  };

  const handleTogglePayment = async (t) => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    await handleToggleMonth(t, currentMonthKey);
  };

  const handleDeleteTenant = async (id, name) => {
    if (!window.confirm(`Bạn có CHẮC CHẮN muốn xóa Trưởng Nhóm "${name}"? Toàn bộ dữ liệu đơn hàng của nhóm này sẽ bị xóa!`)) {
      return;
    }

    try {
      const res = await fetch(`${apiRoot}/api/saas/super-admin/tenants/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.ok) {
        notify(data.message || "Đã xóa Trưởng Nhóm thành công!");
        fetchTenantsAndStats();
      } else {
        notify(data.message || "Lỗi khi xóa", "error");
      }
    } catch (err) {
      notify("Lỗi máy chủ: " + err.message, "error");
    }
  };

  const handleOpenEditUserRole = (u) => {
    setEditingUserRole(u);
    setUserRoleForm({
      role: u.role || "BUYER",
      tenantId: u.tenantId ? String(u.tenantId) : "",
    });
  };

  const handleSaveUserRole = async (e) => {
    e.preventDefault();
    if (!editingUserRole) return;
    setIsSavingUserRole(true);
    try {
      const res = await fetch(`${apiRoot}/api/saas/super-admin/users/${editingUserRole.id}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          role: userRoleForm.role,
          tenantId: userRoleForm.role === "TENANT_ADMIN" ? userRoleForm.tenantId : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        notify(data.message || "Phân quyền thành công!");
        setEditingUserRole(null);
        fetchUsers();
      } else {
        notify(data.message || "Lỗi khi lưu phân quyền", "error");
      }
    } catch (err) {
      notify("Lỗi máy chủ: " + err.message, "error");
    } finally {
      setIsSavingUserRole(false);
    }
  };

  // Filter Tenants
  const filteredTenants = tenants.filter((t) => {
    const matchQuery =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase());

    const isPaid = (t.subscriptionStatus || "PAID").toUpperCase() === "PAID";
    const matchPayment =
      paymentFilter === "ALL" ||
      (paymentFilter === "PAID" && isPaid) ||
      (paymentFilter === "UNPAID" && !isPaid);

    return matchQuery && matchPayment;
  });

  const paidTenantsCount = tenants.filter(
    (t) => (t.subscriptionStatus || "PAID").toUpperCase() === "PAID"
  ).length;
  const unpaidTenantsCount = tenants.length - paidTenantsCount;

  // Tính toán dữ liệu Ma trận 12 tháng thu tiền
  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;
  const currentMonthKey = `${currentYear}-${String(currentMonthNum).padStart(2, "0")}`;

  const monthSummaries = months.map((m) => {
    const monthKey = `${selectedYear}-${String(m).padStart(2, "0")}`;
    let paidCount = 0;
    let totalRevenue = 0;
    filteredTenants.forEach((t) => {
      const paid = getPaidMonths(t);
      if (paid.has(monthKey)) {
        paidCount++;
        totalRevenue += Number(t.monthlyFee || 500000);
      }
    });
    return {
      month: m,
      monthKey,
      paidCount,
      totalRevenue,
      isCurrentMonth: selectedYear === currentYear && m === currentMonthNum,
      isPastMonth: selectedYear < currentYear || (selectedYear === currentYear && m < currentMonthNum),
      isFutureMonth: selectedYear > currentYear || (selectedYear === currentYear && m > currentMonthNum),
    };
  });

  const totalYearRevenue = monthSummaries.reduce((sum, item) => sum + item.totalRevenue, 0);
  const totalYearPaidSlots = monthSummaries.reduce((sum, item) => sum + item.paidCount, 0);

  // Filter Users
  const filteredUsers = users.filter((u) => {
    const q = userSearchQuery.toLowerCase();
    const matchQuery =
      !q ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q));

    const matchRole =
      userRoleFilter === "ALL" ||
      (u.role || "BUYER").toUpperCase() === userRoleFilter;

    return matchQuery && matchRole;
  });

  return (
    <div className="space-y-6 pb-12 relative">
      {/* Toast Notification Banner */}
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
      {/* ===================== HERO CARD ===================== */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/10 border border-amber-200 text-amber-600 flex items-center justify-center text-xl sm:text-2xl font-black shrink-0 shadow-2xs">
            <i className="fa-solid fa-crown"></i>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 font-display truncate">
                Quản Trị Toàn Sàn
              </h1>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-300 shrink-0">
                Super Admin
              </span>
              <span className="bg-sky-50 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-200 flex items-center gap-1 shrink-0" title="Tự động sao lưu database hàng ngày lúc 02:00 sáng vào Telegram">
                <i className="fa-solid fa-cloud-arrow-up text-sky-500 text-[9px]"></i>
                Auto Backup 02:00 AM
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              Quản lý các Trưởng Nhóm đối tác, phân quyền và sao lưu cơ sở dữ liệu.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap sm:flex-nowrap">
          <button
            onClick={handleTriggerBackup}
            disabled={isBackingUp}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-2 justify-center shrink-0 active:scale-95 border ${
              isBackingUp
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                : "bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200 hover:border-sky-300 shadow-xs"
            }`}
            title="Kích hoạt sao lưu toàn bộ Database SaaS và gửi ngay vào Telegram"
          >
            <i className={isBackingUp ? "fa-solid fa-spinner fa-spin text-sky-500 text-xs" : "fa-solid fa-paper-plane text-sky-600 text-xs"}></i>
            <span>{isBackingUp ? "Đang sao lưu & gửi Telegram..." : "Sao Lưu Telegram"}</span>
          </button>

          {adminSubTab === "tenants" && (
            <button
              onClick={handleOpenAdd}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs rounded-xl shadow-md shadow-orange-500/20 transition cursor-pointer flex items-center gap-2 justify-center shrink-0 active:scale-95"
            >
              <i className="fa-solid fa-plus-circle text-xs"></i>
              <span>Thêm Trưởng Nhóm Mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Backup Result Banner (nếu vừa sao lưu xong) */}
      {lastBackupInfo && (
        <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3 text-xs text-emerald-900 animate-fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
              <i className="fa-solid fa-check"></i>
            </div>
            <div className="min-w-0">
              <div className="font-black text-emerald-900 flex items-center gap-2 flex-wrap">
                <span>Sao lưu thành công: <code>{lastBackupInfo.fileName}</code></span>
                <span className="bg-emerald-200/70 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {lastBackupInfo.fileSize}
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 mt-0.5 truncate">
                Đã gửi file nén qua Telegram lúc {lastBackupInfo.timestamp} ({lastBackupInfo.durationMs}ms) • Kênh: {lastBackupInfo.totalTenants} • Đơn: {lastBackupInfo.totalOrders} • Khách Zalo: {lastBackupInfo.totalZaloUsers}
              </p>
            </div>
          </div>
          <button onClick={() => setLastBackupInfo(null)} className="text-emerald-500 hover:text-emerald-700 p-1 cursor-pointer">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* ===================== SUB TABS NAVIGATION (1 HÀNG DUY NHẤT) ===================== */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200/80 shadow-2xs">
        <button
          type="button"
          onClick={() => {
            setAdminSubTab("tenants");
            setTenantViewMode("matrix");
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 sm:px-4 rounded-xl text-xs font-black transition-all cursor-pointer ${
            adminSubTab === "tenants" && tenantViewMode === "matrix"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <i className="fa-solid fa-table-cells text-xs text-orange-500"></i>
          <span className="truncate">Thu Phí ({tenants.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setAdminSubTab("tenants");
            setTenantViewMode("table");
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 sm:px-4 rounded-xl text-xs font-black transition-all cursor-pointer ${
            adminSubTab === "tenants" && tenantViewMode === "table"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <i className="fa-solid fa-store text-xs text-blue-500"></i>
          <span className="truncate">Cấu Hình ({tenants.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setAdminSubTab("users");
            fetchUsers();
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 sm:px-4 rounded-xl text-xs font-black transition-all cursor-pointer ${
            adminSubTab === "users"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <i className="fa-solid fa-users-gear text-xs text-purple-500"></i>
          <span className="truncate">Tài Khoản ({users.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: QUẢN LÝ KÊNH ĐỐI TÁC (TENANTS)                                     */}
      {/* ========================================================================= */}
      {adminSubTab === "tenants" && (
        <>
          {/* METRIC STATS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="metric-card">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Tổng Tiền Thuê / Tháng
                </span>
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-xs font-bold">
                  <i className="fa-solid fa-receipt"></i>
                </div>
              </div>
              <div className="text-xl md:text-2xl font-black text-slate-900 mt-2 font-display truncate">
                {formatMoney(stats?.totalMonthlyRentalFee || 0)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Từ {tenants.length} Trưởng Nhóm</p>
            </div>

            <div className="metric-card bg-gradient-to-br from-emerald-50/60 to-white border-emerald-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider">
                  Đã Thu Tháng Này (🟢)
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                  <i className="fa-solid fa-circle-check"></i>
                </div>
              </div>
              <div className="text-xl md:text-2xl font-black text-emerald-800 mt-2 font-display truncate">
                {paidTenantsCount} <span className="text-xs font-bold text-slate-400">/ {tenants.length}</span>
              </div>
              <p className="text-[11px] text-emerald-600 mt-1 font-semibold">
                Đạt {tenants.length > 0 ? Math.round((paidTenantsCount / tenants.length) * 100) : 0}% tỷ lệ thu phí
              </p>
            </div>

            <div className="metric-card bg-gradient-to-br from-rose-50/60 to-white border-rose-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-rose-700 uppercase tracking-wider">
                  Chưa Đóng Phí (🔴)
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold">
                  <i className="fa-solid fa-clock-rotate-left"></i>
                </div>
              </div>
              <div className="text-xl md:text-2xl font-black text-rose-800 mt-2 font-display truncate">
                {unpaidTenantsCount} <span className="text-xs font-bold text-slate-400">nhóm</span>
              </div>
              <p className="text-[11px] text-rose-600 mt-1 font-semibold">Cần nhắc thanh toán chu kỳ</p>
            </div>

            <div className="metric-card">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Tổng Đơn Hàng Toàn Sàn
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xs font-bold">
                  <i className="fa-solid fa-bag-shopping"></i>
                </div>
              </div>
              <div className="text-xl md:text-2xl font-black text-slate-900 mt-2 font-display truncate">
                {stats?.totalOrders || 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Lợi nhuận sàn: {formatMoney(stats?.totalAdminProfit || 0)}
              </p>
            </div>
          </div>

          {/* SEARCH & FILTER BAR */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="text"
                placeholder="Tìm tên, đường dẫn (slug)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-orange-500 transition"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setPaymentFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition whitespace-nowrap ${
                  paymentFilter === "ALL"
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Tất cả ({tenants.length})
              </button>
              <button
                onClick={() => setPaymentFilter("PAID")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition whitespace-nowrap ${
                  paymentFilter === "PAID"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                🟢 Đã đóng tiền ({paidTenantsCount})
              </button>
              <button
                onClick={() => setPaymentFilter("UNPAID")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition whitespace-nowrap ${
                  paymentFilter === "UNPAID"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
              >
                🔴 Chưa đóng tiền ({unpaidTenantsCount})
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CHẾ ĐỘ 1: BẢNG MA TRẬN THU PHÍ THEO THÁNG (MATRIX 12 THÁNG)              */}
          {/* ========================================================================= */}
          {tenantViewMode === "matrix" && (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-white to-orange-50/30 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center text-lg font-bold border border-orange-200/60 shadow-2xs shrink-0">
                    <i className="fa-solid fa-calendar-check"></i>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 font-display flex items-center gap-2">
                      <span>Bảng Đối Soát Thu Tiền Thuê Năm {selectedYear}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 shrink-0">
                        1-Chạm Bật/Tắt
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Hàng ngang là các Trưởng Nhóm, cột là Tháng 1..12. Bấm trực tiếp vào từng ô để đánh dấu đã đóng / chưa đóng.
                    </p>
                  </div>
                </div>

                {/* Bộ Chọn Năm & Thống Kê Nhanh */}
                <div className="flex items-center gap-2.5 flex-wrap self-end md:self-auto">
                  <div className="flex items-center gap-1 bg-white border border-slate-200 shadow-2xs rounded-2xl p-1">
                    <button
                      type="button"
                      onClick={() => setSelectedYear((y) => y - 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-600 transition cursor-pointer text-xs"
                      title="Năm trước"
                    >
                      <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <span className="px-2.5 py-0.5 font-black text-xs text-slate-900 font-display min-w-[70px] text-center">
                      Năm {selectedYear}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedYear((y) => y + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-600 transition cursor-pointer text-xs"
                      title="Năm sau"
                    >
                      <i className="fa-solid fa-chevron-right"></i>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-2xl text-xs">
                    <span className="text-emerald-700 font-medium text-[11px] hidden sm:inline">Tổng thu {selectedYear}:</span>
                    <span className="font-black text-emerald-800 font-display">{formatMoney(totalYearRevenue)}</span>
                  </div>

                  <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 pl-2 border-l border-slate-200">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                      <span>Đã đóng</span>
                    </span>
                    <span className="flex items-center gap-1 ml-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                      <span>Chưa thu</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Scrollable Matrix Table */}
              <div className="overflow-x-auto relative">
                <table className="w-full text-left border-collapse min-w-[950px]">
                  <thead>
                    <tr className="bg-slate-50/95 border-b border-slate-200/90 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                      {/* Cột Trưởng Nhóm Cố Định (Sticky Left) */}
                      <th className="py-3.5 px-4 sticky left-0 bg-slate-50/95 backdrop-blur-xs z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] min-w-[220px]">
                        Trưởng Nhóm Đối Tác
                      </th>

                      {/* 12 Cột Tháng */}
                      {months.map((m) => {
                        const isCurrent = selectedYear === currentYear && m === currentMonthNum;
                        return (
                          <th
                            key={m}
                            className={`py-3 px-1.5 text-center text-xs whitespace-nowrap min-w-[65px] ${
                              isCurrent
                                ? "bg-orange-100/70 text-orange-950 font-black border-x border-orange-200"
                                : "text-slate-700"
                            }`}
                          >
                            <div className="flex flex-col items-center">
                              <span>T{m}</span>
                              {isCurrent && (
                                <span className="text-[9px] bg-orange-500 text-white font-black px-1.5 py-0.2 rounded-full uppercase tracking-tighter mt-0.5 shadow-2xs">
                                  Hiện tại
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}

                      {/* Cột Tổng Kết Cả Năm */}
                      <th className="py-3.5 px-4 text-right min-w-[140px]">
                        Tổng Đã Thu ({selectedYear})
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-xs">
                    {isLoading ? (
                      <tr>
                        <td colSpan={14} className="py-12 text-center text-slate-400">
                          <i className="fa-solid fa-circle-notch fa-spin text-xl text-orange-500 mb-2 block"></i>
                          Đang tải dữ liệu đối soát Trưởng Nhóm...
                        </td>
                      </tr>
                    ) : filteredTenants.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="py-12 text-center text-slate-400">
                          <i className="fa-solid fa-store-slash text-2xl text-slate-300 mb-2 block"></i>
                          Không tìm thấy Kênh nào phù hợp.
                        </td>
                      </tr>
                    ) : (
                      filteredTenants.map((t) => {
                        const paidSet = getPaidMonths(t);
                        const fee = Number(t.monthlyFee || 500000);
                        let paidCountThisYear = 0;

                        return (
                          <tr key={t.id} className="hover:bg-slate-50/70 transition group">
                            {/* Cột Tên Trưởng Nhóm (Sticky Left) */}
                            <td className="py-3 px-4 sticky left-0 bg-white group-hover:bg-slate-50/90 transition z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-xs shadow-2xs shrink-0"
                                  style={{ backgroundColor: t.primaryColor || "#f97316" }}
                                >
                                  {t.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="font-bold text-slate-900 leading-tight truncate max-w-[130px]" title={t.name}>
                                      {t.name}
                                    </p>
                                    {t.isTiktokEnabled && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md text-[8px] font-black bg-slate-900 text-white shrink-0" title="Đã kích hoạt gói TikTok Shop">
                                        <i className="fa-brands fa-tiktok text-[7px]"></i> TikTok
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    {formatMoney(fee)} <span className="text-[9px] text-slate-400">(N{t.billingCycleDay || 15})</span>
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* 12 Ô Tháng Tương Tác */}
                            {months.map((m) => {
                              const monthKey = `${selectedYear}-${String(m).padStart(2, "0")}`;
                              const isPaid = paidSet.has(monthKey);
                              if (isPaid) paidCountThisYear++;
                              const isCurrent = selectedYear === currentYear && m === currentMonthNum;
                              const isPast = selectedYear < currentYear || (selectedYear === currentYear && m < currentMonthNum);
                              const isFuture = selectedYear > currentYear || (selectedYear === currentYear && m > currentMonthNum);
                              const isToggling = togglingMonth[`${t.id}-${monthKey}`];

                              return (
                                <td
                                  key={monthKey}
                                  className={`py-2 px-1 text-center ${
                                    isCurrent ? "bg-orange-50/30 border-x border-orange-100" : ""
                                  }`}
                                >
                                  <button
                                    type="button"
                                    disabled={isToggling}
                                    onClick={() => handleToggleMonth(t, monthKey)}
                                    title={`${t.name} - Tháng ${m}/${selectedYear}: ${
                                      isPaid ? "ĐÃ THANH TOÁN (" + formatMoney(fee) + "). Bấm để hủy." : "CHƯA THANH TOÁN. Bấm để xác nhận đã thu."
                                    }`}
                                    className={`w-full py-1.5 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 border ${
                                      isToggling
                                        ? "opacity-50 cursor-wait bg-slate-100 border-slate-200 text-slate-400"
                                        : isPaid
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 shadow-2xs active:scale-95"
                                        : isPast || isCurrent
                                        ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:border-rose-300 active:scale-95"
                                        : "bg-slate-50/80 text-slate-400 border-dashed border-slate-200 hover:bg-slate-100 hover:text-slate-600 active:scale-95"
                                    }`}
                                  >
                                    {isToggling ? (
                                      <i className="fa-solid fa-circle-notch fa-spin text-xs text-orange-500 py-1"></i>
                                    ) : isPaid ? (
                                      <>
                                        <i className="fa-solid fa-circle-check text-emerald-600 text-xs"></i>
                                        <span className="text-[10px] leading-none font-black text-emerald-700">Đã đóng</span>
                                      </>
                                    ) : isPast || isCurrent ? (
                                      <>
                                        <i className="fa-solid fa-clock text-rose-500 text-xs"></i>
                                        <span className="text-[10px] leading-none font-semibold text-rose-600">Chưa thu</span>
                                      </>
                                    ) : (
                                      <>
                                        <i className="fa-regular fa-circle text-slate-300 text-xs"></i>
                                        <span className="text-[10px] leading-none text-slate-400">-</span>
                                      </>
                                    )}
                                  </button>
                                </td>
                              );
                            })}

                            {/* Cột Tổng Kết Nhóm */}
                            <td className="py-3 px-4 text-right">
                              <div className="font-black text-xs text-slate-900 font-display">
                                {formatMoney(paidCountThisYear * fee)}
                              </div>
                              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                {paidCountThisYear} / 12 tháng
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>

                  {/* Footer Tổng Hợp Toàn Sàn */}
                  {!isLoading && filteredTenants.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-100/90 border-t-2 border-slate-300 text-xs font-black text-slate-800">
                        {/* Nhãn Tổng Cộng Cố Định (Sticky Left) */}
                        <td className="py-3.5 px-4 sticky left-0 bg-slate-100/95 backdrop-blur-xs z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] uppercase tracking-wider text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-800">
                            <i className="fa-solid fa-calculator text-orange-500"></i>
                            <span>Tổng Thu Tháng</span>
                          </div>
                        </td>

                        {/* Tổng Thu Theo Từng Tháng */}
                        {monthSummaries.map((ms) => (
                          <td
                            key={ms.monthKey}
                            className={`py-3 px-1 text-center whitespace-nowrap ${
                              ms.isCurrentMonth ? "bg-orange-100/80 border-x border-orange-200" : ""
                            }`}
                          >
                            <p className="text-[11px] font-black text-slate-900 font-display leading-tight">
                              {ms.totalRevenue > 0
                                ? ms.totalRevenue >= 1000000
                                  ? `${(ms.totalRevenue / 1000000).toFixed(1)}Tr`
                                  : formatMoney(ms.totalRevenue)
                                : "0đ"}
                            </p>
                            <p className="text-[9px] text-slate-500 font-semibold mt-0.5">
                              {ms.paidCount}/{filteredTenants.length}
                            </p>
                          </td>
                        ))}

                        {/* Tổng Doanh Thu Cả Năm */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <p className="text-xs font-black text-emerald-800 font-display">
                            {formatMoney(totalYearRevenue)}
                          </p>
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                            {totalYearPaidSlots} lượt thu
                          </p>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* CHẾ ĐỘ 2: DANH SÁCH CẤU HÌNH KÊNH (TABLE CHI TIẾT & SỬA / XÓA)            */}
          {/* ========================================================================= */}
          {tenantViewMode === "table" && (
            <>
              {/* MOBILE & TABLET CARD VIEW (Ẩn trên Desktop >= lg) */}
              <div className="block lg:hidden space-y-3">
                {isLoading ? (
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 shadow-2xs">
                    <i className="fa-solid fa-circle-notch fa-spin text-xl text-orange-500 mb-2 block"></i>
                    Đang tải dữ liệu Kênh Đối Tác...
                  </div>
                ) : filteredTenants.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 shadow-2xs">
                    <i className="fa-solid fa-store-slash text-2xl text-slate-300 mb-2 block"></i>
                    Không tìm thấy Kênh nào phù hợp.
                  </div>
                ) : (
                  filteredTenants.map((t) => {
                    const isPaid = (t.subscriptionStatus || "PAID").toUpperCase() === "PAID";
                    return (
                      <div
                        key={t.id}
                        className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3 hover:border-orange-200 transition"
                      >
                        {/* Header: Logo, Name, Slug, Payment Button */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-2xs shrink-0"
                              style={{ backgroundColor: t.primaryColor || "#f97316" }}
                            >
                              {t.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-sm leading-snug truncate">{t.name}</p>
                              <p className="text-[11px] font-mono text-slate-400">/{t.slug}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleTogglePayment(t)}
                            className={`px-3 py-1 rounded-full text-[11px] font-black cursor-pointer transition shadow-2xs inline-flex items-center gap-1.5 shrink-0 ${
                              isPaid
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300"
                                : "bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300 animate-pulse"
                            }`}
                          >
                            <i className={`fa-solid ${isPaid ? "fa-circle-check text-emerald-600" : "fa-clock text-rose-600"}`}></i>
                            <span>{isPaid ? "Đã đóng tiền" : "Chưa đóng"}</span>
                          </button>
                        </div>

                        {/* Details Box */}
                        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-400 font-medium text-[11px] shrink-0">Domain:</span>
                            <div className="truncate text-right">
                              {t.publicLookupDomain ? (
                                <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-mono text-[11px] font-semibold">
                                  {t.publicLookupDomain}
                                </span>
                              ) : (
                                <span className="text-slate-500 font-mono text-[11px]">28affihub.store/{t.slug}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-400 font-medium text-[11px] shrink-0">Gói tính năng:</span>
                            <div>
                              {t.isTiktokEnabled ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-900 text-white shadow-2xs">
                                  <i className="fa-brands fa-tiktok text-[10px]"></i>
                                  <span>Shopee + TikTok</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                                  <i className="fa-solid fa-bag-shopping text-[10px]"></i>
                                  <span>Chỉ Shopee</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-400 font-medium text-[11px] shrink-0">Tiền thuê / tháng:</span>
                            <span className="font-bold text-slate-900 font-display text-xs">
                              {formatMoney(t.monthlyFee || 500000)}
                              <span className="text-[10px] font-normal text-slate-400 ml-1">
                                (Ngày {t.billingCycleDay || 15})
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="flex-1 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 border border-orange-200"
                          >
                            <i className="fa-solid fa-pen-to-square text-xs"></i>
                            <span>Chỉnh Sửa</span>
                          </button>
                          <button
                            onClick={() => handleDeleteTenant(t.id, t.name)}
                            className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 border border-rose-200"
                            title="Xóa Kênh"
                          >
                            <i className="fa-solid fa-trash-can text-xs"></i>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* DESKTOP TABLE VIEW (Hiện trên màn hình >= lg) */}
              <div className="hidden lg:block bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Kênh Đối Tác</th>
                        <th className="py-3.5 px-4">Tên Miền / Đường Dẫn Tra Cứu</th>
                        <th className="py-3.5 px-4 text-center">Gói Tính Năng</th>
                        <th className="py-3.5 px-4">Tiền Thuê / Chu Kỳ</th>
                        <th className="py-3.5 px-4 text-center">Thu Phí Thuê</th>
                        <th className="py-3.5 px-4 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                      {isLoading ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            <i className="fa-solid fa-circle-notch fa-spin text-xl text-orange-500 mb-2 block"></i>
                            Đang tải dữ liệu Kênh Đối Tác...
                          </td>
                        </tr>
                      ) : filteredTenants.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            <i className="fa-solid fa-store-slash text-2xl text-slate-300 mb-2 block"></i>
                            Không tìm thấy Kênh nào phù hợp.
                          </td>
                        </tr>
                      ) : (
                        filteredTenants.map((t) => {
                          const isPaid = (t.subscriptionStatus || "PAID").toUpperCase() === "PAID";
                          return (
                            <tr key={t.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-2xs shrink-0"
                                    style={{ backgroundColor: t.primaryColor || "#f97316" }}
                                  >
                                    {t.name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <p className="font-bold text-slate-900 leading-snug">{t.name}</p>
                                    </div>
                                    <p className="text-[11px] font-mono text-slate-400">/{t.slug}</p>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                {t.publicLookupDomain ? (
                                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-mono text-[11px] font-semibold">
                                    {t.publicLookupDomain}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono text-[11px]">28affihub.store/{t.slug}</span>
                                )}
                              </td>

                              <td className="py-3.5 px-4 text-center">
                                {t.isTiktokEnabled ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-900 text-white shadow-2xs">
                                    <i className="fa-brands fa-tiktok text-[10px]"></i>
                                    <span>Shopee + TikTok</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                                    <i className="fa-solid fa-bag-shopping text-[10px]"></i>
                                    <span>Chỉ Shopee</span>
                                  </span>
                                )}
                              </td>

                              <td className="py-3.5 px-4 font-bold text-slate-900 font-display">
                                {formatMoney(t.monthlyFee || 500000)}
                                <span className="text-[10px] font-normal text-slate-400 block">
                                  Ngày {t.billingCycleDay || 15} hàng tháng
                                </span>
                              </td>

                              <td className="py-3.5 px-4 text-center">
                                <button
                                  onClick={() => handleTogglePayment(t)}
                                  className={`px-3 py-1 rounded-full text-[11px] font-black cursor-pointer transition shadow-2xs inline-flex items-center gap-1.5 ${
                                    isPaid
                                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300"
                                      : "bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300 animate-pulse"
                                  }`}
                                >
                                  <i className={`fa-solid ${isPaid ? "fa-circle-check text-emerald-600" : "fa-clock text-rose-600"}`}></i>
                                  <span>{isPaid ? "Đã đóng tiền" : "Chưa đóng"}</span>
                                </button>
                              </td>

                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleOpenEdit(t)}
                                    className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition cursor-pointer"
                                    title="Chỉnh sửa Kênh"
                                  >
                                    <i className="fa-solid fa-pen-to-square"></i>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTenant(t.id, t.name)}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                                    title="Xóa Kênh"
                                  >
                                    <i className="fa-solid fa-trash-can"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: QUẢN LÝ TÀI KHOẢN & PHÂN QUYỀN (USERS & ROLES)                      */}
      {/* ========================================================================= */}
      {adminSubTab === "users" && (
        <div className="space-y-4 animate-fade-in">
          {/* SEARCH & ROLE FILTER BAR */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative w-full md:w-80 shrink-0">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="text"
                placeholder="Tìm theo email, tên người dùng..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-purple-500 transition"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <button
                onClick={() => setUserRoleFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition whitespace-nowrap shrink-0 ${
                  userRoleFilter === "ALL"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Tất cả ({users.length})
              </button>
              <button
                onClick={() => setUserRoleFilter("SUPER_ADMIN")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition whitespace-nowrap shrink-0 ${
                  userRoleFilter === "SUPER_ADMIN"
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                }`}
              >
                👑 Super Admin ({users.filter((u) => u.role === "SUPER_ADMIN").length})
              </button>
              <button
                onClick={() => setUserRoleFilter("TENANT_ADMIN")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition whitespace-nowrap shrink-0 ${
                  userRoleFilter === "TENANT_ADMIN"
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200"
                }`}
              >
                👔 Trưởng Nhóm ({users.filter((u) => u.role === "TENANT_ADMIN").length})
              </button>
              <button
                onClick={() => setUserRoleFilter("BUYER")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition whitespace-nowrap shrink-0 ${
                  userRoleFilter === "BUYER"
                    ? "bg-slate-700 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                🛍️ Thành Viên ({users.filter((u) => !u.role || u.role === "BUYER").length})
              </button>
            </div>
          </div>

          {/* MOBILE & TABLET CARD VIEW (Ẩn trên Desktop >= lg) */}
          <div className="block lg:hidden space-y-3">
            {isLoadingUsers ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 shadow-2xs">
                <i className="fa-solid fa-circle-notch fa-spin text-xl text-purple-600 mb-2 block"></i>
                Đang tải danh sách tài khoản...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 shadow-2xs">
                <i className="fa-solid fa-user-slash text-2xl text-slate-300 mb-2 block"></i>
                Không có người dùng nào khớp điều kiện.
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isCurrentUser = user && user.id === u.id;
                return (
                  <div
                    key={u.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3 hover:border-purple-200 transition"
                  >
                    {/* Header: Avatar, Name, ID, Role */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={
                            u.avatarUrl ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              u.name || "User"
                            )}&background=8b5cf6&color=fff`
                          }
                          alt={u.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm leading-snug flex items-center gap-1.5 flex-wrap">
                            <span className="truncate">{u.name || "Chưa đặt tên"}</span>
                            {isCurrentUser && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                                Bạn
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">ID #{u.id}</p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {u.role === "SUPER_ADMIN" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900 border border-amber-300 shadow-2xs">
                            <i className="fa-solid fa-crown text-amber-600 text-[10px]"></i>
                            <span>Super Admin</span>
                          </span>
                        ) : u.role === "TENANT_ADMIN" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
                            <i className="fa-solid fa-user-tie text-purple-600 text-[10px]"></i>
                            <span>Trưởng Nhóm</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <i className="fa-solid fa-bag-shopping text-slate-400 text-[10px]"></i>
                            <span>Thành Viên</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Details Box */}
                    <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1.5 shrink-0">
                          <i className="fa-regular fa-envelope text-slate-400"></i>
                          Email:
                        </span>
                        <span className="font-mono text-slate-800 text-[11px] truncate font-semibold">
                          {u.email}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1.5 shrink-0">
                          <i className="fa-solid fa-store text-slate-400"></i>
                          Kênh:
                        </span>
                        <div className="text-right truncate">
                          {u.role === "TENANT_ADMIN" ? (
                            u.tenantName ? (
                              <span className="font-bold text-purple-700 bg-purple-100/60 px-2 py-0.5 rounded-lg border border-purple-200 text-[11px]">
                                {u.tenantName} <span className="text-slate-400 font-mono text-[10px]">({u.tenantSlug})</span>
                              </span>
                            ) : (
                              <span className="text-rose-500 font-bold text-[11px]">⚠️ Chưa gán kênh</span>
                            )
                          ) : u.role === "SUPER_ADMIN" ? (
                            <span className="text-amber-700 font-bold text-[11px]">🌐 Toàn bộ tất cả kênh</span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1.5 shrink-0">
                          <i className="fa-regular fa-calendar text-slate-400"></i>
                          Tham gia:
                        </span>
                        <span className="text-slate-600 font-medium text-[11px]">
                          {u.createdAt ? formatDate(u.createdAt) : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => handleOpenEditUserRole(u)}
                      className="w-full py-2 bg-slate-100 hover:bg-purple-100 active:bg-purple-200 text-slate-700 hover:text-purple-800 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200/80"
                    >
                      <i className="fa-solid fa-user-pen text-xs"></i>
                      <span>Phân Quyền / Đổi Role</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* DESKTOP TABLE VIEW (Hiện trên màn hình >= lg) */}
          <div className="hidden lg:block bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Tài Khoản Google</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4 text-center">Vai Trò (Role)</th>
                    <th className="py-3.5 px-4">Kênh Được Phân Công</th>
                    <th className="py-3.5 px-4">Ngày Tham Gia</th>
                    <th className="py-3.5 px-4 text-right">Phân Quyền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {isLoadingUsers ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <i className="fa-solid fa-circle-notch fa-spin text-xl text-purple-600 mb-2 block"></i>
                        Đang tải danh sách tài khoản...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <i className="fa-solid fa-user-slash text-2xl text-slate-300 mb-2 block"></i>
                        Không có người dùng nào khớp điều kiện.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isCurrentUser = user && user.id === u.id;
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={
                                  u.avatarUrl ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    u.name || "User"
                                  )}&background=8b5cf6&color=fff`
                                }
                                alt={u.name}
                                className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0"
                              />
                              <div>
                                <p className="font-bold text-slate-900 leading-snug flex items-center gap-1.5">
                                  <span>{u.name || "Chưa đặt tên"}</span>
                                  {isCurrentUser && (
                                    <span className="text-[9px] font-black px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                                      Bạn
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] text-slate-400 font-mono">ID #{u.id}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-800 text-xs">
                            {u.email}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {u.role === "SUPER_ADMIN" ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-100 to-orange-100 text-amber-900 border border-amber-300 shadow-2xs">
                                <i className="fa-solid fa-crown text-amber-600"></i>
                                <span>Super Admin</span>
                              </span>
                            ) : u.role === "TENANT_ADMIN" ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
                                <i className="fa-solid fa-user-tie text-purple-600"></i>
                                <span>Trưởng Nhóm</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                <i className="fa-solid fa-bag-shopping text-slate-400"></i>
                                <span>Thành Viên</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {u.role === "TENANT_ADMIN" ? (
                              u.tenantName ? (
                                <span className="font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-100 inline-block">
                                  {u.tenantName} <span className="text-slate-400 font-mono text-[10px]">({u.tenantSlug})</span>
                                </span>
                              ) : (
                                <span className="text-rose-500 font-bold text-[11px]">⚠️ Chưa gán kênh</span>
                              )
                            ) : u.role === "SUPER_ADMIN" ? (
                              <span className="text-amber-700 font-bold text-[11px]">🌐 Toàn bộ tất cả kênh</span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                            {u.createdAt ? formatDate(u.createdAt) : "—"}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleOpenEditUserRole(u)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 rounded-xl font-bold text-xs transition cursor-pointer inline-flex items-center gap-1.5 border border-slate-200/80"
                            >
                              <i className="fa-solid fa-user-pen text-xs"></i>
                              <span>Đổi Role</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL EDIT USER ROLE ===================== */}
      {editingUserRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-lg font-bold">
                  <i className="fa-solid fa-users-gear"></i>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-display">
                    Phân Quyền Tài Khoản
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {editingUserRole.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingUserRole(null)}
                className="text-slate-400 hover:text-slate-600 text-lg w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveUserRole} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wider">
                  Chọn Vai Trò (Role):
                </label>
                <div className="space-y-2">
                  <label className={`flex items-start gap-3 p-3 rounded-2xl border-2 transition cursor-pointer ${
                    userRoleForm.role === "SUPER_ADMIN"
                      ? "border-amber-500 bg-amber-50/50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="SUPER_ADMIN"
                      checked={userRoleForm.role === "SUPER_ADMIN"}
                      onChange={(e) => setUserRoleForm({ ...userRoleForm, role: e.target.value })}
                      className="mt-1"
                    />
                    <div>
                      <span className="text-xs font-black text-amber-900 block">
                        👑 Super Admin (Chủ Sàn)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Toàn quyền xem và điều hành tất cả kênh đối tác, doanh thu và phân quyền user.
                      </span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-2xl border-2 transition cursor-pointer ${
                    userRoleForm.role === "TENANT_ADMIN"
                      ? "border-purple-500 bg-purple-50/50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="TENANT_ADMIN"
                      checked={userRoleForm.role === "TENANT_ADMIN"}
                      onChange={(e) => setUserRoleForm({ ...userRoleForm, role: e.target.value })}
                      className="mt-1"
                    />
                    <div>
                      <span className="text-xs font-black text-purple-900 block">
                        👔 Trưởng Nhóm (Đối Tác Kênh Riêng)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Chỉ quản trị duy nhất kênh được phân công (nạp Excel, duyệt rút tiền, sửa bot).
                      </span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-2xl border-2 transition cursor-pointer ${
                    userRoleForm.role === "BUYER"
                      ? "border-slate-700 bg-slate-100/60"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}>
                    <input
                      type="radio"
                      name="role"
                      value="BUYER"
                      checked={userRoleForm.role === "BUYER"}
                      onChange={(e) => setUserRoleForm({ ...userRoleForm, role: e.target.value })}
                      className="mt-1"
                    />
                    <div>
                      <span className="text-xs font-black text-slate-800 block">
                        🛍️ Thành Viên (Khách Mua Hàng)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Chỉ tra cứu đơn cá nhân và rút tiền hoa hồng, không có quyền quản trị.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* If TENANT_ADMIN, select tenant */}
              {userRoleForm.role === "TENANT_ADMIN" && (
                <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 animate-fade-in">
                  <label className="block text-xs font-black text-purple-900 mb-1.5">
                    Gán Kênh Quản Trị Cho Trưởng Nhóm:
                  </label>
                  <select
                    value={userRoleForm.tenantId}
                    onChange={(e) => setUserRoleForm({ ...userRoleForm, tenantId: e.target.value })}
                    className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                    required
                  >
                    <option value="">-- Chọn 1 Kênh Đối Tác --</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (slug: {t.slug})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingUserRole(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingUserRole}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {isSavingUserRole ? "Đang lưu..." : "Lưu Phân Quyền"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL THÊM / SỬA TRƯỞNG NHÓM ===================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-lg font-bold">
                  <i className="fa-solid fa-store"></i>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 font-display">
                    {editingTenant ? `Cấu Hình: ${editingTenant.name}` : "Thêm Trưởng Nhóm Mới"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingTenant ? "Cập nhật thông số hợp đồng và cấu hình riêng" : "Khởi tạo Kênh đối soát riêng"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveTenant} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Đường dẫn (Slug) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: lecuong, mailan, ly..."
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, "") })}
                    disabled={!!editingTenant}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-orange-500 disabled:opacity-60"
                    required
                  />
                  <span className="text-[10px] text-slate-400">Ví dụ: 28affihub.store/{formData.slug || "tennhom"}</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên Trưởng Nhóm / Kênh <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Lê Cường Affiliate..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              <div className="p-4 bg-orange-50/60 rounded-2xl border border-orange-200/80 space-y-3">
                <p className="text-xs font-black text-orange-950 uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fa-solid fa-file-invoice-dollar text-orange-600"></i>
                  <span>Thông Số Hợp Đồng Thuê Nền Tảng</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Tiền Thuê Mỗi Tháng (VNĐ)</label>
                    <input
                      type="number"
                      value={formData.monthlyFee}
                      onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value })}
                      className="w-full bg-white border border-orange-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Ngày Thu Phí Hàng Tháng</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.billingCycleDay}
                      onChange={(e) => setFormData({ ...formData, billingCycleDay: e.target.value })}
                      className="w-full bg-white border border-orange-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Trạng Thái Đóng Tiền Tháng Này</label>
                  <select
                    value={formData.subscriptionStatus}
                    onChange={(e) => setFormData({ ...formData, subscriptionStatus: e.target.value })}
                    className="w-full bg-white border border-orange-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 outline-none cursor-pointer"
                  >
                    <option value="PAID">🟢 Đã đóng tiền tháng này</option>
                    <option value="UNPAID">🔴 Chưa đóng (Cần nhắc đóng tiền)</option>
                  </select>
                </div>
              </div>

              {/* GÓI DỊCH VỤ TIKTOK SHOP (BẬT/TẮT THU THÊM PHÍ) */}
              <div
                onClick={() => setFormData({ ...formData, isTiktokEnabled: !formData.isTiktokEnabled })}
                className={`p-4.5 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                  formData.isTiktokEnabled
                    ? "bg-orange-50/80 border-orange-300 shadow-sm text-slate-900"
                    : "bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Icon TikTok màu đen sang trọng */}
                    <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center text-xl shrink-0 font-bold shadow-md shadow-slate-950/20">
                      <i className="fa-brands fa-tiktok"></i>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-black text-slate-900">Gói Dịch Vụ TikTok Shop</span>
                        {formData.isTiktokEnabled ? (
                          <span className="text-[10px] font-black px-2.5 py-0.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                            <i className="fa-solid fa-check text-[9px]"></i> Đang Bật
                          </span>
                        ) : (
                          <span className="text-[10px] font-black px-2.5 py-0.5 bg-slate-200 text-slate-600 rounded-full uppercase tracking-wider">
                            Đang Tắt
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] sm:text-xs mt-1 leading-snug text-slate-600">
                        {formData.isTiktokEnabled
                          ? "Cho phép Kênh kết nối API & đồng bộ đơn TikTok Shop (Đã thu thêm phí dịch vụ)."
                          : "Tắt tính năng TikTok Shop (Ẩn tab Đơn TikTok & Cấu hình API TikTok của Trưởng Nhóm)."}
                      </p>
                    </div>
                  </div>

                  {/* Big Toggle Switch Button đồng bộ màu cam */}
                  <div className="shrink-0 flex items-center">
                    <div
                      className={`w-16 h-9 rounded-full transition-colors duration-200 relative p-1 flex items-center cursor-pointer ${
                        formData.isTiktokEnabled ? "bg-gradient-to-r from-orange-500 to-amber-500 shadow-md shadow-orange-500/25" : "bg-slate-300"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 bg-white rounded-full shadow-md transform transition-transform duration-200 flex items-center justify-center text-xs font-bold ${
                          formData.isTiktokEnabled
                            ? "translate-x-7 text-orange-600"
                            : "translate-x-0 text-slate-400"
                        }`}
                      >
                        <i className={`fa-solid ${formData.isTiktokEnabled ? "fa-check" : "fa-xmark"} text-[11px]`}></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black rounded-xl shadow-md transition cursor-pointer"
                >
                  {editingTenant ? "Lưu Cập Nhật" : "Tạo Trưởng Nhóm Mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
