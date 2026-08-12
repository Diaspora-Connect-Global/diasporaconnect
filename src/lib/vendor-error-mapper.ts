import { toast } from "sonner";

import { errorMessage } from "@/lib/client-error-messages";

export type VendorErrorAction =
  | "AUTH_REDIRECT"
  | "ONBOARDING_CTA"
  | "KYC_MODAL"
  | "GENERIC";

export interface VendorErrorContext {
  error: unknown;
  locale: string;
  router: {
    replace: (href: string) => void;
    push: (href: string) => void;
  };
  openKycModal?: () => void;
  onOnboardingRequired?: () => void;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "";
}

function normalizeCode(value: unknown): string | null {
  if (!value || typeof value !== "string") {
    return null;
  }
  return value.toUpperCase();
}

function extractErrorCodes(error: unknown): string[] {
  const root = error as {
    code?: unknown;
    extensions?: { code?: unknown };
    graphQLErrors?: Array<{ extensions?: { code?: unknown }; code?: unknown }>;
    errors?: Array<{ extensions?: { code?: unknown }; code?: unknown }>;
    cause?: unknown;
  } | null;

  if (!root) {
    return [];
  }

  const codes = new Set<string>();
  const rootCode = normalizeCode(root.code);
  const extensionCode = normalizeCode(root.extensions?.code);
  if (rootCode) codes.add(rootCode);
  if (extensionCode) codes.add(extensionCode);

  const pushCodesFromList = (
    list: Array<{ extensions?: { code?: unknown }; code?: unknown }> | undefined
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

  // Handle nested causes from wrapped errors.
  if (root.cause) {
    for (const code of extractErrorCodes(root.cause)) {
      codes.add(code);
    }
  }

  return [...codes];
}

export function mapVendorErrorToAction(error: unknown): VendorErrorAction {
  const message = getErrorMessage(error).toLowerCase();
  const codes = extractErrorCodes(error);

  const hasAuthCode = codes.some((code) =>
    ["UNAUTHENTICATED", "UNAUTHORIZED", "FORBIDDEN", "AUTHENTICATION_REQUIRED"].includes(code)
  );
  if (hasAuthCode) {
    return "AUTH_REDIRECT";
  }

  const hasVendorNotFoundCode = codes.some((code) =>
    ["VENDOR_NOT_FOUND", "NO_VENDOR_PROFILE", "VENDOR_PROFILE_NOT_FOUND"].includes(code)
  );
  if (hasVendorNotFoundCode) {
    return "ONBOARDING_CTA";
  }

  const hasKycCode = codes.some((code) =>
    ["KYC_REQUIRED", "COMPLIANCE_REQUIRED", "PAYOUT_NOT_ELIGIBLE"].includes(code)
  );
  if (hasKycCode) {
    return "KYC_MODAL";
  }

  if (
    message.includes("authentication required") ||
    message.includes("unauthorized") ||
    message.includes("token expired") ||
    message.includes("forbidden resource")
  ) {
    return "AUTH_REDIRECT";
  }

  if (
    message.includes("vendor not found") ||
    message.includes("no vendor profile") ||
    message.includes("vendor profile not found")
  ) {
    return "ONBOARDING_CTA";
  }

  if (
    message.includes("kyc_required") ||
    message.includes("kyc required") ||
    message.includes("canreceivepayout=false") ||
    message.includes("compliance failure")
  ) {
    return "KYC_MODAL";
  }

  return "GENERIC";
}

export function handleVendorError({
  error,
  locale,
  router,
  openKycModal,
  onOnboardingRequired,
}: VendorErrorContext): VendorErrorAction {
  const action = mapVendorErrorToAction(error);
  // Backend copy is English-only, so it is logged rather than shown.
  const raw = getErrorMessage(error);
  if (raw) {
    console.error(`[vendor error] ${action}: ${raw}`);
  }

  switch (action) {
    case "AUTH_REDIRECT":
      toast.error(errorMessage("sessionExpired"));
      router.replace(`/${locale}/signin`);
      return action;
    case "ONBOARDING_CTA":
      toast.error(errorMessage("vendorProfileRequired"));
      if (onOnboardingRequired) {
        onOnboardingRequired();
      } else {
        router.push(`/${locale}/becomeavendor`);
      }
      return action;
    case "KYC_MODAL":
      toast.error(errorMessage("kycRequired"));
      openKycModal?.();
      return action;
    default:
      toast.error(errorMessage("generic"));
      return action;
  }
}

