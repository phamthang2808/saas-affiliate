import React, { useState, useEffect } from "react";

export function AdminReelsConfigTab({ token, apiRoot, tenantSlug, showNotification }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Form states
  const [enabled, setEnabled] = useState(false);
  const [pageAccessToken, setPageAccessToken] = useState("");
  const [videoIds, setVideoIds] = useState("");
  const [minPrice, setMinPrice] = useState(100000);
  const [maxPrice, setMaxPrice] = useState(1600000);
  const [excludeFashion, setExcludeFashion] = useState(true);
  const [showToken, setShowToken] = useState(false);

  const notify = (msg, type = "info") => {
    if (typeof showNotification === "function") {
      showNotification(msg, type);
    } else {
      alert(msg);
    }
  };

  const loadConfig = async () => {
    if (!tenantSlug) return;
    try {
      setLoading(true);
      const root = apiRoot || "";
      const res = await fetch(`${root}/api/saas/admin/${tenantSlug}/reels-config`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setEnabled(!!data.enabled);
        setPageAccessToken(data.pageAccessToken || "");
        setVideoIds(data.videoIds || "");
        setMinPrice(data.minPrice != null ? data.minPrice : 100000);
        setMaxPrice(data.maxPrice != null ? data.maxPrice : 1600000);
        setExcludeFashion(data.excludeFashion !== undefined ? !!data.excludeFashion : true);
      } else {
        notify("Không thể tải cấu hình Reels từ máy chủ", "error");
      }
    } catch (err) {
      notify("Lỗi kết nối tải cấu hình: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, [tenantSlug]);

  const handleToggleEnabled = async (newVal) => {
    setEnabled(newVal);
    try {
      const root = apiRoot || "";
      const res = await fetch(`${root}/api/saas/admin/${tenantSlug}/reels-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled: newVal,
          pageAccessToken,
          videoIds,
          minPrice: Number(minPrice) || 100000,
          maxPrice: Number(maxPrice) || 1600000,
          excludeFashion,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        notify(newVal ? "Đã BẬT tính năng Mua qua Reels! ✨" : "Đã TẮT tính năng Mua qua Reels! ⛔", "success");
      } else {
        notify(data.message || "Lỗi cập nhật trạng thái", "error");
      }
    } catch (err) {
      notify("Lỗi lưu trạng thái: " + err.message, "error");
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const root = apiRoot || "";
      const res = await fetch(`${root}/api/saas/admin/${tenantSlug}/reels-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled,
          pageAccessToken,
          videoIds,
          minPrice: Number(minPrice) || 100000,
          maxPrice: Number(maxPrice) || 1600000,
          excludeFashion,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        notify(data.message || "Đã lưu cấu hình Reels thành công! 🎉", "success");
      } else {
        notify(data.message || "Lỗi lưu cấu hình", "error");
      }
    } catch (err) {
      notify("Lỗi kết nối khi lưu: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTestToken = async () => {
    if (!pageAccessToken.trim()) {
      notify("Vui lòng nhập Page Access Token trước khi kiểm tra!", "warning");
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);

      const sampleId = videoIds.trim().split(/[,\n\r;]+/)[0]?.trim() || "";
      const root = apiRoot || "";
      const res = await fetch(`${root}/api/saas/admin/${tenantSlug}/reels-test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pageAccessToken: pageAccessToken.trim(),
          reelId: sampleId,
        }),
      });

      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        notify("Kiểm tra Token thành công: Trang " + data.pageName, "success");
      } else {
        notify(data.message || "Token không hợp lệ hoặc đã hết hạn", "error");
      }
    } catch (err) {
      notify("Lỗi khi kiểm tra Token: " + err.message, "error");
    } finally {
      setTesting(false);
    }
  };

  const validVideoCount = videoIds
    .split(/[,\n\r;]+/)
    .map((v) => v.trim())
    .filter((v) => v.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Header Giới thiệu tab */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs relative overflow-hidden">
        <div className="flex items-start justify-between gap-4 flex-wrap relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-2">
              <i className="fa-brands fa-facebook"></i> Facebook Reels Affiliate Bot
            </div>
            <h2 className="text-xl font-black text-slate-800">
              Cấu Hình Tự Động Bình Luận "Mua Qua Reels"
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Tự động gửi bình luận chứa link Shopee vào các bài Facebook Reels của Fanpage theo thuật toán xoay vòng video (Round-Robin) và giới hạn khoảng giá đơn hàng nhằm <b>chống quét spam tuyệt đối</b>.
            </p>
          </div>

          <button
            type="button"
            onClick={loadConfig}
            disabled={loading}
            className="px-4 py-2 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <i className={`fa-solid fa-rotate ${loading ? "fa-spin text-blue-600" : ""}`}></i>
            <span>Làm mới cấu hình</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-600 mb-3"></i>
          <p className="text-xs font-bold text-slate-500">Đang tải cấu hình Facebook Reels...</p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* 1. KHỐI BẬT / TẮT TÍNH NĂNG */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <i className="fa-solid fa-power-off text-blue-600"></i>
                  <span>Trạng Thái Tính Năng Mua Qua Reels</span>
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Bật công tắc này để hệ thống hiển thị nút "Mua qua Reels" và kích hoạt bot bình luận
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => handleToggleEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                <span className={`ml-3 text-xs font-black ${enabled ? "text-emerald-600" : "text-slate-400"}`}>
                  {enabled ? "ĐANG BẬT" : "TẠM TẮT"}
                </span>
              </label>
            </div>
          </div>

          {/* 2. KHỐI FACEBOOK PAGE ACCESS TOKEN */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <i className="fa-solid fa-key text-blue-600"></i>
                  <span>Facebook Page Access Token (Graph API)</span>
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Token của Fanpage sở hữu các video Reels (cần đủ quyền <code>pages_manage_posts</code> và <code>pages_manage_engagement</code>)
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestToken}
                disabled={testing || !pageAccessToken.trim()}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {testing ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>Đang kiểm tra...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-shield-halved"></i>
                    <span>Kiểm tra Token</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={pageAccessToken}
                onChange={(e) => setPageAccessToken(e.target.value)}
                placeholder="Dán Facebook Page Access Token vào đây (bắt đầu bằng EAA...)"
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-2xl pl-4 pr-24 py-3 text-xs font-mono font-bold text-slate-800 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1 cursor-pointer"
              >
                <i className={`fa-solid ${showToken ? "fa-eye-slash" : "fa-eye"} mr-1`}></i>
                {showToken ? "Ẩn" : "Hiện"}
              </button>
            </div>

            {testResult && (
              <div className={`p-4 rounded-2xl border text-xs leading-relaxed transition animate-[fadeIn_0.2s_ease-out] ${
                testResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}>
                <div className="flex items-start gap-2.5">
                  <i className={`text-base mt-0.5 shrink-0 fa-solid ${
                    testResult.success ? "fa-circle-check text-emerald-600" : "fa-circle-xmark text-rose-600"
                  }`}></i>
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="font-bold">{testResult.message}</p>
                    {testResult.success && (
                      <div className="text-[11px] opacity-90 flex flex-wrap gap-x-4 gap-y-1 pt-1 font-mono">
                        <span><b>Page ID:</b> {testResult.pageId}</span>
                        <span><b>Page Name:</b> {testResult.pageName}</span>
                      </div>
                    )}
                    {testResult.reelValid !== undefined && (
                      <div className={`mt-2 pt-2 border-t text-[11px] ${
                        testResult.reelValid ? "border-emerald-200 text-emerald-700" : "border-rose-200 text-rose-700"
                      }`}>
                        {testResult.reelValid ? (
                          <span>✅ Video Reels ID: <b>{testResult.reelId}</b> hợp lệ & truy cập thành công!</span>
                        ) : (
                          <span>⚠️ {testResult.reelError}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. KHỐI DANH SÁCH VIDEO REELS LUÂN CHUYỂN */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <i className="fa-solid fa-film text-blue-600"></i>
                  <span>Danh Sách Video Reels Luân Chuyển (Round-Robin)</span>
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Nhập mỗi dòng 1 link Facebook Reel hoặc 1 mã Reel ID. Bot sẽ tự động xoay vòng lần lượt để tránh dồn cmt vào 1 video.
                </p>
              </div>

              <span className="text-xs font-black px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                <i className="fa-solid fa-list-ol mr-1"></i>
                Đang có: {validVideoCount} video
              </span>
            </div>

            <textarea
              rows={4}
              value={videoIds}
              onChange={(e) => setVideoIds(e.target.value)}
              placeholder={"Ví dụ:\n1509788077681223\nhttps://www.facebook.com/reel/9876543210123456/\nhttps://www.facebook.com/reel/1122334455667788/"}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white rounded-2xl p-4 text-xs font-mono font-bold text-slate-800 outline-none leading-relaxed transition resize-y"
            />
          </div>

          {/* 4. KHỐI ĐIỀU KIỆN LỌC SẢN PHẨM */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-6">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <i className="fa-solid fa-sliders text-blue-600"></i>
                <span>Điều Kiện Tự Động Gắn Link Reels</span>
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Thiết lập khoảng giá sản phẩm và danh mục phù hợp để bảo vệ video Fanpage
              </p>
            </div>

            {/* Khoảng giá Min - Max */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Giá sản phẩm tối thiểu (Min Price)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-blue-600"
                  />
                  <span className="text-xs font-bold text-slate-500 whitespace-nowrap">VNĐ</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  Sản phẩm dưới mức này sẽ bỏ qua không gắn Reels.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Giá sản phẩm tối đa (Max Price)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:border-blue-600"
                  />
                  <span className="text-xs font-bold text-slate-500 whitespace-nowrap">VNĐ</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  Sản phẩm trên mức này sẽ bỏ qua không gắn Reels.
                </p>
              </div>
            </div>

            {/* Checkbox Bỏ qua Thời trang hoa hồng sàn > 2.5% */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4 flex-wrap">
              <div className="max-w-xl">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-shirt text-blue-600"></i>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                    Tự động bỏ qua ngành Thời trang (Hoa hồng Shopee đúng 7%)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Chỉ nhận diện là Thời trang khi hoa hồng sàn Shopee <b>ĐÚNG 7%</b> (không hơn, không kém). Các sản phẩm khác hoa hồng trên 7% vẫn được gắn Reels bình thường.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludeFashion}
                  onChange={(e) => setExcludeFashion(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-13 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-emerald-500"></div>
                <span className="ml-3 text-xs font-black text-slate-700 whitespace-nowrap">
                  {excludeFashion ? "ĐANG BẬT BỎ QUA" : "TẮT BỎ QUA"}
                </span>
              </label>
            </div>
          </div>

          {/* 5. NÚT LƯU CẤU HÌNH */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-blue-600/20 hover:shadow-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Đang lưu cấu hình...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk"></i>
                  <span>Lưu Cấu Hình Facebook Reels</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

