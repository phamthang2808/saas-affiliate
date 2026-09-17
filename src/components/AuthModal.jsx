import React, { useEffect } from "react";
import logoImg from "../assets/logo.png";

export function AuthModal({ isOpen, onClose, onGoogleSuccess, clientId = "195858897824-4h5ffebs0djtuncmhod98o0ca495ju71.apps.googleusercontent.com" }) {
  useEffect(() => {
    if (!isOpen) return;

    let attempts = 0;
    const initializeGoogleBtn = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: onGoogleSuccess,
        });

        const btnElem = document.getElementById("google-signin-btn-container");
        if (btnElem) {
          btnElem.innerHTML = "";
          window.google.accounts.id.renderButton(btnElem, {
            theme: "outline",
            size: "large",
            width: 320,
            text: "continue_with",
            shape: "pill",
          });
        }
      }
    };

    if (!window.google?.accounts?.id) {
      const interval = setInterval(() => {
        attempts++;
        if (window.google?.accounts?.id || attempts > 30) {
          initializeGoogleBtn();
          clearInterval(interval);
        }
      }, 200);
      return () => clearInterval(interval);
    } else {
      initializeGoogleBtn();
    }
  }, [isOpen, onGoogleSuccess, clientId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-10 max-w-lg w-full shadow-2xl border border-slate-100/90 flex flex-col items-center text-center relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 bg-gradient-to-b from-orange-400/20 via-amber-400/10 to-transparent rounded-full blur-2xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 transition cursor-pointer border border-slate-100 shadow-2xs z-10"
          title="Đóng cửa sổ"
        >
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>

        {/* Brand Logo Card */}
        <div className="relative z-10 mb-4">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl p-3 bg-gradient-to-tr from-orange-50 to-amber-50 border-2 border-orange-200/90 flex flex-col items-center justify-center shadow-lg shadow-orange-500/10 mx-auto">
            <img
              src={logoImg}
              alt="28AffiHub Logo"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-md"
            />
          </div>
          <span className="inline-block mt-2 px-3 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-black uppercase tracking-wider border border-orange-200 font-display">
            28AffiHub Portal
          </span>
        </div>

        {/* Title & Subtitle */}
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-display mb-1.5 tracking-tight relative z-10">
          Đăng Nhập Nền Tảng Đối Soát
        </h3>
        <p className="text-xs sm:text-sm font-medium text-slate-500 mb-6 max-w-sm leading-relaxed relative z-10">
          Đăng nhập an toàn 1 chạm bằng tài khoản Google để truy cập Bảng Quản Trị & Đối Soát Hoa Hồng.
        </p>

        {/* Google Sign-in Container */}
        <div className="w-full flex flex-col items-center justify-center my-1 relative z-10">
          <div id="google-signin-btn-container" className="flex justify-center min-h-[48px]"></div>
        </div>

        {/* Role Permissions Box */}
        <div className="w-full mt-6 pt-5 border-t border-slate-100 grid grid-cols-3 gap-2 text-center relative z-10">
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
            <i className="fa-solid fa-crown text-amber-500 text-xs block mb-1"></i>
            <span className="text-[10px] font-bold text-slate-700 block">Super Admin</span>
            <span className="text-[9px] text-slate-400 block font-medium">Toàn sàn</span>
          </div>

          <div className="p-2 rounded-xl bg-orange-50/60 border border-orange-100">
            <i className="fa-solid fa-user-tie text-orange-500 text-xs block mb-1"></i>
            <span className="text-[10px] font-black text-orange-700 block">Trưởng Nhóm</span>
            <span className="text-[9px] text-orange-500 block font-medium">Kênh riêng</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
            <i className="fa-solid fa-users text-indigo-500 text-xs block mb-1"></i>
            <span className="text-[10px] font-bold text-slate-700 block">Thành Viên</span>
            <span className="text-[9px] text-slate-400 block font-medium">Mua hàng</span>
          </div>
        </div>

        {/* Security Footer Note */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200/80 relative z-10">
          <i className="fa-solid fa-shield-check text-emerald-600"></i>
          <span>Xác thực bảo mật qua Google OAuth 2.0 • An toàn 100%</span>
        </div>
      </div>
    </div>
  );
}
