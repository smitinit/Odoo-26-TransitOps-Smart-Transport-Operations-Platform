"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { NamedCount, TrendPoint } from "@/lib/api/types"

const COMPLEMENTARY_COLORS = [
  "oklch(0.78 0.12 42)", // warm terracotta
  "oklch(0.76 0.10 222)", // teal (complement)
  "oklch(0.76 0.11 290)", // violet
  "oklch(0.84 0.11 110)", // chartreuse (complement)
  "oklch(0.76 0.12 25)", // coral-red
  "oklch(0.78 0.09 205)", // cyan (complement)
  "oklch(0.74 0.11 320)", // magenta
  "oklch(0.82 0.10 140)", // green (complement)
]

function barColor(index: number) {
  return COMPLEMENTARY_COLORS[index % COMPLEMENTARY_COLORS.length]
}

export function ChartCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function StatusPieChart({ data }: { data: NamedCount[] }) {
  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [
      d.name,
      { label: d.name, color: barColor(i) },
    ])
  )
  const chartData = data.map((d, i) => ({
    name: d.name,
    value: d.value,
    fill: barColor(i),
  }))

  return (
    <ChartContainer
      config={config}
      className="mx-auto aspect-square max-h-[280px] w-full"
    >
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50}>
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
        <ChartLegend
          content={<ChartLegendContent nameKey="name" className="flex-wrap" />}
        />
      </PieChart>
    </ChartContainer>
  )
}

export function NamedBarChart({
  data,
  valueLabel = "Value",
}: {
  data: NamedCount[]
  valueLabel?: string
}) {
  const chartData = data.map((d, i) => ({
    ...d,
    fill: barColor(i),
  }))

  const config: ChartConfig = {
    value: { label: valueLabel, color: COMPLEMENTARY_COLORS[0] },
    ...Object.fromEntries(
      chartData.map((d) => [d.name, { label: d.name, color: d.fill }])
    ),
  }

  return (
    <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
      <BarChart data={chartData} margin={{ left: 8, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" name={valueLabel} radius={4}>
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-3 text-xs text-muted-foreground">
        {chartData.map((entry) => (
          <div key={entry.name} className="flex items-center gap-1.5">
            <div
              className="size-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: entry.fill }}
            />
            <span className="text-foreground">{entry.name}</span>
          </div>
        ))}
      </div>
    </ChartContainer>
  )
}

export function TrendLineChart({
  data,
  valueLabel = "Value",
}: {
  data: TrendPoint[]
  valueLabel?: string
}) {
  const config: ChartConfig = {
    value: { label: valueLabel, color: "var(--chart-2)" },
  }
  return (
    <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
      <LineChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--color-value)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  )
}
