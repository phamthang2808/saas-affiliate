import React, { useState, useEffect } from "react";
import { formatMoney, formatDate } from "../utils/formatters";

export function SuperAdminView({ apiRoot, user, token, onOpenLogin }) {
  const [tenants, setTenants] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("ALL"); // 'ALL' | 'PAID' | 'UNPAID'
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);

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

  const fetchTenantsAndStats = async () => {
    setIsLoading(true);
    try {
      const [resTenants, resStats] = await Promise.all([
        fetch(`${apiRoot}/api/saas/super-admin/tenants`),
        fetch(`${apiRoot}/api/saas/super-admin/stats`),
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

  useEffect(() => {
    fetchTenantsAndStats();
  }, [apiRoot]);

  const notify = (msg, type = "success") => {
    alert((type === "error" ? "❌ " : "✅ ") + msg);
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
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch(`${apiRoot}/api/saas/super-admin/tenants/${t.id}/toggle-payment`, {
        method: "PUT",
      });
      const data = await res.json();
      if (res.ok) {
        notify(data.message);
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

  const filteredTenants = tenants.filter((t) => {
    const matchesQuery =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase());

    const isPaid = (t.subscriptionStatus || "PAID").toUpperCase() === "PAID";
    const matchesPayment =
      paymentFilter === "ALL" ||
      (paymentFilter === "PAID" && isPaid) ||
      (paymentFilter === "UNPAID" && !isPaid);

    return matchesQuery && matchesPayment;
  });

  const paidTenantsCount = tenants.filter((t) => (t.subscriptionStatus || "PAID").toUpperCase() === "PAID").length;
  const unpaidTenantsCount = tenants.length - paidTenantsCount;

  return (
    <div className="space-y-6 pb-12">
      {/* ===================== HERO CARD ===================== */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-200 text-amber-600 flex items-center justify-center text-2xl font-black shrink-0">
            <i className="fa-solid fa-crown"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 font-display">
                Trang Quản Trị Viên
              </h1>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-amber-300">
                Toàn sàn
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Quản lý danh sách các Trưởng Nhóm đối tác, theo dõi thu tiền thuê web hàng tháng và doanh thu toàn sàn.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs rounded-2xl shadow-md shadow-orange-500/20 transition cursor-pointer flex items-center gap-2 self-stretch md:self-auto justify-center"
        >
          <i className="fa-solid fa-plus-circle"></i>
          <span>Thêm Trưởng Nhóm Mới</span>
        </button>
      </div>

      {/* ===================== METRIC STATS GRID ===================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Metric 1: Tổng tiền thuê hàng tháng */}
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

        {/* Metric 2: Đã thu tháng này */}
        <div className="metric-card bg-gradient-to-br from-emerald-50/60 to-white border-emerald-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider">
              Đã Thu Tháng Này (🟢)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
              <i className="fa-solid fa-circle-check"></i>
            </div>
          </div>
          <div className="text-xl md:text-2xl font-black text-emerald-600 mt-2 font-display truncate">
            {formatMoney(stats?.paidMonthlyRentalFee || 0)}
          </div>
          <p className="text-[11px] text-emerald-600/80 mt-1 font-bold">{paidTenantsCount} nhóm đã thanh toán</p>
        </div>

        {/* Metric 3: Chưa thu / Nợ cước */}
        <div className={`metric-card ${unpaidTenantsCount > 0 ? "bg-rose-50/40 border-rose-200" : ""}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-rose-600 uppercase tracking-wider">
              Chưa Thu / Nợ Cước (🔴)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
          </div>
          <div className="text-xl md:text-2xl font-black text-rose-600 mt-2 font-display truncate">
            {formatMoney(stats?.unpaidMonthlyRentalFee || 0)}
          </div>
          <p className="text-[11px] text-rose-500 mt-1 font-bold">{unpaidTenantsCount} nhóm chưa đóng cước</p>
        </div>

        {/* Metric 4: Doanh thu sàn */}
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Lợi Nhuận Toàn Sàn
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-bold">
              <i className="fa-solid fa-chart-pie"></i>
            </div>
          </div>
          <div className="text-xl md:text-2xl font-black text-amber-600 mt-2 font-display truncate">
            {formatMoney(stats?.totalAdminProfit || 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Từ {stats?.totalOrders || 0} đơn hàng</p>
        </div>
      </div>

      {/* ===================== TENANTS LIST TABLE ===================== */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">Danh Sách Trưởng Nhóm & Tình Trạng Thu Cước</h3>
            <p className="text-xs text-slate-400">Quản lý ngày đóng tiền hàng tháng và theo dõi nợ cước của từng nhóm</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Payment Filter Tabs */}
            <div className="bg-slate-100 p-1 rounded-xl flex gap-1 text-xs w-full sm:w-auto">
              <button
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold transition cursor-pointer text-center ${
                  paymentFilter === "ALL" ? "bg-white text-orange-600 shadow-xs" : "text-slate-500"
                }`}
                onClick={() => setPaymentFilter("ALL")}
              >
                Tất cả ({tenants.length})
              </button>
              <button
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold transition cursor-pointer text-center ${
                  paymentFilter === "PAID" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-500"
                }`}
                onClick={() => setPaymentFilter("PAID")}
              >
                Đã đóng ({paidTenantsCount})
              </button>
              <button
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold transition cursor-pointer text-center ${
                  paymentFilter === "UNPAID" ? "bg-white text-rose-600 shadow-xs" : "text-slate-500"
                }`}
                onClick={() => setPaymentFilter("UNPAID")}
              >
                Chưa đóng ({unpaidTenantsCount})
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="🔍 Tìm theo tên, slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-orange-500 flex-1 sm:w-48"
              />

              <button
                onClick={fetchTenantsAndStats}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer shrink-0"
                title="Làm mới"
              >
                <i className="fa-solid fa-rotate-right"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Card View (lg:hidden) */}
        <div className="block lg:hidden divide-y divide-slate-100">
          {filteredTenants.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-medium">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="fa-solid fa-spinner fa-spin text-orange-500"></i> Đang tải dữ liệu...
                </span>
              ) : (
                "Không tìm thấy Trưởng Nhóm nào khớp điều kiện lọc."
              )}
            </div>
          ) : (
            filteredTenants.map((t) => {
              const isPaid = (t.subscriptionStatus || "PAID").toUpperCase() === "PAID";
              const cycleDay = t.billingCycleDay || 15;
              const fee = t.monthlyFee || 500000;

              return (
                <div key={t.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-sm font-black shrink-0 shadow-xs"
                        style={{ backgroundColor: t.primaryColor || "#f97316" }}
                      >
                        {t.name ? t.name.charAt(0).toUpperCase() : "T"}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm">{t.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-[11px] border border-orange-200">
                            /{t.slug}
                          </span>
                          <span className="text-[10px] text-slate-400">ID: #{t.id}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1 shrink-0 ${
                        isPaid
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
                      }`}
                    >
                      <i className={`fa-solid ${isPaid ? "fa-circle-check" : "fa-circle-exclamation"}`}></i>
                      <span>{isPaid ? "Đã đóng" : "Chưa đóng"}</span>
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Tiền thuê hàng tháng</span>
                      <span className="font-mono font-black text-slate-900 text-xs">{formatMoney(fee)}</span>
                      <div className="text-[10px] text-orange-600 font-bold mt-0.5">
                        Ngày {cycleDay} hàng tháng
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Tỷ lệ phân chia</span>
                      <div className="font-extrabold text-emerald-600 text-xs">Khách: {t.customerSplitRate || 80}%</div>
                      <div className="text-[10px] text-slate-500">Thuế: {t.taxRate || 10}%</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 gap-2">
                    <button
                      onClick={() => handleTogglePayment(t)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center justify-center gap-1.5 ${
                        isPaid
                          ? "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                          : "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 shadow-xs font-black"
                      }`}
                    >
                      <i className={`fa-solid ${isPaid ? "fa-rotate-left" : "fa-check"}`}></i>
                      <span>{isPaid ? "Đổi sang Chưa đóng" : "Xác nhận Thu Tiền"}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(t)}
                        className="p-2 text-slate-600 hover:text-orange-600 bg-slate-100 hover:bg-orange-50 rounded-xl transition cursor-pointer border border-slate-200"
                        title="Chỉnh sửa cước & thông tin"
                      >
                        <i className="fa-regular fa-pen-to-square"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteTenant(t.id, t.name)}
                        className="p-2 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition cursor-pointer border border-rose-200"
                        title="Xóa Trưởng Nhóm"
                      >
                        <i className="fa-regular fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View (hidden lg:block) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Trưởng Nhóm / Đối Tác</th>
                <th>Link Tra Cứu (Slug)</th>
                <th>Tiền Thuê & Ngày Đóng</th>
                <th style={{ textAlign: "center" }}>Trạng Thái Cước Tháng</th>
                <th style={{ textAlign: "center" }}>Tỷ Lệ Chia</th>
                <th style={{ textAlign: "center" }}>Xác Nhận Tiền</th>
                <th style={{ textAlign: "center" }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400 text-xs font-medium">
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <i className="fa-solid fa-spinner fa-spin text-orange-500"></i> Đang tải dữ liệu...
                      </span>
                    ) : (
                      "Không tìm thấy Trưởng Nhóm nào khớp điều kiện lọc."
                    )}
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => {
                  const isPaid = (t.subscriptionStatus || "PAID").toUpperCase() === "PAID";
                  const cycleDay = t.billingCycleDay || 15;
                  const fee = t.monthlyFee || 500000;

                  return (
                    <tr key={t.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
                            style={{ backgroundColor: t.primaryColor || "#f97316" }}
                          >
                            {t.name ? t.name.charAt(0).toUpperCase() : "T"}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-xs">{t.name}</div>
                            <div className="text-[11px] text-slate-400">ID: #{t.id}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="font-mono font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200 text-xs">
                          /{t.slug}
                        </span>
                      </td>

                      <td>
                        <div className="font-mono font-black text-slate-900 text-xs">
                          {formatMoney(fee)} <span className="text-[10px] text-slate-400 font-normal">/tháng</span>
                        </div>
                        <div className="text-[11px] text-orange-600 font-bold flex items-center gap-1 mt-0.5">
                          <i className="fa-regular fa-calendar-check text-[10px]"></i>
                          <span>Ngày {cycleDay} hàng tháng</span>
                        </div>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1 ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
                          }`}
                        >
                          <i className={`fa-solid ${isPaid ? "fa-circle-check" : "fa-circle-exclamation"}`}></i>
                          <span>{isPaid ? "Đã đóng tiền" : "Chưa đóng tiền"}</span>
                        </span>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <div className="font-extrabold text-emerald-600 text-xs">
                          Khách: {t.customerSplitRate || 80}%
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Thuế: {t.taxRate || 10}%
                        </div>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <button
                          onClick={() => handleTogglePayment(t)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer border ${
                            isPaid
                              ? "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                              : "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 shadow-xs font-black"
                          }`}
                          title={isPaid ? "Nhấn để chuyển sang Chưa đóng" : "Nhấn để xác nhận ĐÃ THU TIỀN THÁNG NÀY"}
                        >
                          {isPaid ? (
                            <span>Đổi trạng thái</span>
                          ) : (
                            <span>✓ Thu Tiền</span>
                          )}
                        </button>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition cursor-pointer"
                            title="Chỉnh sửa cước & thông tin"
                          >
                            <i className="fa-regular fa-pen-to-square"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteTenant(t.id, t.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Xóa Trưởng Nhóm"
                          >
                            <i className="fa-regular fa-trash-can"></i>
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

      {/* ===================== MODAL THÊM / SỬA TRƯỞNG NHÓM ===================== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-[fadeIn_0.15s_ease-out]">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 md:p-8 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-black text-slate-900 text-lg font-display flex items-center gap-2">
                <i className="fa-solid fa-sliders text-orange-500"></i>
                <span>{editingTenant ? `Cấu Hình Trưởng Nhóm: ${editingTenant.name}` : "Khởi Tạo Trưởng Nhóm Mới"}</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveTenant} className="space-y-4">
              {/* Block 1: Thông tin cơ bản */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Đường Dẫn Nhóm (Slug) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800">
                    <span className="text-slate-400 mr-1">/</span>
                    <input
                      type="text"
                      required
                      placeholder="ví dụ: nhuy, mailan..."
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().trim() })}
                      className="bg-transparent border-0 outline-none w-full font-mono text-orange-600 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên Trưởng Nhóm / Đối Tác <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Như Ý Hoàn Tiền, Mai Lan..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Block 2: Quản lý Tiền Thuê & Hạn Cước (QUAN TRỌNG) */}
              <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-orange-800 uppercase tracking-wider">
                  <i className="fa-solid fa-receipt text-orange-500"></i>
                  <span>Cấu Hình Tiền Thuê Web & Ngày Đóng Cước Hàng Tháng</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tiền thuê mỗi tháng (VNĐ)
                    </label>
                    <input
                      type="number"
                      step="10000"
                      value={formData.monthlyFee}
                      onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-orange-600 outline-none focus:border-orange-500"
                      placeholder="500000"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Ngày đóng cước (1-31)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.billingCycleDay}
                      onChange={(e) => setFormData({ ...formData, billingCycleDay: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-orange-500"
                      placeholder="15"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tình trạng tháng này
                    </label>
                    <select
                      value={formData.subscriptionStatus}
                      onChange={(e) => setFormData({ ...formData, subscriptionStatus: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-orange-500 cursor-pointer"
                    >
                      <option value="PAID">🟢 Đã đóng tiền tháng này</option>
                      <option value="UNPAID">🔴 Chưa đóng / Nợ cước</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Ghi chú hợp đồng / thanh toán
                  </label>
                  <input
                    type="text"
                    value={formData.billingNote}
                    onChange={(e) => setFormData({ ...formData, billingNote: e.target.value })}
                    placeholder="VD: Trưởng nhóm đóng trước 3 tháng, chuyển khoản Vietcombank..."
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Block 3: Tỷ lệ chia & Subid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Thuế Nhóm (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tỷ Lệ Khách Nhận (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.customerSplitRate}
                    onChange={(e) => setFormData({ ...formData, customerSplitRate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-600 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SubID Prefix</label>
                  <input
                    type="text"
                    placeholder="VD: ny_, ml_..."
                    value={formData.subidPrefix}
                    onChange={(e) => setFormData({ ...formData, subidPrefix: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Block 4: Shopee & TikTok */}
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
