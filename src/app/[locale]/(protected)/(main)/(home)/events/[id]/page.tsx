"use client"
import EventCard2 from "@/components/cards/events/EventCard2";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import Step1 from "./Step1";
import Step2 from "./Step2";
import Step3 from "./Step3";
import { ButtonType2 } from "@/components/custom/button";
import { Spinner } from "@/components/ui/spinner";


export default function EventsId() {
    const event = {
        title: "Accra Arts Festival",
        date: "Oct 21, 2025, 3:00PM",
        location: "Ghana Embassy, Belgium",
        attendees: 32,
        imageUrl: "/EVENT.png",
    }


    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDialogSuccessOpen, setIsDialogSuccessOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
    const [ticketQty, setTicketQty] = useState(0);
    const [totalAmount, setTotalAmount] = useState(0);
    const [openMethod, setOpenMethod] = useState<'card' | 'mobile' | null>(null);
    const [billing, setBilling] = useState({
        firstName: "",
        lastName: "",
        email: "",
        cardNumber: "",
        expDate: "",      // MM/YY
        cvv: "",
        mobileProvider: "mtn" as "mtn" | "telecel" | "at",
        phoneNumber: "",
    });
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    // Open dialog and reset
    const openDialog = () => {
        setIsDialogOpen(true);
        setCurrentStep(1);
        setTicketQty(0);
        setTotalAmount(0);
    };


    const goToNextStep = () => {
        if (currentStep === 1 && ticketQty > 0) {
            setCurrentStep(2); // Just go to next step
        }
    };

    // Helper to update a single field
    const updateBilling = (field: keyof typeof billing, value: string) => {
        setBilling(prev => ({ ...prev, [field]: value }));
    };

    // ---------- Payment ----------
    const processPayment = async () => {
        setIsProcessingPayment(true);

        try {
            await new Promise(res => setTimeout(res, 1500));

            console.log("PAYMENT DATA →", { ...billing });

            setCurrentStep(3);
            setIsDialogOpen(false);
            setIsDialogSuccessOpen(true);
        } catch (error) {
            console.error("Payment failed:", error);
            alert("Payment failed. Please try again.");
        } finally {
            setIsProcessingPayment(false); // Always reset
        }
    };


    const isBillingComplete = () => {
        const common = billing.firstName && billing.lastName && billing.email;
        if (!common) return false;

        // Credit-card selected?
        if (openMethod === 'card') {
            return (
                billing.cardNumber &&
                billing.expDate &&
                billing.cvv
            );
        }

        // Mobile selected?
        if (openMethod === 'mobile') {
            return billing.phoneNumber.length >= 9; // +233 24 000 0000 → 9 digits after +233
        }

        // No method selected → incomplete
        return false;
    };

    useEffect(() => {
        const subtotal = ticketQty * 300;
        const serviceFee = subtotal * 0.1;
        setTotalAmount(subtotal + serviceFee);
    }, [ticketQty]);


    return (

        <>
            <div className="w-full h-[53.625rem]  overflow-auto scrollbar-hide p-4">
                <div className=" min-w-[40rem]  max-h-[53.625rem]  mx-auto">
                    <EventCard2
                        title={event.title}
                        date={event.date}
                        location={event.location}
                        attendees={event.attendees}
                        imageUrl={event.imageUrl}

                        onBuyClick={openDialog}
                    />
                </div>
            </div>
            <div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="lg:min-w-[70rem] h-[90vh] overflow-y-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Column - Main Content */}
                            <div className="lg:col-span-2 space-y-6">
                                <DialogHeader className="text-left">

                                    {/* Job Title */}
                                    <DialogTitle className="text-2xl font-bold text-text-primary">
                                        Pay for tickets
                                    </DialogTitle>


                                </DialogHeader>



                                <div className=" ">


                                    {/* Conditional Step Rendering */}
                                    {currentStep === 1 && <Step1 quantity={ticketQty} onQuantityChange={setTicketQty} />}
                                    {currentStep === 2 &&
                                        <Step2
                                            // ---- Pass state + handlers ----
                                            firstName={billing.firstName}
                                            lastName={billing.lastName}
                                            email={billing.email}
                                            cardNumber={billing.cardNumber}
                                            expDate={billing.expDate}
                                            cvv={billing.cvv}
                                            mobileProvider={billing.mobileProvider}
                                            phoneNumber={billing.phoneNumber}
                                            // ---- Handlers ----
                                            onFirstNameChange={(v) => updateBilling("firstName", v)}
                                            onLastNameChange={(v) => updateBilling("lastName", v)}
                                            onEmailChange={(v) => updateBilling("email", v)}
                                            onCardNumberChange={(v) => updateBilling("cardNumber", v)}
                                            onExpDateChange={(v) => updateBilling("expDate", v)}
                                            onCvvChange={(v) => updateBilling("cvv", v)}
                                            onMobileProviderChange={(v) => updateBilling("mobileProvider", v)}
                                            onPhoneNumberChange={(v) => updateBilling("phoneNumber", v)}
                                            openMethod={openMethod}
                                            onOpenMethodChange={setOpenMethod}
                                        />
                                    }
                                    {currentStep === 3 && <Step3 />}

                                </div>
                            </div>


                            {/* Right Column - Job Meta Information */}
                            <div className="lg:col-span-1">
                                <div className="sticky top-4 space-y-6">
                                    {/* Job Meta Information Card */}
                                    <div className="bg-surface-tertiary w-[20rem] rounded-lg p-4 border border-border-subtle space-y-12">
                                        <div className="space-y-4">
                                            <div className="text-text-primary font-caption-large">
                                                Ticket Summary
                                            </div>

                                            <div className="flex items-center gap-2 text-text-primary border-b py-2 border-b-border-subtle justify-between">
                                                <p> {ticketQty} x ticket type</p> <p>GH¢ {(ticketQty * 300).toFixed(2)}</p>
                                            </div>
                                            <div className=" items-center gap-2 text-text-primary border-b py-1 border-b-border-subtle">
                                                <div className="flex justify-between">
                                                    <p>Subtotal</p> <p>GH¢ {(ticketQty * 300).toFixed(2)}</p>
                                                </div>
                                                <div className="flex justify-between">
                                                    <p>Service fee</p> <p> GH¢ {(ticketQty * 30).toFixed(2)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-text-primary font-caption-large  py-2 justify-between">
                                                <p>Total</p> <p>GH¢ {totalAmount.toFixed(2)}</p>
                                            </div>


                                        </div>

                                        {/* Action Buttons */}
                                        <div className="mt-2 w-full flex flex-col justify-center gap-3">

                                            <div className="mt-6">
                                                {currentStep === 1 && (
                                                    <ButtonType2
                                                        onClick={goToNextStep}
                                                        disabled={ticketQty === 0}
                                                        className="w-full px-6 py-3 bg-surface-brand text-text-white font-medium rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        Pay to attend
                                                    </ButtonType2>
                                                )}
                                                {currentStep === 2 && (
                                                    <ButtonType2
                                                        onClick={processPayment}
                                                        disabled={!isBillingComplete() || isProcessingPayment}
                                                        className={`
        w-full px-6 py-3 bg-surface-brand text-text-white font-medium rounded-full 
        transition-colors flex items-center justify-center gap-2
        ${(!isBillingComplete() || isProcessingPayment)
                                                                ? 'opacity-50 cursor-not-allowed'
                                                                : 'hover:bg-surface-brand-hover'
                                                            }
    `}
                                                    >
                                                        {isProcessingPayment ? (
                                                            <>
                                                                <Spinner className="h-5 w-5" />

                                                            </>
                                                        ) : (
                                                            <>Pay GH¢ {totalAmount.toFixed(2)}</>
                                                        )}
                                                    </ButtonType2>
                                                )}

                                            </div>


                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

            </div>
            <div>

                <Dialog open={isDialogSuccessOpen} onOpenChange={setIsDialogSuccessOpen}>
                    <DialogContent className="lg:min-w-[70rem] h-[90vh]  overflow-y-auto">
                        <p className="font-display-large">
                            Pay for tickets
                        </p>
                        <Step3 />
                    </DialogContent>
                </Dialog>
            </div>
        </>



    );

}