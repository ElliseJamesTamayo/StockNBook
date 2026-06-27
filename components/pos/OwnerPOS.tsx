"use client";

import { RefreshCw, Store } from "lucide-react";
import { useEffect, useState } from "react";
import RoleSidebar from "@/components/sidebar/RoleSidebar";
import type { UsePOSReturn } from "@/hooks/usePOS";
import { OrdersTable, StatCard, peso } from "./_shared";

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

export default function OwnerPOS({ pos }: { pos: UsePOSReturn }) {
    const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);

    useEffect(() => {
        const updateDateTime = () => setCurrentDateTime(new Date());

        updateDateTime();

        const timer = window.setInterval(updateDateTime, 30_000);

        return () => {
            window.clearInterval(timer);
        };
    }, []);

    return (
        <div
            className="flex min-h-screen font-sans text-[#1A1220]"
            style={{ backgroundColor: "#FDFAF4" }}
        >
            <RoleSidebar />

            <main className="min-w-0 flex-1 overflow-x-hidden font-sans">
                <header className="sticky top-0 z-20 border-b border-[#E9E0EF] bg-[#FFFDF8]/95 backdrop-blur">
                    <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 px-6 py-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-[25px] font-bold text-[#1A1220]">
                                POS / Sales
                            </h1>

                            <span className="rounded-lg bg-[#EFE8F8] px-3.5 py-1.5 text-sm font-medium text-[#4E2C66]">
                                {pos.isOwner
                                    ? "Sales Overview"
                                    : pos.activeBranchName || "Assigned Branch"}
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
                                onClick={() => void pos.refreshAll()}
                                aria-label="Refresh POS details"
                                title="Refresh"
                                className="inline-flex h-[42px] items-center gap-2 rounded-xl bg-[#2B174C] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1B0D31]"
                            >
                                <RefreshCw size={16} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </header>

                <div className="px-6 py-4">
                    <div className="mb-3 grid gap-3 md:grid-cols-3">
                        <StatCard label="Total Orders" value={pos.orders.length} />
                        <StatCard label="Total Sales" value={peso(pos.totalRevenue)} />
                        <StatCard
                            label="Total Revenue"
                            value={peso(pos.totalProfit)}
                        />
                    </div>

                    <div className="space-y-3">
                        <section className="rounded-[14px] border border-[#E6DDF0] bg-white p-3 shadow-sm">
                            <div className="mb-3 flex items-center gap-2">
                                <Store size={16} className="text-[#5F4E75]" />

                                <div>
                                    <h2 className="text-[16px] font-bold text-[#1A1220]">
                                        Sales by Branch
                                    </h2>
                                    <p className="text-xs text-[#7A6A84]">
                                        Tap a branch to view its orders.
                                    </p>
                                </div>
                            </div>

                            {pos.branches.length === 0 ? (
                                <div className="flex min-h-[140px] items-center justify-center rounded-xl border border-dashed border-[#E6DDF0] bg-[#FFFCF7]">
                                    <p className="text-sm text-[#9B8AAA]">
                                        No branches found.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                    {pos.branches.map((branch) => {
                                        const branchData = pos.getBranchSales(branch);
                                        const isSelected =
                                            pos.selectedSalesBranchId ===
                                            String(branch.id);

                                        return (
                                            <button
                                                key={branch.id}
                                                type="button"
                                                onClick={() =>
                                                    pos.setSelectedSalesBranchId(
                                                        String(branch.id)
                                                    )
                                                }
                                                className={`rounded-[14px] border p-3 text-left transition ${
                                                    isSelected
                                                        ? "border-[#2B174C] bg-[#F7F1FF] shadow-sm"
                                                        : "border-[#E6DDF0] bg-[#FFFCF7] hover:border-[#BFAED4]"
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="truncate text-sm font-semibold text-[#1A1220]">
                                                        {branch.branchName}
                                                    </p>

                                                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#6A5D6F]">
                                                {branchData.orders.length}
                                            </span>
                                                </div>

                                                <div className="mt-3">
                                                    <p className="text-xs font-semibold text-[#806A8C]">
                                                        Sales
                                                    </p>
                                                    <p className="text-[19px] font-bold text-[#1A1220]">
                                                        {peso(branchData.sales)}
                                                    </p>
                                                </div>

                                                <div className="mt-3 grid grid-cols-2 gap-2">
                                                    <div className="rounded-lg bg-white px-2 py-2">
                                                        <p className="text-xs text-[#7A6A84]">
                                                            Orders
                                                        </p>
                                                        <p className="text-sm font-semibold text-[#1A1220]">
                                                            {
                                                                branchData.orders
                                                                    .length
                                                            }
                                                        </p>
                                                    </div>

                                                    <div className="rounded-lg bg-white px-2 py-2">
                                                        <p className="text-xs text-[#7A6A84]">
                                                            Revenue
                                                        </p>
                                                        <p className="text-sm font-semibold text-[#1A1220]">
                                                            {peso(branchData.profit)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        {!pos.selectedBranch || !pos.selectedBranchData ? (
                            <section className="overflow-hidden rounded-[16px] border border-[#E6DDF0] bg-white shadow-sm">
                                <div className="border-b border-[#E6DDF0] bg-white px-3 py-3">
                                    <h3 className="text-[16px] font-bold text-[#1A1220]">
                                        Branch Orders
                                    </h3>
                                    <p className="text-xs text-[#7A6A84]">
                                        Select a branch above to view its order list.
                                    </p>
                                </div>

                                <div className="flex min-h-[160px] items-center justify-center bg-white">
                                    <p className="text-sm text-[#9B8AAA]">
                                        No branch selected yet.
                                    </p>
                                </div>
                            </section>
                        ) : (
                            <OrdersTable
                                title={`${pos.selectedBranch.branchName} Orders`}
                                subtitle={`${pos.selectedBranchData.orders.length} orders for this branch.`}
                                orders={pos.selectedBranchData.orders}
                                emptyText="No orders found for this branch."
                            />
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
