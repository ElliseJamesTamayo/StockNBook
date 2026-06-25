require("dotenv").config({ path: ".env.local" });

const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

const DEMO_STORE_EMAIL = "demo.owner@stocknbook.com";
const DEMO_STORE_SLUG = "demo-party-store";
const DEMO_PASSWORD = "Demo12345";

const TARGET_PRODUCT_COUNT = 120;
const TARGET_PACKAGE_COUNT = 15;
const TARGET_BOOKING_COUNT = 120;
const TARGET_ORDER_COUNT = 150;

const managerPermissionSets = [
    {
        label: "Full Access Manager",
        permissions: {
            dashboard: true,
            bookings: true,
            packages: true,
            packages_manage: true,
            inventory: true,
            pos: true,
            reports: true,
            staff_management: true,
            staff_roles: true,
            branch_settings: true,
        },
    },
    {
        label: "Operations Manager",
        permissions: {
            dashboard: true,
            bookings: true,
            packages: true,
            packages_manage: true,
            inventory: true,
            pos: true,
            reports: false,
            staff_management: false,
            staff_roles: false,
            branch_settings: false,
        },
    },
    {
        label: "Bookings Manager",
        permissions: {
            dashboard: true,
            bookings: true,
            packages: true,
            packages_manage: false,
            inventory: false,
            pos: false,
            reports: false,
            staff_management: false,
            staff_roles: false,
            branch_settings: false,
        },
    },
];

const staffPermissionSets = [
    {
        label: "Bookings Staff",
        permissions: {
            dashboard: true,
            bookings: true,
            packages: false,
            packages_manage: false,
            inventory: false,
            pos: false,
            reports: false,
            staff_management: false,
            staff_roles: false,
            branch_settings: false,
        },
    },
    {
        label: "Inventory and POS Staff",
        permissions: {
            dashboard: true,
            bookings: false,
            packages: false,
            packages_manage: false,
            inventory: true,
            pos: true,
            reports: false,
            staff_management: false,
            staff_roles: false,
            branch_settings: false,
        },
    },
    {
        label: "Packages Staff",
        permissions: {
            dashboard: true,
            bookings: false,
            packages: true,
            packages_manage: false,
            inventory: false,
            pos: false,
            reports: false,
            staff_management: false,
            staff_roles: false,
            branch_settings: false,
        },
    },
];

const branchData = [
    {
        branch_name: "Main Branch",
        contact_number: "09170000001",
        address: "Quezon City",
        manager_name: "Ana Cruz",
        manager_email: "demo.manager1@stocknbook.com",
    },
    {
        branch_name: "North Branch",
        contact_number: "09170000002",
        address: "Caloocan City",
        manager_name: "Ben Santos",
        manager_email: "demo.manager2@stocknbook.com",
    },
    {
        branch_name: "South Branch",
        contact_number: "09170000003",
        address: "Parañaque City",
        manager_name: "Carla Reyes",
        manager_email: "demo.manager3@stocknbook.com",
    },
];

const categories = [
    "Balloons",
    "Backdrops",
    "Tables",
    "Chairs",
    "Lights",
    "Flowers",
    "Tableware",
    "Party Favors",
    "Audio",
    "Decorations",
    "Tents",
    "Catering Tools",
];

const productNames = [
    "Latex Balloon Set",
    "Foil Balloon Number",
    "Balloon Arch Kit",
    "Round Table",
    "Rectangular Table",
    "Tiffany Chair",
    "Monoblock Chair",
    "Fairy Lights",
    "LED Par Light",
    "Flower Stand",
    "Artificial Roses",
    "Dessert Stand",
    "Cake Stand",
    "Backdrop Frame",
    "Curtain Backdrop",
    "Table Runner",
    "Table Cloth",
    "Party Hat Set",
    "Loot Bag Set",
    "Speaker Set",
    "Microphone",
    "Tent 10x10",
    "Tent 20x20",
    "Serving Tray",
    "Chafing Dish",
    "Welcome Sign",
    "Acrylic Name Sign",
    "Balloon Pump",
    "Confetti Popper",
    "Centerpiece Set",
];

