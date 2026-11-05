export const formatMoney = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return "0đ";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" })
    .format(amount)
    .replace("₫", "đ");
};

export const normalizeOrderDate = (dateStr, orderDateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;

  const now = new Date();
  if (d > now) {
    // Nếu ngày nằm trong tương lai (do lỗi đảo Ngày/Tháng lúc import): đảo lại ngày và tháng
    const day = d.getDate();
    const month = d.getMonth() + 1; // 1-12
    if (day <= 12 && month <= 12) {
      const swapped = new Date(d.getFullYear(), day - 1, month, d.getHours(), d.getMinutes(), d.getSeconds());
      if (swapped <= now) {
        return swapped;
      }
    }
    // Nếu vẫn ở tương lai mà có ngày đặt: hoàn thành = ngày đặt + 2 ngày
    if (orderDateStr) {
      const ordD = new Date(orderDateStr);
      if (!isNaN(ordD.getTime()) && ordD <= now) {
        return new Date(ordD.getTime() + 2 * 24 * 60 * 60 * 1000);
      }
    }
    return new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000); // Mặc định qua thời gian giữ
  }
  return d;
};

export const formatDate = (dateStr, orderDateStr) => {
  if (!dateStr) return "";
  try {
    let d = normalizeOrderDate(dateStr, orderDateStr);
    if (!d || isNaN(d.getTime())) d = new Date(dateStr);
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return dateStr;
  }
};
