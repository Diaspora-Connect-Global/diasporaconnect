import Step1 from "@/app/[locale]/(protected)/(main)/(home)/events/[id]/Step1";
import Step2 from "@/app/[locale]/(protected)/(main)/(home)/events/[id]/Step2";
import Step3 from "@/app/[locale]/(protected)/(main)/(home)/events/[id]/Step3";
import { ButtonType2 } from "@/components/custom/button";
import CustomDialog from "@/components/custom/customDialog";
import { Spinner } from "@/components/ui/spinner";
import {
    VALIDATE_PROMO_CODE,
    type RegistrationFormField,
    type ValidatePromoCodeData,
} from "@/services/gql/events";
import { useLazyQuery } from "@apollo/client/react";
import { Tag, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useImperativeHandle, useState, forwardRef } from "react";
import { toast } from "sonner";

type CheckoutEvent = {
    id: string;
    title: string;
    startAt: string;
    isPaid: boolean;
    ticketId?: string;
    ticketName?: string;
    ticketDescription?: string;
    ticketPriceInCents?: number;
    registrationFormFields?: RegistrationFormField[];
};

export interface PaidEventsModalRef {
    open: (options?: {
        onPaymentSuccess?: (args: {
            ticketId?: string;
            quantity: number;
            promoCode?: string;
            formResponsesJson?: string;
        }) => Promise<{ waitlistPosition?: number | null } | void> | void;
        event?: CheckoutEvent;
    }) => void;
}

