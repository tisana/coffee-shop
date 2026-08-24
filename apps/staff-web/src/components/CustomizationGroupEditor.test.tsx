import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CustomizationGroupInput } from "@coffee-shop/shared/contracts/api";

import { CustomizationGroupEditor } from "./CustomizationGroupEditor";

const groups: CustomizationGroupInput[] = [
  {
    id: "milk",
    name: "Milk",
    required: false,
    minSelections: 0,
    maxSelections: 1,
    displayOrder: 1,
    active: true,
    choices: [
      {
        id: "oat",
        name: "Oat milk",
        priceAdjustment: "0.50",
        available: true,
        displayOrder: 1,
        active: true,
      },
    ],
  },
];

describe("CustomizationGroupEditor", () => {
  it("adds a group with the default selectable shape", () => {
    const onChange = vi.fn();
    render(<CustomizationGroupEditor groups={[]} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Add group" }));

    expect(onChange).toHaveBeenCalledWith([
      {
        name: "New group",
        required: false,
        minSelections: 0,
        maxSelections: 1,
        displayOrder: 1,
        active: true,
        choices: [],
      },
    ]);
  });

  it("renders omitted optional values with selectable defaults", () => {
    const onChange = vi.fn();
    render(
      <CustomizationGroupEditor
        groups={[{ name: "Size" }]}
        onChange={onChange}
      />,
    );

    expect(screen.getByLabelText("Min")).toHaveValue(0);
    expect(screen.getByLabelText("Max")).toHaveValue(1);
    expect(screen.getByLabelText("Required")).not.toBeChecked();
    expect(screen.getByLabelText("Active")).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Add choice" }));

    expect(onChange).toHaveBeenCalledWith([
      {
        name: "Size",
        choices: [
          {
            name: "New choice",
            priceAdjustment: "0.00",
            available: true,
            displayOrder: 1,
            active: true,
          },
        ],
      },
    ]);
  });

  it("emits group name, selection limits, and toggle changes", () => {
    const onChange = vi.fn();
    const group = groups[0]!;
    render(<CustomizationGroupEditor groups={groups} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Group name"), {
      target: { value: "Milk choice" },
    });
    fireEvent.change(screen.getByLabelText("Min"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Max"), { target: { value: "2" } });
    fireEvent.click(screen.getByLabelText("Required"));
    fireEvent.click(screen.getByLabelText("Active"));

    expect(onChange).toHaveBeenCalledWith([{ ...group, name: "Milk choice" }]);
    expect(onChange).toHaveBeenCalledWith([{ ...group, minSelections: 1 }]);
    expect(onChange).toHaveBeenCalledWith([{ ...group, maxSelections: 2 }]);
    expect(onChange).toHaveBeenCalledWith([{ ...group, required: true }]);
    expect(onChange).toHaveBeenCalledWith([{ ...group, active: false }]);
  });

  it("adds, edits, disables, and removes choices with the emitted group shape", () => {
    const onChange = vi.fn();
    const group = groups[0]!;
    render(<CustomizationGroupEditor groups={groups} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Add choice" }));
    expect(onChange).toHaveBeenCalledWith([
      {
        ...group,
        choices: [
          ...group.choices!,
          {
            name: "New choice",
            priceAdjustment: "0.00",
            available: true,
            displayOrder: 2,
            active: true,
          },
        ],
      },
    ]);

    fireEvent.change(screen.getByLabelText("Choice name"), {
      target: { value: "Soy milk" },
    });
    fireEvent.change(screen.getByLabelText("Price"), {
      target: { value: "0.75" },
    });
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Oat milk available" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove Oat milk" }));

    expect(onChange).toHaveBeenCalledWith([
      { ...group, choices: [{ ...group.choices![0]!, name: "Soy milk" }] },
    ]);
    expect(onChange).toHaveBeenCalledWith([
      {
        ...group,
        choices: [{ ...group.choices![0]!, priceAdjustment: "0.75" }],
      },
    ]);
    expect(onChange).toHaveBeenCalledWith([
      { ...group, choices: [{ ...group.choices![0]!, available: false }] },
    ]);
    expect(onChange).toHaveBeenCalledWith([{ ...group, choices: [] }]);
  });
});
