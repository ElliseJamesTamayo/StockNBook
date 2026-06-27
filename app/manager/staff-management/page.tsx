"use client";

import RoleSidebar from "@/components/sidebar/RoleSidebar";
import { RefreshCw, UserPlus, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AccessMode = "none" | "view" | "full";
type ReportsAccessMode = "none" | "view";

type StaffPermissions = {
    dashboard: boolean;

    pos: boolean;
    pos_access: AccessMode;

    bookings: boolean;
    bookings_access: AccessMode;

    inventory: boolean;
    inventory_access: AccessMode;

    packages: boolean;
    package_access: AccessMode;

    reports: boolean;
    reports_access: ReportsAccessMode;
};

type PendingInvite = {
    id: number | string;
    email: string;
    invitedAt: string;
    expiresAt: string;
    status: "Pending";
    permissions: StaffPermissions;
};

type StaffMember = {
    id: number | string;
    name: string;
    email: string;
    status: "Accepted" | "Inactive";
    permissions: StaffPermissions;
};

const defaultPermissions: StaffPermissions = {
    dashboard: true,

    pos: false,
    pos_access: "none",

    bookings: false,
    bookings_access: "none",

    inventory: false,
    inventory_access: "none",

    packages: false,
    package_access: "none",

    reports: false,
    reports_access: "none",
};

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

export default function ManagerStaffManagementPage() {
    const router = useRouter();

    const [branchName, setBranchName] = useState("Assigned branch");
    const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);

    const [staffName, setStaffName] = useState("");
    const [staffEmail, setStaffEmail] = useState("");
    const [permissions, setPermissions] =
        useState<StaffPermissions>(defaultPermissions);

    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
    const [staffList, setStaffList] = useState<StaffMember[]>([]);

    const [inviteLink, setInviteLink] = useState("");

    const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
    const [editPermissions, setEditPermissions] =
        useState<StaffPermissions>(defaultPermissions);
    const [savingEdit, setSavingEdit] = useState(false);

    const getToken = () => sessionStorage.getItem("token") || "";

    const loadStaff = useCallback(async () => {
        const token = getToken();

        if (!token) {
            router.push("/");
            return;
        }

        try {
            setPageLoading(true);

            const res = await fetch("/api/staff-management", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: "get_staff",
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "Failed to load staff.");
                return;
            }

            const rawStaff = data.staff || data.staff_list || [];
            const rawPending =
                data.pending_invites ||
                data.pendingInvites ||
                data.invites ||
                [];

            setStaffList(rawStaff.map(normalizeStaffMember));
            setPendingInvites(rawPending.map(normalizePendingInvite));
        } catch {
            alert("Something went wrong while loading staff.");
        } finally {
            setPageLoading(false);
        }
    }, [router]);

    useEffect(() => {
        const token = sessionStorage.getItem("token");
        const role = sessionStorage.getItem("role");

        let savedPermissions: Record<string, boolean> = {};

        try {
            savedPermissions = JSON.parse(
                sessionStorage.getItem("permissions") || "{}"
            );
        } catch {
            savedPermissions = {};
        }

        if (!token || role !== "manager") {
            router.push("/");
            return;
        }

        if (!savedPermissions.staff_management) {
            alert("You do not have access to staff management.");
            router.push("/dashboard");
            return;
        }

        setBranchName(sessionStorage.getItem("branch_name") || "Assigned branch");

        loadStaff();
    }, [router, loadStaff]);

    useEffect(() => {
        const updateDateTime = () => setCurrentDateTime(new Date());

        updateDateTime();
        const timer = window.setInterval(updateDateTime, 30_000);

        return () => {
            window.clearInterval(timer);
        };
    }, []);

    const updateFeatureAccess = (
        feature: "pos" | "bookings" | "inventory" | "packages",
        value: AccessMode
    ) => {
        const accessKey =
            feature === "packages" ? "package_access" : `${feature}_access`;

        setPermissions((prev) => ({
            ...prev,
            [feature]: value !== "none",
            [accessKey]: value,
        }));
    };

    const updateReportsAccess = (value: ReportsAccessMode) => {
        setPermissions((prev) => ({
            ...prev,
            reports: value !== "none",
            reports_access: value,
        }));
    };

    const updateEditFeatureAccess = (
        feature: "pos" | "bookings" | "inventory" | "packages",
        value: AccessMode
    ) => {
        const accessKey =
            feature === "packages" ? "package_access" : `${feature}_access`;

        setEditPermissions((prev) => ({
            ...prev,
            [feature]: value !== "none",
            [accessKey]: value,
        }));
    };

    const updateEditReportsAccess = (value: ReportsAccessMode) => {
        setEditPermissions((prev) => ({
            ...prev,
            reports: value !== "none",
            reports_access: value,
        }));
    };

    const clearForm = () => {
        setStaffName("");
        setStaffEmail("");
        setPermissions(defaultPermissions);
    };

    const handleSendInvite = async () => {
        if (!staffName.trim() || !staffEmail.trim()) {
            alert("Please enter staff name and email.");
            return;
        }

        const token = sessionStorage.getItem("token");

        if (!token) {
            router.push("/");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/staff-management", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: "invite_staff",
                    staff_name: staffName.trim(),
                    staff_email: staffEmail.trim(),
                    permissions,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || JSON.stringify(data));
                return;
            }

            const generatedLink = data.invite_link || data.inviteLink || "";

            setInviteLink(generatedLink);
            setStaffName("");
            setStaffEmail("");
            setPermissions(defaultPermissions);

            await loadStaff();

            alert("Staff invite link created!");
        } catch {
            alert("Something went wrong while creating staff invite.");
        } finally {
            setLoading(false);
        }
    };

    const handleEditStaff = (staff: StaffMember) => {
        setEditingStaff(staff);
        setEditPermissions(normalizePermissions(staff.permissions));
    };

    const handleSaveEdit = async () => {
        if (!editingStaff) return;

        const token = getToken();

        if (!token) {
            router.push("/");
            return;
        }

        setSavingEdit(true);

        try {
            const res = await fetch("/api/staff-management", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: "update_staff_permissions",
                    staff_id: editingStaff.id,
                    staff_email: editingStaff.email,
                    permissions: editPermissions,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || JSON.stringify(data));
                return;
            }
            window.dispatchEvent(new Event("stocknbook-permissions-updated"));

            setEditingStaff(null);
            await loadStaff();

            alert("Staff access updated!");
        } catch {
            alert("Something went wrong while updating staff access.");
        } finally {
            setSavingEdit(false);
        }
    };

    const handleResendInvite = async (email: string) => {
        const token = getToken();

        if (!token) {
            router.push("/");
            return;
        }

        try {
            const res = await fetch("/api/staff-management", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: "resend_staff_invite",
                    staff_email: email,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || JSON.stringify(data));
                return;
            }

            await loadStaff();
            alert(`Invite resent to ${email}`);
        } catch {
            alert("Something went wrong while resending invite.");
        }
    };

    return (
        <div className="flex min-h-screen bg-[#FDFAF4] font-sans text-[#1A1220]">
            <RoleSidebar />

            <main className="min-w-0 flex-1 overflow-y-auto">
                <header className="sticky top-0 z-20 border-b border-[#E9E0EF] bg-[#FFFDF8]/95 backdrop-blur">
                    <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 px-6 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <h1 className="truncate text-[25px] font-bold text-[#1A1220]">
                                Add Staff
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
                                onClick={() => void loadStaff()}
                                disabled={pageLoading}
                                aria-label="Refresh staff"
                                title="Refresh staff"
                                className="inline-flex h-[42px] items-center gap-2 rounded-xl bg-[#2B174C] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1B0D31] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <RefreshCw
                                    size={16}
                                    className={pageLoading ? "animate-spin" : ""}
                                />
                                Refresh
                            </button>
                        </div>
                    </div>
                </header>

                <section className="mx-auto max-w-5xl space-y-4 px-6 py-4">
                    <div className="rounded-[14px] border border-[#E6DDF0] bg-white p-5 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFE8F8] text-[#4E2C66]">
                                <UserPlus size={18} />
                            </div>

                            <div>
                                <h2 className="text-[16px] font-bold text-[#1A1220]">
                                    Add a staff member
                                </h2>

                                <p className="mt-1 text-xs leading-5 text-[#7A6A84]">
                                    Send an email invite and choose which features this staff member can access.
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <FormInput
                                label="Full name"
                                placeholder="Pedro Ramos"
                                value={staffName}
                                onChange={setStaffName}
                            />

                            <FormInput
                                label="Email address"
                                placeholder="pedro@example.com"
                                value={staffEmail}
                                onChange={setStaffEmail}
                            />
                        </div>

                        <div className="mt-5 border-t border-[#E6DDF0] pt-5">
                            <h3 className="text-[16px] font-bold text-[#1A1220]">
                                Feature access
                            </h3>

                            <p className="mt-1 text-xs text-[#7A6A84]">
                                Access applies to {branchName} only.
                            </p>

                            <div className="mt-4 space-y-3">
                                <DashboardAccessRow
                                    checked={permissions.dashboard}
                                    onChange={(checked) =>
                                        setPermissions((prev) => ({
                                            ...prev,
                                            dashboard: checked,
                                        }))
                                    }
                                />

                                <AccessModeRow
                                    label="POS / Sales"
                                    value={permissions.pos_access}
                                    onChange={(value) =>
                                        updateFeatureAccess("pos", value as AccessMode)
                                    }
                                />

                                <AccessModeRow
                                    label="Bookings"
                                    value={permissions.bookings_access}
                                    onChange={(value) =>
                                        updateFeatureAccess("bookings", value as AccessMode)
                                    }
                                />

                                <AccessModeRow
                                    label="Inventory"
                                    value={permissions.inventory_access}
                                    onChange={(value) =>
                                        updateFeatureAccess("inventory", value as AccessMode)
                                    }
                                />

                                <AccessModeRow
                                    label="Packages"
                                    value={permissions.package_access}
                                    onChange={(value) =>
                                        updateFeatureAccess("packages", value as AccessMode)
                                    }
                                />

                                <AccessModeRow
                                    label="Reports"
                                    value={permissions.reports_access}
                                    allowFull={false}
                                    onChange={(value) =>
                                        updateReportsAccess(value as ReportsAccessMode)
                                    }
                                />
                            </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <button
                                onClick={handleSendInvite}
                                disabled={loading}
                                className="inline-flex h-[42px] items-center justify-center rounded-xl bg-[#2B174C] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1B0D31] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? "Sending..." : "Send invite"}
                            </button>

                            <button
                                onClick={clearForm}
                                type="button"
                                className="inline-flex h-[42px] items-center justify-center rounded-xl border border-[#E6DDF0] bg-white px-5 text-sm font-semibold text-[#2B174C] transition hover:bg-[#F7F1FF]"
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    {inviteLink && (
                        <div className="rounded-[14px] border border-[#E6DDF0] bg-white p-5 shadow-sm">
                            <h2 className="text-[16px] font-bold text-[#1A1220]">
                                Staff invite link
                            </h2>

                            <p className="mt-1 text-xs text-[#7A6A84]">
                                Copy this link and use it to activate the staff account.
                            </p>

                            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <input
                                    readOnly
                                    value={inviteLink}
                                    className="h-[42px] w-full rounded-xl border border-[#E6DDF0] bg-[#FFFDF8] px-3 text-sm text-[#5F4E75] outline-none"
                                />

                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(inviteLink);
                                        alert("Staff invite link copied!");
                                    }}
                                    className="inline-flex h-[42px] items-center justify-center rounded-xl bg-[#2B174C] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1B0D31]"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="rounded-[14px] border border-[#E6DDF0] bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2">
                            <Users size={17} className="text-[#4E2C66]" />
                            <h2 className="text-[16px] font-bold text-[#1A1220]">
                                Current staff
                            </h2>
                        </div>

                        <div className="mt-4 space-y-3">
                            {pageLoading ? (
                                <EmptyState text="Loading staff..." />
                            ) : staffList.length === 0 ? (
                                <EmptyState text="No accepted staff yet." />
                            ) : (
                                staffList.map((staff) => (
                                    <div
                                        key={staff.id}
                                        className="flex flex-col gap-3 rounded-xl border border-[#E6DDF0] bg-[#FFFDF8] px-4 py-3 md:flex-row md:items-center md:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-[#1A1220]">
                                                {staff.name}
                                            </p>

                                            <p className="mt-0.5 truncate text-xs text-[#7A6A84]">
                                                {staff.email}
                                            </p>

                                            <p className="mt-1 truncate text-xs text-[#806A8C]">
                                                Access: {formatPermissions(staff.permissions)}
                                            </p>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-2">
                                            <StatusBadge label={staff.status} tone="green" />

                                            <button
                                                onClick={() => handleEditStaff(staff)}
                                                className="inline-flex h-[36px] items-center rounded-xl border border-[#E6DDF0] bg-white px-3 text-xs font-semibold text-[#2B174C] transition hover:bg-[#F7F1FF]"
                                            >
                                                Edit access
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="rounded-[14px] border border-[#E6DDF0] bg-white p-5 shadow-sm">
                        <h2 className="text-[16px] font-bold text-[#1A1220]">
                            Pending invites
                        </h2>

                        <div className="mt-4 space-y-2">
                            {pageLoading ? (
                                <EmptyState text="Loading invites..." />
                            ) : pendingInvites.length === 0 ? (
                                <EmptyState text="No pending invites yet." />
                            ) : (
                                pendingInvites.map((invite) => (
                                    <div
                                        key={invite.id}
                                        className="flex flex-col gap-3 rounded-xl border border-[#E6DDF0] bg-[#FFFDF8] px-4 py-3 md:flex-row md:items-center md:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-[#1A1220]">
                                                {invite.email}
                                            </p>

                                            <p className="mt-0.5 text-xs text-[#7A6A84]">
                                                Invited {invite.invitedAt} · Expires {invite.expiresAt}
                                            </p>

                                            <p className="mt-1 truncate text-xs text-[#806A8C]">
                                                Access: {formatPermissions(invite.permissions)}
                                            </p>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-2">
                                            <StatusBadge label={invite.status} tone="gold" />

                                            <button
                                                onClick={() => handleResendInvite(invite.email)}
                                                className="inline-flex h-[36px] items-center rounded-xl border border-[#E6DDF0] bg-white px-3 text-xs font-semibold text-[#2B174C] transition hover:bg-[#F7F1FF]"
                                            >
                                                Resend
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </section>
            </main>

            {editingStaff && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
                    <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-[18px] border border-[#E6DDF0] bg-white p-5 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-[20px] font-bold text-[#1A1220]">
                                    Edit staff access
                                </h2>

                                <p className="mt-1 text-sm text-[#7A6A84]">
                                    Update permissions for {editingStaff.name}.
                                </p>
                            </div>

                            <button
                                onClick={() => setEditingStaff(null)}
                                className="inline-flex h-[36px] items-center rounded-xl border border-[#E6DDF0] bg-white px-3 text-xs font-semibold text-[#2B174C] transition hover:bg-[#F7F1FF]"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mt-5 space-y-3">
                            <DashboardAccessRow
                                checked={editPermissions.dashboard}
                                onChange={(checked) =>
                                    setEditPermissions((prev) => ({
                                        ...prev,
                                        dashboard: checked,
                                    }))
                                }
                            />

                            <AccessModeRow
                                label="POS / Sales"
                                value={editPermissions.pos_access}
                                onChange={(value) =>
                                    updateEditFeatureAccess("pos", value as AccessMode)
                                }
                            />

                            <AccessModeRow
                                label="Bookings"
                                value={editPermissions.bookings_access}
                                onChange={(value) =>
                                    updateEditFeatureAccess("bookings", value as AccessMode)
                                }
                            />

                            <AccessModeRow
                                label="Inventory"
                                value={editPermissions.inventory_access}
                                onChange={(value) =>
                                    updateEditFeatureAccess("inventory", value as AccessMode)
                                }
                            />

                            <AccessModeRow
                                label="Packages"
                                value={editPermissions.package_access}
                                onChange={(value) =>
                                    updateEditFeatureAccess("packages", value as AccessMode)
                                }
                            />

                            <AccessModeRow
                                label="Reports"
                                value={editPermissions.reports_access}
                                allowFull={false}
                                onChange={(value) =>
                                    updateEditReportsAccess(value as ReportsAccessMode)
                                }
                            />
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <button
                                onClick={() => setEditingStaff(null)}
                                className="inline-flex h-[42px] items-center justify-center rounded-xl border border-[#E6DDF0] bg-white px-5 text-sm font-semibold text-[#2B174C] transition hover:bg-[#F7F1FF]"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleSaveEdit}
                                disabled={savingEdit}
                                className="inline-flex h-[42px] items-center justify-center rounded-xl bg-[#2B174C] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1B0D31] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {savingEdit ? "Saving..." : "Save changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function normalizeStaffMember(item: any): StaffMember {
    return {
        id: item.id || item.staff_id || item.user_id || item.email,
        name: item.name || item.staff_name || item.full_name || "Unnamed staff",
        email: item.email || item.staff_email || "",
        status:
            item.status === "Inactive" || item.status === "inactive"
                ? "Inactive"
                : "Accepted",
        permissions: normalizePermissions(item.permissions),
    };
}

function normalizePendingInvite(item: any): PendingInvite {
    return {
        id: item.id || item.invite_id || item.staff_email || item.email,
        email: item.email || item.staff_email || "",
        invitedAt:
            item.invitedAt ||
            item.invited_at ||
            item.created_at ||
            "Recently",
        expiresAt:
            item.expiresAt ||
            item.expires_at ||
            item.expiration ||
            "Pending",
        status: "Pending",
        permissions: normalizePermissions(item.permissions),
    };
}

function normalizePermissions(raw: any): StaffPermissions {
    let parsed = raw;

    if (typeof raw === "string") {
        try {
            parsed = JSON.parse(raw);
        } catch {
            parsed = {};
        }
    }

    parsed = parsed || {};

    const posAccess = getAccessValue(parsed.pos_access, parsed.pos);
    const bookingsAccess = getAccessValue(parsed.bookings_access, parsed.bookings);
    const inventoryAccess = getAccessValue(
        parsed.inventory_access,
        parsed.inventory
    );
    const packageAccess = getAccessValue(
        parsed.package_access,
        parsed.packages
    );
    const reportsAccess = getReportsAccessValue(
        parsed.reports_access,
        parsed.reports
    );

    return {
        dashboard: Boolean(parsed.dashboard),

        pos: posAccess !== "none",
        pos_access: posAccess,

        bookings: bookingsAccess !== "none",
        bookings_access: bookingsAccess,

        inventory: inventoryAccess !== "none",
        inventory_access: inventoryAccess,

        packages: packageAccess !== "none",
        package_access: packageAccess,

        reports: reportsAccess !== "none",
        reports_access: reportsAccess,
    };
}

function getAccessValue(value: any, legacyBoolean: any): AccessMode {
    if (value === "view" || value === "full" || value === "none") {
        return value;
    }

    if (legacyBoolean === true) return "full";
    return "none";
}

function getReportsAccessValue(
    value: any,
    legacyBoolean: any
): ReportsAccessMode {
    if (value === "view" || value === "none") {
        return value;
    }

    if (legacyBoolean === true) return "view";
    return "none";
}

function FormInput({
                       label,
                       placeholder,
                       value,
                       onChange,
                   }: {
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-[#1A1220]">
                {label}
            </label>

            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-[42px] w-full rounded-xl border border-[#E6DDF0] bg-[#FFFDF8] px-3 text-sm text-[#1A1220] outline-none placeholder:text-[#9B8AAA] transition focus:border-[#2B174C] focus:ring-4 focus:ring-[#2B174C]/10"
            />
        </div>
    );
}

function DashboardAccessRow({
                                checked,
                                onChange,
                            }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <div className="flex min-h-[58px] items-center justify-between rounded-xl border border-[#E6DDF0] bg-[#FFFDF8] px-4 py-3">
            <span className="text-sm font-semibold text-[#1A1220]">Dashboard</span>

            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative h-[26px] w-[48px] rounded-full transition ${
                    checked ? "bg-[#2B174C]" : "bg-[#D8CBE7]"
                }`}
            >
                <span
                    className={`absolute top-[3px] h-[20px] w-[20px] rounded-full bg-white transition ${
                        checked ? "left-[25px]" : "left-[3px]"
                    }`}
                />
            </button>
        </div>
    );
}

function AccessModeRow({
                           label,
                           value,
                           onChange,
                           allowFull = true,
                       }: {
    label: string;
    value: AccessMode | ReportsAccessMode;
    onChange: (value: AccessMode | ReportsAccessMode) => void;
    allowFull?: boolean;
}) {
    return (
        <div className="flex min-h-[58px] items-center justify-between rounded-xl border border-[#E6DDF0] bg-[#FFFDF8] px-4 py-3">
            <span className="text-sm font-semibold text-[#1A1220]">{label}</span>

            <select
                value={value}
                onChange={(e) =>
                    onChange(e.target.value as AccessMode | ReportsAccessMode)
                }
                className="h-[36px] min-w-[136px] rounded-xl border border-[#E6DDF0] bg-white px-3 text-xs font-semibold text-[#2B174C] outline-none transition focus:border-[#2B174C] focus:ring-4 focus:ring-[#2B174C]/10"
            >
                <option value="none">No access</option>
                <option value="view">View only</option>
                {allowFull && <option value="full">Full access</option>}
            </select>
        </div>
    );
}

function StatusBadge({
                         label,
                         tone,
                     }: {
    label: string;
    tone: "green" | "gold";
}) {
    const style =
        tone === "green"
            ? "border border-[#B7E9C8] bg-[#EDFBF1] text-[#138342]"
            : "border border-[#F4D79A] bg-[#FFF8E8] text-[#A56607]";

    return (
        <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}
        >
            {label}
        </span>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="rounded-xl border border-dashed border-[#E6DDF0] bg-[#FFFCF7] px-4 py-6 text-sm text-[#7A6A84]">
            {text}
        </div>
    );
}

function formatPermissions(permissions: StaffPermissions) {
    const list: string[] = [];

    if (permissions.dashboard) list.push("Dashboard");
    if (permissions.pos_access !== "none") {
        list.push(`POS / Sales: ${formatAccess(permissions.pos_access)}`);
    }
    if (permissions.bookings_access !== "none") {
        list.push(`Bookings: ${formatAccess(permissions.bookings_access)}`);
    }
    if (permissions.inventory_access !== "none") {
        list.push(`Inventory: ${formatAccess(permissions.inventory_access)}`);
    }
    if (permissions.package_access !== "none") {
        list.push(`Packages: ${formatAccess(permissions.package_access)}`);
    }
    if (permissions.reports_access !== "none") {
        list.push(`Reports: ${formatAccess(permissions.reports_access)}`);
    }

    return list.length > 0 ? list.join(", ") : "No access";
}

function formatAccess(value: AccessMode | ReportsAccessMode) {
    if (value === "none") return "No access";
    if (value === "view") return "View only";
    return "Full access";
}

