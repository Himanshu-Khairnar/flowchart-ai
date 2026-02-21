"use client";

import { Handle, Position, NodeProps, NodeResizer } from "@xyflow/react";
import { useCallback } from "react";

type ShapeType =
  | "square" | "circle" | "diamond" | "pill"
  | "parallelogram" | "hexagon" | "triangle" | "cylinder"
  | "star" | "cloud" | "document" | "pentagon"
  | "arrow-right" | "arrow-left" | "arrow-up" | "arrow-down" | "arrow-left-right";

// ── Color tokens → CSS variables ─────────────────────────────────────────────
// Gemini outputs a token name; we resolve it here so shapes adapt to the theme
// (light / dark mode) automatically. Hex fallback for backward compatibility.
const COLOR_TOKENS: Record<string, string> = {
  primary:     "var(--primary)",
  destructive: "var(--destructive)",
  "chart-1":   "var(--chart-1)",
  "chart-2":   "var(--chart-2)",
  "chart-3":   "var(--chart-3)",
  "chart-4":   "var(--chart-4)",
  "chart-5":   "var(--chart-5)",
  // Semantic aliases
  orange:  "var(--chart-2)",
  amber:   "var(--chart-1)",
  red:     "var(--destructive)",
  brown:   "var(--chart-5)",
  // Non-theme colors (these are not in the shadcn palette but kept for diversity)
  blue:    "#3b82f6",
  green:   "#22c55e",
  purple:  "#8b5cf6",
  cyan:    "#06b6d4",
  pink:    "#ec4899",
};

/** Resolve a token name or pass-through a raw hex / CSS value. */
function resolveColor(raw: string | undefined): string {
  if (!raw) return "var(--primary)";
  return COLOR_TOKENS[raw.toLowerCase()] ?? raw;
}

const SHAPE_DEFAULTS: Record<ShapeType, { w: number; h: number }> = {
  square:             { w: 160, h: 80 },
  circle:             { w: 90,  h: 90 },
  diamond:            { w: 130, h: 130 },
  pill:               { w: 160, h: 60 },
  parallelogram:      { w: 160, h: 80 },
  hexagon:            { w: 160, h: 90 },
  triangle:           { w: 130, h: 110 },
  cylinder:           { w: 120, h: 110 },
  star:               { w: 100, h: 100 },
  cloud:              { w: 170, h: 100 },
  document:           { w: 160, h: 100 },
  pentagon:           { w: 110, h: 110 },
  "arrow-right":      { w: 160, h: 80 },
  "arrow-left":       { w: 160, h: 80 },
  "arrow-up":         { w: 80,  h: 120 },
  "arrow-down":       { w: 80,  h: 120 },
  "arrow-left-right": { w: 180, h: 80 },
};

