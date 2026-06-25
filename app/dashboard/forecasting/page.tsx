"use client";

import { useEffect, useState, useMemo } from "react";
import RoleSidebar from "@/components/sidebar/RoleSidebar";
import RequirePermission from "@/components/permissions/RequirePermission";
import {
    X,
} from "lucide-react";

type ForecastCategory = "inventory" | "seasonal" | "booking";

type Product = {
    id: number;
    name: string;
    currentStock?: number;
    monthlyAverage?: number;
    seasonalIndex?: number;
    forecastedDemand?: number;
    monthlySalesGrowth?: number;
    restockReco?: number;
};

type BookingData = {
    month: string;
    monthName: string;
    totalBookings: number;
    byDay?: Record<string, number>;
    byPackage?: Record<string, number>;
};

type PackageForecast = {
    name: string;
    count: number;
    percentage: number;
};

type BookingForecastState = {
    next30Days: number;
    next60Days: number;
    growthPercent: number;
    peakDay: {
        name: string;
        avgBookings: number;
    };
    topPackages: PackageForecast[];
    monthlyBookings: BookingData[];
};

type LambdaInventoryItem = {
    productId?: number;
    productName?: string;
    currentStock?: number;
    forecastedItems?: number;
    monthlyGrowth?: string | number;
    restockRecommendation?: number;
};

type LambdaBookingForecast = {
    upcomingBookings30Days?: number;
    forecastedNext30Days?: number;
    next30Days?: number;
    next60Days?: number;
    growthPercent?: number;
    peakDay?: string | { name?: string; avgBookings?: number };
};

type LambdaSeasonalItem = {
    quarter?: string;
    growth?: string | number;
    insight?: string;
    forecastedItems?: number;
    period?: string;
    bookings?: number;
};

type QuarterlyData = {
    quarter: string;
    period: string;
    growth: number;
    insight: string;
    bookings: number;
};

type ForecastState = {
    lastRun: string;
    autoRefresh: boolean;
};

function getSavedItem(key: string) {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem(key) || localStorage.getItem(key) || "";
}


