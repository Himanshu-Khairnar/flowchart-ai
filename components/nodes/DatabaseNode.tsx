"use client";

import { Handle, Position, NodeProps, NodeResizer } from "@xyflow/react";
import { useCallback } from "react";

interface Column {
  name: string;
  type: string;
  isPrimary?: boolean;
  isForeignKey?: boolean;
  references?: string; // "TableName.columnName"
}

const COMMON_TYPES = ["uuid", "text", "varchar", "int", "bigint", "boolean", "timestamp", "jsonb", "float", "date"];

export function DatabaseNode({ data, id, selected, width }: NodeProps<any>) {
  const columns: Column[] = data.columns || [];
  const w = width || 220;

  const updateColumns = useCallback(
    (newCols: Column[]) => {
      data.onDataChange?.(id, { columns: newCols });
    },
    [id, data]
  );

  const handleTableNameChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      data.onChange?.(id, evt.target.value);
    },
    [id, data]
  );

  const handleColNameChange   = (idx: number, value: string) =>
    updateColumns(columns.map((c, i) => (i === idx ? { ...c, name: value } : c)));

  const handleColTypeChange   = (idx: number, value: string) =>
    updateColumns(columns.map((c, i) => (i === idx ? { ...c, type: value } : c)));

  // Cycle: none → PK → FK → none
  const handleTogglePrimary = (idx: number) => {
    const col = columns[idx];
    let next: Partial<Column>;
    if (!col.isPrimary && !col.isForeignKey) {
      next = { isPrimary: true, isForeignKey: false };
    } else if (col.isPrimary) {
      next = { isPrimary: false, isForeignKey: true };
    } else {
      next = { isPrimary: false, isForeignKey: false, references: undefined };
    }
    updateColumns(columns.map((c, i) => (i === idx ? { ...c, ...next } : c)));
  };

  const handleDeleteCol       = (idx: number) =>
    updateColumns(columns.filter((_, i) => i !== idx));

  const handleAddCol          = () =>
    updateColumns([...columns, { name: "column", type: "text", isPrimary: false }]);

  return (
    <div
      style={{
        background: "var(--card)",
        border: "2px solid var(--primary)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        width: w,
        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
        fontFamily: "inherit",
        boxSizing: "border-box",
      }}
    >
      {/* Only allow width resize — height grows with content */}
      <NodeResizer
        isVisible={selected}
        minWidth={180}
        maxHeight={1}      /* prevent height drag handle from showing */
        lineStyle={{ borderColor: "var(--primary)", borderWidth: 1, opacity: 0.5 }}
        handleStyle={{ width: 8, height: 8, borderRadius: 2, background: "var(--primary)", border: "1.5px solid var(--background)" }}
      />

      <Handle type="source" position={Position.Top}    id="t" style={{ background: "var(--primary)", border: "2px solid var(--background)" }} />
      <Handle type="source" position={Position.Left}   id="l" style={{ background: "var(--primary)", border: "2px solid var(--background)" }} />

      {/* Header */}
      <div
        style={{
          background: "var(--primary)",
          padding: "8px 10px",
          display: "flex",
          alignItems: "center",
          gap: 7,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
          <ellipse cx="7" cy="3" rx="5" ry="2" stroke="var(--primary-foreground)" strokeWidth="1.2" fill="none" />
          <line x1="2" y1="3" x2="2" y2="11" stroke="var(--primary-foreground)" strokeWidth="1.2" />
          <line x1="12" y1="3" x2="12" y2="11" stroke="var(--primary-foreground)" strokeWidth="1.2" />
          <ellipse cx="7" cy="11" rx="5" ry="2" stroke="var(--primary-foreground)" strokeWidth="1.2" fill="none" />
          <path d="M2 7 Q7 9 12 7" stroke="var(--primary-foreground)" strokeWidth="1" fill="none" />
        </svg>
        <input
          className="nodrag"
          value={data.label || ""}
          onChange={handleTableNameChange}
          placeholder="table_name"
          style={{
            background: "transparent", border: "none", outline: "none",
            color: "var(--primary-foreground)", fontSize: 12, fontWeight: 700, width: "100%",
            letterSpacing: "0.02em",
          }}
        />
      </div>

      {/* Column header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "28px 1fr 72px 22px",
          gap: 4,
          padding: "5px 8px 3px",
          borderBottom: "1px solid var(--border)",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 9, color: "var(--muted-foreground)", fontWeight: 700, textAlign: "center" }}>Key</span>
        <span style={{ fontSize: 9, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase" }}>Name</span>
        <span style={{ fontSize: 9, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase" }}>Type</span>
        <span />
      </div>

      {/* Rows */}
      <div style={{ padding: "2px 0" }}>
        {columns.length === 0 && (
          <div style={{ padding: "6px 10px", fontSize: 10, color: "var(--muted-foreground)", fontStyle: "italic" }}>
            No columns — click + to add
          </div>
        )}
        {columns.map((col, idx) => (
          <div key={idx}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "28px 1fr 72px 22px",
                gap: 4,
                padding: "3px 8px",
                alignItems: "center",
                borderBottom: idx < columns.length - 1 ? "1px solid var(--border)" : "none",
                background: col.isForeignKey ? "color-mix(in srgb, var(--primary) 5%, transparent)" : "transparent",
              }}
              className="nodrag"
            >
              {/* Key badge: PK or FK */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
                <button
                  onClick={() => handleTogglePrimary(idx)}
                  title="Toggle primary key"
                  style={{
                    width: 16, height: 16, borderRadius: 3, padding: 0, flexShrink: 0,
                    border: col.isPrimary ? "none" : "1.5px solid var(--border)",
                    background: col.isPrimary ? "var(--primary)" : "transparent",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {col.isPrimary ? (
                    /* Key icon for PK */
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                      <circle cx="3.5" cy="4" r="2.5" stroke="var(--primary-foreground)" strokeWidth="1.3" />
                      <line x1="5.5" y1="4" x2="9.5" y2="4" stroke="var(--primary-foreground)" strokeWidth="1.3" strokeLinecap="round" />
                      <line x1="8" y1="4" x2="8" y2="6" stroke="var(--primary-foreground)" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  ) : col.isForeignKey ? (
                    /* Chain link icon for FK */
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                      <path d="M4 6.5L6 4.5" stroke="var(--primary)" strokeWidth="1.2" strokeLinecap="round" />
                      <rect x="1" y="5.5" width="3" height="2" rx="1" stroke="var(--primary)" strokeWidth="1.2" />
                      <rect x="6" y="2.5" width="3" height="2" rx="1" stroke="var(--primary)" strokeWidth="1.2" />
                    </svg>
                  ) : null}
                </button>
              </div>

              <div style={{ minWidth: 0 }}>
                <input
                  className="nodrag"
                  value={col.name}
                  onChange={(e) => handleColNameChange(idx, e.target.value)}
                  style={{
                    background: "transparent", border: "none", outline: "none",
                    fontSize: 11,
                    color: col.isPrimary ? "var(--primary)" : col.isForeignKey ? "var(--primary)" : "var(--foreground)",
                    fontWeight: col.isPrimary || col.isForeignKey ? 600 : 400,
                    width: "100%", minWidth: 0,
                  }}
                />
                {/* FK reference hint */}
                {col.isForeignKey && col.references && (
                  <div style={{
                    fontSize: 9, color: "var(--muted-foreground)", marginTop: -1,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    fontStyle: "italic",
                  }}>
                    → {col.references}
                  </div>
                )}
              </div>

              <select
                className="nodrag"
                value={COMMON_TYPES.includes(col.type) ? col.type : "text"}
                onChange={(e) => handleColTypeChange(idx, e.target.value)}
                style={{
                  background: "transparent", border: "none", outline: "none",
                  fontSize: 10, color: "var(--muted-foreground)", fontStyle: "italic",
                  width: "100%", cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {COMMON_TYPES.map((t) => <option key={t} value={t} style={{ background: "var(--card)", color: "var(--foreground)" }}>{t}</option>)}
              </select>

              <button
                onClick={() => handleDeleteCol(idx)}
                title="Remove column"
                style={{
                  width: 18, height: 18, borderRadius: 4, border: "none",
                  background: "transparent", cursor: "pointer", padding: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--muted-foreground)", fontSize: 13, lineHeight: 1,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--destructive)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--muted-foreground)"; }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleAddCol}
        style={{
          width: "100%", padding: "5px 8px",
          background: "var(--muted)", border: "none", borderTop: "1px solid var(--border)",
          cursor: "pointer", fontSize: 11, color: "var(--primary)", fontWeight: 600,
          display: "flex", alignItems: "center", gap: 4,
          fontFamily: "inherit", transition: "background 0.1s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--accent)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--muted)"; }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Add column
      </button>

      <Handle type="source" position={Position.Bottom} id="b" style={{ background: "var(--primary)", border: "2px solid var(--background)" }} />
      <Handle type="source" position={Position.Right}  id="r" style={{ background: "var(--primary)", border: "2px solid var(--background)" }} />
    </div>
  );
}
