"use client";

import RoleSidebar from "@/components/sidebar/RoleSidebar";
import {
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Search, X } from "lucide-react";

type ManagerStatus = "active" | "inactive" | "pending";

type BranchManager = {
    id: number;
    name: string;
    email: string;
    branch: string;
    status: ManagerStatus;
};

type RawManager = Record<string, unknown>;

function asText(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatus(value: unknown): ManagerStatus {
    const status = asText(value).toLowerCase();

    if (status === "active") return "active";
    if (status === "inactive" || status === "disabled") return "inactive";

    return "pending";
}

function normalizeManager(value: unknown): BranchManager {
    const manager =
        value && typeof value === "object" ? (value as RawManager) : {};

    return {
        id: asNumber(
            manager.id ??
            manager.manager_id ??
            manager.managerId ??
            manager.user_id ??
            manager.userId
        ),
        name:
            asText(manager.name) ||
            asText(manager.manager_name) ||
            asText(manager.full_name) ||
            asText(manager.fullName) ||
            "Unnamed manager",
        email:
            asText(manager.email) ||
            asText(manager.manager_email) ||
            "No email provided",
        branch:
            asText(manager.branch) ||
            asText(manager.branch_name) ||
            asText(manager.branchName) ||
            "No branch assigned",
        status: normalizeStatus(
            manager.status ??
            manager.manager_status ??
            manager.account_status ??
            manager.accountStatus
        ),
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

function getStatusLabel(status: ManagerStatus) {
    if (status === "active") return "Active";
    if (status === "inactive") return "Inactive";
    return "Pending";
}

function getStatusClass(status: ManagerStatus) {
    if (status === "active") {
        return "border-[#B7E9C8] bg-[#EDFBF1] text-[#138342]";
    }

    if (status === "inactive") {
        return "border-[#F3C6C6] bg-[#FFF1F1] text-[#C13333]";
    }

    return "border-[#F4D79A] bg-[#FFF8E8] text-[#A56607]";
}

export default function BranchManagersPage() {
    const router = useRouter();

    const [managers, setManagers] = useState<BranchManager[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [search, setSearch] = useState("");
    const [error, setError] = useState("");
    const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);

    const loadManagers = useCallback(async () => {
        const token =
            sessionStorage.getItem("token") || localStorage.getItem("token");

        if (!token) {
            router.push("/");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/branch-managers", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                cache: "no-store",
            });

            const rawText = await response.text();

            let data: {
                managers?: unknown[];
                branch_managers?: unknown[];
                error?: string;
                message?: string;
            } = {};

            try {
                data = rawText ? JSON.parse(rawText) : {};
            } catch {
                data = {
                    error:
                        rawText ||
                        "The Branch Managers service returned an invalid response.",
                };
            }

            if (!response.ok) {
                setManagers([]);
                setError(
                    data.error ||
                    data.message ||
                    `Unable to load branch managers (HTTP ${response.status}).`
                );
                return;
            }

            const records = Array.isArray(data.managers)
                ? data.managers
                : Array.isArray(data.branch_managers)
                    ? data.branch_managers
                    : [];

            setManagers(
                records
                    .map(normalizeManager)
                    .filter((manager) => manager.id > 0)
            );
        } catch (requestError: unknown) {
            setManagers([]);
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Unable to load branch managers. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        void loadManagers();
    }, [loadManagers]);

    useEffect(() => {
        const updateDateTime = () => setCurrentDateTime(new Date());

        updateDateTime();
        const timer = window.setInterval(updateDateTime, 30_000);

        return () => {
            window.clearInterval(timer);
        };
    }, []);

    const totals = useMemo(() => {
        const active = managers.filter(
            (manager) => manager.status === "active"
        ).length;

        const inactive = managers.filter(
            (manager) => manager.status === "inactive"
        ).length;

        return {
            total: managers.length,
            active,
            inactive,
        };
    }, [managers]);

    const filteredManagers = useMemo(() => {
        const query = search.trim().toLowerCase();

        return managers.filter((manager) => {
            return (
                !query ||
                `${manager.name} ${manager.email} ${manager.branch} ${getStatusLabel(
                    manager.status
                )}`
                    .toLowerCase()
                    .includes(query)
            );
        });
    }, [managers, search]);

    const updateManagerStatus = async (manager: BranchManager) => {
        const token =
            sessionStorage.getItem("token") || localStorage.getItem("token");

        if (!token) {
            router.push("/");
            return;
        }

        const willDeactivate = manager.status !== "inactive";

        const confirmed = window.confirm(
            willDeactivate
                ? `Deactivate ${manager.name}? They will no longer be able to access their branch account.`
                : `Reactivate ${manager.name}? They will regain access to their branch account.`
        );

        if (!confirmed) return;

        setUpdatingId(manager.id);
        setError("");

        try {
            const response = await fetch("/api/branch-managers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: willDeactivate
                        ? "deactivate_manager"
                        : "reactivate_manager",
                    manager_id: manager.id,
                }),
            });

            const rawText = await response.text();

            let data: { error?: string; message?: string } = {};

            try {
                data = rawText ? JSON.parse(rawText) : {};
            } catch {
                data = {
                    error:
                        rawText ||
                        "The Branch Managers service returned an invalid response.",
                };
            }

            if (!response.ok) {
                setError(
                    data.error ||
                    data.message ||
                    `Unable to update manager (HTTP ${response.status}).`
                );
                return;
            }

            setManagers((currentManagers) =>
                currentManagers.map((item) =>
                    item.id === manager.id
                        ? {
                            ...item,
                            status: willDeactivate ? "inactive" : "active",
                        }
                        : item
                )
            );
        } catch (requestError: unknown) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Unable to update this manager."
            );
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div
            className="flex min-h-screen font-sans text-[#1A1220]"
            style={{ backgroundColor: "#FDFAF4" }}
        >
            <RoleSidebar />

            <main className="min-w-0 flex-1 overflow-y-auto font-sans">
                <header className="sticky top-0 z-20 border-b border-[#E9E0EF] bg-[#FFFDF8]/95 backdrop-blur">
                    <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 px-6 py-3">
                        <h1 className="text-[25px] font-bold text-[#1A1220]">
                            Branch Managers
                        </h1>

                        <div className="flex items-center gap-2.5">
                            <span className="inline-flex h-[42px] items-center rounded-xl border border-[#E6DDF0] bg-white px-3.5 text-sm font-semibold text-[#2B174C] shadow-sm">
                                {currentDateTime
                                    ? formatCurrentDateTime(currentDateTime)
                                    : "Loading date..."}
                            </span>

                            <button
                                type="button"
                                onClick={() => void loadManagers()}
                                disabled={loading}
                                aria-label="Refresh branch managers"
                                title="Refresh branch managers"
                                className="inline-flex h-[42px] items-center gap-2 rounded-xl bg-[#2B174C] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1B0D31] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <RefreshCw
                                    size={16}
                                    className={loading ? "animate-spin" : ""}
                                />
                                Refresh
                            </button>
                        </div>
                    </div>
                </header>

                <section className="space-y-3.5 px-6 py-5">
                    <div className="grid gap-3 md:grid-cols-3">
                        <StatCard title="Total Managers" value={totals.total} />
                        <StatCard
                            title="Active Managers"
                            value={totals.active}
                        />
                        <StatCard
                            title="Inactive Managers"
                            value={totals.inactive}
                        />
                    </div>

                    <div className="relative">
                        <Search
                            size={16}
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9B8AAA]"
                        />

                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search manager name, email, branch, or status..."
                            className="h-[42px] w-full rounded-xl border border-[#E6DDF0] bg-white px-4 pl-10 text-sm text-[#1A1220] outline-none shadow-sm placeholder:text-[#9B8AAA] transition focus:border-[#2B174C] focus:ring-4 focus:ring-[#2B174C]/10"
                        />

                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                aria-label="Clear manager search"
                                className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[#806A8C] transition hover:bg-[#F1E9FF] hover:text-[#2B174C]"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="rounded-xl border border-[#F3C4C4] bg-[#FFF2F2] px-3 py-2.5 text-sm font-medium text-[#9B1C1C]">
                            {error}
                        </div>
                    )}

                    <section className="overflow-hidden rounded-[14px] border border-[#E6DDF0] bg-white shadow-sm">
                        <div className="flex items-center justify-between gap-3 border-b border-[#E6DDF0] px-4 py-3.5">
                            <div>
                                <h2 className="text-[16px] font-bold text-[#1A1220]">
                                    Manager List
                                </h2>
                                <p className="mt-0.5 text-xs text-[#7A6A84]">
                                    Managers assigned across all branches.
                                </p>
                            </div>

                            <span className="text-xs font-semibold text-[#806A8C]">
                                {filteredManagers.length}{" "}
                                {filteredManagers.length === 1
                                    ? "manager"
                                    : "managers"}
                            </span>
                        </div>

                        {loading ? (
                            <div className="px-4 py-16 text-center text-sm text-[#7A6A84]">
                                Loading branch managers...
                            </div>
                        ) : filteredManagers.length === 0 ? (
                            <div className="px-4 py-16 text-center">
                                <p className="text-sm font-semibold text-[#1A1220]">
                                    No managers found.
                                </p>
                                <p className="mt-1 text-sm text-[#7A6A84]">
                                    Try another search or status filter.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] border-collapse font-sans">
                                    <thead className="bg-[#FFFCF7]">
                                    <tr className="border-b border-[#E6DDF0]">
                                        <TableHeader>Manager</TableHeader>
                                        <TableHeader>Branch</TableHeader>
                                        <TableHeader>Status</TableHeader>
                                        <TableHeader align="right">
                                            Actions
                                        </TableHeader>
                                    </tr>
                                    </thead>

                                    <tbody>
                                    {filteredManagers.map((manager) => {
                                        const isUpdating =
                                            updatingId === manager.id;
                                        const isInactive =
                                            manager.status === "inactive";

                                        return (
                                            <tr
                                                key={manager.id}
                                                className="border-b border-[#EEE7F2] last:border-b-0 transition hover:bg-[#FFFCF7]"
                                            >
                                                <td className="px-5 py-4">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-[#1A1220]">
                                                            {manager.name}
                                                        </p>
                                                        <p className="mt-1 truncate text-xs text-[#7A6A84]">
                                                            {manager.email}
                                                        </p>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                        <span className="text-sm font-medium text-[#1A1220]">
                                                            {manager.branch}
                                                        </span>
                                                </td>

                                                <td className="px-5 py-4">
                                                        <span
                                                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                                                manager.status
                                                            )}`}
                                                        >
                                                            {getStatusLabel(
                                                                manager.status
                                                            )}
                                                        </span>
                                                </td>

                                                <td className="px-5 py-4 text-right">
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            isUpdating
                                                        }
                                                        onClick={() =>
                                                            void updateManagerStatus(
                                                                manager
                                                            )
                                                        }
                                                        className={`inline-flex h-[36px] items-center justify-center rounded-lg px-3.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                                            isInactive
                                                                ? "border border-[#D7C7E8] bg-white text-[#2B174C] hover:bg-[#F7F1FF]"
                                                                : "bg-[#A33E20] text-white hover:bg-[#883117]"
                                                        }`}
                                                    >
                                                        {isUpdating
                                                            ? "Saving..."
                                                            : isInactive
                                                                ? "Reactivate"
                                                                : "Deactivate"}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </section>
            </main>
        </div>
    );
}

function StatCard({
                      title,
                      value,
                  }: {
    title: string;
    value: number;
}) {
    return (
        <div className="flex min-h-[112px] flex-col justify-center rounded-[14px] border border-[#E6DDF0] bg-white px-4 py-4 shadow-sm">
            <p className="text-sm font-medium text-[#281246]">{title}</p>
            <p className="mt-2 text-[24px] font-bold leading-none text-[#1A1220]">
                {value}
            </p>
        </div>
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
            className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#806A8C] ${
                align === "right" ? "text-right" : "text-left"
            }`}
        >
            {children}
        </th>
    );
}
