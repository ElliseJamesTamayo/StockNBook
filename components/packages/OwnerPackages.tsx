"use client";

import {
    Building2,
    Check,
    ChevronDown,
    RefreshCw,
    Search,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    EmptyState,
    getPackageCategory,
    getToken,
    PACKAGE_CATEGORY_OPTIONS,
    PackageCard,
    type PackageCategory,
    type PackageItem,
} from "./_shared";

type RawBranch = {
    id?: number | string;
    branch_id?: number | string;
    branchId?: number | string;
    branch_name?: string | null;
    branchName?: string | null;
    name?: string | null;
};

type Branch = {
    id: number;
    name: string;
};

type BranchesResponse = {
    branches?: RawBranch[];
    error?: string;
};

type PackagesResponse = {
    packages?: PackageItem[];
    error?: string;
};

function normalizeBranch(rawBranch: RawBranch): Branch | null {
    const rawId =
        rawBranch.id ?? rawBranch.branch_id ?? rawBranch.branchId ?? null;

    const id = Number(rawId);
    const name =
        rawBranch.branch_name ??
        rawBranch.branchName ??
        rawBranch.name ??
        "";

    if (!Number.isFinite(id) || id <= 0 || !name.trim()) {
        return null;
    }

    return {
        id,
        name: name.trim(),
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

export default function OwnerPackages() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<number | null>(
        null
    );
    const [packages, setPackages] = useState<PackageItem[]>([]);
    const [loadedPackageBranchId, setLoadedPackageBranchId] = useState<
        number | null
    >(null);

    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] =
        useState<PackageCategory>("All");

    const [branchQuery, setBranchQuery] = useState("");
    const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);

    const [loadingBranches, setLoadingBranches] = useState(true);
    const [loadingPackages, setLoadingPackages] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);

    const branchSelectorRef = useRef<HTMLDivElement>(null);

    const selectedBranch =
        branches.find((branch) => branch.id === selectedBranchId) ?? null;

    const matchingBranches = useMemo(() => {
        const query = branchQuery.trim().toLowerCase();

        if (!query) return branches;

        return branches.filter((branch) =>
            branch.name.toLowerCase().includes(query)
        );
    }, [branches, branchQuery]);

    const loadBranches = useCallback(async (signal?: AbortSignal) => {
        setLoadingBranches(true);
        setError("");

        try {
            const token = getToken();

            const response = await fetch("/api/branches", {
                method: "GET",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                signal,
            });

            if (!response.ok) {
                throw new Error("Unable to load branches.");
            }

            const data = (await response.json()) as BranchesResponse;
            const loadedBranches = Array.isArray(data.branches)
                ? data.branches
                    .map(normalizeBranch)
                    .filter((branch): branch is Branch => branch !== null)
                : [];

            if (signal?.aborted) return;

            setBranches(loadedBranches);

            // Do not assign a default branch. The owner must choose one.
            setSelectedBranchId((currentBranchId) => {
                const isStillAvailable = loadedBranches.some(
                    (branch) => branch.id === currentBranchId
                );

                return isStillAvailable ? currentBranchId : null;
            });
        } catch (requestError) {
            if (signal?.aborted) return;

            console.error("OWNER PACKAGES BRANCH ERROR:", requestError);
            setBranches([]);
            setSelectedBranchId(null);
            setPackages([]);
            setLoadedPackageBranchId(null);
            setBranchQuery("");
            setError("Unable to load branches. Please refresh and try again.");
        } finally {
            if (!signal?.aborted) {
                setLoadingBranches(false);
            }
        }
    }, []);

    const loadPackagesForBranch = useCallback(
        async (branchId: number, signal?: AbortSignal) => {
            setLoadingPackages(true);
            setError("");

            try {
                const token = getToken();

                const response = await fetch("/api/packages", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({
                        action: "get_packages",
                        branch_id: branchId,
                    }),
                    signal,
                });

                if (!response.ok) {
                    throw new Error("Unable to load packages.");
                }

                const data = (await response.json()) as PackagesResponse;

                if (signal?.aborted) return;

                setPackages(
                    Array.isArray(data.packages) ? data.packages : []
                );
                setLoadedPackageBranchId(branchId);
            } catch (requestError) {
                if (signal?.aborted) return;

                console.error("OWNER PACKAGES LOAD ERROR:", requestError);
                setPackages([]);
                setLoadedPackageBranchId(branchId);
                setError(
                    "Unable to load packages for this branch. Please try again."
                );
            } finally {
                if (!signal?.aborted) {
                    setLoadingPackages(false);
                }
            }
        },
        []
    );

    useEffect(() => {
        const controller = new AbortController();

        const frameId = window.requestAnimationFrame(() => {
            void loadBranches(controller.signal);
        });

        return () => {
            window.cancelAnimationFrame(frameId);
            controller.abort();
        };
    }, [loadBranches]);

    useEffect(() => {
        if (!selectedBranchId) return;

        const controller = new AbortController();

        const frameId = window.requestAnimationFrame(() => {
            void loadPackagesForBranch(selectedBranchId, controller.signal);
        });

        return () => {
            window.cancelAnimationFrame(frameId);
            controller.abort();
        };
    }, [selectedBranchId, loadPackagesForBranch]);

    useEffect(() => {
        const updateDateTime = () => setCurrentDateTime(new Date());

        updateDateTime();
        const timer = window.setInterval(updateDateTime, 30_000);

        return () => {
            window.clearInterval(timer);
        };
    }, []);

    useEffect(() => {
        const closeBranchMenuOnOutsideClick = (event: MouseEvent) => {
            if (
                branchSelectorRef.current &&
                !branchSelectorRef.current.contains(event.target as Node)
            ) {
                setIsBranchMenuOpen(false);

                if (selectedBranch) {
                    setBranchQuery(selectedBranch.name);
                } else {
                    setBranchQuery("");
                }
            }
        };

        document.addEventListener("mousedown", closeBranchMenuOnOutsideClick);

        return () => {
            document.removeEventListener(
                "mousedown",
                closeBranchMenuOnOutsideClick
            );
        };
    }, [selectedBranch]);

    const filteredPackages = useMemo(() => {
        const query = search.trim().toLowerCase();

        return packages.filter((pkg) => {
            const matchesSearch =
                !query ||
                pkg.name.toLowerCase().includes(query) ||
                (pkg.description || "").toLowerCase().includes(query) ||
                (pkg.duration || "").toLowerCase().includes(query);

            const matchesCategory =
                selectedCategory === "All" ||
                getPackageCategory(pkg) === selectedCategory;

            return matchesSearch && matchesCategory;
        });
    }, [packages, search, selectedCategory]);

    const hasLoadedSelectedBranch =
        selectedBranchId !== null &&
        loadedPackageBranchId === selectedBranchId;

    const handleSelectBranch = (branch: Branch) => {
        setSelectedBranchId(branch.id);
        setBranchQuery(branch.name);
        setIsBranchMenuOpen(false);
        setSearch("");
        setSelectedCategory("All");
        setPackages([]);
        setLoadedPackageBranchId(null);
    };

    const handleBranchInputFocus = () => {
        setIsBranchMenuOpen(true);

        if (selectedBranch && branchQuery === selectedBranch.name) {
            setBranchQuery("");
        }
    };

    const handleRefresh = async () => {
        const branchIdToRefresh = selectedBranchId;

        setIsRefreshing(true);

        try {
            // Only reloads branch/package data. It does not reload the page.
            await loadBranches();

            if (branchIdToRefresh) {
                await loadPackagesForBranch(branchIdToRefresh);
            }
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <>
            <header className="sticky top-0 z-20 border-b border-[#E9E0EF] bg-[#FFFDF8]/95 font-sans backdrop-blur">
                <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 px-6 py-3">
                    <div className="flex items-center gap-3">
                        <h1 className="text-[25px] font-bold text-[#1A1220]">
                            Packages
                        </h1>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-[42px] items-center rounded-xl border border-[#E6DDF0] bg-white px-3.5 text-sm font-semibold text-[#2B174C] shadow-sm">
                            {currentDateTime
                                ? formatCurrentDateTime(currentDateTime)
                                : "Loading date..."}
                        </span>

                        <button
                            type="button"
                            onClick={() => void handleRefresh()}
                            disabled={isRefreshing}
                            aria-label="Refresh packages"
                            title="Refresh packages"
                            className="inline-flex h-[42px] items-center gap-2 rounded-xl bg-[#2B174C] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1B0D31] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <RefreshCw
                                size={16}
                                className={isRefreshing ? "animate-spin" : ""}
                            />
                            Refresh
                        </button>
                    </div>
                </div>
            </header>

            <section className="px-6 py-4 font-sans">
                <div className="space-y-3">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_290px]">
                        <div className="relative">
                            <Search
                                size={15}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9B8AAA]"
                            />
                            <input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                disabled={!selectedBranchId}
                                placeholder={
                                    selectedBranchId
                                        ? "Search packages..."
                                        : "Select a branch first"
                                }
                                className="w-full rounded-xl border border-[#E3D8EA] bg-white px-4 py-2.5 pl-10 text-sm text-[#1A1220] outline-none shadow-sm placeholder:text-[#9B8AAA] focus:border-[#2B174C] disabled:cursor-not-allowed disabled:bg-[#FCFAFD] disabled:text-[#9B8AAA]"
                            />
                        </div>

                        <div ref={branchSelectorRef} className="relative">
                            <Building2
                                size={15}
                                className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#9B8AAA]"
                            />

                            <input
                                value={branchQuery}
                                onFocus={handleBranchInputFocus}
                                onChange={(event) => {
                                    setBranchQuery(event.target.value);
                                    setIsBranchMenuOpen(true);
                                }}
                                onKeyDown={(event) => {
                                    if (
                                        event.key === "Escape" ||
                                        event.key === "Tab"
                                    ) {
                                        setIsBranchMenuOpen(false);
                                    }
                                }}
                                disabled={loadingBranches}
                                placeholder={
                                    loadingBranches
                                        ? "Loading branches..."
                                        : "Search or select branch..."
                                }
                                className="w-full rounded-xl border border-[#E3D8EA] bg-white px-10 py-2.5 pr-10 text-sm font-semibold text-[#1A1220] outline-none shadow-sm placeholder:font-normal placeholder:text-[#9B8AAA] focus:border-[#2B174C] disabled:cursor-not-allowed disabled:opacity-60"
                                role="combobox"
                                aria-expanded={isBranchMenuOpen}
                                aria-controls="owner-package-branch-options"
                                aria-autocomplete="list"
                            />

                            <button
                                type="button"
                                onClick={() => {
                                    setIsBranchMenuOpen((isOpen) => !isOpen);

                                    if (!isBranchMenuOpen) {
                                        setBranchQuery("");
                                    }
                                }}
                                className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-[#2B174C]"
                                aria-label="Show branch choices"
                            >
                                <ChevronDown
                                    size={14}
                                    className={`transition ${
                                        isBranchMenuOpen ? "rotate-180" : ""
                                    }`}
                                />
                            </button>

                            {isBranchMenuOpen && !loadingBranches && (
                                <div
                                    id="owner-package-branch-options"
                                    className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-[#D8CBE7] bg-white py-1 shadow-lg"
                                    role="listbox"
                                >
                                    {matchingBranches.length === 0 ? (
                                        <p className="px-4 py-3 text-sm text-[#7A6A84]">
                                            No matching branch found.
                                        </p>
                                    ) : (
                                        matchingBranches.map((branch) => {
                                            const isSelected =
                                                branch.id === selectedBranchId;

                                            return (
                                                <button
                                                    key={branch.id}
                                                    type="button"
                                                    role="option"
                                                    aria-selected={isSelected}
                                                    onMouseDown={(event) =>
                                                        event.preventDefault()
                                                    }
                                                    onClick={() =>
                                                        handleSelectBranch(
                                                            branch
                                                        )
                                                    }
                                                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition ${
                                                        isSelected
                                                            ? "bg-[#F1E9FF] font-semibold text-[#2B174C]"
                                                            : "text-[#1A1220] hover:bg-[#F7F1FF]"
                                                    }`}
                                                >
                                                    <span className="truncate">
                                                        {branch.name}
                                                    </span>

                                                    {isSelected && (
                                                        <Check
                                                            size={15}
                                                            className="shrink-0"
                                                        />
                                                    )}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {selectedBranchId && (
                        <div className="rounded-[14px] border border-[#E6DDF0] bg-white p-3 shadow-sm">
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <h2 className="text-sm font-bold text-[#1A1220]">
                                    Categories
                                </h2>

                                <span className="text-xs font-semibold text-[#806A8C]">
                                    {PACKAGE_CATEGORY_OPTIONS.length - 1} categories
                                </span>
                            </div>

                            <div className="overflow-x-auto pb-1">
                                <div className="flex min-w-max gap-2">
                                    {PACKAGE_CATEGORY_OPTIONS.map(
                                        (category) => {
                                            const selected =
                                                selectedCategory === category;

                                            return (
                                                <button
                                                    key={category}
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedCategory(
                                                            category
                                                        )
                                                    }
                                                    aria-pressed={selected}
                                                    className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                                                        selected
                                                            ? "bg-[#2B174C] text-white shadow-sm"
                                                            : "border border-[#E6DDF0] bg-white text-[#5F4E75] hover:bg-[#F7F1FF]"
                                                    }`}
                                                >
                                                    {category}
                                                </button>
                                            );
                                        }
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="rounded-xl border border-[#F3C4C4] bg-[#FFF2F2] px-3 py-2.5 text-xs font-medium text-[#9B1C1C]">
                            {error}
                        </div>
                    )}

                    <section className="min-h-[440px] rounded-[14px] border border-[#E6DDF0] bg-white p-3 shadow-sm">
                        <div className="mb-3 flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-[16px] font-bold text-[#1A1220]">
                                    {selectedBranch
                                        ? `${selectedBranch.name} Package List`
                                        : "Branch Package List"}
                                </h2>

                                <p className="mt-0.5 text-xs text-[#7A6A84]">
                                    {selectedBranch
                                        ? "Packages available in the selected branch."
                                        : "Choose a branch using the branch selector above."}
                                </p>
                            </div>

                            {selectedBranchId && (
                                <span className="shrink-0 text-xs font-semibold text-[#806A8C]">
                                    {filteredPackages.length} package
                                    {filteredPackages.length !== 1
                                        ? "s"
                                        : ""}
                                </span>
                            )}
                        </div>

                        {loadingBranches ? (
                            <EmptyState
                                title="Loading branches..."
                                detail="Please wait while branch choices are being loaded."
                            />
                        ) : !selectedBranchId ? (
                            <EmptyState
                                title="Select a branch"
                                detail="Search or choose a branch above to view its packages."
                            />
                        ) : loadingPackages || !hasLoadedSelectedBranch ? (
                            <EmptyState
                                title="Loading branch packages..."
                                detail="Please wait while packages are being loaded."
                            />
                        ) : filteredPackages.length === 0 ? (
                            <EmptyState
                                title="No packages found."
                                detail={
                                    search || selectedCategory !== "All"
                                        ? "Try a different search or category."
                                        : "This branch does not have packages yet."
                                }
                            />
                        ) : (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {filteredPackages.map((pkg) => (
                                    <PackageCard
                                        key={pkg.id}
                                        pkg={pkg}
                                        canManage={false}
                                        onEdit={() => undefined}
                                        onDelete={() => undefined}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </section>
        </>
    );
}
