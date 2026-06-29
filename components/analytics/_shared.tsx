"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import {
    BarChart3,
    Building2,
    CalendarDays,
    ChevronDown,
    Clock3,
    Info,
    Lightbulb,
    Minus,
    RefreshCw,
    TrendingDown,
    TrendingUp,
    UsersRound,
} from "lucide-react";
import RoleSidebar from "@/components/sidebar/RoleSidebar";
import RequirePermission from "@/components/permissions/RequirePermission";

export type AnalyticsRole = "owner" | "manager" | "staff";

export type AnalyticsBranch = {
    id: number;
    name: string;
};

type ChartPoint = {
    label: string;
    value: number;
    key?: string;
};

type RevenueItem = {
    name: string;
    value: number;
};

type AnalyticsData = {
    success: boolean;
    generatedAt: string;
    hasData: boolean;
    scope: {
        storeId: number;
        branchId: number | null;
        branchName: string;
        role: AnalyticsRole;
        isOverall: boolean;
    };
    period: {
        kind: "preset" | "custom";
        days: number;
        startDate: string;
        endDate: string;
        previousStartDate: string;
        previousEndDate: string;
        label: string;
    };
    salesGrowth: {
        value: number;
        currentSales: number;
        previousSales: number;
        comparisonLabel: string;
        monthlyGrowth: ChartPoint[];
    };
    salesTrend: {
        latestMonthlySales: number;
        previousMonthSales: number;
        monthlySales: ChartPoint[];
        dailySalesByMonth: Record<string, ChartPoint[]>;
        salesOrderCount: number;
    };
    peakBookings: {
        totalBookings: number;
        confirmed: number;
        preparing: number;
        completed: number;
        peakDay: string;
        peakTime: string;
        weekendPercentage: number;
        weekdayPeak: string;
        weekdayPeakTime: string;
        dailyBookings: ChartPoint[];
        topPackages: RevenueItem[];
    };
    productRevenue: RevenueItem[];
    packageRevenue: RevenueItem[];
    insights: string[];
    dataNotes: {
        sales: string;
        bookings: string;
        products: string;
        packages: string;
    };
};

const REVENUE_COLORS = [
    "#7C3AED",
    "#F5A623",
    "#3B9EEA",
    "#8CCB45",
    "#EC5AA7",
    "#5A8DEE",
    "#A569BD",
    "#4CB391",
];

function getToken() {
    if (typeof window === "undefined") {
        return "";
    }

    return sessionStorage.getItem("token") || localStorage.getItem("token") || "";
}

function formatCurrentDateTime(value: Date) {
    const dateLabel = value.toLocaleDateString("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });

    const timeLabel = value
        .toLocaleTimeString("en-PH", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        })
        .toLowerCase();

    return `${dateLabel} | ${timeLabel}`;
}

function peso(value: number) {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        maximumFractionDigits: 0,
    }).format(Number(value || 0));
}

function pesoShort(value: number) {
    const safe = Number(value || 0);

    if (Math.abs(safe) >= 1_000_000) {
        return `₱${(safe / 1_000_000).toFixed(1)}M`;
    }

    if (Math.abs(safe) >= 1_000) {
        return `₱${Math.round(safe / 1_000)}K`;
    }

    return peso(safe);
}

function formatNumber(value: number) {
    return new Intl.NumberFormat("en-PH").format(Number(value || 0));
}

function isoDate(value: Date) {
    return value.toISOString().slice(0, 10);
}

function defaultRange(days = 30) {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));

    return {
        start: isoDate(start),
        end: isoDate(end),
    };
}

function total(items: RevenueItem[]) {
    return items.reduce((sum, item) => sum + Number(item.value || 0), 0);
}

function trendDetails(value: number) {
    if (value > 0) {
        return {
            label: "Increasing Trend",
            className: "text-[#188A4B]",
            icon: TrendingUp,
        };
    }

    if (value < 0) {
        return {
            label: "Declining Trend",
            className: "text-[#C2410C]",
            icon: TrendingDown,
        };
    }

    return {
        label: "Stable Trend",
        className: "text-[#7A6E88]",
        icon: Minus,
    };
}

function Card({
                  title,
                  children,
                  action,
                  className = "",
              }: {
    title: string;
    children: ReactNode;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <section className={`rounded-[14px] border border-[#E6DDF0] bg-white p-4 shadow-sm ${className}`}>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <h2 className="flex items-center gap-1.5 text-[16px] font-bold text-[#1A1220]">
                    {title}
                    <Info size={14} className="text-[#A58DBF]" />
                </h2>
                {action}
            </div>
            {children}
        </section>
    );
}

