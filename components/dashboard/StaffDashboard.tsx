"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useInventoryController } from "@/hooks/useInventory";
import {
    InventoryDialogs,
    type Product as InventoryProduct,
} from "@/components/inventory/_shared";

type Product = {
    id: number;
    branchId?: number | null;
    branch_id?: number | null;
    name: string;
    category: string;
    stock: number;
    alertLevel: number;
    alert_level?: number;
    originalPrice: number;
    original_price?: number;
    salesPrice: number;
    sales_price?: number;
    hasVariants?: boolean;
};

type ProductApiRaw = {
    id: number | string;
    branchId?: number | string | null;
    branch_id?: number | string | null;
    name: string;
    category?: string;
    stock?: number | string;
    alertLevel?: number | string;
    alert_level?: number | string;
    originalPrice?: number | string;
    original_price?: number | string;
    salesPrice?: number | string;
    sales_price?: number | string;
    hasVariants?: boolean;
    has_variants?: boolean;
};

type Order = {
    id?: string;
    orderId?: string;
    branchId?: number | null;
    branch_id?: number | null;
    total?: number;
    date?: string;
    orderDate?: string;
    createdAt?: string;
    item?: string;
    items?: {
        name?: string;
        quantity?: number;
    }[];
};

type OrderApiRaw = {
    id?: string;
    orderId?: string;
    order_id?: string;
    branchId?: number | string | null;
    branch_id?: number | string | null;
    total?: number | string;
    date?: string;
    orderDate?: string;
    order_date?: string;
    createdAt?: string;
    created_at?: string;
    item?: string;
    items?: {
        name?: string;
        quantity?: number;
    }[];
};

type Booking = {
    id: number;
    branchId?: number | null;
    branch_id?: number | null;
    date: string;
    name: string;
    status?: string;
    packageName?: string;
    eventName?: string;
};

type BookingApiRaw = {
    id?: number | string;
    booking_id?: number | string;
    branchId?: number | string | null;
    branch_id?: number | string | null;
    date?: string;
    event_date?: string;
    name?: string;
    customer_name?: string;
    status?: string;
    packageName?: string;
    package_name?: string;
    package?: string;
    package_title?: string;
    service_name?: string;
    eventName?: string;
    event_name?: string;
    event?: string;
    event_type?: string;
};

const STORAGE_KEY = "stocknbook_inventory_products";
const ORDERS_KEY = "stocknbook_orders";

function getSavedItem(key: string) {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem(key) || localStorage.getItem(key) || "";
}

