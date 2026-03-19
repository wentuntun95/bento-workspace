"use client";

import { useEffect, useState, useId } from "react";

type Scene = "sunny" | "cloudy" | "rainy" | "snowy" | "stormy" | "night" | "windy";
interface WMOEntry { label: string; scene: Scene }
const WMO: Record<number, WMOEntry> = {
  0:  { label: "晴",    scene: "sunny"  },
  1:  { label: "晴间多云", scene: "cloudy" },
  2:  { label: "多云",  scene: "cloudy" },
  3:  { label: "阴",    scene: "cloudy" },
  45: { label: "雾",    scene: "cloudy" },
  48: { label: "浓雾",  scene: "cloudy" },
  51: { label: "细雨",  scene: "rainy"  },
  53: { label: "小雨",  scene: "rainy"  },
  55: { label: "中雨",  scene: "rainy"  },
  61: { label: "小雨",  scene: "rainy"  },
  63: { label: "中雨",  scene: "rainy"  },
  65: { label: "大雨",  scene: "rainy"  },
  71: { label: "小雪",  scene: "snowy"  },
  73: { label: "中雪",  scene: "snowy"  },
  75: { label: "大雪",  scene: "snowy"  },
  80: { label: "阵雨",  scene: "rainy"  },
  82: { label: "暴雨",  scene: "stormy" },
  85: { label: "大风雪", scene: "windy"  },
  86: { label: "暴风雪", scene: "windy"  },
  95: { label: "雷暴",  scene: "stormy" },
};
const getEntry = (code: number): WMOEntry => {
  if (WMO[code]) return WMO[code];
  if (code >= 51 && code <= 67) return { label: "小雨", scene: "rainy" };
  if (code >= 71 && code <= 77) return { label: "中雪", scene: "snowy" };
  if (code >= 80 && code <= 82) return { label: "阵雨", scene: "rainy" };
  return { label: "—", scene: "cloudy" };
};

// 柔和透明背景 tint（叠在白色毛玻璃上）
const TINT: Record<Scene, string> = {
  sunny:  "rgba(255,248,200,0.82)",
  cloudy: "rgba(235,243,252,0.82)",
  rainy:  "rgba(220,236,255,0.82)",
  snowy:  "rgba(225,240,255,0.82)",
  stormy: "rgba(230,225,250,0.82)",
  night:  "rgba(228,225,248,0.82)",
  windy:  "rgba(240,238,234,0.82)",
};

// ─── SVG 插画 ─────────────────────────────────────────────────

function SunIllust() {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <defs>
        <radialGradient id="sg" cx="50%" cy="50%" r="50%">
          <stop offset="40%" stopColor="#FFFDE7" stopOpacity="0.95"/>
          <stop offset="100%" stopColor="#FFF8E1" stopOpacity="0"/>
        </radialGradient>
      </defs>
      {/* 白色阳光光晕 */}
      <circle cx="50" cy="50" r="46" fill="url(#sg)"/>
      {/* 8-pointed star：外R=36 内r=28 → 中心大、角小、更圆 */}
      <polygon
        points="50,14 60.7,24.1 75.5,24.5 75.9,39.3 86,50 75.9,60.7 75.5,75.5 60.7,75.9 50,86 39.3,75.9 24.5,75.5 24.1,60.7 14,50 24.1,39.3 24.5,24.5 39.3,24.1"
        fill="#FFDB44"
        style={{ animation: "sun-ill 20s linear infinite", transformOrigin: "50px 50px" }}
      />
      {/* 困眼 */}
      <path d="M35,47 Q38.5,52 42,47" stroke="#6b4e10" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
      <path d="M52,45 Q55.5,50 59,45" stroke="#6b4e10" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
      {/* 鼻点 */}
      <circle cx="47" cy="55" r="1.8" fill="#6b4e10" opacity="0.7"/>
      {/* 蓝色汗珠 */}
      <path d="M67,43 Q73,47 73,54 A6,6,0,0,1,61,54 Q61,47 67,43 Z" fill="#88ccee" opacity="0.9"/>
      <path d="M61,32 Q65,36 65,41 A4,4,0,0,1,57,41 Q57,36 61,32 Z" fill="#a8ddf4" opacity="0.85"/>
      <circle cx="64" cy="26" r="3" fill="#c0e8f8" opacity="0.75"/>
    </svg>
  );
}

