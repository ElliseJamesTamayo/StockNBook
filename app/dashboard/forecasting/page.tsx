"use client";

import { type ReactNode, useEffect, useState } from "react";
import {
    BarChart3,
    CalendarDays,
    ChevronDown,
    ChevronRight,
    Clock3,
    PackageSearch,
    RefreshCw,
    Search,
    TrendingUp,
    TriangleAlert,
} from "lucide-react";
import RoleSidebar from "@/components/sidebar/RoleSidebar";
import RequirePermission from "@/components/permissions/RequirePermission";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type ForecastTab = "inventory" | "seasonal" | "booking";

const inventoryForecast = [
    {
        name: "Gold Balloon",
        category: "Balloons",
        currentStock: 49,
        forecastedDemand: 86,
        restock: 37,
        growth: "+18%",
        risk: "High",
    },
    {
        name: "Cake Topper",
        category: "Decorations",
        currentStock: 18,
        forecastedDemand: 41,
        restock: 23,
        growth: "+14%",
        risk: "Medium",
    },
    {
        name: "Blue Balloon",
        category: "Balloons",
        currentStock: 10,
        forecastedDemand: 25,
        restock: 15,
        growth: "+10%",
        risk: "Medium",
    },
];

const seasonalForecast = [
    {
        quarter: "Q1",
        period: "January – March",
        growth: "+8%",
        insight: "Steady post-holiday event demand",
        height: "44%",
    },
    {
        quarter: "Q2",
        period: "April – June",
        growth: "+19%",
        insight: "Graduation and summer celebration demand",
        height: "66%",
    },
    {
        quarter: "Q3",
        period: "July – September",
        growth: "+31%",
        insight: "Peak booking season for events",
        height: "100%",
    },
    {
        quarter: "Q4",
        period: "October – December",
        growth: "+24%",
        insight: "Holiday and year-end celebration demand",
        height: "80%",
    },
];

const packageForecast = [
    { name: "Wedding Package", count: 18, percent: 90 },
    { name: "Corporate Event Package", count: 14, percent: 70 },
    { name: "Graduation Package", count: 11, percent: 55 },
    { name: "Baby Shower Package", count: 8, percent: 40 },
];

const dayForecast = [
    { label: "Mon", height: "34%" },
    { label: "Tue", height: "46%" },
    { label: "Wed", height: "41%" },
    { label: "Thu", height: "55%" },
    { label: "Fri", height: "86%" },
    { label: "Sat", height: "100%" },
    { label: "Sun", height: "71%" },
];


type OwnerForecastScope = "overall" | "branch";

type BranchForecastSummary = {
    id: string;
    name: string;
    demand: number;
    bookings: number;
    alerts: number;
    growth: string;
    topItem: string;
    peakPeriod: string;
};

const branchForecasts: BranchForecastSummary[] = [
    {
        id: "makati",
        name: "Makati Branch",
        demand: 152,
        bookings: 28,
        alerts: 3,
        growth: "+18%",
        topItem: "Gold Balloon",
        peakPeriod: "Friday – Sunday",
    },
    {
        id: "paranaque",
        name: "Parañaque Branch",
        demand: 138,
        bookings: 24,
        alerts: 2,
        growth: "+14%",
        topItem: "Cake Topper",
        peakPeriod: "Saturday",
    },
    {
        id: "moonwalk",
        name: "Moonwalk Branch",
        demand: 126,
        bookings: 21,
        alerts: 1,
        growth: "+11%",
        topItem: "Blue Balloon",
        peakPeriod: "Friday – Saturday",
    },
];

function formatCurrentDateTime(value: Date) {
    const dateLabel = value.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });

    const timeLabel = value
        .toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        })
        .toLowerCase();

    return `${dateLabel} | ${timeLabel}`;
}

