function toPositiveInteger(value) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : null;
}

function buildScopeWhere({
                             tableAlias,
                             storeId,
                             branchId,
                             dateColumn = null,
                             startDate = null,
                             endDate = null,
                         }) {
    const alias = tableAlias ? `${tableAlias}.` : "";
    const where = [`${alias}store_id = ?`];
    const params = [Number(storeId)];

    if (branchId) {
        where.push(`${alias}branch_id = ?`);
        params.push(Number(branchId));
    }

    if (dateColumn && startDate && endDate) {
        where.push(`${dateColumn} BETWEEN ? AND ?`);
        params.push(startDate, endDate);
    }

    return {
        where: where.join(" AND "),
        params,
    };
}

async function ensureStoreExists(connection, storeId) {
    const parsedStoreId = toPositiveInteger(storeId);

    if (!parsedStoreId) {
        return false;
    }

    const [rows] = await connection.execute(
        `SELECT id
         FROM stores
         WHERE id = ?
         LIMIT 1`,
        [parsedStoreId]
    );

    return rows.length > 0;
}

async function ensureBranchBelongsToStore(connection, branchId, storeId) {
    const parsedBranchId = toPositiveInteger(branchId);
    const parsedStoreId = toPositiveInteger(storeId);

    if (!parsedBranchId || !parsedStoreId) {
        return false;
    }

    const [rows] = await connection.execute(
        `SELECT id, branch_name
         FROM branches
         WHERE id = ?
           AND store_id = ?
         LIMIT 1`,
        [parsedBranchId, parsedStoreId]
    );

    return rows[0] || null;
}

async function getBranchName(connection, branchId, storeId) {
    if (!branchId) {
        return null;
    }

    const branch = await ensureBranchBelongsToStore(connection, branchId, storeId);
    return branch ? String(branch.branch_name || "") : null;
}

async function getSalesRows(
    connection,
    {
        storeId,
        branchId = null,
        startDate,
        endDate,
    }
) {
    const scope = buildScopeWhere({
        tableAlias: "o",
        storeId,
        branchId,
        dateColumn: "o.order_date",
        startDate,
        endDate,
    });

    const [rows] = await connection.execute(
        `
        SELECT
            o.order_id AS orderId,
            o.branch_id AS branchId,
            DATE_FORMAT(o.order_date, '%Y-%m-%d') AS orderDate,
            COALESCE(o.total, 0) AS total
        FROM orders o
        WHERE ${scope.where}
        ORDER BY o.order_date ASC, o.created_at ASC
        `,
        scope.params
    );

    return rows;
}

async function getProductRevenueRows(
    connection,
    {
        storeId,
        branchId = null,
        startDate,
        endDate,
    }
) {
    const scope = buildScopeWhere({
        tableAlias: "o",
        storeId,
        branchId,
        dateColumn: "o.order_date",
        startDate,
        endDate,
    });

    const [rows] = await connection.execute(
        `
        SELECT
            COALESCE(NULLIF(TRIM(p.category), ''), 'Uncategorized') AS category,
            SUM(
                COALESCE(oi.quantity, 0) *
                COALESCE(NULLIF(oi.unit_price, 0), NULLIF(p.sales_price, 0), 0)
            ) AS value
        FROM orders o
        INNER JOIN order_items oi
            ON oi.order_id = o.order_id
        LEFT JOIN products p
            ON p.id = oi.product_id
           AND p.store_id = o.store_id
        WHERE ${scope.where}
        GROUP BY COALESCE(NULLIF(TRIM(p.category), ''), 'Uncategorized')
        HAVING value > 0
        ORDER BY value DESC, category ASC
        `,
        scope.params
    );

    return rows;
}

async function getBookings(
    connection,
    {
        storeId,
        branchId = null,
        startDate,
        endDate,
    }
) {
    const scope = buildScopeWhere({
        tableAlias: "b",
        storeId,
        branchId,
        dateColumn: "b.event_date",
        startDate,
        endDate,
    });

    const [rows] = await connection.execute(
        `
        SELECT
            b.id,
            b.branch_id AS branchId,
            DATE_FORMAT(b.event_date, '%Y-%m-%d') AS eventDate,
            COALESCE(b.event_time, '') AS eventTime,
            COALESCE(b.status, '') AS status,
            COALESCE(b.package_name, '') AS packageName,
            COALESCE(b.custom_order, '') AS customOrder,
            COALESCE(b.agreed_price, 0) AS agreedPrice,
            COALESCE(b.package_price, 0) AS packagePrice,
            COALESCE(b.amount_paid, 0) AS amountPaid
        FROM bookings b
        WHERE ${scope.where}
        ORDER BY b.event_date ASC, b.event_time ASC, b.created_at ASC
        `,
        scope.params
    );

    return rows;
}

async function getRolePermissions(connection, decoded) {
    const role = String(decoded.role || "").toLowerCase();

    if (role === "owner") {
        return {};
    }

    if (role === "manager") {
        const managerId = toPositiveInteger(decoded.manager_id);

        if (!managerId) {
            return {};
        }

        const [rows] = await connection.execute(
            `SELECT permissions
             FROM managers
             WHERE id = ?
               AND store_id = ?
               AND branch_id = ?
               AND status = 'active'
             LIMIT 1`,
            [
                managerId,
                Number(decoded.store_id),
                Number(decoded.branch_id),
            ]
        );

        return rows[0]?.permissions || {};
    }

    if (role === "staff") {
        const staffId = toPositiveInteger(decoded.staff_id);

        if (!staffId) {
            return {};
        }

        const [rows] = await connection.execute(
            `SELECT permissions
             FROM staff
             WHERE id = ?
               AND store_id = ?
               AND branch_id = ?
               AND status = 'active'
             LIMIT 1`,
            [
                staffId,
                Number(decoded.store_id),
                Number(decoded.branch_id),
            ]
        );

        return rows[0]?.permissions || {};
    }

    return {};
}

function parsePermissions(value) {
    if (!value) {
        return {};
    }

    if (typeof value === "object") {
        return value;
    }

    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function hasExplicitAnalyticsDenial(permissions) {
    const normalized = parsePermissions(permissions);

    return (
        normalized.analytics === false ||
        normalized.analytics_view === false ||
        normalized.view_analytics === false
    );
}

module.exports = {
    toPositiveInteger,
    ensureStoreExists,
    ensureBranchBelongsToStore,
    getBranchName,
    getSalesRows,
    getProductRevenueRows,
    getBookings,
    getRolePermissions,
    hasExplicitAnalyticsDenial,
};