export default function ForecastingPage() {
    const [activeTab, setActiveTab] = useState<ForecastCategory>("inventory");
    const [forecastState, setForecastState] = useState<ForecastState>({
        lastRun: new Date().toLocaleTimeString("en-PH", {
            hour: "2-digit",
            minute: "2-digit",
        }),
        autoRefresh: false,
    });

    // Inventory forecast state
    const [inventoryProducts, setInventoryProducts] = useState<Product[]>([]);
    const [inventoryLoading, setInventoryLoading] = useState(false);

    // Booking forecast state
    const [bookingForecast, setBookingForecast] = useState<BookingForecastState>({
        next30Days: 0,
        next60Days: 0,
        growthPercent: 0,
        peakDay: { name: "Saturday", avgBookings: 0 },
        topPackages: [],
        monthlyBookings: [],
    });
    const [bookingLoading, setBookingLoading] = useState(false);

    // Seasonal analysis state
    const [seasonalAnalysis, setSeasonalAnalysis] = useState<QuarterlyData[]>([]);
    const [seasonalLoading, setSeasonalLoading] = useState(false);

    const [showViewAll, setShowViewAll] = useState(false);
    const [loading, setLoading] = useState(false);

    // Fetch inventory forecast through app/api/forecasting/route.ts
    const fetchInventoryForecast = async () => {
        setInventoryLoading(true);
        try {
            const token = getSavedItem("token");
            const res = await fetch("/api/forecasting", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: "get_inventory_forecast",
                    days: 30,
                    limit: 3,
                }),
            });

            const data = (await res.json()) as {
                forecasts?: LambdaInventoryItem[];
                error?: string;
            };

            if (!res.ok) {
                throw new Error(data.error || "Unable to load inventory forecast.");
            }

            const products: Product[] = (data.forecasts ?? []).map((item, index) => {
                const growthValue = Number.parseFloat(String(item.monthlyGrowth ?? 0));

                return {
                    id: Number(item.productId ?? index + 1),
                    name: item.productName || "Unnamed product",
                    currentStock: Number(item.currentStock ?? 0),
                    forecastedDemand: Number(item.forecastedItems ?? 0),
                    monthlySalesGrowth: Number.isFinite(growthValue) ? growthValue : 0,
                    restockReco: Number(item.restockRecommendation ?? 0),
                };
            });

            setInventoryProducts(products);
        } catch (error) {
            console.error("Error fetching inventory forecast:", error);
            setInventoryProducts([]);
        } finally {
            setInventoryLoading(false);
        }
    };

    // Fetch booking forecast through app/api/forecasting/route.ts
    const fetchBookingForecast = async () => {
        setBookingLoading(true);
        try {
            const token = getSavedItem("token");
            const res = await fetch("/api/forecasting", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: "get_booking_forecast",
                    days: 30,
                }),
            });

            const data = (await res.json()) as {
                bookingForecast?: LambdaBookingForecast;
                forecast?: LambdaBookingForecast;
                topPackages?: PackageForecast[];
                monthlyBookings?: BookingData[];
                error?: string;
            };

            if (!res.ok) {
                throw new Error(data.error || "Unable to load booking forecast.");
            }

            const forecast = data.bookingForecast ?? data.forecast ?? {};
            const actualBookings = Number(forecast.upcomingBookings30Days ?? 0);
            const next30Days = Number(
                forecast.forecastedNext30Days ?? forecast.next30Days ?? actualBookings
            );
            const calculatedGrowth =
                actualBookings > 0
                    ? Math.round(((next30Days - actualBookings) / actualBookings) * 100)
                    : 0;
            const peakDay = forecast.peakDay;

            setBookingForecast({
                next30Days,
                next60Days: Number(forecast.next60Days ?? next30Days * 2),
                growthPercent: Number(forecast.growthPercent ?? calculatedGrowth),
                peakDay:
                    typeof peakDay === "string"
                        ? { name: peakDay, avgBookings: 0 }
                        : {
                            name: peakDay?.name || "Saturday",
                            avgBookings: Number(peakDay?.avgBookings ?? 0),
                        },
                topPackages: Array.isArray(data.topPackages) ? data.topPackages : [],
                monthlyBookings: Array.isArray(data.monthlyBookings)
                    ? data.monthlyBookings
                    : [],
            });
        } catch (error) {
            console.error("Error fetching booking forecast:", error);
            setBookingForecast({
                next30Days: 0,
                next60Days: 0,
                growthPercent: 0,
                peakDay: { name: "Saturday", avgBookings: 0 },
                topPackages: [],
                monthlyBookings: [],
            });
        } finally {
            setBookingLoading(false);
        }
    };

    // Fetch seasonal analysis through app/api/forecasting/route.ts.
    // The route translates this public action into Lambda's get_seasonal_forecast action.
    const fetchSeasonalAnalysis = async () => {
        setSeasonalLoading(true);
        try {
            const token = getSavedItem("token");
            const res = await fetch("/api/forecasting", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: "get_seasonal_analysis",
                }),
            });

            const data = (await res.json()) as {
                seasonalForecast?: LambdaSeasonalItem[];
                quarterlyAnalysis?: QuarterlyData[];
                error?: string;
            };

            if (!res.ok) {
                throw new Error(data.error || "Unable to load seasonal analysis.");
            }

            const source = data.seasonalForecast ?? data.quarterlyAnalysis ?? [];
            const analysis: QuarterlyData[] = source.map((item, index) => {
                const growthValue = Number.parseFloat(String(item.growth ?? 0));

                return {
                    quarter: item.quarter || `Q${index + 1}`,
                    period: item.period || `Quarter ${index + 1}`,
                    growth: Number.isFinite(growthValue) ? growthValue : 0,
                    insight: item.insight || "No insight available",
                    bookings:
                        "bookings" in item
                            ? Number(item.bookings ?? 0)
                            : "forecastedItems" in item
                                ? Number(item.forecastedItems ?? 0)
                                : 0,
                };
            });

            setSeasonalAnalysis(analysis);
        } catch (error) {
            console.error("Error fetching seasonal analysis:", error);
            setSeasonalAnalysis([]);
        } finally {
            setSeasonalLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchInventoryForecast();
        fetchBookingForecast();
        fetchSeasonalAnalysis();
    }, []);

    const handleRunAnalysis = async () => {
        setLoading(true);
        await Promise.all([
            fetchInventoryForecast(),
            fetchBookingForecast(),
            fetchSeasonalAnalysis(),
        ]);

        const now = new Date();
        const timeStr = now.toLocaleTimeString("en-PH", {
            hour: "2-digit",
            minute: "2-digit",
        });
        const dateStr = now.toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
        });

        setForecastState({
            lastRun: `${dateStr}, ${timeStr}`,
            autoRefresh: false,
        });

        setLoading(false);
    };

    const topThreeProducts = useMemo(() => {
        return inventoryProducts.slice(0, 3);
    }, [inventoryProducts]);

    // Generate seasonal chart data from the seasonal response.
    const seasonalChartData = useMemo(() => {
        return seasonalAnalysis.map((quarter) => ({
            month: quarter.quarter,
            seasonal: Math.max(0, Math.min(100, quarter.growth + 100)),
        }));
    }, [seasonalAnalysis]);

    // Daily breakdown data
    const dailyBreakdownData = useMemo(() => {
        const days = [
            { day: "M", index: 1 },
            { day: "T", index: 2 },
            { day: "W", index: 3 },
            { day: "T", index: 4 },
            { day: "F", index: 5 },
            { day: "Sa", index: 6 },
            { day: "Su", index: 0 },
        ];

        const dayTotals: Record<number, number> = {};
        const dayNames: Record<number, string> = {
            0: "Sunday",
            1: "Monday",
            2: "Tuesday",
            3: "Wednesday",
            4: "Thursday",
            5: "Friday",
            6: "Saturday",
        };

        // Aggregate bookings by day
        for (const booking of bookingForecast.monthlyBookings) {
            for (const [dayName, count] of Object.entries(
                booking.byDay ?? {}
            ) as [string, number][]) {
                const dayIndex = Object.entries(dayNames).find(
                    ([, name]) => name === dayName
                )?.[0];
                if (dayIndex !== undefined) {
                    dayTotals[parseInt(dayIndex)] =
                        (dayTotals[parseInt(dayIndex)] || 0) + count;
                }
            }
        }

        const maxCount = Math.max(...Object.values(dayTotals), 1);

        return days.map((d) => ({
            ...d,
            count: dayTotals[d.index] || 0,
            heightPercent:
                maxCount > 0
                    ? Math.round((dayTotals[d.index] || 0) / maxCount * 100)
                    : 0,
            isWeekend: d.index === 0 || d.index === 6,
        }));
    }, [bookingForecast.monthlyBookings]);

    const next60Growth =
        bookingForecast.next30Days > 0
            ? Math.round(
                ((bookingForecast.next60Days - bookingForecast.next30Days) /
                    bookingForecast.next30Days) *
                100
            )
            : 0;

    return (
        <RequirePermission>
            <div
                style={{
                    backgroundColor: "#FDFAF4",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                }}
                className="flex min-h-screen overflow-x-hidden text-[#1A1220]"
            >
                <RoleSidebar />

                <div className="min-w-0 flex-1 overflow-x-hidden">
                    <div className="min-h-screen bg-[#FDFAF4]">
                        {/* Header */}
                        <div className="border-b border-[#EBE4F0] bg-white px-6 py-4">
                            <div className="w-full">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h1 className="text-2xl font-semibold text-[#1A1220]">
                                            Demand Forecast
                                        </h1>
                                        <p className="mt-1 text-sm text-[#7A6E88]">
                                            Live • Last run:{" "}
                                            <span className="font-medium">
                                    {forecastState.lastRun}
                                </span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-2 rounded-lg border border-[#EBE4F0] bg-white px-3 py-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={forecastState.autoRefresh}
                                                onChange={(e) =>
                                                    setForecastState((prev) => ({
                                                        ...prev,
                                                        autoRefresh: e.target.checked,
                                                    }))
                                                }
                                                className="rounded"
                                            />
                                            <span className="text-[#7A6E88]">
                                    Auto-refresh
                                </span>
                                        </label>

                                        <select className="rounded-lg border border-[#EBE4F0] bg-white px-3 py-2 text-sm text-[#7A6E88]">
                                            <option>Last 30 days</option>
                                            <option>Last 60 days</option>
                                            <option>Last 90 days</option>
                                        </select>

                                        <button
                                            onClick={handleRunAnalysis}
                                            disabled={loading}
                                            className="rounded-lg bg-[#2D1B4E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4a2970] disabled:opacity-60"
                                        >
                                            {loading ? "Running..." : "Run Analysis"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="w-full px-6 py-6">
                            {/* Category Tabs */}
                            <div className="mb-6 flex gap-2">
                                <button
                                    onClick={() => setActiveTab("inventory")}
                                    className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                                        activeTab === "inventory"
                                            ? "bg-[#2D1B4E] text-white"
                                            : "border border-[#EBE4F0] bg-white text-[#7A6E88] hover:bg-[#F5F3F8]"
                                    }`}
                                >
                                    Inventory Forecast
                                </button>
                                <button
                                    onClick={() => setActiveTab("seasonal")}
                                    className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                                        activeTab === "seasonal"
                                            ? "bg-[#2D1B4E] text-white"
                                            : "border border-[#EBE4F0] bg-white text-[#7A6E88] hover:bg-[#F5F3F8]"
                                    }`}
                                >
                                    Seasonal Forecast
                                </button>
                                <button
                                    onClick={() => setActiveTab("booking")}
                                    className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                                        activeTab === "booking"
                                            ? "bg-[#2D1B4E] text-white"
                                            : "border border-[#EBE4F0] bg-white text-[#7A6E88] hover:bg-[#F5F3F8]"
                                    }`}
                                >
                                    Booking Forecast
                                </button>
                            </div>

                            {/* Insight Box */}
                            <div className="mb-6 rounded-xl border border-[#E9D5FF] bg-[#F3E8FF] p-4">
                                <div className="flex gap-3">
                                    <div className="h-10 w-10 shrink-0 rounded-full bg-[#7C3AED]" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-[#6B21A8]">
                                            {activeTab === "inventory" &&
                                                "Based on current inventory and historical trends, the top 3 items show strong forecasted demand. Restock recommendations are provided to avoid stockouts."}
                                            {activeTab === "seasonal" &&
                                                `${
                                                    seasonalAnalysis[2]?.quarter || "Q3"
                                                } is your peak season with ${
                                                    seasonalAnalysis[2]?.growth || 34
                                                }% growth — driven by ${
                                                    seasonalAnalysis[2]?.insight || "events"
                                                }.`}
                                            {activeTab === "booking" &&
                                                `${
                                                    bookingForecast.next30Days || 0
                                                } bookings expected in the next 30 days — a ${
                                                    bookingForecast.growthPercent >= 0
                                                        ? "+"
                                                        : ""
                                                }${
                                                    bookingForecast.growthPercent || 0
                                                }% change vs last period.`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Inventory Forecast Tab */}
                            {activeTab === "inventory" && (
                                <div className="space-y-6">
                                    {/* Top 3 High Demand Items */}
                                    <div>
                                        <div className="mb-4 flex items-center justify-between">
                                            <h2 className="text-lg font-semibold text-[#1A1220]">
                                                Top 3 High Demand Items
                                            </h2>
                                            <button
                                                onClick={() => setShowViewAll(true)}
                                                className="text-sm font-semibold text-[#2D1B4E] hover:underline"
                                            >
                                                View all products →
                                            </button>
                                        </div>

                                        {inventoryLoading ? (
                                            <div className="flex items-center justify-center py-8">
                                                <p className="text-[#7A6E88]">
                                                    Loading inventory forecast...
                                                </p>
                                            </div>
                                        ) : topThreeProducts.length === 0 ? (
                                            <div className="rounded-xl border border-[#EBE4F0] bg-white p-8 text-center">
                                                <p className="text-[#7A6E88]">
                                                    No inventory data available yet.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid gap-4 md:grid-cols-3">
                                                {topThreeProducts.map((product) => (
                                                    <div
                                                        key={product.id}
                                                        className="rounded-xl border border-[#EBE4F0] bg-white p-4"
                                                    >
                                                        <h3 className="font-semibold text-[#1A1220]">
                                                            {product.name}
                                                        </h3>

                                                        <div className="mt-4 space-y-3 text-sm">
                                                            <div>
                                                                <p className="text-xs font-semibold uppercase tracking-wider text-[#7A6E88]">
                                                                    Forecasted Total Items
                                                                </p>
                                                                <p className="mt-1 text-xl font-bold text-[#2D1B4E]">
                                                                    {product.forecastedDemand}
                                                                    {" items"}
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <p className="text-xs font-semibold uppercase tracking-wider text-[#7A6E88]">
                                                                    Current Stocks
                                                                </p>
                                                                <p className="mt-1 font-semibold text-[#1A1220]">
                                                                    {product.currentStock}{" "}
                                                                    units
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <p className="text-xs font-semibold uppercase tracking-wider text-[#7A6E88]">
                                                                    Monthly Sales Growth
                                                                </p>
                                                                <p
                                                                    className={`mt-1 font-semibold ${
                                                                        (product.monthlySalesGrowth ||
                                                                            0) >= 0
                                                                            ? "text-[#059669]"
                                                                            : "text-[#DC2626]"
                                                                    }`}
                                                                >
                                                                    {(
                                                                        product.monthlySalesGrowth ||
                                                                        0
                                                                    ) >= 0
                                                                        ? "+"
                                                                        : ""}
                                                                    {product.monthlySalesGrowth}%
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <p className="text-xs font-semibold uppercase tracking-wider text-[#7A6E88]">
                                                                    Restock Recommendation
                                                                </p>
                                                                <p className="mt-1 font-semibold text-[#C9951A]">
                                                                    +{product.restockReco}{" "}
                                                                    units now
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Seasonal Forecast Tab */}
                            {activeTab === "seasonal" && (
                                <div className="space-y-6">
                                    <div>
                                        <h2 className="mb-4 text-lg font-semibold text-[#1A1220]">
                                            Quarterly Demand Analysis
                                        </h2>

                                        {seasonalLoading ? (
                                            <div className="flex items-center justify-center py-8">
                                                <p className="text-[#7A6E88]">
                                                    Loading seasonal analysis...
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto rounded-xl border border-[#EBE4F0] bg-white">
                                                <table className="w-full">
                                                    <thead>
                                                    <tr className="border-b border-[#EBE4F0] bg-[#F9F5FF]">
                                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#7A6E88]">
                                                            Quarter
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#7A6E88]">
                                                            Period
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#7A6E88]">
                                                            Growth
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#7A6E88]">
                                                            Insight
                                                        </th>
                                                    </tr>
                                                    </thead>
                                                    <tbody>
                                                    {seasonalAnalysis.map(
                                                        (quarter, index) => (
                                                            <tr
                                                                key={quarter.quarter}
                                                                className={`border-b border-[#EBE4F0] ${
                                                                    index ===
                                                                    seasonalAnalysis.length -
                                                                    1
                                                                        ? "border-b-0"
                                                                        : ""
                                                                }`}
                                                            >
                                                                <td className="px-6 py-4">
                                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#E9E1F3] font-semibold text-[#2D1B4E]">
                                                                {quarter.quarter}
                                                            </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-sm font-medium text-[#1A1220]">
                                                                    {quarter.period}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm font-bold text-[#059669]">
                                                                    +{quarter.growth}%
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-[#7A6E88]">
                                                                    {quarter.insight}
                                                                </td>
                                                            </tr>
                                                        )
                                                    )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    {/* Seasonal Growth Chart */}
                                    <div>
                                        <h2 className="mb-4 text-lg font-semibold text-[#1A1220]">
                                            Seasonal Growth Chart
                                        </h2>

                                        <div className="rounded-xl border border-[#EBE4F0] bg-white p-6">
                                            {seasonalChartData.length === 0 ? (
                                                <div className="flex items-center justify-center py-12">
                                                    <p className="text-[#7A6E88]">
                                                        No seasonal data available.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex h-48 items-end gap-2">
                                                    {seasonalChartData.map(
                                                        (forecast, index) => {
                                                            const colors = [
                                                                "#E9D5FF",
                                                                "#FED7AA",
                                                                "#FBBF24",
                                                                "#86EFAC",
                                                            ];
                                                            const color =
                                                                colors[index % colors.length];

                                                            return (
                                                                <div
                                                                    key={forecast.month}
                                                                    className="flex-1"
                                                                >
                                                                    <div
                                                                        className="mx-auto w-12 rounded-t-lg transition hover:opacity-80"
                                                                        style={{
                                                                            height: `${forecast.seasonal}%`,
                                                                            backgroundColor:
                                                                            color,
                                                                        }}
                                                                    />
                                                                    <p className="mt-2 text-center text-xs font-semibold text-[#7A6E88]">
                                                                        {forecast.month}
                                                                    </p>
                                                                </div>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Booking Forecast Tab */}
                            {activeTab === "booking" && (
                                <div className="space-y-6">
                                    {/* KPI Cards */}
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className="rounded-xl border border-[#EBE4F0] bg-[#2D1B4E] p-6 text-white">
                                            <p className="text-sm font-semibold text-white/75">
                                                FORECASTED BOOKINGS
                                            </p>
                                            <p className="mt-2 text-3xl font-bold">
                                                {bookingLoading ? "—" : bookingForecast.next30Days}
                                            </p>
                                            <p className="mt-1 text-xs text-white/75">
                                                Next 30 days •{" "}
                                                {bookingForecast.growthPercent >= 0
                                                    ? "↑"
                                                    : "↓"}
                                                {Math.abs(bookingForecast.growthPercent)}%
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-[#EBE4F0] bg-white p-6">
                                            <p className="text-sm font-semibold text-[#7A6E88]">
                                                NEXT 60 DAYS
                                            </p>
                                            <p className="mt-2 text-3xl font-bold text-[#1A1220]">
                                                {bookingLoading ? "—" : bookingForecast.next60Days}
                                            </p>
                                            <p className="mt-1 text-xs text-[#059669]">
                                                ↑
                                                {next60Growth}
                                                % projected
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-[#EBE4F0] bg-white p-6">
                                            <p className="text-sm font-semibold text-[#7A6E88]">
                                                PEAK DAY
                                            </p>
                                            <p className="mt-2 text-3xl font-bold text-[#1A1220]">
                                                {bookingLoading
                                                    ? "—"
                                                    : bookingForecast.peakDay.name}
                                            </p>
                                            <p className="mt-1 text-xs text-[#7A6E88]">
                                                Avg{" "}
                                                {bookingForecast.peakDay.avgBookings || 0}{" "}
                                                bookings/day
                                            </p>
                                        </div>
                                    </div>

                                    {/* Booking Charts */}
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div>
                                            <h3 className="mb-4 font-semibold text-[#1A1220]">
                                                Booking Forecast by Package — Next 30 Days
                                            </h3>
                                            <div className="space-y-3 rounded-xl border border-[#EBE4F0] bg-white p-4">
                                                {bookingLoading ? (
                                                    <p className="text-center text-[#7A6E88]">
                                                        Loading...
                                                    </p>
                                                ) : bookingForecast.topPackages.length ===
                                                0 ? (
                                                    <p className="text-center text-[#7A6E88]">
                                                        No package data available.
                                                    </p>
                                                ) : (
                                                    bookingForecast.topPackages.map(
                                                        (pkg) => (
                                                            <div key={pkg.name}>
                                                                <div className="flex items-center justify-between text-sm">
                                                        <span className="font-medium text-[#1A1220]">
                                                            {pkg.name}
                                                        </span>
                                                                    <span className="text-[#7A6E88]">
                                                            Est.{" "}
                                                                        {pkg.count}{" "}
                                                                        bookings
                                                        </span>
                                                                </div>
                                                                <div className="mt-1 h-2 w-full rounded-full bg-[#EBE4F0]">
                                                                    <div
                                                                        className="h-2 rounded-full bg-[#2D1B4E]"
                                                                        style={{
                                                                            width: `${pkg.percentage}%`,
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )
                                                    )
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="mb-4 font-semibold text-[#1A1220]">
                                                Booking Forecast by Day
                                            </h3>
                                            <div className="rounded-xl border border-[#EBE4F0] bg-white p-4">
                                                {bookingLoading ? (
                                                    <div className="flex items-center justify-center py-8">
                                                        <p className="text-[#7A6E88]">
                                                            Loading...
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex h-32 items-end justify-between gap-1">
                                                            {dailyBreakdownData.map(
                                                                (day) => (
                                                                    <div
                                                                        key={day.day}
                                                                        className="flex flex-1 flex-col items-center"
                                                                    >
                                                                        <div
                                                                            className={`w-full rounded-t transition ${
                                                                                day.isWeekend
                                                                                    ? "bg-[#C9951A]"
                                                                                    : "bg-[#E9D5FF]"
                                                                            }`}
                                                                            style={{
                                                                                height: `${day.heightPercent}%`,
                                                                            }}
                                                                        />
                                                                        <p className="mt-2 text-xs font-semibold text-[#7A6E88]">
                                                                            {day.day}
                                                                        </p>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                        <div className="mt-4 flex justify-between text-xs text-[#7A6E88]">
                                                <span>
                                                    Weekend = Peak days
                                                </span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* View All Products Modal */}
                        {showViewAll && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
                                <div className="relative max-h-96 w-full max-w-2xl overflow-auto rounded-2xl border border-[#EBE4F0] bg-white p-6 shadow-xl">
                                    <button
                                        onClick={() => setShowViewAll(false)}
                                        className="absolute right-4 top-4 rounded-lg border border-[#EBE4F0] bg-white p-2 text-[#7A6E88] hover:bg-[#F9F5FF]"
                                    >
                                        <X size={18} />
                                    </button>

                                    <h2 className="mb-4 text-lg font-semibold text-[#1A1220]">
                                        All Products
                                    </h2>

                                    <div className="space-y-3">
                                        {inventoryProducts.map((product) => (
                                            <div
                                                key={product.id}
                                                className="flex items-center justify-between border-b border-[#EBE4F0] pb-3 last:border-b-0"
                                            >
                                                <div>
                                                    <p className="font-medium text-[#1A1220]">
                                                        {product.name}
                                                    </p>
                                                    <p className="text-sm text-[#7A6E88]">
                                                        Stock: {product.currentStock} units
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold text-[#2D1B4E]">
                                                        {product.forecastedDemand} items
                                                    </p>
                                                    <p className="text-xs text-[#C9951A]">
                                                        +{product.restockReco} restock
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </RequirePermission>
    );
}