function RainIllust() {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <g style={{ animation: "float-ill 3s ease-in-out infinite", transformOrigin:"50px 50px" }}>
        {/* 极宽扁云体 */}
        <ellipse cx="50" cy="63" rx="42" ry="12" fill="#b8dcf5"/>
        <ellipse cx="22" cy="53" rx="16" ry="13" fill="#b8dcf5"/>
        <ellipse cx="48" cy="43" rx="24" ry="19" fill="#b8dcf5"/>
        <ellipse cx="74" cy="54" rx="18" ry="13" fill="#b8dcf5"/>
        {/* 水平 >~< 表情，同一水平线 */}
        {/* 左 >：两条线从左上和左下汇聚到右尖 */}
        <path d="M35,47 L42,51 L35,55" stroke="#2a4070" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        {/* 中间 ~ 波浪鼻 */}
        <path d="M45,51 Q47,49 50,51 Q52,53 55,51" stroke="#2a4070" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        {/* 右 <：两条线从右上和右下汇聚到左尖 */}
        <path d="M65,47 L58,51 L65,55" stroke="#2a4070" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
      {/* 两个不等大泪滴 */}
      <path d="M38,76 Q31,80 31,86 A7,7,0,0,0,45,86 Q45,80 38,76 Z"
        fill="#88b8e0" opacity="0.9" style={{ animation: "rain-ill 1.5s ease-in 0s infinite" }}/>
      <path d="M59,78 Q54,81 54,86 A5.5,5.5,0,0,0,64,86 Q64,81 59,78 Z"
        fill="#88b8e0" opacity="0.78" style={{ animation: "rain-ill 1.5s ease-in 0.5s infinite" }}/>
    </svg>
  );
}

function CloudIllust() {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <g style={{ animation: "float-ill 4s ease-in-out infinite", transformOrigin:"50px 50px" }}>
        <ellipse cx="50" cy="55" rx="30" ry="20" fill="#c8d8e8" opacity="0.9"/>
        <ellipse cx="28" cy="57" rx="20" ry="16" fill="#c8d8e8" opacity="0.9"/>
        <ellipse cx="72" cy="56" rx="18" ry="15" fill="#c8d8e8" opacity="0.9"/>
        <ellipse cx="40" cy="42" rx="20" ry="17" fill="#d0dce8" opacity="0.9"/>
        <ellipse cx="62" cy="44" rx="17" ry="15" fill="#d0dce8" opacity="0.9"/>
        <path d="M36,53 Q40,50 44,53" stroke="#6080a0" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M56,51 Q60,48 64,51" stroke="#6080a0" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M43,60 Q50,65 57,60" stroke="#6080a0" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <text x="68" y="38" fontSize="8" fill="#8098b8" fontWeight="700" opacity="0.7"
          style={{animation: "zfloat 2s ease-in-out infinite"}}>z</text>
        <text x="75" y="30" fontSize="6" fill="#8098b8" fontWeight="700" opacity="0.5"
          style={{animation: "zfloat 2s ease-in-out 0.4s infinite"}}>z</text>
      </g>
    </svg>
  );
}

/**
 * 新月：outer(45,55)r=32 - inner(62,46)r=28
 * clipPath 把整体裁剪到外圆，彻底消除内圆延伸到外圆外的多余填充
 */
