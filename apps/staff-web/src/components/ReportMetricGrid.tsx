export interface ReportMetric {
  label: string;
  value: string;
  hint?: string | undefined;
}

interface ReportMetricGridProps {
  metrics: ReportMetric[];
}

export function ReportMetricGrid({ metrics }: ReportMetricGridProps) {
  return (
    <div className="report-metric-grid">
      {metrics.map((metric) => (
        <div key={metric.label} className="report-metric">
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          {metric.hint ? <small>{metric.hint}</small> : null}
        </div>
      ))}
    </div>
  );
}
