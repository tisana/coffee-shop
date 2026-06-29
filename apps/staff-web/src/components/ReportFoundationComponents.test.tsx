import "@testing-library/jest-dom/vitest";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReportChart } from "./ReportChart";
import { ReportMetricGrid } from "./ReportMetricGrid";

describe("report foundation display components", () => {
  it("renders an accessible chart for report data", () => {
    render(
      <ReportChart
        ariaLabel="Daily sales chart"
        bars={[
          { label: "Jun 25", value: 18.25 },
          { label: "Jun 26", value: 42 }
        ]}
      />
    );

    const chart = screen.getByRole("img", { name: "Daily sales chart" });

    expect(within(chart).getByText("Jun 25")).toBeInTheDocument();
    expect(within(chart).getByText("18.25")).toBeInTheDocument();
    expect(within(chart).getByText("Jun 26")).toBeInTheDocument();
    expect(within(chart).getByText("42")).toBeInTheDocument();
  });

  it("renders a chart empty state without a misleading image role", () => {
    render(<ReportChart ariaLabel="Daily sales chart" bars={[]} />);

    expect(screen.getByText("No chart data for this report.")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Daily sales chart" })).not.toBeInTheDocument();
  });

  it("renders metric values and optional explanatory hints", () => {
    render(
      <ReportMetricGrid
        metrics={[
          { label: "Total sales", value: "$42.00", hint: "Completed and picked up" },
          { label: "Order count", value: "7" },
          { label: "Top item", value: "Latte", hint: "4 sold" }
        ]}
      />
    );

    expect(screen.getByText("Total sales")).toBeInTheDocument();
    expect(screen.getByText("$42.00")).toBeInTheDocument();
    expect(screen.getByText("Completed and picked up")).toBeInTheDocument();
    expect(screen.getByText("Order count")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Top item")).toBeInTheDocument();
    expect(screen.getByText("4 sold")).toBeInTheDocument();
  });
});
