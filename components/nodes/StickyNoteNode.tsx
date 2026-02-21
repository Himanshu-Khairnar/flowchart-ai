"use client";

import { Handle, Position, NodeProps, NodeResizer } from "@xyflow/react";
import { useCallback } from "react";

export function StickyNoteNode({ data, id, selected, width, height }: NodeProps<any>) {
  const color = data.color || "#fef08a";
  const w = width  || 180;
  const h = height || 160;

  const onChange = useCallback(
    (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
      data.onChange?.(id, evt.target.value);
    },
    [id, data]
  );

  return (
    <div
      style={{
        backgroundColor: color,
        width: w,
        height: h,
        padding: "10px 12px 14px",
        boxShadow: "2px 4px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.4)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={120}
        minHeight={80}
        lineStyle={{ borderColor: "rgba(0,0,0,0.25)", borderWidth: 1 }}
        handleStyle={{ width: 8, height: 8, borderRadius: 2, background: "rgba(0,0,0,0.35)", border: "1.5px solid var(--background)" }}
      />

      {/* Folded corner */}
      <div
        style={{
          position: "absolute", top: 0, right: 0, width: 0, height: 0,
          borderStyle: "solid", borderWidth: "0 18px 18px 0",
          borderColor: "transparent rgba(0,0,0,0.12) transparent transparent",
          pointerEvents: "none",
        }}
      />

      <Handle type="source" position={Position.Top}    id="t" style={{ background: "rgba(0,0,0,0.3)", border: "2px solid var(--background)" }} />
      <Handle type="source" position={Position.Left}   id="l" style={{ background: "rgba(0,0,0,0.3)", border: "2px solid var(--background)" }} />

      <textarea
        className="nodrag"
        value={data.label || ""}
        onChange={onChange}
        placeholder="Type a note..."
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          fontSize: 12,
          lineHeight: 1.7,
          color: "var(--foreground)",
          resize: "none",
          fontFamily: "inherit",
          width: "100%",
          height: "100%",
        }}
      />

      <Handle type="source" position={Position.Bottom} id="b" style={{ background: "rgba(0,0,0,0.3)", border: "2px solid var(--background)" }} />
      <Handle type="source" position={Position.Right}  id="r" style={{ background: "rgba(0,0,0,0.3)", border: "2px solid var(--background)" }} />
    </div>
  );
}
