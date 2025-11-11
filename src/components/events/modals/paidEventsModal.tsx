import Step1 from "@/app/[locale]/(protected)/(main)/(home)/events/[id]/Step1";
import Step2 from "@/app/[locale]/(protected)/(main)/(home)/events/[id]/Step2";
import Step3 from "@/app/[locale]/(protected)/(main)/(home)/events/[id]/Step3";
import { ButtonType2 } from "@/components/custom/button";
import CustomDialog from "@/components/custom/customDialog";
import { Spinner } from "@/components/ui/spinner";
import { useTranslations } from "next-intl";
import { useEffect, useImperativeHandle, useState, forwardRef } from "react";

export interface PaidEventsModalRef {
    open: () => void;
}

const PaidEventsModal = forwardRef<PaidEventsModalRef>((_, ref) => {
    const t = useTranslations('home.events.payment');

    // All state is INTERNAL
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDialogSuccessOpen, setIsDialogSuccessOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
    const [ticketQty, setTicketQty] = useState(0);
    const [totalAmount, setTotalAmount] = useState(0);
    const [openMethod, setOpenMethod] = useState<'card' | 'mobile' | null>(null);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    const [billing, setBilling] = useState({
        firstName: "", lastName: "", email: "",
        cardNumber: "", expDate: "", cvv: "",
        mobileProvider: "mtn" as "mtn" | "telecel" | "at",
        phoneNumber: "",
    });

    // Expose open() method to parent via ref
    useImperativeHandle(ref, () => ({
        open: () => {
            resetAndOpen();
        },
    }));

    const resetAndOpen = () => {
        setCurrentStep(1);
        setTicketQty(0);
        setTotalAmount(0);
        setOpenMethod(null);
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
        const subtotal = ticketQty * 300;
        const serviceFee = subtotal * 0.1;
        setTotalAmount(subtotal + serviceFee);
    }, [ticketQty]);

    const goToNextStep = () => {
        if (currentStep === 1 && ticketQty > 0) {
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
            console.log("PAYMENT →", { ticketQty, totalAmount, billing });
            openSuccess();
        } catch (error) {
            alert(t('paymentFailed'));
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const isBillingComplete = () => {
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

    return (
        <>
            {/* Main Payment Dialog */}
            <CustomDialog
                contentClassName="lg:min-w-[70rem] h-[90vh] overflow-y-auto scrollbar-hidden"
                showFooter={false}
                title={t('title')}
                open={isDialogOpen}
                onOpenChange={closeDialog}
            >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[80vh] overflow-y-auto p-6 scrollbar-hide bg-surface-default">
                    <div className="lg:col-span-2 space-y-6">
                        {currentStep === 1 && <Step1 quantity={ticketQty} onQuantityChange={setTicketQty} />}
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
                        {currentStep === 3 && <Step3 />}
                    </div>

                    <div className="lg:col-span-1">
                        <div className="sticky top-4">
                            <div className=" w-[20rem] rounded-lg p-4 border border-border-subtle space-y-8">
                                <div className="text-text-primary font-caption-large">{t('ticketSummary')}</div>

                                <div className="space-y-2 border-b border-b-border-subtle pb-3">
                                    <div className="flex justify-between">
                                        <span>{ticketQty} × {t('ticketType')}</span>
                                        <span>GH¢ {(ticketQty * 300).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>{t('subtotal')}</span>
                                        <span>GH¢ {(ticketQty * 300).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>{t('serviceFee')}</span>
                                        <span>GH¢ {(ticketQty * 30).toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between font-caption-large py-2">
                                    <span>{t('total')}</span>
                                    <span>GH¢ {totalAmount.toFixed(2)}</span>
                                </div>

                                <div className="mt-6 space-y-3">
                                    {currentStep === 1 && (
                                        <ButtonType2
                                            onClick={goToNextStep}
                                            disabled={ticketQty === 0}
                                            className="w-full"
                                        >
                                            {t('payToAttend')}
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
                                                t('payAmount', { amount: totalAmount.toFixed(2) })
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
                contentClassName="lg:min-w-[70rem] h-[90vh] overflow-y-auto"
                showFooter={false}
                title={t('title')}
                open={isDialogSuccessOpen}
                onOpenChange={closeSuccess}
            >
                <div className="p-6">

                    <Step3 />
                </div>
            </CustomDialog>
        </>
    );
});

PaidEventsModal.displayName = "PaidEventsModal";

export default PaidEventsModal;