// SVG shapes use style prop (not attributes) so CSS variables are resolved correctly
function renderSVGShape(
  shape: ShapeType,
  w: number,
  h: number,
  stroke: string,
  fill: string
): React.ReactNode {
  const sw = 2;
  const p  = 3;
  const s  = { fill, stroke, strokeWidth: sw } as React.CSSProperties;

  switch (shape) {
    case "square":
      return <rect x={p} y={p} width={w - p * 2} height={h - p * 2} rx={7} style={s} />;

    case "circle":
      return <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - p} ry={h / 2 - p} style={s} />;

    case "diamond": {
      const cx = w / 2, cy = h / 2;
      return <polygon points={`${cx},${p} ${w - p},${cy} ${cx},${h - p} ${p},${cy}`} style={s} />;
    }

    case "pill":
      return <rect x={p} y={p} width={w - p * 2} height={h - p * 2} rx={(h - p * 2) / 2} style={s} />;

    case "parallelogram": {
      const off = w * 0.18;
      return <polygon points={`${off},${p} ${w - p},${p} ${w - off},${h - p} ${p},${h - p}`} style={s} />;
    }

    case "hexagon": {
      const qw = w * 0.25;
      return <polygon points={`${qw},${p} ${w - qw},${p} ${w - p},${h / 2} ${w - qw},${h - p} ${qw},${h - p} ${p},${h / 2}`} style={s} />;
    }

    case "triangle":
      return <polygon points={`${w / 2},${p} ${w - p},${h - p} ${p},${h - p}`} style={s} />;

    case "cylinder": {
      const ry  = h * 0.13;
      const rx  = w / 2 - p;
      const cx  = w / 2;
      const topY = p + ry;
      const botY = h - p - ry;
      return (
        <>
          <line x1={p}     y1={topY} x2={p}     y2={botY} style={{ stroke, strokeWidth: sw } as React.CSSProperties} />
          <line x1={w - p} y1={topY} x2={w - p} y2={botY} style={{ stroke, strokeWidth: sw } as React.CSSProperties} />
          <rect x={p} y={topY} width={w - p * 2} height={botY - topY} style={{ fill, stroke: "none" } as React.CSSProperties} />
          <ellipse cx={cx} cy={botY} rx={rx} ry={ry} style={s} />
          <ellipse cx={cx} cy={topY} rx={rx} ry={ry} style={s} />
        </>
      );
    }

    case "star": {
      const cx = w / 2, cy = h / 2;
      const outerR = Math.min(w, h) / 2 - p;
      const innerR = outerR * 0.42;
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
      }
      return <polygon points={pts.join(" ")} style={s} />;
    }

    case "cloud": {
      const d = [
        `M ${w * 0.15},${h * 0.85}`,
        `Q ${w * 0.0},${h * 0.85} ${w * 0.03},${h * 0.65}`,
        `Q ${w * 0.0},${h * 0.42} ${w * 0.16},${h * 0.4}`,
        `Q ${w * 0.12},${h * 0.2} ${w * 0.3},${h * 0.16}`,
        `Q ${w * 0.35},${h * 0.03} ${w * 0.52},${h * 0.08}`,
        `Q ${w * 0.6},${h * 0.0} ${w * 0.7},${h * 0.1}`,
        `Q ${w * 0.8},${h * 0.02} ${w * 0.86},${h * 0.16}`,
        `Q ${w * 1.02},${h * 0.16} ${w * 0.98},${h * 0.4}`,
        `Q ${w * 1.04},${h * 0.55} ${w * 0.93},${h * 0.65}`,
        `Q ${w * 1.0},${h * 0.85} ${w * 0.85},${h * 0.85}`,
        "Z",
      ].join(" ");
      return <path d={d} style={s} />;
    }

    case "document": {
      const wavyY = h * 0.72;
      const wh    = h * 0.22;
      const d = [
        `M ${p},${p}`,
        `L ${w - p},${p}`,
        `L ${w - p},${wavyY}`,
        `Q ${w * 0.82},${wavyY + wh} ${w * 0.64},${wavyY}`,
        `Q ${w * 0.46},${wavyY - wh} ${w * 0.28},${wavyY}`,
        `Q ${w * 0.15},${wavyY + wh} ${p},${wavyY}`,
        "Z",
      ].join(" ");
      return <path d={d} style={s} />;
    }

    case "pentagon": {
      const cx = w / 2, cy = h / 2;
      const r  = Math.min(w, h) / 2 - p;
      const pts: string[] = [];
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
      }
      return <polygon points={pts.join(" ")} style={s} />;
    }

    case "arrow-right": {
      const sT = h * 0.3, sB = h * 0.7, nx = w * 0.65;
      return <polygon points={`${p},${sT} ${nx},${sT} ${nx},${p} ${w-p},${h/2} ${nx},${h-p} ${nx},${sB} ${p},${sB}`} style={s} />;
    }

    case "arrow-left": {
      const sT = h * 0.3, sB = h * 0.7, nx = w * 0.35;
      return <polygon points={`${w-p},${sT} ${nx},${sT} ${nx},${p} ${p},${h/2} ${nx},${h-p} ${nx},${sB} ${w-p},${sB}`} style={s} />;
    }

    case "arrow-up": {
      const sL = w * 0.3, sR = w * 0.7, ny = h * 0.42;
      return <polygon points={`${sL},${h-p} ${sL},${ny} ${p},${ny} ${w/2},${p} ${w-p},${ny} ${sR},${ny} ${sR},${h-p}`} style={s} />;
    }

    case "arrow-down": {
      const sL = w * 0.3, sR = w * 0.7, ny = h * 0.58;
      return <polygon points={`${sL},${p} ${sL},${ny} ${p},${ny} ${w/2},${h-p} ${w-p},${ny} ${sR},${ny} ${sR},${p}`} style={s} />;
    }

    case "arrow-left-right": {
      const sT = h * 0.3, sB = h * 0.7, hd = w * 0.2;
      return <polygon points={`${p},${h/2} ${hd},${p} ${hd},${sT} ${w-hd},${sT} ${w-hd},${p} ${w-p},${h/2} ${w-hd},${h-p} ${w-hd},${sB} ${hd},${sB} ${hd},${h-p}`} style={s} />;
    }

    default:
      return <rect x={p} y={p} width={w - p * 2} height={h - p * 2} rx={7} style={s} />;
  }
}

