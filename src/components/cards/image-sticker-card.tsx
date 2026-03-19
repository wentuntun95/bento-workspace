"use client";

import { createPortal } from "react-dom";
import { useRef, useState, useCallback, useEffect } from "react";
import { Trash2, Minimize2, Plus } from "lucide-react";
import { useWorkspaceStore } from "@/lib/store";

// ─── 压缩 ─────────────────────────────────────────────────────────────────────
async function compressImage(file: File): Promise<{ url: string; ar: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const raw = URL.createObjectURL(file);
    img.onload = () => {
      const { naturalWidth: nw, naturalHeight: nh } = img;
      const s = Math.min(1, 900 / Math.max(nw, nh));
      const w = Math.round(nw * s), h = Math.round(nh * s);
      const cvs = document.createElement("canvas");
      cvs.width = w; cvs.height = h;
      cvs.getContext("2d")!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(raw);
      resolve({ url: cvs.toDataURL("image/jpeg", 0.75), ar: nw / nh });
    };
    img.onerror = reject;
    img.src = raw;
  });
}

const MIN_FLOAT = 100;

const ICON_BTN: React.CSSProperties = {
  background: "rgba(255,255,255,0.9)", border: "none", borderRadius: 8,
  padding: "4px 6px", cursor: "pointer", display: "flex", alignItems: "center",
  boxShadow: "0 1px 4px rgba(0,0,0,0.12)", backdropFilter: "blur(6px)",
};