function NightIllust() {
  const uid = useId();
  const clipId = `nc-${uid.replace(/:/g, "")}`;

  const outerPath = "M45,23 A32,32,0,0,1,77,55 A32,32,0,0,1,45,87 A32,32,0,0,1,13,55 A32,32,0,0,1,45,23 Z";
  const innerPath = "M62,18 A28,28,0,0,1,90,46 A28,28,0,0,1,62,74 A28,28,0,0,1,34,46 A28,28,0,0,1,62,18 Z";

  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%"
      style={{ animation: "float-ill 4s ease-in-out infinite" }}>
      <defs>
        <clipPath id={clipId}>
          <circle cx="45" cy="55" r="32"/>
        </clipPath>
      </defs>
      {/* 新月 = outer - inner，clipPath 剪到外圆范围 */}
      <g clipPath={`url(#${clipId})`}>
        <path fillRule="evenodd" fill="#FFE566" d={`${outerPath} ${innerPath}`}/>
      </g>
      {/* 睡帽：右移+8 上移-6，遮住月亮顶部 */}
      <path d="M19,38 Q30,14 46,22 L38,38 Z" fill="#b399e0"/>
      <ellipse cx="28" cy="38" rx="12" ry="6" fill="#b399e0"/>
      <circle cx="46" cy="20" r="3.5" fill="#e0d0ff"/>
      <circle cx="41" cy="15" r="1.5" fill="rgba(255,255,255,0.9)"/>
      <circle cx="35" cy="22" r="1"   fill="rgba(255,255,255,0.7)"/>
      {/* 眯眼：左侧腹部 */}
      <path d="M16,64 Q19,61 22,64" stroke="#8a6a0e" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M27,59 Q30,56 33,59" stroke="#8a6a0e" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <ellipse cx="14" cy="68" rx="4" ry="2.5" fill="#ffb6c1" opacity="0.6"/>
      {/* z 浮字（新月右侧空白处）*/}
      <text x="60" y="46" fontSize="10" fill="#b399e0" fontWeight="700"
        style={{ animation: "zfloat 2.2s ease-in-out infinite" }}>z</text>
      <text x="68" y="35" fontSize="7"  fill="#c8b0f0" fontWeight="700"
        style={{ animation: "zfloat 2.2s ease-in-out 0.6s infinite" }}>z</text>
    </svg>
  );
}


function StormIllust() {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      <g style={{ animation: "float-ill 2.5s ease-in-out infinite", transformOrigin:"50px 45px" }}>
        <ellipse cx="50" cy="48" rx="28" ry="18" fill="#9888d0"/>
        <ellipse cx="28" cy="52" rx="18" ry="14" fill="#9888d0"/>
        <ellipse cx="72" cy="51" rx="16" ry="13" fill="#9888d0"/>
        <ellipse cx="40" cy="36" rx="18" ry="16" fill="#9888d0"/>
        <ellipse cx="62" cy="38" rx="15" ry="13" fill="#9888d0"/>
        {/* (๑•̌.•๑) 表情 */}
        {/* 愤怒眉：左内斜右内斜，短粗 */}
        <path d="M36,42 L40,39" stroke="#1a1840" strokeWidth="2.8" strokeLinecap="round"/>
        <path d="M60,39 L64,42" stroke="#1a1840" strokeWidth="2.8" strokeLinecap="round"/>
        {/* 眉下小刻线（愤怒细节）*/}
        <path d="M37,44 L40,42" stroke="#1a1840" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M60,42 L63,44" stroke="#1a1840" strokeWidth="1.6" strokeLinecap="round"/>
        {/* 手绘感不规则小腮红 */}
        <path d="M28,50 Q31,47 35,49 Q34,53 30,52 Z" fill="#f9b8c2" opacity="0.75"/>
        <path d="M65,49 Q69,47 72,50 Q71,54 67,52 Z" fill="#f9b8c2" opacity="0.75"/>
        {/* 小 o 形嘴 */}
        <circle cx="50" cy="53" r="2.8" fill="none" stroke="#1a1840" strokeWidth="1.6"/>
      </g>

      {/* Z 字闪电：一大两小描边，#ffe844 */}
      {/* 大闪电（居中）*/}
      <path d="M44,64 L58,64 L44,82 L56,82" fill="none" stroke="#ffe844" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ animation: "bolt-ill 1.8s step-end infinite" }}/>
      {/* 左小闪电 */}
      <path d="M30,68 L38,68 L30,80 L37,80" fill="none" stroke="#ffe844" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ animation: "bolt-ill 1.8s step-end 0.3s infinite" }}/>
      {/* 右小闪电 */}
      <path d="M63,68 L71,68 L63,80 L70,80" fill="none" stroke="#ffe844" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ animation: "bolt-ill 1.8s step-end 0.6s infinite" }}/>

      {/* 手绘感小雨滴 #9888d0 */}
      <path d="M28,72 Q24,76 24,81 Q25,86 28,87 Q31,86 32,81 Q32,76 28,72 Z"
        fill="#9888d0" opacity="0.88"/>
      <path d="M70,74 Q66,78 66,83 Q67,88 70,89 Q73,88 74,83 Q74,78 70,74 Z"
        fill="#9888d0" opacity="0.78"/>
    </svg>
  );
}

