import { useEffect, useState } from "react";
import { API_URL_ROOT } from "../config/api";

export function ShortLinkRedirectView({ shortCode, onNavigateHome }) {
  const [status, setStatus] = useState("loading"); // 'loading' | 'error' | 'redirecting'
  const [errorMessage, setErrorMessage] = useState("");
  const [targetUrl, setTargetUrl] = useState("");

  useEffect(() => {
    if (!shortCode) {
      setStatus("error");
      setErrorMessage("Mã rút gọn không hợp lệ.");
      return;
    }

    let isMounted = true;

    const resolveLink = async () => {
      try {
        const resolveApi = `${API_URL_ROOT}/api/short-link/resolve/${shortCode}`;
        const res = await fetch(resolveApi);

        if (res.ok) {
          const data = await res.json();
          if (data && data.longUrl) {
            if (!isMounted) return;
            setTargetUrl(data.longUrl);
            setStatus("redirecting");
            // Direct immediate browser redirect to Shopee/target URL
            window.location.replace(data.longUrl);
            return;
          }
        }

        // If backend returned 404 or missing longUrl
        if (isMounted) {
          setStatus("error");
          setErrorMessage("Liên kết rút gọn không tồn tại hoặc đã hết hạn.");
        }
      } catch (err) {
        console.error("Lỗi khi giải mã short link:", err);
        // Fallback: try navigating directly to backend bridge route
        const fallbackUrl = `${API_URL_ROOT}/s/${shortCode}`;
        if (isMounted) {
          setTargetUrl(fallbackUrl);
          setStatus("redirecting");
          window.location.replace(fallbackUrl);
        }
      }
    };

    resolveLink();

    return () => {
      isMounted = false;
    };
  }, [shortCode]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-gradient-to-br from-orange-400/20 to-red-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-gradient-to-tr from-amber-400/20 to-orange-400/20 rounded-full blur-2xl pointer-events-none" />

        {status === "loading" && (
          <div className="flex flex-col items-center py-6">
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-orange-100" />
              <div className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-orange-500 font-bold text-lg">
                🛍️
              </div>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              Đang chuyển hướng đến Shopee...
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Hệ thống đang mở liên kết mua sắm của bạn. Vui lòng chờ trong giây lát.
            </p>
          </div>
        )}

        {status === "redirecting" && (
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-2xl font-bold mb-6 animate-pulse">
              ➔
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              Đang mở cửa hàng...
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Nếu trình duyệt của bạn không tự động chuyển hướng:
            </p>
            {targetUrl && (
              <a
                href={targetUrl}
                rel="noreferrer"
                className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
              >
                Bấm vào đây để mở Shopee ➔
              </a>
            )}
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-2xl mb-4">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              Không thể mở liên kết
            </h2>
            <p className="text-sm text-slate-600 mb-6 max-w-xs">
              {errorMessage || "Mã rút gọn không tồn tại hoặc đã hết hạn."}
            </p>
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center justify-center px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl text-sm transition-colors"
            >
              Về trang chủ SaaS
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