export default function ForecastingPage() {
    const { user } = useCurrentUser();
    const role = String(
        (user as { role?: string } | null)?.role || ""
    ).toLowerCase();
    const isOwner = role === "owner";

    const [activeTab, setActiveTab] = useState<ForecastTab>("inventory");
    const [ownerScope, setOwnerScope] =
        useState<OwnerForecastScope>("overall");
    const [selectedBranchId, setSelectedBranchId] = useState("makati");
    const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);
    const [lastRun, setLastRun] = useState<Date | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        const updateTime = () => setCurrentDateTime(new Date());

        updateTime();
        setLastRun(new Date());

        const timer = window.setInterval(updateTime, 30_000);

        return () => window.clearInterval(timer);
    }, []);

    const handleRefresh = () => {
        setIsRefreshing(true);

        window.setTimeout(() => {
            const now = new Date();
            setCurrentDateTime(now);
            setLastRun(now);
            setIsRefreshing(false);
        }, 450);
    };

    return (
        <RequirePermission>
            <div className="flex min-h-screen bg-[#FDFAF4] font-sans text-[#1A1220]">
                <RoleSidebar />

                <main className="min-w-0 flex-1 overflow-y-auto">
                    <header className="sticky top-0 z-20 border-b border-[#E9E0EF] bg-[#FFFDF8]/95 backdrop-blur">
                        <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 px-6 py-3">
                            <div>
                                <h1 className="text-[25px] font-bold text-[#1A1220]">
                                    Forecasting
                                </h1>
                                <p className="mt-0.5 text-xs text-[#7A6A84]">
                                    {isOwner
                                        ? "Overall and branch forecast overview"
                                        : "Forecast for your assigned branch"}
                                </p>
                            </div>

                            <div className="flex items-center gap-2.5">
                                <span className="inline-flex h-[42px] items-center rounded-xl border border-[#E6DDF0] bg-white px-3.5 text-sm font-semibold text-[#2B174C] shadow-sm">
                                    {currentDateTime
                                        ? formatCurrentDateTime(currentDateTime)
                                        : "Loading date..."}
                                </span>

                                <button
                                    type="button"
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    className="inline-flex h-[42px] items-center gap-2 rounded-xl bg-[#2B174C] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1B0D31] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <RefreshCw
                                        size={16}
                                        className={isRefreshing ? "animate-spin" : ""}
                                    />
                                    Refresh
                                </button>
                            </div>
                        </div>
                    </header>

                    <section className="space-y-4 px-6 py-4">
                        {isOwner ? (
                            <OwnerForecastWorkspace
                                activeTab={activeTab}
                                onTabChange={setActiveTab}
                                scope={ownerScope}
                                onScopeChange={setOwnerScope}
                                selectedBranchId={selectedBranchId}
                                onSelectBranch={setSelectedBranchId}
                            />
                        ) : (
                            <>
                                <div className="rounded-[14px] border border-[#E6DDF0] bg-white p-4 shadow-sm">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="flex min-w-0 items-start gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFE8F8] text-[#4E2C66]">
                                                <TrendingUp size={18} />
                                            </div>

                                            <div>
                                                <h2 className="text-[16px] font-bold text-[#1A1220]">
                                                    Demand Forecast Overview
                                                </h2>
                                                <p className="mt-0.5 text-xs leading-5 text-[#7A6A84]">
                                                    Review estimated inventory demand, seasonal trends, and future bookings.
                                                </p>
                                            </div>
                                        </div>

                                        <p className="text-xs text-[#806A8C]">
                                            Last updated:{" "}
                                            <span className="font-semibold text-[#4E2C66]">
                                        {lastRun
                                            ? formatCurrentDateTime(lastRun)
                                            : "Loading..."}
                                    </span>
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-3">
                                    <SummaryCard
                                        icon={<PackageSearch size={18} />}
                                        title="Projected Demand"
                                        value="152 items"
                                        detail="Next 30 days"
                                        tone="purple"
                                    />
                                    <SummaryCard
                                        icon={<CalendarDays size={18} />}
                                        title="Expected Bookings"
                                        value="28"
                                        detail="Next 30 days"
                                        tone="gold"
                                    />
                                    <SummaryCard
                                        icon={<TriangleAlert size={18} />}
                                        title="Restock Alerts"
                                        value="3 items"
                                        detail="Need stock action"
                                        tone="red"
                                    />
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <ForecastTabButton
                                        active={activeTab === "inventory"}
                                        onClick={() => setActiveTab("inventory")}
                                        label="Inventory Forecast"
                                    />
                                    <ForecastTabButton
                                        active={activeTab === "seasonal"}
                                        onClick={() => setActiveTab("seasonal")}
                                        label="Seasonal Forecast"
                                    />
                                    <ForecastTabButton
                                        active={activeTab === "booking"}
                                        onClick={() => setActiveTab("booking")}
                                        label="Booking Forecast"
                                    />
                                </div>

                                {activeTab === "inventory" && <InventoryForecastUI />}
                                {activeTab === "seasonal" && <SeasonalForecastUI />}
                                {activeTab === "booking" && <BookingForecastUI />}                            </>
                        )}
                    </section>
                </main>
            </div>
        </RequirePermission>
    );
}


