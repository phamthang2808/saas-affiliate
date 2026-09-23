import React, { useState, useEffect } from "react";
import { formatMoney, formatDate } from "../utils/formatters";

export function SuperAdminView({ apiRoot, user, token, onOpenLogin, onLogout }) {
  const [adminSubTab, setAdminSubTab] = useState("tenants"); // 'tenants' | 'users'
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

  const [formData, setFormData] = useState({
    slug: "",
    name: "",
    shopeePubId: "",
    tiktokApiKey: "",
    tiktokCreatorUsername: "",
    taxRate: "10.00",
    customerSplitRate: "80.00",
    subidPrefix: "u_",
    primaryColor: "#f97316",
    adminZaloId: "",
    publicLookupDomain: "",
    monthlyFee: "500000",
    billingCycleDay: "15",
    subscriptionStatus: "PAID",
    billingNote: "",
  });

  const authHeaders = {
    Authorization: `Bearer ${token}`,
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

  const handleOpenAdd = () => {
    setEditingTenant(null);
    setFormData({
      slug: "",
      name: "",
      shopeePubId: "",
      tiktokApiKey: "",
      tiktokCreatorUsername: "",
      taxRate: "10.00",
      customerSplitRate: "80.00",
      subidPrefix: "u_",
      primaryColor: "#f97316",
      adminZaloId: "",
      publicLookupDomain: "",
      monthlyFee: "500000",
      billingCycleDay: "15",
      subscriptionStatus: "PAID",
      billingNote: "",
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (t) => {
    setEditingTenant(t);
    setFormData({
      slug: t.slug || "",
      name: t.name || "",
      shopeePubId: t.shopeePubId || "",
      tiktokApiKey: t.tiktokApiKey || "",
      tiktokCreatorUsername: t.tiktokCreatorUsername || "",
      taxRate: t.taxRate !== undefined ? String(t.taxRate) : "10.00",
      customerSplitRate: t.customerSplitRate !== undefined ? String(t.customerSplitRate) : "80.00",
      subidPrefix: t.subidPrefix || "u_",
      primaryColor: t.primaryColor || "#f97316",
      adminZaloId: t.adminZaloId || "",
      publicLookupDomain: t.publicLookupDomain || "",
      monthlyFee: t.monthlyFee !== undefined ? String(t.monthlyFee) : "500000",
      billingCycleDay: t.billingCycleDay !== undefined ? String(t.billingCycleDay) : "15",
      subscriptionStatus: t.subscriptionStatus || "PAID",
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

  const handleTogglePayment = async (t) => {
    const isPaid = (t.subscriptionStatus || "PAID").toUpperCase() === "PAID";
    const confirmMsg = isPaid
      ? `Đổi trạng thái của "${t.name}" sang: CHƯA ĐÓNG TIỀN THUÊ THÁNG NÀY?`
      : `Xác nhận Trưởng Nhóm "${t.name}" ĐÃ ĐÓNG TIỀN THUÊ (${formatMoney(t.monthlyFee || 500000)}) cho tháng này?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`${apiRoot}/api/saas/super-admin/tenants/${t.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          subscriptionStatus: isPaid ? "UNPAID" : "PAID",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        notify(isPaid ? "Đã chuyển sang Chưa đóng tiền" : "Đã xác nhận thanh toán tiền thuê thành công!");
        fetchTenantsAndStats();
      } else {
        notify(data.message || "Lỗi cập nhật", "error");
      }
    } catch (err) {
      notify("Lỗi máy chủ: " + err.message, "error");
    }
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
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/10 border border-amber-200 text-amber-600 flex items-center justify-center text-xl sm:text-2xl font-black shrink-0">
              <i className="fa-solid fa-crown"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 font-display">
                  Quản Trị Toàn Sàn
                </h1>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-300">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px] sm:max-w-none">
                Quản lý các Trưởng Nhóm đối tác và phân quyền toàn sàn.
              </p>
            </div>
          </div>

          {/* Nút Đăng Xuất Nhanh trên Mobile cho Super Admin */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 shadow-2xs transition active:scale-95 cursor-pointer shrink-0"
              title="Đăng xuất tài khoản Super Admin"
            >
              <i className="fa-solid fa-arrow-right-from-bracket text-rose-500 text-xs"></i>
              <span>Đăng xuất</span>
            </button>
          )}
        </div>

        {adminSubTab === "tenants" && (
          <button
            onClick={handleOpenAdd}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs rounded-2xl shadow-md shadow-orange-500/20 transition cursor-pointer flex items-center gap-2 self-stretch md:self-auto justify-center"
          >
            <i className="fa-solid fa-plus-circle"></i>
            <span>Thêm Trưởng Nhóm Mới</span>
          </button>
        )}
      </div>

      {/* ===================== SUB TABS NAVIGATION ===================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-b border-slate-200/80 pb-3">
        <button
          onClick={() => setAdminSubTab("tenants")}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
            adminSubTab === "tenants"
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <i className="fa-solid fa-store text-xs"></i>
          <span>1. Quản Lý Kênh Đối Tác ({tenants.length})</span>
        </button>

        <button
          onClick={() => {
            setAdminSubTab("users");
            fetchUsers();
          }}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
            adminSubTab === "users"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <i className="fa-solid fa-users-gear text-xs"></i>
          <span>2. Quản Lý Tài Khoản & Phân Quyền ({users.length})</span>
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
                        <span className="text-slate-400 font-medium text-[11px] shrink-0">Tỷ lệ chia:</span>
                        <span className="text-[11px] font-bold">
                          <span className="text-orange-600">{t.customerSplitRate || 80}%</span>
                          <span className="text-slate-400 mx-1">-</span>
                          <span className="text-slate-700">{100 - (t.customerSplitRate || 80)}%</span>
                          <span className="text-[10px] text-slate-400 font-normal ml-1">(Thuế {t.taxRate || 10}%)</span>
                        </span>
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
                    <th className="py-3.5 px-4">Tỷ Lệ Chia (Khách - Trưởng Nhóm)</th>
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
                                <p className="font-bold text-slate-900 leading-snug">{t.name}</p>
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

                          <td className="py-3.5 px-4">
                            <span className="font-bold text-orange-600">{t.customerSplitRate || 80}%</span>
                            <span className="text-slate-400 mx-1">-</span>
                            <span className="font-bold text-slate-700">{100 - (t.customerSplitRate || 80)}%</span>
                            <span className="text-[10px] text-slate-400 block">(Thuế: {t.taxRate || 10}%)</span>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tỷ lệ hoàn cho khách (%)</label>
                  <input
                    type="number"
                    value={formData.customerSplitRate}
                    onChange={(e) => setFormData({ ...formData, customerSplitRate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-orange-500"
                  />
                  <span className="text-[10px] text-slate-400">Mặc định: 80%</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Thuế TNCN khấu trừ (%)</label>
                  <input
                    type="number"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-orange-500"
                  />
                  <span className="text-[10px] text-slate-400">Mặc định: 10%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Domain Cổng Tra Cứu Riêng (Nếu có)</label>
                <input
                  type="text"
                  placeholder="VD: hoantien47.store, mailan.hoantien.store..."
                  value={formData.publicLookupDomain}
                  onChange={(e) => setFormData({ ...formData, publicLookupDomain: e.target.value.toLowerCase().trim() })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Shopee Publisher ID</label>
                  <input
                    type="text"
                    placeholder="VD: 17192837492..."
                    value={formData.shopeePubId}
                    onChange={(e) => setFormData({ ...formData, shopeePubId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">TikTok Creator Username</label>
                  <input
                    type="text"
                    placeholder="VD: @nhuy.affiliate..."
                    value={formData.tiktokCreatorUsername}
                    onChange={(e) => setFormData({ ...formData, tiktokCreatorUsername: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-orange-500"
                  />
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