const eventTypes = [
    "Birthday",
    "Wedding",
    "Debut",
    "Christening",
    "Corporate Event",
    "Anniversary",
    "Graduation",
    "Baby Shower",
];

const customerFirstNames = [
    "Maria",
    "Ana",
    "Carla",
    "Sofia",
    "Mika",
    "Jasmine",
    "Patricia",
    "Angela",
    "Mark",
    "John",
    "Ben",
    "Carlo",
    "Miguel",
    "Paulo",
    "Daniel",
];

const customerLastNames = [
    "Santos",
    "Cruz",
    "Reyes",
    "Garcia",
    "Dela Cruz",
    "Mendoza",
    "Ramos",
    "Torres",
    "Flores",
    "Castillo",
];

const subscriptionPlans = [
    {
        code: "starter",
        name: "Starter",
        label: "Free",
        price: 0,
        inventoryLimit: 50,
        bookingLimit: 20,
        staffLimit: 1,
        features: [
            "Inventory and product catalog",
            "Booking management",
            "Basic POS and sales recording",
            "Up to 50 inventory items",
            "Up to 20 bookings per month",
            "1 owner or administrator account",
            "Basic dashboard overview",
        ],
    },
    {
        code: "business",
        name: "Business",
        label: "Standard",
        price: 499,
        inventoryLimit: 500,
        bookingLimit: null,
        staffLimit: 3,
        features: [
            "Everything included in Starter",
            "Up to 500 inventory items",
            "Unlimited bookings",
            "Up to 3 staff accounts",
            "Low-stock notifications",
            "Sales and booking analytics",
            "Downloadable reports",
            "Complete transaction history",
        ],
    },
    {
        code: "enterprise",
        name: "Enterprise",
        label: "Advanced",
        price: 1299,
        inventoryLimit: 2000,
        bookingLimit: null,
        staffLimit: 10,
        features: [
            "Everything included in Business",
            "Up to 2,000 inventory items",
            "Unlimited bookings",
            "Up to 10 staff accounts",
            "Advanced business analytics",
            "Sales forecasting",
            "Multi-role account access",
            "Extended transaction history",
        ],
    },
];

function pick(list, index) {
    return list[index % list.length];
}

function randomInt(min, max, index) {
    const raw = Math.abs(Math.sin(index + 1) * 10000);
    return Math.floor(raw % (max - min + 1)) + min;
}

function futureDate(daysFromNow) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().slice(0, 10);
}

function pastDate(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().slice(0, 10);
}

function makeCustomerName(index) {
    return `${pick(customerFirstNames, index)} ${pick(customerLastNames, index)}`;
}

