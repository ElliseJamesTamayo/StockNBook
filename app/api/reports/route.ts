import { NextRequest, NextResponse } from "next/server";
import mysql, { type Connection } from "mysql2/promise";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const FORECASTING_LAMBDA_URL =
    process.env.FORECASTING_LAMBDA_URL ||
    "https://7oxhafersb.execute-api.ap-southeast-1.amazonaws.com/stocknbook-forecasting";

type Role = "owner" | "manager" | "staff";
type TokenPayload = jwt.JwtPayload & {
    store_id?: number | string;
    storeId?: number | string;
    branch_id?: number | string;
    branchId?: number | string;
    role?: string;
};

type DateRange = {
    startDate: string;
    endDate: string;
    label: string;
};

function asPositiveInteger(value: unknown) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function asNumber(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function asText(value: unknown) {
    return String(value ?? "").trim();
}

function isDate(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toIsoDate(value: Date) {
    return value.toISOString().slice(0, 10);
}

function defaultRange(): DateRange {
    const now = new Date();
    const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    );

    return {
        startDate: toIsoDate(start),
        endDate: toIsoDate(now),
        label: new Intl.DateTimeFormat("en-PH", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
        }).format(start),
    };
}

function resolveDateRange(searchParams: URLSearchParams): DateRange | null {
    const fallback = defaultRange();
    const startDate = asText(searchParams.get("startDate")) || fallback.startDate;
    const endDate = asText(searchParams.get("endDate")) || fallback.endDate;

    if (!isDate(startDate) || !isDate(endDate) || startDate > endDate) {
        return null;
    }

    const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
    const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
    const days = Math.floor((end - start) / 86_400_000) + 1;

    if (days > 366) {
        return null;
    }

    const label = new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    });

    return {
        startDate,
        endDate,
        label:
            startDate === endDate
                ? label.format(new Date(`${startDate}T00:00:00.000Z`))
                : `${label.format(new Date(`${startDate}T00:00:00.000Z`))} – ${label.format(
                    new Date(`${endDate}T00:00:00.000Z`)
                )}`,
    };
}

