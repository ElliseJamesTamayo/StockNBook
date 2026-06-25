import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/*
  Development version: returns sample data for the Reports UI.
  Before production, replace the sample-data builders with database queries and
  obtain role, branch, and permissions from a verified server-side session.
*/

const ALL_BRANCHES = "All branches" as const;
type UserRole = "owner" | "manager" | "staff";
type BookingStatus =
    | "pending"
    | "confirmed"
    | "preparing"
    | "cancelled"
    | "completed";

type ResolvedDateRange = {
    month: string;
    startDate: string;
    endDate: string;
    label: string;
    isCustomRange: boolean;
};

type Branch = {
    id: string;
    code: string;
    name: string;
    location: string;
    manager: string;
    contact: string;
    multiplier: number;
};

type SaleRecord = {
    id: string;
    reference: string;
    date: string;
    branch: string;
    customer: string;
    type: string;
    product: string;
    category: string;
    quantity: number;
    amount: number;
    status: "Completed";
};

type BookingRecord = {
    id: string;
    reference: string;
    date: string;
    eventDate: string;
    branch: string;
    customer: string;
    packageName: string;
    status: BookingStatus;
    statusLabel: string;
    amount: number;
};

type InventoryVariant = {
    id: string;
    sku?: string;
    name: string;
    stock: number;
    reorderLevel: number;
    costPrice?: number;
    salesPrice?: number;
    status: "In Stock" | "Low Stock" | "Out of Stock";
};

type InventoryItem = {
    id: string;
    sku: string;
    product: string;
    category: string;
    branch: string;
    stock: number;
    reorderLevel: number;
    costPrice?: number;
    salesPrice?: number;
    variants?: InventoryVariant[];
    status: "In Stock" | "Low Stock" | "Out of Stock";
};

type RestockRecord = {
    id: string;
    date: string;
    product: string;
    variantName?: string;
    branch: string;
    quantityAdded: number;
    stockBefore: number;
    currentStock: number;
    receivedBy: string;
    reference: string;
    notes?: string;
};

type SectionAccess = {
    branchDetails: boolean;
    inventory: boolean;
    sales: boolean;
    stockAlerts: boolean;
    bookings: boolean;
};

const BRANCHES: Branch[] = [
    {
        id: "branch-makati",
        code: "MKT",
        name: "Makati Branch",
        location: "Makati City",
        manager: "Branch Manager",
        contact: "0917-000-1001",
        multiplier: 1,
    },
    {
        id: "branch-pasay",
        code: "PSY",
        name: "Pasay Branch",
        location: "Pasay City",
        manager: "Branch Manager",
        contact: "0917-000-1002",
        multiplier: 1.35,
    },
    {
        id: "branch-paranaque",
        code: "PRQ",
        name: "Parañaque Branch",
        location: "Parañaque City",
        manager: "Branch Manager",
        contact: "0917-000-1003",
        multiplier: 1.15,
    },
];

function getCurrentMonth() {
    return new Date().toISOString().slice(0, 7);
}

function isValidMonth(value: string) {
    return /^\d{4}-\d{2}$/.test(value);
}

function isValidDate(value: string | null): value is string {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    return !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
}

function toDateString(date: Date) {
    return date.toISOString().slice(0, 10);
}

function getMonthLabel(month: string) {
    return new Intl.DateTimeFormat("en-PH", {
        month: "long",
        year: "numeric",
    }).format(new Date(`${month}-01T00:00:00`));
}

function getMonthRange(month: string) {
    const [yearText, monthText] = month.split("-");
    const year = Number(yearText);
    const monthIndex = Number(monthText) - 1;
    const start = new Date(Date.UTC(year, monthIndex, 1));
    const end = new Date(Date.UTC(year, monthIndex + 1, 0));

    return { startDate: toDateString(start), endDate: toDateString(end) };
}

function formatDateRangeLabel(startDate: string, endDate: string) {
    const formatter = new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

    const start = formatter.format(new Date(`${startDate}T00:00:00`));
    const end = formatter.format(new Date(`${endDate}T00:00:00`));
    return start === end ? start : `${start} – ${end}`;
}

