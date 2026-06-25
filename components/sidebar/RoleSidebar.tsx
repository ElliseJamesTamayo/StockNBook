"use client";

import Link from "next/link";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type Role = "owner" | "manager" | "staff";

function getSavedItem(key: string) {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem(key) || localStorage.getItem(key) || "";
}

function formatPersonName(name: string) {
    return name
        .trim()
        .toLowerCase()
        .split(" ")
        .filter(Boolean)
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export default function RoleSidebar() {
    const { user, loading } = useCurrentUser();

    const role = (user?.role || "owner") as Role;
    const permissions = user?.permissions || {};

    const storeName = user?.store_name || getSavedItem("store_name") || "StockNBook";
    const branchName = user?.branch_name || getSavedItem("branch_name") || "";

    const ownerName =
        user?.owner_name ||
        getSavedItem("owner_name") ||
        getSavedItem("name") ||
        storeName ||
        "Owner";

    const managerName =
        user?.manager_name ||
        getSavedItem("manager_name") ||
        "Manager";

    const staffName =
        user?.staff_name ||
        getSavedItem("staff_name") ||
        "Staff";

    const rawPersonName =
        role === "owner"
            ? ownerName
            : role === "manager"
                ? managerName
                : staffName;

    const personName = formatPersonName(rawPersonName);

    const subLabel =
        role === "owner"
            ? storeName
            : branchName || storeName || "Branch";

    const roleLabel =
        role === "owner"
            ? "Owner"
            : role === "manager"
                ? "Manager"
                : "Staff";

    const initials = personName
        .split(" ")
        .filter(Boolean)
        .map((word: string) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    const canAccess = (permission: string) => {
        if (role === "owner") return true;
        return permissions[permission] === true;
    };

    // Analytics and Forecasting are available to every signed-in role.
    const canViewAnalytics =
        role === "owner" || role === "manager" || role === "staff";

    const canViewForecasting =
        role === "owner" || role === "manager" || role === "staff";

    const handleLogout = () => {
        if (typeof window === "undefined") return;

        sessionStorage.clear();
        localStorage.clear();
        window.location.href = "/";
    };

    if (loading) {
        return (
            <aside
                style={{
                    backgroundColor: "#1E1035",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                }}
                className="flex min-h-screen w-[196px] flex-col justify-between overflow-hidden text-white"
            >
                <div className="px-[14px] py-4">
                    <p className="text-[11px] text-white/45">Loading...</p>
                </div>
            </aside>
        );
    }

    if (!user) return null;

    return (
        <aside
            style={{
                backgroundColor: "#1E1035",
                fontFamily: "Georgia, 'Times New Roman', serif",
            }}
            className="flex min-h-screen w-[196px] flex-col justify-between overflow-hidden text-white"
        >
            <div>
                <div className="border-b border-white/[0.06] px-[14px] py-4">
                    <div className="flex items-center gap-2">
                        <div
                            style={{ backgroundColor: "#C9951A" }}
                            className="h-[26px] w-[26px] rounded-[7px]"
                        />

                        <h1 className="text-[13px] font-semibold text-white">
                            StockNBook
                        </h1>
                    </div>
                </div>

                <div className="border-b border-white/[0.06] px-[14px] py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#4B2D78] text-[12px] font-semibold text-white">
                            {initials || "U"}
                        </div>

                        <div className="min-w-0">
                            <p className="truncate text-[11px] font-medium text-white">
                                {personName}
                            </p>

                            <span
                                style={{ backgroundColor: "#5A372E" }}
                                className="mt-1 inline-block rounded-md px-3 py-1 text-[8px] font-medium text-white"
                            >
                                {roleLabel}
                            </span>

                            <p className="mt-1 truncate text-[9px] font-semibold text-white/35">
                                {subLabel}
                            </p>
                        </div>
                    </div>
                </div>

                <nav className="mt-3 px-2 pb-4">
                    <p className="mb-1 px-2 text-[9px] uppercase tracking-[0.15em] text-white/30">
                        Overview
                    </p>

                    <div className="space-y-0.2">
                        <Link
                            href="/dashboard"
                            className="block rounded-lg px-3 py-2 text-[11px] text-white/45 transition hover:bg-white/10 hover:text-white"
                        >
                            Dashboard
                        </Link>

                        {role === "owner" && (
                            <Link
                                href="/branches"
                                className="block rounded-lg px-3 py-2 text-[11px] text-white/45 hover:bg-white/10"
                            >
                                Branches
                            </Link>
                        )}
                    </div>

                    {(canAccess("bookings") ||
                        canAccess("inventory") ||
                        canAccess("packages") ||
                        canAccess("pos")) && (
                        <>
                            <p className="mb-1 mt-3 px-2 text-[9px] uppercase tracking-[0.15em] text-white/30">
                                Business
                            </p>

                            <div className="space-y-0.2">
                                {canAccess("bookings") && (
                                    <Link
                                        href="/bookings"
                                        className="block rounded-lg px-3 py-2 text-[11px] text-white/45 hover:bg-white/10"
                                    >
                                        Bookings
                                    </Link>
                                )}

                                {canAccess("inventory") && (
                                    <Link
                                        href="/inventory"
                                        className="block rounded-lg px-3 py-2 text-[11px] text-white/45 hover:bg-white/10"
                                    >
                                        Inventory
                                    </Link>
                                )}

                                {canAccess("packages") && (
                                    <Link
                                        href="/packages"
                                        className="block rounded-lg px-3 py-2 text-[11px] text-white/45 hover:bg-white/10"
                                    >
                                        Packages
                                    </Link>
                                )}

                                {canAccess("pos") && (
                                    <Link
                                        href="/pos"
                                        className="block rounded-lg px-3 py-2 text-[11px] text-white/45 hover:bg-white/10"
                                    >
                                        Sales / POS
                                    </Link>
                                )}
                            </div>
                        </>
                    )}

                    {(canViewAnalytics || canViewForecasting || canAccess("reports")) && (
                        <>
                            <p className="mb-1 mt-3 px-2 text-[9px] uppercase tracking-[0.15em] text-white/30">
                                Analytics
                            </p>

                            <div className="space-y-0.2">
                                {canViewAnalytics && (
                                    <Link
                                        href="/analytics"
                                        className="block rounded-lg px-3 py-2 text-[11px] text-white/45 hover:bg-white/10"
                                    >
                                        Analytics
                                    </Link>
                                )}

                                {canViewForecasting && (
                                    <Link
                                        href="/dashboard/forecasting"
                                        className="block rounded-lg px-3 py-2 text-[11px] text-white/45 hover:bg-white/10"
                                    >
                                        Forecasting
                                    </Link>
                                )}

                                {canAccess("reports") && (
                                    <Link
                                        href="/reports"
                                        className="block rounded-lg px-3 py-2 text-[11px] text-white/45 hover:bg-white/10"
                                    >
                                        Reports
                                    </Link>
                                )}
                            </div>
                        </>
                    )}

                    {(role === "owner" ||
                        (role === "manager" && canAccess("staff_management"))) && (
                        <>
                            <p className="mb-1 mt-3 px-2 text-[9px] uppercase tracking-[0.15em] text-white/30">
                                Team
                            </p>

                            <div className="space-y-0.2">
                                {role === "owner" && (
                                    <Link
                                        href="/branch-managers"
                                        className="block rounded-lg px-3 py-2 text-[11px] text-white/45 hover:bg-white/10"
                                    >
                                        Branch Managers
                                    </Link>
                                )}

                                {role === "manager" && canAccess("staff_management") && (
                                    <Link
                                        href="/manager/staff-management"
                                        className="block rounded-lg px-3 py-2 text-[11px] text-white/45 hover:bg-white/10"
                                    >
                                        Staff
                                    </Link>
                                )}
                            </div>
                        </>
                    )}

                    {(role === "owner" || canAccess("branch_settings")) && (
                        <>
                            <p className="mb-1 mt-3 px-2 text-[9px] uppercase tracking-[0.15em] text-white/30">
                                System
                            </p>

                            <div className="space-y-1">
                                <Link
                                    href="/settings"
                                    className="block rounded-lg px-3 py-2 text-[11px] text-white/45 hover:bg-white/10"
                                >
                                    Settings
                                </Link>
                            </div>
                        </>
                    )}
                </nav>
            </div>

            <div className="px-2 pb-3">
                <button
                    onClick={handleLogout}
                    className="block w-full rounded-lg px-3 py-2 text-left text-xs text-white/90 hover:bg-white/10"
                >
                    Logout
                </button>
            </div>
        </aside>
    );
}

