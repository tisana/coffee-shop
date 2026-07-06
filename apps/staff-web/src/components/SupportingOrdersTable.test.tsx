import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { reportOrderItem, supportingOrder } from "../test/reportTestData";
import { SupportingOrdersTable } from "./SupportingOrdersTable";

const orders = [
  supportingOrder({
    orderId: "order-42",
    businessDate: "2026-06-25",
    dailyOrderNumber: 42,
    status: "picked_up",
    capturedOrderTotal: "10.50",
    reportableTotal: "10.50",
    items: [
      reportOrderItem({ name: "Latte", lineTotal: "4.50" }),
      reportOrderItem({ name: "Mocha", lineTotal: "6.00" })
    ]
  }),
  supportingOrder({
    orderId: "order-43",
    businessDate: "2026-06-26",
    dailyOrderNumber: 43,
    status: "completed",
    capturedOrderTotal: "7.25",
    reportableTotal: "5.25",
    items: [reportOrderItem({ name: "Cold Brew", lineTotal: "5.25" })]
  })
];

describe("SupportingOrdersTable", () => {
  it("filters supporting orders by each detail column", () => {
    render(
      <SupportingOrdersTable
        orders={orders}
        sort={{ key: "businessDate", direction: "asc" }}
        onSortChange={vi.fn()}
      />
    );

    const businessDate = screen.getByLabelText("Filter business date");
    const orderNumber = screen.getByLabelText("Filter order number");
    const status = screen.getByLabelText("Filter status");
    const items = screen.getByLabelText("Filter items");
    const capturedTotal = screen.getByLabelText("Filter captured total");
    const reportableSales = screen.getByLabelText("Filter reportable sales");

    fireEvent.change(businessDate, { target: { value: "2026-06-26" } });
    expect(screen.queryByRole("cell", { name: "#42" })).not.toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "#43" })).toBeInTheDocument();
    fireEvent.change(businessDate, { target: { value: "" } });

    fireEvent.change(orderNumber, { target: { value: "42" } });
    expect(screen.getByRole("cell", { name: "#42" })).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "#43" })).not.toBeInTheDocument();
    fireEvent.change(orderNumber, { target: { value: "" } });

    fireEvent.change(status, { target: { value: "completed" } });
    expect(screen.queryByRole("cell", { name: "#42" })).not.toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "#43" })).toBeInTheDocument();
    fireEvent.change(status, { target: { value: "" } });

    fireEvent.change(items, { target: { value: "mocha" } });
    expect(screen.getByRole("cell", { name: "#42" })).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "#43" })).not.toBeInTheDocument();
    fireEvent.change(items, { target: { value: "" } });

    fireEvent.change(capturedTotal, { target: { value: "7.25" } });
    expect(screen.queryByRole("cell", { name: "#42" })).not.toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "#43" })).toBeInTheDocument();
    fireEvent.change(capturedTotal, { target: { value: "" } });

    fireEvent.change(reportableSales, { target: { value: "10.50" } });
    expect(screen.getByRole("cell", { name: "#42" })).toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "#43" })).not.toBeInTheDocument();
  });
});
