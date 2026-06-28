import { z } from "zod";

import { BEVERAGE_STATUSES, ORDER_STATUSES } from "@coffee-shop/shared/domain/status";

const idSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optionalTextSchema = z.string().trim().min(1).max(500).optional();
const moneySchema = z
  .union([z.string(), z.number()])
  .transform((value) => (typeof value === "number" ? value.toFixed(2) : value))
  .pipe(z.string().regex(/^\d+(\.\d{1,2})?$/));

export const loginRequestSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(200)
});

export const selectedCustomizationSchema = z.object({
  customizationGroupId: idSchema,
  customizationChoiceIds: z.array(idSchema).min(1)
});

export const createOrderRequestSchema = z.object({
  pickupName: z.string().trim().min(1).max(120).optional(),
  beverages: z
    .array(
      z.object({
        menuItemId: idSchema,
        quantity: z.coerce.number().int().min(1),
        selectedCustomizations: z.array(selectedCustomizationSchema).default([]),
        specialInstructions: optionalTextSchema
      })
    )
    .min(1)
});

export const customizationChoiceInputSchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(1).max(120),
  priceAdjustment: moneySchema.default("0.00"),
  available: z.boolean().default(true),
  displayOrder: z.coerce.number().int().min(0).default(0),
  active: z.boolean().default(true)
});

export const customizationGroupInputSchema = z
  .object({
    id: idSchema.optional(),
    name: z.string().trim().min(1).max(120),
    required: z.boolean().default(false),
    minSelections: z.coerce.number().int().min(0).default(0),
    maxSelections: z.coerce.number().int().min(1).default(1),
    displayOrder: z.coerce.number().int().min(0).default(0),
    active: z.boolean().default(true),
    choices: z.array(customizationChoiceInputSchema).default([])
  })
  .superRefine((value, context) => {
    if (value.maxSelections < value.minSelections) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxSelections"],
        message: "maxSelections must be greater than or equal to minSelections"
      });
    }

    if (!value.required && value.minSelections !== 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minSelections"],
        message: "minSelections must be 0 when the group is not required"
      });
    }
  });

const menuItemBaseInputSchema = z.object({
  categoryId: idSchema,
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).nullable().optional(),
  imageUrl: z.string().trim().url().max(2048).nullable().optional(),
  price: moneySchema,
  available: z.boolean().default(true),
  active: z.boolean().default(true)
});

export const menuItemInputSchema = menuItemBaseInputSchema.extend({
  customizationGroups: z.array(customizationGroupInputSchema).default([])
});

export const menuItemUpdateInputSchema = menuItemBaseInputSchema.extend({
  customizationGroups: z.array(customizationGroupInputSchema).optional()
});

export const menuItemParamsSchema = z.object({
  itemId: idSchema
});

export const orderIdParamsSchema = z.object({
  orderId: idSchema
});

export const beverageParamsSchema = z.object({
  orderId: idSchema,
  beverageId: idSchema
});

export const beverageCancelRequestSchema = z.object({
  reason: optionalTextSchema
});

export const historyQuerySchema = z.object({
  dailyOrderNumber: z.coerce.number().int().min(1).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  pickupName: z.string().trim().min(1).max(120).optional()
});

const reportPeriodSchema = z.enum(["daily", "weekly", "monthly"]);
const reportStatusesSchema = z
  .union([z.string(), z.array(z.enum(ORDER_STATUSES))])
  .optional()
  .transform((value) => {
    if (value === undefined || value === "") {
      return ["completed", "picked_up"] as Array<(typeof ORDER_STATUSES)[number]>;
    }

    if (Array.isArray(value)) {
      return value;
    }

    return value.split(",").filter((status) => status.length > 0);
  })
  .pipe(z.array(z.enum(ORDER_STATUSES)).min(1));

const reportBaseQueryShape = {
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  period: reportPeriodSchema.default("daily"),
  statuses: reportStatusesSchema,
  menuCategoryId: idSchema.optional(),
  menuItemId: idSchema.optional()
};

function refineReportDateRange<T extends { startDate?: string | undefined; endDate?: string | undefined }>(
  value: T,
  context: z.RefinementCtx
): void {
    if (value.startDate && value.endDate && value.startDate > value.endDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "endDate must be on or after startDate"
      });
    }
}

export const reportSalesQuerySchema = z.object(reportBaseQueryShape).superRefine(refineReportDateRange);

export const reportOrdersQuerySchema = z
  .object({
    ...reportBaseQueryShape,
    periodKey: z.string().trim().min(1).max(80).optional(),
    combinationKey: z.string().trim().min(1).max(500).optional()
  })
  .superRefine(refineReportDateRange);

export const orderStatusSchema = z.enum(ORDER_STATUSES);
export const beverageStatusSchema = z.enum(BEVERAGE_STATUSES);