/** 镂空 ❀ 花形 */
function SnowFlake({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <text x={cx} y={cy + r * 0.42} textAnchor="middle"
      fontSize={r * 2.1} fill="none" stroke="#8bbfb8" strokeWidth="0.9"
      style={{ userSelect: "none" }}>❀</text>
  );
}

/** 雪＆云：真白宽云 + 豆豆眼 + ❄ emoji雪花 + 菱形冰晶 */
function SnowIllust() {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      {/* 奶白宽云 */}
      <g style={{ animation: "float-ill 4s ease-in-out infinite", transformOrigin:"50px 40px" }}>
        <ellipse cx="50" cy="50" rx="38" ry="14" fill="#fafaf8"/>
        <ellipse cx="24" cy="42" rx="16" ry="14" fill="#fafaf8"/>
        <ellipse cx="48" cy="34" rx="22" ry="18" fill="#fafaf8"/>
        <ellipse cx="72" cy="43" rx="16" ry="13" fill="#fafaf8"/>
        {/* 豆豆眼 */}
        <circle cx="42" cy="40" r="2.5" fill="#444"/>
        <circle cx="58" cy="39" r="2.5" fill="#444"/>
        {/* 腮红 */}
        <ellipse cx="37" cy="44" rx="5" ry="3" fill="#f9b8c2" opacity="0.65"/>
        <ellipse cx="63" cy="43" rx="5" ry="3" fill="#f9b8c2" opacity="0.65"/>
        {/* 小笑 */}
        <path d="M45,46 Q50,50 55,46" stroke="#555" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      </g>

      {/* 插画风 SVG 雪花 */}
      <g style={{ animation: "float-ill 4s ease-in-out 0.2s infinite" }}>
        <SnowFlake cx={36} cy={82} r={11}/>
      </g>
      <g style={{ animation: "float-ill 4s ease-in-out 0.8s infinite" }}>
        <SnowFlake cx={62} cy={83} r={9}/>
      </g>

      {/* 菱形冰晶 */}
      <polygon points="15,55 19,60 15,65 11,60" fill="#c8e0f0" opacity="0.75"
        style={{ animation: "snow-ill 3s ease-in-out 0.5s infinite alternate" }}/>
      <polygon points="82,65 86,71 82,77 78,71" fill="#c8e0f0" opacity="0.65"
        style={{ animation: "snow-ill 3s ease-in-out 1.2s infinite alternate" }}/>
      <polygon points="8,78 11,83 8,88 5,83" fill="#d0e8f8" opacity="0.6"
        style={{ animation: "snow-ill 3s ease-in-out 0.9s infinite alternate" }}/>
    </svg>
  );
}