// ─── + 添加图片 按钮（与其他组件一致：无底色，低透明度） ────────────────────
function AddBtn({ onImage, full, onClick }: { onImage?: boolean; full?: boolean; onClick: () => void }) {
  const defaultBg = onImage ? "rgba(255,255,255,0.6)" : "transparent";
  const hoverBg   = onImage ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.08)";
  return (
    <button
      onClick={onClick}
      className={[
        "flex items-center justify-center gap-1 py-1.5 px-4 rounded-lg text-[11px] font-semibold transition-colors",
        full ? "w-full" : "",
      ].join(" ")}
      style={{
        background: defaultBg,
        backdropFilter: onImage ? "blur(8px)" : undefined,
        color: "rgba(0,0,0,0.35)",
        border: "none", cursor: "pointer",
        fontFamily: "var(--font-caveat, cursive)",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
      onMouseLeave={e => (e.currentTarget.style.background = defaultBg)}
    >
      <Plus size={11} />
      添加图片
    </button>
  );
}

// ─── 历史下拉（absolute，无弹窗无遮罩）───────────────────────────────────────
function HistoryDropdown({ onSelect, onUpload, onClose }: {
  onSelect: (url: string) => void;
  onUpload: () => void;
  onClose: () => void;
}) {
  const imageHistory      = useWorkspaceStore(s => s.imageHistory);
  const removeFromHistory = useWorkspaceStore(s => s.removeFromImageHistory);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onOut = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest?.("[data-img-zone]")) onClose();
    };
    window.addEventListener("keydown", onKey);
    setTimeout(() => window.addEventListener("mousedown", onOut), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onOut);
    };
  }, [onClose]);

  return (
    <div
      data-img-zone="true"
      className="absolute z-50 bg-white rounded-2xl flex flex-col gap-2 p-3"
      style={{
        top: "calc(100% + 4px)",
        left: "50%", transform: "translateX(-50%)",
        width: 280,
        boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
        border: "1px solid rgba(0,0,0,0.07)",
      }}
    >
      <button
        className="w-full flex items-center gap-2 py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 text-[11px] font-semibold transition-colors whitespace-nowrap"
        onClick={onUpload}
      >
        <span className="text-sm leading-none">+</span> 上传新图
      </button>

      {imageHistory.length > 0 ? (
        <>
          <div className="text-[10px] text-slate-400 px-0.5">历史图片</div>
          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto scrollbar-none">
            {imageHistory.map((url, i) => (
              <div key={i}
                className="relative group aspect-square rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-amber-400 transition-all"
                onClick={() => onSelect(url)}
              >
                <img src={url} alt="" className="w-full h-full object-cover" draggable={false} />
                {/* 删除按钮放在左上角，更容易区分 */}
                <button
                  className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-full flex items-center justify-center bg-white/95 text-red-400 shadow-sm"
                  onClick={e => { e.stopPropagation(); removeFromHistory(url); }}
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-[11px] text-slate-400 text-center py-1">还没有历史图片</div>
      )}
    </div>
  );
}

// ─── ImageStickerGrid ──────────────────────────────────────────────────────
export function ImageStickerGrid() {
  const activeImageUrl    = useWorkspaceStore(s => s.activeImageUrl);
  const activeImageAR     = useWorkspaceStore(s => s.activeImageAspectRatio);
  const imageCardExpanded = useWorkspaceStore(s => s.imageCardExpanded);
  const imageCardX        = useWorkspaceStore(s => s.imageCardX);
  const imageCardY        = useWorkspaceStore(s => s.imageCardY);
  const imageCardW        = useWorkspaceStore(s => s.imageCardW);
  const setActiveImage    = useWorkspaceStore(s => s.setActiveImage);
  const clearActiveImage  = useWorkspaceStore(s => s.clearActiveImage);
  const setExpanded       = useWorkspaceStore(s => s.setImageCardExpanded);

  const fileRef  = useRef<HTMLInputElement>(null);
  const cardRef  = useRef<HTMLDivElement>(null);
  const [hovered,      setHovered]      = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // 浮动本地状态
  const [fPos, setFPos] = useState({ x: imageCardX, y: imageCardY, w: imageCardW });
  const fRef = useRef(fPos);
  useEffect(() => {
    if (imageCardExpanded) {
      const p = { x: imageCardX, y: imageCardY, w: imageCardW };
      setFPos(p); fRef.current = p;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageCardExpanded]);

  // ── 上传 ──────────────────────────────────────────────────────────────────
  const triggerUpload = useCallback(() => {
    setShowDropdown(false);
    // 稍微延迟，确保 dropdown 已关闭、状态稳定后再弹文件选择
    setTimeout(() => fileRef.current?.click(), 50);
  }, []);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const { url, ar } = await compressImage(file);
    setActiveImage(url, ar);
    if (fileRef.current) fileRef.current.value = "";
  }, [setActiveImage]);

  const handleHistorySelect = useCallback((url: string) => {
    setShowDropdown(false);
    const img = new Image();
    img.onload = () => setActiveImage(url, img.naturalWidth / img.naturalHeight);
    img.src = url;
  }, [setActiveImage]);

  // ── 展开浮动（从当前位置展开，不弹到屏幕中央）────────────────────────────
  const handleExpand = useCallback(() => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    // 从卡片当前位置展开，保持原始宽度（或稍大）
    const initW = Math.max(240, rect.width);
    setExpanded(true, rect.left, rect.top, initW);
  }, [setExpanded]);

  // ── 拖拽移位 ──────────────────────────────────────────────────────────────
  const startMove = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).dataset.noMove) return;
    e.preventDefault();
    const ox = e.clientX - fRef.current.x, oy = e.clientY - fRef.current.y;
    const onMove = (ev: PointerEvent) => {
      const p = { ...fRef.current, x: ev.clientX - ox, y: ev.clientY - oy };
      fRef.current = p; setFPos(p);
    };
    const onUp = () => {
      setExpanded(true, fRef.current.x, fRef.current.y, fRef.current.w);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [setExpanded]);

  // ── SE resize ─────────────────────────────────────────────────────────────
  const startResize = useCallback((e: React.PointerEvent) => {
    e.stopPropagation(); e.preventDefault();
    const startX = e.clientX, startW = fRef.current.w;
    const onMove = (ev: PointerEvent) => {
      const nw = Math.max(MIN_FLOAT, startW + (ev.clientX - startX));
      fRef.current = { ...fRef.current, w: nw };
      setFPos(p => ({ ...p, w: nw }));
    };
    const onUp = () => {
      setExpanded(true, undefined, undefined, fRef.current.w);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [setExpanded]);

  const hasImage   = !!activeImageUrl;
  const floatW     = fPos.w || 360;
  const floatH     = Math.round(floatW / (activeImageAR || 1));
  // hover 控件：鼠标在卡片上 OR 下拉菜单打开（避免移到菜单时卸载）
  const showHover  = hovered || showDropdown;

  return (
    <>
      {/* ── 卡片主体 ──────────────────────────────────────────────────── */}
      <div
        ref={cardRef}
        data-img-zone="true"
        style={{
          position: "relative",
          borderRadius: 24,
          // 空态：aspect-ratio 1:1 保证 1×1 格大小
          ...(!hasImage && !imageCardExpanded ? { aspectRatio: "1 / 1" } : {}),
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={(e) => {
          // 移入下拉菜单不关闭
          if (!(e.relatedTarget as HTMLElement)?.closest?.("[data-img-zone]")) {
            setHovered(false);
          }
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        {!hasImage ? (
          // ── 空态 ────────────────────────────────────────────────────
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ padding: "12px 12px 4px" }}>
              <span style={{ fontFamily: "var(--font-caveat)", fontWeight: 600, fontSize: 15, color: "#64748b" }}>
                Photo
              </span>
            </div>
            <div style={{ flex: 1 }} />
            {/* 底部按钮：px-4 pb-4 对齐 task-card p-4 */}
            <div style={{ paddingBottom: 16, paddingLeft: 16, paddingRight: 16, position: "relative" }}>
              <AddBtn full onClick={() => setShowDropdown(v => !v)} />
              {showDropdown && (
                <HistoryDropdown
                  onSelect={handleHistorySelect}
                  onUpload={triggerUpload}
                  onClose={() => setShowDropdown(false)}
                />
              )}
            </div>
          </div>

        ) : imageCardExpanded ? (
          // ── 浮动占位 ────────────────────────────────────────────────
          <div style={{ borderRadius: 24, overflow: "hidden" }}>
            <img
              src={activeImageUrl!} alt=""
              style={{ width: "100%", height: "auto", display: "block", opacity: 0.15 }}
              draggable={false}
            />
          </div>

        ) : (
          // ── 图片态：高随 ar 自适应 ───────────────────────────────────
          <>
            {/* 图片（内层 overflow:hidden 裁圆角）*/}
            <div style={{ borderRadius: 24, overflow: "hidden" }}>
              <img
                src={activeImageUrl!} alt=""
                style={{ width: "100%", height: "auto", display: "block" }}
                draggable={false}
              />
            </div>

            {/* 外层控件（不受 overflow:hidden 限制）*/}
            {showHover && (
              <>
                {/* 右上角删除 */}
                <button
                  style={{ position: "absolute", top: 8, right: 8, zIndex: 5, ...ICON_BTN, color: "#ef4444" }}
                  data-no-move="true"
                  onClick={clearActiveImage}
                >
                  <Trash2 size={12} />
                </button>

                {/* 底部全宽按钮，px-4 pb-4 对齐 task-card */}
                <div
                  data-img-zone="true"
                  style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    padding: "0 16px 16px", zIndex: 5,
                  }}
                >
                  <div style={{ position: "relative" }}>
                    <AddBtn full onImage onClick={() => setShowDropdown(v => !v)} />
                    {showDropdown && (
                      <HistoryDropdown
                        onSelect={handleHistorySelect}
                        onUpload={triggerUpload}
                        onClose={() => setShowDropdown(false)}
                      />
                    )}
                  </div>
                </div>

                {/* SE resize 手柄（贴合图片右下角）*/}
                <div
                  style={{
                    position: "absolute", right: 6, bottom: 6, zIndex: 10,
                    width: 14, height: 14, borderRadius: 5,
                    background: "rgba(255,255,255,0.9)",
                    border: "1.5px solid rgba(0,0,0,0.15)",
                    cursor: "se-resize",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                  }}
                  onClick={e => { e.stopPropagation(); handleExpand(); }}
                />
              </>
            )}
          </>
        )}
      </div>

      {/* ── 浮动 Overlay ──────────────────────────────────────────────── */}
      {imageCardExpanded && hasImage && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed", left: fPos.x, top: fPos.y,
            width: floatW, zIndex: 9990,
            borderRadius: 16, overflow: "visible",
            boxShadow: "0 16px 56px rgba(0,0,0,0.3)",
            cursor: "grab", userSelect: "none",
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onPointerDown={startMove}
        >
          <div style={{ width: "100%", height: floatH, borderRadius: 16, overflow: "hidden" }}>
            <img
              src={activeImageUrl!} alt=""
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              draggable={false}
            />
          </div>

          {hovered && (
            <>
              <button style={{ position: "absolute", top: 8, left: 8, ...ICON_BTN, color: "#374151" }}
                data-no-move="true" onPointerDown={e => e.stopPropagation()}
                onClick={() => setExpanded(false)}>
                <Minimize2 size={12} />
              </button>
              <button style={{ position: "absolute", top: 8, right: 8, ...ICON_BTN, color: "#ef4444" }}
                data-no-move="true" onPointerDown={e => e.stopPropagation()}
                onClick={clearActiveImage}>
                <Trash2 size={12} />
              </button>
            </>
          )}

          {/* SE 继续调整大小 */}
          <div
            style={{
              position: "absolute", right: -6, bottom: -6,
              width: 16, height: 16, borderRadius: 6,
              background: "white", border: "1.5px solid rgba(0,0,0,0.2)",
              cursor: "se-resize", zIndex: 20,
              boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            }}
            onPointerDown={startResize}
          />
        </div>,
        document.body
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </>
  );
}

// 保留旧导出兼容性
export function ImageStickerCard() { return null; }
export function AddImageStickerCard() { return null; }