function EmptyPanel({
                        title,
                        message,
                    }: {
    title: string;
    message: string;
}) {
    return (
        <div className="rounded-xl border border-dashed border-[#D8CBE7] bg-[#FFFEFC] px-4 py-7 text-center">
            <p className="text-sm font-semibold text-[#3D255C]">{title}</p>
            <p className="mx-auto mt-1 max-w-xl text-xs leading-5 text-[#7A6A84]">{message}</p>
        </div>
    );
}

function GrowthBarChart({ data }: { data: ChartPoint[] }) {
    if (data.length === 0) {
        return (
            <EmptyPanel
                title="No growth comparison is available."
                message="Record POS orders in at least two comparable periods to calculate a sales growth percentage."
            />
        );
    }

    const maxAbsolute = Math.max(...data.map((item) => Math.abs(item.value)), 1);

    return (
        <div className="relative mt-2 h-[185px] border-b border-[#EDE7F4]">
            <div className="absolute inset-x-0 top-[16%] border-t border-dashed border-[#ECE4F1]" />
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[#D8CBE6]" />
            <div className="absolute inset-x-0 bottom-[16%] border-t border-dashed border-[#ECE4F1]" />

            <div className="absolute inset-0 flex">
                <div className="flex w-10 flex-col justify-between py-[7px] text-[10px] text-[#8A769C]">
                    <span>+{maxAbsolute}%</span>
                    <span>0%</span>
                    <span>-{maxAbsolute}%</span>
                </div>

                <div className="relative ml-1 flex flex-1 items-stretch justify-around">
                    {data.map((item) => {
                        const height = Math.max((Math.abs(item.value) / maxAbsolute) * 43, 4);
                        const positive = item.value >= 0;

                        return (
                            <div key={`${item.label}-${item.value}`} className="relative h-full flex-1">
                                <div className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 bg-[#D8CBE6]" />
                                <div
                                    className={`absolute left-1/2 w-4 -translate-x-1/2 ${
                                        positive
                                            ? "rounded-t-sm bg-[#7B3FE4]"
                                            : "rounded-b-sm bg-[#A66BCF]"
                                    }`}
                                    style={
                                        positive
                                            ? { bottom: "50%", height: `${height}%` }
                                            : { top: "50%", height: `${height}%` }
                                    }
                                />
                                <span
                                    className="absolute left-1/2 -translate-x-1/2 text-[10px] font-semibold text-[#553273]"
                                    style={
                                        positive
                                            ? { bottom: `calc(50% + ${height}% + 5px)` }
                                            : { top: `calc(50% + ${height}% + 5px)` }
                                    }
                                >
                                    {item.value > 0 ? "+" : ""}{item.value}%
                                </span>
                                <span className="absolute bottom-[-23px] left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-[#806D91]">
                                    {item.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function SalesLineChart({
                            data,
                            ariaLabel,
                        }: {
    data: ChartPoint[];
    ariaLabel: string;
}) {
    if (data.length === 0) {
        return (
            <EmptyPanel
                title="No POS sales were recorded."
                message="The sales trend will appear after POS orders are recorded in the selected reporting period."
            />
        );
    }

    const values = data.map((item) => Number(item.value || 0));
    const highest = Math.max(...values, 1);
    const lowest = Math.min(...values, 0);
    const padding = Math.max((highest - lowest) * 0.12, 100);
    const graphMin = Math.max(0, lowest - padding);
    const graphMax = highest + padding;
    const graphRange = graphMax - graphMin || 1;

    const leftPadding = 54;
    const rightPadding = 554;
    const baselineY = 141;

    const plot = data.map((item, index) => {
        const x = leftPadding + (index * (rightPadding - leftPadding)) / Math.max(data.length - 1, 1);
        const y = 135 - ((Number(item.value || 0) - graphMin) / graphRange) * 102;

        return { ...item, x, y };
    });

    const linePoints = plot.map((point) => `${point.x},${point.y}`).join(" ");
    const fillPoints = `${leftPadding},${baselineY} ${linePoints} ${rightPadding},${baselineY}`;
    const showEvery = data.length > 12 ? Math.ceil(data.length / 7) : 1;

    return (
        <div className="overflow-x-auto">
            <svg
                viewBox="0 0 590 182"
                className="h-[190px] min-w-[560px] w-full font-sans"
                role="img"
                aria-label={ariaLabel}
            >
                {[34, 68, 102, 136].map((y) => (
                    <line
                        key={y}
                        x1={leftPadding}
                        x2={rightPadding}
                        y1={y}
                        y2={y}
                        stroke="#EFEAF3"
                        strokeWidth="1"
                    />
                ))}

                {[graphMax, graphMin + (graphRange * 2) / 3, graphMin + graphRange / 3, graphMin].map(
                    (value, index) => (
                        <text
                            key={index}
                            x="0"
                            y={[38, 72, 106, 140][index]}
                            fontSize="10"
                            fill="#8A769C"
                        >
                            {pesoShort(value)}
                        </text>
                    )
                )}

                <polygon points={fillPoints} fill="#F1E8FF" opacity="0.78" />
                <polyline
                    points={linePoints}
                    fill="none"
                    stroke="#7B3FE4"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {plot.map((point, index) => {
                    const showLabel =
                        index === 0 ||
                        index === plot.length - 1 ||
                        index % showEvery === 0;
                    const isDense = data.length > 12;

                    return (
                        <g key={`${point.label}-${index}`}>
                            <circle
                                cx={point.x}
                                cy={point.y}
                                r={isDense ? "2.3" : "4.3"}
                                fill="#7B3FE4"
                                stroke={isDense ? "none" : "#ffffff"}
                                strokeWidth={isDense ? "0" : "1.6"}
                            />
                            {showLabel && (
                                <>
                                    {!isDense && (
                                        <text
                                            x={point.x}
                                            y={Math.max(point.y - 11, 16)}
                                            textAnchor="middle"
                                            fontSize="10"
                                            fontWeight="600"
                                            fill="#5B3B76"
                                        >
                                            {pesoShort(point.value)}
                                        </text>
                                    )}
                                    <text
                                        x={point.x}
                                        y="166"
                                        textAnchor="middle"
                                        fontSize="10"
                                        fill="#806D91"
                                    >
                                        {point.label}
                                    </text>
                                </>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

function BookingBars({ data }: { data: ChartPoint[] }) {
    const highest = Math.max(...data.map((item) => Number(item.value || 0)), 0);

    if (highest <= 0) {
        return (
            <EmptyPanel
                title="No accepted bookings were scheduled."
                message="Confirmed, Preparing, and Completed bookings in the selected reporting period are used for this chart."
            />
        );
    }

    return (
        <div className="mt-3 h-[142px]">
            <div className="flex h-full items-end gap-4 border-b border-[#EDE7F4] px-4">
                {data.map((item) => {
                    const height = Math.max((Number(item.value || 0) / highest) * 100, 5);

                    return (
                        <div key={item.label} className="flex h-full flex-1 flex-col items-center justify-end">
                            <span className="mb-1 text-[10px] font-semibold text-[#8C6A33]">
                                {item.value}
                            </span>
                            <div
                                className="w-full max-w-9 rounded-t-md bg-[#F4A52B]"
                                style={{ height: `${height}%` }}
                            />
                            <span className="mt-2 text-[10px] font-medium text-[#806D91]">{item.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function DonutChart({
                        items,
                        totalLabel,
                        centerLabel,
                    }: {
    items: RevenueItem[];
    totalLabel: string;
    centerLabel: string;
}) {
    const overallTotal = total(items);

    const background = useMemo(() => {
        if (overallTotal <= 0 || items.length === 0) {
            return "#EFEAF3";
        }

        let offset = 0;
        const segments = items.map((item, index) => {
            const percentage = (item.value / overallTotal) * 100;
            const start = offset;
            offset += percentage;
            return `${REVENUE_COLORS[index % REVENUE_COLORS.length]} ${start}% ${offset}%`;
        });

        return `conic-gradient(${segments.join(", ")})`;
    }, [items, overallTotal]);

    return (
        <div
            className="relative flex h-[156px] w-[156px] shrink-0 items-center justify-center rounded-full"
            style={{ background }}
            aria-label={centerLabel}
        >
            <div className="flex h-[99px] w-[99px] flex-col items-center justify-center rounded-full bg-white px-2 text-center">
                <p className="text-[17px] font-bold leading-tight text-[#281448]">{totalLabel}</p>
                <p className="mt-1 text-[10px] leading-tight text-[#806D91]">{centerLabel}</p>
            </div>
        </div>
    );
}

function RevenueLegend({
                           items,
                           emptyMessage,
                       }: {
    items: RevenueItem[];
    emptyMessage: string;
}) {
    const overallTotal = total(items);

    if (items.length === 0) {
        return <p className="text-sm leading-6 text-[#7A6A84]">{emptyMessage}</p>;
    }

    return (
        <div className="min-w-0 flex-1">
            <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 text-[9px] font-semibold uppercase tracking-wide text-[#9A86AC]">
                <span>Category</span>
                <span>Value</span>
                <span>%</span>
            </div>

            <div className="space-y-2">
                {items.map((item, index) => {
                    const percentage = overallTotal > 0 ? Math.round((item.value / overallTotal) * 100) : 0;

                    return (
                        <div
                            key={item.name}
                            className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 text-[11px]"
                        >
                            <div className="flex min-w-0 items-center gap-2">
                                <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{
                                        backgroundColor:
                                            REVENUE_COLORS[index % REVENUE_COLORS.length],
                                    }}
                                />
                                <span className="truncate font-medium text-[#4D2A74]">{item.name}</span>
                            </div>
                            <span className="font-medium text-[#5F4A73]">{peso(item.value)}</span>
                            <span className="font-medium text-[#5F4A73]">{percentage}%</span>
                        </div>
                    );
                })}
            </div>

            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 border-t border-[#EEE8F3] pt-2 text-[11px] font-semibold text-[#4D2A74]">
                <span>Total</span>
                <span>{peso(overallTotal)}</span>
                <span>100%</span>
            </div>
        </div>
    );
}

function AnalyticsShell({ children }: { children: ReactNode }) {
    return (
        <RequirePermission>
            <div className="flex min-h-screen overflow-x-hidden font-sans text-[#1A1220]" style={{ backgroundColor: "#FDFAF4" }}>
                <RoleSidebar />
                <div className="min-w-0 flex-1 overflow-x-hidden">{children}</div>
            </div>
        </RequirePermission>
    );
}

function OwnerAnalyticsBranchSelector({
                                          branches,
                                          selectedBranchId,
                                          loading,
                                          onSelectBranch,
                                      }: {
    branches: AnalyticsBranch[];
    selectedBranchId: number | null;
    loading: boolean;
    onSelectBranch: (branchId: number | null) => void;
}) {
    return (
        <div className="relative w-full lg:w-[320px]">
            <select
                value={selectedBranchId ?? ""}
                disabled={loading}
                onChange={(event) => {
                    const value = event.target.value;
                    onSelectBranch(value ? Number(value) : null);
                }}
                className="h-[42px] w-full appearance-none rounded-xl border border-[#E6DDF0] bg-white px-3.5 pr-10 text-sm font-semibold text-[#1A1220] outline-none shadow-sm transition focus:border-[#2B174C] focus:ring-4 focus:ring-[#2B174C]/10 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Select analytics branch"
            >
                <option value="">All Branches</option>
                {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                        {branch.name}
                    </option>
                ))}
            </select>
            <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5E4774]"
            />
        </div>
    );
}

function PeriodSelector({
                            periodMode,
                            customStart,
                            customEnd,
                            onPeriodChange,
                            onCustomStartChange,
                            onCustomEndChange,
                            onApplyCustomRange,
                            disabled,
                        }: {
    periodMode: "30" | "60" | "90" | "custom";
    customStart: string;
    customEnd: string;
    onPeriodChange: (value: "30" | "60" | "90" | "custom") => void;
    onCustomStartChange: (value: string) => void;
    onCustomEndChange: (value: string) => void;
    onApplyCustomRange: () => void;
    disabled: boolean;
}) {
    return (
        <section className="rounded-[14px] border border-[#E6DDF0] bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <h2 className="text-[16px] font-bold text-[#1A1220]">Reporting Period</h2>
                    <p className="mt-0.5 text-xs leading-5 text-[#7A6A84]">
                        Analytics uses recorded POS orders and accepted booking schedules within the selected period.
                    </p>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                    <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#806D91]">
                        Period
                        <select
                            value={periodMode}
                            disabled={disabled}
                            onChange={(event) =>
                                onPeriodChange(event.target.value as "30" | "60" | "90" | "custom")
                            }
                            className="h-[38px] rounded-xl border border-[#E6DDF0] bg-white px-3 text-sm font-semibold normal-case tracking-normal text-[#2B174C] outline-none disabled:opacity-60"
                        >
                            <option value="30">Last 30 days</option>
                            <option value="60">Last 60 days</option>
                            <option value="90">Last 90 days</option>
                            <option value="custom">Custom dates</option>
                        </select>
                    </label>

                    {periodMode === "custom" && (
                        <>
                            <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#806D91]">
                                Start date
                                <input
                                    type="date"
                                    value={customStart}
                                    max={customEnd}
                                    onChange={(event) => onCustomStartChange(event.target.value)}
                                    className="h-[38px] rounded-xl border border-[#E6DDF0] bg-white px-3 text-sm font-medium normal-case tracking-normal text-[#2B174C] outline-none"
                                />
                            </label>
                            <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#806D91]">
                                End date
                                <input
                                    type="date"
                                    value={customEnd}
                                    min={customStart}
                                    onChange={(event) => onCustomEndChange(event.target.value)}
                                    className="h-[38px] rounded-xl border border-[#E6DDF0] bg-white px-3 text-sm font-medium normal-case tracking-normal text-[#2B174C] outline-none"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={onApplyCustomRange}
                                disabled={disabled || !customStart || !customEnd}
                                className="h-[38px] rounded-xl border border-[#2B174C] px-3 text-sm font-semibold text-[#2B174C] transition hover:bg-[#F3ECFF] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Apply
                            </button>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}

export function AnalyticsLoadingScreen() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-[#FDFAF4] text-[#1A1220]">
            <p className="text-sm text-[#7A6E88]">Loading analytics...</p>
        </main>
    );
}

export function AnalyticsWorkspace({
                                       role,
                                       assignedBranch = "",
                                       ownerBranches = [],
                                       ownerBranchesLoading = false,
                                   }: {
    role: AnalyticsRole;
    assignedBranch?: string;
    ownerBranches?: AnalyticsBranch[];
    ownerBranchesLoading?: boolean;
}) {
    const initialRange = useMemo(() => defaultRange(30), []);
    const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);
    const [periodMode, setPeriodMode] = useState<"30" | "60" | "90" | "custom">("30");
    const [customStart, setCustomStart] = useState(initialRange.start);
    const [customEnd, setCustomEnd] = useState(initialRange.end);
    const [appliedCustomRange, setAppliedCustomRange] = useState(initialRange);
    const [salesView, setSalesView] = useState<"month" | "day">("month");
    const [selectedSalesMonth, setSelectedSalesMonth] = useState("");
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isOwner = role === "owner";
    const [selectedOwnerBranchId, setSelectedOwnerBranchId] = useState<number | null>(null);

    const selectedOwnerBranch = useMemo(
        () => ownerBranches.find((branch) => branch.id === selectedOwnerBranchId) ?? null,
        [ownerBranches, selectedOwnerBranchId]
    );

    const loadAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const token = getToken();

            if (!token) {
                throw new Error("Your login token is missing. Please log out and sign in again.");
            }

            const requestBody: Record<string, string | number> = {
                action: "get_analytics",
            };

            if (periodMode === "custom") {
                requestBody.start_date = appliedCustomRange.start;
                requestBody.end_date = appliedCustomRange.end;
            } else {
                requestBody.period = Number(periodMode);
            }

            if (isOwner && selectedOwnerBranchId !== null) {
                requestBody.branch_id = selectedOwnerBranchId;
            }

            // Mirrors the working Forecasting flow exactly:
            // browser -> Next.js POST route -> API Gateway -> Lambda.
            const response = await fetch("/api/analytics", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(requestBody),
                cache: "no-store",
            });

            const responseText = await response.text();
            let result: (AnalyticsData & { error?: string; details?: string }) | null = null;

            try {
                result = responseText
                    ? (JSON.parse(responseText) as AnalyticsData & { error?: string; details?: string })
                    : null;
            } catch {
                throw new Error(
                    responseText ||
                    `Analytics service returned status ${response.status}.`
                );
            }

            if (!response.ok) {
                throw new Error(
                    result?.error ||
                    result?.details ||
                    `Analytics service returned status ${response.status}.`
                );
            }

            if (!result?.success) {
                throw new Error(result?.error || "Analytics did not return a successful response.");
            }

            setData(result);
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : "Analytics data could not be loaded."
            );
        } finally {
            setLoading(false);
        }
    }, [appliedCustomRange, isOwner, periodMode, selectedOwnerBranchId]);

    useEffect(() => {
        const updateCurrentTime = () => setCurrentDateTime(new Date());
        updateCurrentTime();
        const timer = window.setInterval(updateCurrentTime, 30_000);

        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        void loadAnalytics();
    }, [loadAnalytics]);

    const growth = trendDetails(data?.salesGrowth.value || 0);
    const GrowthIcon = growth.icon;

    const availableSalesMonths = data?.salesTrend.monthlySales.map((item) => item.label) || [];
    const resolvedSalesMonth =
        availableSalesMonths.includes(selectedSalesMonth)
            ? selectedSalesMonth
            : availableSalesMonths[availableSalesMonths.length - 1] || "";

    const dailySales = data?.salesTrend.dailySalesByMonth[resolvedSalesMonth] || [];
    const activeSalesData =
        salesView === "day" ? dailySales : data?.salesTrend.monthlySales || [];
    const activeSalesTotal =
        salesView === "day"
            ? dailySales.reduce((sum, item) => sum + item.value, 0)
            : data?.salesTrend.latestMonthlySales || 0;

    const scopeLabel = data?.scope.branchName ||
        (isOwner
            ? selectedOwnerBranch?.name || "All Branches"
            : assignedBranch || "Assigned Branch");

    const scopeDescription = data?.scope.isOverall
        ? "Overall business performance from authorized inventory sales and booking activity across all branches."
        : `Authorized business performance for ${scopeLabel}.`;

    function applyCustomRange() {
        if (!customStart || !customEnd || customStart > customEnd) {
            setError("Choose a valid custom start date and end date.");
            return;
        }

        setAppliedCustomRange({
            start: customStart,
            end: customEnd,
        });
    }

    return (
        <AnalyticsShell>
            <main className="min-h-screen bg-[#FDFAF4]">
                <header className="sticky top-0 z-20 border-b border-[#E9E0EF] bg-[#FFFDF8]/95 backdrop-blur">
                    <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3">
                        <h1 className="text-[25px] font-bold text-[#1A1220]">Analytics</h1>

                        <div className="flex flex-wrap items-center gap-2.5">
                            <span className="inline-flex h-[42px] items-center rounded-xl border border-[#E6DDF0] bg-white px-3.5 text-sm font-semibold text-[#2B174C] shadow-sm">
                                {currentDateTime ? formatCurrentDateTime(currentDateTime) : "Loading date..."}
                            </span>
                            <button
                                type="button"
                                onClick={loadAnalytics}
                                disabled={loading}
                                className="inline-flex h-[42px] items-center gap-2 rounded-xl bg-[#2B174C] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1B0D31] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </header>

                <div className="space-y-3 px-6 py-4">
                    {isOwner && (
                        <section className="rounded-[14px] border border-[#E6DDF0] bg-white p-4 shadow-sm">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex min-w-0 items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFE8F8] text-[#4E2C66]">
                                        <Building2 size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-[16px] font-bold text-[#1A1220]">Analytics Scope</h2>
                                        <p className="mt-0.5 text-xs leading-5 text-[#7A6A84]">
                                            All Branches is the default. Select one branch to view only that branch’s authorized analytics.
                                        </p>
                                    </div>
                                </div>

                                <OwnerAnalyticsBranchSelector
                                    branches={ownerBranches}
                                    selectedBranchId={selectedOwnerBranchId}
                                    loading={ownerBranchesLoading}
                                    onSelectBranch={setSelectedOwnerBranchId}
                                />
                            </div>
                        </section>
                    )}

                    <PeriodSelector
                        periodMode={periodMode}
                        customStart={customStart}
                        customEnd={customEnd}
                        onPeriodChange={setPeriodMode}
                        onCustomStartChange={setCustomStart}
                        onCustomEndChange={setCustomEnd}
                        onApplyCustomRange={applyCustomRange}
                        disabled={loading}
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-[#7A6A84]">{scopeDescription}</p>
                        <p className="text-xs text-[#806A8C]">
                            {data ? `Updated ${new Date(data.generatedAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}` : ""}
                        </p>
                    </div>

                    {error && (
                        <div className="rounded-xl border border-[#F2C4C4] bg-[#FFF6F6] px-4 py-3 text-sm text-[#8E2D2D]">
                            <p className="font-semibold">Unable to load live analytics.</p>
                            <p className="mt-1">{error}</p>
                        </div>
                    )}

                    {loading && !data ? (
                        <div className="rounded-[14px] border border-[#E6DDF0] bg-white p-8 text-center text-sm text-[#7A6A84] shadow-sm">
                            Loading live analytics records...
                        </div>
                    ) : data ? (
                        <>
                            {!data.hasData && (
                                <EmptyPanel
                                    title="No authorized analytics records are available."
                                    message={`No POS orders or accepted booking records were found for ${data.scope.branchName} during ${data.period.label}. Choose another reporting period or record new transactions.`}
                                />
                            )}

                            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                                <Card title="Sales Growth">
                                    <div className="grid gap-4 md:grid-cols-[190px_minmax(0,1fr)]">
                                        <div className="border-b border-[#EEE8F3] pb-4 md:border-b-0 md:border-r md:pb-0 md:pr-4">
                                            <p className="text-[11px] text-[#806D91]">Sales Growth</p>
                                            <p className="mt-2 text-[28px] font-bold tracking-tight text-[#7B3FE4]">
                                                {data.salesGrowth.value > 0 ? "+" : ""}
                                                {data.salesGrowth.value}%
                                            </p>
                                            <div className={`mt-1 flex items-center gap-1.5 text-sm font-semibold ${growth.className}`}>
                                                <GrowthIcon size={16} />
                                                {growth.label}
                                            </div>
                                            <p className="mt-2 text-[10px] leading-4 text-[#806D91]">
                                                {data.salesGrowth.comparisonLabel}
                                            </p>

                                            <div className="mt-5 border-t border-[#EEE8F3] pt-3 text-[11px] leading-5 text-[#6F5A82]">
                                                <p>Current sales: <strong>{peso(data.salesGrowth.currentSales)}</strong></p>
                                                <p>Previous period: <strong>{peso(data.salesGrowth.previousSales)}</strong></p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="mb-1 text-center text-[10px] font-medium text-[#806D91]">
                                                Monthly sales change <span className="text-[#A38FB4]">(vs prior month)</span>
                                            </p>
                                            <GrowthBarChart data={data.salesGrowth.monthlyGrowth} />
                                        </div>
                                    </div>
                                </Card>

                                <Card
                                    title="Sales Trend"
                                    action={
                                        <div className="flex flex-wrap items-center justify-end gap-2">
                                            <div className="flex rounded-xl border border-[#E6DDF0] bg-white p-1 text-xs font-semibold shadow-sm">
                                                <button
                                                    type="button"
                                                    onClick={() => setSalesView("month")}
                                                    className={`rounded-md px-2.5 py-1.5 transition ${
                                                        salesView === "month"
                                                            ? "bg-[#2D1B4E] text-white"
                                                            : "text-[#765D8B] hover:bg-[#F0E9F8]"
                                                    }`}
                                                >
                                                    By Month
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSalesView("day")}
                                                    className={`rounded-md px-2.5 py-1.5 transition ${
                                                        salesView === "day"
                                                            ? "bg-[#2D1B4E] text-white"
                                                            : "text-[#765D8B] hover:bg-[#F0E9F8]"
                                                    }`}
                                                >
                                                    By Day
                                                </button>
                                            </div>

                                            {salesView === "day" && (
                                                <select
                                                    value={resolvedSalesMonth}
                                                    onChange={(event) => setSelectedSalesMonth(event.target.value)}
                                                    className="rounded-xl border border-[#E6DDF0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#2B174C] outline-none shadow-sm"
                                                    aria-label="Select month for daily sales chart"
                                                >
                                                    {availableSalesMonths.map((month) => (
                                                        <option key={month} value={month}>{month}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    }
                                >
                                    <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
                                        <p className="text-[11px] text-[#806D91]">
                                            {salesView === "month"
                                                ? `Monthly POS sales — ${data.period.label}`
                                                : `Daily POS sales — ${resolvedSalesMonth || data.period.label}`}
                                        </p>
                                        <div className="text-right">
                                            <p className="text-[10px] text-[#806D91]">
                                                {salesView === "month" ? "Latest month in period" : "Selected month total"}
                                            </p>
                                            <p className="text-[19px] font-bold text-[#7B3FE4]">{peso(activeSalesTotal)}</p>
                                            <p className="text-[10px] text-[#806D91]">
                                                {formatNumber(data.salesTrend.salesOrderCount)} recorded POS order(s)
                                            </p>
                                        </div>
                                    </div>

                                    <SalesLineChart
                                        data={activeSalesData}
                                        ariaLabel={salesView === "month" ? "Monthly POS sales trend" : `Daily POS sales trend for ${resolvedSalesMonth}`}
                                    />
                                </Card>
                            </div>

                            <Card title="Peak Bookings">
                                <div className="grid divide-y divide-[#EEE8F3] rounded-xl border border-[#E8DDF4] md:grid-cols-4 md:divide-x md:divide-y-0">
                                    <div className="flex items-center gap-3 p-3.5">
                                        <span className="rounded-full bg-[#F1E9FE] p-2.5 text-[#7B3FE4]"><CalendarDays size={20} /></span>
                                        <div>
                                            <p className="text-[10px] text-[#806D91]">Peak booking day</p>
                                            <p className="text-[15px] font-bold text-[#6B2AC6]">{data.peakBookings.peakDay}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3.5">
                                        <span className="rounded-full bg-[#F1E9FE] p-2.5 text-[#7B3FE4]"><Clock3 size={20} /></span>
                                        <div>
                                            <p className="text-[10px] text-[#806D91]">Peak booking time</p>
                                            <p className="text-[15px] font-bold text-[#6B2AC6]">{data.peakBookings.peakTime}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3.5">
                                        <span className="rounded-full bg-[#F1E9FE] p-2.5 text-[#7B3FE4]"><UsersRound size={20} /></span>
                                        <div>
                                            <p className="text-[10px] text-[#806D91]">Weekend share</p>
                                            <p className="text-[15px] font-bold text-[#6B2AC6]">{data.peakBookings.weekendPercentage}%</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3.5">
                                        <span className="rounded-full bg-[#F1E9FE] p-2.5 text-[#7B3FE4]"><BarChart3 size={20} /></span>
                                        <div>
                                            <p className="text-[10px] text-[#806D91]">Accepted bookings</p>
                                            <p className="text-[15px] font-bold text-[#6B2AC6]">{data.peakBookings.totalBookings}</p>
                                            <p className="text-[9px] text-[#806D91]">Confirmed, Preparing, Completed</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_290px]">
                                    <div>
                                        <p className="text-[11px] text-[#806D91]">Accepted bookings by event weekday</p>
                                        <BookingBars data={data.peakBookings.dailyBookings} />
                                    </div>

                                    <div className="flex gap-3 rounded-xl border border-[#F0DFC1] bg-[#FFFDF8] p-4">
                                        <span className="h-fit rounded-full bg-[#FFF0CB] p-2.5 text-[#C88812]"><Lightbulb size={18} /></span>
                                        <div>
                                            <p className="text-xs font-semibold text-[#7A4B09]">Booking insight</p>
                                            <p className="mt-1 text-[11px] leading-5 text-[#806D91]">
                                                {data.peakBookings.totalBookings > 0
                                                    ? `${data.peakBookings.peakDay} has the highest accepted booking activity. Use this schedule to prepare staff and inventory availability.`
                                                    : "No accepted bookings are available for this reporting period."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                                <Card title="Product Revenue Analytics">
                                    <p className="mb-3 text-xs leading-5 text-[#7A6A84]">{data.dataNotes.products}</p>
                                    <div className="grid items-center gap-4 sm:grid-cols-[166px_minmax(0,1fr)]">
                                        <DonutChart
                                            items={data.productRevenue}
                                            totalLabel={peso(total(data.productRevenue))}
                                            centerLabel="POS product revenue"
                                        />
                                        <RevenueLegend
                                            items={data.productRevenue}
                                            emptyMessage="No product revenue is available. POS orders must include order-item details with product prices."
                                        />
                                    </div>
                                </Card>

                                <Card title="Package Revenue Analytics">
                                    <p className="mb-3 text-xs leading-5 text-[#7A6A84]">{data.dataNotes.packages}</p>
                                    <div className="grid items-center gap-4 sm:grid-cols-[166px_minmax(0,1fr)]">
                                        <DonutChart
                                            items={data.packageRevenue}
                                            totalLabel={peso(total(data.packageRevenue))}
                                            centerLabel="Accepted package booking value"
                                        />
                                        <RevenueLegend
                                            items={data.packageRevenue}
                                            emptyMessage="No accepted package booking value is available for this reporting period."
                                        />
                                    </div>
                                </Card>
                            </div>

                            <Card title="Analytics Insights">
                                {data.insights.length > 0 ? (
                                    <div className="grid gap-2 md:grid-cols-2">
                                        {data.insights.map((insight) => (
                                            <div key={insight} className="rounded-xl border border-[#EAE2F1] bg-[#FFFEFC] px-3 py-3 text-sm leading-6 text-[#5F4A73]">
                                                {insight}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyPanel
                                        title="No generated insight is available."
                                        message="Record authorized POS sales or accepted bookings, then refresh analytics."
                                    />
                                )}
                            </Card>
                        </>
                    ) : null}
                </div>
            </main>
        </AnalyticsShell>
    );
}
