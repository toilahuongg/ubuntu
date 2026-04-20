"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { TrendPoint } from "@/lib/services/analytics-service";

type AnalyticsChartProps = {
  data: TrendPoint[];
};

function formatShortDate(dateKey: string) {
  const [, month, day] = dateKey.split("-");
  return `${day}/${month}`;
}

export function AnalyticsChart({ data }: AnalyticsChartProps) {
  const chartData = data.map((point) => ({
    ...point,
    label: formatShortDate(point.date),
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ bottom: 0, left: -24, right: 4, top: 10 }}
        >
          <defs>
            <linearGradient id="completionTrendFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.32} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="label"
            interval="preserveStartEnd"
            minTickGap={12}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--popover-foreground)",
              fontSize: 12,
            }}
            cursor={{ stroke: "var(--chart-3)", strokeDasharray: "3 3" }}
            formatter={(value) => [
              Number(value).toLocaleString("vi-VN"),
              "Lượt hoàn thành",
            ]}
            labelFormatter={(label) => `Ngày ${label}`}
          />
          <Area
            activeDot={{ fill: "var(--chart-1)", r: 4 }}
            dataKey="completed"
            fill="url(#completionTrendFill)"
            name="Lượt hoàn thành"
            stroke="var(--chart-1)"
            strokeWidth={2}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
