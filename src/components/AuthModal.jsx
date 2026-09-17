import React, { useEffect } from "react";

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
            width: 280,
            text: "signin_with",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition cursor-pointer"
        >
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>

        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white text-2xl font-black mb-4 shadow-lg shadow-orange-500/30">
          <i className="fa-solid fa-layer-group"></i>
        </div>

        <h3 className="text-lg font-black text-slate-900 font-display mb-1">
          Đăng Nhập Multi-Tenant SaaS
        </h3>
        <p className="text-xs font-semibold text-slate-500 mb-6">
          Đăng nhập trực tiếp bằng tài khoản Google để truy cập hệ thống quản trị và tra cứu.
        </p>

        <div id="google-signin-btn-container" className="flex justify-center my-2 min-h-[44px]"></div>

        <p className="text-[11px] text-slate-400 mt-6 leading-relaxed">
          🔒 Quyền hạn (Super Admin / Admin Kênh / Khách hàng) được cấp tự động hoặc chỉ định trong Database.
        </p>
      </div>
    </div>
  );
}
