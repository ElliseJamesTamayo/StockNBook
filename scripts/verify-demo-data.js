
/* eslint-disable @typescript-eslint/no-require-imports */
/* Checks the Demo Party Store data required for StockNBook defense pages. */
require("dotenv").config({ path: ".env.local" });

const mysql = require("mysql2/promise");

const DEMO_STORE_EMAIL = "demo.owner@stocknbook.com";
const DEMO_STORE_SLUG = "demo-party-store";

const EXPECTED = {
    branches: 3,
    products: 120,
    packages: 15,
    bookings: 120,
    orders: 600,
    currentOrders: 360,
    baselineOrders: 240,
};

function dbConfig() {
    const required = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];

    const missing = required.filter(
        (key) => !String(process.env[key] || "").trim()
    );

    if (missing.length) {
        throw new Error(
            `Missing ${missing.join(", ")} in .env.local.`
        );
    }

    return {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT || 3306),
        ssl:
            String(process.env.DB_SSL || "").toLowerCase() === "true"
                ? { rejectUnauthorized: false }
                : undefined,
    };
}

function dateOnly(date) {
    return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
    const next = new Date(date.getTime());
    next.setUTCDate(next.getUTCDate() + days);
    return next;
}

function completeMonthPeriods() {
    const today = new Date();

    const lastCompleteMonthEnd = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0)
    );

    const currentStart = new Date(
        Date.UTC(
            lastCompleteMonthEnd.getUTCFullYear(),
            lastCompleteMonthEnd.getUTCMonth() - 11,
            1
        )
    );

    const baselineStart = new Date(
        Date.UTC(
            currentStart.getUTCFullYear() - 1,
            currentStart.getUTCMonth(),
            1
        )
    );

    const baselineEnd = addDays(currentStart, -1);

    return {
        currentStart: dateOnly(currentStart),
        currentEnd: dateOnly(lastCompleteMonthEnd),
        baselineStart: dateOnly(baselineStart),
        baselineEnd: dateOnly(baselineEnd),
        currentDays:
            Math.floor(
                (lastCompleteMonthEnd.getTime() - currentStart.getTime()) /
                86400000
            ) + 1,
    };
}

function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function printCheck(label, passed, detail) {
    console.log(`${passed ? "✔" : "✘"} ${label}: ${detail}`);
    return passed;
}