function getSavedJson<T>(key: string, fallback: T): T {
    try {
        if (typeof window === "undefined") return fallback;

        const raw =
            sessionStorage.getItem(key) ||
            localStorage.getItem(key) ||
            "";

        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
}

function getSavedPermissions() {
    try {
        return JSON.parse(
            sessionStorage.getItem("permissions") ||
            localStorage.getItem("permissions") ||
            "{}"
        );
    } catch {
        return {};
    }
}

function getUserValue(user: unknown, key: string) {
    if (!user || typeof user !== "object") return "";
    return String((user as Record<string, unknown>)[key] ?? "");
}

function mapProduct(product: ProductApiRaw): Product {
    const rawBranchId = product.branchId ?? product.branch_id ?? null;

    return {
        id: Number(product.id),
        branchId: rawBranchId ? Number(rawBranchId) : null,
        branch_id: rawBranchId ? Number(rawBranchId) : null,
        name: String(product.name ?? ""),
        category: String(product.category ?? ""),
        stock: Number(product.stock ?? 0),
        alertLevel: Number(product.alertLevel ?? product.alert_level ?? 0),
        alert_level: Number(product.alertLevel ?? product.alert_level ?? 0),
        originalPrice: Number(
            product.originalPrice ?? product.original_price ?? 0
        ),
        original_price: Number(
            product.originalPrice ?? product.original_price ?? 0
        ),
        salesPrice: Number(product.salesPrice ?? product.sales_price ?? 0),
        sales_price: Number(product.salesPrice ?? product.sales_price ?? 0),
        hasVariants: Boolean(product.hasVariants ?? product.has_variants),
    };
}

function toInventoryProduct(
    product: Product,
    branchName: string
): InventoryProduct {
    return {
        id: Number(product.id),
        branchId: product.branchId ?? product.branch_id ?? null,
        branchName,
        name: product.name,
        category: product.category,
        stock: Number(product.stock || 0),
        alertLevel: Number(product.alertLevel || 0),
        originalPrice: Number(
            product.originalPrice ?? product.original_price ?? 0
        ),
        salesPrice: Number(product.salesPrice ?? product.sales_price ?? 0),
        hasVariants: Boolean(product.hasVariants),
        variants: [],
    };
}

function toDashboardProduct(product: InventoryProduct): Product {
    return {
        id: Number(product.id),
        branchId: product.branchId ?? null,
        branch_id: product.branchId ?? null,
        name: product.name,
        category: product.category,
        stock: Number(product.stock || 0),
        alertLevel: Number(product.alertLevel || 0),
        alert_level: Number(product.alertLevel || 0),
        originalPrice: Number(product.originalPrice || 0),
        original_price: Number(product.originalPrice || 0),
        salesPrice: Number(product.salesPrice || 0),
        sales_price: Number(product.salesPrice || 0),
        hasVariants: Boolean(product.hasVariants),
    };
}

function normalizeBooking(raw: BookingApiRaw): Booking {
    const rawBranchId = raw.branchId ?? raw.branch_id ?? null;

    return {
        id: Number(raw.id ?? raw.booking_id),
        branchId: rawBranchId ? Number(rawBranchId) : null,
        branch_id: rawBranchId ? Number(rawBranchId) : null,
        date: raw.date ?? raw.event_date ?? "",
        name: raw.name ?? raw.customer_name ?? "",
        status: raw.status ?? "Pending Review",
        packageName: String(
            raw.packageName ??
            raw.package_name ??
            raw.package ??
            raw.package_title ??
            raw.service_name ??
            ""
        ),
        eventName: String(
            raw.eventName ??
            raw.event_name ??
            raw.event ??
            raw.event_type ??
            ""
        ),
    };
}

function parseOrderItems(itemText?: string) {
    if (!itemText) return [];

    return itemText
        .split(",")
        .map((item) => {
            const [name, quantity] = item.split(" x");

            return {
                name: name?.trim() || "Unnamed item",
                quantity: Number(quantity || 0),
            };
        })
        .filter((item) => item.name);
}

function normalizeOrder(raw: OrderApiRaw): Order {
    const rawBranchId = raw.branchId ?? raw.branch_id ?? null;

    return {
        id: raw.id ?? raw.orderId ?? raw.order_id,
        orderId: raw.orderId ?? raw.order_id ?? raw.id,
        branchId: rawBranchId ? Number(rawBranchId) : null,
        branch_id: rawBranchId ? Number(rawBranchId) : null,
        total: Number(raw.total ?? 0),
        date:
            raw.date ??
            raw.orderDate ??
            raw.order_date ??
            raw.createdAt ??
            raw.created_at ??
            "",
        orderDate: raw.orderDate ?? raw.order_date ?? raw.date ?? "",
        createdAt: raw.createdAt ?? raw.created_at ?? "",
        item: raw.item ?? "",
        items: Array.isArray(raw.items)
            ? raw.items
            : parseOrderItems(raw.item),
    };
}

function filterByBranch<
    T extends { branchId?: number | null; branch_id?: number | null }
>(items: T[], branchId: string) {
    if (!branchId) return items;

    const hasBranchIds = items.some((item) => item.branchId || item.branch_id);

    if (!hasBranchIds) return items;

    return items.filter((item) => {
        const itemBranchId = item.branchId ?? item.branch_id;
        return String(itemBranchId) === String(branchId);
    });
}

async function loadBranchStaffCount(
    token: string,
    branchId: string,
    storeId: string
) {
    const possibleActions = [
        "get_staff",
        "get_staff_members",
        "get_branch_staff",
        "get_staff_by_branch",
        "get_users",
    ];

    for (const action of possibleActions) {
        try {
            const response = await fetch("/api/staff-management", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action,
                    store_id: Number(storeId),
                    branch_id: Number(branchId),
                    branchId: Number(branchId),
                }),
            });

            const text = await response.text();
            const data = text ? JSON.parse(text) : {};

            if (!response.ok) continue;

            if (Array.isArray(data.staff)) return data.staff.length;
            if (Array.isArray(data.staffMembers)) return data.staffMembers.length;
            if (Array.isArray(data.users)) return data.users.length;
            if (Array.isArray(data.members)) return data.members.length;
            if (Array.isArray(data.data)) return data.data.length;
        } catch {
            // Try the next compatible action.
        }
    }

    return 0;
}

function formatBookingDate(date: string) {
    if (!date) {
        return { dateLabel: "—", timeLabel: "" };
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return {
            dateLabel: date.slice(0, 10),
            timeLabel: date.length > 10 ? date.slice(11, 16) : "",
        };
    }

    return {
        dateLabel: parsed.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        }),
        timeLabel: parsed.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
        }),
    };
}

function formatCurrentDateTime(value: Date) {
    const dateLabel = value.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });

    const timeLabel = value
        .toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        })
        .toLowerCase();

    return `${dateLabel} | ${timeLabel}`;
}

