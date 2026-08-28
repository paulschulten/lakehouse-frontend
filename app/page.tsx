  "use client";

  import { useEffect, useRef, useState } from "react";
  import CodeMirror from "@uiw/react-codemirror";
  import { sql } from "@codemirror/lang-sql";
  import { vscodeDark } from "@uiw/codemirror-theme-vscode";
  import { Button } from "@/components/ui/button";
  import DistrictStudentChart from "@/components/DistrictStudentChart";
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";
  import { FileSpreadsheet } from "lucide-react";

  const API_BASE = "https://fpcu8nor9c.execute-api.us-east-2.amazonaws.com/prod";

  type QueryResult = {
  row_count: number;
  truncated?: boolean;
  total_count?: number | null;
  rows: Record<string, unknown>[];
};

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

    const [query, setQuery] = useState("SELECT * FROM fact_hic LIMIT 10");
    const [result, setResult] = useState<QueryResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const [sqlQuestion, setSqlQuestion] = useState("");
    const [sqlLoading, setSqlLoading] = useState(false);
    const [sqlError, setSqlError] = useState<string | null>(null);

    const [answerQuestion, setAnswerQuestion] = useState("");
    const [answerLoading, setAnswerLoading] = useState(false);
    const [answerError, setAnswerError] = useState<string | null>(null);
    const [answerResult, setAnswerResult] = useState<{ answer: string; sql: string | null; rows: Record<string, unknown>[] | null } | null>(null);

  useEffect(() => {
      const svg = skylineRef.current;
      if (!svg) return;
      const svgEl = svg;
      const ns = "http://www.w3.org/2000/svg";

      function rect(x: number, y: number, w: number, h: number, fill: string) {
        const r = document.createElementNS(ns, "rect");
        r.setAttribute("x", String(x));
        r.setAttribute("y", String(y));
        r.setAttribute("width", String(w));
        r.setAttribute("height", String(h));
        r.setAttribute("fill", fill);
        svgEl.appendChild(r)
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
        [190, 45, 24, 45], [260, 40, 28, 50], [300, 35, 34, 55], [338, 20, 28, 70],
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
      
      // Walt Disney Concert Hall — two overlapping curved panels
      const dhX = 220;
      const poly = (points: string, fill: string) => {
        const p = document.createElementNS(ns, "polygon");
        p.setAttribute("points", points);
        p.setAttribute("fill", fill);
        svgEl.appendChild(p)
      };
      poly(`${dhX},90 ${dhX},65 ${dhX + 9},52 ${dhX + 15},64 ${dhX + 15},90`, "#0B8CC4");
      poly(`${dhX + 13},90 ${dhX + 13},58 ${dhX + 22},40 ${dhX + 31},60 ${dhX + 31},90`, "#0B8CC4");

      // Capitol Records-style rounded top
      rect(410, 20, 26, 70, "#0B8CC4");
      const ellipse = document.createElementNS(ns, "ellipse");
      ellipse.setAttribute("cx", "423");
      ellipse.setAttribute("cy", "20");
      ellipse.setAttribute("rx", "13");
      ellipse.setAttribute("ry", "4");
      ellipse.setAttribute("fill", "#0B8CC4");
      svgEl.appendChild(ellipse);
      windows(410, 26, 26, 60, "rgba(255,255,255,0.35)");
      
      // City Hall-style tiered top
      rect(584, 30, 26, 60, "#0B8CC4");
      rect(588, 20, 18, 10, "#0B8CC4");
      rect(592, 10, 10, 10, "#0B8CC4");
      windows(584, 36, 26, 50, "rgba(255,255,255,0.35)");
    }, []);

    async function exportFullCsv() {
  try {
    const res = await fetch(`${API_BASE}/query/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql: query }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.detail || "Export failed");
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "query_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Something went wrong exporting");
  }
}

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

    async function generateSql() {
    setSqlLoading(true);
    setSqlError(null);

    try {
      const res = await fetch(`${API_BASE}/generate-sql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: sqlQuestion }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Could not generate SQL");
      }

      if (data.sql) {
        setQuery(data.sql);
      } else {
        setSqlError(data.message || "This doesn't look like a data question.");
      }
    } catch (err) {
      setSqlError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSqlLoading(false);
    }
  }
  async function getAnswer() {
    setAnswerLoading(true);
    setAnswerError(null);
    setAnswerResult(null);

    try {
      const res = await fetch(`${API_BASE}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: answerQuestion }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Could not answer that question");
      }

      setAnswerResult(data);
    } catch (err) {
      setAnswerError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAnswerLoading(false);
    }
  }

  function clearSqlQuestion() {
    setSqlQuestion("");
    setSqlError(null);
  }

  function clearAnswerQuestion() {
    setAnswerQuestion("");
    setAnswerResult(null);
    setAnswerError(null);
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
    <p className="text-xs uppercase tracking-wide text-white mb-3">Data Sources</p>
    <ul className="space-y-2 text-sm text-zinc-300">
      <li>American Community Survey (ACS),<br />2020-2024</li>
      <li>LAHSA Point-In-Time Counts (PIT),<br />2020, 2022-2026</li>
      <li>Housing Inventory Count (HIC),<br />2020-2025</li>
      <li>LA City 311 Encampment Requests,<br />2020-2024</li>
      <li>
    Homeless Student Enrollment,<br />2019-2020 thru 2024-2025 
    <a
      href="/data-dictionaries/homeless_students_data_dictionary.xlsx"
      download
      className="ml-2 inline-flex items-center text-zinc-300 hover:text-blue-400"
    >
      <FileSpreadsheet size={16} />
    </a>
  </li>
      <li>LA City Homelessness Expense Tracker,<br />Continuous</li>
    </ul>
  </aside>
              <div className="flex-1 flex flex-col h-screen overflow-y-auto">
          <div style={{ padding: "12px 24px 0", position: "relative", height: "175px", overflow: "hidden" }}>
          <div style={{ maxWidth: "360px", position: "relative", zIndex: 2, marginTop: "16px" }}>
    <div className="flex items-center gap-2" style={{ marginBottom: "4px" }}>
      <div className="w-2.5 h-2.5 rounded-none shrink-0" style={{ backgroundColor: "#0B8CC4" }} />
      <span className="text-lg font-semibold tracking-tight text-zinc-100">
        Open Civic AI
      </span>
    </div>
    <p style={{ color: "#8a8d92", fontSize: "14px", margin: 0, lineHeight: 1.5 }}>
      AI Platform for LA Homelessness Research
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
        
          <div className="flex-1 flex flex-col p-6 overflow-y-auto">
    <div className="flex-1" />
            
            <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="border border-zinc-700 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-amber-400 mb-2">Generate SQL</p>
                  <textarea
                    value={sqlQuestion}
                    onChange={(e) => setSqlQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (sqlQuestion) generateSql();
                      }
                    }}
                    placeholder="Ask a question about the data"
                    rows={2}
                    className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 px-2 py-1.5 text-xs mb-2 resize-none"
                  />
                  <div className="flex gap-2">
                    <Button onClick={generateSql} disabled={sqlLoading || !sqlQuestion} className={BTN}>
                      {sqlLoading ? "..." : "Generate SQL"}
                    </Button>
                    <Button onClick={clearSqlQuestion} variant="outline" className={BTN}>
                      Clear Question
                    </Button>
                  </div>
                  {sqlError && <p className="text-xs text-red-400 mt-2">{sqlError}</p>}
                </div>

                <div className="border border-zinc-700 p-3">
                  <p className="text-[10px] uppercase tracking-wide text-amber-400 mb-2">Ask about the platform</p>
                  <textarea
                    value={answerQuestion}
                    onChange={(e) => setAnswerQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (answerQuestion) getAnswer();
                      }
                    }}
                    placeholder="Ask how this platform works"
                    rows={2}
                    className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 px-2 py-1.5 text-xs mb-2 mt-2 resize-none"
                  />
                              <div className="flex gap-2">
                    <Button onClick={getAnswer} disabled={answerLoading || !answerQuestion} className={BTN}>
                      {answerLoading ? "..." : "Get answer"}
                    </Button>
                    <Button onClick={clearAnswerQuestion} variant="outline" className={BTN}>
                      Clear Question
                    </Button>
                  </div>
                  {answerError && <p className="text-xs text-red-400 mt-2">{answerError}</p>}
                  {answerResult && (
                    <div className="mt-2 text-xs text-zinc-200 border border-zinc-800 p-2">
                      {answerResult.answer}
                    </div>
                  )}
                </div>
              </div>
                        <div className="border border-zinc-700 overflow-hidden">
                <CodeMirror
                  value={query}
                  height="80px"
                  theme={vscodeDark}
                  extensions={[sql()]}
                  onChange={(value) => setQuery(value)}
                  basicSetup={{ foldGutter: false }}
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
                    <Button onClick={exportFullCsv} variant="outline" className={BTN}>
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
  {result.truncated && result.total_count
    ? `Showing ${result.row_count} of ${result.total_count} rows. Please export for a full list of rows.`
    : `${result.row_count} row${result.row_count !== 1 ? "s" : ""}`}
</p>

                  <div className="border border-zinc-700 overflow-auto max-h-72 w-full">
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
        </div>
      </div>
    );
  }