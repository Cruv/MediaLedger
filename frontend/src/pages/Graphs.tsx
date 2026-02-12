import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useServers } from "../hooks/useServers";
import {
  useDailyPlays,
  useDailyDuration,
  useHourlyActivity,
  useTopContent,
  usePlatforms,
  usePlayMethods,
  useTopUsers,
} from "../hooks/useGraphs";

const COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6",
];

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatHours(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="mb-4 text-sm font-semibold text-gray-300">{title}</h3>
      {children}
    </div>
  );
}

export default function Graphs() {
  const [days, setDays] = useState(30);
  const [serverId, setServerId] = useState("");
  const { data: servers } = useServers();

  const params = useMemo(() => {
    const p: { days: number; server_id?: string } = { days };
    if (serverId) p.server_id = serverId;
    return p;
  }, [days, serverId]);

  const { data: dailyPlays } = useDailyPlays(params);
  const { data: dailyDuration } = useDailyDuration(params);
  const { data: hourly } = useHourlyActivity(params);
  const { data: topContent } = useTopContent({ ...params, limit: 10 });
  const { data: platforms } = usePlatforms(params);
  const { data: playMethods } = usePlayMethods(params);
  const { data: topUsers } = useTopUsers({ ...params, limit: 10 });

  // Build heatmap grid from hourly data
  const heatmapData = useMemo(() => {
    if (!hourly) return [];
    const grid: { hour: number; day: number; plays: number }[] = [];
    const lookup = new Map<string, number>();
    let maxPlays = 1;
    for (const h of hourly) {
      const key = `${h.day_of_week}-${h.hour}`;
      lookup.set(key, h.plays);
      if (h.plays > maxPlays) maxPlays = h.plays;
    }
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const plays = lookup.get(`${d}-${h}`) || 0;
        grid.push({ hour: h, day: d, plays });
      }
    }
    return { grid, maxPlays };
  }, [hourly]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Graphs</h1>
        <div className="flex gap-2">
          <select
            value={serverId}
            onChange={(e) => setServerId(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="">All Servers</option>
            {servers?.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
        </div>
      </div>

      {/* Daily play counts */}
      <ChartCard title="Daily Play Count">
        {dailyPlays && dailyPlays.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={dailyPlays}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                labelStyle={{ color: "#9ca3af" }}
              />
              <Legend />
              <Area type="monotone" dataKey="plays" name="Total Plays" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
              <Area type="monotone" dataKey="completed" name="Completed" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-10 text-center text-gray-500">No data for this period</p>
        )}
      </ChartCard>

      {/* Daily watch duration */}
      <ChartCard title="Daily Watch Duration (Hours)">
        {dailyDuration && dailyDuration.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={dailyDuration}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                labelStyle={{ color: "#9ca3af" }}
              />
              <Area type="monotone" dataKey="duration_hours" name="Hours" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-10 text-center text-gray-500">No data for this period</p>
        )}
      </ChartCard>

      {/* Two-column row: platforms + play methods */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Platforms">
          {platforms && platforms.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={platforms}
                  dataKey="plays"
                  nameKey="platform"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ platform, percent }) => `${platform} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {platforms.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                  formatter={(value: number, name: string) => [`${value} plays`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-gray-500">No data</p>
          )}
        </ChartCard>

        <ChartCard title="Stream Type">
          {playMethods && playMethods.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={playMethods}
                  dataKey="plays"
                  nameKey="play_method"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ play_method, percent }) => `${play_method} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {playMethods.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                  formatter={(value: number, name: string) => [`${value} plays`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-gray-500">No data</p>
          )}
        </ChartCard>
      </div>

      {/* Top content bar chart */}
      <ChartCard title="Most Watched Content">
        {topContent && topContent.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(250, topContent.length * 40)}>
            <BarChart data={topContent} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="title"
                stroke="#6b7280"
                tick={{ fontSize: 11 }}
                width={120}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                formatter={(value: number, name: string) => {
                  if (name === "Watch Time") return [formatHours(value), name];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar dataKey="plays" name="Plays" fill="#6366f1" radius={[0, 4, 4, 0]} />
              <Bar dataKey="total_duration_sec" name="Watch Time" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-10 text-center text-gray-500">No data</p>
        )}
      </ChartCard>

      {/* Top users bar chart */}
      <ChartCard title="Top Users by Watch Time">
        {topUsers && topUsers.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(250, topUsers.length * 40)}>
            <BarChart data={topUsers} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="username"
                stroke="#6b7280"
                tick={{ fontSize: 11 }}
                width={100}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                formatter={(value: number, name: string) => {
                  if (name === "Watch Time") return [formatHours(value), name];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar dataKey="plays" name="Plays" fill="#22c55e" radius={[0, 4, 4, 0]} />
              <Bar dataKey="total_duration_sec" name="Watch Time" fill="#14b8a6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-10 text-center text-gray-500">No data</p>
        )}
      </ChartCard>

      {/* Activity heatmap */}
      <ChartCard title="Activity Heatmap">
        {heatmapData && "grid" in heatmapData ? (
          <div className="overflow-x-auto">
            <div className="inline-block">
              <div className="flex">
                <div className="w-10" />
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className="w-7 text-center text-[10px] text-gray-500">
                    {i}
                  </div>
                ))}
              </div>
              {DAY_NAMES.map((name, d) => (
                <div key={d} className="flex items-center">
                  <div className="w-10 text-right pr-2 text-[10px] text-gray-500">{name}</div>
                  {Array.from({ length: 24 }, (_, h) => {
                    const cell = heatmapData.grid.find((c) => c.day === d && c.hour === h);
                    const plays = cell?.plays || 0;
                    const intensity = plays / heatmapData.maxPlays;
                    return (
                      <div
                        key={h}
                        className="m-0.5 h-5 w-6 rounded-sm"
                        style={{
                          backgroundColor: plays === 0
                            ? "#1f2937"
                            : `rgba(99, 102, 241, ${0.15 + intensity * 0.85})`,
                        }}
                        title={`${name} ${h}:00 - ${plays} plays`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="py-10 text-center text-gray-500">No data</p>
        )}
      </ChartCard>
    </div>
  );
}
