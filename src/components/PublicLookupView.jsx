import React, { useState, useEffect } from "react";
import { formatMoney, formatDate } from "../utils/formatters";
import { BANKS } from "../constants/banks";

export function PublicLookupView({
  apiRoot,
  currentTenant,
  availableTenants,
  onSelectTenant,
  initialQuery,
  user,
  token
}) {
  const [queryInput, setQueryInput] = useState(initialQuery || "");
  const [lookupData, setLookupData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [localSearch, setLocalSearch] = useState("");

  // Bank Info form state
  const [selectedBank, setSelectedBank] = useState(BANKS[0]);
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [customBankName, setCustomBankName] = useState("");
  const [isUpdatingBank, setIsUpdatingBank] = useState(false);
  const [bankError, setBankError] = useState("");
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);

  // Withdraw form state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");

  // Auto trigger lookup if initialQuery is passed
  useEffect(() => {
    if (initialQuery) {
      setQueryInput(initialQuery);
      handleLookup(initialQuery);
    }
  }, [initialQuery, currentTenant]);

  const handleLookup = async (overrideQuery = null) => {
    const q = (overrideQuery !== null ? overrideQuery : queryInput).trim();
    if (!q) {
      setErrorMessage("Vui lòng nhập Mã đơn hàng hoặc Zalo ID để tra cứu!");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setLookupData(null);
    setIsEditingBank(false);

    try {
      const slug = currentTenant?.slug || "mailan";
      const res = await fetch(`${apiRoot}/api/saas/public/${slug}/lookup?query=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (res.ok) {
        setLookupData(data);
        if (data.bankName) {
          setBankName(data.bankName);
          const found = BANKS.find(
            (b) => b.name.toLowerCase() === data.bankName.toLowerCase() || b.code === data.bankCode
          );
          if (found) {
            setSelectedBank(found);
          } else {
            const other = BANKS.find((b) => b.code === "OTHER");
            if (other) setSelectedBank(other);
            setCustomBankName(data.bankName);
          }
        }
        if (data.accountNumber) setAccountNumber(data.accountNumber);
        if (data.accountName) setAccountName(data.accountName);
      } else {
        setErrorMessage(data.message || "Không tìm thấy dữ liệu tra cứu!");
      }
    } catch (err) {
      setErrorMessage("Lỗi kết nối máy chủ: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBank = async (e) => {
    e.preventDefault();
    const finalBank = selectedBank.code === "OTHER" ? customBankName.trim() : selectedBank.name;
    if (!finalBank || !accountNumber.trim() || !accountName.trim()) {
      setBankError("Vui lòng điền đầy đủ Tên ngân hàng, Số tài khoản và Tên chủ thẻ!");
      return;
    }

    setIsUpdatingBank(true);
    setBankError("");
    try {
      const slug = currentTenant?.slug || "mailan";
      const res = await fetch(`${apiRoot}/api/saas/public/${slug}/update-bank`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryInput.trim() || lookupData?.zaloId,
          bankName: finalBank,
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim().toUpperCase(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("✅ " + (data.message || "Đã lưu thông tin tài khoản ngân hàng thành công!"));
        setIsEditingBank(false);
        setBankName(finalBank);
        handleLookup();
      } else {
        setBankError(data.message || "Cập nhật ngân hàng thất bại");
      }
    } catch (err) {
      setBankError("Lỗi kết nối máy chủ: " + err.message);
    } finally {
      setIsUpdatingBank(false);
    }
  };

  const handleWithdrawSubmit = async (e) => {
    e.preventDefault();
    const minWithdraw = Number(lookupData?.tenant?.minWithdrawAmount || currentTenant?.minWithdrawAmount || 10000);
    const amount = Number(withdrawAmount);
    if (!amount || amount < minWithdraw) {
      setWithdrawError(`Số tiền rút tối thiểu là ${formatMoney(minWithdraw)}!`);
      return;
    }
    if (amount > availableBalance) {
      setWithdrawError("Số tiền rút vượt quá số dư khả dụng!");
      return;
    }

    setIsSubmittingWithdraw(true);
    setWithdrawError("");
    try {
      const slug = currentTenant?.slug || "mailan";
      const res = await fetch(`${apiRoot}/api/saas/public/${slug}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryInput.trim() || lookupData?.zaloId,
          amount,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("🎉 " + (data.message || "Yêu cầu rút tiền thành công! Vui lòng chờ Admin duyệt."));
        setWithdrawAmount("");
        handleLookup();
      } else {
        setWithdrawError(data.message || "Rút tiền thất bại");
      }
    } catch (err) {
      setWithdrawError("Lỗi kết nối máy chủ: " + err.message);
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  // Tính toán số liệu thống kê (Động theo cấu hình holdingDays của Trưởng nhóm)
  const orders = lookupData?.orders || [];
  const payouts = lookupData?.payouts || [];
  const holdingDays = Number(lookupData?.holdingDays ?? lookupData?.tenant?.holdingDays ?? currentTenant?.holdingDays ?? 0);
  const minWithdrawAmount = Number(lookupData?.tenant?.minWithdrawAmount ?? currentTenant?.minWithdrawAmount ?? 10000);

  const pendingOrders = orders.filter((o) => {
    const st = (o.status || "").toLowerCase();
    return st.includes("chờ") || st.includes("pending") || st.includes("vận chuyển") || st.includes("xử lý");
  });

  const completedOrders = orders.filter((o) => {
    const st = (o.status || "").toLowerCase();
    return st.includes("hoàn thành") || st.includes("completed") || st.includes("thành công") || st.includes("duyệt") || st.includes("thanh toán");
  });

  const pendingCommission = pendingOrders.reduce((sum, o) => sum + Number(o.finalCommission || 0), 0);
  const completedCommission = completedOrders.reduce((sum, o) => sum + Number(o.finalCommission || 0), 0);

  // Phân loại đơn hoàn thành: Đã qua số ngày giữ (eligible) vs Đang trong thời gian giữ (holding)
  const now = new Date();
  const thresholdTime = new Date(now.getTime() - holdingDays * 24 * 60 * 60 * 1000);

  let eligibleCompletedCommission = 0;
  let holdingCompletedCommission = 0;

  completedOrders.forEach((o) => {
    const finalComm = Number(o.finalCommission || 0);
    if (holdingDays <= 0) {
      eligibleCompletedCommission += finalComm;
    } else {
      const dateStr = o.orderDate || o.createdAt;
      const oDate = dateStr ? new Date(dateStr) : null;
      if (oDate && oDate <= thresholdTime) {
        eligibleCompletedCommission += finalComm;
      } else {
        holdingCompletedCommission += finalComm;
      }
    }
  });

  const completedPayouts = payouts.filter((p) => (p.status || "").toUpperCase() === "COMPLETED");
  const pendingPayoutsList = payouts.filter((p) => (p.status || "").toUpperCase() === "PENDING");

  const totalWithdrawn = completedPayouts.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const pendingPayoutAmount = pendingPayoutsList.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // Số dư khả dụng = Tổng hoa hồng đủ điều kiện rút - Đã rút - Đang chờ duyệt
  const availableBalance = lookupData?.availableBalance !== undefined
    ? Number(lookupData.availableBalance)
    : Math.max(0, eligibleCompletedCommission - totalWithdrawn - pendingPayoutAmount);

  // Lọc danh sách đơn hàng
  const filteredOrders = orders.filter((o) => {
    if (platformFilter !== "ALL") {
      const plat = (o.platform || "SHOPEE").toUpperCase();
      if (plat !== platformFilter) return false;
    }
    if (statusFilter !== "ALL") {
      const st = (o.status || "").toLowerCase();
      if (statusFilter === "COMPLETED" && !st.includes("hoàn thành")) return false;
      if (statusFilter === "PENDING" && !st.includes("chờ") && !st.includes("vận chuyển")) return false;
    }
    if (localSearch.trim()) {
      const q = localSearch.toLowerCase();
      const name = (o.productName || "").toLowerCase();
      const code = (o.orderId || "").toLowerCase();
      if (!name.includes(q) && !code.includes(q)) return false;
    }
    return true;
  });

  const targetName = lookupData?.zaloName || lookupData?.name || "";
  const targetZaloId = lookupData?.zaloId || "";
  const customerSplitRate = currentTenant?.customerSplitRate || 80;
  const adminSplitRate = 100 - (currentTenant?.taxRate || 10) - customerSplitRate;

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Header Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-outfit tracking-tight">
            Tra cứu Đơn hàng & Ví tiền
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Danh sách đơn hàng đối soát từ Zalo Bot {currentTenant?.name ? `(${currentTenant.name})` : ""}
          </p>
        </div>
      </div>

      {/* 1. Card Tra cứu */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-lg font-bold shadow-xs">
              <i className="fa-solid fa-magnifying-glass"></i>
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base font-outfit">
                Tra Cứu Theo Mã Đơn Hàng
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Nhập mã đơn hàng hoặc Zalo ID của bạn để tra cứu thông tin đối soát từ Zalo Bot
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-bold border border-orange-200">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            Tự động 24/7
          </span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLookup();
          }}
          className="flex flex-col sm:flex-row gap-2.5 pt-1"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Nhập mã đơn hàng (Ví dụ: 240913SP88902) hoặc Zalo ID..."
              className="w-full pl-4 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-hidden transition shadow-2xs"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-bold rounded-2xl shadow-md shadow-orange-500/20 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <i className="fa-solid fa-circle-notch fa-spin"></i>
            ) : (
              <>
                <i className="fa-solid fa-magnifying-glass text-xs"></i>
                <span>Tra cứu ngay</span>
              </>
            )}
          </button>
        </form>

        {lookupData && (
          <div className="flex items-center gap-2 pt-2 text-xs text-slate-600 font-bold border-t border-slate-100">
            <i className="fa-solid fa-circle-check text-emerald-600"></i>
            <span>Đang hiển thị kết quả cho:</span>
            <span className="bg-orange-50 px-2.5 py-0.5 rounded-lg border border-orange-200 text-orange-800 font-mono">
              {targetName ? `${targetName} (${targetZaloId})` : (targetZaloId || queryInput)}
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {!lookupData ? (
        <div className="bg-white rounded-3xl p-10 shadow-xs border border-slate-200 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto text-2xl font-bold shadow-xs">
            <i className="fa-solid fa-magnifying-glass"></i>
          </div>
          <h3 className="font-extrabold text-slate-800 text-lg font-outfit">
            Tra cứu Đơn hàng & Ví tiền
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-semibold">
            Vui lòng nhập <strong>Mã đơn hàng</strong> hoặc <strong>Zalo ID</strong> vào ô tìm kiếm ở trên, hoặc sử dụng lệnh <strong>/tracuu</strong> từ Zalo Bot để hiển thị trạng thái ví và hoa hồng nhé!
          </p>
        </div>
      ) : (
        <>
          {/* 2. KHU THỐNG KÊ 4 THẺ GRID RESPONSIVE */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Thẻ 1: Chờ xử lý */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col justify-between transition hover:shadow-md">
              <div>
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-bold mb-3">
                  <i className="fa-solid fa-clock-rotate-left"></i>
                </div>
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-wide text-slate-500">
                  ĐANG CHỜ XỬ LÝ
                </p>
                <p className="text-[9px] text-slate-400 font-semibold mb-2">
                  (Đang vận chuyển / chưa xác nhận)
                </p>
              </div>
              <div className="text-lg sm:text-2xl font-black text-amber-600 font-outfit truncate">
                {formatMoney(pendingCommission)}
              </div>
            </div>

            {/* Thẻ 2: Đã hoàn thành */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col justify-between transition hover:shadow-md">
              <div>
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold mb-3">
                  <i className="fa-solid fa-circle-check"></i>
                </div>
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-wide text-slate-500">
                  ĐÃ HOÀN THÀNH
                </p>
                <p className="text-[9px] text-slate-400 font-semibold mb-2">
                  (Tổng hoa hồng thực nhận)
                </p>
              </div>
              <div className="text-lg sm:text-2xl font-black text-emerald-600 font-outfit truncate">
                {formatMoney(completedCommission)}
              </div>
            </div>

            {/* Thẻ 3: SỐ DƯ KHẢ DỤNG (Động theo số ngày giữ) */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col justify-between transition hover:shadow-md">
              <div>
                <div className="w-9 h-9 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold mb-3">
                  <i className="fa-solid fa-wallet"></i>
                </div>
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-wide text-slate-500">
                  SỐ DƯ KHẢ DỤNG
                </p>
                <p className="text-[9px] text-slate-400 font-semibold mb-2">
                  {holdingDays === 0
                    ? `(Rút ngay • Chia ${customerSplitRate}-${Math.max(0, adminSplitRate)})`
                    : `(Sau ${holdingDays} ngày hoàn thành • Chia ${customerSplitRate}-${Math.max(0, adminSplitRate)})`}
                </p>
              </div>
              <div>
                <div className="text-lg sm:text-2xl font-black text-orange-600 font-outfit truncate">
                  {formatMoney(availableBalance)}
                </div>
                {holdingCompletedCommission > 0 && holdingDays > 0 && (
                  <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-bold">
                    <i className="fa-solid fa-hourglass-half text-[8px] animate-pulse"></i>
                    <span>Giữ {formatMoney(holdingCompletedCommission)} ({holdingDays} ngày)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Thẻ 4: Đã nhận */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col justify-between transition hover:shadow-md">
              <div>
                <div className="w-9 h-9 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center text-sm font-bold mb-3">
                  <i className="fa-solid fa-money-bill-transfer"></i>
                </div>
                <p className="text-[10px] sm:text-xs font-black uppercase tracking-wide text-slate-500">
                  ĐÃ NHẬN (ĐÃ THANH TOÁN)
                </p>
                <p className="text-[9px] text-slate-400 font-semibold mb-2">
                  (Tổng tiền đã rút về bank)
                </p>
              </div>
              <div className="text-lg sm:text-2xl font-black text-violet-600 font-outfit truncate">
                {formatMoney(totalWithdrawn)}
              </div>
            </div>
          </div>

          {/* 3. KHU THÔNG TIN NGÂN HÀNG & RÚT TIỀN */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-base font-black text-slate-900 font-outfit">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-center text-xs shadow-md shadow-orange-200">
                  <i className="fa-solid fa-building-columns"></i>
                </div>
                <span>
                  Thông tin Ngân Hàng & Rút Tiền Hoa Hồng Khả Dụng
                  {targetName ? (
                    <span className="text-orange-600 font-extrabold ml-1">
                      của {targetName}
                    </span>
                  ) : null}
                </span>
              </div>
            </div>

            {/* Thẻ Ngân hàng ngắn gọn hoặc Form chỉnh sửa */}
            {!isEditingBank ? (
              <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between gap-3 flex-wrap shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-base font-bold shadow-2xs">
                    <i className="fa-solid fa-building-columns"></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">
                        {bankName || "Chưa lưu ngân hàng"}
                      </span>
                      {accountName && (
                        <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 text-[10px] font-black uppercase tracking-wide">
                          {accountName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-mono font-bold mt-0.5">
                      STK: {accountNumber || "Chưa có số tài khoản"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingBank(true)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-orange-600 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <i className="fa-solid fa-pen-to-square text-[11px]"></i> Sửa thông tin
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpdateBank} className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                    Cập nhật tài khoản Ngân Hàng nhận tiền
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsEditingBank(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    Hủy
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Ngân hàng
                    </label>
                    <select
                      value={selectedBank.code}
                      onChange={(e) => {
                        const found = BANKS.find((b) => b.code === e.target.value);
                        if (found) setSelectedBank(found);
                      }}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-orange-500 outline-hidden"
                    >
                      {BANKS.map((b) => (
                        <option key={b.code} value={b.code}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Số tài khoản (STK)
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="VD: 1903..."
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-orange-500 outline-hidden font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Tên chủ tài khoản
                    </label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value.toUpperCase())}
                      placeholder="NGUYEN VAN A"
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-orange-500 outline-hidden uppercase"
                    />
                  </div>
                </div>

                {bankError && (
                  <p className="text-xs font-bold text-rose-600">{bankError}</p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingBank(false)}
                    className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingBank}
                    className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    {isUpdatingBank ? "Đang lưu..." : "Lưu ngân hàng"}
                  </button>
                </div>
              </form>
            )}

            {/* Rút tiền box */}
            {availableBalance <= 0 ? (
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-center text-xs font-bold text-amber-800 flex flex-col sm:flex-row items-center justify-center gap-2">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-lock text-amber-600"></i>
                  <span>Số dư khả dụng hiện là 0đ.</span>
                </div>
                {holdingCompletedCommission > 0 && holdingDays > 0 ? (
                  <span className="text-amber-700 font-normal">
                    (Bạn có <strong>{formatMoney(holdingCompletedCommission)}</strong> hoa hồng đang trong thời gian giữ {holdingDays} ngày sau khi hoàn thành đơn).
                  </span>
                ) : (
                  <span className="text-amber-700 font-normal">Chưa đủ điều kiện rút tiền lúc này.</span>
                )}
              </div>
            ) : (
              <form onSubmit={handleWithdrawSubmit} className="bg-orange-50/60 rounded-2xl p-4 border border-orange-200 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <label className="block text-xs font-extrabold text-orange-900">
                    Nhập số tiền muốn rút (Khả dụng: <span className="text-orange-600 font-black">{formatMoney(availableBalance)}</span>):
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(availableBalance.toString())}
                      className="px-2.5 py-1 bg-white hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-[10px] font-black cursor-pointer shadow-2xs transition"
                    >
                      ⚡ Rút tất cả
                    </button>
                    {availableBalance >= 50000 && (
                      <button
                        type="button"
                        onClick={() => setWithdrawAmount("50000")}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer transition"
                      >
                        50.000đ
                      </button>
                    )}
                    {availableBalance >= 100000 && (
                      <button
                        type="button"
                        onClick={() => setWithdrawAmount("100000")}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer transition"
                      >
                        100.000đ
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder={`Tối thiểu ${formatMoney(minWithdrawAmount)}...`}
                      className="w-full px-3.5 py-2.5 bg-white border border-orange-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden focus:border-orange-500 shadow-2xs"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmittingWithdraw}
                    className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-extrabold rounded-xl shadow-xs cursor-pointer whitespace-nowrap active:scale-[0.98] transition flex items-center justify-center gap-2"
                  >
                    {isSubmittingWithdraw ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                        <span>Đang xử lý...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-money-bill-transfer text-xs"></i>
                        <span>💸 Rút tiền ngay</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
            {withdrawError && (
              <p className="text-xs font-bold text-rose-600 text-center">{withdrawError}</p>
            )}
          </div>

          {/* 4. KHU DANH SÁCH TẤT CẢ ĐƠN HÀNG */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold">
                  <i className="fa-solid fa-box"></i>
                </div>
                <h3 className="font-extrabold text-slate-900 text-base font-outfit">
                  Tất Cả Đơn Hàng Đã Đặt ({orders.length} đơn)
                </h3>
              </div>

              {/* Bộ lọc Platform & Search */}
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  placeholder="Lọc mã đơn / tên SP..."
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-hidden focus:border-orange-500"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-hidden focus:border-orange-500"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="COMPLETED">Đã hoàn thành</option>
                  <option value="PENDING">Đang chờ xử lý</option>
                </select>
                <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    onClick={() => setPlatformFilter("ALL")}
                    className={`px-3 py-1 rounded-lg transition ${
                      platformFilter === "ALL" ? "bg-orange-500 text-white shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    onClick={() => setPlatformFilter("SHOPEE")}
                    className={`px-3 py-1 rounded-lg transition ${
                      platformFilter === "SHOPEE" ? "bg-orange-500 text-white shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Shopee
                  </button>
                  <button
                    onClick={() => setPlatformFilter("TIKTOK")}
                    className={`px-3 py-1 rounded-lg transition ${
                      platformFilter === "TIKTOK" ? "bg-orange-500 text-white shadow-xs" : "text-slate-600"
                    }`}
                  >
                    TikTok
                  </button>
                </div>
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-xs font-bold text-slate-400">
                Không tìm thấy đơn hàng nào phù hợp với bộ lọc!
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order, idx) => {
                  const isDone = (order.status || "").toLowerCase().includes("hoàn thành");
                  const isTiktok = (order.platform || "").toUpperCase() === "TIKTOK";
                  return (
                    <div
                      key={order.id || idx}
                      className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-md transition space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                            isTiktok ? "bg-cyan-100 text-cyan-800" : "bg-orange-100 text-orange-600"
                          }`}>
                            <i className="fa-solid fa-bag-shopping"></i>
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-800 text-xs sm:text-sm font-mono">
                              {order.orderId}
                            </span>
                            <span className="ml-1.5 text-[10px] font-bold text-slate-400 uppercase">
                              ({order.platform || "SHOPEE"})
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                            isDone
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {order.status || "Chờ xử lý"}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm font-bold text-slate-800 leading-snug line-clamp-2">
                        {order.productName || "Sản phẩm Shopee / TikTok"}
                      </p>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs flex-wrap gap-2">
                        <div className="flex items-center gap-3 text-slate-500 font-medium text-[11px]">
                          {order.orderDate && (
                            <span>
                              📅 Ngày đặt: <strong className="text-slate-700">{formatDate(order.orderDate)}</strong>
                            </span>
                          )}
                          {order.completedAt && (
                            <span>
                              📅 Ngày hoàn thành: <strong className="text-slate-700">{formatDate(order.completedAt)}</strong>
                            </span>
                          )}
                        </div>
                        <div className="text-right ml-auto">
                          <span className="text-[11px] font-semibold text-slate-500 mr-1">Hoa hồng:</span>
                          <span className="text-sm sm:text-base font-black text-orange-600 font-outfit">
                            {formatMoney(order.finalCommission || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
