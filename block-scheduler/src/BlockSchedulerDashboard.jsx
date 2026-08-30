import React, { useState, useMemo, useEffect } from "react";

const CORRIDORS = [
  { id: "C01", name: "BZA-GNT", start: 9, end: 19 },
  { id: "C02", name: "KZJ-BZA", start: 9, end: 18 },
  { id: "C03", name: "GNT-RJY", start: 10, end: 20 },
  { id: "C04", name: "BZA-EE", start: 8, end: 17 },
  { id: "C05", name: "RJY-VSKP", start: 9, end: 21 },
];

const REQUESTS = [
  { id: "REQ004", dept: "S&T", corridor: "C01", start: 14, duration: 2, defect: "cable fault", severity: 2, overdue: 23, urgency: 1.63, criticality: 3, pastDefects: 1, trafficDensity: 3 },
  { id: "REQ015", dept: "S&T", corridor: "C01", start: 15, duration: 2, defect: "interlocking fault", severity: 4, overdue: 6, urgency: 2.76, criticality: 3, pastDefects: 2, trafficDensity: 3 },
  { id: "REQ005", dept: "Engineering", corridor: "C02", start: 13, duration: 5, defect: "ballast deficiency", severity: 3, overdue: 12, urgency: 2.12, criticality: 2, pastDefects: 0, trafficDensity: 2 },
  { id: "REQ008", dept: "Engineering", corridor: "C02", start: 12, duration: 3, defect: "track geometry defect", severity: 1, overdue: 13, urgency: 0.93, criticality: 2, pastDefects: 0, trafficDensity: 2 },
  { id: "REQ007", dept: "S&T", corridor: "C05", start: 12, duration: 3, defect: "cable fault", severity: 2, overdue: 2, urgency: 1.52, criticality: 3, pastDefects: 1, trafficDensity: 2 },
  { id: "REQ023", dept: "Engineering", corridor: "C05", start: 14, duration: 4, defect: "ballast deficiency", severity: 2, overdue: 22, urgency: 1.72, criticality: 3, pastDefects: 0, trafficDensity: 2 },
  { id: "REQ031", dept: "Engineering", corridor: "C04", start: 8, duration: 3, defect: "rail wear", severity: 5, overdue: 27, urgency: 3.37, criticality: 2, pastDefects: 3, trafficDensity: 1 },
  { id: "REQ044", dept: "S&T", corridor: "C03", start: 16, duration: 2, defect: "cable fault", severity: 4, overdue: 3, urgency: 2.73, criticality: 2, pastDefects: 1, trafficDensity: 1 },
];

const DEPT_STYLE = {
  Engineering: { bar: "bg-teal-500", border: "border-teal-700" },
  "S&T": { bar: "bg-rose-500", border: "border-rose-700" },
  Traction: { bar: "bg-amber-500", border: "border-amber-700" },
};

const TIMELINE_START = 8;
const TIMELINE_END = 21;
const HOURS = [8, 10, 12, 14, 16, 18, 20];
const LANE_H = 34;
const LANE_GAP = 6;
const ROW_PAD = 10;

