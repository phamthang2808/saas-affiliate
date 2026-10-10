import React, { useState, useEffect } from "react";
import logoImg from "../assets/logo.png";
import {
  isZaloBrowser,
  isAndroidDevice,
  isIOSDevice,
  openExternalBrowser,
  getExternalAuthUrl,
} from "../utils/browserDetect";

export function AuthModal({
  isOpen,
  onClose,
  onGoogleSuccess,
  clientId = "195858897824-4h5ffebs0djtuncmhod98o0ca495ju71.apps.googleusercontent.com",
}) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isZalo, setIsZalo] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDirectLogin, setShowDirectLogin] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
      setErrorMsg("");
      setCopied(false);
      setShowDirectLogin(false);
      return;
    }

    const inZalo = isZaloBrowser();
    const onAndroid = isAndroidDevice();
    const onIOS = isIOSDevice();
    setIsZalo(inZalo);
    setIsAndroid(onAndroid);
    setIsIOS(onIOS);

    // Auto-attempt jump on Android inside Zalo
    if (inZalo && onAndroid) {
      try {
        openExternalBrowser(true);
      } catch (e) {
        console.error("Auto breakout error:", e);
      }
    }

    let attempts = 0;
    const initializeGoogleBtn = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (googleResponse) => {
              setLoading(true);
              setErrorMsg("");
              try {
                await onGoogleSuccess(googleResponse);
              } catch (err) {
                console.error("Lỗi xác thực Google:", err);
                setErrorMsg(
                  err.message || "Đăng nhập Google thất bại. Vui lòng thử lại!"
                );
              } finally {
                setLoading(false);
              }
            },
          });

          const btnElem = document.getElementById("google-signin-btn-container");
          if (btnElem) {
            btnElem.innerHTML = "";
            window.google.accounts.id.renderButton(btnElem, {
              theme: "outline",
              size: "large",
              width: 280,
              text: "continue_with",
              shape: "pill",
            });
          }
        } catch (e) {
          console.error("Google init error:", e);
          setErrorMsg("Không thể kết nối dịch vụ Google: " + e.message);
        }
      }
    };

    if (!window.google?.accounts?.id) {
      const interval = setInterval(() => {
        attempts++;
        if (window.google?.accounts?.id) {
          initializeGoogleBtn();
          clearInterval(interval);
        } else if (attempts > 30) {
          clearInterval(interval);
          setErrorMsg(
            "Không tải được thư viện Google Identity Services. Vui lòng thử lại sau."
          );
        }
      }, 200);
      return () => clearInterval(interval);
    } else {
      initializeGoogleBtn();
    }
  }, [isOpen, onGoogleSuccess, clientId]);

  const handleCopyLink = async () => {
    const authUrl = getExternalAuthUrl();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(authUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = authUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleOpenExternal = () => {
    handleCopyLink();
    openExternalBrowser(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-10 max-w-lg w-full shadow-2xl border border-slate-100/90 flex flex-col items-center text-center relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 bg-gradient-to-b from-orange-400/20 via-amber-400/10 to-transparent rounded-full blur-2xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 transition cursor-pointer border border-slate-100 shadow-2xs z-10 disabled:opacity-50"
          title="Đóng cửa sổ"
        >
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>

        {/* Brand Logo Card */}
        <div className="relative z-10 mb-3">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl p-2.5 bg-gradient-to-tr from-orange-50 to-amber-50 border-2 border-orange-200/90 flex flex-col items-center justify-center shadow-lg shadow-orange-500/10 mx-auto">
            <img
              src={logoImg}
              alt="28AffiHub Logo"
              className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-md"
            />
          </div>
          <span className="inline-block mt-2 px-3 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-black uppercase tracking-wider border border-orange-200 font-display">
            28AffiHub Portal
          </span>
        </div>

        {/* Title & Subtitle */}
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-display mb-1 tracking-tight relative z-10">
          Đăng Nhập Nền Tảng Đối Soát
        </h3>
        <p className="text-xs sm:text-sm font-medium text-slate-500 mb-4 max-w-sm leading-relaxed relative z-10">
          Đăng nhập an toàn 1 chạm bằng tài khoản Google để truy cập Bảng Quản Trị & Đối Soát Hoa Hồng.
        </p>

        {/* Error Alert Message */}
        {errorMsg && (
          <div className="w-full mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold text-left flex items-start gap-2.5 relative z-10">
            <i className="fa-solid fa-circle-exclamation text-rose-500 mt-0.5 text-sm shrink-0"></i>
            <div className="flex-1">
              <span className="font-bold block text-rose-800">
                Đăng nhập không thành công:
              </span>
              <span className="text-[11px] text-rose-600 font-normal leading-relaxed">
                {errorMsg}
              </span>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex items-center justify-center gap-2.5 py-3 text-orange-600 font-bold text-xs animate-pulse relative z-10">
            <i className="fa-solid fa-circle-notch fa-spin text-sm"></i>
            <span>Đang xác thực thông tin tài khoản với Google...</span>
          </div>
        )}

        {/* ================= SPECIAL ZALO BROWSER BREAKOUT GUIDANCE ================= */}
        {isZalo && !showDirectLogin && (
          <div className="w-full mb-4 p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/80 border border-amber-200/90 text-left relative z-10 shadow-sm animate-fade-in">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 text-sm shadow-sm">
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                  Zalo Chặn Đăng Nhập Google Trực Tiếp
                </h4>
                <p className="text-[11px] text-amber-800/90 font-medium mt-0.5 leading-relaxed">
                  Google từ chối đăng nhập trên trình duyệt nội bộ Zalo để bảo mật (Lỗi 403 disallowed_useragent). Vui lòng mở bằng trình duyệt ngoài (Safari / Chrome)!
                </p>
              </div>
            </div>

            {/* Step-by-step visual instructions */}
            <div className="bg-white/90 backdrop-blur-xs rounded-xl p-3 border border-amber-200/60 text-xs text-slate-700 space-y-2 mb-3.5 shadow-2xs font-medium">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  1
                </span>
                <span className="leading-snug">
                  Nhấn vào biểu tượng dấu <strong>3 chấm (...)</strong> ở góc trên cùng bên phải màn hình Zalo.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  2
                </span>
                <span className="leading-snug">
                  Chọn <strong>"Mở bằng trình duyệt"</strong> (hoặc <strong>Safari / Chrome</strong>).
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  3
                </span>
                <span className="leading-snug text-emerald-800 font-bold">
                  Trang sẽ tự động mở và cho phép bạn đăng nhập Google 1 chạm an toàn!
                </span>
              </div>
            </div>

            {/* Breakout Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleOpenExternal}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
              >
                <i className="fa-solid fa-arrow-up-right-from-square text-sm"></i>
                <span>
                  {copied
                    ? "✓ Đã sao chép! Hãy dán vào Safari / Chrome"
                    : "Mở Bằng Trình Duyệt Ngoài (Safari / Chrome)"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200/90 shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <i className="fa-regular fa-clone text-xs text-orange-600"></i>
                <span>{copied ? "✓ Đã sao chép liên kết vào bộ nhớ tạm" : "Sao chép liên kết trang đăng nhập"}</span>
              </button>
            </div>

            {/* Toggle direct button */}
            <div className="text-center mt-3 pt-2 border-t border-amber-200/50">
              <button
                type="button"
                onClick={() => setShowDirectLogin(true)}
                className="text-[11px] text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
              >
                Vẫn muốn thử đăng nhập trực tiếp tại đây
              </button>
            </div>
          </div>
        )}

        {/* Google Sign-in Container (Always in DOM for SDK, hidden if Zalo breakout card is active) */}
        <div
          className={`w-full flex flex-col items-center justify-center my-1 relative z-10 ${
            loading ? "opacity-40 pointer-events-none" : ""
          } ${isZalo && !showDirectLogin ? "hidden" : "block"}`}
        >
          <div
            id="google-signin-btn-container"
            className="flex justify-center min-h-[48px]"
          ></div>

          {isZalo && showDirectLogin && (
            <button
              type="button"
              onClick={() => setShowDirectLogin(false)}
              className="text-[10px] text-orange-600 font-bold hover:underline mt-2 cursor-pointer"
            >
              ← Xem hướng dẫn mở bằng Safari / Chrome
            </button>
          )}
        </div>

        {/* Role Permissions Box */}
        <div className="w-full mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center relative z-10">
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
            <i className="fa-solid fa-crown text-amber-500 text-xs block mb-1"></i>
            <span className="text-[10px] font-bold text-slate-700 block">
              Super Admin
            </span>
            <span className="text-[9px] text-slate-400 block font-medium">
              Toàn sàn
            </span>
          </div>

          <div className="p-2 rounded-xl bg-orange-50/60 border border-orange-100">
            <i className="fa-solid fa-user-tie text-orange-500 text-xs block mb-1"></i>
            <span className="text-[10px] font-black text-orange-700 block">
              Trưởng Nhóm
            </span>
            <span className="text-[9px] text-orange-500 block font-medium">
              Kênh riêng
            </span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
            <i className="fa-solid fa-users text-indigo-500 text-xs block mb-1"></i>
            <span className="text-[10px] font-bold text-slate-700 block">
              Thành Viên
            </span>
            <span className="text-[9px] text-slate-400 block font-medium">
              Mua hàng
            </span>
          </div>
        </div>

        {/* Security Footer Note */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium relative z-10">
          <i className="fa-solid fa-shield-check text-emerald-600"></i>
          <span>Xác thực bảo mật qua Google OAuth 2.0 • An toàn 100%</span>
        </div>
      </div>
    </div>
  );
}
