"use client";

import { useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { sql } from "@codemirror/lang-sql";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const API_URL = "http://localhost:8000/query";

type QueryResult = {
  row_count: number;
  truncated?: boolean;
  rows: Record<string, unknown>[];
};

export default function QueryPage() {
  const [query, setQuery] = useState("SELECT * FROM fact_hic LIMIT 10");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function runQuery() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(API_URL, {
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

  const columns = result && result.rows.length > 0 ? Object.keys(result.rows[0]) : [];

  return (
    <main className="max-w-5xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Query the Lakehouse</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Write a SELECT query against any gold-layer table (e.g. fact_hic,
          fact_pit_count, fact_311_encampment, fact_homeless_students).
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <CodeMirror
          value={query}
          height="180px"
          extensions={[sql()]}
          onChange={(value) => setQuery(value)}
        />
      </div>

      <Button onClick={runQuery} disabled={loading}>
        {loading ? "Running..." : "Run query"}
      </Button>

      {error && (
        <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded p-3">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {result.row_count} row{result.row_count !== 1 ? "s" : ""}
            {result.truncated ? " (truncated at the row limit)" : ""}
          </p>
          <div className="border rounded-lg overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col}>{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((row, i) => (
                  <TableRow key={i}>
                    {columns.map((col) => (
                      <TableCell key={col}>
                        {row[col] === null ? (
                          <span className="text-muted-foreground italic">null</span>
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
    </main>
  );
}