function parseJson(value, fallback) {
    if (Array.isArray(value) || (value && typeof value === "object")) {
        return value;
    }

    if (typeof value !== "string" || !value.trim()) {
        return fallback;
    }

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

async function getDemoStore(db, passwordHash) {
    const [existingStores] = await db.execute(
        `SELECT id
         FROM stores
         WHERE email = ? OR slug = ?
         ORDER BY id DESC
         LIMIT 1`,
        [DEMO_STORE_EMAIL, DEMO_STORE_SLUG]
    );

    if (existingStores.length > 0) {
        const storeId = existingStores[0].id;
        console.log(`Using existing demo store. store_id=${storeId}`);
        return storeId;
    }

    const [storeResult] = await db.execute(
        `INSERT INTO stores (store_name, owner_name, email, password, slug)
         VALUES (?, ?, ?, ?, ?)`,
        [
            "Demo Party Store",
            "Demo Owner",
            DEMO_STORE_EMAIL,
            passwordHash,
            DEMO_STORE_SLUG,
        ]
    );

    console.log(`Created demo store. store_id=${storeResult.insertId}`);
    return storeResult.insertId;
}

async function ensureBranchesAndUsers(db, storeId, passwordHash) {
    const branchIds = [];

    for (let branchIndex = 0; branchIndex < branchData.length; branchIndex++) {
        const branch = branchData[branchIndex];
        const branchNumber = branchIndex + 1;
        const managerPermissionSet = managerPermissionSets[branchIndex];

        const [existingBranches] = await db.execute(
            `SELECT id
             FROM branches
             WHERE store_id = ? AND branch_name = ?
             LIMIT 1`,
            [storeId, branch.branch_name]
        );

        let branchId;

        if (existingBranches.length > 0) {
            branchId = existingBranches[0].id;
        } else {
            const [branchResult] = await db.execute(
                `INSERT INTO branches (store_id, branch_name, contact_number, address)
                 VALUES (?, ?, ?, ?)`,
                [
                    storeId,
                    branch.branch_name,
                    branch.contact_number,
                    branch.address,
                ]
            );

            branchId = branchResult.insertId;
        }

        branchIds.push(branchId);

        const [existingManagers] = await db.execute(
            `SELECT id
             FROM managers
             WHERE store_id = ? AND manager_email = ?
             LIMIT 1`,
            [storeId, branch.manager_email]
        );

        let managerId;

        if (existingManagers.length > 0) {
            managerId = existingManagers[0].id;
        } else {
            const [managerResult] = await db.execute(
                `INSERT INTO managers
                    (
                        store_id,
                        branch_id,
                        manager_name,
                        manager_email,
                        password,
                        status,
                        permissions
                    )
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    storeId,
                    branchId,
                    `${branch.manager_name} (${managerPermissionSet.label})`,
                    branch.manager_email,
                    passwordHash,
                    "active",
                    JSON.stringify(managerPermissionSet.permissions),
                ]
            );

            managerId = managerResult.insertId;
        }

        for (let staffIndex = 0; staffIndex < staffPermissionSets.length; staffIndex++) {
            const staffNumber = staffIndex + 1;
            const staffPermissionSet = staffPermissionSets[staffIndex];
            const staffEmail = `demo.staff${branchNumber}-${staffNumber}@stocknbook.com`;

            const [existingStaff] = await db.execute(
                `SELECT id
                 FROM staff
                 WHERE store_id = ? AND staff_email = ?
                 LIMIT 1`,
                [storeId, staffEmail]
            );

            if (existingStaff.length === 0) {
                await db.execute(
                    `INSERT INTO staff
                        (
                            store_id,
                            branch_id,
                            manager_id,
                            staff_name,
                            staff_email,
                            password,
                            status,
                            permissions
                        )
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        storeId,
                        branchId,
                        managerId,
                        `${branch.branch_name} ${staffPermissionSet.label}`,
                        staffEmail,
                        passwordHash,
                        "active",
                        JSON.stringify(staffPermissionSet.permissions),
                    ]
                );
            }
        }
    }

    console.log(`Ensured ${branchIds.length} branches, managers, and staff accounts.`);
    return branchIds;
}

async function ensureCategories(db, storeId) {
    let createdCount = 0;

    for (const categoryName of categories) {
        const [existingCategories] = await db.execute(
            `SELECT id
             FROM categories
             WHERE store_id = ? AND category_name = ?
             LIMIT 1`,
            [storeId, categoryName]
        );

        if (existingCategories.length === 0) {
            await db.execute(
                `INSERT INTO categories (store_id, category_name, description, status)
                 VALUES (?, ?, ?, ?)`,
                [
                    storeId,
                    categoryName,
                    `Demo category for ${categoryName.toLowerCase()} items.`,
                    "active",
                ]
            );

            createdCount += 1;
        }
    }

    console.log(`Ensured ${categories.length} categories (${createdCount} added).`);
}

async function getProducts(db, storeId) {
    const [rows] = await db.execute(
        `SELECT id, name, sales_price AS price
         FROM products
         WHERE store_id = ?
         ORDER BY id ASC`,
        [storeId]
    );

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        price: Number(row.price),
    }));
}