function resolveDateRange(
    searchParams: URLSearchParams
): ResolvedDateRange {
    const requestedMonth = searchParams.get("month") || getCurrentMonth();
    const month = isValidMonth(requestedMonth)
        ? requestedMonth
        : getCurrentMonth();

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (isValidDate(startDate) && isValidDate(endDate) && startDate <= endDate) {
        return {
            month,
            startDate,
            endDate,
            label: formatDateRangeLabel(startDate, endDate),
            isCustomRange: true,
        };
    }

    const range = getMonthRange(month);
    return {
        month,
        ...range,
        label: getMonthLabel(month),
        isCustomRange: false,
    };
}

function normalizeRole(value: string | null): UserRole {
    const role = (value || "manager").trim().toLowerCase();
    if (role === "owner") return "owner";
    if (role === "staff") return "staff";
    return "manager";
}

function normalizeBranchName(value: string | null) {
    if (!value) return null;
    const normalized = value.trim().toLowerCase();

    if (normalized === ALL_BRANCHES.toLowerCase()) return ALL_BRANCHES;

    return (
        BRANCHES.find((branch) => branch.name.toLowerCase() === normalized)
            ?.name ?? null
    );
}

function parsePermissions(value: string | null) {
    return new Set(
        (value || "")
            .split(",")
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean)
    );
}

function hasAnyPermission(permissions: Set<string>, aliases: string[]) {
    return aliases.some((alias) => permissions.has(alias));
}

function getSectionAccess(
    role: UserRole,
    permissions: Set<string>,
    hasExplicitPermissions: boolean
): SectionAccess {
    // Owner and manager have full access within their allowed branch scope.
    // For staff without an explicit permissions string, keep access open during UI development.
    if (role !== "staff" || !hasExplicitPermissions) {
        return {
            branchDetails: true,
            inventory: true,
            sales: true,
            stockAlerts: true,
            bookings: true,
        };
    }

    const fullReports = hasAnyPermission(permissions, [
        "reports",
        "reports:view",
        "reports:all",
    ]);

    const canUse = (aliases: string[]) =>
        fullReports || hasAnyPermission(permissions, aliases);

    return {
        branchDetails: canUse([
            "reports:branches",
            "reports:branch-details",
            "branches",
            "branches:view",
        ]),
        inventory: canUse([
            "reports:inventory",
            "inventory",
            "inventory:view",
        ]),
        sales: canUse([
            "reports:sales",
            "sales",
            "sales:view",
            "pos",
            "pos:view",
        ]),
        stockAlerts: canUse([
            "reports:stock-alerts",
            "reports:inventory",
            "inventory",
            "inventory:view",
        ]),
        bookings: canUse([
            "reports:bookings",
            "bookings",
            "bookings:view",
        ]),
    };
}

function getRequestContext(request: NextRequest, searchParams: URLSearchParams) {
    /*
      Headers are ready for server middleware/session integration later.
      Query parameters are only a temporary convenience for sample data.
    */
    const role = normalizeRole(
        request.headers.get("x-user-role") || searchParams.get("role")
    );

    const assignedBranch =
        normalizeBranchName(
            request.headers.get("x-assigned-branch") ||
            searchParams.get("assignedBranch")
        ) || BRANCHES[0].name;

    const rawPermissions =
        request.headers.get("x-user-permissions") ||
        searchParams.get("permissions");

    const requestedBranch =
        normalizeBranchName(searchParams.get("branch")) ||
        (role === "owner" ? ALL_BRANCHES : assignedBranch);

    return {
        role,
        assignedBranch,
        selectedBranch: role === "owner" ? requestedBranch : assignedBranch,
        permissions: parsePermissions(rawPermissions),
        hasExplicitPermissions: Boolean(rawPermissions?.trim()),
    };
}

function sampleDateAtPercent(startDate: string, endDate: string, percent: number) {
    const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
    const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
    const day = 24 * 60 * 60 * 1000;
    const totalDays = Math.max(0, Math.floor((end - start) / day));
    const offset = Math.round((totalDays * percent) / 100);

    return toDateString(new Date(start + offset * day));
}

function bookingStatusLabel(status: BookingStatus) {
    return status.charAt(0).toUpperCase() + status.slice(1);
}

function inventoryStatus(stock: number, reorderLevel: number): InventoryItem["status"] {
    if (stock <= 0) return "Out of Stock";
    if (stock <= reorderLevel) return "Low Stock";
    return "In Stock";
}

