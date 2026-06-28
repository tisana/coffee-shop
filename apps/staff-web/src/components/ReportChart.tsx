export interface ReportChartBar {
  label: string;
  value: number;
}

interface ReportChartProps {
  ariaLabel: string;
  bars: ReportChartBar[];
}

export function ReportChart({ ariaLabel, bars }: ReportChartProps) {
  const maxValue = Math.max(...bars.map((bar) => bar.value), 0);

  if (bars.length === 0) {
    return <p className="empty-state">No chart data for this report.</p>;
  }

  return (
    <div className="report-chart" role="img" aria-label={ariaLabel}>
      {bars.map((bar) => {
        const height = maxValue > 0 ? Math.max(8, (bar.value / maxValue) * 100) : 8;

        return (
          <div key={bar.label} className="report-chart-bar">
            <div className="report-chart-track" aria-hidden="true">
              <span style={{ height: `${height}%` }} />
            </div>
            <strong>{bar.label}</strong>
            <small>{bar.value}</small>
          </div>
        );
      })}
    </div>
  );
}
