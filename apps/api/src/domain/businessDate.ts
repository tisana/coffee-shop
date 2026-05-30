const DEFAULT_SHOP_TIME_ZONE = "UTC";

function configuredShopTimeZone(): string {
  return process.env.SHOP_TIME_ZONE?.trim() || DEFAULT_SHOP_TIME_ZONE;
}

export function currentBusinessDate(now = new Date()): string {
  const timeZone = configuredShopTimeZone();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error(`Unable to resolve business date for shop time zone "${timeZone}".`);
  }

  return `${year}-${month}-${day}`;
}
