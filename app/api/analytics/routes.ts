import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ChartPoint = {
    label: string;
    value: number;
};

type RevenueItem = {
    name: string;
    value: number;
    color: string;
};

function getPeriod(value: string | null): number {
    const parsed = Number(value);
    return [30, 60, 90].includes(parsed) ? parsed : 30;
}

function createDailySalesByMonth(monthlySales: ChartPoint[]) {
    const dailyWeights = [
        0.88, 0.92, 1.05, 1.12, 0.96, 1.18, 1.26, 1.08, 0.91, 1.14,
        1.21, 1.02, 0.97, 1.29, 1.17, 1.09, 0.95, 1.24, 1.31, 1.04,
        0.98, 1.16, 1.23, 1.07, 0.94, 1.19, 1.28, 1.11, 1.01, 1.22,
    ];

    const totalWeight = dailyWeights.reduce((sum, weight) => sum + weight, 0);

    return Object.fromEntries(
        monthlySales.map((month) => {
            const values = dailyWeights.map((weight, index) => ({
                label: String(index + 1),
                value: Math.round((month.value * weight) / totalWeight),
            }));

            return [month.label, values];
        })
    ) as Record<string, ChartPoint[]>;
}

function buildAnalyticsData(periodDays: number) {
    const multiplier = periodDays / 30;

    const monthlyGrowth: ChartPoint[] = [
        { label: "Jan", value: 12 },
        { label: "Feb", value: 5 },
        { label: "Mar", value: -8 },
        { label: "Apr", value: 15 },
        { label: "May", value: 10 },
        { label: "Jun", value: 20 },
    ];

    const monthlySales: ChartPoint[] = [
        { label: "Jan", value: 320000 },
        { label: "Feb", value: 350000 },
        { label: "Mar", value: 280000 },
        { label: "Apr", value: 410000 },
        { label: "May", value: 435000 },
        { label: "Jun", value: 512300 },
    ];

    const productRevenue: RevenueItem[] = [
        { name: "Balloons & Decor", value: Math.round(222800 * multiplier), color: "#7C3AED" },
        { name: "Party Furniture", value: Math.round(158300 * multiplier), color: "#F5A623" },
        { name: "Lighting & Effects", value: Math.round(117200 * multiplier), color: "#3B9EEA" },
        { name: "Tableware & Supplies", value: Math.round(88100 * multiplier), color: "#8CCB45" },
    ];

    const packageRevenue: RevenueItem[] = [
        { name: "Wedding Package", value: Math.round(210000 * multiplier), color: "#7C3AED" },
        { name: "Birthday Package", value: Math.round(98000 * multiplier), color: "#F5A623" },
        { name: "Debut Package", value: Math.round(60000 * multiplier), color: "#3B9EEA" },
        { name: "Corporate Package", value: Math.round(38800 * multiplier), color: "#8CCB45" },
        { name: "Christening Package", value: Math.round(20000 * multiplier), color: "#EC5AA7" },
    ];

    return {
        periodDays,
        periodLabel: `Next ${periodDays} Days`,
        monthLabel: new Intl.DateTimeFormat("en-PH", {
            month: "long",
            year: "numeric",
        }).format(new Date()),
        generatedAt: new Date().toISOString(),
        salesGrowth: {
            value: 20,
            monthlyGrowth,
        },
        salesTrend: {
            latestMonthlySales: monthlySales[monthlySales.length - 1].value,
            previousMonthSales: monthlySales[monthlySales.length - 2].value,
            monthlySales,
            dailySalesByMonth: createDailySalesByMonth(monthlySales),
        },
        peakBookings: {
            peakDay: "Saturday",
            peakTime: "2:00 PM – 5:00 PM",
            weekendPercentage: 63,
            weekdayPeak: "Friday",
            weekdayPeakTime: "4:00 PM – 7:00 PM",
            dailyBookings: [
                { label: "Mon", value: 34 },
                { label: "Tue", value: 38 },
                { label: "Wed", value: 36 },
                { label: "Thu", value: 40 },
                { label: "Fri", value: 57 },
                { label: "Sat", value: 92 },
                { label: "Sun", value: 65 },
            ],
        },
        productRevenue,
        packageRevenue,
    };
}

export async function GET(request: NextRequest) {
    const periodDays = getPeriod(request.nextUrl.searchParams.get("period"));

    return NextResponse.json(buildAnalyticsData(periodDays), {
        headers: {
            "Cache-Control": "no-store, max-age=0",
        },
    });
}