function buildSampleSales(
    branches: Branch[],
    startDate: string,
    endDate: string
): SaleRecord[] {
    const templates = [
        { product: "Balloon Pump", category: "Accessories", quantity: 8, unitPrice: 80, position: 15 },
        { product: "Party Hat", category: "Party Essentials", quantity: 5, unitPrice: 65, position: 38 },
        { product: "Table Cover / Small", category: "Tableware", quantity: 2, unitPrice: 150, position: 58 },
        { product: "Gold Balloon", category: "Balloons", quantity: 12, unitPrice: 25, position: 82 },
    ];

    return branches.flatMap((branch) =>
        templates.map((item, index) => {
            const date = sampleDateAtPercent(startDate, endDate, item.position);
            return {
                id: `sale-${branch.code}-${index + 1}`,
                reference: `POS-${branch.code}-${date.replaceAll("-", "")}-${String(index + 1).padStart(3, "0")}`,
                date,
                branch: branch.name,
                customer: "Walk-in Customer",
                type: "POS Sale",
                product: item.product,
                category: item.category,
                quantity: item.quantity,
                amount: Math.round(item.quantity * item.unitPrice * branch.multiplier),
                status: "Completed" as const,
            };
        })
    );
}

function buildSampleBookings(
    branches: Branch[],
    startDate: string,
    endDate: string
): BookingRecord[] {
    const templates: Array<{
        customer: string;
        packageName: string;
        status: BookingStatus;
        amount: number;
        position: number;
        eventPosition: number;
    }> = [
        { customer: "Maria Santos", packageName: "Birthday Balloon Package", status: "pending", amount: 1200, position: 12, eventPosition: 30 },
        { customer: "John Reyes", packageName: "Baby Shower Package", status: "confirmed", amount: 2500, position: 28, eventPosition: 50 },
        { customer: "Anne Cruz", packageName: "Wedding Backdrop Package", status: "preparing", amount: 4200, position: 46, eventPosition: 72 },
        { customer: "Paul Garcia", packageName: "Kids Party Package", status: "cancelled", amount: 1800, position: 64, eventPosition: 82 },
        { customer: "Liza Flores", packageName: "Corporate Event Package", status: "completed", amount: 3500, position: 84, eventPosition: 90 },
    ];

    return branches.flatMap((branch) =>
        templates.map((item, index) => {
            const date = sampleDateAtPercent(startDate, endDate, item.position);
            return {
                id: `booking-${branch.code}-${index + 1}`,
                reference: `BKG-${branch.code}-${date.replaceAll("-", "")}-${String(index + 1).padStart(3, "0")}`,
                date,
                eventDate: sampleDateAtPercent(startDate, endDate, item.eventPosition),
                branch: branch.name,
                customer: item.customer,
                packageName: item.packageName,
                status: item.status,
                statusLabel: bookingStatusLabel(item.status),
                amount: Math.round(item.amount * branch.multiplier),
            };
        })
    );
}

