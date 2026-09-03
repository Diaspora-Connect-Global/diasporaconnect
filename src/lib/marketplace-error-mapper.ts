import { toast } from "sonner";

import { errorMessage, type ErrorMessageKey } from "@/lib/client-error-messages";

export type MarketplaceErrorAction =
  | "AUTH_REDIRECT"
  | "NOT_FOUND"
  | "VALIDATION"
  | "BUSINESS_RULE"
  | "GENERIC";

interface ErrorLike {
  message?: unknown;
  code?: unknown;
  extensions?: { code?: unknown };
  graphQLErrors?: Array<{ message?: unknown; code?: unknown; extensions?: { code?: unknown } }>;
  errors?: Array<{ message?: unknown; code?: unknown; extensions?: { code?: unknown } }>;
  cause?: unknown;
}

export interface MarketplaceErrorContext {
  error: unknown;
  locale: string;
  router: {
    replace: (href: string) => void;
  };
  notFoundMessage?: string;
}

const AUTH_CODES = new Set([
  "UNAUTHENTICATED",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "AUTHENTICATION_REQUIRED",
]);

const NOT_FOUND_CODES = new Set([
  "NOT_FOUND",
  "PRODUCT_NOT_FOUND",
  "SERVICE_NOT_FOUND",
  "ORDER_NOT_FOUND",
  "VENDOR_NOT_FOUND",
]);

const VALIDATION_CODES = new Set([
  "BAD_USER_INPUT",
  "VALIDATION_ERROR",
  "INVALID_ARGUMENT",
  "INVALID_STATUS",
  "INVALID_FILTER",
]);

const BUSINESS_RULE_CODES = new Set([
  "INSUFFICIENT_INVENTORY",
  "ORDER_CANCELLATION_NOT_ALLOWED",
  "INVALID_STATUS_TRANSITION",
  "PRICE_MISMATCH",
  "UNSUPPORTED_CURRENCY_PAIR",
  "FORBIDDEN_RESOURCE",
]);

function normalizeCode(value: unknown): string | null {
  if (!value || typeof value !== "string") {
    return null;
  }
  return value.toUpperCase();
}

function extractMessages(error: unknown): string[] {
  const root = error as ErrorLike | null;
  if (!root) return [];

  const messages = new Set<string>();
  if (typeof root.message === "string" && root.message.trim()) {
    messages.add(root.message.trim());
  }

  const pushFromList = (
    list:
      | Array<{ message?: unknown; code?: unknown; extensions?: { code?: unknown } }>
      | undefined
  ) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (typeof item.message === "string" && item.message.trim()) {
        messages.add(item.message.trim());
      }
    }
  };

  pushFromList(root.graphQLErrors);
  pushFromList(root.errors);

  if (root.cause) {
    for (const message of extractMessages(root.cause)) {
      messages.add(message);
    }
  }

  return [...messages];
}

function extractErrorCodes(error: unknown): string[] {
  const root = error as ErrorLike | null;
  if (!root) return [];

  const codes = new Set<string>();
  const rootCode = normalizeCode(root.code);
  const extensionCode = normalizeCode(root.extensions?.code);
  if (rootCode) codes.add(rootCode);
  if (extensionCode) codes.add(extensionCode);

  const pushCodesFromList = (
    list:
      | Array<{ message?: unknown; code?: unknown; extensions?: { code?: unknown } }>
      | undefined
  ) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      const itemCode = normalizeCode(item.code);
      const itemExtensionCode = normalizeCode(item.extensions?.code);
      if (itemCode) codes.add(itemCode);
      if (itemExtensionCode) codes.add(itemExtensionCode);
    }
  };

  pushCodesFromList(root.graphQLErrors);
  pushCodesFromList(root.errors);

  if (root.cause) {
    for (const code of extractErrorCodes(root.cause)) {
      codes.add(code);
    }
  }

  return [...codes];
}

function firstMessage(error: unknown): string {
  const messages = extractMessages(error);
  if (messages.length > 0) {
    return messages[0];
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "";
}

/**
 * Pick the localized copy for an error. Backend messages are English-only, so
 * they are never shown: known codes (and their message-text equivalents) map to
 * a translated key, and anything unrecognized falls back to the category or
 * generic copy. The raw text is logged for debugging instead.
 */
const BUSINESS_RULE_KEYS: Array<[string, string, ErrorMessageKey]> = [
  ["INSUFFICIENT_INVENTORY", "insufficient inventory", "insufficientInventory"],
  ["ORDER_CANCELLATION_NOT_ALLOWED", "cancellation not allowed", "orderCancellationNotAllowed"],
  ["INVALID_STATUS_TRANSITION", "status transition", "invalidStatusTransition"],
  ["PRICE_MISMATCH", "price mismatch", "priceMismatch"],
  ["UNSUPPORTED_CURRENCY_PAIR", "currency pair", "unsupportedCurrencyPair"],
];

function localizedMessage(error: unknown, action: MarketplaceErrorAction): string {
  const codes = extractErrorCodes(error);
  const message = firstMessage(error).toLowerCase();

  for (const [code, phrase, key] of BUSINESS_RULE_KEYS) {
    if (codes.includes(code) || message.includes(phrase)) {
      return errorMessage(key);
    }
  }

  if (action === "VALIDATION") return errorMessage("validation");
  if (action === "BUSINESS_RULE") return errorMessage("businessRule");
  return errorMessage("generic");
}

export function mapMarketplaceErrorToAction(error: unknown): MarketplaceErrorAction {
  const codes = extractErrorCodes(error);
  const message = firstMessage(error).toLowerCase();

  if (codes.some((code) => AUTH_CODES.has(code))) return "AUTH_REDIRECT";
  if (codes.some((code) => NOT_FOUND_CODES.has(code))) return "NOT_FOUND";
  if (codes.some((code) => VALIDATION_CODES.has(code))) return "VALIDATION";
  if (codes.some((code) => BUSINESS_RULE_CODES.has(code))) return "BUSINESS_RULE";

  if (
    message.includes("unauthorized") ||
    message.includes("authentication required") ||
    message.includes("token expired")
  ) {
    return "AUTH_REDIRECT";
  }
  if (
    message.includes("not found") ||
    message.includes("does not exist") ||
    message.includes("no result")
  ) {
    return "NOT_FOUND";
  }
  if (
    message.includes("validation") ||
    message.includes("invalid") ||
    message.includes("must be")
  ) {
    return "VALIDATION";
  }
  if (
    message.includes("insufficient inventory") ||
    message.includes("status transition") ||
    message.includes("price mismatch") ||
    message.includes("not allowed")
  ) {
    return "BUSINESS_RULE";
  }

  return "GENERIC";
}

export function handleMarketplaceError({
  error,
  locale,
  router,
  notFoundMessage,
}: MarketplaceErrorContext): MarketplaceErrorAction {
  const action = mapMarketplaceErrorToAction(error);
  const raw = firstMessage(error);
  if (raw) {
    console.error(`[marketplace error] ${action}: ${raw}`);
  }

  switch (action) {
    case "AUTH_REDIRECT":
      toast.error(errorMessage("sessionExpired"));
      router.replace(`/${locale}/signin`);
      return action;
    case "NOT_FOUND":
      // `notFoundMessage` is supplied already translated by the caller.
      toast.error(notFoundMessage ?? errorMessage("notFound"));
      return action;
    default:
      toast.error(localizedMessage(error, action));
      return action;
  }
}