function WindyIllust() {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      {/* 奶山色宽云 */}
      <g style={{ animation: "float-ill 3s ease-in-out infinite", transformOrigin:"50px 45px" }}>
        <ellipse cx="50" cy="53" rx="40" ry="13" fill="#ede8e0"/>
        <ellipse cx="24" cy="45" rx="17" ry="14" fill="#ede8e0"/>
        <ellipse cx="50" cy="38" rx="23" ry="18" fill="#ede8e0"/>
        <ellipse cx="74" cy="46" rx="17" ry="13" fill="#ede8e0"/>
        {/* 豆豆眼 */}
        <circle cx="44" cy="42" r="2" fill="#444"/>
        <circle cx="56" cy="41" r="2" fill="#444"/>
        {/* 腮红 */}
        <ellipse cx="40" cy="46" rx="5" ry="3" fill="#f9b8c2" opacity="0.6"/>
        <ellipse cx="60" cy="45" rx="5" ry="3" fill="#f9b8c2" opacity="0.6"/>
        {/* v 形小嘴 */}
        <path d="M46,48 L50,52 L54,48" stroke="#555" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </g>

      {/* 右侧 )) 形风弧（向下弓） */}
      <path d="M80,42 Q87,50 80,58" fill="none" stroke="#8baabb" strokeWidth="2.8" strokeLinecap="round"
        style={{ animation: "float-ill 2.2s ease-in-out infinite" }}/>
      <path d="M85,44 Q93,52 85,60" fill="none" stroke="#8baabb" strokeWidth="2" strokeLinecap="round"
        style={{ animation: "float-ill 2.2s ease-in-out 0.5s infinite" }}/>

      {/* 云底并行两条顺向弧 */}
      <path d="M36,66 Q47,73 58,66" fill="none" stroke="#8baabb" strokeWidth="2.5" strokeLinecap="round"
        style={{ animation: "float-ill 2s ease-in-out 0.2s infinite" }}/>
      <path d="M36,73 Q47,80 58,73" fill="none" stroke="#8baabb" strokeWidth="2" strokeLinecap="round"
        style={{ animation: "float-ill 2s ease-in-out 0.6s infinite" }}/>

      {/* 绿叶包围云朵：左中/右上/右下三角分布 */}
      {/* 左中叶 */}
      <g transform="translate(8,47) rotate(120)" style={{ animation: "float-ill 3.5s ease-in-out 0.2s infinite" }}>
        <path d="M0,-5 Q5,-2 4,1 Q2,5 0,6 Q-4,4 -4,1 Q-4,-2 0,-5 Z" fill="#8bbfb8"/>
        <line x1="0" y1="6" x2="0" y2="9" stroke="#6aaaa3" strokeWidth="1.2" strokeLinecap="round"/>
      </g>
      {/* 右上叶 */}
      <g transform="translate(82,20) rotate(110)" style={{ animation: "float-ill 3s ease-in-out 0.4s infinite" }}>
        <path d="M0,-5 Q5,-2 4,1 Q2,5 0,6 Q-4,4 -4,0 Q-4,-2 0,-5 Z" fill="#8bbfb8"/>
        <line x1="0" y1="6" x2="0" y2="9" stroke="#6aaaa3" strokeWidth="1.2" strokeLinecap="round"/>
      </g>
      {/* 右下叶（小） */}
      <g transform="translate(84,70) rotate(45)" style={{ animation: "float-ill 4s ease-in-out 0.9s infinite" }}>
        <path d="M0,-4 Q4,-1 3,1 Q2,4 0,5 Q-3,3 -3,0 Q-3,-2 0,-4 Z" fill="#8bbfb8" opacity="0.85"/>
        <line x1="0" y1="5" x2="0" y2="8" stroke="#6aaaa3" strokeWidth="1" strokeLinecap="round"/>
      </g>
    </svg>
  );
}