function buildSampleInventory(branches: Branch[]): InventoryItem[] {
    type VariantTemplate = {
        sku: string;
        name: string;
        stock: number;
        reorderLevel: number;
        costPrice: number;
        salesPrice: number;
    };

    type InventoryTemplate = {
        sku: string;
        product: string;
        category: string;
        stock?: number;
        reorderLevel: number;
        costPrice?: number;
        salesPrice?: number;
        variants?: VariantTemplate[];
    };

    const templates: InventoryTemplate[] = [
        {
            sku: "BAL-GLD",
            product: "Gold Balloon",
            category: "Balloons",
            reorderLevel: 55,
            variants: [
                { sku: "GLD-SM-PC", name: "small, piece", stock: 50, reorderLevel: 20, costPrice: 10, salesPrice: 120 },
                { sku: "GLD-LG-PC", name: "large, piece", stock: 23, reorderLevel: 15, costPrice: 15, salesPrice: 180 },
                { sku: "GLD-SM-PK", name: "small, pack", stock: 14, reorderLevel: 10, costPrice: 20, salesPrice: 300 },
                { sku: "GLD-LG-PK", name: "large, pack", stock: 15, reorderLevel: 10, costPrice: 25, salesPrice: 350 },
            ],
        },
        {
            sku: "BCK-TAE",
            product: "Tae",
            category: "Backdrops",
            reorderLevel: 60,
            costPrice: 1000,
            variants: [
                { sku: "TAE-SM", name: "small", stock: 45, reorderLevel: 30, costPrice: 1000, salesPrice: 200 },
                { sku: "TAE-LG", name: "large", stock: 45, reorderLevel: 30, costPrice: 1000, salesPrice: 300 },
            ],
        },
        {
            sku: "LIN-TCV",
            product: "Table Cover",
            category: "Linens & Covers",
            reorderLevel: 40,
            variants: [
                { sku: "TCV-SM", name: "small", stock: 94, reorderLevel: 20, costPrice: 200, salesPrice: 400 },
                { sku: "TCV-LG", name: "large", stock: 99, reorderLevel: 20, costPrice: 300, salesPrice: 500 },
            ],
        },
        {
            sku: "DEC-BP",
            product: "Balloon Pump",
            category: "Decorations",
            stock: 0,
            reorderLevel: 5,
            costPrice: 120,
            salesPrice: 180,
        },
        {
            sku: "CDS-CT",
            product: "Cake Topper",
            category: "Cake & Desserts",
            stock: 30,
            reorderLevel: 8,
            costPrice: 25,
            salesPrice: 40,
        },
        {
            sku: "CSP-PH",
            product: "Party Hat",
            category: "Costumes & Props",
            stock: 38,
            reorderLevel: 10,
            costPrice: 10,
            salesPrice: 15,
        },
        {
            sku: "BAL-BLK",
            product: "Black Balloon",
            category: "Balloons",
            reorderLevel: 55,
            variants: [
                { sku: "BLK-SM-PC", name: "small, piece", stock: 50, reorderLevel: 20, costPrice: 10, salesPrice: 12 },
                { sku: "BLK-LG-PC", name: "large, piece", stock: 25, reorderLevel: 15, costPrice: 15, salesPrice: 20 },
                { sku: "BLK-SM-PK", name: "small, pack", stock: 18, reorderLevel: 10, costPrice: 20, salesPrice: 28 },
                { sku: "BLK-LG-PK", name: "large, pack", stock: 17, reorderLevel: 10, costPrice: 25, salesPrice: 35 },
            ],
        },
    ];

    return branches.flatMap((branch) =>
        templates.map((item, itemIndex) => {
            const variants = (item.variants || []).map((variant) => ({
                id: `variant-${branch.code}-${itemIndex + 1}-${variant.sku}`,
                sku: `${variant.sku}-${branch.code}`,
                name: variant.name,
                stock: variant.stock,
                reorderLevel: variant.reorderLevel,
                costPrice: variant.costPrice,
                salesPrice: variant.salesPrice,
                status: inventoryStatus(variant.stock, variant.reorderLevel),
            }));

            const stock =
                variants.length > 0
                    ? variants.reduce((total, variant) => total + variant.stock, 0)
                    : Math.max(0, item.stock || 0);

            return {
                id: `inventory-${branch.code}-${itemIndex + 1}`,
                sku: `${item.sku}-${branch.code}`,
                product: item.product,
                category: item.category,
                branch: branch.name,
                stock,
                reorderLevel: item.reorderLevel,
                costPrice: item.costPrice,
                salesPrice: item.salesPrice,
                variants: variants.length > 0 ? variants : undefined,
                status: inventoryStatus(stock, item.reorderLevel),
            };
        })
    );
}