function getTextPadding(shape: ShapeType): React.CSSProperties {
  switch (shape) {
    case "triangle":      return { paddingTop: "38%", paddingBottom: "8px" };
    case "cylinder":      return { paddingTop: "22px" };
    case "cloud":         return { padding: "18px 20px 12px" };
    case "document":      return { paddingBottom: "22%" };
    case "parallelogram": return { paddingLeft: "24px", paddingRight: "24px" };
    default:              return {};
  }
}

export function ShapeNode({ data, id, selected, width, height }: NodeProps<any>) {
  const shape    = (data.shape as ShapeType) || "square";
  const color    = resolveColor(data.color);   // CSS var or hex
  const defaults = SHAPE_DEFAULTS[shape] || SHAPE_DEFAULTS.square;

  const w = width  || defaults.w;
  const h = height || defaults.h;

  const onChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => data.onChange?.(id, evt.target.value),
    [id, data]
  );

  const handleStyle: React.CSSProperties = {
    zIndex: 10,
    // Handle bg must be an opaque color; CSS vars work here via inline style
    background: color,
    border: "2px solid var(--background)",
  };

  return (
    <div style={{ position: "relative", width: w, height: h, minWidth: 50, minHeight: 40 }}>
      <NodeResizer
        isVisible={selected}
        minWidth={50}
        minHeight={40}
        lineStyle={{ borderColor: color, borderWidth: 1, opacity: 0.6 }}
        handleStyle={{ width: 8, height: 8, borderRadius: 2, background: color, border: "1.5px solid var(--background)" }}
      />
      <Handle type="source" position={Position.Top}   id="t" style={handleStyle} />
      <Handle type="source" position={Position.Left}  id="l" style={handleStyle} />

      <svg
        width={w} height={h}
        viewBox={`0 0 ${w} ${h}`}
        style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}
      >
        {renderSVGShape(shape, w, h, color, "var(--card)")}
      </svg>

      <div
        style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          ...getTextPadding(shape),
        }}
      >
        <input
          className="nodrag"
          value={data.label || ""}
          onChange={onChange}
          style={{
            background: "transparent", border: "none", textAlign: "center",
            fontSize: 12, fontWeight: 500, width: "80%", outline: "none",
            color: "var(--foreground)", cursor: "text",
          }}
          placeholder="Label"
        />
      </div>

      <Handle type="source" position={Position.Bottom} id="b" style={handleStyle} />
      <Handle type="source" position={Position.Right}  id="r" style={handleStyle} />
    </div>
  );
}