function WeatherIllust({ scene }: { scene: Scene }) {
  switch (scene) {
    case "sunny":  return <SunIllust />;
    case "rainy":  return <RainIllust />;
    case "snowy":  return <SnowIllust />;
    case "stormy": return <StormIllust />;
    case "night":  return <NightIllust />;
    case "windy":  return <WindyIllust />;
    default:       return <CloudIllust />;
  }
}

// ─── 主组件 ───────────────────────────────────────────────────────
interface WeatherData { temp: number; tempMax: number; tempMin: number; code: number; city: string; }

export function WeatherCard() {
  const [data,    setData]    = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lon } }) => {
        try {
          const [wRes, gRes] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
              `&current=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min&timezone=auto`),
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=zh`),
          ]);
          const w = await wRes.json();
          const g = await gRes.json();
          const a = g.address;
          setData({
            temp:    Math.round(w.current.temperature_2m),
            tempMax: Math.round(w.daily.temperature_2m_max[0]),
            tempMin: Math.round(w.daily.temperature_2m_min[0]),
            code:    w.current.weathercode,
            city:    a.city || a.county || a.state || a.country || "未知",
          });
        } catch { setError("获取失败"); }
        finally  { setLoading(false); }
      },
      () => { setError("需要位置权限"); setLoading(false); }
    );
  }, []);

  const isNight = new Date().getHours() >= 18 || new Date().getHours() < 6;
  const entry   = data ? getEntry(data.code) : null;
  const autoScene: Scene = entry
    ? (entry.scene === "sunny" && isNight ? "night" : entry.scene)
    : "cloudy";

  // 预览循环：点击图标切换场景（开发用，null = 真实天气）
  const PREVIEW_SCENES: (Scene | null)[] = [null, "sunny", "night", "cloudy", "rainy", "snowy", "stormy", "windy"];
  const [previewIdx, setPreviewIdx] = useState(0);
  const previewScene = PREVIEW_SCENES[previewIdx];
  const scene: Scene = previewScene ?? autoScene;

  const bg = TINT[scene];
  const fg = "#334155";
  const fgSub = "#64748b";

  return (
    // 直接填满 GridCard（h-full），不做内部方形约束 → 无蓝色底分层
    <div style={{
      height: "100%", borderRadius: 18, overflow: "hidden",
      background: bg,
      backdropFilter: "blur(18px) saturate(1.5)",
      WebkitBackdropFilter: "blur(18px) saturate(1.5)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
      display: "flex", flexDirection: "column",
      padding: "12px 14px 12px",
    }}>
      {/* 顶部：城市 | 温度 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: fg }}>
          {loading ? "定位中…" : (error ?? data?.city ?? "—")}
        </span>
        <span style={{ fontSize: 18, fontWeight: 800, color: fg, letterSpacing: "-0.04em" }}>
          {loading ? "--" : (data ? `${data.temp}°` : "—")}
        </span>
      </div>

      {/* 插画：中央，点击循环预览场景 */}
      <div
        onClick={() => setPreviewIdx(i => (i + 1) % PREVIEW_SCENES.length)}
        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: "4px 6px", cursor: "pointer", position: "relative" }}>
        {!loading && <WeatherIllust scene={scene} />}
        {loading && <div style={{ fontSize: 28, opacity: 0.25 }}>…</div>}
        {previewScene && (
          <div style={{ position: "absolute", bottom: 2, right: 4,
            fontSize: 8, color: "rgba(100,116,139,0.55)", letterSpacing: "0.04em" }}>
            预览·{previewScene}
          </div>
        )}
      </div>

      {/* 底部：天气描述 | 温度区间 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: fg }}>{entry?.label ?? ""}</span>
        {data && (
          <span style={{ fontSize: 10, color: fgSub, fontWeight: 500 }}>
            {data.tempMin}°~{data.tempMax}°
          </span>
        )}
      </div>
    </div>
  );
}