async function ensureProducts(db, storeId, branchIds) {
    let products = await getProducts(db, storeId);
    const existingCount = products.length;

    for (let i = existingCount + 1; i <= TARGET_PRODUCT_COUNT; i++) {
        const category = pick(categories, i);
        const branchId = pick(branchIds, i);
        const baseName = pick(productNames, i);
        const stock = randomInt(2, 150, i);
        const alertLevel = randomInt(5, 20, i);
        const originalPrice = randomInt(80, 3000, i);
        const salesPrice = originalPrice + randomInt(50, 1200, i);
        const hasVariants = i <= 30 ? 1 : 0;

        const [productResult] = await db.execute(
            `INSERT INTO products
                (
                    store_id,
                    branch_id,
                    name,
                    category,
                    stock,
                    alert_level,
                    original_price,
                    sales_price,
                    has_variants
                )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                storeId,
                branchId,
                `${baseName} ${i}`,
                category,
                stock,
                alertLevel,
                originalPrice,
                salesPrice,
                hasVariants,
            ]
        );

        if (hasVariants) {
            await db.execute(
                `INSERT INTO product_variants
                    (
                        product_id,
                        variant_values,
                        stock,
                        alert_level,
                        original_price,
                        sales_price
                    )
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    productResult.insertId,
                    JSON.stringify({
                        color: pick(["Gold", "Silver", "Pink", "Blue", "White"], i),
                        size: pick(["Small", "Medium", "Large"], i),
                    }),
                    randomInt(1, 80, i),
                    randomInt(3, 15, i),
                    originalPrice,
                    salesPrice,
                ]
            );
        }
    }

    products = await getProducts(db, storeId);

    console.log(
        `Ensured ${products.length} products (${Math.max(0, products.length - existingCount)} added).`
    );

    return products;
}

async function getPackages(db, storeId) {
    const [rows] = await db.execute(
        `SELECT id, name, package_price, inclusions
         FROM packages
         WHERE store_id = ?
         ORDER BY id ASC`,
        [storeId]
    );

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        price: Number(row.package_price),
        inclusions: parseJson(row.inclusions, []),
    }));
}