const pct = (h) => ((h - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100;

const hourToHHMM = (h) => `${String(Math.floor(h)).padStart(2, "0")}:00`;
const timeToHour = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
};

function buildSchedulePayload() {
  return {
    requests: REQUESTS.map((r) => ({
      id: r.id,
      department: r.dept,
      corridor_id: r.corridor,
      date: "2026-09-07",
      requested_start: hourToHHMM(r.start),
      duration_hours: r.duration,
      defect_type: r.defect,
      severity: r.severity,
      overdue_days: r.overdue,
      asset_criticality: r.criticality,
      past_defects_90d: r.pastDefects,
      corridor_traffic_density: r.trafficDensity,
    })),
    corridors: CORRIDORS.map((c) => ({
      corridor_id: c.id,
      name: c.name,
      window_start: hourToHHMM(c.start),
      window_end: hourToHHMM(c.end),
    })),
  };
}

function mapBackendSchedule(schedule) {
  return schedule.map((s) => {
    const local = REQUESTS.find((r) => r.id === s.id) || {};
    return {
      ...local,
      corridor: s.corridor_id,
      schedStart: timeToHour(s.scheduled_start),
      schedEnd: timeToHour(s.scheduled_end),
      urgency: s.urgency_score,
    };
  });
}

function computeAfterSchedule(requests, corridors) {
  const scheduled = [];
  corridors.forEach((c) => {
    const reqs = requests
      .filter((r) => r.corridor === c.id)
      .sort((a, b) => b.urgency - a.urgency);
    let cursor = c.start;
    reqs.forEach((r) => {
      scheduled.push({ ...r, schedStart: cursor, schedEnd: cursor + r.duration });
      cursor += r.duration;
    });
  });
  return scheduled;
}

function countConflicts(requests) {
  let conflicts = 0;
  CORRIDORS.forEach((c) => {
    const list = requests.filter((r) => r.corridor === c.id);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.start < b.start + b.duration && b.start < a.start + a.duration) conflicts++;
      }
    }
  });
  return conflicts;
}