async function main() {
    const db = await mysql.createConnection(dbConfig());

    try {
        const [stores] = await db.execute(
            `SELECT id, store_name
             FROM stores
             WHERE email = ? OR slug = ?
             ORDER BY id DESC
                 LIMIT 1`,
            [DEMO_STORE_EMAIL, DEMO_STORE_SLUG]
        );

        if (!stores.length) {
            throw new Error(
                "Demo Party Store was not found. Run node scripts/seed-demo-data.js first."
            );
        }

        const storeId = number(stores[0].id);
        const periods = completeMonthPeriods();

        const [[counts]] = await db.execute(
            `SELECT
                     (SELECT COUNT(*) FROM branches WHERE store_id = ?) AS branches,
                     (SELECT COUNT(*) FROM products WHERE store_id = ?) AS products,
                     (SELECT COUNT(*) FROM packages WHERE store_id = ?) AS packages,
                     (SELECT COUNT(*) FROM bookings WHERE store_id = ?) AS bookings,
                     (SELECT COUNT(*) FROM orders WHERE store_id = ?) AS orders`,
            [storeId, storeId, storeId, storeId, storeId]
        );

        const [[orderLinks]] = await db.execute(
            `SELECT
                 COUNT(*) AS total_orders,
                 SUM(branch_id IS NULL) AS missing_branch_id,
                 MIN(order_date) AS earliest_order,
                 MAX(order_date) AS latest_order
             FROM orders
             WHERE store_id = ?`,
            [storeId]
        );

        const [[itemLinks]] = await db.execute(
            `SELECT
                 COUNT(*) AS total_items,
                 SUM(oi.product_id IS NULL) AS missing_product_id
             FROM order_items oi
                      INNER JOIN orders o ON o.order_id = oi.order_id
             WHERE o.store_id = ?`,
            [storeId]
        );

        const [[periodCounts]] = await db.execute(
            `SELECT
                 SUM(order_date BETWEEN ? AND ?) AS current_orders,
                 SUM(order_date BETWEEN ? AND ?) AS baseline_orders
             FROM orders
             WHERE store_id = ?`,
            [
                periods.currentStart,
                periods.currentEnd,
                periods.baselineStart,
                periods.baselineEnd,
                storeId,
            ]
        );

        const [monthlySales] = await db.execute(
            `SELECT
                DATE_FORMAT(order_date, '%Y-%m') AS month_key,
                COUNT(*) AS orders,
                SUM(total) AS revenue
             FROM orders
             WHERE store_id = ?
               AND order_date BETWEEN ? AND ?
             GROUP BY DATE_FORMAT(order_date, '%Y-%m')
             ORDER BY month_key`,
            [storeId, periods.currentStart, periods.currentEnd]
        );

        const [dailySales] = await db.execute(
            `SELECT
                 order_date,
                 COUNT(*) AS orders,
                 SUM(total) AS revenue
             FROM orders
             WHERE store_id = ?
               AND order_date BETWEEN ? AND ?
             GROUP BY order_date
             ORDER BY order_date`,
            [storeId, periods.currentStart, periods.currentEnd]
        );

        const [[upcomingBookings]] = await db.execute(
            `SELECT COUNT(*) AS total
             FROM bookings
             WHERE store_id = ?
               AND LOWER(status) IN ('confirmed', 'preparing')
               AND event_date BETWEEN CURDATE()
                 AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)`,
            [storeId]
        );

        const [[linkedPackages]] = await db.execute(
            `SELECT COUNT(*) AS total
             FROM packages
             WHERE store_id = ?
               AND inclusions LIKE '%productId%'`,
            [storeId]
        );

        const [[stockSignals]] = await db.execute(
            `SELECT
                 SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END) AS out_of_stock,
                 SUM(
                         CASE
                             WHEN stock > 0 AND stock <= alert_level THEN 1
                             ELSE 0
                             END
                 ) AS low_stock
             FROM products
             WHERE store_id = ?`,
            [storeId]
        );

        const revenues = monthlySales
            .map((row) => number(row.revenue))
            .filter((value) => value > 0);

        const highestRevenue = revenues.length
            ? Math.max(...revenues)
            : 0;

        const lowestRevenue = revenues.length
            ? Math.min(...revenues)
            : 0;

        const zeroSaleDays = Math.max(
            0,
            periods.currentDays - dailySales.length
        );

        const highestDailyOrders = Math.max(
            0,
            ...dailySales.map((row) => number(row.orders))
        );

        const checks = [
            printCheck(
                "Branches",
                number(counts.branches) === EXPECTED.branches,
                `${counts.branches}/${EXPECTED.branches}`
            ),

            printCheck(
                "Products",
                number(counts.products) === EXPECTED.products,
                `${counts.products}/${EXPECTED.products}`
            ),

            printCheck(
                "Packages",
                number(counts.packages) === EXPECTED.packages,
                `${counts.packages}/${EXPECTED.packages}`
            ),

            printCheck(
                "Bookings",
                number(counts.bookings) === EXPECTED.bookings,
                `${counts.bookings}/${EXPECTED.bookings}`
            ),

            printCheck(
                "All demo POS orders",
                number(counts.orders) === EXPECTED.orders,
                `${counts.orders}/${EXPECTED.orders}`
            ),

            printCheck(
                "Current 12 complete months",
                number(periodCounts.current_orders) ===
                EXPECTED.currentOrders,
                `${periodCounts.current_orders}/${EXPECTED.currentOrders} (${periods.currentStart} to ${periods.currentEnd})`
            ),

            printCheck(
                "Prior-year baseline",
                number(periodCounts.baseline_orders) ===
                EXPECTED.baselineOrders,
                `${periodCounts.baseline_orders}/${EXPECTED.baselineOrders} (${periods.baselineStart} to ${periods.baselineEnd})`
            ),

            printCheck(
                "Forecasting branch links",
                number(orderLinks.total_orders) > 0 &&
                number(orderLinks.missing_branch_id) === 0,
                `${orderLinks.total_orders} orders have branch_id`
            ),

            printCheck(
                "Forecasting product links",
                number(itemLinks.total_items) > 0 &&
                number(itemLinks.missing_product_id) === 0,
                `${itemLinks.total_items} order items have product_id`
            ),

            printCheck(
                "12 monthly Analytics points",
                monthlySales.length === 12,
                `${monthlySales.length}/12 months`
            ),

            printCheck(
                "Realistic monthly variation",
                highestRevenue > lowestRevenue * 1.35,
                `lowest ₱${Math.round(
                    lowestRevenue
                )} / highest ₱${Math.round(highestRevenue)}`
            ),

            printCheck(
                "Realistic daily variation",
                zeroSaleDays > 0 && highestDailyOrders >= 3,
                `${zeroSaleDays} zero-sale days; peak day has ${highestDailyOrders} orders`
            ),

            printCheck(
                "Upcoming booking demand",
                number(upcomingBookings.total) >= 10,
                `${upcomingBookings.total} confirmed/preparing bookings within 30 days`
            ),

            printCheck(
                "Package product links",
                number(linkedPackages.total) === EXPECTED.packages,
                `${linkedPackages.total}/${EXPECTED.packages} packages contain productId`
            ),

            printCheck(
                "Inventory alerts",
                number(stockSignals.out_of_stock) > 0 &&
                number(stockSignals.low_stock) > 0,
                `${stockSignals.out_of_stock} out of stock, ${stockSignals.low_stock} low stock`
            ),
        ];

        const failed = checks.some((check) => !check);

        console.log(
            `\nDemo store: ${
                stores[0].store_name || "Demo Party Store"
            }`
        );

        console.log(
            `Sales history: ${orderLinks.earliest_order} to ${orderLinks.latest_order}`
        );

        if (failed) {
            console.log(
                "\nSome checks failed. Re-run node scripts/seed-demo-data.js and review the error above."
            );

            process.exitCode = 1;
        } else {
            console.log("\nAll defense demo data checks passed.");
        }
    } finally {
        await db.end();
    }
}

main().catch((error) => {
    console.error(
        "Verification failed:",
        error.message || error
    );

    process.exit(1);
});