function OwnerForecastWorkspace({
                                    activeTab,
                                    onTabChange,
                                    scope,
                                    onScopeChange,
                                    selectedBranchId,
                                    onSelectBranch,
                                }: {
    activeTab: ForecastTab;
    onTabChange: (tab: ForecastTab) => void;
    scope: OwnerForecastScope;
    onScopeChange: (scope: OwnerForecastScope) => void;
    selectedBranchId: string;
    onSelectBranch: (branchId: string) => void;
}) {
    const selectedBranch =
        branchForecasts.find((branch) => branch.id === selectedBranchId) ??
        branchForecasts[0];

    const overallDemand = branchForecasts.reduce(
        (total, branch) => total + branch.demand,
        0
    );
    const overallBookings = branchForecasts.reduce(
        (total, branch) => total + branch.bookings,
        0
    );
    const overallAlerts = branchForecasts.reduce(
        (total, branch) => total + branch.alerts,
        0
    );
    const highestDemand = Math.max(
        ...branchForecasts.map((branch) => branch.demand)
    );

    const isOverall = scope === "overall";
    const detailLabel = isOverall
        ? "All branches"
        : selectedBranch.name;

    return (
        <div className="space-y-4">
            <section className="rounded-[14px] border border-[#E6DDF0] bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFE8F8] text-[#4E2C66]">
                            <TrendingUp size={18} />
                        </div>

                        <div>
                            <h2 className="text-[16px] font-bold text-[#1A1220]">
                                Owner Forecasting Overview
                            </h2>
                            <p className="mt-0.5 text-xs leading-5 text-[#7A6A84]">
                                Review total demand across all branches or switch to a specific branch forecast.
                            </p>
                        </div>
                    </div>

                    <span className="inline-flex w-fit rounded-full border border-[#D8CBE7] bg-[#F7F1FF] px-3 py-1.5 text-xs font-semibold text-[#4E2C66]">
                        {branchForecasts.length} active branches
                    </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-[#E6DDF0] pt-4">
                    <OwnerScopeButton
                        active={scope === "overall"}
                        label="Overall Forecast"
                        onClick={() => onScopeChange("overall")}
                    />
                    <OwnerScopeButton
                        active={scope === "branch"}
                        label="By Branch Forecast"
                        onClick={() => onScopeChange("branch")}
                    />
                </div>
            </section>

            {isOverall ? (
                <>
                    <div className="grid gap-3 md:grid-cols-3">
                        <SummaryCard
                            icon={<PackageSearch size={18} />}
                            title="Overall Projected Demand"
                            value={`${overallDemand} items`}
                            detail="All branches · next 30 days"
                            tone="purple"
                        />
                        <SummaryCard
                            icon={<CalendarDays size={18} />}
                            title="Overall Expected Bookings"
                            value={String(overallBookings)}
                            detail="All branches · next 30 days"
                            tone="gold"
                        />
                        <SummaryCard
                            icon={<TriangleAlert size={18} />}
                            title="Branch Restock Alerts"
                            value={`${overallAlerts} items`}
                            detail="Across all branch inventories"
                            tone="red"
                        />
                    </div>

                    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
                        <section className="rounded-[14px] border border-[#E6DDF0] bg-white p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-[16px] font-bold text-[#1A1220]">
                                        Projected Demand by Branch
                                    </h2>
                                    <p className="mt-1 text-xs text-[#7A6A84]">
                                        Compare expected inventory demand for the next 30 days.
                                    </p>
                                </div>

                                <span className="shrink-0 text-xs font-semibold text-[#806A8C]">
                                    Next 30 days
                                </span>
                            </div>

                            <div className="mt-6 space-y-5">
                                {branchForecasts.map((branch, index) => {
                                    const percent = Math.max(
                                        12,
                                        Math.round(
                                            (branch.demand / highestDemand) * 100
                                        )
                                    );

                                    const barClass =
                                        index === 0
                                            ? "bg-[#2B174C]"
                                            : index === 1
                                                ? "bg-[#C9951A]"
                                                : "bg-[#9B7EBC]";

                                    return (
                                        <button
                                            key={branch.id}
                                            type="button"
                                            onClick={() => {
                                                onSelectBranch(branch.id);
                                                onScopeChange("branch");
                                            }}
                                            className="block w-full text-left"
                                        >
                                            <div className="mb-2 flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-[#1A1220]">
                                                        {branch.name}
                                                    </p>
                                                    <p className="mt-0.5 text-xs text-[#7A6A84]">
                                                        {branch.bookings} expected bookings · {branch.growth} demand growth
                                                    </p>
                                                </div>

                                                <span className="shrink-0 text-sm font-bold text-[#2B174C]">
                                                    {branch.demand} items
                                                </span>
                                            </div>

                                            <div className="h-2.5 overflow-hidden rounded-full bg-[#EEE8F8]">
                                                <div
                                                    className={`h-full rounded-full ${barClass}`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="overflow-hidden rounded-[14px] border border-[#E6DDF0] bg-white shadow-sm">
                            <div className="border-b border-[#E6DDF0] px-4 py-3.5">
                                <h2 className="text-[16px] font-bold text-[#1A1220]">
                                    Branch Forecast Summary
                                </h2>
                                <p className="mt-1 text-xs text-[#7A6A84]">
                                    Quick forecast status across branches.
                                </p>
                            </div>

                            <div className="divide-y divide-[#EEE7F2]">
                                {branchForecasts.map((branch) => (
                                    <button
                                        key={branch.id}
                                        type="button"
                                        onClick={() => {
                                            onSelectBranch(branch.id);
                                            onScopeChange("branch");
                                        }}
                                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[#FFFCF7]"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-[#1A1220]">
                                                {branch.name}
                                            </p>
                                            <p className="mt-0.5 truncate text-xs text-[#7A6A84]">
                                                Top demand: {branch.topItem}
                                            </p>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-2">
                                            <span
                                                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                                    branch.alerts >= 3
                                                        ? "border-[#F2C4C4] bg-[#FFF0F0] text-[#C32F2F]"
                                                        : "border-[#F4D79A] bg-[#FFF8E8] text-[#A56607]"
                                                }`}
                                            >
                                                {branch.alerts} alerts
                                            </span>
                                            <ChevronRight size={16} className="text-[#806A8C]" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>
                </>
            ) : (
                <>
                    <section className="rounded-[14px] border border-[#E6DDF0] bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h2 className="text-[16px] font-bold text-[#1A1220]">
                                    Select a Branch Forecast
                                </h2>
                                <p className="mt-1 text-xs text-[#7A6A84]">
                                    View projected inventory demand, bookings, and alerts for one branch.
                                </p>
                            </div>

                            <BranchForecastSelector
                                branches={branchForecasts}
                                selectedBranchId={selectedBranch.id}
                                onSelectBranch={onSelectBranch}
                            />
                        </div>
                    </section>

                    <div className="grid gap-3 md:grid-cols-3">
                        <SummaryCard
                            icon={<PackageSearch size={18} />}
                            title="Projected Demand"
                            value={`${selectedBranch.demand} items`}
                            detail={`${selectedBranch.name} · next 30 days`}
                            tone="purple"
                        />
                        <SummaryCard
                            icon={<CalendarDays size={18} />}
                            title="Expected Bookings"
                            value={String(selectedBranch.bookings)}
                            detail={`${selectedBranch.peakPeriod} is projected peak`}
                            tone="gold"
                        />
                        <SummaryCard
                            icon={<TriangleAlert size={18} />}
                            title="Restock Alerts"
                            value={`${selectedBranch.alerts} items`}
                            detail={`Top demand: ${selectedBranch.topItem}`}
                            tone="red"
                        />
                    </div>

                    <section className="rounded-[14px] border border-[#E6DDF0] bg-[#F7F1FF] p-4">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2B174C] text-white">
                                <TrendingUp size={18} />
                            </div>

                            <div>
                                <p className="text-sm font-semibold text-[#2B174C]">
                                    {selectedBranch.name} forecast insight
                                </p>
                                <p className="mt-1 text-sm leading-6 text-[#5F4E75]">
                                    Demand is projected to grow by {selectedBranch.growth}. Prioritize {selectedBranch.topItem} and prepare additional capacity before {selectedBranch.peakPeriod}.
                                </p>
                            </div>
                        </div>
                    </section>
                </>
            )}

            <section className="rounded-[14px] border border-[#E6DDF0] bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 border-b border-[#E6DDF0] pb-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-[16px] font-bold text-[#1A1220]">
                            {isOverall
                                ? "Overall Forecast Details"
                                : `${selectedBranch.name} Forecast Details`}
                        </h2>
                        <p className="mt-1 text-xs text-[#7A6A84]">
                            Scope: {detailLabel}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <ForecastTabButton
                            active={activeTab === "inventory"}
                            onClick={() => onTabChange("inventory")}
                            label="Inventory Forecast"
                        />
                        <ForecastTabButton
                            active={activeTab === "seasonal"}
                            onClick={() => onTabChange("seasonal")}
                            label="Seasonal Forecast"
                        />
                        <ForecastTabButton
                            active={activeTab === "booking"}
                            onClick={() => onTabChange("booking")}
                            label="Booking Forecast"
                        />
                    </div>
                </div>

                <div className="mt-4 space-y-4">
                    {activeTab === "inventory" && <InventoryForecastUI />}
                    {activeTab === "seasonal" && <SeasonalForecastUI />}
                    {activeTab === "booking" && <BookingForecastUI />}
                </div>
            </section>
        </div>
    );
}


function BranchForecastSelector({
                                    branches,
                                    selectedBranchId,
                                    onSelectBranch,
                                }: {
    branches: BranchForecastSummary[];
    selectedBranchId: string;
    onSelectBranch: (branchId: string) => void;
}) {
    const selectedBranch =
        branches.find((branch) => branch.id === selectedBranchId) ?? branches[0];

    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const filteredBranches = branches.filter((branch) =>
        branch.name.toLowerCase().includes(query.trim().toLowerCase())
    );

    const inputValue = isOpen ? query : selectedBranch?.name ?? "";

    const selectBranch = (branchId: string) => {
        onSelectBranch(branchId);
        setQuery("");
        setIsOpen(false);
    };

    return (
        <div className="relative w-full lg:w-[300px]">
            <div className="relative">
                <Search
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#806A8C]"
                />

                <input
                    value={inputValue}
                    onFocus={() => {
                        setIsOpen(true);
                        setQuery("");
                    }}
                    onBlur={() => {
                        window.setTimeout(() => setIsOpen(false), 150);
                    }}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setIsOpen(true);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") {
                            setIsOpen(false);
                            event.currentTarget.blur();
                        }
                    }}
                    placeholder="Search or select branch..."
                    aria-label="Search or select branch forecast"
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                    className="h-[42px] w-full rounded-xl border border-[#E6DDF0] bg-white px-10 pr-10 text-sm font-medium text-[#1A1220] outline-none transition placeholder:text-[#9B8AAA] focus:border-[#2B174C] focus:ring-4 focus:ring-[#2B174C]/10"
                />

                <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                        setIsOpen((value) => !value);
                        setQuery("");
                    }}
                    aria-label="Open branch forecast options"
                    className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#4E2C66] transition hover:bg-[#F7F1FF]"
                >
                    <ChevronDown
                        size={16}
                        className={
                            isOpen
                                ? "rotate-180 transition-transform"
                                : "transition-transform"
                        }
                    />
                </button>
            </div>

            {isOpen && (
                <div
                    role="listbox"
                    className="absolute z-30 mt-2 max-h-60 w-full overflow-y-auto rounded-xl border border-[#E6DDF0] bg-white p-1.5 shadow-lg"
                >
                    {filteredBranches.length > 0 ? (
                        filteredBranches.map((branch) => {
                            const isSelected = branch.id === selectedBranchId;

                            return (
                                <button
                                    key={branch.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => selectBranch(branch.id)}
                                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                                        isSelected
                                            ? "bg-[#F0EAFE] font-semibold text-[#2B174C]"
                                            : "text-[#1A1220] hover:bg-[#F7F1FF]"
                                    }`}
                                >
                                    <span className="truncate">{branch.name}</span>

                                    {isSelected && (
                                        <span className="shrink-0 text-xs font-semibold text-[#4E2C66]">
                                            Selected
                                        </span>
                                    )}
                                </button>
                            );
                        })
                    ) : (
                        <p className="px-3 py-4 text-sm text-[#7A6A84]">
                            No matching branch found.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

function OwnerScopeButton({
                              active,
                              label,
                              onClick,
                          }: {
    active: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`h-[40px] rounded-xl px-4 text-sm font-semibold transition ${
                active
                    ? "bg-[#2B174C] text-white shadow-sm"
                    : "border border-[#E6DDF0] bg-white text-[#5F4E75] hover:bg-[#F7F1FF]"
            }`}
        >
            {label}
        </button>
    );
}

function SummaryCard({
                         icon,
                         title,
                         value,
                         detail,
                         tone,
                     }: {
    icon: ReactNode;
    title: string;
    value: string;
    detail: string;
    tone: "purple" | "gold" | "red";
}) {
    const toneStyles = {
        purple: "bg-[#EFE8F8] text-[#4E2C66]",
        gold: "bg-[#FFF4D8] text-[#A56607]",
        red: "bg-[#FFF0F0] text-[#C32F2F]",
    };

    return (
        <div className="min-h-[112px] rounded-[14px] border border-[#E6DDF0] bg-white p-4 shadow-sm">
            <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneStyles[tone]}`}
            >
                {icon}
            </div>
            <p className="mt-3 text-sm font-semibold text-[#2B174C]">{title}</p>
            <p className="mt-1 text-[24px] font-bold leading-tight text-[#1A1220]">
                {value}
            </p>
            <p className="mt-1 text-xs text-[#7A6A84]">{detail}</p>
        </div>
    );
}

function ForecastTabButton({
                               active,
                               onClick,
                               label,
                           }: {
    active: boolean;
    onClick: () => void;
    label: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`h-[42px] rounded-xl px-4 text-sm font-semibold transition ${
                active
                    ? "bg-[#2B174C] text-white shadow-sm"
                    : "border border-[#E6DDF0] bg-white text-[#5F4E75] hover:bg-[#F7F1FF]"
            }`}
        >
            {label}
        </button>
    );
}

function InventoryForecastUI() {
    return (
        <>
            <div className="rounded-[14px] border border-[#E6DDF0] bg-[#F7F1FF] p-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2B174C] text-white">
                        <TrendingUp size={18} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-[#2B174C]">
                            Inventory demand insight
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#5F4E75]">
                            These items have the highest estimated demand. Restock before projected demand exceeds available stock.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-3">
                {inventoryForecast.map((item) => (
                    <article
                        key={item.name}
                        className="rounded-[14px] border border-[#E6DDF0] bg-white p-4 shadow-sm"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h2 className="truncate text-[16px] font-bold text-[#1A1220]">
                                    {item.name}
                                </h2>
                                <p className="mt-1 text-xs text-[#7A6A84]">
                                    {item.category}
                                </p>
                            </div>

                            <RiskBadge risk={item.risk} />
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <ForecastValue
                                label="Forecasted demand"
                                value={`${item.forecastedDemand} items`}
                            />
                            <ForecastValue
                                label="Current stock"
                                value={`${item.currentStock} units`}
                            />
                            <ForecastValue
                                label="Monthly growth"
                                value={item.growth}
                                accent="green"
                            />
                            <ForecastValue
                                label="Restock now"
                                value={`+${item.restock} units`}
                                accent="gold"
                            />
                        </div>

                        <button
                            type="button"
                            className="mt-5 inline-flex h-[38px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#E6DDF0] bg-white text-xs font-semibold text-[#2B174C] transition hover:bg-[#F7F1FF]"
                        >
                            View inventory
                            <ChevronRight size={15} />
                        </button>
                    </article>
                ))}
            </div>

            <section className="overflow-hidden rounded-[14px] border border-[#E6DDF0] bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-[#E6DDF0] px-4 py-3.5">
                    <div>
                        <h2 className="text-[16px] font-bold text-[#1A1220]">
                            Restock Recommendations
                        </h2>
                        <p className="mt-0.5 text-xs text-[#7A6A84]">
                            Recommended quantity based on sample forecast demand.
                        </p>
                    </div>

                    <span className="rounded-full border border-[#F4D79A] bg-[#FFF8E8] px-2.5 py-1 text-xs font-semibold text-[#A56607]">
                        3 items
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] border-collapse">
                        <thead className="bg-[#FFFCF7]">
                        <tr className="border-b border-[#E6DDF0]">
                            <TableHeader>Product</TableHeader>
                            <TableHeader>Current Stock</TableHeader>
                            <TableHeader>Forecast Demand</TableHeader>
                            <TableHeader>Restock Recommendation</TableHeader>
                            <TableHeader>Risk</TableHeader>
                        </tr>
                        </thead>
                        <tbody>
                        {inventoryForecast.map((item) => (
                            <tr
                                key={item.name}
                                className="border-b border-[#EEE7F2] last:border-b-0"
                            >
                                <TableCell strong>{item.name}</TableCell>
                                <TableCell>{item.currentStock} units</TableCell>
                                <TableCell>{item.forecastedDemand} items</TableCell>
                                <TableCell>
                                        <span className="font-semibold text-[#A56607]">
                                            +{item.restock} units
                                        </span>
                                </TableCell>
                                <TableCell>
                                    <RiskBadge risk={item.risk} />
                                </TableCell>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    );
}

function SeasonalForecastUI() {
    return (
        <>
            <div className="rounded-[14px] border border-[#E6DDF0] bg-[#F7F1FF] p-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2B174C] text-white">
                        <BarChart3 size={18} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-[#2B174C]">
                            Seasonal demand insight
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#5F4E75]">
                            Sample data indicates Q3 as the strongest demand period. Plan staff schedules and inventory purchases ahead of peak season.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                <section className="rounded-[14px] border border-[#E6DDF0] bg-white p-4 shadow-sm">
                    <h2 className="text-[16px] font-bold text-[#1A1220]">
                        Seasonal Growth Chart
                    </h2>
                    <p className="mt-1 text-xs text-[#7A6A84]">
                        Quarterly growth based on sample demand data.
                    </p>

                    <div className="mt-6 flex h-[250px] items-end justify-between gap-4 border-b border-[#E6DDF0] px-2">
                        {seasonalForecast.map((item, index) => {
                            const barClass =
                                index === 2
                                    ? "bg-[#2B174C]"
                                    : index === 1
                                        ? "bg-[#C9951A]"
                                        : "bg-[#D8CBE7]";

                            return (
                                <div
                                    key={item.quarter}
                                    className="flex min-w-0 flex-1 flex-col items-center justify-end"
                                >
                                    <span className="mb-2 text-xs font-semibold text-[#4E2C66]">
                                        {item.growth}
                                    </span>
                                    <div
                                        className={`w-full max-w-[74px] rounded-t-xl ${barClass}`}
                                        style={{ height: item.height }}
                                    />
                                    <p className="mt-3 text-sm font-semibold text-[#1A1220]">
                                        {item.quarter}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="rounded-[14px] border border-[#E6DDF0] bg-white p-4 shadow-sm">
                    <h2 className="text-[16px] font-bold text-[#1A1220]">
                        Peak Season
                    </h2>
                    <div className="mt-5 rounded-xl border border-[#F4D79A] bg-[#FFF8E8] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#A56607]">
                            Highest projected period
                        </p>
                        <p className="mt-2 text-[24px] font-bold text-[#1A1220]">
                            Q3
                        </p>
                        <p className="mt-1 text-sm text-[#7A6A84]">
                            July – September
                        </p>
                        <p className="mt-4 text-sm leading-6 text-[#5F4E75]">
                            Prepare additional stocks and staffing capacity before the expected peak period.
                        </p>
                    </div>

                    <div className="mt-4 rounded-xl border border-[#E6DDF0] bg-[#FFFDF8] p-4">
                        <p className="text-sm font-semibold text-[#1A1220]">
                            Suggested action
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#7A6A84]">
                            Review high-demand packages and place restock orders at least two weeks ahead.
                        </p>
                    </div>
                </section>
            </div>

            <section className="overflow-hidden rounded-[14px] border border-[#E6DDF0] bg-white shadow-sm">
                <div className="border-b border-[#E6DDF0] px-4 py-3.5">
                    <h2 className="text-[16px] font-bold text-[#1A1220]">
                        Quarterly Demand Analysis
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] border-collapse">
                        <thead className="bg-[#FFFCF7]">
                        <tr className="border-b border-[#E6DDF0]">
                            <TableHeader>Quarter</TableHeader>
                            <TableHeader>Period</TableHeader>
                            <TableHeader>Growth</TableHeader>
                            <TableHeader>Forecast Insight</TableHeader>
                        </tr>
                        </thead>
                        <tbody>
                        {seasonalForecast.map((item) => (
                            <tr
                                key={item.quarter}
                                className="border-b border-[#EEE7F2] last:border-b-0"
                            >
                                <TableCell strong>{item.quarter}</TableCell>
                                <TableCell>{item.period}</TableCell>
                                <TableCell>
                                        <span className="font-semibold text-[#138342]">
                                            {item.growth}
                                        </span>
                                </TableCell>
                                <TableCell>{item.insight}</TableCell>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    );
}

function BookingForecastUI() {
    return (
        <>
            <div className="rounded-[14px] border border-[#E6DDF0] bg-[#F7F1FF] p-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2B174C] text-white">
                        <CalendarDays size={18} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-[#2B174C]">
                            Booking demand insight
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#5F4E75]">
                            Weekends are projected to receive the strongest booking demand. Prioritize package preparation and staff availability for Friday through Sunday.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                <SummaryCard
                    icon={<CalendarDays size={18} />}
                    title="Next 30 Days"
                    value="28 bookings"
                    detail="+12% from previous period"
                    tone="purple"
                />
                <SummaryCard
                    icon={<TrendingUp size={18} />}
                    title="Next 60 Days"
                    value="61 bookings"
                    detail="+18% projected growth"
                    tone="gold"
                />
                <SummaryCard
                    icon={<Clock3 size={18} />}
                    title="Peak Day"
                    value="Saturday"
                    detail="Average 5 bookings/day"
                    tone="red"
                />
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
                <section className="rounded-[14px] border border-[#E6DDF0] bg-white p-4 shadow-sm">
                    <h2 className="text-[16px] font-bold text-[#1A1220]">
                        Forecast by Package
                    </h2>
                    <p className="mt-1 text-xs text-[#7A6A84]">
                        Estimated bookings for the next 30 days.
                    </p>

                    <div className="mt-6 space-y-5">
                        {packageForecast.map((pkg, index) => (
                            <div key={pkg.name}>
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <p className="min-w-0 truncate text-sm font-semibold text-[#1A1220]">
                                        {pkg.name}
                                    </p>
                                    <p className="shrink-0 text-xs font-semibold text-[#5F4E75]">
                                        {pkg.count} bookings
                                    </p>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-[#EEE8F8]">
                                    <div
                                        className={
                                            index === 0
                                                ? "h-full rounded-full bg-[#2B174C]"
                                                : index === 1
                                                    ? "h-full rounded-full bg-[#C9951A]"
                                                    : "h-full rounded-full bg-[#9B7EBC]"
                                        }
                                        style={{ width: `${pkg.percent}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-[14px] border border-[#E6DDF0] bg-white p-4 shadow-sm">
                    <h2 className="text-[16px] font-bold text-[#1A1220]">
                        Forecast by Day
                    </h2>
                    <p className="mt-1 text-xs text-[#7A6A84]">
                        Expected booking distribution during the week.
                    </p>

                    <div className="mt-6 flex h-[200px] items-end justify-between gap-2 border-b border-[#E6DDF0] px-1">
                        {dayForecast.map((day, index) => (
                            <div
                                key={day.label}
                                className="flex min-w-0 flex-1 flex-col items-center justify-end"
                            >
                                <div
                                    className={
                                        index >= 4
                                            ? "w-full max-w-[42px] rounded-t-xl bg-[#C9951A]"
                                            : "w-full max-w-[42px] rounded-t-xl bg-[#D8CBE7]"
                                    }
                                    style={{ height: day.height }}
                                />
                                <p className="mt-3 text-xs font-semibold text-[#5F4E75]">
                                    {day.label}
                                </p>
                            </div>
                        ))}
                    </div>

                    <p className="mt-4 text-center text-xs text-[#7A6A84]">
                        Friday to Sunday are marked as higher-demand booking days.
                    </p>
                </section>
            </div>
        </>
    );
}

function ForecastValue({
                           label,
                           value,
                           accent,
                       }: {
    label: string;
    value: string;
    accent?: "green" | "gold";
}) {
    const accentClass =
        accent === "green"
            ? "text-[#138342]"
            : accent === "gold"
                ? "text-[#A56607]"
                : "text-[#1A1220]";

    return (
        <div className="rounded-xl border border-[#E6DDF0] bg-[#FFFDF8] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#806A8C]">
                {label}
            </p>
            <p className={`mt-1 text-sm font-bold ${accentClass}`}>{value}</p>
        </div>
    );
}

function RiskBadge({ risk }: { risk: string }) {
    const className =
        risk === "High"
            ? "border-[#F2C4C4] bg-[#FFF0F0] text-[#C32F2F]"
            : risk === "Medium"
                ? "border-[#F4D79A] bg-[#FFF8E8] text-[#A56607]"
                : "border-[#B7E9C8] bg-[#EDFBF1] text-[#138342]";

    return (
        <span
            className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
        >
            {risk} risk
        </span>
    );
}

function TableHeader({ children }: { children: ReactNode }) {
    return (
        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#806A8C]">
            {children}
        </th>
    );
}

function TableCell({
                       children,
                       strong = false,
                   }: {
    children: ReactNode;
    strong?: boolean;
}) {
    return (
        <td
            className={`px-4 py-3 text-sm ${
                strong ? "font-semibold text-[#1A1220]" : "text-[#5F4E75]"
            }`}
        >
            {children}
        </td>
    );
}
