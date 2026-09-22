import React, { useState, useEffect, useRef } from "react";
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
  const [queryInput, setQueryInput] = useState("");
  const [lookupData, setLookupData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [localSearch, setLocalSearch] = useState("");

  // Toast Notification state
  const [toast, setToast] = useState(null);
  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Bank Info form state
  const [selectedBank, setSelectedBank] = useState(BANKS[0]);
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [customBankName, setCustomBankName] = useState("");
  const [isUpdatingBank, setIsUpdatingBank] = useState(false);
  const [bankError, setBankError] = useState("");

  // Withdraw form state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");

  // PIN & Security Modal State
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState("ENTER_PIN"); // 'ENTER_PIN' | 'CREATE_PIN' | 'RESET_PIN'
  const [pendingAction, setPendingAction] = useState(null); // 'BANK' | 'PAYOUT'
  const [inputPin, setInputPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [securityOtp, setSecurityOtp] = useState("");
  const [createStep, setCreateStep] = useState(1); // 1: Input PIN, 2: Input OTP
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [showEnterPin, setShowEnterPin] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  const pinInputRef = useRef(null);

  // OTP Countdown timer
  useEffect(() => {
    let timer;
    if (otpCountdown > 0) {
      timer = setInterval(() => setOtpCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // Focus PIN input when modal opens
  useEffect(() => {
    if (pinModalOpen) {
      setPinError("");
      setTimeout(() => {
        if (pinInputRef.current) pinInputRef.current.focus();
      }, 100);
    }
  }, [pinModalOpen, pinModalMode, createStep]);

  // Auto trigger lookup if initialQuery is passed from URL, BUT leave queryInput empty
  useEffect(() => {
    if (initialQuery) {
      handleLookup(initialQuery);
      setQueryInput("");
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

  const targetName = lookupData?.zaloName || lookupData?.user?.name || lookupData?.name || "";
  const targetZaloId = lookupData?.zaloId || lookupData?.user?.zaloId || "";

  // Request Zalo OTP
  const requestZaloOtp = async () => {
    const slug = currentTenant?.slug || "mailan";
    const cleanTargetId = targetZaloId || queryInput.trim() || lookupData?.query || "";
    if (!cleanTargetId) {
      setPinError("Không xác định được Zalo ID nhận mã OTP!");
      return false;
    }
    if (otpCountdown > 0) {
      setPinError(`Vui lòng đợi ${otpCountdown}s trước khi yêu cầu gửi lại mã OTP!`);
      return false;
    }
    setOtpSending(true);
    setPinError("");
    try {
      const res = await fetch(`${apiRoot}/api/saas/public/${slug}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zaloId: cleanTargetId,
          zaloName: targetName || "bạn",
          action: "Thiết Lập / Đặt Lại Mã PIN Rút Tiền",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpCountdown(60);
        notify("🔒 Đã gửi mã xác thực OTP 6 số về tin nhắn riêng Zalo của bạn!", "success");
        return true;
      } else {
        setPinError(data.message || "Không thể gửi mã OTP");
        notify(data.message || "Không thể gửi mã OTP", "error");
        return false;
      }
    } catch (err) {
      setPinError("Lỗi kết nối máy chủ khi gửi mã OTP: " + err.message);
      notify("Lỗi kết nối máy chủ khi gửi mã OTP", "error");
      return false;
    } finally {
      setOtpSending(false);
    }
  };

  const initiateAction = (action) => {
    if (action === "BANK") {
      const finalBank = selectedBank.code === "OTHER" ? customBankName.trim() : selectedBank.name;
      if (!finalBank || !accountNumber.trim() || !accountName.trim()) {
        setBankError("Vui lòng điền đầy đủ Tên ngân hàng, Số tài khoản và Tên chủ thẻ!");
        return;
      }
    } else if (action === "PAYOUT") {
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
      if (!accountNumber.trim() || !accountName.trim()) {
        setWithdrawError("Vui lòng thiết lập thông tin ngân hàng trước khi rút tiền!");
        return;
      }
    }

    setPendingAction(action);
    setInputPin("");
    setPinError("");

    if (!lookupData?.hasPin) {
      setPinModalMode("CREATE_PIN");
      setCreateStep(1);
      setNewPin("");
      setConfirmPin("");
      setSecurityOtp("");
      setPinModalOpen(true);
    } else {
      setPinModalMode("ENTER_PIN");
      setPinModalOpen(true);
    }
  };

  const executePendingActionWithPin = async (pinToUse) => {
    const slug = currentTenant?.slug || "mailan";
    const finalBank = selectedBank.code === "OTHER" ? customBankName.trim() : selectedBank.name;

    if (pendingAction === "BANK") {
      setIsUpdatingBank(true);
      setPinLoading(true);
      try {
        const res = await fetch(`${apiRoot}/api/saas/public/${slug}/update-bank`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: queryInput.trim() || lookupData?.zaloId || lookupData?.query,
            bankName: finalBank,
            accountNumber: accountNumber.trim(),
            accountName: accountName.trim().toUpperCase(),
            pin: pinToUse,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          notify("✅ " + (data.message || "Đã lưu thông tin tài khoản ngân hàng thành công!"), "success");
          setIsEditingBank(false);
          setBankName(finalBank);
          setPinModalOpen(false);
          handleLookup();
        } else {
          setPinError(data.message || "Cập nhật ngân hàng thất bại");
        }
      } catch (err) {
        setPinError("Lỗi kết nối máy chủ: " + err.message);
      } finally {
        setIsUpdatingBank(false);
        setPinLoading(false);
      }
    } else if (pendingAction === "PAYOUT") {
      setIsSubmittingWithdraw(true);
      setPinLoading(true);
      try {
        const res = await fetch(`${apiRoot}/api/saas/public/${slug}/create-payout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: queryInput.trim() || lookupData?.zaloId || lookupData?.query,
            bankName: finalBank,
            accountNumber: accountNumber.trim(),
            accountName: accountName.trim().toUpperCase(),
            amount: Number(withdrawAmount),
            pin: pinToUse,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          notify("🎉 " + (data.message || "Yêu cầu rút tiền thành công! Vui lòng chờ Admin duyệt."), "success");
          setWithdrawAmount("");
          setPinModalOpen(false);
          handleLookup();
        } else {
          setPinError(data.message || "Tạo yêu cầu rút tiền thất bại");
        }
      } catch (err) {
        setPinError("Lỗi kết nối máy chủ: " + err.message);
      } finally {
        setIsSubmittingWithdraw(false);
        setPinLoading(false);
      }
    }
  };

  const handleConfirmEnterPin = async () => {
    if (inputPin.length !== 6) {
      setPinError("Vui lòng nhập đủ 6 chữ số mã PIN");
      return;
    }
    await executePendingActionWithPin(inputPin);
  };

  const handleCreatePinStep1 = async () => {
    if (!/^\d{6}$/.test(newPin)) {
      setPinError("Mã PIN phải gồm đúng 6 chữ số");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("Mã PIN nhập lại không khớp. Vui lòng kiểm tra lại!");
      return;
    }
    setPinError("");
    const sent = await requestZaloOtp();
    if (sent) {
      setCreateStep(2);
    }
  };

  const handleCreatePinComplete = async () => {
    if (securityOtp.length !== 6) {
      setPinError("Vui lòng nhập đủ 6 số mã OTP từ Zalo");
      return;
    }
    const slug = currentTenant?.slug || "mailan";
    setPinLoading(true);
    setPinError("");
    try {
      const res = await fetch(`${apiRoot}/api/saas/public/${slug}/pin/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zaloId: targetZaloId || queryInput.trim() || lookupData?.query,
          pin: newPin,
          otp: securityOtp,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Lỗi khi kích hoạt mã PIN");

      notify("🎉 Đã tạo mã PIN rút tiền 6 số thành công!", "success");
      if (lookupData) lookupData.hasPin = true;

      if (pendingAction) {
        await executePendingActionWithPin(newPin);
      } else {
        setPinModalOpen(false);
      }
    } catch (err) {
      setPinError(err.message);
    } finally {
      setPinLoading(false);
    }
  };

  const handleStartResetPin = async () => {
    setPinModalMode("RESET_PIN");
    setSecurityOtp("");
    setNewPin("");
    setConfirmPin("");
    setPinError("");
    await requestZaloOtp();
  };

  const handleResetPinComplete = async () => {
    if (securityOtp.length !== 6) {
      setPinError("Vui lòng nhập đủ 6 số mã OTP từ Zalo");
      return;
    }
    if (!/^\d{6}$/.test(newPin)) {
      setPinError("Mã PIN mới phải gồm đúng 6 chữ số");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("Mã PIN mới nhập lại không khớp!");
      return;
    }
    const slug = currentTenant?.slug || "mailan";
    setPinLoading(true);
    setPinError("");
    try {
      const res = await fetch(`${apiRoot}/api/saas/public/${slug}/pin/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zaloId: targetZaloId || queryInput.trim() || lookupData?.query,
          newPin: newPin,
          otp: securityOtp,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Lỗi khi đặt lại mã PIN");

      notify("🎉 Đã đặt lại mã PIN 6 số thành công!", "success");
      if (lookupData) lookupData.hasPin = true;
      setPinModalMode("ENTER_PIN");
      setInputPin("");
    } catch (err) {
      setPinError(err.message);
    } finally {
      setPinLoading(false);
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

  const customerSplitRate = currentTenant?.customerSplitRate || 80;
  const adminSplitRate = 100 - (currentTenant?.taxRate || 10) - customerSplitRate;

  return (
    <div className="space-y-5 animate-fade-in pb-12 relative">
      {/* Toast Notification Component */}
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
              {targetName ? `${targetName} (${targetZaloId})` : (targetZaloId || lookupData.query)}
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
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  initiateAction("BANK");
                }}
                className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4"
              >
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

                  {selectedBank.code === "OTHER" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        Tên Ngân hàng khác (Nhập thủ công)
                      </label>
                      <input
                        type="text"
                        value={customBankName}
                        onChange={(e) => setCustomBankName(e.target.value)}
                        placeholder="VD: MBBank, VIB, TPBank..."
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-orange-500 outline-hidden font-mono"
                      />
                    </div>
                  )}

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
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  initiateAction("PAYOUT");
                }}
                className="bg-orange-50/60 rounded-2xl p-4 border border-orange-200 space-y-3"
              >
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
                        className="px-2.5 py-1 bg-white hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-[10px] font-black cursor-pointer shadow-2xs transition"
                      >
                        50k
                      </button>
                    )}
                    {availableBalance >= 100000 && (
                      <button
                        type="button"
                        onClick={() => setWithdrawAmount("100000")}
                        className="px-2.5 py-1 bg-white hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-[10px] font-black cursor-pointer shadow-2xs transition"
                      >
                        100k
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="VD: 50000 (Tối thiểu 10.000đ)"
                    className="flex-1 px-4 py-3 bg-white border border-orange-200 rounded-xl text-sm font-bold text-slate-900 focus:border-orange-500 outline-hidden font-mono shadow-2xs"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingWithdraw}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wide rounded-xl shadow-md shadow-orange-500/20 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isSubmittingWithdraw ? (
                      <i className="fa-solid fa-circle-notch fa-spin"></i>
                    ) : (
                      <>
                        <i className="fa-solid fa-paper-plane text-xs"></i>
                        <span>Tạo yêu cầu rút tiền</span>
                      </>
                    )}
                  </button>
                </div>

                {withdrawError && (
                  <p className="text-xs font-bold text-rose-600">{withdrawError}</p>
                )}
              </form>
            )}
          </div>

          {/* 4. KHU DANH SÁCH ĐƠN HÀNG */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 font-outfit">
                <i className="fa-solid fa-boxes-stacked text-orange-600"></i>
                Tất Cả Đơn Hàng Đã Đặt ({orders.length} đơn)
              </h3>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="Lọc mã đơn / tên SP..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 outline-hidden focus:border-orange-500"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 outline-hidden"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="COMPLETED">Đã hoàn thành</option>
                  <option value="PENDING">Chờ xử lý</option>
                </select>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
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

      {/* MODAL MÃ PIN BẢO MẬT 6 SỐ & XÁC THỰC ZALO OTP */}
      {pinModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 relative">
            {/* Nút Đóng */}
            <button
              type="button"
              onClick={() => { setPinModalOpen(false); setPinError(""); }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer text-xs"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>

            {/* MODE 1: ENTER PIN (Khách đã có PIN -> Nhập 6 số 1 chạm) */}
            {pinModalMode === "ENTER_PIN" && (
              <div className="space-y-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto text-xl font-black shadow-inner">
                  <i className="fa-solid fa-lock"></i>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 font-outfit">
                    Nhập Mã PIN Rút Tiền
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Vui lòng nhập mã PIN 6 số bảo mật của bạn để hoàn tất giao dịch {pendingAction === "BANK" ? "lưu ngân hàng" : "rút tiền"}.
                  </p>
                </div>

                <div className="relative flex items-center">
                  <input
                    ref={pinInputRef}
                    type={showEnterPin ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="• • • • • •"
                    value={inputPin}
                    onChange={(e) => setInputPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-orange-500 rounded-2xl py-3 px-4 text-center font-mono font-black text-xl tracking-[0.4em] text-slate-900 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEnterPin(!showEnterPin)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 p-1 cursor-pointer text-sm"
                  >
                    <i className={showEnterPin ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}></i>
                  </button>
                </div>

                {pinError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600 text-left flex items-center gap-2">
                    <i className="fa-solid fa-triangle-exclamation"></i>
                    <span>{pinError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    disabled={inputPin.length !== 6 || pinLoading}
                    onClick={handleConfirmEnterPin}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs uppercase tracking-wide rounded-2xl shadow-lg shadow-orange-200 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {pinLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <i className="fa-solid fa-check"></i>
                        <span>Xác nhận giao dịch</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleStartResetPin}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 py-1.5 transition cursor-pointer"
                  >
                    Quên mã PIN? Đặt lại mã PIN qua Zalo
                  </button>
                </div>
              </div>
            )}

            {/* MODE 2: CREATE PIN (Khách chưa tạo PIN -> Bước 1: Nhập PIN, Bước 2: Xác nhận OTP) */}
            {pinModalMode === "CREATE_PIN" && (
              <div className="space-y-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center mx-auto text-xl font-black shadow-lg shadow-orange-200">
                  <i className="fa-solid fa-shield-halved"></i>
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900 font-outfit">
                    Thiết Lập Mã PIN Rút Tiền
                  </h3>
                  <div className="flex items-center justify-center gap-2 mt-1.5">
                    <span className={`w-6 h-1.5 rounded-full ${createStep === 1 ? "bg-orange-500" : "bg-orange-200"}`}></span>
                    <span className={`w-6 h-1.5 rounded-full ${createStep === 2 ? "bg-orange-500" : "bg-orange-200"}`}></span>
                  </div>
                </div>

                {createStep === 1 ? (
                  <div className="space-y-3 text-left">
                    <p className="text-xs text-slate-500 font-medium text-center">
                      Để bảo vệ số dư và rút tiền 1 chạm không cần chờ OTP mỗi lần, vui lòng tạo mã PIN 6 số bí mật.
                    </p>

                    <div>
                      <label className="block text-[11px] font-black text-slate-600 uppercase mb-1">
                        Mã PIN Mới (6 số)
                      </label>
                      <div className="relative flex items-center">
                        <input
                          ref={pinInputRef}
                          type={showNewPin ? "text" : "password"}
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="Nhập 6 số PIN..."
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-black text-slate-900 outline-none focus:border-orange-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPin(!showNewPin)}
                          className="absolute right-3 text-slate-400 p-1 text-xs"
                        >
                          <i className={showNewPin ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}></i>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-600 uppercase mb-1">
                        Xác nhận lại mã PIN (6 số)
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={showConfirmPin ? "text" : "password"}
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="Nhập lại 6 số PIN..."
                          value={confirmPin}
                          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-black text-slate-900 outline-none focus:border-orange-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPin(!showConfirmPin)}
                          className="absolute right-3 text-slate-400 p-1 text-xs"
                        >
                          <i className={showConfirmPin ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}></i>
                        </button>
                      </div>
                    </div>

                    {pinError && (
                      <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600">
                        ⚠️ {pinError}
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={newPin.length !== 6 || confirmPin.length !== 6 || otpSending}
                      onClick={handleCreatePinStep1}
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs uppercase rounded-xl transition shadow-md shadow-orange-100 flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-60"
                    >
                      {otpSending ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <span>Tiếp tục (Nhận OTP từ Zalo)</span>
                          <i className="fa-solid fa-arrow-right text-xs"></i>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 text-center">
                    <p className="text-xs text-slate-500 font-medium">
                      Mã xác thực OTP 6 số đã được gửi về tin nhắn riêng Zalo của <strong className="text-orange-600">{targetName || "bạn"}</strong> để kích hoạt mã PIN.
                    </p>

                    <input
                      type="text"
                      maxLength={6}
                      placeholder="• • • • • •"
                      value={securityOtp}
                      onChange={(e) => setSecurityOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-full bg-slate-50 border-2 border-slate-200 focus:border-orange-500 rounded-2xl py-3 px-4 text-center font-mono font-black text-xl tracking-[0.4em] text-slate-900 outline-none transition"
                    />

                    {pinError && (
                      <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600 text-left">
                        ⚠️ {pinError}
                      </div>
                    )}

                    <div className="flex flex-col gap-2 pt-1">
                      <button
                        type="button"
                        disabled={securityOtp.length !== 6 || pinLoading}
                        onClick={handleCreatePinComplete}
                        className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs uppercase rounded-xl transition shadow-md shadow-orange-100 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                      >
                        {pinLoading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <i className="fa-solid fa-check"></i>
                            <span>Kích hoạt PIN & Tiếp tục</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setCreateStep(1)}
                          className="text-xs font-bold text-slate-500 hover:text-slate-800"
                        >
                          ← Sửa lại mã PIN
                        </button>

                        <button
                          type="button"
                          disabled={otpSending || otpCountdown > 0}
                          onClick={requestZaloOtp}
                          className="text-xs font-bold text-orange-600 hover:text-orange-700 disabled:opacity-60"
                        >
                          {otpCountdown > 0 ? `Gửi lại OTP (${otpCountdown}s)` : "Gửi lại OTP qua Zalo"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODE 3: RESET PIN (Khách quên PIN -> Nhập OTP + PIN mới) */}
            {pinModalMode === "RESET_PIN" && (
              <div className="space-y-3 text-left">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-lg font-black">
                    <i className="fa-solid fa-key"></i>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 font-outfit">
                    Đặt Lại Mã PIN Rút Tiền
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Nhập mã OTP vừa gửi về Zalo và thiết lập mã PIN 6 số mới.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-600 uppercase mb-1">
                    Mã OTP từ Zalo (6 số)
                  </label>
                  <input
                    ref={pinInputRef}
                    type="text"
                    maxLength={6}
                    placeholder="Mã OTP 6 số..."
                    value={securityOtp}
                    onChange={(e) => setSecurityOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-black text-slate-900 outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-600 uppercase mb-1">
                    Mã PIN Mới (6 số)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showNewPin ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Nhập 6 số PIN mới..."
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-black text-slate-900 outline-none focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPin(!showNewPin)}
                      className="absolute right-3 text-slate-400 p-1 text-xs"
                    >
                      <i className={showNewPin ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}></i>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-600 uppercase mb-1">
                    Xác nhận lại PIN Mới (6 số)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showConfirmPin ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Nhập lại 6 số PIN mới..."
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-black text-slate-900 outline-none focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPin(!showConfirmPin)}
                      className="absolute right-3 text-slate-400 p-1 text-xs"
                    >
                      <i className={showConfirmPin ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}></i>
                    </button>
                  </div>
                </div>

                {pinError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600">
                    ⚠️ {pinError}
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    disabled={securityOtp.length !== 6 || newPin.length !== 6 || confirmPin.length !== 6 || pinLoading}
                    onClick={handleResetPinComplete}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs uppercase rounded-xl transition shadow-md shadow-orange-100 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {pinLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <i className="fa-solid fa-check"></i>
                        <span>Xác nhận & Đổi PIN mới</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => { setPinModalMode("ENTER_PIN"); setPinError(""); }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800"
                    >
                      ← Quay lại nhập PIN
                    </button>

                    <button
                      type="button"
                      disabled={otpSending || otpCountdown > 0}
                      onClick={requestZaloOtp}
                      className="text-xs font-bold text-orange-600 hover:text-orange-700 disabled:opacity-60"
                    >
                      {otpCountdown > 0 ? `Gửi lại OTP (${otpCountdown}s)` : "Gửi lại OTP qua Zalo"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