export default function BlockSchedulerDashboard() {
  const [mode, setMode] = useState("before");
  const [selectedId, setSelectedId] = useState(null);
  const [backendSchedule, setBackendSchedule] = useState(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildSchedulePayload()),
    })
      .then((res) => {
        if (!res.ok) throw new Error("backend error");
        return res.json();
      })
      .then((data) => {
        setBackendSchedule(data.schedule);
        setIsLive(true);
      })
      .catch(() => setIsLive(false)); // backend not running yet -> silently use local fallback
  }, []);

  const afterSchedule = useMemo(
    () =>
      isLive && backendSchedule
        ? mapBackendSchedule(backendSchedule)
        : computeAfterSchedule(REQUESTS, CORRIDORS),
    [isLive, backendSchedule]
  );
  const conflictsBefore = useMemo(() => countConflicts(REQUESTS), []);

  const laneCounts = useMemo(() => {
    const counts = {};
    CORRIDORS.forEach((c) => {
      counts[c.id] = Math.max(1, REQUESTS.filter((r) => r.corridor === c.id).length);
    });
    return counts;
  }, []);

  const selected =
    (mode === "before" ? REQUESTS : afterSchedule).find((r) => r.id === selectedId) || null;

  return (
    <div className="w-full bg-white p-6 rounded-xl border border-slate-200 font-sans">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Block Schedule — Vijayawada Division</h2>
          <p className="text-sm text-slate-500">Mon, 7 Sep 2026 · 5 corridors, 8 requests</p>
          <span
            className={`inline-flex items-center gap-1.5 mt-1 text-xs ${
              isLive ? "text-emerald-600" : "text-slate-400"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-emerald-500" : "bg-slate-300"}`} />
            {isLive ? "Live optimizer connected" : "Backend offline — showing local simulation"}
          </span>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setMode("before")}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              mode === "before" ? "bg-white shadow text-slate-800 font-medium" : "text-slate-500"
            }`}
          >
            Requested (before)
          </button>
          <button
            onClick={() => setMode("after")}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              mode === "after" ? "bg-white shadow text-slate-800 font-medium" : "text-slate-500"
            }`}
          >
            Optimized (after)
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-4 text-xs text-slate-600">
        {Object.entries(DEPT_STYLE).map(([dept, s]) => (
          <div key={dept} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm ${s.bar}`} />
            {dept}
          </div>
        ))}
      </div>

      <div className="flex mb-1">
        <div className="w-32 shrink-0" />
        <div className="relative flex-1 h-5">
          {HOURS.map((h) => (
            <span
              key={h}
              className="absolute text-xs text-slate-400 -translate-x-1/2"
              style={{ left: `${pct(h)}%` }}
            >
              {h}:00
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100">
        {CORRIDORS.map((c) => {
          const lanes = laneCounts[c.id];
          const rowHeight = lanes * LANE_H + (lanes - 1) * LANE_GAP + ROW_PAD * 2;
          const beforeReqs = REQUESTS.filter((r) => r.corridor === c.id);
          const afterReqs = afterSchedule.filter((r) => r.corridor === c.id);

          return (
            <div key={c.id} className="flex border-b border-slate-100" style={{ height: rowHeight }}>
              <div className="w-32 shrink-0 flex flex-col justify-center pr-3">
                <div className="text-sm font-medium text-slate-700">{c.name}</div>
                <div className="text-xs text-slate-400">
                  {c.start}:00–{c.end}:00
                </div>
              </div>
              <div className="relative flex-1">
                <div
                  className="absolute top-0 bottom-0 bg-slate-50"
                  style={{ left: `${pct(c.start)}%`, width: `${pct(c.end) - pct(c.start)}%` }}
                />
                {mode === "before"
                  ? beforeReqs.map((r, i) => {
                      const style = DEPT_STYLE[r.dept];
                      const top = ROW_PAD + i * (LANE_H + LANE_GAP);
                      return (
                        <button
                          key={r.id}
                          onClick={() => setSelectedId(r.id)}
                          className={`absolute rounded-md border-2 ${style.bar} ${style.border} ${
                            selectedId === r.id ? "ring-2 ring-slate-800" : ""
                          } text-white text-xs font-medium flex items-center px-2 overflow-hidden hover:brightness-95`}
                          style={{
                            left: `${pct(r.start)}%`,
                            width: `${pct(r.start + r.duration) - pct(r.start)}%`,
                            top,
                            height: LANE_H,
                          }}
                        >
                          {r.id}
                        </button>
                      );
                    })
                  : afterReqs.map((r) => {
                      const style = DEPT_STYLE[r.dept];
                      const top = (rowHeight - LANE_H) / 2;
                      return (
                        <button
                          key={r.id}
                          onClick={() => setSelectedId(r.id)}
                          className={`absolute rounded-md border-2 ${style.bar} ${style.border} ${
                            selectedId === r.id ? "ring-2 ring-slate-800" : ""
                          } text-white text-xs font-medium flex items-center px-2 overflow-hidden hover:brightness-95`}
                          style={{
                            left: `${pct(r.schedStart)}%`,
                            width: `${pct(r.schedEnd) - pct(r.schedStart)}%`,
                            top,
                            height: LANE_H,
                          }}
                        >
                          {r.id}
                        </button>
                      );
                    })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 mt-5">
        <div className="flex-1 bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-semibold text-slate-800">
            {mode === "before" ? conflictsBefore : 0}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Scheduling conflicts</div>
        </div>
        <div className="flex-1 bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-semibold text-slate-800">{REQUESTS.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Requests handled</div>
        </div>
        <div className="flex-1 bg-slate-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-semibold text-slate-800">
            {mode === "before" ? "Manual" : "Automatic"}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Coordination method</div>
        </div>
      </div>

      {selected && (
        <div className="mt-4 border border-slate-200 rounded-lg p-4 bg-white">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-semibold text-slate-800">
                {selected.id} · {selected.dept}
              </div>
              <div className="text-sm text-slate-500 capitalize">{selected.defect}</div>
            </div>
            <button onClick={() => setSelectedId(null)} className="text-slate-400 text-sm">
              ✕
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3 mt-3 text-xs">
            <div>
              <div className="text-slate-400">Severity</div>
              <div className="text-slate-800 font-medium">{selected.severity}/5</div>
            </div>
            <div>
              <div className="text-slate-400">Overdue</div>
              <div className="text-slate-800 font-medium">{selected.overdue} days</div>
            </div>
            <div>
              <div className="text-slate-400">Urgency score</div>
              <div className="text-slate-800 font-medium">{selected.urgency}</div>
            </div>
            <div>
              <div className="text-slate-400">{mode === "before" ? "Requested" : "Scheduled"}</div>
              <div className="text-slate-800 font-medium">
                {mode === "before"
                  ? `${selected.start}:00–${selected.start + selected.duration}:00`
                  : `${selected.schedStart}:00–${selected.schedEnd}:00`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}