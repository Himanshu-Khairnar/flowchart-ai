import type { Node, Edge } from "@xyflow/react";

// Core Flow Data Structure
export type FlowData = {
  id?: string;
  nodes: Node[];
  edges: Edge[];
  createdAt?: string;
  updatedAt?: string;
  name?: string;
  description?: string;
};

// Node Data Types
export type NodeData = {
  label: string;
  onChange?: (nodeId: string, newLabel: string) => void;
  color?: string;
  fontSize?: number;
};

// Custom Node Types
export type ProcessNodeData = NodeData & {
  type: "process";
};

export type DecisionNodeData = NodeData & {
  type: "decision";
};

export type StartEndNodeData = NodeData & {
  type: "start" | "end";
};

export type ShapeNodeData = NodeData & {
  shape:
    | "circle"
    | "diamond"
    | "square"
    | "triangle"
    | "pill"
    | "parallelogram"
    | "hexagon"
    | "cylinder"
    | "star"
    | "cloud"
    | "document"
    | "pentagon";
};

export type StickyNoteNodeData = NodeData & {
  color?: string;
};

export type DatabaseColumn = {
  name: string;
  type: string;
  isPrimary?: boolean;
  isForeign?: boolean;
};

export type DatabaseNodeData = NodeData & {
  columns: DatabaseColumn[];
};

// Database Schema (Supabase)
export type FlowRecord = {
  id: string;
  user_id?: string;
  name: string;
  description?: string;
  flow_data: FlowData;
  created_at: string;
  updated_at: string;
};

// API Response Types
export type SaveFlowResponse = {
  success: boolean;
  id?: string;
  error?: string;
};

export type LoadFlowResponse = {
  success: boolean;
  data?: FlowData;
  error?: string;
};
