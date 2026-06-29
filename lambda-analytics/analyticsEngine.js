function toNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function toDateOnly(value) {
    const raw = String(value || "").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function parseDateOnly(value) {
    const dateOnly = toDateOnly(value);

    if (!dateOnly) {
        return null;
    }

    const date = new Date(`${dateOnly}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) ? date : null;
}

function toISODate(date) {
    return date.toISOString().slice(0, 10);
}

function addDaysUTC(date, days) {
    const result = new Date(date.getTime());
    result.setUTCDate(result.getUTCDate() + days);
    return result;
}

function startOfDayUTC(date) {
    return new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    );
}

function clampInteger(value, minimum, maximum, fallback) {
    const number = Number(value);

    if (!Number.isInteger(number)) {
        return fallback;
    }

    return Math.min(maximum, Math.max(minimum, number));
}

function normalizeStatus(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function formatDateLabel(dateOnly) {
    const date = parseDateOnly(dateOnly);

    if (!date) {
        return String(dateOnly || "");
    }

    return new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
}

function formatMonthLabel(monthKey) {
    const date = new Date(`${monthKey}-01T00:00:00.000Z`);

    if (!Number.isFinite(date.getTime())) {
        return monthKey;
    }

    return new Intl.DateTimeFormat("en-PH", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
}

function formatRangeLabel(startDate, endDate) {
    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);

    if (!start || !end) {
        return "Selected reporting period";
    }

    const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
    const startText = new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: sameYear ? undefined : "numeric",
        timeZone: "UTC",
    }).format(start);
    const endText = new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    }).format(end);

    return `${startText} – ${endText}`;
}

function percentChange(currentValue, previousValue) {
    const current = toNumber(currentValue);
    const previous = toNumber(previousValue);

    if (previous <= 0) {
        return current > 0 ? 100 : 0;
    }

    return Number((((current - previous) / previous) * 100).toFixed(1));
}

function monthKeyFromDate(dateOnly) {
    const raw = String(dateOnly || "").slice(0, 7);
    return /^\d{4}-\d{2}$/.test(raw) ? raw : "";
}

function weekdayKey(dateOnly) {
    const date = parseDateOnly(dateOnly);

    if (!date) {
        return "";
    }

    return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        timeZone: "UTC",
    }).format(date);
}

function isWeekend(day) {
    return day === "Sat" || day === "Sun";
}

function shortWeekdayToLong(day) {
    const labels = {
        Mon: "Monday",
        Tue: "Tuesday",
        Wed: "Wednesday",
        Thu: "Thursday",
        Fri: "Friday",
        Sat: "Saturday",
        Sun: "Sunday",
    };

    return labels[day] || "No booking data";
}

function safePackageName(row) {
    const name = String(
        row.package_name ||
        row.packageName ||
        row.custom_order ||
        row.customOrder ||
        ""
    ).trim();

    return name || "Custom / unnamed booking";
}

function bookingValue(row) {
    const agreedPrice = toNumber(row.agreed_price ?? row.agreedPrice);
    const packagePrice = toNumber(row.package_price ?? row.packagePrice);
    const amountPaid = toNumber(row.amount_paid ?? row.amountPaid);

    return agreedPrice > 0
        ? agreedPrice
        : packagePrice > 0
            ? packagePrice
            : amountPaid;
}

function normalizeRevenueItems(rows) {
    return rows
        .map((row) => ({
            name: String(row.name || row.category || "Uncategorized").trim() || "Uncategorized",
            value: Math.max(0, Math.round(toNumber(row.value ?? row.revenue))),
        }))
        .filter((row) => row.value > 0)
        .sort((first, second) => second.value - first.value);
}

function createMonthKeys(startDate, endDate) {
    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);

    if (!start || !end) {
        return [];
    }

    const keys = [];
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const finalMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

    while (cursor <= finalMonth) {
        keys.push(toISODate(cursor).slice(0, 7));
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    return keys;
}

function createDateKeys(startDate, endDate) {
    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);

    if (!start || !end) {
        return [];
    }

    const keys = [];
    let cursor = new Date(start.getTime());

    while (cursor <= end) {
        keys.push(toISODate(cursor));
        cursor = addDaysUTC(cursor, 1);
    }

    return keys;
}

function buildRange(input = {}, now = new Date()) {
    const today = startOfDayUTC(now);

    const customStart = toDateOnly(input.startDate ?? input.start_date);
    const customEnd = toDateOnly(input.endDate ?? input.end_date);

    if (customStart || customEnd) {
        if (!customStart || !customEnd) {
            throw new Error("Both start_date and end_date are required for a custom analytics period.");
        }

        const start = parseDateOnly(customStart);
        const end = parseDateOnly(customEnd);

        if (!start || !end || start > end) {
            throw new Error("The custom analytics date range is invalid.");
        }

        const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;

        if (days > 366) {
            throw new Error("The custom analytics period cannot exceed 366 days.");
        }

        const previousEnd = addDaysUTC(start, -1);
        const previousStart = addDaysUTC(previousEnd, -(days - 1));

        return {
            kind: "custom",
            days,
            startDate: customStart,
            endDate: customEnd,
            previousStartDate: toISODate(previousStart),
            previousEndDate: toISODate(previousEnd),
            label: formatRangeLabel(customStart, customEnd),
        };
    }

    const days = clampInteger(input.period ?? input.periodDays, 30, 90, 30);
    const endDate = toISODate(today);
    const startDate = toISODate(addDaysUTC(today, -(days - 1)));
    const previousEnd = addDaysUTC(today, -days);
    const previousStart = addDaysUTC(previousEnd, -(days - 1));

    return {
        kind: "preset",
        days,
        startDate,
        endDate,
        previousStartDate: toISODate(previousStart),
        previousEndDate: toISODate(previousEnd),
        label: `Last ${days} days`,
    };
}

function buildSalesData({
                            salesRows = [],
                            range,
                        }) {
    const selectedDateSet = new Set(createDateKeys(range.startDate, range.endDate));
    const allRows = Array.isArray(salesRows) ? salesRows : [];

    const currentRows = allRows.filter((row) => {
        const date = toDateOnly(row.orderDate ?? row.order_date ?? row.date);
        return Boolean(date && selectedDateSet.has(date));
    });

    const currentSales = currentRows.reduce(
        (sum, row) => sum + toNumber(row.total ?? row.value ?? row.amount),
        0
    );

    const previousRows = allRows.filter((row) => {
        const date = toDateOnly(row.orderDate ?? row.order_date ?? row.date);
        return Boolean(
            date &&
            date >= range.previousStartDate &&
            date <= range.previousEndDate
        );
    });

    const previousSales = previousRows.reduce(
        (sum, row) => sum + toNumber(row.total ?? row.value ?? row.amount),
        0
    );

    const dailyMap = new Map();
    const monthMap = new Map();

    for (const date of createDateKeys(range.startDate, range.endDate)) {
        dailyMap.set(date, 0);
    }

    for (const monthKey of createMonthKeys(range.startDate, range.endDate)) {
        monthMap.set(monthKey, 0);
    }

    for (const row of currentRows) {
        const date = toDateOnly(row.orderDate ?? row.order_date ?? row.date);
        const total = toNumber(row.total ?? row.value ?? row.amount);

        if (!date) {
            continue;
        }

        dailyMap.set(date, (dailyMap.get(date) || 0) + total);

        const monthKey = monthKeyFromDate(date);
        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + total);
    }

    const monthKeys = Array.from(monthMap.keys());
    const monthlySales = monthKeys.map((monthKey) => ({
        label: formatMonthLabel(monthKey),
        key: monthKey,
        value: Math.round(monthMap.get(monthKey) || 0),
    }));

    const dailySalesByMonth = {};

    for (const monthKey of monthKeys) {
        dailySalesByMonth[formatMonthLabel(monthKey)] = createDateKeys(
            `${monthKey}-01`,
            (() => {
                const finalRangeDate = parseDateOnly(range.endDate);
                const startRangeDate = parseDateOnly(range.startDate);
                const monthStart = parseDateOnly(`${monthKey}-01`);
                const monthEnd = new Date(
                    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)
                );

                const start = startRangeDate > monthStart ? startRangeDate : monthStart;
                const end = finalRangeDate < monthEnd ? finalRangeDate : monthEnd;

                return toISODate(end);
            })()
        )
            .filter((date) => date >= range.startDate && date <= range.endDate)
            .map((date) => ({
                label: String(Number(date.slice(-2))),
                value: Math.round(dailyMap.get(date) || 0),
            }));
    }

    const allMonthMap = new Map();

    for (const row of allRows) {
        const date = toDateOnly(row.orderDate ?? row.order_date ?? row.date);

        if (!date) {
            continue;
        }

        const monthKey = monthKeyFromDate(date);
        allMonthMap.set(
            monthKey,
            (allMonthMap.get(monthKey) || 0) +
            toNumber(row.total ?? row.value ?? row.amount)
        );
    }

    const growthMonths = Array.from(allMonthMap.keys())
        .sort()
        .slice(-8)
        .map((monthKey, index, keys) => {
            const value = allMonthMap.get(monthKey) || 0;
            const previousValue =
                index > 0 ? allMonthMap.get(keys[index - 1]) || 0 : 0;

            return {
                label: formatMonthLabel(monthKey).split(" ")[0],
                value: index === 0 ? 0 : Math.round(percentChange(value, previousValue)),
            };
        });

    const latestMonthlySales =
        monthlySales.length > 0
            ? monthlySales[monthlySales.length - 1].value
            : 0;

    const previousMonthSales =
        monthlySales.length > 1
            ? monthlySales[monthlySales.length - 2].value
            : 0;

    return {
        currentSales: Math.round(currentSales),
        previousSales: Math.round(previousSales),
        salesGrowthPercent: percentChange(currentSales, previousSales),
        monthlyGrowth: growthMonths,
        monthlySales,
        dailySalesByMonth,
        latestMonthlySales,
        previousMonthSales,
        salesOrderCount: currentRows.length,
    };
}

function buildBookingData(bookings = []) {
    const acceptedStatuses = new Set(["confirmed", "preparing", "completed"]);
    const acceptedBookings = (Array.isArray(bookings) ? bookings : []).filter((booking) =>
        acceptedStatuses.has(normalizeStatus(booking.status))
    );

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const countByDay = new Map(days.map((day) => [day, 0]));
    const countByTime = new Map();
    const weekdayCounts = new Map();

    let confirmed = 0;
    let preparing = 0;
    let completed = 0;
    let weekendCount = 0;

    for (const booking of acceptedBookings) {
        const status = normalizeStatus(booking.status);

        if (status === "confirmed") confirmed += 1;
        if (status === "preparing") preparing += 1;
        if (status === "completed") completed += 1;

        const date = toDateOnly(booking.eventDate ?? booking.event_date ?? booking.date);
        const day = weekdayKey(date);

        if (day && countByDay.has(day)) {
            countByDay.set(day, (countByDay.get(day) || 0) + 1);

            if (isWeekend(day)) {
                weekendCount += 1;
            } else {
                weekdayCounts.set(day, (weekdayCounts.get(day) || 0) + 1);
            }
        }

        const time = String(booking.eventTime ?? booking.event_time ?? "").trim();

        if (time) {
            countByTime.set(time, (countByTime.get(time) || 0) + 1);
        }
    }

    const dailyBookings = days.map((day) => ({
        label: day,
        value: countByDay.get(day) || 0,
    }));

    const sortedDays = [...dailyBookings].sort(
        (first, second) => second.value - first.value || first.label.localeCompare(second.label)
    );
    const peakDay = sortedDays[0]?.value
        ? shortWeekdayToLong(sortedDays[0].label)
        : "No booking data";

    const sortedTimes = Array.from(countByTime.entries())
        .map(([time, value]) => ({ time, value }))
        .sort((first, second) => second.value - first.value || first.time.localeCompare(second.time));
    const peakTime = sortedTimes[0]?.value ? sortedTimes[0].time : "No booking data";

    const sortedWeekdays = Array.from(weekdayCounts.entries())
        .map(([day, value]) => ({ day, value }))
        .sort((first, second) => second.value - first.value || first.day.localeCompare(second.day));
    const weekdayPeak = sortedWeekdays[0]?.value
        ? shortWeekdayToLong(sortedWeekdays[0].day)
        : "No weekday booking data";

    const packageMap = new Map();

    for (const booking of acceptedBookings) {
        const packageName = safePackageName(booking);
        packageMap.set(packageName, (packageMap.get(packageName) || 0) + 1);
    }

    const topPackages = Array.from(packageMap.entries())
        .map(([name, bookings]) => ({ name, value: bookings }))
        .sort((first, second) => second.value - first.value || first.name.localeCompare(second.name))
        .slice(0, 8);

    return {
        totalBookings: acceptedBookings.length,
        confirmed,
        preparing,
        completed,
        weekendPercentage:
            acceptedBookings.length > 0
                ? Math.round((weekendCount / acceptedBookings.length) * 100)
                : 0,
        peakDay,
        peakTime,
        weekdayPeak,
        weekdayPeakTime:
            weekdayPeak === "No weekday booking data"
                ? "No weekday booking data"
                : `${weekdayPeak} has the highest accepted booking count.`,
        dailyBookings,
        topPackages,
        acceptedBookings,
    };
}

function buildPackageRevenue(bookings = []) {
    const acceptedStatuses = new Set(["confirmed", "preparing", "completed"]);
    const packageMap = new Map();

    for (const booking of Array.isArray(bookings) ? bookings : []) {
        if (!acceptedStatuses.has(normalizeStatus(booking.status))) {
            continue;
        }

        const packageName = safePackageName(booking);
        const value = bookingValue(booking);

        if (value <= 0) {
            continue;
        }

        packageMap.set(packageName, (packageMap.get(packageName) || 0) + value);
    }

    return Array.from(packageMap.entries())
        .map(([name, value]) => ({
            name,
            value: Math.round(value),
        }))
        .sort((first, second) => second.value - first.value || first.name.localeCompare(second.name));
}

function buildInsights({ sales, bookings, productRevenue, packageRevenue, period }) {
    const insight = [];

    if (sales.currentSales > 0) {
        const direction =
            sales.salesGrowthPercent > 0
                ? "increased"
                : sales.salesGrowthPercent < 0
                    ? "decreased"
                    : "remained stable";

        insight.push(
            sales.salesGrowthPercent === 0
                ? `POS sales remained stable compared with the previous ${period.days}-day period.`
                : `POS sales ${direction} by ${Math.abs(sales.salesGrowthPercent)}% compared with the previous ${period.days}-day period.`
        );
    }

    if (bookings.totalBookings > 0) {
        insight.push(
            `${bookings.peakDay} has the highest number of accepted bookings in the selected reporting period.`
        );
    }

    if (productRevenue.length > 0) {
        insight.push(
            `${productRevenue[0].name} generated the highest POS product-category revenue in the selected reporting period.`
        );
    }

    if (packageRevenue.length > 0) {
        insight.push(
            `${packageRevenue[0].name} has the highest accepted package booking value in the selected reporting period.`
        );
    }

    return insight;
}

function buildAnalyticsPayload({
                                   range,
                                   scope,
                                   salesRows = [],
                                   productRevenueRows = [],
                                   bookingRows = [],
                               }) {
    const sales = buildSalesData({
        salesRows,
        range,
    });
    const bookings = buildBookingData(bookingRows);
    const productRevenue = normalizeRevenueItems(productRevenueRows);
    const packageRevenue = buildPackageRevenue(bookingRows);

    const hasData =
        sales.salesOrderCount > 0 ||
        bookings.totalBookings > 0 ||
        productRevenue.length > 0 ||
        packageRevenue.length > 0;

    return {
        success: true,
        generatedAt: new Date().toISOString(),
        scope,
        period: range,
        hasData,
        salesGrowth: {
            value: sales.salesGrowthPercent,
            currentSales: sales.currentSales,
            previousSales: sales.previousSales,
            comparisonLabel: `Compared with the previous ${range.days}-day period`,
            monthlyGrowth: sales.monthlyGrowth,
        },
        salesTrend: {
            latestMonthlySales: sales.latestMonthlySales,
            previousMonthSales: sales.previousMonthSales,
            monthlySales: sales.monthlySales,
            dailySalesByMonth: sales.dailySalesByMonth,
            salesOrderCount: sales.salesOrderCount,
        },
        peakBookings: {
            totalBookings: bookings.totalBookings,
            confirmed: bookings.confirmed,
            preparing: bookings.preparing,
            completed: bookings.completed,
            peakDay: bookings.peakDay,
            peakTime: bookings.peakTime,
            weekendPercentage: bookings.weekendPercentage,
            weekdayPeak: bookings.weekdayPeak,
            weekdayPeakTime: bookings.weekdayPeakTime,
            dailyBookings: bookings.dailyBookings,
            topPackages: bookings.topPackages,
        },
        productRevenue,
        packageRevenue,
        insights: buildInsights({
            sales,
            bookings,
            productRevenue,
            packageRevenue,
            period: range,
        }),
        dataNotes: {
            sales: "POS sales use recorded orders within the selected reporting period.",
            bookings: "Booking analytics use accepted bookings with Confirmed, Preparing, or Completed status and event dates within the selected reporting period.",
            products: "Product revenue is grouped by the category of products recorded in POS order items.",
            packages: "Package booking value uses agreed price, package price, or recorded payment for accepted bookings. Pending Review and Cancelled bookings are excluded.",
        },
    };
}

module.exports = {
    buildRange,
    buildAnalyticsPayload,
    toDateOnly,
    toNumber,
};