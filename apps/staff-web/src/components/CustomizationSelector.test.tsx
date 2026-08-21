import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CustomizationGroup } from "@coffee-shop/shared/domain/types";

import { CustomizationSelector } from "./CustomizationSelector";

const groups: CustomizationGroup[] = [
  {
    id: "milk",
    menuItemId: "latte",
    name: "Milk",
    required: true,
    minSelections: 1,
    maxSelections: 1,
    displayOrder: 1,
    active: true,
    choices: [
      {
        id: "whole",
        customizationGroupId: "milk",
        name: "Whole milk",
        priceAdjustment: "0.00",
        available: true,
        active: true,
        displayOrder: 1,
      },
      {
        id: "oat",
        customizationGroupId: "milk",
        name: "Oat milk",
        priceAdjustment: "0.50",
        available: true,
        active: true,
        displayOrder: 2,
      },
    ],
  },
  {
    id: "extras",
    menuItemId: "latte",
    name: "Extras",
    required: false,
    minSelections: 0,
    maxSelections: 2,
    displayOrder: 2,
    active: true,
    choices: [
      {
        id: "shot",
        customizationGroupId: "extras",
        name: "Extra shot",
        priceAdjustment: "1.00",
        available: true,
        active: true,
        displayOrder: 1,
      },
      {
        id: "foam",
        customizationGroupId: "extras",
        name: "Cold foam",
        priceAdjustment: "0.75",
        available: true,
        active: true,
        displayOrder: 2,
      },
      {
        id: "syrup",
        customizationGroupId: "extras",
        name: "Vanilla syrup",
        priceAdjustment: "0.50",
        available: true,
        active: true,
        displayOrder: 3,
      },
      {
        id: "seasonal",
        customizationGroupId: "extras",
        name: "Seasonal topping",
        priceAdjustment: "0.25",
        available: false,
        active: true,
        displayOrder: 4,
      },
    ],
  },
];

describe("CustomizationSelector", () => {
  it("renders required and optional groups with unavailable choices disabled", () => {
    render(
      <CustomizationSelector
        groups={groups}
        selections={[]}
        onChange={vi.fn()}
      />,
    );

    const milk = screen.getByRole("group", { name: /Milk Required/ });
    const extras = screen.getByRole("group", { name: "Extras" });
    expect(
      within(milk).getByRole("radio", { name: /Oat milk/ }),
    ).toBeInTheDocument();
    expect(
      within(extras).getByRole("checkbox", { name: /Seasonal topping/ }),
    ).toBeDisabled();
    expect(within(extras).getByText("+$1.00")).toBeInTheDocument();
  });

  it("replaces a single-choice selection", () => {
    const onChange = vi.fn();
    render(
      <CustomizationSelector
        groups={groups}
        selections={[
          { customizationGroupId: "milk", customizationChoiceIds: ["whole"] },
        ]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: /Oat milk/ }));

    expect(onChange).toHaveBeenCalledWith([
      { customizationGroupId: "milk", customizationChoiceIds: ["oat"] },
    ]);
  });

  it("adds and removes optional multiple-choice selections", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CustomizationSelector
        groups={groups}
        selections={[]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: /Extra shot/ }));
    expect(onChange).toHaveBeenCalledWith([
      { customizationGroupId: "extras", customizationChoiceIds: ["shot"] },
    ]);

    rerender(
      <CustomizationSelector
        groups={groups}
        selections={[
          {
            customizationGroupId: "extras",
            customizationChoiceIds: ["shot", "foam"],
          },
        ]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Vanilla syrup/ }));
    expect(onChange).toHaveBeenLastCalledWith([
      {
        customizationGroupId: "extras",
        customizationChoiceIds: ["shot", "foam"],
      },
    ]);

    fireEvent.click(screen.getByRole("checkbox", { name: /Cold foam/ }));
    expect(onChange).toHaveBeenLastCalledWith([
      { customizationGroupId: "extras", customizationChoiceIds: ["shot"] },
    ]);
  });

  it("does not render when the selected menu item has no customization groups", () => {
    const { container } = render(
      <CustomizationSelector groups={[]} selections={[]} onChange={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
