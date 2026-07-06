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

export type ReportChartVariant = "line" | "bar";

export interface ReportChartDatum {
  label: string;
  value: number;
}

interface ReportChartProps {
  ariaLabel: string;
  variant: ReportChartVariant;
  data: ReportChartDatum[];
  valueLabel: string;
}

export function ReportChart({
  ariaLabel,
  data,
  valueLabel,
  variant,
}: ReportChartProps) {
  if (data.length === 0) {
    return <p className="empty-state">No chart data for this report.</p>;
  }

  return (
    <div
      className="report-chart"
      role="img"
      aria-label={ariaLabel}
      data-chart-variant={variant}
    >
      <div
        className="report-chart-visual"
        data-testid={`report-${variant}-chart`}
        aria-hidden="true"
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={260}>
          {variant === "line" ? (
            <LineChart
              data={data}
              margin={{ top: 18, right: 24, bottom: 8, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} />
              <YAxis tickLine={false} width={44} />
              <Tooltip formatter={(value) => [String(value), valueLabel]} />
              <Line
                type="monotone"
                dataKey="value"
                name={valueLabel}
                stroke="var(--report-chart-line)"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </LineChart>
          ) : (
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 12, right: 24, bottom: 8, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickLine={false} />
              <YAxis
                dataKey="label"
                type="category"
                tickLine={false}
                width={96}
              />
              <Tooltip formatter={(value) => [String(value), valueLabel]} />
              <Bar
                dataKey="value"
                name={valueLabel}
                fill="var(--report-chart-bar)"
                radius={[0, 5, 5, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <dl className="report-chart-data-summary">
        {data.map((point) => (
          <div key={point.label}>
            <dt>{point.label}</dt>
            <dd>{point.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
