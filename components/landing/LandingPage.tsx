"use client";

import { useState, type FormEvent } from "react";
import {
    AlertTriangle,
    ArrowRight,
    Check,
    CheckCircle2,
    Clock3,
    CreditCard,
    Package,
    QrCode,
    ShieldCheck,
    Sparkles,
    Store,
    Upload,
    X,
} from "lucide-react";


import AuthModal from "./AuthModal";

type AuthMode = "login" | "signup" | null;

type PricingPlan = {
    name: string;
    label: string;
    price: string;
    amount: number;
    period: string;
    description: string;
    features: string[];
    buttonText: string;
    highlighted?: boolean;
};

const pricingPlans: PricingPlan[] = [
    {
        name: "Starter",
        label: "Free",
        price: "₱0",
        amount: 0,
        period: "/month",
        description:
            "For small or starting event and party supply businesses that need basic tools.",
        features: [
            "Inventory and product catalog",
            "Booking management",
            "Basic POS and sales recording",
            "Up to 50 inventory items",
            "Up to 20 bookings per month",
            "1 owner or administrator account",
            "Basic dashboard overview",
        ],
        buttonText: "Use Starter",
    },
    {
        name: "Business",
        label: "Standard",
        price: "₱499",
        amount: 499,
        period: "/month",
        description:
            "For growing event and party supply businesses with regular bookings and staff.",
        features: [
            "Everything included in Starter",
            "Up to 500 inventory items",
            "Unlimited bookings",
            "Up to 3 staff accounts",
            "Low-stock notifications",
            "Sales and booking analytics",
            "Downloadable reports",
            "Complete transaction history",
        ],
        buttonText: "Choose Business",
        highlighted: true,
    },
    {
        name: "Enterprise",
        label: "Advanced",
        price: "₱1,299",
        amount: 1299,
        period: "/month",
        description:
            "For larger event and party supply businesses that need higher limits and advanced tools.",
        features: [
            "Everything included in Business",
            "Up to 2,000 inventory items",
            "Unlimited bookings",
            "Up to 10 staff accounts",
            "Advanced business analytics",
            "Sales forecasting",
            "Multi-role account access",
            "Extended transaction history",
        ],
        buttonText: "Choose Enterprise",
    },
];