function buildSampleRestockHistory(
    branches: Branch[],
    startDate: string,
    endDate: string
): RestockRecord[] {
    const templates = [
        {
            product: "Gold Balloon",
            variantName: "small, piece",
            quantityAdded: 30,
            stockBefore: 20,
            currentStock: 50,
            receivedBy: "Shiela Maningo",
            position: 78,
            notes: "Restocked to meet the reorder level for the small-piece variant.",
        },
        {
            product: "LED Lights",
            quantityAdded: 30,
            stockBefore: 55,
            currentStock: 85,
            receivedBy: "Ash",
            position: 58,
            notes: "Restocked after a low-stock alert.",
        },
        {
            product: "Party Hats",
            quantityAdded: 50,
            stockBefore: 90,
            currentStock: 140,
            receivedBy: "Ellise Tamayo",
            position: 36,
            notes: "Added stock for upcoming birthday package reservations.",
        },
        {
            product: "Table Covers",
            quantityAdded: 20,
            stockBefore: 40,
            currentStock: 60,
            receivedBy: "Mark Santos",
            position: 18,
            notes: "Regular branch replenishment.",
        },
    ];

    return branches.flatMap((branch) =>
        templates.map((item, index) => {
            const date = sampleDateAtPercent(startDate, endDate, item.position);

            return {
                id: `restock-${branch.code}-${index + 1}`,
                date,
                product: item.product,
                variantName: item.variantName,
                branch: branch.name,
                quantityAdded: item.quantityAdded,
                stockBefore: item.stockBefore,
                currentStock: item.currentStock,
                receivedBy: item.receivedBy,
                reference: `RST-${branch.code}-${date.replaceAll("-", "")}-${String(index + 1).padStart(3, "0")}`,
                notes: item.notes,
            };
        })
    );
}

function sumAmounts(items: Array<{ amount: number }>) {
    return items.reduce((total, item) => total + item.amount, 0);
}

function sortByDateDescending<T extends { date: string }>(items: T[]) {
    return [...items].sort((a, b) => b.date.localeCompare(a.date));
}

function buildWeeklyTrend(sales: SaleRecord[]) {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const values: Record<string, number> = {
        Mon: 0,
        Tue: 0,
        Wed: 0,
        Thu: 0,
        Fri: 0,
        Sat: 0,
        Sun: 0,
    };

    for (const sale of sales) {
        const day = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(
            new Date(`${sale.date}T00:00:00`)
        );
        if (day in values) values[day] += sale.amount;
    }

    return days.map((day) => ({ day, value: values[day] }));
}

