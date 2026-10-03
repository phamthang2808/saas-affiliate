import React, { useEffect, useState } from "react";

export function AnnouncementModal({ apiRoot, previewData = null, onClose = null }) {
  const [announcement, setAnnouncement] = useState(previewData);
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (previewData) {
      setAnnouncement(previewData);
      setIsOpen(true);
      return;
    }

    const fetchAnnouncement = async () => {
      try {
        const root = apiRoot || "";
        const res = await fetch(`${root}/api/saas/public/announcement`);
        if (res.status === 204 || !res.ok) return;

        const data = await res.json();
        if (!data || !data.active) return;
        if (!data.title && !data.imageUrl && !data.content) return;

        // Kiểm tra xem nhóm trưởng đã chọn "Không hiển thị lại" cho bản thông báo này chưa
        const dismissKey = `saas_announcement_dismiss_${data.id || "0"}_${data.updatedAt || ""}`;
        if (localStorage.getItem(dismissKey) === "true") {
          return;
        }

        // Kiểm tra session nếu vừa tắt trong phiên duyệt web hiện tại
        const sessionKey = `saas_announcement_closed_session_${data.id || "0"}`;
        if (sessionStorage.getItem(sessionKey) === "true") {
          return;
        }

        setAnnouncement(data);
        // Mở popup sau hiệu ứng nhẹ 350ms
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 350);
        return () => clearTimeout(timer);
      } catch (err) {
        console.error("Lỗi tải thông báo popup:", err);
      }
    };

    fetchAnnouncement();
  }, [apiRoot, previewData]);

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) {
      onClose();
      return;
    }

    if (announcement) {
      if (dontShowAgain) {
        const dismissKey = `saas_announcement_dismiss_${announcement.id || "0"}_${announcement.updatedAt || ""}`;
        localStorage.setItem(dismissKey, "true");
      } else {
        const sessionKey = `saas_announcement_closed_session_${announcement.id || "0"}`;
        sessionStorage.setItem(sessionKey, "true");
      }
    }
  };

  if (!isOpen || !announcement) return null;

  // Hàm chuyển đổi Markdown/URL thành HTML an toàn
  const renderFormattedContent = (text) => {
    if (!text) return null;

    const lines = text.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <div key={idx} className="h-2" />;
      }

      // Xử lý link dạng [Tên link](url) và link thuần https://...
      const linkRegex = /\[(.*?)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+)/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = linkRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }

        if (match[1] && match[2]) {
          // [text](url)
          parts.push(
            <a
              key={match.index}
              href={match[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-rose-600 hover:text-rose-700 underline font-bold transition inline-flex items-center gap-1"
            >
              {match[1]} <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
            </a>
          );
        } else if (match[3]) {
          // URL thuần
          parts.push(
            <a
              key={match.index}
              href={match[3]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-rose-600 hover:text-rose-700 underline font-semibold transition"
            >
              {match[3]}
            </a>
          );
        }
        lastIndex = linkRegex.lastIndex;
      }

      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      // Đổi **in đậm**
      const processedParts = parts.map((part, pIdx) => {
        if (typeof part !== "string") return part;
        const boldRegex = /\*\*(.*?)\*\*/g;
        const subParts = [];
        let bLast = 0;
        let bMatch;
        while ((bMatch = boldRegex.exec(part)) !== null) {
          if (bMatch.index > bLast) {
            subParts.push(part.substring(bLast, bMatch.index));
          }
          subParts.push(
            <strong key={bMatch.index} className="font-bold text-slate-900">
              {bMatch[1]}
            </strong>
          );
          bLast = boldRegex.lastIndex;
        }
        if (bLast < part.length) {
          subParts.push(part.substring(bLast));
        }
        return <React.Fragment key={pIdx}>{subParts}</React.Fragment>;
      });

      return (
        <p key={idx} className="text-slate-700 text-sm leading-relaxed">
          {processedParts}
        </p>
      );
    });
  };

  const getFullImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return url;
    }
    const root = apiRoot || "";
    return `${root}${url}`;
  };

  const bannerImg = getFullImageUrl(announcement.imageUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.25s_ease-out]">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={handleClose}></div>

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-[540px] sm:max-w-[580px] max-h-[94vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-[scaleUp_0.25s_ease-out] border border-slate-100">
        {/* Floating Close Button (X) */}
        <button
          onClick={handleClose}
          type="button"
          aria-label="Đóng"
          className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-rose-600 shadow-md flex items-center justify-center transition cursor-pointer backdrop-blur-sm border border-slate-200/50"
        >
          <i className="fa-solid fa-xmark text-sm font-bold"></i>
        </button>

        {/* Banner Image */}
        {bannerImg && (
          <div className="w-full relative bg-slate-100/70 overflow-hidden select-none border-b border-slate-100 flex items-center justify-center">
            {announcement.targetUrl ? (
              <a
                href={announcement.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full cursor-pointer group"
              >
                <img
                  src={bannerImg}
                  alt={announcement.title || "Banner thông báo"}
                  className="w-full h-auto max-h-[380px] sm:max-h-[440px] object-contain sm:object-cover object-center group-hover:opacity-95 transition"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </a>
            ) : (
              <img
                src={bannerImg}
                alt={announcement.title || "Banner thông báo"}
                className="w-full h-auto max-h-[380px] sm:max-h-[440px] object-contain sm:object-cover object-center"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-3 flex-1 scrollbar-thin">
          {announcement.title && (
            <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug tracking-tight">
              {announcement.title}
            </h2>
          )}

          {announcement.content && (
            <div className="space-y-1.5 text-xs sm:text-sm">
              {renderFormattedContent(announcement.content)}
            </div>
          )}
        </div>

        {/* Footer with Checkbox */}
        <div className="px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none hover:text-slate-900 transition">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer accent-rose-600"
            />
            <span>Không hiển thị lại</span>
          </label>

          <button
            onClick={handleClose}
            type="button"
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