export default function StaffDashboard() {
    const { user } = useCurrentUser();
    const inventoryController = useInventoryController();

    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [branchName, setBranchName] = useState("Branch");
    const [permissions, setPermissions] = useState<Record<string, boolean>>({});
    const [activeStaffCount, setActiveStaffCount] = useState(0);

    const [showAlertsModal, setShowAlertsModal] = useState(false);
    const [alertFilter, setAlertFilter] = useState<"all" | "low" | "out">(
        "all"
    );
    const [inventoryEditWasOpen, setInventoryEditWasOpen] = useState(false);
    const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const loadData = async () => {
            const currentBranchName =
                getUserValue(user, "branch_name") ||
                getSavedItem("branch_name") ||
                getSavedItem("stocknbook_branch_name") ||
                "Branch";

            const branchId =
                getUserValue(user, "branch_id") ||
                getSavedItem("branch_id") ||
                getSavedItem("stocknbook_branch_id");

            const storeId =
                getUserValue(user, "store_id") ||
                getSavedItem("store_id") ||
                getSavedItem("stocknbook_store_id");

            const token = getSavedItem("token");

            setBranchName(currentBranchName);

            setPermissions(
                user && typeof user === "object" && "permissions" in user
                    ? (
                    user as {
                        permissions?: Record<string, boolean>;
                    }
                ).permissions || {}
                    : getSavedPermissions()
            );

            const savedProducts = getSavedJson<Product[]>(STORAGE_KEY, []);
            setProducts(filterByBranch(savedProducts, branchId));

            const savedOrders = getSavedJson<Order[]>(ORDERS_KEY, []);
            setOrders(filterByBranch(savedOrders, branchId));

            if (!token || !branchId) {
                setBookings([]);
                setActiveStaffCount(0);
                return;
            }

            try {
                const productsResponse = await fetch("/api/products", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        action: "get_products",
                        branch_id: Number(branchId),
                    }),
                });

                const productsText = await productsResponse.text();
                const productsData = productsText ? JSON.parse(productsText) : {};

                if (
                    productsResponse.ok &&
                    Array.isArray(productsData.products)
                ) {
                    const scopedProducts = productsData.products.map(mapProduct);
                    setProducts(scopedProducts);
                    sessionStorage.setItem(
                        STORAGE_KEY,
                        JSON.stringify(scopedProducts)
                    );
                }
            } catch (error) {
                console.warn(
                    "Manager dashboard products fetch failed:",
                    error
                );
            }

            try {
                const ordersResponse = await fetch("/api/pos", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        action: "get_orders",
                        branch_id: Number(branchId),
                    }),
                });

                const ordersText = await ordersResponse.text();
                const ordersData: { orders?: OrderApiRaw[] } = ordersText
                    ? JSON.parse(ordersText)
                    : {};

                if (ordersResponse.ok && Array.isArray(ordersData.orders)) {
                    const normalizedOrders: Order[] =
                        ordersData.orders.map(normalizeOrder);

                    const currentBranchProducts: Product[] = products.length
                        ? products
                        : getSavedJson<Product[]>(STORAGE_KEY, []);

                    const branchProductNames = new Set(
                        currentBranchProducts
                            .filter((product) => {
                                const productBranchId =
                                    product.branchId ?? product.branch_id;

                                return (
                                    !productBranchId ||
                                    String(productBranchId) ===
                                    String(branchId)
                                );
                            })
                            .map((product) =>
                                product.name.trim().toLowerCase()
                            )
                    );

                    const hasOrderBranchIds = normalizedOrders.some((order) =>
                        Boolean(order.branchId ?? order.branch_id)
                    );

                    const scopedOrders = hasOrderBranchIds
                        ? normalizedOrders.filter((order) => {
                            const orderBranchId =
                                order.branchId ?? order.branch_id;

                            return (
                                String(orderBranchId) === String(branchId)
                            );
                        })
                        : normalizedOrders.filter((order) =>
                            (order.items || []).some((item) =>
                                branchProductNames.has(
                                    (item.name || "").trim().toLowerCase()
                                )
                            )
                        );

                    setOrders(scopedOrders);
                    sessionStorage.setItem(
                        ORDERS_KEY,
                        JSON.stringify(scopedOrders)
                    );
                }
            } catch (error) {
                console.warn("Manager dashboard orders fetch failed:", error);
            }

            try {
                const bookingsResponse = await fetch("/api/bookings", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        action: "get_bookings",
                        role: "staff",
                        store_id: storeId ? Number(storeId) : undefined,
                        branch_id: Number(branchId),
                    }),
                });

                const bookingsText = await bookingsResponse.text();
                const bookingsData = bookingsText ? JSON.parse(bookingsText) : {};

                if (
                    bookingsResponse.ok &&
                    Array.isArray(bookingsData.bookings)
                ) {
                    setBookings(bookingsData.bookings.map(normalizeBooking));
                } else {
                    setBookings([]);
                }
            } catch (error) {
                console.warn(
                    "Manager dashboard bookings fetch failed:",
                    error
                );
                setBookings([]);
            }

            if (storeId) {
                const staffCount = await loadBranchStaffCount(
                    token,
                    String(branchId),
                    String(storeId)
                );

                setActiveStaffCount(staffCount);
            } else {
                setActiveStaffCount(0);
            }
        };

        void loadData();
        window.addEventListener("focus", loadData);

        return () => {
            window.removeEventListener("focus", loadData);
        };
    }, [user, refreshKey]);

    useEffect(() => {
        const updateDateTime = () => setCurrentDateTime(new Date());

        updateDateTime();
        const timer = window.setInterval(updateDateTime, 30_000);

        return () => window.clearInterval(timer);
    }, []);

    const canAccess = (permission: string) => permissions[permission] === true;

    const totalSales = orders.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
    );

    const totalRevenue = orders.reduce((orderSum, order) => {
        const orderRevenue = (order.items || []).reduce(
            (itemSum, item) => {
                const product = products.find(
                    (entry) =>
                        entry.name.trim().toLowerCase() ===
                        (item.name || "").trim().toLowerCase()
                );

                const sellingPrice = Number(
                    product?.salesPrice ?? product?.sales_price ?? 0
                );
                const originalPrice = Number(
                    product?.originalPrice ?? product?.original_price ?? 0
                );
                const quantity = Number(item.quantity || 1);

                return (
                    itemSum +
                    Math.max(sellingPrice - originalPrice, 0) * quantity
                );
            },
            0
        );

        return orderSum + orderRevenue;
    }, 0);

    const totalBookings = bookings.length;
    const totalProducts = products.length;

    const allAlertItems = products.filter(
        (product) => product.stock <= product.alertLevel
    );
    const lowStockAlertItems = allAlertItems.filter(
        (product) => product.stock > 0
    );
    const outOfStockAlertItems = allAlertItems.filter(
        (product) => product.stock <= 0
    );

    const modalAlertItems =
        alertFilter === "low"
            ? lowStockAlertItems
            : alertFilter === "out"
                ? outOfStockAlertItems
                : allAlertItems;

    const lowStockItems = allAlertItems.slice(0, 3);
    const recentBookings = bookings.slice(0, 3);

    const popularItems = Object.values(
        orders.reduce<Record<string, { name: string; quantity: number }>>(
            (accumulator, order) => {
                (order.items || []).forEach((item) => {
                    const name = item.name || "Unnamed item";
                    const quantity = item.quantity || 0;

                    if (!accumulator[name]) {
                        accumulator[name] = { name, quantity: 0 };
                    }

                    accumulator[name].quantity += quantity;
                });

                return accumulator;
            },
            {}
        )
    )
        .sort((first, second) => second.quantity - first.quantity)
        .slice(0, 3);

    const mostBookedPackages = Object.values(
        bookings.reduce<Record<string, { name: string; quantity: number }>>(
            (accumulator, booking) => {
                const packageName =
                    booking.packageName?.trim() || "Package booking";

                if (!accumulator[packageName]) {
                    accumulator[packageName] = {
                        name: packageName,
                        quantity: 0,
                    };
                }

                accumulator[packageName].quantity += 1;
                return accumulator;
            },
            {}
        )
    )
        .sort((first, second) => second.quantity - first.quantity)
        .slice(0, 3);

    const popularMax = Math.max(
        ...popularItems.map((item) => item.quantity),
        1
    );
    const packageMax = Math.max(
        ...mostBookedPackages.map((item) => item.quantity),
        1
    );

    const openInventoryEditProduct = (product: Product) => {
        const matchingInventoryProduct = inventoryController.products.find(
            (inventoryProduct) =>
                Number(inventoryProduct.id) === Number(product.id)
        );

        inventoryController.handleEditProduct(
            matchingInventoryProduct ??
            toInventoryProduct(product, branchName)
        );
    };

    const inventoryEditOpen =
        inventoryController.showForm &&
        inventoryController.editingId !== null;

    useEffect(() => {
        if (inventoryEditOpen) {
            setInventoryEditWasOpen(true);
            return;
        }

        if (!inventoryEditWasOpen) return;

        const activeBranchId =
            getUserValue(user, "branch_id") ||
            getSavedItem("branch_id") ||
            getSavedItem("stocknbook_branch_id");

        const refreshedProducts = filterByBranch(
            inventoryController.products.map(toDashboardProduct),
            activeBranchId
        );

        if (refreshedProducts.length > 0) {
            setProducts(refreshedProducts);
            sessionStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(refreshedProducts)
            );
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(refreshedProducts)
            );
        }

        setInventoryEditWasOpen(false);
    }, [
        inventoryEditOpen,
        inventoryEditWasOpen,
        inventoryController.products,
        user,
    ]);

    // Kept to preserve the existing active-staff data flow.
    void activeStaffCount;

    return (
        <>
            <main className="min-w-0 flex-1 overflow-x-hidden bg-[#FDFAF4] font-sans text-[#1A1220]">
                <header className="sticky top-0 z-20 border-b border-[#E9E0EF] bg-[#FFFDF8]/95 backdrop-blur">
                    <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 px-6 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <h1 className="truncate text-[25px] font-bold text-[#1A1220]">
                                Dashboard
                            </h1>

                            <span
                                title={branchName}
                                className="max-w-[220px] truncate rounded-lg bg-[#EFE8F8] px-3.5 py-1.5 text-sm font-medium text-[#4E2C66]"
                            >
                                {branchName}
                            </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <span className="inline-flex h-[42px] items-center rounded-xl border border-[#E6DDF0] bg-white px-3.5 text-sm font-semibold text-[#2B174C] shadow-sm">
                                {currentDateTime
                                    ? formatCurrentDateTime(currentDateTime)
                                    : "Loading date..."}
                            </span>

                            <button
                                type="button"
                                onClick={() =>
                                    setRefreshKey((current) => current + 1)
                                }
                                aria-label="Refresh dashboard"
                                title="Refresh dashboard"
                                className="inline-flex h-[42px] items-center gap-2 rounded-xl bg-[#2B174C] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1B0D31]"
                            >
                                <RefreshCw size={16} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </header>

                <section className="space-y-3.5 px-6 py-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <MetricCard
                            title="Total Sales"
                            value={
                                canAccess("pos")
                                    ? `₱${totalSales.toLocaleString("en-PH")}`
                                    : "—"
                            }
                            subtext={
                                canAccess("pos")
                                    ? `₱${totalRevenue.toLocaleString(
                                        "en-PH"
                                    )} revenue`
                                    : "No access"
                            }
                        />
                        <MetricCard
                            title="Total Bookings"
                            value={
                                canAccess("bookings")
                                    ? String(totalBookings)
                                    : "—"
                            }
                            subtext={
                                canAccess("bookings")
                                    ? "For this branch"
                                    : "No access"
                            }
                        />
                        <MetricCard
                            title="Total Products"
                            value={
                                canAccess("inventory")
                                    ? String(totalProducts)
                                    : "—"
                            }
                            subtext={
                                canAccess("inventory")
                                    ? "In inventory"
                                    : "No access"
                            }
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                        <DashboardPanel className="min-h-[260px]">
                            <PanelHeading
                                title="Popular Items"
                                action="View all"
                                href="/analytics"
                            />

                            {canAccess("pos") ? (
                                popularItems.length > 0 ? (
                                    <div className="space-y-4">
                                        {popularItems.map((item, index) => (
                                            <RankedProgressRow
                                                key={item.name}
                                                rank={index + 1}
                                                label={item.name}
                                                value={`${item.quantity} sold`}
                                                percent={
                                                    (item.quantity /
                                                        popularMax) *
                                                    100
                                                }
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <DashboardEmptyText text="No popular items yet." />
                                )
                            ) : (
                                <DashboardEmptyText text="Popular items are hidden because POS access is not enabled." />
                            )}

                            <PanelLegend text="Units sold for this branch" />
                        </DashboardPanel>

                        <DashboardPanel className="min-h-[260px]">
                            <PanelHeading
                                title="Most Booked Packages"
                                action="View all"
                                href="/analytics"
                            />

                            {canAccess("bookings") ? (
                                mostBookedPackages.length > 0 ? (
                                    <div className="space-y-4">
                                        {mostBookedPackages.map(
                                            (item, index) => (
                                                <RankedProgressRow
                                                    key={item.name}
                                                    rank={index + 1}
                                                    label={item.name}
                                                    value={`${item.quantity} booking${
                                                        item.quantity === 1
                                                            ? ""
                                                            : "s"
                                                    }`}
                                                    percent={
                                                        (item.quantity /
                                                            packageMax) *
                                                        100
                                                    }
                                                />
                                            )
                                        )}
                                    </div>
                                ) : (
                                    <DashboardEmptyText text="No package bookings yet." />
                                )
                            ) : (
                                <DashboardEmptyText text="Package bookings are hidden because booking access is not enabled." />
                            )}

                            <PanelLegend text="Bookings for this branch" />
                        </DashboardPanel>
                    </div>

                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                        <DashboardPanel className="overflow-hidden !p-0">
                            <div className="border-b border-[#E6DDF0] px-4 py-3.5">
                                <ManagerTableHeader
                                    title="Upcoming Bookings"
                                    subtitle="Next scheduled reservations for this branch."
                                    count={recentBookings.length}
                                    countLabel="bookings"
                                    action="View bookings"
                                    onAction={() =>
                                        window.location.assign("/bookings")
                                    }
                                    tone="violet"
                                />
                            </div>

                            {!canAccess("bookings") ? (
                                <div className="px-4 py-4">
                                    <DashboardEmptyText text="Booking access is not enabled for this account." />
                                </div>
                            ) : recentBookings.length === 0 ? (
                                <div className="px-4 py-4">
                                    <DashboardEmptyText text="No upcoming bookings yet." />
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[650px] border-collapse">
                                            <thead className="bg-[#FFFCF7]">
                                            <tr className="border-b border-[#E6DDF0]">
                                                <TableHeader>
                                                    Customer / Event
                                                </TableHeader>
                                                <TableHeader>
                                                    Schedule
                                                </TableHeader>
                                                <TableHeader>
                                                    Package
                                                </TableHeader>
                                                <TableHeader>
                                                    Status
                                                </TableHeader>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {recentBookings.map(
                                                (booking) => (
                                                    <UpcomingBookingRow
                                                        key={booking.id}
                                                        booking={booking}
                                                    />
                                                )
                                            )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex items-center justify-center border-t border-[#E6DDF0] bg-[#FFFCF7] py-3">
                                        <Link
                                            href="/bookings"
                                            className="text-xs font-semibold text-[#2B174C] transition hover:text-[#5B2FC6]"
                                        >
                                            View all bookings
                                        </Link>
                                    </div>
                                </>
                            )}
                        </DashboardPanel>

                        <DashboardPanel className="overflow-hidden !p-0">
                            <div className="border-b border-[#E6DDF0] px-4 py-3.5">
                                <ManagerTableHeader
                                    title="Inventory Alerts"
                                    subtitle="Products that need attention or restocking."
                                    count={lowStockItems.length}
                                    countLabel="alerts"
                                    action="View inventory"
                                    onAction={() =>
                                        window.location.assign("/inventory")
                                    }
                                    tone="red"
                                />
                            </div>

                            {!canAccess("inventory") ? (
                                <div className="px-4 py-4">
                                    <DashboardEmptyText text="Inventory access is not enabled for this account." />
                                </div>
                            ) : lowStockItems.length === 0 ? (
                                <div className="px-4 py-4">
                                    <DashboardEmptyText text="All items are well stocked." />
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[650px] border-collapse">
                                            <thead className="bg-[#FFFCF7]">
                                            <tr className="border-b border-[#E6DDF0]">
                                                <TableHeader>
                                                    Item
                                                </TableHeader>
                                                <TableHeader>
                                                    Category
                                                </TableHeader>
                                                <TableHeader>
                                                    Stock Level
                                                </TableHeader>
                                                <TableHeader align="right">
                                                    Action
                                                </TableHeader>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {lowStockItems.map(
                                                (product) => (
                                                    <InventoryAlertTableRow
                                                        key={product.id}
                                                        product={product}
                                                        onRestock={() =>
                                                            openInventoryEditProduct(
                                                                product
                                                            )
                                                        }
                                                    />
                                                )
                                            )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex items-center justify-center border-t border-[#E6DDF0] bg-[#FFFCF7] py-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAlertFilter("all");
                                                setShowAlertsModal(true);
                                            }}
                                            className="text-xs font-semibold text-[#2B174C] transition hover:text-[#5B2FC6]"
                                        >
                                            View all alerts
                                        </button>
                                    </div>
                                </>
                            )}
                        </DashboardPanel>
                    </div>
                </section>

                {showAlertsModal && (
                    <RestockAlertsModal
                        items={modalAlertItems}
                        activeFilter={alertFilter}
                        lowStockCount={lowStockAlertItems.length}
                        outOfStockCount={outOfStockAlertItems.length}
                        onChangeFilter={setAlertFilter}
                        onClose={() => setShowAlertsModal(false)}
                        onRestock={(product) => {
                            setShowAlertsModal(false);
                            openInventoryEditProduct(product);
                        }}
                    />
                )}
            </main>

            <InventoryDialogs inv={inventoryController} />
        </>
    );
}

function DashboardPanel({
                            children,
                            className = "",
                        }: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={`rounded-[14px] border border-[#E6DDF0] bg-white p-4 shadow-sm ${className}`}
        >
            {children}
        </section>
    );
}

function MetricCard({
                        title,
                        value,
                        subtext,
                    }: {
    title: string;
    value: string;
    subtext: string;
}) {
    return (
        <div className="flex min-h-[102px] flex-col justify-center rounded-[14px] border border-[#E6DDF0] bg-white px-4 py-3 shadow-sm">
            <p className="text-sm font-semibold text-[#2B174C]">{title}</p>
            <p className="mt-1 text-[24px] font-bold leading-tight text-[#1A1220]">
                {value}
            </p>
            <p className="mt-1 text-xs text-[#7A6A84]">{subtext}</p>
        </div>
    );
}

function PanelHeading({
                          title,
                          action,
                          href,
                      }: {
    title: string;
    action: string;
    href: string;
}) {
    return (
        <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="min-w-0 truncate text-[16px] font-bold text-[#1A1220]">
                {title}
            </h2>

            <Link
                href={href}
                className="shrink-0 text-xs font-semibold text-[#2B174C] transition hover:text-[#5B2FC6]"
            >
                {action}
            </Link>
        </div>
    );
}

function ManagerTableHeader({
                                title,
                                subtitle,
                                count,
                                countLabel,
                                action,
                                onAction,
                                tone,
                            }: {
    title: string;
    subtitle: string;
    count: number;
    countLabel: string;
    action: string;
    onAction: () => void;
    tone: "violet" | "red";
}) {
    const countClass =
        tone === "red"
            ? "border-[#F2C4C4] bg-[#FFF0F0] text-[#C32F2F]"
            : "border-[#D8CBE7] bg-[#F7F1FF] text-[#4E2C66]";

    return (
        <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
                <h2 className="truncate text-[16px] font-bold text-[#1A1220]">
                    {title}
                </h2>
                <p className="mt-0.5 truncate text-xs text-[#7A6A84]">
                    {subtitle}
                </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
                <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${countClass}`}
                >
                    {count} {countLabel}
                </span>

                <button
                    type="button"
                    onClick={onAction}
                    className="text-xs font-semibold text-[#2B174C] transition hover:text-[#5B2FC6]"
                >
                    {action}
                </button>
            </div>
        </div>
    );
}

function RankedProgressRow({
                               rank,
                               label,
                               value,
                               percent,
                           }: {
    rank: number;
    label: string;
    value: string;
    percent: number;
}) {
    const rankClass =
        rank === 1
            ? "bg-[#EEE8F8] text-[#3B1B88]"
            : rank === 2
                ? "bg-[#FFF4D8] text-[#9A5A00]"
                : "bg-[#E8F0FF] text-[#1D4ED8]";

    const barColor =
        rank === 1 ? "#3B1B88" : rank === 2 ? "#D97706" : "#2563EB";

    return (
        <div>
            <div className="mb-2 flex items-center gap-3">
                <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${rankClass}`}
                >
                    {rank}
                </span>

                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[#1A1220]">
                    {label}
                </p>

                <p className="shrink-0 text-xs font-semibold text-[#5F4E75]">
                    {value}
                </p>
            </div>

            <div className="ml-10 h-2 overflow-hidden rounded-full bg-[#EEE8F8]">
                <div
                    className="h-full rounded-full"
                    style={{
                        width: `${Math.max(Math.min(percent, 100), 8)}%`,
                        backgroundColor: barColor,
                    }}
                />
            </div>
        </div>
    );
}

function PanelLegend({ text }: { text: string }) {
    return (
        <p className="mt-5 text-center text-xs text-[#7A6A84]">{text}</p>
    );
}

function TableHeader({
                         children,
                         align = "left",
                     }: {
    children: ReactNode;
    align?: "left" | "right";
}) {
    return (
        <th
            className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#806A8C] ${
                align === "right" ? "text-right" : "text-left"
            }`}
        >
            {children}
        </th>
    );
}

function UpcomingBookingRow({ booking }: { booking: Booking }) {
    const { dateLabel, timeLabel } = formatBookingDate(booking.date);
    const status = booking.status || "Pending Review";
    const normalized = status.trim().toLowerCase();

    const statusClass =
        normalized === "completed"
            ? "border-[#B7E9C8] bg-[#EDFBF1] text-[#138342]"
            : normalized === "confirmed"
                ? "border-[#C9D9FB] bg-[#EEF4FF] text-[#1D4ED8]"
                : normalized === "preparing"
                    ? "border-[#D8CBE7] bg-[#F7F1FF] text-[#4E2C66]"
                    : normalized === "cancelled" || normalized === "canceled"
                        ? "border-[#F2C4C4] bg-[#FFF0F0] text-[#C32F2F]"
                        : "border-[#F4D79A] bg-[#FFF8E8] text-[#A56607]";

    const displayStatus =
        normalized === "pending review"
            ? "Pending"
            : status.charAt(0).toUpperCase() + status.slice(1);

    return (
        <tr className="border-b border-[#EEE7F2] transition hover:bg-[#FFFCF7] last:border-b-0">
            <td className="px-4 py-3">
                <p
                    title={booking.name || "Customer"}
                    className="truncate text-sm font-semibold text-[#1A1220]"
                >
                    {booking.name || "Customer"}
                </p>
                <p
                    title={booking.eventName || "Booking reservation"}
                    className="mt-0.5 truncate text-xs text-[#7A6A84]"
                >
                    {booking.eventName || "Booking reservation"}
                </p>
            </td>

            <td className="px-4 py-3">
                <p className="whitespace-nowrap text-sm font-medium text-[#1A1220]">
                    {dateLabel}
                </p>
                {timeLabel && (
                    <p className="mt-0.5 text-xs text-[#7A6A84]">
                        {timeLabel}
                    </p>
                )}
            </td>

            <td className="px-4 py-3">
                <p
                    title={booking.packageName || "Package booking"}
                    className="truncate text-sm text-[#1A1220]"
                >
                    {booking.packageName || "Package booking"}
                </p>
            </td>

            <td className="px-4 py-3">
                <span
                    className={`inline-flex max-w-full truncate rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass}`}
                >
                    {displayStatus}
                </span>
            </td>
        </tr>
    );
}

function InventoryAlertTableRow({
                                    product,
                                    onRestock,
                                }: {
    product: Product;
    onRestock: () => void;
}) {
    const unitsLeft = Number(product.stock || 0);
    const isOutOfStock = unitsLeft <= 0;

    return (
        <tr className="border-b border-[#EEE7F2] transition hover:bg-[#FFFCF7] last:border-b-0">
            <td className="px-4 py-3">
                <p
                    title={product.name}
                    className="truncate text-sm font-semibold text-[#1A1220]"
                >
                    {product.name}
                </p>
                <p
                    className={`mt-0.5 text-xs font-medium ${
                        isOutOfStock ? "text-[#C32F2F]" : "text-[#A56607]"
                    }`}
                >
                    {isOutOfStock ? "Out of stock" : "Low stock"}
                </p>
            </td>

            <td className="px-4 py-3">
                <p
                    title={product.category || "Uncategorized"}
                    className="truncate text-sm text-[#5F4E75]"
                >
                    {product.category || "Uncategorized"}
                </p>
            </td>

            <td className="px-4 py-3">
                <span
                    className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        isOutOfStock
                            ? "border-[#F2C4C4] bg-[#FFF0F0] text-[#C32F2F]"
                            : "border-[#F4D79A] bg-[#FFF8E8] text-[#A56607]"
                    }`}
                >
                    {unitsLeft} left
                </span>
            </td>

            <td className="px-4 py-3 text-right">
                <button
                    type="button"
                    onClick={onRestock}
                    className="inline-flex h-[36px] items-center rounded-xl border border-[#E6DDF0] bg-white px-3 text-xs font-semibold text-[#2B174C] transition hover:bg-[#F7F1FF]"
                >
                    Restock
                </button>
            </td>
        </tr>
    );
}

