import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MenuCategory } from "@coffee-shop/shared/domain/types";

import { CustomizationTemplateManager } from "./CustomizationTemplateManager";
import type { CustomizationTemplate } from "./MenuItemEditor";
import { MenuMaintenancePage } from "../pages/MenuMaintenancePage";
import { getMenuMaintenanceCatalog } from "../services/menuApi";

vi.mock("../services/menuApi", () => ({
  createMenuItem: vi.fn(),
  deleteMenuItem: vi.fn(),
  getMenuMaintenanceCatalog: vi.fn(),
  updateMenuItem: vi.fn(),
}));

const templates: CustomizationTemplate[] = [
  {
    id: "template:milk",
    label: "Milk choices",
    groups: [
      {
        name: "Milk",
        required: true,
        minSelections: 1,
        maxSelections: 1,
        displayOrder: 1,
        active: true,
        choices: [
          {
            name: "Oat milk",
            priceAdjustment: "0.50",
            available: true,
            displayOrder: 1,
            active: true,
          },
        ],
      },
    ],
  },
  { id: "template:syrup", label: "Syrups", groups: [] },
];

const categories: MenuCategory[] = [
  {
    id: "coffee",
    name: "Coffee",
    displayOrder: 1,
    active: true,
    menuItems: [],
  },
];

describe("CustomizationTemplateManager", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("shows an empty template editor with deletion unavailable", () => {
    render(
      <CustomizationTemplateManager
        templates={[]}
        onTemplatesChange={vi.fn()}
        onMessage={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Customization templates" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "New template template editor" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete template" }),
    ).toBeDisabled();
    expect(screen.getByText("Reusable templates")).toBeInTheDocument();
  });

  it("creates an untitled template and tells the parent about the saved template", () => {
    const onTemplatesChange = vi.fn();
    const onMessage = vi.fn();
    vi.spyOn(Date, "now").mockReturnValue(1_754_561_234_000);
    render(
      <CustomizationTemplateManager
        templates={[]}
        onTemplatesChange={onTemplatesChange}
        onMessage={onMessage}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save template" }));

    expect(onTemplatesChange).toHaveBeenCalledWith([
      {
        id: "custom-template:1754561234000",
        label: "Untitled template",
        groups: [],
      },
    ]);
    expect(onMessage).toHaveBeenCalledWith("Untitled template template saved.");
  });

  it("selects a template, saves its edited name, and deletes the selected template", () => {
    const onTemplatesChange = vi.fn();
    const onMessage = vi.fn();
    render(
      <CustomizationTemplateManager
        templates={templates}
        onTemplatesChange={onTemplatesChange}
        onMessage={onMessage}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Edit Syrups/ }));
    expect(screen.getByLabelText("Template name")).toHaveValue("Syrups");
    fireEvent.change(screen.getByLabelText("Template name"), {
      target: { value: "Seasonal syrups" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save template" }));

    expect(onTemplatesChange).toHaveBeenCalledWith([
      templates[0],
      { id: "template:syrup", label: "Seasonal syrups", groups: [] },
    ]);
    expect(onMessage).toHaveBeenCalledWith("Seasonal syrups template saved.");

    fireEvent.click(screen.getByRole("button", { name: "Delete template" }));
    expect(onTemplatesChange).toHaveBeenLastCalledWith([templates[0]]);
    expect(onMessage).toHaveBeenLastCalledWith(
      "Seasonal syrups template deleted.",
    );
  });

  it("writes saved templates through the menu-maintenance localStorage boundary", async () => {
    vi.mocked(getMenuMaintenanceCatalog).mockResolvedValue({ categories });
    vi.spyOn(Date, "now").mockReturnValue(1_754_561_234_000);
    render(<MenuMaintenancePage />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Customization templates" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Add template" }));
    fireEvent.change(screen.getByLabelText("Template name"), {
      target: { value: "Iced drinks" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save template" }));

    expect(
      window.localStorage.getItem("coffee-shop.customizationTemplates.v1"),
    ).toBe(
      JSON.stringify([
        {
          id: "custom-template:1754561234000",
          label: "Iced drinks",
          groups: [],
        },
      ]),
    );
  });
});
