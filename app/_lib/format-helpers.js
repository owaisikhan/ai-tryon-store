import { siteConfig } from "@/app/_lib/siteConfig";

const money = new Intl.NumberFormat(siteConfig.locale, {
  style: "currency",
  currency: siteConfig.currency,
  maximumFractionDigits: 0,
});

export function formatPrice(value) {
  return money.format(value);
}

export function pluralize(count, one, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}