async function ensurePackages(db, storeId, branchIds) {
    let packages = await getPackages(db, storeId);
    const existingCount = packages.length;

    for (let i = existingCount + 1; i <= TARGET_PACKAGE_COUNT; i++) {
        const branchId = pick(branchIds, i);
        const packagePrice = randomInt(3500, 25000, i);
        const originalValue = packagePrice + randomInt(1000, 5000, i);
        const packageName = `${pick(eventTypes, i)} Package ${i}`;

        const inclusions = [
            { item: "Backdrop setup", quantity: 1 },
            { item: "Table and chair setup", quantity: randomInt(10, 50, i) },
            { item: "Balloon decoration", quantity: randomInt(20, 100, i) },
            { item: "Basic lights", quantity: 2 },
        ];

        await db.execute(
            `INSERT INTO packages
                (
                    store_id,
                    branch_id,
                    name,
                    description,
                    original_value,
                    discount_type,
                    discount_value,
                    package_price,
                    duration,
                    status,
                    inclusions
                )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                storeId,
                branchId,
                packageName,
                `Demo ${packageName.toLowerCase()} for event clients.`,
                originalValue,
                "amount",
                originalValue - packagePrice,
                packagePrice,
                "1 day",
                "Active",
                JSON.stringify(inclusions),
            ]
        );
    }

    packages = await getPackages(db, storeId);

    console.log(
        `Ensured ${packages.length} packages (${Math.max(0, packages.length - existingCount)} added).`
    );

    return packages;
}

async function ensureBookings(db, storeId, branchIds, packages) {
    if (packages.length === 0) {
        throw new Error("Cannot create bookings because no packages were found.");
    }

    const [countRows] = await db.execute(
        `SELECT COUNT(*) AS total
         FROM bookings
         WHERE store_id = ?`,
        [storeId]
    );

    const existingCount = Number(countRows[0].total);

    for (let i = existingCount + 1; i <= TARGET_BOOKING_COUNT; i++) {
        const branchId = pick(branchIds, i);
        const selectedPackage = pick(packages, i);
        const eventType = pick(eventTypes, i);
        const bookingType = i % 4 === 0 ? "custom" : "package";

        const bookingStatus =
            i <= 30
                ? "completed"
                : i <= 45
                    ? "cancelled"
                    : pick(["pending", "confirmed"], i);

        const eventDate =
            bookingStatus === "completed" || bookingStatus === "cancelled"
                ? pastDate(randomInt(1, 120, i))
                : futureDate(randomInt(1, 180, i));

        const packagePrice = Number(selectedPackage.price);
        const agreedPrice =
            bookingType === "custom"
                ? packagePrice + randomInt(500, 3000, i)
                : packagePrice;

        const requiredDownPayment =
            bookingStatus === "cancelled"
                ? 0
                : Math.round(agreedPrice * 0.5 * 100) / 100;

        let paymentStatus = "unpaid";
        let amountPaid = 0;
        let balance = agreedPrice;

        if (bookingStatus === "completed") {
            paymentStatus = "paid";
            amountPaid = agreedPrice;
            balance = 0;
        } else if (bookingStatus === "cancelled") {
            paymentStatus = "unpaid";
            amountPaid = 0;
            balance = 0;
        } else if (i % 2 === 0) {
            paymentStatus = "partial";
            amountPaid = requiredDownPayment;
            balance = agreedPrice - amountPaid;
        }

        const customerName = makeCustomerName(i);
        const packageJson = JSON.stringify({
            id: selectedPackage.id,
            name: selectedPackage.name,
            price: packagePrice,
            inclusions: selectedPackage.inclusions,
        });

        await db.execute(
            `INSERT INTO bookings
                (
                    store_id,
                    branch_id,
                    booking_type,
                    name,
                    phone,
                    event_date,
                    event_type,
                    package_name,
                    custom_order,
                    notes,
                    status,
                    booking_reference,
                    package_json,
                    packageJSON,
                    facebook_name,
                    email,
                    event_time,
                    theme,
                    venue,
                    agreed_price,
                    package_price,
                    payment_status,
                    required_down_payment,
                    amount_paid,
                    balance
                )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                storeId,
                branchId,
                bookingType,
                customerName,
                `09${String(170000000 + i).slice(0, 9)}`,
                eventDate,
                eventType,
                selectedPackage.name,
                bookingType === "custom"
                    ? "Custom balloon and backdrop arrangement"
                    : null,
                `Demo booking notes ${i}`,
                bookingStatus,
                `BK-DEMO-${String(i).padStart(5, "0")}`,
                packageJson,
                packageJson,
                makeCustomerName(i + 2),
                `customer${i}@example.com`,
                pick(["9:00 AM", "1:00 PM", "3:00 PM", "6:00 PM"], i),
                pick(
                    [
                        "Elegant Gold",
                        "Pastel Pink",
                        "Rustic Garden",
                        "Modern Minimalist",
                    ],
                    i
                ),
                `${pick(
                    ["Quezon City", "Makati", "Pasig", "Taguig", "Parañaque"],
                    i
                )} Event Venue`,
                agreedPrice,
                packagePrice,
                paymentStatus,
                requiredDownPayment,
                amountPaid,
                balance,
            ]
        );
    }

    const [finalCountRows] = await db.execute(
        `SELECT COUNT(*) AS total
         FROM bookings
         WHERE store_id = ?`,
        [storeId]
    );

    const finalCount = Number(finalCountRows[0].total);

    console.log(
        `Ensured ${finalCount} bookings (${Math.max(0, finalCount - existingCount)} added).`
    );
}