function DashboardEmptyText({ text }: { text: string }) {
    return (
        <div className="flex min-h-[154px] items-center justify-center rounded-xl border border-dashed border-[#E6DDF0] bg-[#FFFCF7] px-5 text-center">
            <p className="text-sm leading-6 text-[#7A6A84]">{text}</p>
        </div>
    );
}

function RestockAlertsModal({
                                items,
                                activeFilter,
                                lowStockCount,
                                outOfStockCount,
                                onChangeFilter,
                                onClose,
                                onRestock,
                            }: {
    items: Product[];
    activeFilter: "all" | "low" | "out";
    lowStockCount: number;
    outOfStockCount: number;
    onChangeFilter: (filter: "all" | "low" | "out") => void;
    onClose: () => void;
    onRestock: (product: Product) => void;
}) {
    const filterButtonClass = (
        isActive: boolean,
        tone: "all" | "low" | "out"
    ) => {
        if (tone === "all") {
            return isActive
                ? "bg-[#2B174C] text-white"
                : "border border-[#E6DDF0] bg-white text-[#5F4E75] hover:bg-[#F7F1FF]";
        }

        if (tone === "low") {
            return isActive
                ? "border border-[#F4D79A] bg-[#FFF8E8] text-[#A56607]"
                : "border border-[#E6DDF0] bg-white text-[#A56607] hover:bg-[#FFF8E8]";
        }

        return isActive
            ? "border border-[#F2C4C4] bg-[#FFF0F0] text-[#C32F2F]"
            : "border border-[#E6DDF0] bg-white text-[#C32F2F] hover:bg-[#FFF0F0]";
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="dashboard-restock-alerts-title"
                className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[18px] border border-[#E6DDF0] bg-white shadow-2xl"
            >
                <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#E6DDF0] bg-white px-6 py-5">
                    <div>
                        <h3
                            id="dashboard-restock-alerts-title"
                            className="text-[20px] font-bold text-[#1A1220]"
                        >
                            Restock Alerts
                        </h3>
                        <p className="mt-1 text-sm text-[#7A6A84]">
                            Low-stock and out-of-stock items that need restocking.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close restock alerts"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E6DDF0] text-[#806A8C] transition hover:bg-[#F7F1FF] hover:text-[#2B174C]"
                    >
                        ×
                    </button>
                </div>

                <div className="px-6 py-5">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => onChangeFilter("all")}
                            className={`h-[36px] rounded-xl px-3 text-xs font-semibold transition ${filterButtonClass(
                                activeFilter === "all",
                                "all"
                            )}`}
                        >
                            All
                        </button>

                        <button
                            type="button"
                            onClick={() => onChangeFilter("low")}
                            className={`h-[36px] rounded-xl px-3 text-xs font-semibold transition ${filterButtonClass(
                                activeFilter === "low",
                                "low"
                            )}`}
                        >
                            Low Stock ({lowStockCount})
                        </button>

                        <button
                            type="button"
                            onClick={() => onChangeFilter("out")}
                            className={`h-[36px] rounded-xl px-3 text-xs font-semibold transition ${filterButtonClass(
                                activeFilter === "out",
                                "out"
                            )}`}
                        >
                            Out of Stock ({outOfStockCount})
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-[#E6DDF0]">
                        <table className="w-full min-w-[680px] border-collapse">
                            <thead className="bg-[#FFFCF7]">
                            <tr className="border-b border-[#E6DDF0]">
                                <TableHeader>Product</TableHeader>
                                <TableHeader>Category</TableHeader>
                                <TableHeader>Current Stock</TableHeader>
                                <TableHeader align="right">
                                    Action
                                </TableHeader>
                            </tr>
                            </thead>

                            <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-4 py-10 text-center text-sm text-[#7A6A84]"
                                    >
                                        No stock alerts found.
                                    </td>
                                </tr>
                            ) : (
                                items.map((product) => {
                                    const isOutOfStock =
                                        product.stock <= 0;

                                    return (
                                        <tr
                                            key={product.id}
                                            className="border-b border-[#EEE7F2] last:border-b-0"
                                        >
                                            <td className="px-4 py-3">
                                                <p className="truncate text-sm font-semibold text-[#1A1220]">
                                                    {product.name}
                                                </p>
                                                <p
                                                    className={`mt-0.5 text-xs font-medium ${
                                                        isOutOfStock
                                                            ? "text-[#C32F2F]"
                                                            : "text-[#A56607]"
                                                    }`}
                                                >
                                                    {isOutOfStock
                                                        ? "Out of stock"
                                                        : "Low stock"}
                                                </p>
                                            </td>

                                            <td className="px-4 py-3 text-sm text-[#5F4E75]">
                                                {product.category || "—"}
                                            </td>

                                            <td
                                                className={`px-4 py-3 text-sm font-semibold ${
                                                    isOutOfStock
                                                        ? "text-[#C32F2F]"
                                                        : "text-[#A56607]"
                                                }`}
                                            >
                                                {product.stock}
                                            </td>

                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        onRestock(product)
                                                    }
                                                    className="inline-flex h-[36px] items-center rounded-xl border border-[#E6DDF0] bg-white px-3 text-xs font-semibold text-[#2B174C] transition hover:bg-[#F7F1FF]"
                                                >
                                                    Restock
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