function databaseConfig() {
    const required = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];
    const missing = required.filter((key) => !asText(process.env[key]));

    if (missing.length > 0) {
        throw new Error(
            `Missing database environment variable(s): ${missing.join(", ")}.`
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

function jsonError(message: string, status: number) {
    return NextResponse.json(
        {
            success: false,
            error: message,
        },
        { status }
    );
}

function getToken(request: NextRequest): TokenPayload {
    const authHeader = request.headers.get("Authorization") || "";

    if (!authHeader) {
        throw new Error("Missing Authorization header.");
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
        throw new Error("Missing authentication token.");
    }

    const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "stocknbook-secret-key"
    );

    if (!decoded || typeof decoded === "string") {
        throw new Error("Invalid authentication token.");
    }

    return decoded as TokenPayload;
}

async function ensureBranchBelongsToStore(
    connection: Connection,
    branchId: number,
    storeId: number
) {
    const [rows] = await connection.execute(
        `SELECT id, branch_name
         FROM branches
         WHERE id = ? AND store_id = ?
         LIMIT 1`,
        [branchId, storeId]
    );

    return (rows as Array<{ id: number; branch_name: string }>)[0] || null;
}

function getInventoryStatus(stock: number, alertLevel: number) {
    if (stock <= 0) return "Out of Stock";
    if (stock <= alertLevel) return "Low Stock";
    return "In Stock";
}

async function loadBranches(
    connection: Connection,
    storeId: number,
    branchId: number | null
) {
    let query = `
        SELECT id, branch_name, address, contact_number
        FROM branches
        WHERE store_id = ?
    `;
    const params: Array<number> = [storeId];

    if (branchId) {
        query += " AND id = ?";
        params.push(branchId);
    }

    query += " ORDER BY branch_name ASC";

    const [rows] = await connection.execute(query, params);

    return (rows as Array<Record<string, unknown>>).map((row) => ({
        id: Number(row.id),
        name: asText(row.branch_name),
        location: asText(row.address),
        contact: asText(row.contact_number),
    }));
}

async function loadInventory(
    connection: Connection,
    storeId: number,
    branchId: number | null
) {
    let query = `
        SELECT
            p.id AS product_id,
            p.branch_id,
            p.name AS product_name,
            p.category,
            p.stock,
            p.alert_level,
            p.original_price,
            p.sales_price,
            p.has_variants,
            br.branch_name,
            pv.id AS variant_id,
            pv.variant_values,
            pv.stock AS variant_stock,
            pv.alert_level AS variant_alert_level,
            pv.original_price AS variant_original_price,
            pv.sales_price AS variant_sales_price
        FROM products p
        LEFT JOIN branches br
            ON br.id = p.branch_id AND br.store_id = p.store_id
        LEFT JOIN product_variants pv
            ON pv.product_id = p.id
        WHERE p.store_id = ?
    `;

    const params: Array<number> = [storeId];

    if (branchId) {
        query += " AND p.branch_id = ?";
        params.push(branchId);
    }

    query += " ORDER BY br.branch_name ASC, p.name ASC, pv.id ASC";

    const [rows] = await connection.execute(query, params);
    const grouped = new Map<string, Record<string, unknown>>();

    for (const rawRow of rows as Array<Record<string, unknown>>) {
        const id = String(rawRow.product_id);
        const product =
            grouped.get(id) ||
            {
                id,
                product: asText(rawRow.product_name) || "Unnamed Product",
                category: asText(rawRow.category) || "Uncategorized",
                branch: asText(rawRow.branch_name) || "Unassigned Branch",
                stock: asNumber(rawRow.stock),
                reorderLevel: asNumber(rawRow.alert_level),
                costPrice: asNumber(rawRow.original_price),
                salesPrice: asNumber(rawRow.sales_price),
                variants: [] as Array<Record<string, unknown>>,
            };

        if (rawRow.variant_id) {
            const values = (() => {
                try {
                    return JSON.parse(asText(rawRow.variant_values) || "{}") as Record<
                        string,
                        unknown
                    >;
                } catch {
                    return {};
                }
            })();

            const variantName =
                Object.values(values)
                    .map((value) => asText(value))
                    .filter(Boolean)
                    .join(" / ") || "Variant";

            const variantStock = asNumber(rawRow.variant_stock);
            const variantAlert = asNumber(rawRow.variant_alert_level);

            (product.variants as Array<Record<string, unknown>>).push({
                id: String(rawRow.variant_id),
                name: variantName,
                stock: variantStock,
                reorderLevel: variantAlert,
                costPrice: asNumber(rawRow.variant_original_price),
                salesPrice: asNumber(rawRow.variant_sales_price),
                status: getInventoryStatus(variantStock, variantAlert),
            });
        }

        grouped.set(id, product);
    }

    return Array.from(grouped.values()).map((product) => {
        const variants = product.variants as Array<Record<string, unknown>>;
        const hasVariants = variants.length > 0;

        const stock = hasVariants
            ? variants.reduce((sum, variant) => sum + asNumber(variant.stock), 0)
            : asNumber(product.stock);

        const reorderLevel = hasVariants
            ? variants.reduce(
                (sum, variant) => sum + asNumber(variant.reorderLevel),
                0
            )
            : asNumber(product.reorderLevel);

        const hasOut = variants.some(
            (variant) => asText(variant.status) === "Out of Stock"
        );
        const hasLow = variants.some(
            (variant) => asText(variant.status) === "Low Stock"
        );

        return {
            ...product,
            stock,
            reorderLevel,
            status: hasVariants
                ? hasOut
                    ? "Out of Stock"
                    : hasLow
                        ? "Low Stock"
                        : "In Stock"
                : getInventoryStatus(stock, reorderLevel),
            variants: hasVariants ? variants : undefined,
        };
    });
}

async function loadSales(
    connection: Connection,
    storeId: number,
    branchId: number | null,
    range: DateRange
) {
    let query = `
        SELECT
            o.order_id,
            o.branch_id,
            br.branch_name,
            o.customer_name,
            DATE_FORMAT(o.order_date, '%Y-%m-%d') AS order_date,
            COALESCE(o.total, 0) AS total,
            COALESCE(SUM(oi.quantity), 0) AS total_quantity,
            GROUP_CONCAT(
                CONCAT(
                    COALESCE(oi.product_name, 'Product'),
                    ' × ',
                    COALESCE(oi.quantity, 0)
                )
                ORDER BY oi.id SEPARATOR ', '
            ) AS items_text
        FROM orders o
        LEFT JOIN branches br
            ON br.id = o.branch_id AND br.store_id = o.store_id
        LEFT JOIN order_items oi
            ON oi.order_id = o.order_id
        WHERE o.store_id = ?
          AND o.order_date BETWEEN ? AND ?
    `;

    const params: Array<number | string> = [
        storeId,
        range.startDate,
        range.endDate,
    ];

    if (branchId) {
        query += " AND o.branch_id = ?";
        params.push(branchId);
    }

    query += `
        GROUP BY
            o.order_id,
            o.branch_id,
            br.branch_name,
            o.customer_name,
            o.order_date,
            o.total
        ORDER BY o.order_date DESC, o.order_id DESC
    `;

    const [rows] = await connection.execute(query, params);

    return (rows as Array<Record<string, unknown>>).map((row) => ({
        id: asText(row.order_id),
        reference: asText(row.order_id),
        date: asText(row.order_date),
        branch: asText(row.branch_name) || "Unassigned Branch",
        branchId: String(row.branch_id ?? ""),
        customer: asText(row.customer_name) || "Walk-in Customer",
        product: asText(row.items_text) || "No items recorded",
        itemsText: asText(row.items_text) || "No items recorded",
        category: "",
        quantity: asNumber(row.total_quantity),
        amount: asNumber(row.total),
        revenueSource: "pos",
        statusLabel: "Completed",
    }));
}

function acceptedBookingStatus(status: string) {
    return ["confirmed", "preparing", "completed"].includes(
        status.trim().toLowerCase()
    );
}

async function loadBookings(
    connection: Connection,
    storeId: number,
    branchId: number | null,
    range: DateRange
) {
    let query = `
        SELECT
            b.id,
            b.branch_id,
            br.branch_name,
            b.booking_reference,
            b.name,
            b.phone,
            b.event_date,
            b.event_time,
            b.event_type,
            b.package_name,
            b.custom_order,
            b.venue,
            b.notes,
            b.status,
            b.agreed_price,
            b.package_price,
            b.payment_status,
            b.required_down_payment,
            b.amount_paid,
            b.balance
        FROM bookings b
        LEFT JOIN branches br
            ON br.id = b.branch_id AND br.store_id = b.store_id
        WHERE b.store_id = ?
          AND b.event_date BETWEEN ? AND ?
    `;

    const params: Array<number | string> = [
        storeId,
        range.startDate,
        range.endDate,
    ];

    if (branchId) {
        query += " AND b.branch_id = ?";
        params.push(branchId);
    }

    query += " ORDER BY b.event_date DESC, b.id DESC";

    const [rows] = await connection.execute(query, params);

    return (rows as Array<Record<string, unknown>>).map((row) => {
        const agreedPrice = asNumber(row.agreed_price);
        const packagePrice = asNumber(row.package_price);
        const amount = agreedPrice > 0 ? agreedPrice : packagePrice;

        return {
            id: String(row.id),
            reference: asText(row.booking_reference) || `BOOKING-${row.id}`,
            date: asText(row.event_date),
            eventDate: asText(row.event_date),
            scheduleTime: asText(row.event_time) || undefined,
            branch: asText(row.branch_name) || "Unassigned Branch",
            branchId: String(row.branch_id ?? ""),
            customer: asText(row.name) || "Customer",
            phone: asText(row.phone) || undefined,
            venue: asText(row.venue) || undefined,
            packageName:
                asText(row.package_name) ||
                asText(row.custom_order) ||
                "Custom / Unspecified",
            status: asText(row.status).toLowerCase() || "pending",
            statusLabel: asText(row.status) || "Pending",
            amount,
            amountPaid: asNumber(row.amount_paid),
            requiredDownPayment: asNumber(row.required_down_payment),
            balance: asNumber(row.balance),
            paymentStatus: asText(row.payment_status) || "unpaid",
            notes: asText(row.notes) || undefined,
        };
    });
}

function bookingSummary(bookings: Array<Record<string, unknown>>) {
    const count = {
        pending: 0,
        confirmed: 0,
        preparing: 0,
        cancelled: 0,
        completed: 0,
    };

    for (const booking of bookings) {
        const status = asText(booking.status).toLowerCase() as keyof typeof count;
        if (status in count) {
            count[status] += 1;
        }
    }

    return {
        totalBookings: bookings.length,
        ...count,
    };
}

function bookingRevenue(bookings: Array<Record<string, unknown>>) {
    return bookings
        .filter((booking) => acceptedBookingStatus(asText(booking.status)))
        .reduce((sum, booking) => sum + asNumber(booking.amount), 0);
}

async function loadForecastReport(
    authHeader: string,
    branchId: number | null
) {
    try {
        const response = await fetch(FORECASTING_LAMBDA_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
            },
            body: JSON.stringify({
                action: "get_inventory_forecast",
                ...(branchId ? { branch_id: branchId } : {}),
            }),
            cache: "no-store",
        });

        if (!response.ok) {
            return { forecasting: [], seasonalInsights: [] };
        }

        const payload = (await response.json()) as Record<string, unknown>;
        const items = Array.isArray(payload.items) ? payload.items : [];

        const forecasting = items.slice(0, 40).map((value, index) => {
            const item = value as Record<string, unknown>;
            const timeAlert = asText(item.timeAlert);
            const status = asText(item.status);
            const riskLevel =
                timeAlert.includes("STOCKOUT") || timeAlert.includes("REORDER")
                    ? "High"
                    : status === "LOW" || status === "RISK"
                        ? "Medium"
                        : "Low";

            return {
                id: asText(item.id) || `forecast-${index + 1}`,
                item: asText(item.itemName) || "Unnamed Item",
                type: "Product",
                currentValue: `${asNumber(item.onHandQuantity)} units`,
                forecastedDemand: `${asNumber(item.forecastedDemand)} units / 30 days`,
                suggestedRestock: `${asNumber(item.suggestedRestock)} units`,
                riskLevel,
            };
        });

        const seasonalInsights = items
            .map((value) => value as Record<string, unknown>)
            .filter((item) => {
                const seasonality = item.seasonality as Record<string, unknown> | undefined;
                const status = asText(seasonality?.status);
                return status && status !== "NO_HISTORY" && status !== "LIMITED_HISTORY";
            })
            .slice(0, 12)
            .map((item) => {
                const seasonality = item.seasonality as Record<string, unknown> | undefined;
                return {
                    period: asText(item.itemName) || "Product",
                    trend: asText(seasonality?.status) || "Seasonal signal",
                    recommendation:
                        asText(seasonality?.recommendation) ||
                        `Review stock for ${asText(item.itemName) || "this product"} based on its POS sales pattern.`,
                };
            });

        return { forecasting, seasonalInsights };
    } catch {
        // Keep the Reports route usable even when the Forecasting Lambda is unavailable.
        return { forecasting: [], seasonalInsights: [] };
    }
}

