import React, { useEffect, useState, useCallback } from "react";

const removeAccents = (str) =>
  String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

export function MemberDetailModal({
  member,
  orders = [],
  payouts = [],
  onClose,
  onDelete,
  apiRoot = "",
  activeTenant = {},
  formatMoney = (val) => Number(val || 0).toLocaleString("vi-VN") + " đ",
  formatDate = (val) => (val ? new Date(val).toLocaleDateString("vi-VN") : "—"),
  authHeaders = {},
  onOrdersUpdated,
  showNotification,
}) {
  if (!member) return null;

  // Tabs: 'orders' | 'payouts'
  const [activeTab, setActiveTab] = useState("orders");

  // Orders table filters & state
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [localSearch, setLocalSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const pageSize = 10;

  // Manual Payout state
  const [showManualPayoutForm, setShowManualPayoutForm] = useState(false);
  const [manualAmount, setManualAmount] = useState("");
  const [manualBankName, setManualBankName] = useState("");
  const [manualAccountNumber, setManualAccountNumber] = useState("");
  const [manualAccountName, setManualAccountName] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [isCreatingPayout, setIsCreatingPayout] = useState(false);
  const [processingPayoutId, setProcessingPayoutId] = useState(null);

  // Live lookup state (100% đồng bộ với trang Tra Cứu)
  const [liveData, setLiveData] = useState(null);
  const [isLoadingLive, setIsLoadingLive] = useState(true);

  // Member identifiers
  const zaloId = String(member.zaloId || member.zalo_id || "").trim();
  const initialZaloName = member.zaloName || member.zalo_name || "Thành viên Zalo";
  const initialBankName = member.bankName || member.bank_name || "";
  const initialAccountNumber = member.accountNumber || member.account_number || "";
  const initialAccountName = member.accountName || member.account_name || "";

  const tenantSlug = activeTenant?.slug || "system";
  // Tỷ lệ chia, thuế và ngày giữ động: ưu tiên liveData từ DB -> activeTenant từ cấu hình -> mặc định 80/10/0
  const customerSplitRate = Number(
    liveData?.tenant?.customerSplitRate ??
    activeTenant?.customerSplitRate ??
    80
  );
  const taxRate = Number(
    liveData?.tenant?.taxRate !== undefined && liveData?.tenant?.taxRate !== null
      ? liveData.tenant.taxRate
      : (activeTenant?.taxRate !== undefined && activeTenant?.taxRate !== null ? activeTenant.taxRate : 10)
  );
  const holdingDays = Number(
    liveData?.tenant?.holdingDays !== undefined && liveData?.tenant?.holdingDays !== null
      ? liveData.tenant.holdingDays
      : (activeTenant?.holdingDays !== undefined && activeTenant?.holdingDays !== null ? activeTenant.holdingDays : 0)
  );
  const adminSplitRate = Math.max(0, 100 - customerSplitRate);

  // Tải & làm mới dữ liệu ví, đơn hàng và lịch sử rút từ API public lookup
  const refreshLiveData = useCallback(async () => {
    const queryTarget = zaloId || member.zaloName || member.zalo_name || member.name || "";
    if (!queryTarget) {
      setIsLoadingLive(false);
      return;
    }
    try {
      const queryKey = encodeURIComponent(queryTarget.trim());
      const res = await fetch(`${apiRoot}/api/saas/public/${tenantSlug}/lookup?query=${queryKey}`);
      if (res.ok) {
        const data = await res.json();
        if (data) setLiveData(data);
      }
    } catch (err) {
      console.warn("Không thể tải live lookup data:", err);
    } finally {
      setIsLoadingLive(false);
    }
  }, [zaloId, member, apiRoot, tenantSlug]);

  useEffect(() => {
    setIsLoadingLive(true);
    refreshLiveData();
  }, [refreshLiveData]);

  // Fallback Matching if liveData is not loaded
  const mZaloId = zaloId.toLowerCase();
  const mId = member.id ? String(member.id) : null;
  const mSlug = String(tenantSlug || "").toLowerCase();
  const mNormName = removeAccents(member.zaloName || member.zalo_name || member.name || "").replace(/[^a-z0-9]/g, "");
  const mNormAcc = removeAccents(member.accountName || member.account_name || "").replace(/[^a-z0-9]/g, "");

  const fallbackOrders = (Array.isArray(orders) ? orders : []).filter((o) => {
    if (!o) return false;
    const oZaloId = String(o.zaloId || "").trim().toLowerCase();
    const oSubId = String(o.subId || o.sub_id || "").trim().toLowerCase();
    const oUserId = o.userId ? String(o.userId) : null;

    if (mZaloId) {
      if (oZaloId === mZaloId) return true;
      if (oSubId === mZaloId) return true;
      if (mSlug && oSubId === `${mSlug}_${mZaloId}`) return true;
      if (oSubId.includes(mZaloId)) return true;
    }
    if (mId && (oUserId === mId || oSubId === `u${mId}` || (mSlug && oSubId === `${mSlug}_u${mId}`))) {
      return true;
    }

    // So khớp tên không dấu (cho các đơn có subId là name slug như th_CherryMyVy)
    const cleanSub = oSubId.replace(/^(phamnga|ly|tranhuyen|lecuong|mailan|th|yenvy)[_-]/i, "");
    const cleanSubNorm = removeAccents(cleanSub).replace(/[^a-z0-9]/g, "");
    if (cleanSubNorm && cleanSubNorm.length >= 2 && !/^\d+$/.test(cleanSubNorm)) {
      if (mNormName && (cleanSubNorm === mNormName || mNormName === cleanSubNorm)) return true;
      if (mNormAcc && (cleanSubNorm === mNormAcc || mNormAcc === cleanSubNorm)) return true;
    }

    return false;
  });

  const matchedOrderUserIds = new Set();
  const matchedOrderZaloIds = new Set();
  fallbackOrders.forEach((o) => {
    if (o.userId != null) matchedOrderUserIds.add(String(o.userId));
    if (o.zaloId) matchedOrderZaloIds.add(String(o.zaloId).trim().toLowerCase());
    if (o.subId) {
      const cleanSub = String(o.subId).replace(/^(phamnga|ly|tranhuyen|lecuong|mailan|th|yenvy)[_-]/i, "").trim().toLowerCase();
      matchedOrderZaloIds.add(cleanSub);
    }
  });

  const fallbackPayouts = (Array.isArray(payouts) ? payouts : []).filter((p) => {
    if (!p) return false;
    const pZaloId = String(p.zaloId || "").trim().toLowerCase();
    const pUserId = p.userId ? String(p.userId) : null;
    const pNote = String(p.note || "").toLowerCase();
    const pNormZalo = removeAccents(p.zaloId || "").replace(/[^a-z0-9]/g, "");

    if (mZaloId && (pZaloId === mZaloId || pNote.includes(mZaloId))) return true;
    if (mId && pUserId === mId) return true;
    if (pUserId && matchedOrderUserIds.has(pUserId)) return true;
    if (pZaloId && matchedOrderZaloIds.has(pZaloId)) return true;
    if (pNormZalo && matchedOrderZaloIds.has(pNormZalo)) return true;

    if (pNormZalo && pNormZalo.length >= 2) {
      if (mNormName && (pNormZalo === mNormName || mNormName.includes(pNormZalo) || pNormZalo.includes(mNormName))) return true;
      if (mNormAcc && (pNormZalo === mNormAcc || mNormAcc.includes(pNormZalo) || pNormZalo.includes(mNormAcc))) return true;
    }

    if (mNormName && mNormName.length >= 2 && removeAccents(pNote).includes(mNormName)) return true;

    return false;
  });

  const isOrderCancelled = (o) => {
    const st = String(o.status || "").toLowerCase();
    return st.includes("hủy") || st.includes("cancel") || st.includes("refund") || st === "3";
  };

  const isOrderCompleted = (o) => {
    const st = String(o.status || "").toLowerCase();
    return (
      st.includes("thành") ||
      st.includes("completed") ||
      st.includes("settled") ||
      st.includes("chốt") ||
      st.includes("duyệt") ||
      st.includes("thanh toán") ||
      st === "2"
    );
  };

  const calculateUserComm = (o) => {
    if (isOrderCancelled(o)) return 0;
    const raw = Number(o.rawCommission || 0);
    if (raw > 0) {
      const tax = Math.round(raw * (taxRate / 100));
      const afterTax = Math.max(0, raw - tax);
      return Math.round(afterTax * (customerSplitRate / 100));
    }
    return Math.round(Number(o.finalCommission || 0));
  };

  const calculateTax = (o) => {
    if (isOrderCancelled(o)) return 0;
    const raw = Number(o.rawCommission || 0);
    return Math.round(raw * (taxRate / 100));
  };

  const calculateAfterTax = (o) => {
    if (isOrderCancelled(o)) return 0;
    const raw = Number(o.rawCommission || 0);
    const tax = calculateTax(o);
    return Math.max(0, raw - tax);
  };

  const fallbackCompletedOrders = fallbackOrders.filter(isOrderCompleted);
  const fallbackPendingOrders = fallbackOrders.filter((o) => !isOrderCompleted(o) && !isOrderCancelled(o));

  const fallbackPendingCommission = fallbackPendingOrders.reduce((sum, o) => sum + calculateUserComm(o), 0);
  const fallbackCompletedCommission = fallbackCompletedOrders.reduce((sum, o) => sum + calculateUserComm(o), 0);

  const fallbackApprovedPayouts = fallbackPayouts.filter((p) => {
    const st = String(p.status || "").toUpperCase();
    return st === "COMPLETED" || st === "APPROVED";
  });
  const fallbackPendingPayoutsList = fallbackPayouts.filter((p) => {
    const st = String(p.status || "").toUpperCase();
    return st === "PENDING";
  });

  const fallbackTotalWithdrawn = fallbackApprovedPayouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const fallbackPendingWithdrawn = fallbackPendingPayoutsList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const isOrderEligible = (o) => {
    if (holdingDays <= 0) return true;
    const dateStr = o.completeTime || o.completedAt || o.orderDate || o.createdAt;
    if (!dateStr) return true;
    const oDate = new Date(dateStr);
    if (isNaN(oDate.getTime())) return true;
    const now = new Date();
    const thresholdTime = new Date(now.getTime() - holdingDays * 24 * 60 * 60 * 1000);
    if (oDate <= thresholdTime) return true;
    const oDay = new Date(oDate.getFullYear(), oDate.getMonth(), oDate.getDate());
    oDay.setDate(oDay.getDate() + holdingDays);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return oDay <= today;
  };

  const fallbackEligibleCompletedCommission = fallbackCompletedOrders.reduce((sum, o) => {
    return isOrderEligible(o) ? sum + calculateUserComm(o) : sum;
  }, 0);

  const fallbackAvailableBalance = Math.max(
    0,
    fallbackEligibleCompletedCommission - fallbackTotalWithdrawn - fallbackPendingWithdrawn
  );

  // Live vs Fallback data
  const memberOrders = liveData?.orders != null ? liveData.orders : fallbackOrders;
  // Hợp nhất danh sách rút tiền từ liveData và fallbackPayouts (tránh bị mất khi 1 trong 2 bên trả về rỗng)
  const memberPayoutsList = (() => {
    const livePayouts = Array.isArray(liveData?.payouts) ? liveData.payouts : [];
    const map = new Map();
    (fallbackPayouts || []).forEach((p) => {
      if (p && p.id != null) map.set(String(p.id), p);
    });
    livePayouts.forEach((p) => {
      if (p && p.id != null) map.set(String(p.id), p);
    });
    return Array.from(map.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  })();

  const memberCompletedOrders = memberOrders.filter(isOrderCompleted);
  const memberPendingOrders = memberOrders.filter((o) => !isOrderCompleted(o) && !isOrderCancelled(o));

  const pendingCommission = memberPendingOrders.reduce((sum, o) => sum + calculateUserComm(o), 0);
  const completedCommission = memberCompletedOrders.reduce((sum, o) => sum + calculateUserComm(o), 0);
  const rawCompletedCommission = memberCompletedOrders.reduce((sum, o) => sum + Number(o.rawCommission || 0), 0);

  let eligibleCompletedCommission = 0;
  let paidOrdersCommission = 0;
  memberCompletedOrders.forEach((o) => {
    const comm = calculateUserComm(o);
    if (isOrderEligible(o)) {
      eligibleCompletedCommission += comm;
    }
    if (String(o.paymentStatus || "").toUpperCase() === "PAID") {
      paidOrdersCommission += comm;
    }
  });

  const approvedPayouts = memberPayoutsList.filter((p) => {
    const st = String(p.status || "").toUpperCase();
    return st === "COMPLETED" || st === "APPROVED";
  });
  const pendingPayoutsList = memberPayoutsList.filter((p) => {
    const st = String(p.status || "").toUpperCase();
    return st === "PENDING";
  });

  const totalPayoutsWithdrawn = approvedPayouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const pendingWithdrawn = pendingPayoutsList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalWithdrawn = Math.max(totalPayoutsWithdrawn, paidOrdersCommission);

  const availableBalance = Math.max(0, eligibleCompletedCommission - totalWithdrawn - pendingWithdrawn);

  const zaloName = liveData?.zaloName || liveData?.user?.name || initialZaloName;
  const bankName = liveData?.bankName || liveData?.user?.bankName || initialBankName;
  const accountNumber = liveData?.accountNumber || liveData?.user?.accountNumber || initialAccountNumber;
  const accountName = liveData?.accountName || liveData?.user?.accountName || initialAccountName;

  // Filtering & Pagination
  const getPlatform = (o) => {
    const p = (o.platform || "").toUpperCase();
    if (p.includes("TIKTOK")) return "TIKTOK";
    if (p.includes("LAZADA")) return "LAZADA";
    return "SHOPEE";
  };

  const getOrderKey = (o) => (o && o.id != null ? String(o.id) : String(o?.orderId || ""));

  const filteredOrders = memberOrders
    .filter((o) => {
      if (platformFilter !== "ALL" && getPlatform(o) !== platformFilter) return false;
      if (statusFilter !== "ALL") {
        if (statusFilter === "COMPLETED" && !isOrderCompleted(o)) return false;
        if (statusFilter === "PENDING" && (isOrderCompleted(o) || isOrderCancelled(o))) return false;
        if (statusFilter === "CANCELLED" && !isOrderCancelled(o)) return false;
      }
      if (paymentFilter !== "ALL") {
        const isPaid = o.paymentStatus === "PAID";
        if (paymentFilter === "PAID" && !isPaid) return false;
        if (paymentFilter === "UNPAID" && isPaid) return false;
      }
      if (localSearch.trim()) {
        const q = localSearch.toLowerCase().trim();
        const orderId = (o.orderId || "").toLowerCase();
        const productName = (o.productName || "").toLowerCase();
        if (!orderId.includes(q) && !productName.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.orderDate || a.purchaseTime || a.createdAt || 0).getTime();
      const timeB = new Date(b.orderDate || b.purchaseTime || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

  // Selection & Statistics for selected orders
  const selectedOrdersList = memberOrders.filter((o) => {
    const k = getOrderKey(o);
    return (
      selectedOrderIds.has(k) ||
      (o.id != null && selectedOrderIds.has(String(o.id))) ||
      (o.orderId && selectedOrderIds.has(String(o.orderId)))
    );
  });

  const selectedTotalUserComm = selectedOrdersList.reduce((sum, o) => {
    if (isOrderCancelled(o)) return sum;
    return sum + calculateUserComm(o);
  }, 0);

  const selectedTotalRawComm = selectedOrdersList.reduce((sum, o) => {
    if (isOrderCancelled(o)) return sum;
    const raw = o.rawCommission != null ? Number(o.rawCommission) : (o.commission != null ? Number(o.commission) : 0);
    return sum + raw;
  }, 0);

  const toggleSelectOrder = (o) => {
    const k = getOrderKey(o);
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const currentPageKeys = (filteredOrders.slice((Math.min(currentPage, Math.ceil(filteredOrders.length / pageSize) || 1) - 1) * pageSize, Math.min(currentPage, Math.ceil(filteredOrders.length / pageSize) || 1) * pageSize)).map(getOrderKey);
  const isAllCurrentPageSelected =
    currentPageKeys.length > 0 && currentPageKeys.every((k) => selectedOrderIds.has(k));

  const toggleSelectAllCurrentPage = () => {
    if (isAllCurrentPageSelected) {
      setSelectedOrderIds((prev) => {
        const next = new Set(prev);
        currentPageKeys.forEach((k) => next.delete(k));
        return next;
      });
    } else {
      setSelectedOrderIds((prev) => {
        const next = new Set(prev);
        currentPageKeys.forEach((k) => next.add(k));
        return next;
      });
    }
  };

  const allFilteredKeys = filteredOrders.map(getOrderKey);
  const isAllFilteredSelected =
    allFilteredKeys.length > 0 && allFilteredKeys.every((k) => selectedOrderIds.has(k));

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(allFilteredKeys));
    }
  };

  // API Đánh dấu Đã thanh toán / Chưa thanh toán
  const handleMarkPaid = async (action = "PAID", specificOrder = null) => {
    if (!tenantSlug) return;

    let targetKeys = [];
    if (specificOrder) {
      targetKeys = [getOrderKey(specificOrder)];
    } else {
      targetKeys = Array.from(selectedOrderIds);
    }

    if (targetKeys.length === 0) {
      if (showNotification) showNotification("⚠️ Vui lòng tích chọn ít nhất 1 đơn hàng!", "error");
      else alert("Vui lòng tích chọn ít nhất 1 đơn hàng!");
      return;
    }

    const actionText = action === "PAID" ? "ĐÃ THANH TOÁN" : "CHƯA THANH TOÁN";
    if (targetKeys.length > 1) {
      const confirmMsg = `Xác nhận chuyển ${targetKeys.length} đơn hàng sang trạng thái ${actionText}?`;
      if (!window.confirm(confirmMsg)) return;
    }

    setIsMarkingPaid(true);
    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${tenantSlug}/orders/mark-paid`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(authHeaders || {}),
        },
        body: JSON.stringify({
          orderIds: targetKeys,
          action,
          zaloId: zaloId || undefined,
          userId: member?.id || undefined,
          bankName: initialBankName || undefined,
          accountNumber: initialAccountNumber || undefined,
          accountName: initialAccountName || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const msg = data.message || `Đã chuyển ${targetKeys.length} đơn sang ${actionText}!`;
        if (showNotification) showNotification(msg, "success");

        // Tải lại live lookup để đồng bộ ngay lập tức 4 thẻ số dư và danh sách lệnh rút
        if (zaloId) {
          const queryKey = encodeURIComponent(zaloId.trim());
          fetch(`${apiRoot}/api/saas/public/${tenantSlug}/lookup?query=${queryKey}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (d) setLiveData(d);
            })
            .catch(() => {});
        }

        // Cập nhật ngay trong state liveData để giao diện phản hồi lập tức
        setLiveData((prev) => {
          if (!prev) return prev;
          const targetSet = new Set(targetKeys.map(String));
          const updateList = (list) =>
            (list || []).map((o) => {
              const k = getOrderKey(o);
              if (
                targetSet.has(k) ||
                (o.id != null && targetSet.has(String(o.id))) ||
                (o.orderId && targetSet.has(String(o.orderId)))
              ) {
                return { ...o, paymentStatus: action };
              }
              return o;
            });
          return {
            ...prev,
            orders: updateList(prev.orders),
          };
        });

        // Bỏ chọn các đơn vừa được đánh dấu
        setSelectedOrderIds((prev) => {
          const next = new Set(prev);
          targetKeys.forEach((k) => next.delete(k));
          return next;
        });

        // Thông báo parent làm mới danh sách đơn
        if (onOrdersUpdated) {
          onOrdersUpdated();
        }
      } else {
        const errMsg = data.message || "Lỗi cập nhật trạng thái thanh toán";
        if (showNotification) showNotification("❌ " + errMsg, "error");
        else alert("❌ " + errMsg);
      }
    } catch (err) {
      if (showNotification) showNotification("❌ Lỗi máy chủ: " + err.message, "error");
      else alert("❌ Lỗi: " + err.message);
    } finally {
      setIsMarkingPaid(false);
    }
  };

  // API Duyệt yêu cầu rút tiền
  const handleApprovePayout = async (payoutId) => {
    if (!tenantSlug) return;
    if (!window.confirm(`Xác nhận ĐÃ CHUYỂN TIỀN thành công cho yêu cầu rút #${payoutId}?`)) return;

    setProcessingPayoutId(payoutId);
    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${tenantSlug}/payouts/${payoutId}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(authHeaders || {}),
        },
      });
      const data = await res.json();
      if (res.ok) {
        const msg = data.message || `Đã duyệt yêu cầu rút tiền #${payoutId} thành công!`;
        if (showNotification) showNotification("✅ " + msg, "success");
        else alert("✅ " + msg);
        await refreshLiveData();
        if (onOrdersUpdated) onOrdersUpdated();
      } else {
        const errMsg = data.message || "Lỗi khi duyệt yêu cầu rút tiền";
        if (showNotification) showNotification("❌ " + errMsg, "error");
        else alert("❌ " + errMsg);
      }
    } catch (err) {
      if (showNotification) showNotification("❌ Lỗi máy chủ: " + err.message, "error");
      else alert("❌ Lỗi: " + err.message);
    } finally {
      setProcessingPayoutId(null);
    }
  };

  // API Từ chối yêu cầu rút tiền
  const handleRejectPayout = async (payoutId) => {
    if (!tenantSlug) return;
    const note = prompt("Nhập lý do từ chối yêu cầu rút tiền này:", "Thông tin ngân hàng không hợp lệ / Chưa đủ điều kiện");
    if (note === null) return;

    setProcessingPayoutId(payoutId);
    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${tenantSlug}/payouts/${payoutId}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(authHeaders || {}),
        },
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      if (res.ok) {
        const msg = data.message || `Đã từ chối yêu cầu rút #${payoutId}`;
        if (showNotification) showNotification("✅ " + msg, "success");
        else alert("✅ " + msg);
        await refreshLiveData();
        if (onOrdersUpdated) onOrdersUpdated();
      } else {
        const errMsg = data.message || "Lỗi khi từ chối yêu cầu";
        if (showNotification) showNotification("❌ " + errMsg, "error");
        else alert("❌ " + errMsg);
      }
    } catch (err) {
      if (showNotification) showNotification("❌ Lỗi máy chủ: " + err.message, "error");
      else alert("❌ Lỗi: " + err.message);
    } finally {
      setProcessingPayoutId(null);
    }
  };

  // API Tạo & Duyệt lệnh rút tiền thủ công (Admin tự chi trả)
  const handleCreateManualPayout = async (e) => {
    e.preventDefault();
    if (!tenantSlug) return;

    const amountNum = Number(String(manualAmount || "").replace(/[^0-9]/g, ""));
    if (!amountNum || amountNum <= 0) {
      if (showNotification) showNotification("⚠️ Vui lòng nhập số tiền rút hợp lệ (> 0đ)!", "error");
      else alert("Vui lòng nhập số tiền rút hợp lệ!");
      return;
    }

    setIsCreatingPayout(true);
    try {
      const res = await fetch(`${apiRoot}/api/saas/admin/${tenantSlug}/payouts/create-manual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeaders || {}),
        },
        body: JSON.stringify({
          zaloId: zaloId || undefined,
          amount: amountNum,
          bankName: manualBankName || bankName || undefined,
          accountNumber: manualAccountNumber || accountNumber || undefined,
          accountName: manualAccountName || accountName || undefined,
          note: manualNote.trim() || `Admin tạo & duyệt rút tiền thủ công cho ${zaloName}`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (showNotification) showNotification("🎉 Đã tạo và hoàn tất lệnh rút tiền thành công!", "success");
        else alert("🎉 Đã tạo và hoàn tất lệnh rút tiền thành công!");
        setShowManualPayoutForm(false);
        setManualAmount("");
        await refreshLiveData();
        if (onOrdersUpdated) onOrdersUpdated();
      } else {
        const errMsg = data.message || "Lỗi tạo lệnh rút tiền";
        if (showNotification) showNotification("❌ " + errMsg, "error");
        else alert("❌ " + errMsg);
      }
    } catch (err) {
      if (showNotification) showNotification("❌ Lỗi máy chủ: " + err.message, "error");
      else alert("❌ Lỗi: " + err.message);
    } finally {
      setIsCreatingPayout(false);
    }
  };

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedOrders = filteredOrders.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Page totals
  const pageTotalRaw = paginatedOrders.reduce((sum, o) => {
    if (isOrderCancelled(o)) return sum;
    const raw = o.rawCommission != null ? Number(o.rawCommission) : (o.commission != null ? Number(o.commission) : 0);
    return sum + raw;
  }, 0);

  const pageTotalAfterTax = paginatedOrders.reduce((sum, o) => {
    if (isOrderCancelled(o)) return sum;
    return sum + calculateAfterTax(o);
  }, 0);

  const pageTotalFinal = paginatedOrders.reduce((sum, o) => {
    if (isOrderCancelled(o)) return sum;
    return sum + calculateUserComm(o);
  }, 0);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch {
      return String(dateStr);
    }
  };

  const getStatusBadge = (o) => {
    if (isOrderCompleted(o))
      return { text: "Hoàn thành", cls: "bg-emerald-50 text-emerald-700 border-emerald-300" };
    if (isOrderCancelled(o))
      return { text: "Hủy", cls: "bg-rose-50 text-rose-700 border-rose-200" };
    return { text: o.status || "Chờ xử lý", cls: "bg-amber-50 text-amber-700 border-amber-200" };
  };

  const getPlatformBadge = (o) => {
    const p = getPlatform(o);
    if (p === "TIKTOK") return { label: "TikTok", cls: "bg-slate-100 text-slate-800 border-slate-200" };
    if (p === "LAZADA") return { label: "Lazada", cls: "bg-pink-50 text-pink-600 border-pink-100" };
    return { label: "Shopee", cls: "bg-orange-50 text-orange-600 border-orange-200" };
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-5xl max-h-[93vh] overflow-y-auto shadow-2xl border border-slate-100 p-5 sm:p-7 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-center text-sm font-black shadow-md shadow-orange-200 shrink-0">
              <i className="fa-solid fa-user"></i>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-slate-900 font-display">
                  Chi Tiết Thành Viên —{" "}
                  <span className="text-orange-600">{zaloName}</span>
                </h2>
                {isLoadingLive && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <i className="fa-solid fa-rotate animate-spin text-[10px]"></i> Đồng bộ...
                  </span>
                )}
              </div>
              <p className="text-[11px] font-bold text-slate-400 font-mono">
                Zalo ID: {zaloId || "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Xóa thành viên này khỏi Kênh"
              >
                <i className="fa-regular fa-trash-can text-xs"></i>
                <span className="hidden sm:inline">Xóa thành viên</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center text-base transition cursor-pointer"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* 4 Wallet Cards — Giống 100% trang Tra Cứu */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Chờ xử lý */}
          <div
            onClick={() => {
              setActiveTab("orders");
              setStatusFilter("PENDING");
              setCurrentPage(1);
            }}
            className="bg-white hover:bg-amber-50/40 rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200 hover:border-amber-300 flex flex-col justify-between transition hover:shadow-md cursor-pointer group"
            title="Bấm để lọc các đơn Đang Chờ Xử Lý"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-bold">
                  <i className="fa-solid fa-clock-rotate-left"></i>
                </div>
                <span className="text-[10px] font-bold text-amber-600 opacity-0 group-hover:opacity-100 transition">
                  Lọc đơn ➔
                </span>
              </div>
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-wide text-slate-500">
                ĐANG CHỜ XỬ LÝ
              </p>
              <p className="text-[9px] text-slate-400 font-semibold mb-2">
                (Đang vận chuyển / chưa xác nhận)
              </p>
            </div>
            <div className="text-lg sm:text-2xl font-black text-amber-600 font-mono truncate">
              {formatMoney(pendingCommission)}
            </div>
          </div>

          {/* Đã hoàn thành */}
          <div
            onClick={() => {
              setActiveTab("orders");
              setStatusFilter("COMPLETED");
              setCurrentPage(1);
            }}
            className="bg-white hover:bg-emerald-50/40 rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200 hover:border-emerald-300 flex flex-col justify-between transition hover:shadow-md cursor-pointer group"
            title="Bấm để lọc các đơn Đã Hoàn Thành"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold">
                  <i className="fa-solid fa-circle-check"></i>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition">
                  Lọc đơn ➔
                </span>
              </div>
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-wide text-slate-500">
                ĐÃ HOÀN THÀNH
              </p>
              <p className="text-[9px] text-slate-400 font-semibold mb-2">
                {holdingDays > 0 ? `(Hoàn thành • Giữ ${holdingDays} ngày)` : "(Hoàn thành • Rút ngay)"}
              </p>
            </div>
            <div className="text-lg sm:text-2xl font-black text-emerald-600 font-mono truncate">
              {formatMoney(completedCommission)}
            </div>
          </div>

          {/* Số dư khả dụng */}
          <div
            onClick={() => {
              setActiveTab("orders");
              setStatusFilter("ALL");
            }}
            className="bg-white hover:bg-orange-50/40 rounded-3xl p-4 sm:p-5 shadow-xs border border-slate-200 hover:border-orange-300 flex flex-col justify-between transition hover:shadow-md cursor-pointer group"
            title="Số dư hoa hồng khả dụng có thể rút"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold">
                  <i className="fa-solid fa-wallet"></i>
                </div>
                <span className="text-[10px] font-bold text-orange-600 opacity-0 group-hover:opacity-100 transition">
                  Xem đơn ➔
                </span>
              </div>
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-wide text-slate-500">
                SỐ DƯ KHẢ DỤNG
              </p>
              <p className="text-[9px] text-slate-400 font-semibold mb-2">
                {pendingWithdrawn > 0 ? (
                  <span className="text-amber-600 font-bold">
                    (Đang chờ duyệt: {formatMoney(pendingWithdrawn)})
                  </span>
                ) : holdingDays === 0 ? (
                  `(Chia ${customerSplitRate}-${adminSplitRate})`
                ) : (
                  `(Sau ${holdingDays} ngày • Chia ${customerSplitRate}-${adminSplitRate})`
                )}
              </p>
            </div>
            <div className="text-lg sm:text-2xl font-black text-orange-600 font-mono truncate">
              {formatMoney(availableBalance)}
            </div>
          </div>

          {/* Đã nhận (Đã rút) — Bấm để chuyển ngay sang Tab Lịch Sử Rút Tiền */}
          <div
            onClick={() => setActiveTab("payouts")}
            className={`rounded-3xl p-4 sm:p-5 shadow-xs border flex flex-col justify-between transition hover:shadow-md cursor-pointer group ${
              activeTab === "payouts"
                ? "bg-purple-50/80 border-purple-400 ring-2 ring-purple-300"
                : "bg-white hover:bg-purple-50/40 border-slate-200 hover:border-purple-300"
            }`}
            title="Bấm để xem chi tiết Lịch Sử Rút Tiền"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">
                  <i className="fa-solid fa-money-bill-transfer"></i>
                </div>
                <span className="text-[10px] font-bold text-purple-600 bg-purple-100/70 px-2 py-0.5 rounded-full group-hover:bg-purple-600 group-hover:text-white transition">
                  Xem LS rút ➔
                </span>
              </div>
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-wide text-slate-500">
                ĐÃ NHẬN (ĐÃ RÚT)
              </p>
              <p className="text-[9px] text-slate-400 font-semibold mb-2">
                (Tổng tiền đã rút về bank)
              </p>
            </div>
            <div className="text-lg sm:text-2xl font-black text-purple-600 font-mono truncate">
              {formatMoney(totalWithdrawn)}
            </div>
          </div>
        </div>

        {/* Bank Info Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200">
          <div className="flex items-center gap-2.5 text-sm font-black text-slate-900 mb-4 border-b border-slate-100 pb-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-center text-xs shadow-md shadow-orange-200">
              <i className="fa-solid fa-building-columns"></i>
            </div>
            <span>
              Thông tin Ngân Hàng Nhận Hoa Hồng
              <span className="text-orange-600 font-extrabold ml-1">
                của {zaloName}
              </span>
            </span>
          </div>

          <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/80 flex items-center gap-3 flex-wrap shadow-2xs">
            <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-orange-600 text-lg shadow-2xs shrink-0">
              <i className="fa-solid fa-building-columns"></i>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                  {bankName || "Chưa cập nhật ngân hàng"}
                </span>
                {accountName && (
                  <span className="text-[10px] font-extrabold text-orange-600 uppercase bg-orange-100/70 px-2 py-0.5 rounded-lg shrink-0">
                    {accountName}
                  </span>
                )}
              </div>
              <div className="text-xs font-bold text-slate-500 font-mono mt-0.5 truncate">
                {accountNumber ? `STK: ${accountNumber}` : "Chưa liên kết số tài khoản ngân hàng"}
              </div>
            </div>
          </div>
        </div>

        {/* ===================== NAVIGATION TABS ===================== */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("orders")}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 ${
                activeTab === "orders"
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              <i className="fa-solid fa-boxes-stacked"></i>
              <span>Đơn Hàng Thành Viên</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  activeTab === "orders" ? "bg-white/20 text-white" : "bg-white text-slate-600 border border-slate-200"
                }`}
              >
                {memberOrders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("payouts")}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 ${
                activeTab === "payouts"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              <i className="fa-solid fa-money-bill-transfer"></i>
              <span>Lịch Sử Rút Tiền</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  activeTab === "payouts" ? "bg-white/20 text-white" : "bg-white text-slate-600 border border-slate-200"
                }`}
              >
                {memberPayoutsList.length}
              </span>
              {pendingPayoutsList.length > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-amber-950 animate-pulse">
                  {pendingPayoutsList.length} chờ
                </span>
              )}
            </button>
          </div>

          {activeTab === "payouts" && (
            <button
              type="button"
              onClick={() => {
                setShowManualPayoutForm(!showManualPayoutForm);
                if (!showManualPayoutForm) {
                  setManualAmount(availableBalance > 0 ? String(availableBalance) : "");
                  setManualBankName(bankName || "");
                  setManualAccountNumber(accountNumber || "");
                  setManualAccountName(accountName || "");
                  setManualNote(`Admin tạo & duyệt quyết toán hoa hồng cho ${zaloName}`);
                }
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-purple-500/20"
            >
              <i className={`fa-solid ${showManualPayoutForm ? "fa-xmark" : "fa-plus"}`}></i>
              <span>{showManualPayoutForm ? "Đóng Form Tạo Lệnh" : "+ Tạo Lệnh Rút Thủ Công"}</span>
            </button>
          )}
        </div>

        {/* ===================== TAB 1: ĐƠN HÀNG (ORDERS) ===================== */}
        {activeTab === "orders" && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2 font-display">
                <i className="fa-solid fa-boxes-stacked text-orange-600"></i>
                Đơn Hàng Thành Viên ({memberOrders.length} đơn)
              </h3>

              <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Lọc mã đơn / tên SP..."
                  value={localSearch}
                  onChange={(e) => {
                    setLocalSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-orange-500 transition"
                />
                <i className="fa-solid fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="COMPLETED">Đã hoàn thành</option>
                <option value="PENDING">Chờ xử lý</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>

              {/* Payment status filter */}
              <select
                value={paymentFilter}
                onChange={(e) => {
                  setPaymentFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                title="Lọc trạng thái thanh toán đối chiếu App Script"
              >
                <option value="ALL">Tất cả thanh toán</option>
                <option value="UNPAID">Chưa thanh toán</option>
                <option value="PAID">Đã thanh toán</option>
              </select>

              {/* Quick Select All Filtered */}
              {filteredOrders.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAllFiltered}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border flex items-center gap-1.5 shadow-2xs ${
                    isAllFilteredSelected
                      ? "bg-amber-100 text-amber-900 border-amber-300"
                      : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                  title="Chọn tất cả đơn của khách này đang hiển thị theo bộ lọc"
                >
                  <i className={`fa-regular ${isAllFilteredSelected ? "fa-square-check text-amber-700" : "fa-square text-slate-400"}`}></i>
                  <span>{isAllFilteredSelected ? "Bỏ chọn" : `Chọn ${filteredOrders.length} đơn`}</span>
                </button>
              )}

              {/* Platform filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { key: "ALL", label: "Tất cả" },
                  { key: "SHOPEE", label: "Shopee" },
                  { key: "TIKTOK", label: "TikTok" },
                ].map((p) => (
                  <button
                    key={p.key}
                    onClick={() => {
                      setPlatformFilter(p.key);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      platformFilter === p.key
                        ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action / Đối soát Banner when orders are selected */}
          {selectedOrderIds.size > 0 && (
            <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-emerald-50 border border-orange-200 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-[fadeIn_0.15s_ease-out]">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center text-xs font-black shadow-xs">
                    {selectedOrderIds.size}
                  </span>
                  <span className="text-xs font-black text-slate-800">
                    Đang chọn {selectedOrderIds.size} đơn:
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-semibold">Khách nhận:</span>
                  <span className="text-base font-black text-orange-600 font-mono">
                    {formatMoney(selectedTotalUserComm)}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    (Gốc: {formatMoney(selectedTotalRawComm)})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={isMarkingPaid}
                  onClick={() => handleMarkPaid("PAID")}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 disabled:opacity-50"
                  title="Đánh dấu các đơn này là Đã thanh toán (Đối chiếu App Script)"
                >
                  <i className="fa-solid fa-check text-[11px]"></i>
                  <span>Đã thanh toán ({selectedOrderIds.size})</span>
                </button>

                <button
                  type="button"
                  disabled={isMarkingPaid}
                  onClick={() => handleMarkPaid("UNPAID")}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  title="Chuyển về Chưa thanh toán"
                >
                  <i className="fa-solid fa-rotate-left text-[11px] text-slate-500"></i>
                  <span>Chưa TT</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOrderIds(new Set())}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold px-2 py-1 cursor-pointer"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200">
                  <th className="px-3 py-3 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={isAllCurrentPageSelected}
                      onChange={toggleSelectAllCurrentPage}
                      className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 cursor-pointer"
                      title="Chọn tất cả đơn trên trang này"
                    />
                  </th>
                  <th className="px-3 py-3 font-black text-slate-700 whitespace-nowrap">Mã đơn</th>
                  <th className="px-3 py-3 font-black text-slate-700 whitespace-nowrap">Nền tảng</th>
                  <th className="px-3 py-3 font-black text-slate-700 whitespace-nowrap text-center">Đã TT</th>
                  <th className="px-3 py-3 font-black text-slate-700">Sản phẩm</th>
                  <th className="px-3 py-3 font-black text-slate-700 whitespace-nowrap text-right">HH Gốc</th>
                  <th className="px-3 py-3 font-black text-slate-700 whitespace-nowrap text-right">Sau thuế ({100 - taxRate}%)</th>
                  <th className="px-3 py-3 font-black text-slate-700 whitespace-nowrap text-right">Khách nhận ({customerSplitRate}%)</th>
                  <th className="px-3 py-3 font-black text-slate-700 whitespace-nowrap">Thời gian</th>
                  <th className="px-3 py-3 font-black text-slate-700 whitespace-nowrap text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-4 py-10 text-center text-slate-400 font-bold">
                      Không có đơn hàng nào phù hợp với bộ lọc này.
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((o) => {
                    const stBadge = getStatusBadge(o);
                    const pfBadge = getPlatformBadge(o);
                    const rawComm = o.rawCommission != null ? Number(o.rawCommission) : (o.commission != null ? Number(o.commission) : 0);
                    const afterTax = calculateAfterTax(o);
                    const finalComm = calculateUserComm(o);
                    const isSelected = selectedOrderIds.has(getOrderKey(o));

                    return (
                      <tr
                        key={o.id || o.orderId}
                        className={`border-b border-slate-100 transition ${
                          isSelected ? "bg-orange-50/50" : "hover:bg-slate-50/70"
                        }`}
                      >
                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOrder(o)}
                            className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {o.orderId || "—"}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${pfBadge.cls}`}>
                            {pfBadge.label}
                          </span>
                        </td>
                        {/* Cột Đã TT (Đối chiếu App Script) */}
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          {o.paymentStatus === "PAID" ? (
                            <button
                              type="button"
                              onClick={() => handleMarkPaid("UNPAID", o)}
                              className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs transition cursor-pointer"
                              title="Đã thanh toán (Bấm để chuyển về Chưa thanh toán)"
                            >
                              <i className="fa-solid fa-check text-[10px]"></i> Đã TT
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleMarkPaid("PAID", o)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs transition cursor-pointer"
                              title="Chưa thanh toán (Bấm để đánh dấu Đã thanh toán)"
                            >
                              Chưa TT
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2.5 max-w-[240px]">
                          <span className="font-semibold text-slate-800 truncate block text-[11px]" title={o.productName}>
                            {o.productName || "Đơn hàng Affiliate"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-slate-500 whitespace-nowrap">
                          {formatMoney(rawComm)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-amber-600 whitespace-nowrap">
                          {formatMoney(afterTax)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-black text-orange-600 whitespace-nowrap">
                          {formatMoney(finalComm)}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-slate-500 text-[11px] font-mono">
                          <div>{formatDateTime(o.orderDate || o.purchaseTime || o.createdAt)}</div>
                          {(o.completeTime || o.completedAt) && (
                            <div className="text-[10px] text-emerald-600 font-semibold">
                              ✓ Xong: {formatDateTime(o.completeTime || o.completedAt)}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${stBadge.cls}`}>
                            {stBadge.text}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {paginatedOrders.length > 0 && (
                <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-xs sticky bottom-0 z-10 shadow-xs">
                  <tr className="bg-slate-100/95">
                    <td colSpan="5" className="px-3 py-3 text-slate-900 font-black">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">📊</span>
                        <span>
                          Tổng cộng trang {safePage}{" "}
                          <span className="text-[11px] font-semibold text-slate-500">
                            ({paginatedOrders.length} đơn{platformFilter !== "ALL" ? ` ${platformFilter}` : ""})
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-black text-slate-700 whitespace-nowrap">
                      {formatMoney(pageTotalRaw)}
                    </td>
                    <td className="px-3 py-3 text-right font-black text-amber-600 whitespace-nowrap">
                      {formatMoney(pageTotalAfterTax)}
                    </td>
                    <td className="px-3 py-3 text-right font-black text-orange-600 whitespace-nowrap">
                      {formatMoney(pageTotalFinal)}
                    </td>
                    <td colSpan="2" className="px-3 py-3 text-center text-slate-400 font-bold text-[11px] whitespace-nowrap">
                      Trang {safePage}/{totalPages}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 font-bold">
                Trang {safePage} / {totalPages} (Tổng {filteredOrders.length} đơn)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <i className="fa-solid fa-chevron-left text-[10px] mr-1"></i>Trước
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="text-slate-400 text-xs">...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(p)}
                        className={`w-7 h-7 text-xs font-black rounded-lg transition cursor-pointer ${
                          safePage === p
                            ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Sau<i className="fa-solid fa-chevron-right text-[10px] ml-1"></i>
                </button>
              </div>
            </div>
          )}
        </div>
        )}

        {/* ===================== TAB 2: LỊCH SỬ RÚT TIỀN (PAYOUTS) ===================== */}
        {activeTab === "payouts" && (
          <div className="space-y-4">
            {/* Form tạo lệnh rút tiền thủ công */}
            {showManualPayoutForm && (
              <div className="bg-gradient-to-br from-purple-50 via-indigo-50/50 to-white rounded-3xl p-5 sm:p-6 border-2 border-purple-300 shadow-md space-y-4 animate-[fadeIn_0.15s_ease-out]">
                <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center text-xs shadow-sm">
                      <i className="fa-solid fa-plus"></i>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 font-display">
                        Tạo Lệnh Rút & Quyết Toán Hoa Hồng Thủ Công
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Tự động duyệt thành công (COMPLETED) & cấn trừ các đơn hoàn thành cũ trước (FIFO)
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowManualPayoutForm(false)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs cursor-pointer"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>

                <form onSubmit={handleCreateManualPayout} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">
                        Số Tiền Rút (VNĐ): <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1000"
                        step="1000"
                        required
                        value={manualAmount}
                        onChange={(e) => setManualAmount(e.target.value)}
                        placeholder="VD: 50000"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-slate-900 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 shadow-2xs"
                      />
                      {/* Gợi ý số tiền nhanh */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {availableBalance > 0 && (
                          <button
                            type="button"
                            onClick={() => setManualAmount(String(availableBalance))}
                            className="text-[10px] font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 px-2 py-0.5 rounded-md transition cursor-pointer"
                          >
                            Toàn bộ khả dụng ({formatMoney(availableBalance)})
                          </button>
                        )}
                        {[50000, 100000, 200000, 500000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setManualAmount(String(amt))}
                            className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 hover:bg-purple-50 hover:text-purple-700 px-2 py-0.5 rounded-md transition cursor-pointer"
                          >
                            {formatMoney(amt)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">
                        Ghi Chú Giao Dịch:
                      </label>
                      <input
                        type="text"
                        value={manualNote}
                        onChange={(e) => setManualNote(e.target.value)}
                        placeholder="VD: Chuyển tiếp thanh toán Web cũ sang Web mới..."
                        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 shadow-2xs"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Ghi chú nội dung chuyển khoản để đối soát sau này.
                      </span>
                    </div>
                  </div>

                  {/* Thông tin ngân hàng nhận */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Ngân hàng:</label>
                      <input
                        type="text"
                        value={manualBankName}
                        onChange={(e) => setManualBankName(e.target.value)}
                        placeholder="VD: MBBank, VCB..."
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-purple-500 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Số tài khoản:</label>
                      <input
                        type="text"
                        value={manualAccountNumber}
                        onChange={(e) => setManualAccountNumber(e.target.value)}
                        placeholder="VD: 0987654321..."
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-800 outline-none focus:border-purple-500 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Chủ tài khoản:</label>
                      <input
                        type="text"
                        value={manualAccountName}
                        onChange={(e) => setManualAccountName(e.target.value.toUpperCase())}
                        placeholder="VD: NGUYEN VAN A..."
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 uppercase outline-none focus:border-purple-500 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-100">
                    <button
                      type="button"
                      onClick={() => setShowManualPayoutForm(false)}
                      className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 cursor-pointer transition"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingPayout}
                      className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isCreatingPayout ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin"></i> Đang tạo lệnh...
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-check"></i> Xác Nhận Tạo & Duyệt Ngay
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Mini Stats Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold shrink-0">
                  <i className="fa-solid fa-circle-check"></i>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase text-emerald-800 tracking-wide">
                    Đã chuyển thành công
                  </p>
                  <p className="text-base font-black text-emerald-700 font-mono">
                    {formatMoney(totalPayoutsWithdrawn)}
                  </p>
                  <p className="text-[10px] text-emerald-600 font-semibold">
                    {approvedPayouts.length} giao dịch hoàn tất
                  </p>
                </div>
              </div>

              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold shrink-0">
                  <i className="fa-solid fa-clock-rotate-left"></i>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase text-amber-800 tracking-wide">
                    Đang chờ duyệt
                  </p>
                  <p className="text-base font-black text-amber-700 font-mono">
                    {formatMoney(pendingWithdrawn)}
                  </p>
                  <p className="text-[10px] text-amber-600 font-semibold">
                    {pendingPayoutsList.length} yêu cầu đang chờ
                  </p>
                </div>
              </div>

              <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold shrink-0">
                  <i className="fa-solid fa-wallet"></i>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase text-purple-800 tracking-wide">
                    Số dư khả dụng hiện tại
                  </p>
                  <p className="text-base font-black text-purple-700 font-mono">
                    {formatMoney(availableBalance)}
                  </p>
                  <p className="text-[10px] text-purple-600 font-semibold">
                    Có thể tạo lệnh rút ngay
                  </p>
                </div>
              </div>
            </div>

            {/* Payouts Table */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2 font-display">
                  <i className="fa-solid fa-money-bill-transfer text-purple-600"></i>
                  <span>Lịch Sử Yêu Cầu Rút Tiền ({memberPayoutsList.length} giao dịch)</span>
                </h3>
              </div>

              {memberPayoutsList.length === 0 ? (
                <div className="py-12 px-4 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                  <div className="w-14 h-14 rounded-3xl bg-purple-100 text-purple-600 flex items-center justify-center text-2xl mx-auto mb-3 shadow-2xs">
                    <i className="fa-solid fa-money-bill-transfer"></i>
                  </div>
                  <h4 className="text-sm font-black text-slate-800 mb-1">
                    Chưa có lịch sử rút tiền nào
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                    Thành viên chưa gửi yêu cầu rút tiền hoặc chưa có giao dịch chi trả thủ công nào.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowManualPayoutForm(true);
                      setManualAmount(availableBalance > 0 ? String(availableBalance) : "");
                      setManualBankName(bankName || "");
                      setManualAccountNumber(accountNumber || "");
                      setManualAccountName(accountName || "");
                      setManualNote(`Admin tạo & duyệt quyết toán hoa hồng cho ${zaloName}`);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition inline-flex items-center gap-2"
                  >
                    <i className="fa-solid fa-plus"></i>
                    <span>Tạo Lệnh Rút Tiền Thủ Công</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b-2 border-slate-200">
                        <th className="px-3.5 py-3 font-black text-slate-700 text-center whitespace-nowrap">Mã GD</th>
                        <th className="px-3.5 py-3 font-black text-slate-700 text-right whitespace-nowrap">Số tiền rút</th>
                        <th className="px-3.5 py-3 font-black text-slate-700 whitespace-nowrap">Tài khoản nhận</th>
                        <th className="px-3.5 py-3 font-black text-slate-700">Ghi chú</th>
                        <th className="px-3.5 py-3 font-black text-slate-700 whitespace-nowrap">Thời gian</th>
                        <th className="px-3.5 py-3 font-black text-slate-700 text-center whitespace-nowrap">Trạng thái</th>
                        <th className="px-3.5 py-3 font-black text-slate-700 text-right whitespace-nowrap">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {memberPayoutsList.map((p) => {
                        const isPending = p.status === "PENDING";
                        const isCompleted = p.status === "COMPLETED" || p.status === "APPROVED";
                        const isRejected = p.status === "REJECTED";
                        const isProcessing = processingPayoutId === p.id;

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/70 transition">
                            <td className="px-3.5 py-3 text-center whitespace-nowrap">
                              <span className="px-2.5 py-1 bg-purple-100 text-purple-900 font-mono font-black rounded-xl text-xs border border-purple-200 inline-block shadow-2xs">
                                #{p.id}
                              </span>
                            </td>
                            <td className="px-3.5 py-3 text-right whitespace-nowrap font-mono font-black text-rose-600 text-sm">
                              {formatMoney(p.amount)}
                            </td>
                            <td className="px-3.5 py-3 whitespace-nowrap font-mono">
                              <p className="font-bold text-slate-900">
                                {p.bankName ? `${p.bankName} - ${p.accountNumber}` : "—"}
                              </p>
                              {p.accountName && (
                                <p className="text-[11px] font-bold text-orange-600 uppercase">
                                  {p.accountName}
                                </p>
                              )}
                            </td>
                            <td className="px-3.5 py-3 max-w-[200px]">
                              <span className="text-[11px] text-slate-600 block truncate" title={p.note || ""}>
                                {p.note || "—"}
                              </span>
                            </td>
                            <td className="px-3.5 py-3 whitespace-nowrap text-[11px] font-mono text-slate-500">
                              <div>Tạo: {formatDateTime(p.createdAt)}</div>
                              {p.completedAt && (
                                <div className="text-[10px] text-emerald-600 font-semibold">
                                  ✓ Xong: {formatDateTime(p.completedAt)}
                                </div>
                              )}
                            </td>
                            <td className="px-3.5 py-3 text-center whitespace-nowrap">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                  isCompleted
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : isRejected
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                                }`}
                              >
                                {isCompleted ? "Đã duyệt" : isRejected ? "Từ chối" : "Chờ duyệt"}
                              </span>
                            </td>
                            <td className="px-3.5 py-3 text-right whitespace-nowrap">
                              {isPending ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={() => handleApprovePayout(p.id)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-xs cursor-pointer shadow-2xs transition disabled:opacity-50 flex items-center gap-1"
                                    title="Xác nhận Đã Chuyển Tiền"
                                  >
                                    <i className="fa-solid fa-check text-[10px]"></i>
                                    <span>Duyệt CK</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isProcessing}
                                    onClick={() => handleRejectPayout(p.id)}
                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-xs border border-rose-200 cursor-pointer transition disabled:opacity-50"
                                    title="Từ chối yêu cầu rút tiền"
                                  >
                                    Từ chối
                                  </button>
                                </div>
                              ) : isCompleted ? (
                                <span className="text-[11px] font-bold text-emerald-600 inline-flex items-center gap-1">
                                  <i className="fa-solid fa-check-double text-[10px]"></i> Đã CK
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold text-rose-500">
                                  Đã hủy
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
