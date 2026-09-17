export const formatMoney = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return "0đ";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" })
    .format(amount)
    .replace("₫", "đ");
};

export const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
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