async function ensureOrders(db, storeId, products) {
    if (products.length < 2) {
        throw new Error("Cannot create orders because fewer than two products were found.");
    }

    const [countRows] = await db.execute(
        `SELECT COUNT(*) AS total
         FROM orders
         WHERE store_id = ?`,
        [storeId]
    );

    const existingCount = Number(countRows[0].total);

    for (let i = existingCount + 1; i <= TARGET_ORDER_COUNT; i++) {
        const orderId = `ORD-DEMO-${String(i).padStart(5, "0")}`;
        const firstProduct = pick(products, i);
        const secondProduct = pick(products, i + 15);
        const firstQty = randomInt(1, 5, i);
        const secondQty = randomInt(1, 5, i + 20);
        const total =
            Number(firstProduct.price) * firstQty +
            Number(secondProduct.price) * secondQty;

        await db.execute(
            `INSERT INTO orders
                (order_id, store_id, customer_name, item, total, order_date)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                orderId,
                storeId,
                makeCustomerName(i + 5),
                `${firstProduct.name}, ${secondProduct.name}`,
                total,
                pastDate(randomInt(0, 120, i)),
            ]
        );

        await db.execute(
            `INSERT INTO order_items
                (order_id, product_name, quantity, unit_price)
             VALUES (?, ?, ?, ?)`,
            [orderId, firstProduct.name, firstQty, firstProduct.price]
        );

        await db.execute(
            `INSERT INTO order_items
                (order_id, product_name, quantity, unit_price)
             VALUES (?, ?, ?, ?)`,
            [orderId, secondProduct.name, secondQty, secondProduct.price]
        );
    }

    const [finalCountRows] = await db.execute(
        `SELECT COUNT(*) AS total
         FROM orders
         WHERE store_id = ?`,
        [storeId]
    );

    const finalCount = Number(finalCountRows[0].total);

    console.log(
        `Ensured ${finalCount} orders (${Math.max(0, finalCount - existingCount)} added).`
    );
}

async function ensureSubscriptionTables(db) {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS subscription_plans (
            id INT AUTO_INCREMENT PRIMARY KEY,
            plan_code VARCHAR(30) NOT NULL UNIQUE,
            plan_name VARCHAR(50) NOT NULL,
            plan_label VARCHAR(50) NOT NULL,
            monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            inventory_limit INT NULL,
            booking_limit INT NULL,
            staff_limit INT NOT NULL DEFAULT 1,
            features JSON NULL,
            is_active TINYINT NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS subscriptions (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            store_id INT NOT NULL,
            plan_id INT NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'pending_verification',
            amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            billing_period VARCHAR(20) NOT NULL DEFAULT 'monthly',
            payment_reference VARCHAR(100) NULL,
            payment_date DATE NULL,
            proof_path VARCHAR(500) NULL,
            requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            approved_at DATETIME NULL,
            starts_at DATE NULL,
            ends_at DATE NULL,
            admin_notes TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_subscriptions_store (store_id),
            INDEX idx_subscriptions_plan (plan_id),
            INDEX idx_subscriptions_status (status)
        )
    `);
}

async function ensureSubscriptionPlans(db) {
    for (const plan of subscriptionPlans) {
        const [existingPlans] = await db.execute(
            `SELECT id
             FROM subscription_plans
             WHERE plan_code = ?
             LIMIT 1`,
            [plan.code]
        );

        if (existingPlans.length === 0) {
            await db.execute(
                `INSERT INTO subscription_plans
                    (
                        plan_code,
                        plan_name,
                        plan_label,
                        monthly_price,
                        inventory_limit,
                        booking_limit,
                        staff_limit,
                        features,
                        is_active
                    )
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    plan.code,
                    plan.name,
                    plan.label,
                    plan.price,
                    plan.inventoryLimit,
                    plan.bookingLimit,
                    plan.staffLimit,
                    JSON.stringify(plan.features),
                    1,
                ]
            );
        } else {
            await db.execute(
                `UPDATE subscription_plans
                 SET
                    plan_name = ?,
                    plan_label = ?,
                    monthly_price = ?,
                    inventory_limit = ?,
                    booking_limit = ?,
                    staff_limit = ?,
                    features = ?,
                    is_active = 1
                 WHERE plan_code = ?`,
                [
                    plan.name,
                    plan.label,
                    plan.price,
                    plan.inventoryLimit,
                    plan.bookingLimit,
                    plan.staffLimit,
                    JSON.stringify(plan.features),
                    plan.code,
                ]
            );
        }
    }
}

async function ensureSubscriptions(db, storeId) {
    await ensureSubscriptionTables(db);
    await ensureSubscriptionPlans(db);

    const [planRows] = await db.execute(
        `SELECT id, plan_code, monthly_price
         FROM subscription_plans
         WHERE plan_code IN ('starter', 'business')`
    );

    const planByCode = Object.fromEntries(
        planRows.map((plan) => [plan.plan_code, plan])
    );

    if (!planByCode.starter || !planByCode.business) {
        throw new Error("Starter and Business subscription plans are required.");
    }

    const [activeStarterRows] = await db.execute(
        `SELECT id
         FROM subscriptions
         WHERE store_id = ? AND plan_id = ? AND status = 'active'
         LIMIT 1`,
        [storeId, planByCode.starter.id]
    );

    if (activeStarterRows.length === 0) {
        await db.execute(
            `INSERT INTO subscriptions
                (
                    store_id,
                    plan_id,
                    status,
                    amount,
                    billing_period,
                    starts_at,
                    ends_at,
                    admin_notes
                )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                storeId,
                planByCode.starter.id,
                "active",
                Number(planByCode.starter.monthly_price),
                "monthly",
                pastDate(10),
                futureDate(20),
                "Starter plan automatically activated for Demo Party Store.",
            ]
        );
    }

    const [pendingBusinessRows] = await db.execute(
        `SELECT id
         FROM subscriptions
         WHERE store_id = ? AND plan_id = ? AND status = 'pending_verification'
         LIMIT 1`,
        [storeId, planByCode.business.id]
    );

    if (pendingBusinessRows.length === 0) {
        await db.execute(
            `INSERT INTO subscriptions
                (
                    store_id,
                    plan_id,
                    status,
                    amount,
                    billing_period,
                    payment_reference,
                    payment_date,
                    proof_path,
                    admin_notes
                )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                storeId,
                planByCode.business.id,
                "pending_verification",
                Number(planByCode.business.monthly_price),
                "monthly",
                `GCASH-DEMO-${storeId}-001`,
                pastDate(1),
                "uploads/subscriptions/demo-business-payment-proof.png",
                "Demo Business subscription request awaiting administrator verification.",
            ]
        );
    }

    const [subscriptionCountRows] = await db.execute(
        `SELECT COUNT(*) AS total
         FROM subscriptions
         WHERE store_id = ?`,
        [storeId]
    );

    console.log(
        `Ensured ${subscriptionCountRows[0].total} subscription record(s) for the demo store.`
    );
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

    try {
        await db.beginTransaction();

        const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
        const storeId = await getDemoStore(db, passwordHash);

        const branchIds = await ensureBranchesAndUsers(db, storeId, passwordHash);
        await ensureCategories(db, storeId);

        const products = await ensureProducts(db, storeId, branchIds);
        const packages = await ensurePackages(db, storeId, branchIds);

        await ensureBookings(db, storeId, branchIds, packages);
        await ensureOrders(db, storeId, products);
        await ensureSubscriptions(db, storeId);

        await db.commit();

        console.log("");
        console.log("Demo data setup completed successfully.");
        console.log(`Demo store ID: ${storeId}`);
        console.log(`Owner login: ${DEMO_STORE_EMAIL}`);
        console.log(`Password for all demo accounts: ${DEMO_PASSWORD}`);
    } catch (error) {
        await db.rollback();
        throw error;
    } finally {
        await db.end();
    }
}

main().catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
});
