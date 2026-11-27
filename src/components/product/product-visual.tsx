/**
 * Placeholder product illustration — rendered until approved final photography is uploaded in
 * Admin → Products → Media. It is an abstract format silhouette in the scent's brief colour,
 * deliberately NOT a depiction of final packaging, and is always labelled as an illustration.
 */
import Image from "next/image";

type Props = { name: string; format: string; brand: string; colour?: string | null; image?: { url: string; alt: string } | null; className?: string; label?: boolean; priority?: boolean; sizes?: string };

function shade(hex: string, amt: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt)), g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt)), b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

const BG: Record<string, [string, string]> = { dhun: ["#fbfbf8", "#f0efea"], vasana: ["#f3ebdd", "#e6d9c3"], anvaya: ["#211e1b", "#121110"] };

export function ProductVisual({ name, format, brand, colour, image, className = "", label = true, priority, sizes = "(min-width: 1024px) 25vw, 50vw" }: Props) {
  if (image) {
    return (
      <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
        <Image src={image.url} alt={image.alt} fill sizes={sizes} className="object-cover" priority={priority} />
      </div>
    );
  }
  const c = colour ?? (brand === "anvaya" ? "#b08a4e" : brand === "dhun" ? "#ff4f2e" : "#b5725a");
  const [bg1, bg2] = BG[brand] ?? BG.vasana;
  const id = `g${name.replace(/[^a-z]/gi, "").slice(0, 10)}${format}`;
  const glass = brand === "anvaya" ? "#2a2522" : brand === "dhun" ? c : shade(c, 30);
  const cap = brand === "anvaya" ? "#b08a4e" : brand === "dhun" ? "#ffffff" : shade(c, -40);
  return (
    <div className={`relative overflow-hidden ${className}`} role="img" aria-label={`${name} — illustration, final photography pending`}>
      <svg viewBox="0 0 400 500" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={bg1} /><stop offset="1" stopColor={bg2} /></linearGradient>
          <radialGradient id={`${id}glow`} cx="0.5" cy="0.55" r="0.55"><stop offset="0" stopColor={c} stopOpacity={brand === "anvaya" ? 0.35 : 0.28} /><stop offset="1" stopColor={c} stopOpacity="0" /></radialGradient>
          <linearGradient id={`${id}glass`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={shade(glass, -25)} /><stop offset="0.45" stopColor={glass} /><stop offset="0.6" stopColor={shade(glass, 35)} /><stop offset="1" stopColor={shade(glass, -35)} /></linearGradient>
        </defs>
        <rect width="400" height="500" fill={`url(#${id}bg)`} />
        <circle cx="200" cy="280" r="200" fill={`url(#${id}glow)`} />
        <ellipse cx="200" cy="420" rx="120" ry="12" fill="#000" opacity={brand === "anvaya" ? 0.5 : 0.08} />
        <Silhouette format={format} brand={brand} fill={`url(#${id}glass)`} cap={cap} accent={c} />
      </svg>
      {label && <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/90">Illustration</span>}
    </div>
  );
}

function Silhouette({ format, brand, fill, cap, accent }: { format: string; brand: string; fill: string; cap: string; accent: string }) {
  switch (format) {
    case "MIST":
      return (<g><rect x="160" y="150" width="80" height="270" rx="16" fill={fill} /><rect x="178" y="112" width="44" height="40" rx="6" fill={cap} /><rect x="194" y="96" width="12" height="18" fill={cap} /></g>);
    case "TRAVEL":
      return (<g><rect x="175" y="200" width="50" height="220" rx="10" fill={fill} /><rect x="183" y="170" width="34" height="32" rx="4" fill={cap} /></g>);
    case "ATTAR":
    case "RUH":
      return (<g><rect x="150" y="160" width="100" height="260" rx="8" fill={brand === "anvaya" ? "#3a2c22" : "#6b4a33"} opacity="0.9" /><rect x="176" y="190" width="48" height="190" rx="6" fill={fill} /><circle cx="200" cy="182" r="14" fill={cap} /><rect x="150" y="300" width="100" height="6" fill={accent} opacity="0.6" /></g>);
    case "SOLID":
      return (<g><ellipse cx="200" cy="350" rx="110" ry="40" fill="#b8955a" /><rect x="90" y="300" width="220" height="50" fill="#c9a66b" /><ellipse cx="200" cy="300" rx="110" ry="40" fill="#d8b97f" /><ellipse cx="200" cy="300" rx="70" ry="24" fill={accent} opacity="0.55" /></g>);
    case "CANDLE":
      return (<g><rect x="125" y="230" width="150" height="190" rx="10" fill={fill} /><ellipse cx="200" cy="232" rx="75" ry="14" fill={shade(accent, 50)} /><rect x="198" y="200" width="4" height="30" fill="#2b2b2b" /><path d="M200 168 C 212 185, 208 200, 200 202 C 192 200, 188 185, 200 168Z" fill="#f4b34a" /></g>);
    case "REED":
      return (<g><path d="M150 300 Q150 270 175 262 L225 262 Q250 270 250 300 L250 400 Q250 420 230 420 L170 420 Q150 420 150 400Z" fill={fill} /><rect x="185" y="240" width="30" height="24" fill={cap} />{[-40, -22, -6, 10, 26, 42].map((dx, i) => (<line key={i} x1="200" y1="250" x2={200 + dx * 2} y2={70 + Math.abs(dx)} stroke="#6b5038" strokeWidth="3" />))}</g>);
    case "ROOM_SPRAY":
      return (<g><rect x="160" y="170" width="80" height="250" rx="6" fill={fill} /><rect x="172" y="130" width="56" height="42" rx="4" fill={cap} /><rect x="225" y="140" width="22" height="8" fill={cap} /></g>);
    case "CAR":
      return (<g><line x1="200" y1="90" x2="200" y2="230" stroke="#7a6a58" strokeWidth="3" /><rect x="160" y="230" width="80" height="80" rx="8" fill={fill} /><rect x="182" y="212" width="36" height="20" rx="3" fill={cap} /></g>);
    case "BAKHOOR":
      return (<g><rect x="110" y="270" width="180" height="150" rx="6" fill="#5a3d2b" /><rect x="110" y="250" width="180" height="30" rx="4" fill={cap} /><path d="M200 240 C 180 210, 225 190, 200 150 C 190 130, 215 110, 205 90" stroke="#9c8f82" strokeWidth="4" fill="none" opacity="0.7" /></g>);
    case "DISCOVERY":
      return (<g>{[0, 1, 2, 3, 4, 5].map((i) => (<g key={i}><rect x={92 + i * 38} y="230" width="26" height="160" rx="6" fill={fill} opacity={0.7 + (i % 2) * 0.3} /><rect x={92 + i * 38} y="214" width="26" height="18" rx="3" fill={cap} /></g>))}<rect x="80" y="380" width="240" height="40" rx="4" fill={brand === "anvaya" ? "#2a2522" : "#d9cbb3"} /></g>);
    case "GIFT":
      return (<g><rect x="100" y="220" width="200" height="200" rx="4" fill={fill} /><rect x="100" y="200" width="200" height="40" rx="4" fill={shade(accent, -20)} /><rect x="192" y="200" width="16" height="220" fill={cap} /><path d="M200 200 C 170 160, 140 190, 200 200 C 260 190, 230 160, 200 200Z" fill={cap} /></g>);
    case "EXTRAIT":
      return (<g><rect x="130" y="210" width="140" height="210" rx="4" fill={fill} /><rect x="130" y="210" width="140" height="8" fill="#000" opacity="0.25" /><rect x="168" y="150" width="64" height="62" rx="2" fill={cap} /><rect x="150" y="300" width="100" height="42" fill="none" stroke="#b08a4e" strokeWidth="1.5" /></g>);
    default: // EDP
      if (brand === "dhun") return (<g><rect x="150" y="180" width="100" height="240" rx="28" fill={fill} /><rect x="168" y="130" width="64" height="54" rx="14" fill={cap} /><text x="200" y="320" textAnchor="middle" fontFamily="system-ui" fontWeight="800" fontSize="22" fill="#fff" opacity="0.9">dhun</text></g>);
      return (<g><path d="M140 220 L170 195 L230 195 L260 220 L260 405 L230 420 L170 420 L140 405Z" fill={fill} /><path d="M170 195 L200 215 L230 195" stroke="#fff" strokeOpacity="0.25" fill="none" /><rect x="178" y="140" width="44" height="56" rx="3" fill={cap} /></g>);
  }
}
