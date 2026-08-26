"use client";

import { useEffect, useRef, useState } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  type ChartConfiguration,
} from "chart.js";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip);

const YEARS = ["2019-20", "2020-21", "2021-22", "2022-23", "2023-24", "2024-25"];

const DATA: Record<string, number[]> = {
  "Mountain View Elementary": [10.98, 16.51, 11.96, 13.51, 16.24, 26.25],
  "Rowland Unified": [21.27, 15.73, 11.91, 12.49, 16.7, 22.02],
  "Wilsona Elementary": [3.66, 5.82, 7.01, 10.62, 18.25, 16.57],
  "Azusa Unified": [6.18, 6.98, 4.24, 4.66, 11.71, 14.77],
  "El Monte City": [14.43, 9.79, 6.93, 7.16, 11.3, 11.49],
  "Eastside Union Elementary": [5.37, 4.76, 5.31, 5.76, 11.4, 10.51],
  "Covina-Valley Unified": [4.57, 2.06, 2.2, 2.0, 5.43, 5.79],
  "Downey Unified": [1.11, 1.18, 0.93, 0.82, 4.14, 3.38],
};

const COLOR_MAP: Record<string, string> = {
  "Mountain View Elementary": "#552583",
  "Rowland Unified": "#FDB927",
  "Wilsona Elementary": "#4a7d8c",
  "Azusa Unified": "#8c6b4a",
  "El Monte City": "#5f8c5a",
  "Eastside Union Elementary": "#8c4a6b",
  "Covina-Valley Unified": "#4a5f8c",
  "Downey Unified": "#8c7a4a",
};

const DEFAULT_ON = new Set(["Mountain View Elementary", "Rowland Unified"]);
const LABELS = Object.keys(DATA);
const STEP = 5;

const shortName = (n: string) =>
  n.replace(" Unified", "").replace(" Elementary", "").replace(" City", "");

function computeYRange(activeSet: Set<string>) {
  const activeVals = LABELS.filter((n) => activeSet.has(n)).flatMap((n) => DATA[n]);
  const min = Math.min(...activeVals);
  const max = Math.max(...activeVals);
  const padding = (max - min) * 0.15 || 2;
  return {
    min: Math.max(0, Math.floor((min - padding) / STEP) * STEP),
    max: Math.ceil((max + padding) / STEP) * STEP,
  };
}

function buildDatasets(activeSet: Set<string>) {
  return LABELS.filter((n) => activeSet.has(n)).map((name) => ({
    label: name,
    data: DATA[name],
    borderColor: COLOR_MAP[name],
    backgroundColor: COLOR_MAP[name],
    borderWidth: 3,
    pointRadius: 0,
    pointHoverRadius: 4,
    tension: 0.1,
    fill: false,
  }));
}

