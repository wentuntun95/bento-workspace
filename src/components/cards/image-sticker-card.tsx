"use client";

import { createPortal } from "react-dom";
import { useRef, useState, useCallback, useEffect } from "react";
import { Trash2, Plus } from "lucide-react";
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

// ─── AddBtn（按 button-spec.md 规范）────────────────────────────────────────────
function AddBtn({ onImage, full, onClick, label = "添加图片" }: {
  onImage?: boolean; full?: boolean; onClick: () => void; label?: string;
}) {
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
      {label}
    </button>
  );
}

// ─── 历史下拉 ─────────────────────────────────────────────────────────────────
function HistoryDropdown({ onSelect, onUpload, onClose, anchorBottom }: {
  onSelect: (url: string) => void;
  onUpload: () => void;
  onClose: () => void;
  anchorBottom?: boolean; // true = 浮动模式，向上展开
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

  const posStyle: React.CSSProperties = anchorBottom
    ? { bottom: "calc(100% + 4px)", top: "auto" }
    : { top: "calc(100% + 4px)" };

  return (
    <div
      data-img-zone="true"
      className="absolute z-50 bg-white rounded-2xl flex flex-col gap-2 p-3"
      style={{
        ...posStyle,
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

// ─── ImageStickerGrid ──────────────────────────────────────────────────────────
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
  const [showDropdown,       setShowDropdown]       = useState(false);
  const [floatShowDropdown,  setFloatShowDropdown]  = useState(false);
  const [floatHovered,       setFloatHovered]       = useState(false);

  // 浮动本地坐标（drag/resize 用 ref 驱动，setState 用于渲染）
  const [fPos, setFPos] = useState({ x: imageCardX, y: imageCardY, w: imageCardW });
  const fRef = useRef(fPos);

  // 当 store 里 expanded 变为 true 时同步坐标
  useEffect(() => {
    if (imageCardExpanded) {
      const p = { x: imageCardX, y: imageCardY, w: imageCardW };
      setFPos(p); fRef.current = p;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageCardExpanded]);

  // 刷新后兜底：有图但浮动状态丢失 → 延迟到卡片 mounted 再恢复位置
  useEffect(() => {
    if (activeImageUrl && !imageCardExpanded) {
      const t = setTimeout(() => {
        const rect = cardRef.current?.getBoundingClientRect();
        setExpanded(true, rect?.left ?? 100, rect?.top ?? 100, rect?.width ?? 300);
      }, 100);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 上传处理（上传成功 → 直接弹出浮动）─────────────────────────────────────
  const triggerUpload = useCallback(() => {
    setShowDropdown(false);
    setFloatShowDropdown(false);
    setTimeout(() => fileRef.current?.click(), 50);
  }, []);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const { url, ar } = await compressImage(file);
    // 从卡片当前位置浮动（不居中）
    const rect = cardRef.current?.getBoundingClientRect();
    const initW = rect ? rect.width : 280;
    const initX = rect ? rect.left : 100;
    const initY = rect ? rect.top : 100;
    setActiveImage(url, ar);
    setExpanded(true, initX, initY, initW);
    if (fileRef.current) fileRef.current.value = "";
  }, [setActiveImage, setExpanded, cardRef]);

  const handleHistorySelect = useCallback((url: string) => {
    setShowDropdown(false);
    setFloatShowDropdown(false);
    const img = new Image();
    img.onload = () => {
      const ar = img.naturalWidth / img.naturalHeight;
      const rect = cardRef.current?.getBoundingClientRect();
      const initW = rect ? rect.width : 280;
      const initX = rect ? rect.left : 100;
      const initY = rect ? rect.top : 100;
      setActiveImage(url, ar);
      setExpanded(true, initX, initY, initW);
    };
    img.src = url;
  }, [setActiveImage, setExpanded, cardRef]);

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

  const hasImage  = !!activeImageUrl;
  const floatW    = fPos.w || 360;
  const floatH    = Math.round(floatW / (activeImageAR || 1));
  const showFloat = hasImage && imageCardExpanded;
  const showHoverControls = floatHovered || floatShowDropdown;

  return (
    <>
      {/* ── Grid 占位（始终固定尺寸，不随图片变化）──────────────────── */}
      <div
        ref={cardRef}
        data-img-zone="true"
        style={{
          position: "relative",
          height: "100%",
          width: "100%",
          borderRadius: 24,
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        {/* 空态：Photo 标题 + 添加按钮 */}
        {!hasImage && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ padding: "12px 12px 4px" }}>
              <span style={{ fontFamily: "var(--font-caveat)", fontWeight: 600, fontSize: 15, color: "#64748b" }}>
                Photo
              </span>
            </div>
            <div style={{ flex: 1 }} />
            <div data-img-zone="true" style={{ paddingBottom: 16, paddingLeft: 16, paddingRight: 16, position: "relative" }}>
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
        )}

        {/* 有图时：半透明占位（图片在浮动 portal）*/}
        {hasImage && (
          <div style={{
            position: "absolute", inset: 0,
            borderRadius: 24, overflow: "hidden",
            background: "rgba(0,0,0,0.04)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <img
              src={activeImageUrl!} alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.12 }}
              draggable={false}
            />
            <span style={{
              position: "absolute",
              fontSize: 11, color: "rgba(0,0,0,0.25)", fontFamily: "var(--font-caveat)",
            }}>
              浮动中 ↗
            </span>
          </div>
        )}
      </div>

      {/* ── 浮动 Overlay（始终通过 portal 展示图片）──────────────────────────── */}
      {showFloat && typeof document !== "undefined" && createPortal(
        <div
          data-img-zone="true"
          style={{
            position: "fixed", left: fPos.x, top: fPos.y,
            width: floatW, zIndex: 9990,
            borderRadius: 16, overflow: "visible",
            boxShadow: "0 16px 56px rgba(0,0,0,0.28)",
            cursor: "grab", userSelect: "none",
          }}
          onMouseEnter={() => setFloatHovered(true)}
          onMouseLeave={() => {
            if (!floatShowDropdown) setFloatHovered(false);
          }}
          onPointerDown={startMove}
        >
          {/* 图片 */}
          <div style={{ width: "100%", height: floatH, borderRadius: 16, overflow: "hidden" }}>
            <img
              src={activeImageUrl!} alt=""
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              draggable={false}
            />
          </div>

          {/* Hover 控件 */}
          {showHoverControls && (
            <>
              {/* 右上角删除 */}
              <button
                style={{ position: "absolute", top: 8, right: 8, zIndex: 10, ...ICON_BTN, color: "#ef4444" }}
                data-no-move="true"
                onPointerDown={e => e.stopPropagation()}
                onClick={clearActiveImage}
              >
                <Trash2 size={12} />
              </button>

              {/* 底部更换图片按钮 */}
              <div
                data-img-zone="true"
                style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  padding: "0 12px 12px", zIndex: 10,
                }}
              >
                <div style={{ position: "relative" }} data-img-zone="true">
                  <div onPointerDown={e => e.stopPropagation()} data-no-move="true">
                    <AddBtn full onImage onClick={() => setFloatShowDropdown(v => !v)} label="更换图片" />
                  </div>
                  {floatShowDropdown && (
                    <HistoryDropdown
                      onSelect={handleHistorySelect}
                      onUpload={triggerUpload}
                      onClose={() => { setFloatShowDropdown(false); setFloatHovered(false); }}
                    />
                  )}
                </div>
              </div>
            </>
          )}

          {/* SE resize 手柄（10×10）*/}
          <div
            style={{
              position: "absolute", right: -4, bottom: -4, zIndex: 20,
              width: 10, height: 10, borderRadius: 3,
              background: "white", border: "1.5px solid rgba(0,0,0,0.2)",
              cursor: "se-resize",
              boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
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
