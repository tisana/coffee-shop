import { z } from "zod";

import { BEVERAGE_STATUSES, ORDER_STATUSES } from "@coffee-shop/shared/domain/status";

const idSchema = z.string().uuid();
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

export const menuItemInputSchema = z.object({
  categoryId: idSchema,
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).nullable().optional(),
  price: moneySchema,
  available: z.boolean().default(true),
  active: z.boolean().default(true),
  customizationGroups: z.array(customizationGroupInputSchema).default([])
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

export const orderStatusSchema = z.enum(ORDER_STATUSES);
export const beverageStatusSchema = z.enum(BEVERAGE_STATUSES);