export default function DistrictStudentChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const togglesRef = useRef<HTMLDivElement>(null);
  const [activeSet, setActiveSet] = useState<Set<string>>(new Set(DEFAULT_ON));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const endLabelPlugin = {
      id: "endLabels",
      afterDatasetsDraw(chart: Chart) {
        const c = chart.ctx;
        c.save();
        const active = LABELS.filter((n) => activeSet.has(n));
        const points = active
          .map((name) => {
            const i = chart.data.datasets.findIndex((d) => d.label === name);
            const meta = chart.getDatasetMeta(i);
            const pt = meta.data[meta.data.length - 1] as unknown as { x: number; y: number };
            return { name, color: COLOR_MAP[name], trueY: pt.y, y: pt.y, x: pt.x };
          })
          .sort((a, b) => a.trueY - b.trueY);
        const minGap = 16;
        for (let i = 1; i < points.length; i++) {
          if (points[i].y - points[i - 1].y < minGap) {
            points[i].y = points[i - 1].y + minGap;
          }
        }
        points.forEach((p) => {
          c.fillStyle = p.color;
          c.beginPath();
          c.arc(p.x, p.trueY, 4, 0, Math.PI * 2);
          c.fill();
          c.font = "700 12.5px sans-serif";
          c.textBaseline = "middle";
          c.fillText(shortName(p.name), p.x + 10, p.y);
        });
        c.restore();
      },
    };

    function syncToAxis() {
      const chart = chartRef.current;
      if (!chart || !canvas) return;
      const xScale = chart.scales.x;
      const canvasRect = canvas.getBoundingClientRect();
      const containerRect = canvas.parentElement!.getBoundingClientRect();
      const leftOffset = canvasRect.left - containerRect.left + xScale.left;
      const axisWidth = xScale.right - xScale.left;

      if (dividerRef.current) {
        dividerRef.current.style.marginLeft = `${leftOffset}px`;
        dividerRef.current.style.width = `${axisWidth}px`;
      }
      if (togglesRef.current) {
        togglesRef.current.style.marginLeft = `${leftOffset}px`;
        togglesRef.current.style.width = `${axisWidth}px`;
      }
    }

    const initialRange = computeYRange(activeSet);
    const config: ChartConfiguration<"line"> = {
      type: "line",
      data: { labels: YEARS, datasets: buildDatasets(activeSet) },
      plugins: [endLabelPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { left: 6, right: 130, top: 10, bottom: 4 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${(ctx.parsed.y as number).toFixed(1)}%`,
            },
          },
        },
        scales: {
          y: {
            position: "left",
            min: initialRange.min,
            max: initialRange.max,
            grid: { color: "#eceae2" },
            border: { display: false },
            ticks: { color: "#898781", font: { size: 11 }, stepSize: STEP, padding: 10 },
          },
          x: {
            offset: true,
            grid: { display: false },
            border: { display: true, color: "#c3c2b7" },
            ticks: { color: "#898781", font: { size: 11 }, padding: 8, minRotation: 0, maxRotation: 0 },
          },
        },
        animation: { onComplete: syncToAxis },
      },
    };

    const chart = new Chart(canvas, config);
    chartRef.current = chart;

    window.addEventListener("resize", syncToAxis);
    const t = setTimeout(syncToAxis, 100);

    return () => {
      window.removeEventListener("resize", syncToAxis);
      clearTimeout(t);
      chart.destroy();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.data.datasets = buildDatasets(activeSet);
    const range = computeYRange(activeSet);
    if (chart.options.scales?.y) {
      chart.options.scales.y.min = range.min;
      chart.options.scales.y.max = range.max;
    }
    chart.update();
  }, [activeSet]);

  function toggle(name: string) {
    setActiveSet((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div>
      <div style={{ width: 32, height: 4, background: "#552583", marginBottom: 12 }} />
      <h2 style={{ fontSize: 21, fontWeight: 700, margin: "0 0 4px", lineHeight: 1.25 }}>
        Two districts pull ahead
      </h2>
      <p style={{ fontSize: 14, color: "#6b6a64", margin: "0 0 20px" }}>
        Homeless student rate by LA County school district, school years 2019 through 2024
      </p>
      <div style={{ position: "relative", width: "100%", height: 420 }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Line chart showing homeless student rate percentage by school year for LA County school districts"
        />
      </div>
      <div ref={dividerRef} style={{ height: 1, background: "#d3d1c7", marginTop: 10 }} />
      <div
        ref={togglesRef}
        style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-start", gap: 6, marginTop: 10 }}
      >
        {LABELS.map((name) => {
          const on = activeSet.has(name);
          return (
            <button
              key={name}
              onClick={() => toggle(name)}
              style={{
                padding: "3px 10px",
                borderRadius: 999,
                fontSize: 11,
                cursor: "pointer",
                border: `1.5px solid ${on ? COLOR_MAP[name] : "#d3d1c7"}`,
                background: on ? COLOR_MAP[name] : "transparent",
                color: on ? "#fff" : "#75746e",
                fontWeight: on ? 600 : 400,
              }}
            >
              {shortName(name)}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 10, paddingRight: 130 }}>
        <div style={{ fontSize: 11, color: "#898781", letterSpacing: 0.02 }}>
          Source: California Department of Education, DataQuest — Homeless Student Enrollment by Dwelling Type, LA County
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#75746e", letterSpacing: 0.03, whiteSpace: "nowrap", marginLeft: 16 }}>
          Open Civic AI
        </div>
      </div>
    </div>
  );
}
