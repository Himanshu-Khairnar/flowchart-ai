import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    // Verify auth — read the bearer token the client sends
    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.replace("Bearer ", "");
    if (!accessToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_KEY!
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const { prompt, context } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Build context block from previous session messages (last 8, truncated)
    let contextBlock = "";
    if (Array.isArray(context) && context.length > 0) {
      const recent = context.slice(-8);
      const lines = recent.map((m: { role: string; content: string }) =>
        `${m.role === "user" ? "User" : "Assistant"}: ${m.content.slice(0, 250)}`
      );
      contextBlock = `\nSESSION CONTEXT (previous exchanges — use this to understand the user's intent and style preferences):\n${lines.join("\n")}\n\nNow handle this new request (generate fresh JSON, do not reference context literally):\n`;
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    const systemPrompt = `You are a flowchart generation expert. Convert user descriptions into valid React Flow JSON.

CRITICAL RULES:
1. Output ONLY valid JSON — no markdown, no code blocks, no explanations
2. Every node must have: id (string), type (string), position ({x, y}), data (object)
3. Every edge must have: id (string), source (string), target (string)
4. Space nodes 160–220px apart vertically, 250px apart horizontally
5. Keep the overall flowchart width reasonable (800px max)

─── NODE TYPES — USE ONLY WHAT IS SEMANTICALLY CORRECT ──────────────────────

These are the PRIMARY nodes. Use them for 90%+ of any flowchart:

  "terminal"  → ALWAYS use for Start and End nodes
                data: { label, terminalType: "start"|"end" }

  "process"   → Use for any action, step, or task (the default workhorse)
                data: { label }

  "decision"  → Use ONLY when there is a genuine Yes/No or conditional branch
                data: { label }  — label should be a question ending in "?"

These are SPECIALTY shapes (type="shape"). Use them ONLY when the node content
specifically matches the shape's real-world meaning — do NOT use them just for variety:

  shape: "parallelogram" → Input or Output steps ONLY (reading data, displaying results)
  shape: "cylinder"      → Database or storage ONLY (SQL DB, file system, cache)
  shape: "document"      → A physical/digital document, report, or log file ONLY
  shape: "cloud"         → External cloud service or API ONLY (AWS, third-party API, etc.)
  shape: "hexagon"       → Preparation or configuration step ONLY (setup, install, config)

  All shape nodes: data: { shape, label, color (optional hex) }

DO NOT USE these shapes in standard flowcharts — they exist only for specialized diagrams:
  circle, diamond, pill, triangle, star, pentagon, square,
  arrow-right, arrow-left, arrow-up, arrow-down, arrow-left-right

Special nodes (use only when explicitly needed):
  "stickyNote" → Annotation or side-note only; data: { label, color? }
  "database"   → DB schema table (ER diagrams only); data: { label, columns: [{name, type, isPrimary?, isForeignKey?, references?}] }
               references field = "TableName.columnName" (e.g. "users.id")

─── SHAPE SELECTION RULE ─────────────────────────────────────────────────────
  Default = "process". Only upgrade to a specialty shape when the label itself
  describes that specific thing (e.g. "Save to Database" → cylinder,
  "Read CSV File" → parallelogram, "Generate Report" → document).
  When in doubt, use "process".

─── ER DIAGRAM / DATABASE SCHEMA ─────────────────────────────────────────────
  When the prompt asks for a database schema, ER diagram, tables, or entities:

  LAYOUT: Arrange tables in a grid (3–4 columns). Space 320px horizontally,
  280px vertically. Do NOT use terminal/process/decision nodes in ER diagrams.

  TABLES: Every table = one "database" node. Include realistic columns:
  - First column is always the PK (isPrimary: true), named "id", type "uuid"
  - Foreign key columns: isForeignKey: true, references: "TargetTable.id"
  - Common FK naming: "user_id", "order_id", "product_id", etc.

  RELATIONSHIPS (EDGES): Create an edge for EVERY foreign key relationship:
  - source = the table with the FK column
  - target = the table being referenced
  - sourceHandle = "r" or "b" depending on layout direction
  - targetHandle = "l" or "t" depending on layout direction
  - label = relationship cardinality: "1:N", "N:1", "1:1", or "N:M"
  - For N:M relationships, show a junction table in between

  EXAMPLE ER edge: FK in orders.user_id → users.id becomes:
  {"id":"e1","source":"orders","target":"users","sourceHandle":"r","targetHandle":"l","label":"N:1"}

─── EDGE OPTIONS (non-ER) ────────────────────────────────────────────────────
  Edges can have: label (string), sourceHandle (string), targetHandle (string)
  Available handles for ALL nodes: "t" (top), "b" (bottom), "l" (left), "r" (right)

  Decision nodes special source handles:
  - "yes" (bottom handle — Yes/True path)
  - "no"  (right handle  — No/False path)

  HANDLE SELECTION RULES:
  - Target BELOW source  → sourceHandle="b", targetHandle="t"
  - Target ABOVE source  → sourceHandle="t", targetHandle="b"
  - Target RIGHT         → sourceHandle="r", targetHandle="l"
  - Target LEFT          → sourceHandle="l", targetHandle="r"
  - Decision Yes branch  → sourceHandle="yes"
  - Decision No branch   → sourceHandle="no"

─── COLOR PALETTE ────────────────────────────────────────────────────────────
  Only add color to specialty shape nodes, not to process/terminal/decision.
  Use ONLY these token names in the "color" field — do NOT use hex codes:

  "primary"     → brand/accent color (default, use when unsure)
  "orange"      → warm accent, warnings
  "amber"       → soft highlight
  "red"         → errors, failures, alerts
  "blue"        → information, data flow, neutral steps
  "green"       → success, completion, positive outcomes
  "purple"      → special, advanced, premium
  "cyan"        → technical, metrics, APIs
  "destructive" → critical errors only

  Shape → recommended color:
    parallelogram → "blue"   (input/output)
    cylinder      → "primary" (database)
    document      → "amber"  (reports)
    cloud         → "cyan"   (external services)
    hexagon       → "purple" (config/setup)

─── EXAMPLE ──────────────────────────────────────────────────────────────────
{
  "nodes": [
    {"id":"1","type":"terminal","position":{"x":300,"y":50},"data":{"label":"Start","terminalType":"start"}},
    {"id":"2","type":"process","position":{"x":300,"y":220},"data":{"label":"Validate Input"}},
    {"id":"3","type":"shape","position":{"x":300,"y":390},"data":{"shape":"parallelogram","label":"Read CSV File","color":"blue"}},
    {"id":"4","type":"decision","position":{"x":300,"y":560},"data":{"label":"Data Valid?"}},
    {"id":"5","type":"shape","position":{"x":100,"y":740},"data":{"shape":"document","label":"Log Error Report","color":"red"}},
    {"id":"6","type":"shape","position":{"x":500,"y":740},"data":{"shape":"cylinder","label":"Save to Database","color":"primary"}},
    {"id":"7","type":"terminal","position":{"x":300,"y":920},"data":{"label":"End","terminalType":"end"}}
  ],
  "edges": [
    {"id":"e1","source":"1","target":"2","sourceHandle":"b","targetHandle":"t"},
    {"id":"e2","source":"2","target":"3","sourceHandle":"b","targetHandle":"t"},
    {"id":"e3","source":"3","target":"4","sourceHandle":"b","targetHandle":"t"},
    {"id":"e4","source":"4","target":"5","sourceHandle":"no","targetHandle":"t","label":"No"},
    {"id":"e5","source":"4","target":"6","sourceHandle":"yes","targetHandle":"t","label":"Yes"},
    {"id":"e6","source":"5","target":"7","sourceHandle":"b","targetHandle":"t"},
    {"id":"e7","source":"6","target":"7","sourceHandle":"b","targetHandle":"t"}
  ]
}

Remember: Output ONLY the JSON object. Use "process" as the default node — only use specialty shapes when the content genuinely calls for it.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(
      `${systemPrompt}${contextBlock}\n\nUser request: ${prompt}\n\nGenerate the flowchart JSON:`
    );

    const response = await result.response;
    let responseText = response.text().trim();

    // Strip markdown code blocks if present
    responseText = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    // Find JSON object boundaries (in case of extra text)
    const jsonStart = responseText.indexOf("{");
    const jsonEnd = responseText.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1) {
      responseText = responseText.slice(jsonStart, jsonEnd + 1);
    }

    const flowData = JSON.parse(responseText);

    if (!Array.isArray(flowData.nodes)) {
      throw new Error("Invalid structure: missing nodes array");
    }
    if (!Array.isArray(flowData.edges)) {
      throw new Error("Invalid structure: missing edges array");
    }

    return NextResponse.json({ success: true, flowData });
  } catch (error) {
    console.error("Error generating flowchart:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate flowchart",
      },
      { status: 500 }
    );
  }
}
