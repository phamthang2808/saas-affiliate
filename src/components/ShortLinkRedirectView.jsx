import { useEffect, useState } from "react";
import { API_URL_ROOT } from "../config/api";

export function ShortLinkRedirectView({ shortCode, onNavigateHome }) {
  const [status, setStatus] = useState("loading"); // 'loading' | 'redirecting' | 'error'
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
        const resolveApi = `${API_URL_ROOT}/api/short-link/resolve/${encodeURIComponent(shortCode)}`;
        const res = await fetch(resolveApi);

        if (res.ok) {
          const data = await res.json();
          if (data && data.longUrl) {
            if (!isMounted) return;
            setTargetUrl(data.longUrl);
            setStatus("redirecting");

            // Direct immediate redirect to Shopee
            try {
              window.location.replace(data.longUrl);
            } catch (e) {
              window.location.href = data.longUrl;
            }
            return;
          }
        }

        if (isMounted) {
          setStatus("error");
          setErrorMessage("Liên kết sản phẩm không tồn tại hoặc đã hết hạn.");
        }
      } catch (err) {
        console.error("Lỗi khi giải mã short link:", err);
        const fallbackUrl = `${API_URL_ROOT}/s/${shortCode}`;
        if (isMounted) {
          setTargetUrl(fallbackUrl);
          setStatus("redirecting");
          try {
            window.location.replace(fallbackUrl);
          } catch (e) {
            window.location.href = fallbackUrl;
          }
        }
      }
    };

    resolveLink();

    return () => {
      isMounted = false;
    };
  }, [shortCode]);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#f5f5f5] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-orange-100 p-8 text-center relative overflow-hidden">
        {/* Subtle Shopee Orange Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#ee4d2d] to-[#ff7337]" />

        {/* Loading / Redirecting State */}
        {status !== "error" ? (
          <div className="flex flex-col items-center py-4">
            <div className="relative w-20 h-20 mb-5 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-orange-100" />
              <div className="absolute inset-0 rounded-full border-4 border-[#ee4d2d] border-t-transparent animate-spin" />
              <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-2xl shadow-inner">
                🛍️
              </div>
            </div>

            <h1 className="text-xl font-bold text-slate-800 mb-1.5">
              Đang mở Shopee...
            </h1>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed max-w-xs">
              Đang chuyển hướng bạn đến ứng dụng Shopee. Vui lòng chờ trong giây lát.
            </p>

            {targetUrl ? (
              <a
                href={targetUrl}
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#ee4d2d] to-[#ff5722] hover:from-[#d73211] hover:to-[#ee4d2d] text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 active:scale-95 transition-all text-sm tracking-wide"
              >
                <span>Mở Shopee Ngay</span>
                <span className="text-base">➔</span>
              </a>
            ) : (
              <div className="h-12 w-full flex items-center justify-center">
                <span className="text-xs text-slate-400">Đang chuẩn bị liên kết...</span>
              </div>
            )}

            <p className="text-[11px] text-slate-400 mt-4">
              Nếu không tự chuyển hướng, bấm nút màu cam ở trên
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-2xl mb-4">
              ⚠️
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              Không thể mở liên kết
            </h2>
            <p className="text-xs text-slate-500 mb-6 max-w-xs">
              {errorMessage || "Liên kết sản phẩm không tồn tại hoặc đã hết hạn."}
            </p>
            <a
              href="https://shopee.vn"
              className="w-full inline-flex items-center justify-center px-6 py-3 bg-[#ee4d2d] hover:bg-[#d73211] text-white font-medium rounded-xl text-sm transition-colors"
            >
              Mở trang chủ Shopee
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
