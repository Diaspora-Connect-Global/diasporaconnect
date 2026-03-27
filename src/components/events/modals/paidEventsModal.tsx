import Step1 from "@/app/[locale]/(protected)/(main)/(home)/events/[id]/Step1";
import Step2 from "@/app/[locale]/(protected)/(main)/(home)/events/[id]/Step2";
import Step3 from "@/app/[locale]/(protected)/(main)/(home)/events/[id]/Step3";
import { ButtonType2 } from "@/components/custom/button";
import CustomDialog from "@/components/custom/customDialog";
import { Spinner } from "@/components/ui/spinner";
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
};

export interface PaidEventsModalRef {
    open: (options?: {
        onPaymentSuccess?: (args: { ticketId?: string; quantity: number }) => Promise<void> | void;
        event?: CheckoutEvent
    }) => void;
}

const PaidEventsModal = forwardRef<PaidEventsModalRef>((_, ref) => {
    const t = useTranslations('home.events.payment');
    const locale = useLocale();

    // All state is INTERNAL
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDialogSuccessOpen, setIsDialogSuccessOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
    const [ticketQty, setTicketQty] = useState(0);
    const [totalAmount, setTotalAmount] = useState(0);
    const [openMethod, setOpenMethod] = useState<'card' | 'mobile' | null>(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [onPaymentSuccess, setOnPaymentSuccess] = useState<((args: { ticketId?: string; quantity: number }) => Promise<void> | void) | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<CheckoutEvent | null>(null);

    const [billing, setBilling] = useState({
        firstName: "", lastName: "", email: "",
        cardNumber: "", expDate: "", cvv: "",
        mobileProvider: "mtn" as "mtn" | "telecel" | "at",
        phoneNumber: "",
    });

    // Expose open() method to parent via ref
    useImperativeHandle(ref, () => ({
        open: (options) => {
            resetAndOpen(options?.onPaymentSuccess, options?.event);
        },
    }));

    const resetAndOpen = (
        paymentSuccessHandler?: (args: { ticketId?: string; quantity: number }) => Promise<void> | void,
        event?: CheckoutEvent
    ) => {
        setCurrentStep(1);
        setTicketQty(1);
        setTotalAmount(0);
        setOpenMethod(null);
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
    const openSuccess = () => {
        setIsDialogSuccessOpen(true);
        setIsDialogOpen(false);
    };
    const closeSuccess = () => setIsDialogSuccessOpen(false);

    // Recalculate total
    useEffect(() => {
        const unitPrice = selectedEvent?.isPaid ? (selectedEvent.ticketPriceInCents ?? 0) / 100 : 0;
        const subtotal = ticketQty * unitPrice;
        const serviceFee = selectedEvent?.isPaid ? subtotal * 0.1 : 0;
        setTotalAmount(subtotal + serviceFee);
    }, [ticketQty, selectedEvent]);

    const goToNextStep = () => {
        if (currentStep === 1 && ticketQty > 0) {
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

    const processPayment = async () => {
        setIsProcessingPayment(true);
        try {
            await new Promise(res => setTimeout(res, 1500));
            if (onPaymentSuccess) {
                await onPaymentSuccess({
                    ticketId: selectedEvent?.ticketId,
                    quantity: ticketQty,
                });
            }
            console.log("PAYMENT →", { ticketQty, totalAmount, billing });
            openSuccess();
        } catch (error) {
            const message =
                error instanceof Error && error.message
                    ? error.message
                    : t("paymentFailed");
            toast.error(message);
            console.error(error);
            // Stay on current step; do not open success dialog
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const isBillingComplete = () => {
        if (!selectedEvent?.isPaid) return true;
        const common = billing.firstName && billing.lastName && billing.email;
        if (!common) return false;
        if (openMethod === 'card') {
            return billing.cardNumber && billing.expDate && billing.cvv;
        }
        if (openMethod === 'mobile') {
            return billing.phoneNumber.length >= 9;
        }
        return false;
    };

    const formattedEventDate = selectedEvent
        ? new Date(selectedEvent.startAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        })
        : "";
    const ticketPriceLabel = selectedEvent?.isPaid
        ? `GH¢ ${new Intl.NumberFormat(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format((selectedEvent.ticketPriceInCents ?? 0) / 100)}`
        : t('free');
    const unitPrice = selectedEvent?.isPaid ? (selectedEvent.ticketPriceInCents ?? 0) / 100 : 0;
    const formatAmount = (value: number) =>
        new Intl.NumberFormat(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);

    return (
        <>
            {/* Main Payment Dialog */}
            <CustomDialog
                contentClassName="lg:min-w-[70rem] h-[80vh] overflow-y-auto scrollbar-hidden"
                showFooter={false}
                title={t('title')}
                open={isDialogOpen}
                onOpenChange={closeDialog}
            >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh] overflow-y-auto p-6 scrollbar-hide bg-surface-default">
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
                                ticketHref={
                                    selectedEvent?.id
                                        ? `/events/${selectedEvent.id}/ticket`
                                        : undefined
                                }
                            />
                        )}
                    </div>

                    <div className="lg:col-span-1">
                        <div className="sticky top-4">
                            <div className=" w-[20rem] rounded-lg p-4 border border-border-subtle space-y-8">
                                <div className="text-text-primary font-caption-large">{t('ticketSummary')}</div>

                                <div className="space-y-2 border-b border-b-border-subtle pb-3">
                                    <div className="flex justify-between">
                                        <span>{ticketQty} × {t('ticketType')}</span>
                                        <span>GH¢ {formatAmount(ticketQty * unitPrice)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>{t('subtotal')}</span>
                                        <span>GH¢ {formatAmount(ticketQty * unitPrice)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>{t('serviceFee')}</span>
                                        <span>GH¢ {formatAmount(selectedEvent?.isPaid ? (ticketQty * unitPrice * 0.1) : 0)}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between font-caption-large py-2">
                                    <span>{t('total')}</span>
                                    <span>GH¢ {formatAmount(totalAmount)}</span>
                                </div>

                                <div className="mt-6 space-y-3">
                                    {currentStep === 1 && (
                                        <ButtonType2
                                            onClick={goToNextStep}
                                            disabled={ticketQty === 0}
                                            className="w-full"
                                        >
                                            {selectedEvent?.isPaid ? t('payToAttend') : 'Attend'}
                                        </ButtonType2>
                                    )}
                                    {currentStep === 2 && (
                                        <ButtonType2
                                            onClick={processPayment}
                                            disabled={!isBillingComplete() || isProcessingPayment}
                                            className="w-full flex items-center justify-center gap-2"  // ← ADD THIS
                                        >
                                            {isProcessingPayment ? (
                                                <Spinner className="h-5 w-5" />
                                            ) : (
                                                t('payAmount', { amount: formatAmount(totalAmount) })
                                            )}
                                        </ButtonType2>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CustomDialog>

            {/* Success Dialog */}
            <CustomDialog
                contentClassName="lg:min-w-[70rem] h-[80vh] overflow-y-auto"
                showFooter={false}
                title={t('title')}
                open={isDialogSuccessOpen}
                onOpenChange={closeSuccess}
            >
                <div className="p-6">

                    <Step3
                        ticketHref={
                            selectedEvent?.id
                                ? `/events/${selectedEvent.id}/ticket`
                                : undefined
                        }
                    />
                </div>
            </CustomDialog>
        </>
    );
});

PaidEventsModal.displayName = "PaidEventsModal";

export default PaidEventsModal;