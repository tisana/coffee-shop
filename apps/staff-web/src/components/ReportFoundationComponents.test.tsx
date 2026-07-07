import "@testing-library/jest-dom/vitest";

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReportChart } from "./ReportChart";
import { ReportMetricGrid } from "./ReportMetricGrid";

describe("report foundation display components", () => {
  it("renders an accessible line chart for sales trend data", () => {
    render(
      <ReportChart
        ariaLabel="Daily sales chart"
        variant="line"
        data={[
          { label: "Jun 25", value: 18.25 },
          { label: "Jun 26", value: 42 },
        ]}
        valueLabel="Sales"
      />,
    );

    const chart = screen.getByRole("img", { name: "Daily sales chart" });

    expect(chart).toHaveAttribute("data-chart-variant", "line");
    expect(within(chart).getByTestId("report-line-chart")).toBeInTheDocument();
    expect(within(chart).getByText("Jun 25")).toBeInTheDocument();
    expect(within(chart).getByText("18.25")).toBeInTheDocument();
    expect(within(chart).getByText("Jun 26")).toBeInTheDocument();
    expect(within(chart).getByText("42")).toBeInTheDocument();
  });

  it("renders an accessible ranked bar chart for popularity data", () => {
    render(
      <ReportChart
        ariaLabel="Popular items chart"
        variant="bar"
        data={[
          { label: "Latte", value: 6 },
          { label: "Mocha", value: 4 },
        ]}
        valueLabel="Quantity sold"
      />,
    );

    const chart = screen.getByRole("img", { name: "Popular items chart" });

    expect(chart).toHaveAttribute("data-chart-variant", "bar");
    expect(within(chart).getByTestId("report-bar-chart")).toBeInTheDocument();
    expect(within(chart).getByText("Latte")).toBeInTheDocument();
    expect(within(chart).getByText("6")).toBeInTheDocument();
    expect(within(chart).getByText("Mocha")).toBeInTheDocument();
    expect(within(chart).getByText("4")).toBeInTheDocument();
  });

  it("renders a chart empty state without a misleading image role", () => {
    render(
      <ReportChart
        ariaLabel="Daily sales chart"
        variant="line"
        data={[]}
        valueLabel="Sales"
      />,
    );

    expect(
      screen.getByText("No chart data for this report."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Daily sales chart" }),
    ).not.toBeInTheDocument();
  });

  it("renders metric values and optional explanatory hints", () => {
    render(
      <ReportMetricGrid
        metrics={[
          {
            label: "Total sales",
            value: "$42.00",
            hint: "Completed and picked up",
          },
          { label: "Order count", value: "7" },
          { label: "Top item", value: "Latte", hint: "4 sold" },
        ]}
      />,
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