function buildTopProducts(sales: SaleRecord[]) {
    const products = new Map<string, { product: string; category: string; sold: number; revenue: number }>();

    for (const sale of sales) {
        const current = products.get(sale.product) || {
            product: sale.product,
            category: sale.category,
            sold: 0,
            revenue: 0,
        };
        current.sold += sale.quantity;
        current.revenue += sale.amount;
        products.set(sale.product, current);
    }

    return Array.from(products.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
}

function buildCategorySales(sales: SaleRecord[]) {
    const totalSales = sumAmounts(sales);
    const categories = new Map<string, number>();

    for (const sale of sales) {
        categories.set(sale.category, (categories.get(sale.category) || 0) + sale.amount);
    }

    return Array.from(categories.entries())
        .map(([category, amount]) => ({
            category,
            amount,
            percentage: totalSales > 0 ? Number(((amount / totalSales) * 100).toFixed(1)) : 0,
        }))
        .sort((a, b) => b.amount - a.amount);
}

function buildBookingSummary(bookings: BookingRecord[]) {
    const count: Record<BookingStatus, number> = {
        pending: 0,
        confirmed: 0,
        preparing: 0,
        cancelled: 0,
        completed: 0,
    };

    for (const booking of bookings) count[booking.status] += 1;

    return {
        totalBookings: bookings.length,
        pending: count.pending,
        confirmed: count.confirmed,
        preparing: count.preparing,
        cancelled: count.cancelled,
        completed: count.completed,
    };
}

function buildBranchSummaries(
    branches: Branch[],
    inventory: InventoryItem[],
    sales: SaleRecord[],
    bookings: BookingRecord[]
) {
    return branches.map((branch) => {
        const branchInventory = inventory.filter((item) => item.branch === branch.name);
        const branchSales = sales.filter((item) => item.branch === branch.name);
        const branchBookings = bookings.filter((item) => item.branch === branch.name);

        return {
            id: branch.id,
            name: branch.name,
            location: branch.location,
            manager: branch.manager,
            contact: branch.contact,
            grossSales: sumAmounts(branchSales),
            bookingRevenue: sumAmounts(branchBookings.filter((item) => item.status !== "cancelled")),
            transactionCount: branchSales.length,
            inventoryItemCount: branchInventory.length,
            lowStockCount: branchInventory.filter((item) => item.status === "Low Stock").length,
            outOfStockCount: branchInventory.filter((item) => item.status === "Out of Stock").length,
            bookingSummary: buildBookingSummary(branchBookings),
        };
    });
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const { month, startDate, endDate, label, isCustomRange } = resolveDateRange(searchParams);

        const {
            role,
            assignedBranch,
            selectedBranch,
            permissions,
            hasExplicitPermissions,
        } = getRequestContext(request, searchParams);

        const access = getSectionAccess(role, permissions, hasExplicitPermissions);

        const scopedBranches =
            selectedBranch === ALL_BRANCHES
                ? BRANCHES
                : BRANCHES.filter((branch) => branch.name === selectedBranch);

        const allSales = buildSampleSales(scopedBranches, startDate, endDate);
        const allBookings = buildSampleBookings(scopedBranches, startDate, endDate);
        const allInventory = buildSampleInventory(scopedBranches);
        const allRestocks = buildSampleRestockHistory(
            scopedBranches,
            startDate,
            endDate
        );

        const visibleSales = access.sales ? sortByDateDescending(allSales) : [];
        const visibleBookings = access.bookings ? sortByDateDescending(allBookings) : [];
        const visibleInventory = access.inventory ? allInventory : [];
        const visibleRestocks = access.inventory
            ? sortByDateDescending(allRestocks)
            : [];

        const lowStockItems = access.stockAlerts
            ? allInventory.filter((item) => item.status === "Low Stock")
            : [];

        const outOfStockItems = access.stockAlerts
            ? allInventory.filter((item) => item.status === "Out of Stock")
            : [];

        const bookingSummary = access.bookings
            ? buildBookingSummary(visibleBookings)
            : {
                totalBookings: 0,
                pending: 0,
                confirmed: 0,
                preparing: 0,
                cancelled: 0,
                completed: 0,
            };

        const grossSales = access.sales ? sumAmounts(visibleSales) : 0;
        const bookingRevenue = access.bookings
            ? sumAmounts(visibleBookings.filter((item) => item.status !== "cancelled"))
            : 0;

        const branchSummaries = buildBranchSummaries(
            scopedBranches,
            allInventory,
            allSales,
            allBookings
        );

        const branchDetails =
            selectedBranch === ALL_BRANCHES
                ? null
                : branchSummaries.find((branch) => branch.name === selectedBranch) || null;

        return NextResponse.json({
            success: true,
            data: {
                // Existing fields: your present reports/page.tsx can continue using these.
                branch: selectedBranch,
                month,
                monthLabel: label,
                isSampleData: true,

                summary: {
                    grossSales,
                    bookingRevenue,
                    totalTransactions: visibleSales.length,
                    averageOrderValue:
                        visibleSales.length > 0 ? Math.round(grossSales / visibleSales.length) : 0,
                },

                bookingSummary,
                weeklyTrend: access.sales ? buildWeeklyTrend(visibleSales) : [],
                topProducts: access.sales ? buildTopProducts(visibleSales) : [],
                categorySales: access.sales ? buildCategorySales(visibleSales) : [],
                inventoryAlerts: access.stockAlerts
                    ? [...outOfStockItems, ...lowStockItems]
                    : [],
                recentTransactions: visibleSales.slice(0, 10),

                // New fields for owner, manager, and staff report views.
                dateRange: {
                    startDate,
                    endDate,
                    isCustomRange,
                },

                access: {
                    role,
                    assignedBranch,
                    selectedBranch,
                    branchLocked: role !== "owner",
                    canSelectAllBranches: role === "owner",
                    sections: access,
                },

                branchOptions:
                    role === "owner"
                        ? [ALL_BRANCHES, ...BRANCHES.map((branch) => branch.name)]
                        : [assignedBranch],

                // Owner: all selected branches. Manager: assigned branch only.
                // Staff: returned only when the branch-details permission is granted.
                branches: access.branchDetails ? branchSummaries : [],
                branchDetails: access.branchDetails ? branchDetails : null,

                // Inventory list and stock lists for the allowed branch scope.
                inventoryList: visibleInventory,
                lowStockItems,
                outOfStockItems,
                restockHistory: visibleRestocks,

                // Sales list for the allowed branch scope.
                salesList: visibleSales,

                // Booking list includes pending, confirmed, preparing, cancelled, and completed.
                bookingList: visibleBookings,
            },
        });
    } catch (error) {
        console.error("Reports API error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Unable to generate the reports.",
            },
            { status: 500 }
        );
    }
}
