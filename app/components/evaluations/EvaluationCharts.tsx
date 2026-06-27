"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EvaluationStats } from "@/app/lib/settingsTypes";

const chartTooltipStyle = {
  backgroundColor: "#16161f",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  color: "#fff",
};

export default function EvaluationCharts({ stats }: { stats: EvaluationStats }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
        <h2 className="mb-4 text-sm font-medium text-gray-300">Average Score per Project</h2>
        {stats.projectScores.length > 0 ? (
          <ResponsiveContainer width="100%" height={192} className="md:!h-64">
            <BarChart data={stats.projectScores}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-500">No project scores yet.</p>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-[#16161f] p-5">
        <h2 className="mb-4 text-sm font-medium text-gray-300">Score by Refinement Round</h2>
        {stats.roundScores.length > 0 ? (
          <ResponsiveContainer width="100%" height={192} className="md:!h-64">
            <LineChart data={stats.roundScores}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="round" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1" }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-500">No round data yet.</p>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-[#16161f] p-5 lg:col-span-2">
        <h2 className="mb-4 text-sm font-medium text-gray-300">Common Issues in Critiques</h2>
        <ul className="space-y-2">
          {stats.commonIssues.map((issue) => (
            <li
              key={issue}
              className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-gray-300"
            >
              {issue}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
