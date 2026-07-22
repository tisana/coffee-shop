import { z } from "zod";

import { BEVERAGE_STATUSES, ORDER_STATUSES } from "@coffee-shop/shared/domain/status";

const idSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optionalTextSchema = z.string().trim().min(1).max(500).optional();
const optionalEmailSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().email().max(254).nullable().optional()
);
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

const orderBeveragesInputSchema = z
  .array(
    z.object({
      menuItemId: idSchema,
      quantity: z.coerce.number().int().min(1),
      selectedCustomizations: z.array(selectedCustomizationSchema).default([]),
      specialInstructions: optionalTextSchema
    })
  )
  .min(1);

export const createOrderRequestSchema = z.object({
  pickupName: z.string().trim().min(1).max(120).optional(),
  beverages: orderBeveragesInputSchema
});

export const createOrderWithLoyaltyRequestSchema = createOrderRequestSchema.extend({
  loyalty: z.object({
    customerId: idSchema,
    rewards: z.array(z.object({
      rewardOptionId: idSchema,
      targetBeverageIndex: z.coerce.number().int().min(0),
      targetCustomizationChoiceId: idSchema.optional()
    })).default([])
  }).optional()
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

export const loyaltyCustomerInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(1).max(40),
  email: optionalEmailSchema
});

export const loyaltyCustomerUpdateSchema = loyaltyCustomerInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one customer field is required.");

export const loyaltyCustomerParamsSchema = z.object({
  customerId: idSchema
});

export const loyaltyCustomerSearchQuerySchema = z.object({
  query: z.string().trim().min(1).max(120),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

export const loyaltyEarningRuleInputSchema = z
  .object({
    earningType: z.enum(["purchase_amount", "beverage_count"]),
    amountThreshold: moneySchema.optional(),
    beverageCountThreshold: z.coerce.number().int().min(1).optional(),
    pointsAwarded: z.coerce.number().int().min(1)
  })
  .superRefine((value, context) => {
    const amountRule = value.earningType === "purchase_amount";
    if ((amountRule && (value.amountThreshold === undefined || value.beverageCountThreshold !== undefined)) || (!amountRule && (value.beverageCountThreshold === undefined || value.amountThreshold !== undefined))) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Exactly one threshold must match the earning type." });
    }
  });

export const loyaltyExpirationPolicyInputSchema = z
  .object({
    enabled: z.boolean(),
    expirationMonths: z.coerce.number().int().min(1).optional()
  })
  .superRefine((value, context) => {
    if (value.enabled && value.expirationMonths === undefined) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["expirationMonths"], message: "Expiration months are required when expiration is enabled." });
    }
    if (!value.enabled && value.expirationMonths !== undefined) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["expirationMonths"], message: "Expiration months must be omitted when expiration is disabled." });
    }
  });

export const loyaltyRewardOptionInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  pointsCost: z.coerce.number().int().min(1),
  benefitType: z.enum(["free_beverage", "size_upgrade"]),
  benefitDescription: z.string().trim().min(1).max(500),
  active: z.boolean().optional()
});

export const loyaltyRewardOptionUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  pointsCost: z.coerce.number().int().min(1).optional(),
  benefitDescription: z.string().trim().min(1).max(500).optional(),
  active: z.boolean().optional()
}).refine((value) => Object.keys(value).length > 0, "At least one reward field is required.");

export const loyaltyRewardListQuerySchema = z.object({
  includeInactive: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true")
});

export const loyaltyRewardParamsSchema = z.object({ rewardId: idSchema });

export const loyaltyRewardSelectionSchema = z.object({
  rewardOptionId: idSchema,
  targetBeverageIndex: z.coerce.number().int().min(0),
  targetCustomizationChoiceId: idSchema.optional()
});
