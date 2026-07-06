/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config({ path: ".env.local" });

const mysql = require("mysql2/promise");

const DEMO_STORE_EMAIL = "demo.owner@stocknbook.com";
const DEMO_STORE_SLUG = "demo-party-store";

function quoteIdentifier(identifier) {
    return `\`${String(identifier).replace(/`/g, "``")}\``;
}

async function tableExists(db, tableName) {
    const [rows] = await db.execute(
        `SELECT 1
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
             LIMIT 1`,
        [tableName]
    );

    return rows.length > 0;
}

async function columnExists(db, tableName, columnName) {
    const [rows] = await db.execute(
        `SELECT 1
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND COLUMN_NAME = ?
             LIMIT 1`,
        [tableName, columnName]
    );

    return rows.length > 0;
}

async function deleteChildRows(db, config, storeId) {
    const {
        childTable,
        childColumn,
        parentTable,
        parentColumn,
    } = config;

    const exists =
        (await tableExists(db, childTable)) &&
        (await tableExists(db, parentTable)) &&
        (await columnExists(db, childTable, childColumn)) &&
        (await columnExists(db, parentTable, parentColumn)) &&
        (await columnExists(db, parentTable, "store_id"));

    if (!exists) {
        return;
    }

    await db.execute(
        `DELETE child
         FROM ${quoteIdentifier(childTable)} AS child
        INNER JOIN ${quoteIdentifier(parentTable)} AS parent
        ON child.${quoteIdentifier(childColumn)} = parent.${quoteIdentifier(parentColumn)}
        WHERE parent.store_id = ?`,
        [storeId]
    );

    console.log(`Cleared ${childTable} linked to demo ${parentTable}.`);
}

async function deleteStoreScopedRows(db, storeId) {
    const [rows] = await db.execute(
        `SELECT DISTINCT TABLE_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND COLUMN_NAME = 'store_id'
           AND TABLE_NAME <> 'stores'
         ORDER BY TABLE_NAME`
    );

    for (const row of rows) {
        const tableName = row.TABLE_NAME;
        await db.execute(
            `DELETE FROM ${quoteIdentifier(tableName)} WHERE store_id = ?`,
            [storeId]
        );
        console.log(`Cleared demo rows from ${tableName}.`);
    }
}

async function main() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT || 3306),
        ssl:
            process.env.DB_SSL === "true"
                ? { rejectUnauthorized: false }
                : undefined,
    });

    console.log("Connected to database.");

    let foreignKeyChecksDisabled = false;

    try {
        const [stores] = await db.execute(
            `SELECT id, store_name
             FROM stores
             WHERE email = ? OR slug = ?
             ORDER BY id DESC
                 LIMIT 1`,
            [DEMO_STORE_EMAIL, DEMO_STORE_SLUG]
        );

        if (stores.length === 0) {
            console.log("No demo store found. Nothing was deleted.");
            return;
        }

        const storeId = stores[0].id;
        console.log(`Found demo store: ${stores[0].store_name} (store_id=${storeId})`);
        console.log("Deleting only data belonging to this demo store...");

        /*
         * This script does NOT use TRUNCATE. It removes only the demo-store data.
         * Foreign-key checks are temporarily disabled because the database may
         * contain optional child tables (booking_items, payment_submissions,
         * subscription logs, etc.) with different relationships.
         */
        await db.query("SET FOREIGN_KEY_CHECKS = 0");
        foreignKeyChecksDisabled = true;

        await db.beginTransaction();

        // Delete known child rows that do not normally have store_id.
        const childRelations = [
            {
                childTable: "order_items",
                childColumn: "order_id",
                parentTable: "orders",
                parentColumn: "order_id",
            },
            {
                childTable: "booking_items",
                childColumn: "booking_id",
                parentTable: "bookings",
                parentColumn: "id",
            },
            {
                childTable: "product_variants",
                childColumn: "product_id",
                parentTable: "products",
                parentColumn: "id",
            },
            {
                childTable: "payment_submissions",
                childColumn: "booking_id",
                parentTable: "bookings",
                parentColumn: "id",
            },
            {
                childTable: "payment_submissions",
                childColumn: "order_id",
                parentTable: "orders",
                parentColumn: "order_id",
            },
            {
                childTable: "subscription_audit_logs",
                childColumn: "subscription_id",
                parentTable: "subscriptions",
                parentColumn: "id",
            },
            {
                childTable: "subscription_notifications",
                childColumn: "subscription_id",
                parentTable: "subscriptions",
                parentColumn: "id",
            },
            {
                childTable: "payment_submissions",
                childColumn: "subscription_id",
                parentTable: "subscriptions",
                parentColumn: "id",
            },
        ];

        for (const relation of childRelations) {
            await deleteChildRows(db, relation, storeId);
        }

        // Remove every table that is explicitly scoped to this store, including
        // optional module tables that may be added later.
        await deleteStoreScopedRows(db, storeId);

        await db.execute("DELETE FROM stores WHERE id = ?", [storeId]);

        await db.commit();

        console.log("");
        console.log("Demo data destroyed successfully.");
    } catch (error) {
        try {
            await db.rollback();
        } catch {
            // Ignore rollback errors and rethrow the original error.
        }
        throw error;
    } finally {
        if (foreignKeyChecksDisabled) {
            await db.query("SET FOREIGN_KEY_CHECKS = 1");
        }
        await db.end();
    }
}

main().catch((error) => {
    console.error("Destroy failed:", error);
    process.exit(1);
});