const PaidEventsModal = forwardRef<PaidEventsModalRef>((_, ref) => {
    const t = useTranslations('home.events.payment');
    const locale = useLocale();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
    const [ticketQty, setTicketQty] = useState(1);
    const [totalAmount, setTotalAmount] = useState(0);
    const [openMethod, setOpenMethod] = useState<'card' | 'mobile' | null>(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
    const [onPaymentSuccess, setOnPaymentSuccess] = useState<
        ((args: { ticketId?: string; quantity: number; promoCode?: string; formResponsesJson?: string }) => Promise<{ waitlistPosition?: number | null } | void> | void) | null
    >(null);
    const [selectedEvent, setSelectedEvent] = useState<CheckoutEvent | null>(null);

    // Promo code state
    const [promoCodeInput, setPromoCodeInput] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountCents: number; finalCents: number } | null>(null);
    const [promoError, setPromoError] = useState<string | null>(null);

    // Form fields state
    const [formResponses, setFormResponses] = useState<Record<string, string | string[]>>({});

    const [billing, setBilling] = useState({
        firstName: "", lastName: "", email: "",
        cardNumber: "", expDate: "", cvv: "",
        mobileProvider: "mtn" as "mtn" | "telecel" | "at",
        phoneNumber: "",
    });

    const [validatePromoCode, { loading: validatingPromo }] = useLazyQuery<ValidatePromoCodeData>(VALIDATE_PROMO_CODE, {
        fetchPolicy: 'no-cache',
    });

    useImperativeHandle(ref, () => ({
        open: (options) => {
            resetAndOpen(options?.onPaymentSuccess, options?.event);
        },
    }));

    const resetAndOpen = (
        paymentSuccessHandler?: (args: { ticketId?: string; quantity: number; promoCode?: string; formResponsesJson?: string }) => Promise<{ waitlistPosition?: number | null } | void> | void,
        event?: CheckoutEvent
    ) => {
        setCurrentStep(1);
        setTicketQty(1);
        setTotalAmount(0);
        setOpenMethod(null);
        setWaitlistPosition(null);
        setAppliedPromo(null);
        setPromoCodeInput('');
        setPromoError(null);
        setFormResponses({});
        setOnPaymentSuccess(() => paymentSuccessHandler ?? null);
        setSelectedEvent(event ?? null);
        setBilling({
            firstName: "", lastName: "", email: "",
            cardNumber: "", expDate: "", cvv: "",
            mobileProvider: "mtn", phoneNumber: "",
        });
        setIsDialogOpen(true);
    };

    const closeDialog = () => setIsDialogOpen(false);

    // Recalculate total
    useEffect(() => {
        const unitPrice = selectedEvent?.isPaid ? (selectedEvent.ticketPriceInCents ?? 0) : 0;
        const subtotalCents = ticketQty * unitPrice;
        const discountCents = appliedPromo?.discountCents ?? 0;
        const discountedCents = Math.max(0, subtotalCents - discountCents);
        const serviceFeeCents = selectedEvent?.isPaid ? Math.round(discountedCents * 0.1) : 0;
        setTotalAmount((discountedCents + serviceFeeCents) / 100);
    }, [ticketQty, selectedEvent, appliedPromo]);

    const handleApplyPromo = async () => {
        if (!promoCodeInput.trim() || !selectedEvent) return;
        setPromoError(null);
        const unitPrice = selectedEvent.isPaid ? (selectedEvent.ticketPriceInCents ?? 0) : 0;
        const totalCents = ticketQty * unitPrice;
        try {
            const result = await validatePromoCode({
                variables: {
                    eventId: selectedEvent.id,
                    code: promoCodeInput.trim(),
                    totalAmountCents: totalCents,
                },
            });
            const data = result.data?.validatePromoCode;
            if (data?.valid) {
                setAppliedPromo({
                    code: promoCodeInput.trim(),
                    discountCents: data.discountAmountCents,
                    finalCents: data.finalAmountCents,
                });
                setPromoCodeInput('');
                toast.success('Promo code applied!');
            } else {
                setPromoError(data?.reason ?? 'Invalid promo code');
            }
        } catch {
            setPromoError('Could not validate promo code');
        }
    };

    const removePromo = () => {
        setAppliedPromo(null);
        setPromoError(null);
    };

    const goToNextStep = () => {
        if (currentStep === 1) {
            if (ticketQty === 0) return;
            if (!selectedEvent?.isPaid) {
                processPayment();
                return;
            }
            setCurrentStep(2);
        }
    };

    const updateBilling = (field: keyof typeof billing, value: string) => {
        setBilling(prev => ({ ...prev, [field]: value }));
    };

    const handleFormResponseChange = (fieldId: string, value: string | string[]) => {
        setFormResponses(prev => ({ ...prev, [fieldId]: value }));
    };

    const isFormValid = () => {
        const fields = selectedEvent?.registrationFormFields ?? [];
        return fields.every((f) => {
            if (!f.required) return true;
            const val = formResponses[f.id];
            if (f.type === 'multiselect') return Array.isArray(val) && val.length > 0;
            if (f.type === 'checkbox') return val === 'true';
            return typeof val === 'string' && val.trim().length > 0;
        });
    };

    const processPayment = async () => {
        setIsProcessingPayment(true);
        const fields = selectedEvent?.registrationFormFields ?? [];
        const formResponsesJson = fields.length > 0
            ? JSON.stringify(
                Object.fromEntries(
                    fields.map((f) => [f.id, formResponses[f.id] ?? (f.type === 'multiselect' ? [] : '')])
                )
            )
            : undefined;

        try {
            await new Promise(res => setTimeout(res, 1500));
            let result: { waitlistPosition?: number | null } | void = undefined;
            if (onPaymentSuccess) {
                result = await onPaymentSuccess({
                    ticketId: selectedEvent?.ticketId,
                    quantity: ticketQty,
                    promoCode: appliedPromo?.code,
                    formResponsesJson,
                }) ?? undefined;
            }
            const pos = (result as { waitlistPosition?: number | null } | undefined)?.waitlistPosition ?? null;
            setWaitlistPosition(pos ?? null);
            setCurrentStep(3);
            setIsDialogOpen(false);
            setIsDialogOpen(true); // re-open in step 3 — handled by step render
        } catch (error) {
            const message =
                error instanceof Error && error.message
                    ? error.message
                    : t("paymentFailed");
            toast.error(message);
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const isBillingComplete = () => {
        if (!selectedEvent?.isPaid) return true;
        const common = billing.firstName && billing.lastName && billing.email;
        if (!common) return false;
        if (openMethod === 'card') {
            return !!(billing.cardNumber && billing.expDate && billing.cvv);
        }
        if (openMethod === 'mobile') {
            return billing.phoneNumber.length >= 9;
        }
        return false;
    };

    const formattedEventDate = selectedEvent
        ? new Date(selectedEvent.startAt).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit',
        })
        : "";

    const unitPriceCents = selectedEvent?.isPaid ? (selectedEvent.ticketPriceInCents ?? 0) : 0;
    const unitPrice = unitPriceCents / 100;
    const subtotal = ticketQty * unitPrice;
    const discountAmount = (appliedPromo?.discountCents ?? 0) / 100;
    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
    const serviceFee = selectedEvent?.isPaid ? discountedSubtotal * 0.1 : 0;

    const ticketPriceLabel = selectedEvent?.isPaid
        ? `GH¢ ${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(unitPrice)}`
        : t('free');
    const formatAmount = (value: number) =>
        new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

    const canProceedStep1 = ticketQty > 0 && isFormValid();

    return (
        <CustomDialog
            contentClassName="lg:min-w-[70rem] h-[80vh] overflow-y-auto scrollbar-hidden"
            showFooter={false}
            title={currentStep === 3 ? (waitlistPosition != null ? 'Waitlisted' : t('title')) : t('title')}
            open={isDialogOpen}
            onOpenChange={closeDialog}
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-y-auto p-6 scrollbar-hide bg-surface-default">
                <div className="lg:col-span-2 space-y-6">
                    {currentStep === 1 && (
                        <Step1
                            quantity={ticketQty}
                            onQuantityChange={setTicketQty}
                            eventTitle={selectedEvent?.title ?? ""}
                            eventDate={formattedEventDate}
                            ticketTitle={selectedEvent?.ticketName ?? t('ticketTypeRegular')}
                            ticketPrice={ticketPriceLabel}
                            ticketDescription={selectedEvent?.ticketDescription}
                            registrationFormFields={selectedEvent?.registrationFormFields}
                            formResponses={formResponses}
                            onFormResponseChange={handleFormResponseChange}
                        />
                    )}
                    {currentStep === 2 && (
                        <Step2
                            firstName={billing.firstName}
                            lastName={billing.lastName}
                            email={billing.email}
                            cardNumber={billing.cardNumber}
                            expDate={billing.expDate}
                            cvv={billing.cvv}
                            mobileProvider={billing.mobileProvider}
                            phoneNumber={billing.phoneNumber}
                            onFirstNameChange={v => updateBilling("firstName", v)}
                            onLastNameChange={v => updateBilling("lastName", v)}
                            onEmailChange={v => updateBilling("email", v)}
                            onCardNumberChange={v => updateBilling("cardNumber", v)}
                            onExpDateChange={v => updateBilling("expDate", v)}
                            onCvvChange={v => updateBilling("cvv", v)}
                            onMobileProviderChange={v => updateBilling("mobileProvider", v)}
                            onPhoneNumberChange={v => updateBilling("phoneNumber", v)}
                            openMethod={openMethod}
                            onOpenMethodChange={setOpenMethod}
                        />
                    )}
                    {currentStep === 3 && (
                        <Step3
                            ticketHref={selectedEvent?.id ? `/events/${selectedEvent.id}/ticket` : undefined}
                            waitlistPosition={waitlistPosition}
                        />
                    )}
                </div>

                {/* Sidebar summary */}
                {currentStep !== 3 && (
                    <div className="lg:col-span-1">
                        <div className="sticky top-4">
                            <div className="w-full rounded-lg p-4 border border-border-subtle space-y-5">
                                <p className="text-text-primary font-caption-large">{t('ticketSummary')}</p>

                                <div className="space-y-2 border-b border-b-border-subtle pb-3">
                                    <div className="flex justify-between text-sm">
                                        <span>{ticketQty} × {t('ticketType')}</span>
                                        <span>GH¢ {formatAmount(subtotal)}</span>
                                    </div>
                                    {appliedPromo && (
                                        <div className="flex justify-between text-sm text-text-success">
                                            <span>Discount ({appliedPromo.code})</span>
                                            <span>−GH¢ {formatAmount(discountAmount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm">
                                        <span>{t('subtotal')}</span>
                                        <span>GH¢ {formatAmount(discountedSubtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>{t('serviceFee')}</span>
                                        <span>GH¢ {formatAmount(serviceFee)}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between font-caption-large py-1">
                                    <span>{t('total')}</span>
                                    <span>GH¢ {formatAmount(totalAmount)}</span>
                                </div>

                                {/* Promo code input (paid events only) */}
                                {selectedEvent?.isPaid && currentStep === 1 && (
                                    <div className="space-y-2">
                                        {appliedPromo ? (
                                            <div className="flex items-center justify-between bg-surface-subtle rounded-md px-3 py-2">
                                                <div className="flex items-center gap-2 text-sm text-text-success">
                                                    <Tag className="w-4 h-4" />
                                                    <span>{appliedPromo.code}</span>
                                                </div>
                                                <button onClick={removePromo} className="text-text-secondary hover:text-text-danger">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Promo code"
                                                        value={promoCodeInput}
                                                        onChange={(e) => { setPromoCodeInput(e.target.value); setPromoError(null); }}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                                                        className="flex-1 bg-surface-subtle border-2 border-border-subtle rounded-md px-3 h-9 text-sm focus:outline-none placeholder:text-text-secondary"
                                                    />
                                                    <button
                                                        onClick={handleApplyPromo}
                                                        disabled={validatingPromo || !promoCodeInput.trim()}
                                                        className="text-sm px-3 h-9 rounded-md bg-surface-brand text-text-white disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                                    >
                                                        {validatingPromo ? <Spinner className="h-4 w-4" /> : 'Apply'}
                                                    </button>
                                                </div>
                                                {promoError && (
                                                    <p className="text-xs text-text-danger">{promoError}</p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    {currentStep === 1 && (
                                        <ButtonType2
                                            onClick={goToNextStep}
                                            disabled={!canProceedStep1 || isProcessingPayment}
                                            className="w-full flex items-center justify-center gap-2"
                                        >
                                            {isProcessingPayment
                                                ? <Spinner className="h-5 w-5" />
                                                : selectedEvent?.isPaid ? t('payToAttend') : 'Attend'}
                                        </ButtonType2>
                                    )}
                                    {currentStep === 2 && (
                                        <ButtonType2
                                            onClick={processPayment}
                                            disabled={!isBillingComplete() || isProcessingPayment}
                                            className="w-full flex items-center justify-center gap-2"
                                        >
                                            {isProcessingPayment
                                                ? <Spinner className="h-5 w-5" />
                                                : t('payAmount', { amount: formatAmount(totalAmount) })}
                                        </ButtonType2>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </CustomDialog>
    );
});

PaidEventsModal.displayName = "PaidEventsModal";

export default PaidEventsModal;
