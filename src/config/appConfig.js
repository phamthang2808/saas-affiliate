// src/config/appConfig.js
// Cấu hình Nền tảng & Thông tin Trưởng Nhóm qua Biến Môi Trường (Environment Variables)

export const APP_CONFIG = {
  // 1. Backend API Base URL
  apiUrl:
    import.meta.env.VITE_API_URL ||
    (window.location.hostname === "localhost"
      ? "http://localhost:8081"
      : window.location.origin),

  // 2. Chế độ Hoạt động:
  // - Nếu có VITE_TENANT_SLUG: Chế độ Web Độc Lập cho 1 Trưởng Nhóm (Standalone Trưởng Nhóm Portal)
  // - Nếu không có: Chế độ Nền tảng SaaS Đa Khách Hàng (Multi-Tenant SaaS Portal)
  isStandalone: Boolean(import.meta.env.VITE_TENANT_SLUG),

  // 3. Thông tin Trưởng Nhóm được cấu hình sẵn từ .env
  tenant: {
    id: import.meta.env.VITE_TENANT_ID ? Number(import.meta.env.VITE_TENANT_ID) : null,
    slug: import.meta.env.VITE_TENANT_SLUG || "",
    name: import.meta.env.VITE_TENANT_NAME || "Nhóm Đối Tác",
    contactZalo: import.meta.env.VITE_TENANT_CONTACT_ZALO || "0988.xxx.xxx",
    customerSplitRate: import.meta.env.VITE_TENANT_CUSTOMER_SPLIT_RATE
      ? Number(import.meta.env.VITE_TENANT_CUSTOMER_SPLIT_RATE)
      : 80,
    taxRate: import.meta.env.VITE_TENANT_TAX_RATE
      ? Number(import.meta.env.VITE_TENANT_TAX_RATE)
      : 10,
    platformFeeRate: import.meta.env.VITE_TENANT_PLATFORM_FEE_RATE
      ? Number(import.meta.env.VITE_TENANT_PLATFORM_FEE_RATE)
      : 10,
    primaryColor: import.meta.env.VITE_TENANT_PRIMARY_COLOR || "#f97316",
    logoUrl: import.meta.env.VITE_TENANT_LOGO_URL || "",
    brandTitle: import.meta.env.VITE_BRAND_TITLE || "Hệ Thống Đối Soát & Hoàn Tiền Affiliate",
  },
};

export const API_URL_ROOT = APP_CONFIG.apiUrl;
