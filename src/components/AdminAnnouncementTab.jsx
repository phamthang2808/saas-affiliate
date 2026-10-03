import React, { useEffect, useState, useRef } from "react";
import { AnnouncementModal } from "./AnnouncementModal";

export function AdminAnnouncementTab({ token, apiRoot }) {
  const [active, setActive] = useState(true);
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [content, setContent] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [showPreview, setShowPreview] = useState(false);

  const fileInputRef = useRef(null);

  // Lấy dữ liệu cấu hình thông báo hiện tại
  useEffect(() => {
    fetchAnnouncementConfig();
  }, [token, apiRoot]);

  const fetchAnnouncementConfig = async () => {
    try {
      setLoading(true);
      const root = apiRoot || "";
      const res = await fetch(`${root}/api/saas/super-admin/announcement`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data) {
          setActive(data.active ?? true);
          setTitle(data.title || "");
          setImageUrl(data.imageUrl || "");
          setTargetUrl(data.targetUrl || "");
          setContent(data.content || "");
        }
      }
    } catch (err) {
      console.error("Lỗi lấy cấu hình announcement:", err);
      setMessage({ text: "Không thể tải cấu hình thông báo", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Upload file ảnh banner từ máy tính
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ text: "Vui lòng chọn file hình ảnh hợp lệ!", type: "error" });
      return;
    }

    try {
      setUploading(true);
      setMessage({ text: "", type: "" });

      const formData = new FormData();
      formData.append("file", file);

      const root = apiRoot || "";
      const res = await fetch(`${root}/api/saas/super-admin/upload-image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setImageUrl(data.imageUrl);
        setMessage({ text: "Tải ảnh banner lên thành công!", type: "success" });
      } else {
        setMessage({ text: data.message || "Tải ảnh thất bại", type: "error" });
      }
    } catch (err) {
      console.error("Lỗi upload ảnh:", err);
      setMessage({ text: "Lỗi kết nối khi tải ảnh lên server", type: "error" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Lưu cấu hình
  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      setSaving(true);
      setMessage({ text: "", type: "" });

      const root = apiRoot || "";
      const res = await fetch(`${root}/api/saas/super-admin/announcement`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          active,
          title,
          imageUrl,
          targetUrl,
          content,
          targetAudience: "TENANT_ADMIN",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({
          text: "Đã lưu và cập nhật popup thông báo thành công! Các Trưởng Nhóm khi bấm vào mục Trưởng Nhóm sẽ nhìn thấy popup này.",
          type: "success",
        });
      } else {
        setMessage({ text: data.message || "Lưu cấu hình thất bại", type: "error" });
      }
    } catch (err) {
      console.error("Lỗi lưu cấu hình:", err);
      setMessage({ text: "Lỗi kết nối máy chủ", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const previewData = {
    active: true,
    title: title || "Tiêu đề thông báo mẫu",
    imageUrl: imageUrl,
    targetUrl: targetUrl,
    content: content || "Nội dung bài viết thông báo sẽ hiển thị ở đây.",
  };

  const getFullImgUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return url;
    }
    const root = apiRoot || "";
    return `${root}${url}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3 shadow-sm">
        <i className="fa-solid fa-spinner fa-spin text-2xl text-rose-500"></i>
        <p className="text-xs text-slate-500 font-semibold">Đang tải cấu hình thông báo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-bullhorn text-rose-500"></i> Cấu hình Thông Báo Popup cho Trưởng Nhóm
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Tạo bài viết, banner thông báo tự động bật lên khi Trưởng Nhóm truy cập trang quản trị Kênh (hỗ trợ nút không hiển thị lại)
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <i className="fa-solid fa-eye text-rose-500"></i> Xem trước Popup
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-md shadow-rose-200 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Đang lưu...
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk"></i> Lưu cấu hình
              </>
            )}
          </button>
        </div>
      </div>

      {/* Thông báo kết quả */}
      {message.text && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          <i
            className={`fa-solid ${
              message.type === "success" ? "fa-circle-check" : "fa-triangle-exclamation"
            }`}
          ></i>
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Details (2 cols) */}
        <div className="lg:col-span-2 space-y-5 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm">
          {/* Toggle Bật / Tắt */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div>
              <label htmlFor="active-toggle" className="text-xs font-bold text-slate-800 cursor-pointer block">
                Trạng thái hiển thị Popup
              </label>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {active
                  ? "Đang BẬT — Popup sẽ tự động bật lên khi Trưởng Nhóm truy cập trang quản trị Kênh"
                  : "Đang TẮT — Sẽ không hiển thị popup"}
              </p>
            </div>

            <button
              type="button"
              id="active-toggle"
              onClick={() => setActive(!active)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                active ? "bg-rose-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  active ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Tiêu đề */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tiêu đề thông báo / bài viết <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: 🔥 HOT – MÃ SHOPEE VIP GIẢM 30% TỐI ĐA 500K"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 text-slate-800"
            />
          </div>

          {/* Banner Upload & URL */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              Ảnh Banner (Tùy chọn)
            </label>

            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
                id="banner-file-input"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Đang tải ảnh...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-cloud-arrow-up"></i> Chọn ảnh từ máy tính
                  </>
                )}
              </button>

              <span className="text-xs text-slate-400 font-semibold">hoặc</span>

              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Dán link ảnh trực tiếp (https://...)"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-rose-500 text-slate-800"
                />
              </div>

              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="Xóa ảnh"
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              )}
            </div>

            {imageUrl && (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 max-h-48 flex items-center justify-center p-2">
                <img
                  src={getFullImgUrl(imageUrl)}
                  alt="Banner preview"
                  className="max-h-44 object-contain rounded-xl"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
            )}
          </div>

          {/* Link đích khi click vào Banner */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Link liên kết khi người dùng bấm vào Banner (Tùy chọn)
            </label>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="VD: https://shopee.vn/m/ma-giam-gia hoặc link sản phẩm"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-rose-500 text-slate-800"
            />
          </div>

          {/* Nội dung thông báo */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Nội dung chi tiết thông báo
              </label>
              <span className="text-[11px] text-slate-400 font-semibold">
                Hỗ trợ link, emoji, xuống dòng
              </span>
            </div>
            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`👉 Áp dụng ngành Thời trang, Sức khỏe & Làm đẹp
⏰ 0H mã lên tại banner: [Lưu mã ngay](https://shopee.vn)
(Back 9H – 12H – 15H – 20H – 0H)

⚠️ Lưu ý: Mã lên mới 0H đêm nay, nếu chưa săn kịp thì phải lưu được mã, khung đầu tiên rất dễ lưu mã. Nếu bỏ lỡ, các khung sau sẽ khó lưu hơn.
📌 Chỉ áp dụng cho sản phẩm đúng ngành hàng và có tag "Voucher Xtra" nhé!`}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-rose-500 text-slate-800 leading-relaxed font-mono"
            />
          </div>

          {/* Hướng dẫn định dạng */}
          <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-100 text-[11px] text-rose-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-rose-950">
              <i className="fa-solid fa-lightbulb text-amber-500"></i> Mẹo định dạng nội dung:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-rose-800">
              <li>
                Tạo chữ in đậm: Bọc chữ bằng 2 dấu sao, ví dụ: <code>**Chữ in đậm**</code>
              </li>
              <li>
                Gắn đường link rút gọn: <code>[Bấm vào đây để lưu mã](https://shopee.vn)</code>
              </li>
              <li>
                Dán link trực tiếp: Hệ thống sẽ tự động chuyển <code>https://...</code> thành link có thể bấm được.
              </li>
              <li>Sử dụng emoji: Thoải mái copy paste các icon như 🔥, ⏰, 👉, ⚠️, 📌 để bài viết bắt mắt!</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Preview mini card (1 col) */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <i className="fa-solid fa-mobile-screen text-slate-400"></i> Khung xem nhanh
            </h3>

            {/* Mini preview container */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-inner bg-slate-100 p-2 select-none">
              <div className="bg-white rounded-xl overflow-hidden shadow-md text-left">
                {imageUrl ? (
                  <img
                    src={getFullImgUrl(imageUrl)}
                    alt="preview"
                    className="w-full max-h-32 object-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-24 bg-gradient-to-r from-rose-500 to-orange-400 flex items-center justify-center text-white text-xs font-bold">
                    <i className="fa-solid fa-image mr-1.5"></i> Ảnh Banner
                  </div>
                )}

                <div className="p-3 space-y-1.5">
                  <h4 className="font-black text-xs text-slate-800 line-clamp-2">
                    {title || "🔥 TIÊU ĐỀ THÔNG BÁO"}
                  </h4>
                  <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-line">
                    {content || "Nội dung bài viết thông báo mã giảm giá..."}
                  </p>
                </div>

                <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <i className="fa-regular fa-square"></i> Không hiển thị lại
                  </span>
                  <span className="font-bold text-slate-700">Đóng</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <i className="fa-solid fa-expand"></i> Mở Popup thử nghiệm
            </button>
          </div>
        </div>
      </form>

      {/* Modal Preview Live */}
      {showPreview && (
        <AnnouncementModal
          apiRoot={apiRoot}
          previewData={previewData}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