export async function GET(request: NextRequest) {
    let connection: Connection | null = null;

    try {
        const range = resolveDateRange(new URL(request.url).searchParams);

        if (!range) {
            return jsonError(
                "Choose a valid reporting range of up to 366 days.",
                400
            );
        }

        const authHeader = request.headers.get("Authorization") || "";
        const token = getToken(request);
        const storeId = asPositiveInteger(token.store_id ?? token.storeId);
        const role = asText(token.role).toLowerCase() as Role;
        const tokenBranchId = asPositiveInteger(token.branch_id ?? token.branchId);

        if (!storeId || !["owner", "manager", "staff"].includes(role)) {
            return jsonError("Invalid store or role in authentication token.", 401);
        }

        const searchParams = new URL(request.url).searchParams;
        const requestedBranchId = asPositiveInteger(
            searchParams.get("branch_id") || searchParams.get("branchId")
        );

        connection = await mysql.createConnection(databaseConfig());

        let branchId: number | null = null;

        if (role === "manager" || role === "staff") {
            if (!tokenBranchId) {
                return jsonError("Your account has no assigned branch.", 400);
            }

            branchId = tokenBranchId;
        } else if (requestedBranchId) {
            const branch = await ensureBranchBelongsToStore(
                connection,
                requestedBranchId,
                storeId
            );

            if (!branch) {
                return jsonError("Invalid branch for this store.", 400);
            }

            branchId = requestedBranchId;
        }

        const [branches, inventoryList, salesList, bookingList, forecastReport] =
            await Promise.all([
                loadBranches(connection, storeId, branchId),
                loadInventory(connection, storeId, branchId),
                loadSales(connection, storeId, branchId, range),
                loadBookings(connection, storeId, branchId, range),
                loadForecastReport(authHeader, branchId),
            ]);

        const totalSales = salesList.reduce(
            (sum, sale) => sum + asNumber(sale.amount),
            0
        );

        const branchName =
            branchId && branches.length === 1
                ? asText(branches[0].name)
                : "All Branches";

        const lowStockItems = inventoryList.filter(
            (item) => asText(item.status) === "Low Stock"
        );

        const outOfStockItems = inventoryList.filter(
            (item) => asText(item.status) === "Out of Stock"
        );

        return NextResponse.json({
            success: true,
            data: {
                branch: branchName,
                storeName: "StockNBook",
                monthLabel: range.label,
                isSampleData: false,
                dateRange: {
                    startDate: range.startDate,
                    endDate: range.endDate,
                },
                access: {
                    role,
                    assignedBranch: branchName,
                    branchLocked: role !== "owner",
                },
                branchOptions: branches.map((branch) => asText(branch.name)),
                summary: {
                    grossSales: totalSales,
                    bookingRevenue: bookingRevenue(bookingList),
                    totalTransactions: salesList.length,
                    averageOrderValue:
                        salesList.length > 0
                            ? Math.round(totalSales / salesList.length)
                            : 0,
                },
                bookingSummary: bookingSummary(bookingList),
                inventoryList,
                lowStockItems,
                outOfStockItems,
                // StockNBook has no persisted restock/audit table in the current schema.
                // Empty arrays are intentional: the UI must not show invented records.
                restockHistory: [],
                salesList,
                bookingList,
                forecasting: forecastReport.forecasting,
                seasonalInsights: forecastReport.seasonalInsights,
                staffActivities: [],
            },
        });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unable to load reports.";

        if (
            message.includes("Authorization") ||
            message.includes("authentication") ||
            message.includes("token")
        ) {
            return jsonError(message, 401);
        }

        console.error("Reports API error:", error);
        return jsonError(message, 500);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}
