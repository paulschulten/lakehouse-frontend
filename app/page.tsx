"use client";

import { useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const API_BASE = "http://localhost:8000";

type QueryResult = {
  row_count: number;
  truncated?: boolean;
  rows: Record<string, unknown>[];
};

type SchemaColumnDef = { column: string; type: string; description: string };
type SchemaTable = { name: string; description: string; columns: SchemaColumnDef[] };
type SchemaGroup = { source: string; description: string; tables: SchemaTable[] };
type SchemaResponse = { groups: SchemaGroup[] };

function downloadCsv(columns: string[], rows: Record<string, unknown>[]) {
  const escape = (val: unknown) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    return str.includes(",") || str.includes('"') || str.includes("\n")
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((c) => escape(row[c])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "query_results.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const BTN = "rounded-none border border-amber-500 text-amber-400 bg-black hover:bg-amber-950 hover:text-amber-300 text-xs uppercase tracking-wide font-medium";
export default function QueryPage() {
  const skylineRef = useRef<SVGSVGElement>(null);
  const [activeTab, setActiveTab] = useState<"query" | "dictionary" | "about">("query");

  const [query, setQuery] = useState("SELECT * FROM fact_hic LIMIT 10");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [schema, setSchema] = useState<SchemaResponse | null>(null);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/schema`)
      .then((res) => res.json())
      .then((data) => setSchema(data))
      .catch(() => setSchemaError("Could not load schema"));
  }, []);
useEffect(() => {
    const svg = skylineRef.current;
if (!svg) return;
    const ns = "http://www.w3.org/2000/svg";

    function rect(x: number, y: number, w: number, h: number, fill: string) {
      const r = document.createElementNS(ns, "rect");
      r.setAttribute("x", String(x));
      r.setAttribute("y", String(y));
      r.setAttribute("width", String(w));
      r.setAttribute("height", String(h));
      r.setAttribute("fill", fill);
      svg.appendChild(r);
    }
    function windows(x: number, y: number, w: number, h: number, tint: string) {
      for (let wy = y + 6; wy < y + h - 6; wy += 9) {
        for (let wx = x + 4; wx < x + w - 4; wx += 7) {
          rect(wx, wy, 3, 3, tint);
        }
      }
    }

    const plain: [number, number, number, number][] = [
      [0, 30, 40, 60], [45, 10, 30, 80], [80, 40, 35, 50], [153, 25, 32, 65],
      [190, 15, 26, 75], [220, 45, 40, 45], [300, 35, 34, 55], [338, 20, 28, 70],
      [370, 50, 36, 40], [440, 30, 32, 60], [476, 42, 30, 48], [510, 12, 28, 78],
      [542, 55, 38, 35], [614, 38, 34, 52], [652, 48, 48, 42],
    ];
    plain.forEach(([x, y, w, h]) => {
      rect(x, y, w, h, "#123047");
      windows(x, y, w, h, "rgba(255,255,255,0.2)");
    });

    // US Bank Tower-style stepped crown
    rect(120, 10, 28, 80, "#0B8CC4");
    rect(126, 2, 16, 8, "#0B8CC4");
    rect(130, -6, 8, 8, "#0B8CC4");
    windows(120, 18, 28, 68, "rgba(255,255,255,0.35)");

    // Capitol Records-style rounded top
    rect(410, 20, 26, 70, "#0B8CC4");
    const ellipse = document.createElementNS(ns, "ellipse");
    ellipse.setAttribute("cx", "423");
    ellipse.setAttribute("cy", "20");
    ellipse.setAttribute("rx", "13");
    ellipse.setAttribute("ry", "4");
    ellipse.setAttribute("fill", "#0B8CC4");
    svg.appendChild(ellipse);
    windows(410, 26, 26, 60, "rgba(255,255,255,0.35)");

    // City Hall-style tiered top
    rect(584, 30, 26, 60, "#0B8CC4");
    rect(588, 20, 18, 10, "#0B8CC4");
    rect(592, 10, 10, 10, "#0B8CC4");
    windows(584, 36, 26, 50, "rgba(255,255,255,0.35)");
  }, []);
  async function runQuery() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: query }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Query failed");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function clearQuery() {
    setQuery("");
  }

  function clearResults() {
    setResult(null);
    setError(null);
  }

  const columns = result && result.rows.length > 0 ? Object.keys(result.rows[0]) : [];
  return (
<div className="min-h-screen text-zinc-200 font-mono overflow-x-hidden flex" style={{ backgroundColor: "#0d0f12" }}>
      <aside className="w-72 border-r border-zinc-800 shrink-0 p-4">
        <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Data Sources</p>
        <p className="text-xs text-zinc-600 leading-relaxed">
          PDF descriptions, data dictionaries, and schemas for each source will be listed here.
        </p>
      </aside>
      <div className="flex-1 flex flex-col">
        <div style={{ padding: "12px 24px 0", position: "relative", height: "175px", overflow: "hidden" }}>
        <div style={{ maxWidth: "360px", position: "relative", zIndex: 2, marginTop: "16px" }}>
  <div className="flex items-center gap-2" style={{ marginBottom: "4px" }}>
    <div className="w-2.5 h-2.5 rounded-none shrink-0" style={{ backgroundColor: "#0B8CC4" }} />
    <span className="text-lg font-semibold tracking-tight text-zinc-100">
      Open Civic AI
    </span>
  </div>
  <p style={{ color: "#8a8d92", fontSize: "14px", margin: 0, lineHeight: 1.5 }}>
    A Modern Data Architecture for LA Homelessness Data
  </p>
</div>
        <svg
  ref={skylineRef}
  viewBox="0 0 700 100"
  width="100%"
  height="100"
  preserveAspectRatio="xMinYMid meet"
  style={{ position: "absolute", bottom: "-25px", left: "16px" }}
  role="img"
  aria-hidden="true"
  />
      </div>
      <nav className="border-b border-zinc-800 flex items-center justify-end px-6 py-0">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("query")}
            className={`px-3 py-1.5 text-xs uppercase tracking-wide ${
              activeTab === "query"
                ? "text-amber-400 border-b-2 border-amber-500"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Query
          </button>
          <button
            onClick={() => setActiveTab("dictionary")}
            className={`px-3 py-1.5 text-xs uppercase tracking-wide ${
              activeTab === "dictionary"
                ? "text-amber-400 border-b-2 border-amber-500"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Data Dictionary
          </button>
          <button
            onClick={() => setActiveTab("about")}
            className={`px-3 py-1.5 text-xs uppercase tracking-wide ${
              activeTab === "about"
                ? "text-amber-400 border-b-2 border-amber-500"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            About
          </button>
        </div>
      </nav>
      {activeTab === "dictionary" && (
        <div className="p-6 max-w-4xl">
          {schemaError && <p className="text-red-400 text-sm">{schemaError}</p>}
          {!schema && !schemaError && <p className="text-zinc-500 text-sm">Loading...</p>}
          {schema &&
            schema.groups.map((group) => {
              const isOpen = expandedGroup === group.source;
              return (
                <div key={group.source} className="mb-2 border border-zinc-800">
                  <button
                    onClick={() => setExpandedGroup(isOpen ? null : group.source)}
                    className="w-full text-left px-4 py-3 hover:bg-zinc-950 flex items-center justify-between"
                  >
                    <span className="text-sm text-zinc-100">{group.source}</span>
                    <span className="text-zinc-600 text-xs">{isOpen ? "-" : "+"}</span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 border-t border-zinc-800">
                      <p className="text-xs text-zinc-500 py-3 leading-relaxed">
                        {group.description}
                      </p>
                      {group.tables.map((table) => (
                        <div key={table.name} className="mb-4">
                          <p className="text-sm text-zinc-200 mb-1">{table.name}</p>
                          <p className="text-xs text-zinc-500 mb-2">{table.description}</p>
                          <div className="border border-zinc-800">
                            {table.columns.map((c) => (
                              <div
                                key={c.column}
                                className="flex items-start justify-between px-3 py-1.5 border-b border-zinc-900 last:border-0"
                              >
                                <span className="text-xs text-zinc-300 w-40 shrink-0">{c.column}</span>
                                <span className="text-[11px] text-zinc-600 w-20 shrink-0">{c.type}</span>
                                <span className="text-[11px] text-zinc-500 flex-1">
                                  {c.description}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
       </div>
      )}
      {activeTab === "about" && (
        <div className="p-6 max-w-2xl">
          <p className="text-zinc-300 text-base leading-relaxed mb-3">
            Open Civic AI is an open-source data platform designed to help
            facilitate research of the Los Angeles homelessness crisis.
          </p>
          <ul className="text-zinc-300 text-base leading-relaxed space-y-1.5 mb-4 pl-8 list-disc marker:text-zinc-600">
            <li>6 data sources are available with the most recently published data.</li>
            <li>A medallion architecture supports high data quality.</li>
            <li>A modern database design that's well-suited for ML/AI work.</li>
          </ul>
        </div>
      )}
      {activeTab === "query" && (
        <div className="flex flex-col p-6" style={{ minHeight: "calc(100vh - 57px)" }}>
            <ul className="text-base text-zinc-400 space-y-1.5">
              {schema &&
                schema.groups.map((group) => (
                  <li key={group.source} className="flex gap-2">
                    <span className="text-zinc-600">-</span>
                    <span>
                      <span className="text-zinc-300 font-medium">{group.source}:</span>{" "}
                      {group.description}
                    </span>
                  </li>
                ))}
            </ul>
          <div className="flex-1" />
          
          <div className="space-y-3">
            <div className="border border-zinc-700 overflow-hidden">
              <CodeMirror
                value={query}
                height="80px"
                theme={vscodeDark}
                extensions={[sql()]}
                onChange={(value) => setQuery(value)}
                style={{ fontSize: "13.5px" }}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={runQuery} disabled={loading} className={BTN}>
                {loading ? "Running..." : "Run"}
              </Button>
              <Button onClick={clearQuery} variant="outline" className={BTN}>
                Clear query
              </Button>
              {result && (
                <>
                  <Button onClick={clearResults} variant="outline" className={BTN}>
                    Clear results
                  </Button>
                  <Button onClick={() => downloadCsv(columns, result.rows)} variant="outline" className={BTN}>
                    Export CSV
                  </Button>
                </>
              )}
            </div>
            {error && (
              <div className="text-xs text-red-400 border border-red-900 bg-red-950/40 p-2">
                {error}
              </div>
            )}

            {result && (
              <div className="space-y-1">
                <p className="text-[11px] text-zinc-600">
                  {result.row_count} row{result.row_count !== 1 ? "s" : ""}
                  {result.truncated ? " (truncated at the row limit)" : ""}
                </p>
                <div className="border border-zinc-700 overflow-x-auto max-h-72 w-full">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800 hover:bg-transparent">
                        {columns.map((col) => (
                          <TableHead key={col} className="text-zinc-500 text-[11px] py-1 px-2 h-auto whitespace-nowrap">
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.rows.map((row, i) => (
                        <TableRow key={i} className="border-zinc-800 hover:bg-zinc-900">
                          {columns.map((col) => (
                            <TableCell key={col} className="text-[11px] text-zinc-300 py-0.5 px-2 whitespace-nowrap">
                              {row[col] === null ? (
                                <span className="text-zinc-600 italic">null</span>
                              ) : (
                                String(row[col])
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </div>
 )}
      </div>
    </div>
  );
}