export default function LandingPage({
                                        onSignupSuccess,
                                    }: {
    onSignupSuccess: () => void;
}) {
    const [authMode, setAuthMode] = useState<AuthMode>(null);


    const [selectedPlan, setSelectedPlan] =
        useState<PricingPlan | null>(null);

    const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] =
        useState(false);

    // Temporary value while the account and subscription API
    // are not connected yet.
    const currentPlanName = "Starter";

    const handleSelectPlan = (plan: PricingPlan) => {
        setSelectedPlan(plan);
        setIsSubscriptionModalOpen(true);
    };

    const handleCloseSubscriptionModal = () => {
        setIsSubscriptionModalOpen(false);
        setSelectedPlan(null);
    };

    const handleContinueWithStarter = () => {
        setIsSubscriptionModalOpen(false);
        setAuthMode("signup");
    };


    return (
        <main className="min-h-screen overflow-x-hidden bg-[#FDFAF4] text-[#1A1220]">
            <nav className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[#EBE4F0] bg-white px-6 lg:px-10">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2D1B4E] text-[#C9951A]">
                        <Package className="h-5 w-5" />
                    </div>

                    <span className="text-lg font-semibold tracking-tight">
                        <span className="text-[#2D1B4E]">Stock</span>NBook
                    </span>
                </div>

                <div className="hidden items-center gap-8 text-sm text-[#7A6E88] md:flex">
                    <a href="#features" className="transition hover:text-[#2D1B4E]">
                        Features
                    </a>

                    <a href="#pricing" className="transition hover:text-[#2D1B4E]">
                        Pricing
                    </a>

                    <a href="#how-it-works" className="transition hover:text-[#2D1B4E]">
                        About
                    </a>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setAuthMode("login")}
                        className="rounded-lg border border-[#EBE4F0] px-4 py-2 text-sm font-medium text-[#1A1220] transition hover:bg-[#EEE8F8]"
                    >
                        Log in
                    </button>

                    <button
                        onClick={() => setAuthMode("signup")}
                        className="rounded-lg bg-[#2D1B4E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#3D2560]"
                    >
                        Start free
                    </button>
                </div>
            </nav>

            <section className="grid min-h-[620px] items-end gap-12 bg-[#2D1B4E] px-6 pt-20 lg:grid-cols-2 lg:px-10">
                <div className="pb-14">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-[#F5E8C0]">
                        <Sparkles className="h-3.5 w-3.5" />
                        Built for event stylists & party suppliers
                    </div>

                    <h1 className="max-w-xl font-serif text-5xl leading-tight text-white lg:text-6xl">
                        The business OS for every{" "}
                        <span className="italic text-[#F5E8C0]">celebration.</span>
                    </h1>

                    <p className="mt-5 max-w-md text-sm leading-7 text-white/60">
                        Bookings, inventory, packages, and sales — managed beautifully.
                        Built for Filipino event businesses that mean business.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <button
                            onClick={() => setAuthMode("signup")}
                            className="rounded-lg bg-[#C9951A] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
                        >
                            Get started free
                        </button>

                        <button
                            onClick={() => setAuthMode("login")}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/15"
                        >
                            Log in
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-t-2xl border border-white/10 bg-white shadow-2xl">
                    <div className="flex items-center gap-2 border-b border-[#EBE4F0] bg-[#F8F5FF] px-5 py-4">
                        <div className="h-2.5 w-2.5 rounded-full bg-red-300" />
                        <div className="h-2.5 w-2.5 rounded-full bg-yellow-300" />
                        <div className="h-2.5 w-2.5 rounded-full bg-green-300" />

                        <span className="ml-3 text-xs text-[#7A6E88]">
                            StockNBook — Dashboard
                        </span>
                    </div>

                    <div className="p-5">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <MiniStat label="Bookings" value="48" note="↑ +12%" />
                            <MiniStat label="Revenue" value="₱84.5k" note="↑ +8%" />
                            <MiniStat label="Low stock" value="3" note="Alert" danger />
                        </div>

                        <div className="mt-5 text-xs font-semibold uppercase tracking-widest text-[#2D1B4E]">
                            This week&#39;s events
                        </div>

                        <div className="mt-3 divide-y divide-[#EBE4F0]">
                            <EventRow
                                color="#2D1B4E"
                                title="Garcia Wedding"
                                info="May 18 · ₱12,000"
                                status="Confirmed"
                            />

                            <EventRow
                                color="#C9951A"
                                title="Cruz Debut"
                                info="May 22 · ₱8,500"
                                status="Pending"
                            />

                            <EventRow
                                color="#F0997B"
                                title="Santos Birthday"
                                info="May 25 · ₱5,000"
                                status="New"
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section className="border-b border-[#F5E8C0] bg-[#FFFBF0] px-6 py-6">
                <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 text-center md:grid-cols-4">
                    <ProofStat value="500+" label="Event stylists" />
                    <ProofStat value="₱2M+" label="Bookings managed" />
                    <ProofStat value="4.9★" label="Average rating" />
                    <ProofStat value="3 min" label="To get started" />
                </div>
            </section>

            <section id="features" className="bg-white px-6 py-20 lg:px-10">
                <div className="mx-auto max-w-6xl">
                    <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#C9951A]">
                        What&#39;s inside
                    </p>

                    <h2 className="mt-3 text-center font-serif text-4xl text-[#1A1220]">
                        Everything your event business needs
                    </h2>

                    <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-6 text-[#7A6E88]">
                        Built specifically for party suppliers and event stylists — not
                        adapted from a generic tool.
                    </p>

                    <div className="mt-12 grid overflow-hidden rounded-2xl border border-[#EBE4F0] md:grid-cols-3">
                        <FeatureCard
                            number="01"
                            title="Smart bookings"
                            desc="Calendar view, booking statuses, and auto-reminders for every event."
                        />

                        <FeatureCard
                            number="02"
                            title="Package builder"
                            desc="Create styled packages with pricing tiers, inclusions, and add-ons."
                        />

                        <FeatureCard
                            number="03"
                            title="Inventory control"
                            desc="Monitor party supplies, product quantities, and restock alerts."
                        />

                        <FeatureCard
                            number="04"
                            title="Sales / POS"
                            desc="Quick checkout for walk-in and on-site event sales."
                        />

                        <FeatureCard
                            number="05"
                            title="Revenue forecasting"
                            desc="See projected income by month and season."
                        />

                        <FeatureCard
                            number="06"
                            title="Booking link"
                            desc="A public page where clients browse packages and book directly."
                        />
                    </div>
                </div>
            </section>

            <PricingSection onSelectPlan={handleSelectPlan} />

            <section
                id="how-it-works"
                className="bg-[#2D1B4E] px-6 py-20 text-white lg:px-10"
            >
                <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#F5E8C0]">
                    How it works
                </p>

                <h2 className="mt-3 text-center font-serif text-4xl">
                    Up and running in minutes
                </h2>

                <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
                    <StepCard
                        number="01"
                        title="Add packages and inventory"
                        desc="Set up your event packages, pricing tiers, and party supplies."
                    />

                    <StepCard
                        number="02"
                        title="Share your booking link"
                        desc="Clients browse, pick a package, and book directly."
                    />

                    <StepCard
                        number="03"
                        title="Track, earn, and grow"
                        desc="Monitor revenue, restock alerts, and upcoming events."
                    />
                </div>
            </section>

            <section className="flex flex-col items-start justify-between gap-6 bg-[#FFFBF0] px-6 py-12 md:flex-row md:items-center lg:px-10">
                <div>
                    <h2 className="font-serif text-3xl">
                        Ready to run your business properly?
                    </h2>

                    <p className="mt-2 text-sm text-[#7A6E88]">
                        Join Filipino event stylists already using StockNBook.
                    </p>
                </div>

                <button
                    onClick={() => setAuthMode("signup")}
                    className="rounded-lg bg-[#2D1B4E] px-6 py-3 text-sm font-medium text-white"
                >
                    Create free account
                </button>
            </section>


            {selectedPlan && isSubscriptionModalOpen && (
                <SubscriptionModal
                    plan={selectedPlan}
                    currentPlanName={currentPlanName}
                    onClose={handleCloseSubscriptionModal}
                    onContinueStarter={handleContinueWithStarter}
                />
            )}

            {authMode && (
                <AuthModal
                    mode={authMode}
                    onClose={() => setAuthMode(null)}
                    onSwitch={setAuthMode}
                    onSignupSuccess={() => {
                        setAuthMode(null);
                        onSignupSuccess();
                    }}
                />
            )}
        </main>
    );
}
function PricingSection({
                            onSelectPlan,
                        }: {
    onSelectPlan: (plan: PricingPlan) => void;
}) {

    return (
        <section id="pricing" className="bg-[#F8F5FF] px-6 py-20 lg:px-10">
            <div className="mx-auto max-w-6xl">
                <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#C9951A]">
                    Subscription plans
                </p>

                <h2 className="mt-3 text-center font-serif text-4xl text-[#1A1220]">
                    Choose the plan that fits your business
                </h2>

                <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-[#7A6E88]">
                    Start with the free plan, then upgrade when your inventory,
                    bookings, staff, and reporting needs grow.
                </p>

                <div className="mx-auto mt-6 flex max-w-2xl items-start gap-3 rounded-xl border border-[#E6D9BA] bg-[#FFFBF0] px-4 py-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#C9951A]" />

                    <p className="text-sm leading-6 text-[#6F6043]">
                        Business and Enterprise subscriptions are activated after
                        the submitted GCash payment proof has been verified by the
                        platform administrator.
                    </p>
                </div>

                <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
                    {pricingPlans.map((plan) => (
                        <PricingCard
                            key={plan.name}
                            plan={plan}
                            onSelectPlan={onSelectPlan}
                        />
                    ))}
                </div>

                <p className="mt-8 text-center text-xs leading-5 text-[#7A6E88]">
                    No automatic recurring charges. Paid subscriptions use manual
                    GCash payment verification.
                </p>
            </div>
        </section>
    );
}

function PricingCard({
                         plan,
                         onSelectPlan,
                     }: {
    plan: PricingPlan;
    onSelectPlan: (plan: PricingPlan) => void;
}) {
    return (
        <article
            className={[
                "relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl",
                plan.highlighted
                    ? "border-[#2D1B4E] ring-2 ring-[#2D1B4E]"
                    : "border-[#EBE4F0]",
            ].join(" ")}
        >
            {plan.highlighted && (
                <div className="bg-[#2D1B4E] px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-white">
                    Standard plan
                </div>
            )}

            <div className="flex h-full flex-col p-6">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C9951A]">
                        {plan.label}
                    </p>

                    <h3 className="mt-3 font-serif text-3xl font-semibold text-[#1A1220]">
                        {plan.name}
                    </h3>

                    <div className="mt-5 flex items-end gap-1">
                        <span className="font-serif text-4xl font-semibold tracking-tight text-[#1A1220]">
                            {plan.price}
                        </span>

                        <span className="pb-1 text-sm text-[#7A6E88]">
                            {plan.period}
                        </span>
                    </div>

                    <p className="mt-4 min-h-[72px] text-sm leading-6 text-[#7A6E88]">
                        {plan.description}
                    </p>
                </div>

                <div className="mt-7 flex-1 border-t border-[#EBE4F0] pt-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A6E88]">
                        Included features
                    </p>

                    <ul className="mt-4 space-y-3">
                        {plan.features.map((feature) => (
                            <li
                                key={feature}
                                className="flex items-start gap-2.5 text-sm leading-5 text-[#3F354C]"
                            >
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFF7E2]">
                                    <Check className="h-3.5 w-3.5 text-[#C9951A]" />
                                </span>

                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <button
                    type="button"
                    onClick={() => onSelectPlan(plan)}
                    className={[
                        "mt-8 h-12 w-full rounded-xl text-sm font-semibold transition duration-200",
                        plan.highlighted
                            ? "bg-[#2D1B4E] text-white hover:bg-[#3D2560]"
                            : "border border-[#2D1B4E] bg-white text-[#2D1B4E] hover:bg-[#2D1B4E] hover:text-white",
                    ].join(" ")}
                >
                    {plan.buttonText}
                </button>
            </div>
        </article>
    );
}

function SubscriptionModal({
                               plan,
                               currentPlanName,
                               onClose,
                               onContinueStarter,
                           }: {
    plan: PricingPlan;
    currentPlanName: string;
    onClose: () => void;
    onContinueStarter: () => void;
}) {
    const [referenceNumber, setReferenceNumber] = useState("");
    const [paymentDate, setPaymentDate] = useState("");
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState("");
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [pendingAction, setPendingAction] = useState<
        "cancel" | "submit" | null
    >(null);

    const requiresPayment = plan.amount > 0;

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!proofFile) {
            setFileError("Please upload your proof of payment.");
            return;
        }

        setFileError("");
        setPendingAction("submit");
    };

    const handleRequestClose = () => {
        if (isSubmitted) {
            onClose();
            return;
        }

        setPendingAction("cancel");
    };

    const handleConfirmAction = () => {
        if (pendingAction === "cancel") {
            setPendingAction(null);
            onClose();
            return;
        }

        if (pendingAction === "submit") {
            setPendingAction(null);
            setIsSubmitted(true);
        }
    };

    const uploadInputId = `proof-upload-${plan.name.toLowerCase()}`;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="subscription-modal-title"
            className="fixed inset-0 z-[100] overflow-y-auto bg-[#160C27]/60 px-4 py-6 backdrop-blur-[2px]"
            onMouseDown={handleRequestClose}
        >
            <div className="flex min-h-full items-center justify-center">
                <div
                    className="w-full max-w-[720px] overflow-hidden rounded-2xl border border-white/60 bg-white shadow-2xl"
                    onMouseDown={(event) => event.stopPropagation()}
                >
                    <div className="flex items-start justify-between gap-5 border-b border-[#EBE4F0] px-6 py-5">
                        <div>
                            <h2
                                id="subscription-modal-title"
                                className="font-serif text-2xl font-semibold text-[#2D1B4E]"
                            >
                                {isSubmitted
                                    ? "Payment Proof Submitted"
                                    : requiresPayment
                                        ? `Subscribe to ${plan.name} Plan`
                                        : "Starter Plan"}
                            </h2>

                            <p className="mt-2 max-w-xl text-sm leading-6 text-[#7A6E88]">
                                {isSubmitted
                                    ? "Your payment information has been submitted for administrative verification."
                                    : requiresPayment
                                        ? "Your subscription will be activated after the submitted GCash payment proof has been verified by the platform administrator."
                                        : "Review the free Starter plan before continuing with your account registration."}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleRequestClose}
                            aria-label="Close subscription modal"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#7A6E88] transition hover:bg-[#F3EFF8] hover:text-[#2D1B4E]"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {isSubmitted ? (
                        <div className="p-6">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#ECF7E8]">
                                <CheckCircle2 className="h-8 w-8 text-[#3B6D11]" />
                            </div>

                            <div className="mt-5 text-center">
                                <h3 className="text-lg font-semibold text-[#1A1220]">
                                    Your payment is pending verification
                                </h3>

                                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#7A6E88]">
                                    The platform administrator will review your
                                    submitted payment details before activating
                                    the requested subscription.
                                </p>
                            </div>

                            <div className="mt-6 rounded-xl border border-[#EBE4F0] bg-[#F8F5FF] p-5">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-[#7A6E88]">
                                            Requested plan
                                        </p>

                                        <p className="mt-1 font-semibold text-[#1A1220]">
                                            {plan.name}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-[#7A6E88]">
                                            Amount
                                        </p>

                                        <p className="mt-1 font-semibold text-[#1A1220]">
                                            {plan.price} {plan.period}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-[#7A6E88]">
                                            Reference number
                                        </p>

                                        <p className="mt-1 break-all font-semibold text-[#1A1220]">
                                            {referenceNumber}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-[#7A6E88]">
                                            Payment date
                                        </p>

                                        <p className="mt-1 font-semibold text-[#1A1220]">
                                            {paymentDate}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 flex items-center gap-3 rounded-lg border border-[#F1D79B] bg-[#FFF8E8] px-4 py-3">
                                    <Clock3 className="h-5 w-5 shrink-0 text-[#B97800]" />

                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-[#8C5C00]">
                                            Status
                                        </p>

                                        <p className="mt-0.5 text-sm font-semibold text-[#8C5C00]">
                                            Pending Verification
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#E6D9BA] bg-[#FFFBF0] px-4 py-3">
                                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#C9951A]" />

                                <p className="text-sm leading-6 text-[#6F6043]">
                                    Your current {currentPlanName} subscription
                                    will remain active until the administrator
                                    approves this request.
                                </p>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="h-11 rounded-xl bg-[#2D1B4E] px-8 text-sm font-semibold text-white transition hover:bg-[#3D2560]"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    ) : !requiresPayment ? (
                        <div className="p-6">
                            <div className="rounded-xl border border-[#E5DCF0] bg-[#F8F5FF] p-5">
                                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#C9951A]">
                                            Free plan
                                        </p>

                                        <h3 className="mt-2 text-xl font-semibold text-[#1A1220]">
                                            Starter
                                        </h3>
                                    </div>

                                    <div className="sm:text-right">
                                        <span className="font-serif text-4xl font-semibold text-[#1A1220]">
                                            ₱0
                                        </span>

                                        <span className="ml-1 text-sm text-[#7A6E88]">
                                            /month
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7A6E88]">
                                    Included in Starter
                                </p>

                                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {plan.features.slice(-4).map((feature) => (
                                        <li
                                            key={feature}
                                            className="flex items-start gap-3 rounded-lg border border-[#EBE4F0] bg-white px-4 py-3 text-sm text-[#3F354C]"
                                        >
                                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFF7E2]">
                                                <Check className="h-3.5 w-3.5 text-[#C9951A]" />
                                            </span>

                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#DDE8D7] bg-[#F4FAF1] px-4 py-3">
                                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#3B6D11]" />

                                <p className="text-sm leading-6 text-[#466436]">
                                    No payment or proof of payment is required for
                                    the Starter plan.
                                </p>
                            </div>

                            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={handleRequestClose}
                                    className="h-11 rounded-xl border border-[#CFC4DA] bg-white px-6 text-sm font-semibold text-[#2D1B4E] transition hover:bg-[#F8F5FF]"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={onContinueStarter}
                                    className="h-11 rounded-xl bg-[#2D1B4E] px-6 text-sm font-semibold text-white transition hover:bg-[#3D2560]"
                                >
                                    Continue with Starter
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="grid gap-3 rounded-xl border border-[#E5DCF0] bg-[#F8F5FF] p-4 sm:grid-cols-2">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#5B35A5] shadow-sm">
                                        <CreditCard className="h-4 w-4" />
                                    </div>

                                    <div>
                                        <p className="text-xs text-[#7A6E88]">
                                            Selected Plan
                                        </p>

                                        <p className="mt-1 text-sm font-semibold text-[#1A1220]">
                                            {plan.name}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 sm:border-l sm:border-[#DDD2EA] sm:pl-4">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#5B35A5] shadow-sm">
                                        <Store className="h-4 w-4" />
                                    </div>

                                    <div>
                                        <p className="text-xs text-[#7A6E88]">
                                            Current Plan
                                        </p>

                                        <p className="mt-1 text-sm font-semibold text-[#1A1220]">
                                            {currentPlanName}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#5B35A5] shadow-sm">
                                        <CreditCard className="h-4 w-4" />
                                    </div>

                                    <div>
                                        <p className="text-xs text-[#7A6E88]">
                                            Amount to Pay
                                        </p>

                                        <p className="mt-1 text-sm font-semibold text-[#1A1220]">
                                            {plan.price} {plan.period}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 sm:border-l sm:border-[#DDD2EA] sm:pl-4">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#5B35A5] shadow-sm">
                                        <Package className="h-4 w-4" />
                                    </div>

                                    <div>
                                        <p className="text-xs text-[#7A6E88]">
                                            Requested Plan
                                        </p>

                                        <p className="mt-1 text-sm font-semibold text-[#1A1220]">
                                            {plan.name}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <div className="rounded-xl border border-[#EBE4F0] p-4">
                                    <div className="grid grid-cols-[112px_1fr] gap-4">
                                        <div className="flex h-28 w-28 flex-col items-center justify-center rounded-lg border border-dashed border-[#BBA9D0] bg-[#FAF8FD]">
                                            <QrCode className="h-16 w-16 text-[#2D1B4E]" />

                                            <span className="mt-1 text-xs font-semibold text-[#5B35A5]">
                                                GCash QR
                                            </span>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-xs text-[#7A6E88]">
                                                    GCash Account Name
                                                </p>

                                                <p className="mt-1 text-sm font-semibold text-[#1A1220]">
                                                    StockNBook
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-xs text-[#7A6E88]">
                                                    GCash Number
                                                </p>

                                                <p className="mt-1 text-sm font-semibold text-[#1A1220]">
                                                    09XX XXX XXXX
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-[#EBE4F0] p-4">
                                    <p className="text-sm font-semibold text-[#5B35A5]">
                                        Payment Instructions
                                    </p>

                                    <ol className="mt-3 space-y-2.5">
                                        {[
                                            "Scan the GCash QR code.",
                                            `Pay the exact amount of ${plan.price}.`,
                                            "Save a screenshot of the transaction.",
                                            "Enter the payment details below.",
                                        ].map((instruction, index) => (
                                            <li
                                                key={instruction}
                                                className="flex items-start gap-2.5 text-xs leading-5 text-[#5F556A]"
                                            >
                                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5B35A5] text-[10px] font-semibold text-white">
                                                    {index + 1}
                                                </span>

                                                <span>{instruction}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            </div>

                            <div className="mt-5 space-y-4">
                                <div>
                                    <label
                                        htmlFor="payment-reference"
                                        className="mb-1.5 block text-sm font-medium text-[#2B2333]"
                                    >
                                        Reference Number
                                    </label>

                                    <input
                                        id="payment-reference"
                                        type="text"
                                        value={referenceNumber}
                                        onChange={(event) =>
                                            setReferenceNumber(event.target.value)
                                        }
                                        placeholder="Enter GCash reference number"
                                        minLength={8}
                                        required
                                        className="h-11 w-full rounded-lg border border-[#DCD4E4] bg-white px-3 text-sm text-[#1A1220] outline-none transition placeholder:text-[#A89DAF] focus:border-[#5B35A5] focus:ring-2 focus:ring-[#5B35A5]/15"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="payment-date"
                                        className="mb-1.5 block text-sm font-medium text-[#2B2333]"
                                    >
                                        Payment Date
                                    </label>

                                    <input
                                        id="payment-date"
                                        type="date"
                                        value={paymentDate}
                                        onChange={(event) =>
                                            setPaymentDate(event.target.value)
                                        }
                                        required
                                        className="h-11 w-full rounded-lg border border-[#DCD4E4] bg-white px-3 text-sm text-[#1A1220] outline-none transition focus:border-[#5B35A5] focus:ring-2 focus:ring-[#5B35A5]/15"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor={uploadInputId}
                                        className="mb-1.5 block text-sm font-medium text-[#2B2333]"
                                    >
                                        Proof of Payment
                                    </label>

                                    <label
                                        htmlFor={uploadInputId}
                                        className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-[#DCD4E4] bg-white px-3 transition hover:border-[#5B35A5] hover:bg-[#FAF8FD]"
                                    >
                                        <span className="inline-flex items-center gap-2 rounded-md border border-[#DCD4E4] bg-[#F8F5FF] px-3 py-1.5 text-xs font-semibold text-[#2D1B4E]">
                                            <Upload className="h-4 w-4" />
                                            Upload file
                                        </span>

                                        <span className="min-w-0 truncate text-xs text-[#7A6E88]">
                                            {proofFile
                                                ? proofFile.name
                                                : "No file chosen"}
                                        </span>
                                    </label>

                                    <input
                                        id={uploadInputId}
                                        type="file"
                                        accept="image/jpeg,image/png"
                                        className="hidden"
                                        onChange={(event) => {
                                            const file =
                                                event.target.files?.[0] ?? null;

                                            setFileError("");

                                            if (!file) {
                                                setProofFile(null);
                                                return;
                                            }

                                            const allowedTypes = [
                                                "image/jpeg",
                                                "image/png",
                                            ];

                                            if (!allowedTypes.includes(file.type)) {
                                                setProofFile(null);
                                                setFileError(
                                                    "Only JPG, JPEG, and PNG files are accepted.",
                                                );
                                                event.target.value = "";
                                                return;
                                            }

                                            if (file.size > 5 * 1024 * 1024) {
                                                setProofFile(null);
                                                setFileError(
                                                    "The selected file exceeds the 5 MB limit.",
                                                );
                                                event.target.value = "";
                                                return;
                                            }

                                            setProofFile(file);
                                        }}
                                    />

                                    <p className="mt-1.5 text-xs text-[#8A8091]">
                                        Accepted files: JPG, JPEG, PNG. Maximum
                                        size: 5 MB.
                                    </p>

                                    {fileError && (
                                        <p className="mt-1.5 text-xs font-medium text-red-600">
                                            {fileError}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={handleRequestClose}
                                    className="h-11 rounded-xl border border-[#BBA9D0] bg-white px-7 text-sm font-semibold text-[#2D1B4E] transition hover:bg-[#F8F5FF] sm:w-36"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="h-11 flex-1 rounded-xl bg-[#4B22A3] px-7 text-sm font-semibold text-white transition hover:bg-[#3D1B87]"
                                >
                                    Submit Payment Proof
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {pendingAction && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-[#160C27]/55 px-4 backdrop-blur-[1px]"
                    onMouseDown={(event) => {
                        event.stopPropagation();
                        setPendingAction(null);
                    }}
                >
                    <div
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="subscription-action-title"
                        className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-6 shadow-2xl"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div
                            className={[
                                "flex h-12 w-12 items-center justify-center rounded-full",
                                pendingAction === "cancel"
                                    ? "bg-[#FFF2E8] text-[#C55A11]"
                                    : "bg-[#F0EBFA] text-[#5B35A5]",
                            ].join(" ")}
                        >
                            {pendingAction === "cancel" ? (
                                <AlertTriangle className="h-6 w-6" />
                            ) : (
                                <ShieldCheck className="h-6 w-6" />
                            )}
                        </div>

                        <h3
                            id="subscription-action-title"
                            className="mt-4 text-lg font-semibold text-[#1A1220]"
                        >
                            {pendingAction === "cancel"
                                ? "Cancel this subscription request?"
                                : "Submit payment proof?"}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-[#7A6E88]">
                            {pendingAction === "cancel"
                                ? "Any payment details you entered in this window will be cleared when you leave."
                                : "Please make sure the reference number, payment date, and uploaded proof are correct before submitting."}
                        </p>

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setPendingAction(null)}
                                className="h-11 rounded-xl border border-[#CFC4DA] bg-white px-5 text-sm font-semibold text-[#2D1B4E] transition hover:bg-[#F8F5FF]"
                            >
                                {pendingAction === "cancel"
                                    ? "Keep Editing"
                                    : "Review Details"}
                            </button>

                            <button
                                type="button"
                                onClick={handleConfirmAction}
                                className={[
                                    "h-11 rounded-xl px-5 text-sm font-semibold text-white transition",
                                    pendingAction === "cancel"
                                        ? "bg-[#C55A11] hover:bg-[#A94B0D]"
                                        : "bg-[#4B22A3] hover:bg-[#3D1B87]",
                                ].join(" ")}
                            >
                                {pendingAction === "cancel"
                                    ? "Yes, Cancel"
                                    : "Yes, Submit"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MiniStat({
                      label,
                      value,
                      note,
                      danger = false,
                  }: {
    label: string;
    value: string;
    note: string;
    danger?: boolean;
}) {
    return (
        <div className="rounded-xl border border-[#EBE4F0] bg-[#FDFAF4] p-4">
            <p className="text-xs uppercase tracking-widest text-[#7A6E88]">
                {label}
            </p>

            <p className="mt-1 text-xl font-semibold">{value}</p>

            <p
                className={`mt-1 text-xs ${
                    danger ? "text-[#993C1D]" : "text-[#3B6D11]"
                }`}
            >
                {note}
            </p>
        </div>
    );
}

function EventRow({
                      color,
                      title,
                      info,
                      status,
                  }: {
    color: string;
    title: string;
    info: string;
    status: string;
}) {
    return (
        <div className="flex items-center gap-3 py-4">
            <div
                className="h-10 w-1 rounded-full"
                style={{ backgroundColor: color }}
            />

            <div className="flex-1">
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-[#7A6E88]">{info}</p>
            </div>

            <span className="rounded-md bg-[#EEE8F8] px-3 py-1 text-xs font-medium text-[#3D2560]">
                {status}
            </span>
        </div>
    );
}

function ProofStat({ value, label }: { value: string; label: string }) {
    return (
        <div>
            <p className="font-serif text-3xl text-[#2D1B4E]">{value}</p>
            <p className="mt-1 text-xs text-[#7A6E88]">{label}</p>
        </div>
    );
}

function FeatureCard({
                         number,
                         title,
                         desc,
                     }: {
    number: string;
    title: string;
    desc: string;
}) {
    return (
        <div className="border-b border-r border-[#EBE4F0] bg-white p-7 transition hover:bg-[#FDFAF4]">
            <p className="font-serif text-4xl text-[#EEE8F8]">{number}</p>
            <div className="mt-4 h-0.5 w-8 rounded-full bg-[#C9951A]" />
            <h3 className="mt-4 text-sm font-semibold">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#7A6E88]">{desc}</p>
        </div>
    );
}

function StepCard({
                      number,
                      title,
                      desc,
                  }: {
    number: string;
    title: string;
    desc: string;
}) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-7">
            <p className="font-serif text-5xl text-[#C9951A]">{number}</p>
            <h3 className="mt-5 font-semibold">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/50">{desc}</p>
        </div>
    );
}
