/* eslint-disable @typescript-eslint/no-require-imports */
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "stocknbook-secret-key";

const dbConfig = {
    host: "stocknbook-db.clyuqe48evd0.ap-southeast-1.rds.amazonaws.com",
    user: "admin",
    password: "2qJivedWDxCQS6TLjjEl",
    database: "stocknbook",
    ssl: { rejectUnauthorized: false },
};

exports.handler = async (event) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Content-Type": "application/json",
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "" };
    }

    let body = {};
    try {
        body = JSON.parse(event.body || "{}");
    } catch {
        body = {};
    }

    const action = body.action;
    const connection = await mysql.createConnection(dbConfig);

    try {
        // ── PROTECTED: verify token ───────────────────────────────────────────
        const authHeader = event.headers?.Authorization || event.headers?.authorization;

        if (!authHeader) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: "No token" }),
            };
        }

        let store_id;
        try {
            const token = authHeader.replace("Bearer ", "");
            const decoded = jwt.verify(token, JWT_SECRET);
            store_id = decoded.store_id;
        } catch {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: "Invalid token" }),
            };
        }

        // ── PROTECTED: get_inventory_forecast ──────────────────────────────────
        // Get top 3 high-demand items with forecasted data
        if (action === "get_inventory_forecast") {
            const { branch_id, branchId } = body;
            const requestedBranchId = branch_id || branchId;

            // Get inventory items with sales data grouped by month
            let query = `
                SELECT 
                    p.id,
                    p.name,
                    p.sku,
                    pi.current_stock,
                    SUM(oi.quantity) as total_sold,
                    YEAR(o.created_at) as year,
                    MONTH(o.created_at) as month,
                    COUNT(DISTINCT DATE(o.created_at)) as sales_days
                FROM products p
                LEFT JOIN product_inventory pi ON p.id = pi.product_id
                LEFT JOIN order_items oi ON p.id = oi.product_id
                LEFT JOIN orders o ON oi.order_id = o.id
                WHERE p.store_id = ?
            `;

            const params = [store_id];

            if (requestedBranchId) {
                query += ` AND p.branch_id = ?`;
                params.push(Number(requestedBranchId));
            }

            query += `
                GROUP BY p.id, p.name, p.sku, pi.current_stock, YEAR(o.created_at), MONTH(o.created_at)
                ORDER BY total_sold DESC
                LIMIT 3
            `;

            const [rows] = await connection.execute(query, params);

            // Calculate forecasts for each product
            const forecasts = rows.map((row) => {
                const averageMonthlySales = row.total_sold ? Math.round(row.total_sold / 3) : 0;
                const currentStock = row.current_stock || 0;
                const monthlyGrowthPercent = 15; // Average growth percentage
                const forecastedDemand = Math.round(
                    averageMonthlySales * (1 + monthlyGrowthPercent / 100)
                );
                const restockRecommendation = Math.max(
                    0,
                    forecastedDemand - currentStock
                );

                return {
                    productId: row.id,
                    productName: row.name,
                    sku: row.sku,
                    currentStock,
                    forecastedItems: forecastedDemand,
                    monthlyGrowth: `+${monthlyGrowthPercent}%`,
                    restockRecommendation,
                    riskLevel:
                        currentStock < restockRecommendation ? "High" :
                            currentStock < restockRecommendation * 1.5 ? "Medium" :
                                "Low",
                };
            });

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ forecasts }),
            };
        }

        // ── PROTECTED: get_seasonal_forecast ───────────────────────────────────
        // Get seasonal demand patterns (Q1, Q2, Q3, Q4)
        if (action === "get_seasonal_forecast") {
            const { branch_id, branchId } = body;
            const requestedBranchId = branch_id || branchId;

            let query = `
                SELECT 
                    QUARTER(o.created_at) as quarter,
                    SUM(oi.quantity) as total_items,
                    COUNT(DISTINCT o.id) as total_orders
                FROM orders o
                LEFT JOIN order_items oi ON o.id = oi.order_id
                WHERE o.store_id = ?
                    AND o.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
            `;

            const params = [store_id];

            if (requestedBranchId) {
                query += ` AND o.branch_id = ?`;
                params.push(Number(requestedBranchId));
            }

            query += ` GROUP BY QUARTER(o.created_at) ORDER BY quarter ASC`;

            const [rows] = await connection.execute(query, params);

            // Calculate seasonal indices and insights
            const seasonalData = [];
            const totalItems = rows.reduce((sum, row) => sum + (row.total_items || 0), 0);
            const avgItemsPerQuarter = totalItems / 4;

            const quarterNames = ["Q1", "Q2", "Q3", "Q4"];
            const insights = [
                "Stable demand",
                "Graduation season increase",
                "Peak booking season",
                "Holiday event demand"
            ];

            for (let q = 1; q <= 4; q++) {
                const quarterData = rows.find((r) => r.quarter === q);
                const itemsInQuarter = quarterData?.total_items || 0;
                const growthPercent = Math.round(
                    ((itemsInQuarter - avgItemsPerQuarter) / avgItemsPerQuarter) * 100
                );

                seasonalData.push({
                    quarter: quarterNames[q - 1],
                    growth: growthPercent >= 0 ? `+${growthPercent}%` : `${growthPercent}%`,
                    insight: insights[q - 1],
                    forecastedItems: Math.round(avgItemsPerQuarter * (1 + growthPercent / 100)),
                });
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ seasonalForecast: seasonalData }),
            };
        }

        // ── PROTECTED: get_booking_forecast ────────────────────────────────────
        // Get booking demand forecast using seasonal index method
        if (action === "get_booking_forecast") {
            const { branch_id, branchId } = body;
            const requestedBranchId = branch_id || branchId;

            // Step 1: Get monthly booking totals for past year
            let query = `
                SELECT 
                    MONTH(b.created_at) as month,
                    YEAR(b.created_at) as year,
                    COUNT(*) as monthly_bookings
                FROM bookings b
                WHERE b.store_id = ?
                    AND b.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
                    AND b.status NOT IN ('Cancelled')
            `;

            const params = [store_id];

            if (requestedBranchId) {
                query += ` AND b.branch_id = ?`;
                params.push(Number(requestedBranchId));
            }

            query += ` GROUP BY MONTH(b.created_at), YEAR(b.created_at) ORDER BY year, month`;

            const [bookingRows] = await connection.execute(query, params);

            // Step 2: Calculate average monthly demand
            const monthlyTotals = Array(12).fill(0);
            bookingRows.forEach((row) => {
                if (row.month >= 1 && row.month <= 12) {
                    monthlyTotals[row.month - 1] += row.monthly_bookings;
                }
            });

            const totalBookings = monthlyTotals.reduce((sum, val) => sum + val, 0);
            const averageDemand = Math.round(totalBookings / 12);

            // Step 3: Calculate seasonal indices
            const seasonalIndices = monthlyTotals.map((monthly) => {
                if (averageDemand === 0) return 1.0;
                return (monthly / averageDemand).toFixed(2);
            });

            // Step 4: Get upcoming bookings for next 30 days
            let nextMonthQuery = `
                SELECT COUNT(*) as upcoming_bookings
                FROM bookings b
                WHERE b.store_id = ?
                    AND b.event_date >= CURDATE()
                    AND b.event_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                    AND b.status NOT IN ('Cancelled')
            `;

            const nextMonthParams = [store_id];
            if (requestedBranchId) {
                nextMonthQuery += ` AND b.branch_id = ?`;
                nextMonthParams.push(Number(requestedBranchId));
            }

            const [nextMonthResult] = await connection.execute(nextMonthQuery, nextMonthParams);
            const upcomingBookings = nextMonthResult[0]?.upcoming_bookings || 0;

            // Step 5: Calculate peak day
            const peakMonth = monthlyTotals.indexOf(Math.max(...monthlyTotals));
            const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

            let peakDayQuery = `
                SELECT DAYOFWEEK(b.event_date) as day_of_week, COUNT(*) as booking_count
                FROM bookings b
                WHERE b.store_id = ?
                    AND b.status NOT IN ('Cancelled')
            `;

            const peakDayParams = [store_id];
            if (requestedBranchId) {
                peakDayQuery += ` AND b.branch_id = ?`;
                peakDayParams.push(Number(requestedBranchId));
            }

            peakDayQuery += ` GROUP BY DAYOFWEEK(b.event_date) ORDER BY booking_count DESC LIMIT 1`;

            const [peakDayResult] = await connection.execute(peakDayQuery, peakDayParams);
            const peakDay = peakDayResult.length > 0
                ? dayNames[peakDayResult[0].day_of_week - 1]
                : "Saturday";

            // Calculate weekend percentage
            let weekendQuery = `
                SELECT 
                    COUNT(CASE WHEN DAYOFWEEK(b.event_date) IN (1, 7) THEN 1 END) as weekend_bookings,
                    COUNT(*) as total_bookings
                FROM bookings b
                WHERE b.store_id = ?
                    AND b.status NOT IN ('Cancelled')
            `;

            const weekendParams = [store_id];
            if (requestedBranchId) {
                weekendQuery += ` AND b.branch_id = ?`;
                weekendParams.push(Number(requestedBranchId));
            }

            const [weekendResult] = await connection.execute(weekendQuery, weekendParams);
            const weekendShare = weekendResult.length > 0 && weekendResult[0].total_bookings > 0
                ? Math.round((weekendResult[0].weekend_bookings / weekendResult[0].total_bookings) * 100)
                : 0;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    bookingForecast: {
                        averageDemand,
                        seasonalIndices,
                        upcomingBookings30Days: upcomingBookings,
                        forecastedNext30Days: Math.round(upcomingBookings * (1 + 10 / 100)), // 10% growth
                        peakDay,
                        weekendShare: `${weekendShare}%`,
                    },
                }),
            };
        }

        // ── PROTECTED: get_forecast_report ────────────────────────────────────
        // Get comprehensive forecasting report
        if (action === "get_forecast_report") {
            const { branch_id, branchId, start_date, end_date } = body;
            const requestedBranchId = branch_id || branchId;
            const startDate = start_date || new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split("T")[0];
            const endDate = end_date || new Date().toISOString().split("T")[0];

            // Get products with forecast data
            let productsQuery = `
                SELECT 
                    p.id,
                    p.name,
                    p.sku,
                    pi.current_stock,
                    SUM(oi.quantity) as historical_sales,
                    COUNT(DISTINCT o.id) as order_count
                FROM products p
                LEFT JOIN product_inventory pi ON p.id = pi.product_id
                LEFT JOIN order_items oi ON p.id = oi.product_id
                LEFT JOIN orders o ON oi.order_id = o.id
                WHERE p.store_id = ?
                    AND o.created_at >= ?
                    AND o.created_at <= ?
            `;

            const productsParams = [store_id, startDate, endDate];

            if (requestedBranchId) {
                productsQuery += ` AND p.branch_id = ?`;
                productsParams.push(Number(requestedBranchId));
            }

            productsQuery += ` GROUP BY p.id, p.name, p.sku, pi.current_stock ORDER BY historical_sales DESC LIMIT 10`;

            const [products] = await connection.execute(productsQuery, productsParams);

            // Get bookings data
            let bookingsQuery = `
                SELECT 
                    COUNT(*) as total_bookings,
                    COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_bookings,
                    COUNT(CASE WHEN status = 'Pending Review' THEN 1 END) as pending_bookings,
                    AVG(agreed_price) as avg_booking_value
                FROM bookings b
                WHERE b.store_id = ?
                    AND b.created_at >= ?
                    AND b.created_at <= ?
            `;

            const bookingsParams = [store_id, startDate, endDate];

            if (requestedBranchId) {
                bookingsQuery += ` AND b.branch_id = ?`;
                bookingsParams.push(Number(requestedBranchId));
            }

            const [bookings] = await connection.execute(bookingsQuery, bookingsParams);

            const productForecasts = products.map((p) => {
                const forecastedDemand = Math.round((p.historical_sales || 0) * 1.15); // 15% growth projection
                const restockRecommendation = Math.max(0, forecastedDemand - (p.current_stock || 0));

                return {
                    productId: p.id,
                    name: p.name,
                    sku: p.sku,
                    currentStock: p.current_stock || 0,
                    historicalSales: p.historical_sales || 0,
                    forecastedDemand,
                    restockRecommendation,
                    riskLevel:
                        (p.current_stock || 0) < restockRecommendation ? "High" :
                            (p.current_stock || 0) < restockRecommendation * 1.5 ? "Medium" :
                                "Low",
                };
            });

            const bookingStats = {
                totalBookings: bookings[0]?.total_bookings || 0,
                completedBookings: bookings[0]?.completed_bookings || 0,
                pendingBookings: bookings[0]?.pending_bookings || 0,
                averageBookingValue: bookings[0]?.avg_booking_value
                    ? Math.round(bookings[0].avg_booking_value * 100) / 100
                    : 0,
                completionRate: bookings[0]?.total_bookings > 0
                    ? Math.round((bookings[0].completed_bookings / bookings[0].total_bookings) * 100)
                    : 0,
            };

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    report: {
                        dateRange: { startDate, endDate },
                        productForecasts,
                        bookingStats,
                    },
                }),
            };
        }

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Invalid action" }),
        };
    } catch (err) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: err.message }),
        };
    } finally {
        await connection.end();
    }
};
