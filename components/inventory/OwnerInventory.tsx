"use client";

import * as React from "react";
import { Plus, RefreshCw, Search } from "lucide-react";
import { useInventoryController } from "@/hooks/useInventory";
import {
    BranchListItem,
    CategoryPills,
    EmptyInventory,
    InventoryDialogs,
    InventoryStats,
    ProductTable,
    SearchAndActions,
    StoreIcon,
} from "./_shared";

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

export default function OwnerInventory() {
    const [refreshKey, setRefreshKey] = React.useState(0);
    const [currentDateTime, setCurrentDateTime] =
        React.useState<Date | null>(null);

    React.useEffect(() => {
        const updateDateTime = () => setCurrentDateTime(new Date());

        updateDateTime();

        const timer = window.setInterval(updateDateTime, 30_000);

        return () => {
            window.clearInterval(timer);
        };
    }, []);

    const refreshInventoryDetails = React.useCallback(() => {
        /*
         * This remounts only the inventory content and runs
         * useInventoryController again. The browser page itself does not reload.
         */
        setRefreshKey((currentKey) => currentKey + 1);
    }, []);

    return (
        <>
            <header className="sticky top-0 z-20 border-b border-[#E9E0EF] bg-[#FFFDF8]/95 font-sans backdrop-blur">
                <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 px-6 py-3">
                    <h1 className="text-[25px] font-bold text-[#1A1220]">
                        Inventory
                    </h1>

                    <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-[42px] items-center rounded-xl border border-[#E6DDF0] bg-white px-3.5 text-sm font-semibold text-[#2B174C] shadow-sm">
                            {currentDateTime
                                ? formatCurrentDateTime(currentDateTime)
                                : "Loading date..."}
                        </span>

                        <button
                            type="button"
                            onClick={refreshInventoryDetails}
                            aria-label="Refresh inventory"
                            title="Refresh inventory"
                            className="inline-flex h-[42px] items-center gap-2 rounded-xl bg-[#2B174C] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1B0D31]"
                        >
                            <RefreshCw size={16} />
                            Refresh
                        </button>
                    </div>
                </div>
            </header>

            <OwnerInventoryContent key={refreshKey} />
        </>
    );
}

function OwnerInventoryContent() {
    const inv = useInventoryController();
    const [branchSearch, setBranchSearch] = React.useState("");

    const filteredBranches = React.useMemo(() => {
        const q = branchSearch.trim().toLowerCase();

        if (!q) return inv.branches;

        return inv.branches.filter((branch) =>
            branch.branchName.toLowerCase().includes(q)
        );
    }, [branchSearch, inv.branches]);

    return (
        <>
            <section className="px-5 py-5">
                <div className="space-y-4">
                    <section className="rounded-[16px] border border-[#E6DDF0] bg-white p-4 shadow-sm">
                        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-3">
                                <StoreIcon />

                                <div>
                                    <h2 className="text-base font-semibold text-[#1A1220]">
                                        Branches
                                    </h2>
                                    <p className="text-xs text-[#9B8AAA]">
                                        {filteredBranches.length} shown /{" "}
                                        {inv.branches.length} total
                                    </p>
                                </div>
                            </div>

                            <div className="relative w-full lg:max-w-sm">
                                <Search
                                    size={14}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9B8AAA]"
                                />

                                <input
                                    value={branchSearch}
                                    onChange={(
                                        event: React.ChangeEvent<HTMLInputElement>
                                    ) => setBranchSearch(event.target.value)}
                                    placeholder="Search branch..."
                                    className="w-full rounded-xl border border-[#E3D8EA] bg-white px-3 py-2.5 pl-9 text-sm text-[#1A1220] outline-none placeholder:text-[#9B8AAA] focus:border-[#2B174C]"
                                />
                            </div>
                        </div>

                        {filteredBranches.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-[#E6DDF0] bg-[#FFFCF7] p-4 text-sm text-[#9B8AAA]">
                                No matching branches found.
                            </p>
                        ) : (
                            <div className="-mx-1 overflow-x-auto px-1 pb-2">
                                <div className="flex w-max min-w-full gap-3">
                                    {filteredBranches.map((branch) => (
                                        <div
                                            key={branch.id}
                                            className="w-[280px] shrink-0"
                                        >
                                            <BranchListItem
                                                branch={branch}
                                                products={
                                                    inv.branchGroups[
                                                        String(branch.id)
                                                        ] || []
                                                }
                                                selected={
                                                    inv.selectedBranchId ===
                                                    String(branch.id)
                                                }
                                                onClick={() =>
                                                    inv.setSelectedBranchId(
                                                        String(branch.id)
                                                    )
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="overflow-hidden rounded-[16px] border border-[#E6DDF0] bg-white shadow-sm">
                        <div className="border-b border-[#E6DDF0] bg-[#FFFCF7] px-4 py-4">
                            <p className="text-lg font-semibold text-[#1A1220]">
                                {inv.selectedBranch?.branchName ||
                                    "Select a Branch"}
                            </p>

                            <p className="text-xs text-[#8A7A91]">
                                {inv.selectedBranch
                                    ? `${inv.baseProducts.length} products in this branch.`
                                    : "Choose a branch from the branch list above to view inventory."}
                            </p>
                        </div>

                        {inv.selectedBranch ? (
                            <div className="space-y-4 p-4">
                                <InventoryStats
                                    products={inv.baseProducts}
                                />

                                <SearchAndActions
                                    search={inv.search}
                                    setSearch={inv.setSearch}
                                    isOwner
                                    onManageCategories={
                                        inv.openManageCategories
                                    }
                                    onAddProduct={inv.openAddProduct}
                                    onUploadFile={inv.openImportDialog}
                                />

                                <CategoryPills
                                    categories={inv.categories}
                                    selectedCategory={inv.selectedCategory}
                                    setSelectedCategory={
                                        inv.setSelectedCategory
                                    }
                                />

                                {inv.filteredProducts.length === 0 ? (
                                    <EmptyInventory message="No products found for this branch." />
                                ) : (
                                    <ProductTable
                                        products={inv.filteredProducts}
                                        isOwner
                                        onEdit={inv.handleEditProduct}
                                        onDelete={inv.requestDeleteProduct}
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="flex min-h-[420px] items-center justify-center p-4">
                                <p className="text-sm text-[#9B8AAA]">
                                    Select a branch to view its inventory.
                                </p>
                            </div>
                        )}
                    </section>
                </div>
            </section>

            <InventoryDialogs inv={inv} />
        </>
    );
}
