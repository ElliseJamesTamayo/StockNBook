"use client";

import RoleSidebar from "@/components/sidebar/RoleSidebar";
import { type ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Building2,
    Check,
    Copy,
    Mail,
    MapPin,
    Phone,
    ShieldCheck,
    UserRound,
} from "lucide-react";

const defaultPermissions = {
    dashboard: true,
    bookings: true,
    packages: true,
    inventory: true,
    pos: true,
    reports: false,
    staff_management: false,
    branch_settings: false,
};

type PermissionKey = keyof typeof defaultPermissions;

type InviteLink = {
    manager_email: string;
    manager_name: string;
    branch_name: string;
    invite_link: string;
};

export default function AddBranchPage() {
    const router = useRouter();

    const [branchName, setBranchName] = useState("");
    const [contactNumber, setContactNumber] = useState("");
    const [address, setAddress] = useState("");
    const [managerName, setManagerName] = useState("");
    const [managerEmail, setManagerEmail] = useState("");
    const [permissions, setPermissions] = useState(defaultPermissions);
    const [loading, setLoading] = useState(false);
    const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
    const [copiedLink, setCopiedLink] = useState("");

    const updatePermission = (permission: PermissionKey, value: boolean) => {
        setPermissions((previous) => ({
            ...previous,
            [permission]: value,
        }));
    };

    const handleSave = async () => {
        if (!branchName.trim()) {
            alert("Please enter the branch name.");
            return;
        }

        if (!managerName.trim() || !managerEmail.trim()) {
            alert("Please enter the manager name and email.");
            return;
        }

        const token = sessionStorage.getItem("token");

        if (!token) {
            router.push("/");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/onboarding", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    branches: [
                        {
                            branch_name: branchName.trim(),
                            contact_number: contactNumber.trim(),
                            address: address.trim(),
                            manager_name: managerName.trim(),
                            manager_email: managerEmail.trim(),
                            permissions,
                        },
                    ],
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "Unable to create the branch.");
                return;
            }

            setInviteLinks(data.invite_links || []);
            alert("Branch and manager invitation created!");
        } catch {
            alert("Something went wrong while adding the branch.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async (link: string) => {
        try {
            await navigator.clipboard.writeText(link);
            setCopiedLink(link);
            window.setTimeout(() => setCopiedLink(""), 1800);
        } catch {
            alert("Unable to copy the invitation link.");
        }
    };

    return (
        <div className="flex min-h-screen bg-[#FDFAF4] font-sans text-[#1A1220]">
            <RoleSidebar />

            <main className="min-w-0 flex-1 overflow-y-auto">
                <header className="sticky top-0 z-20 border-b border-[#E9E0EF] bg-[#FFFDF8]/95 backdrop-blur">
                    <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-3 px-6 py-3">
                        <div className="flex items-center gap-3">
                            <h1 className="text-[25px] font-bold tracking-[-0.02em] text-[#1A1220]">
                                Add Branch
                            </h1>

                        </div>

                        <button
                            type="button"
                            onClick={() => router.push("/branches")}
                            className="inline-flex h-[42px] items-center gap-2 rounded-xl border border-[#E6DDF0] bg-white px-4 text-sm font-semibold text-[#2B174C] shadow-sm transition hover:bg-[#F7F1FF]"
                        >
                            <ArrowLeft size={16} />
                            Back to branches
                        </button>
                    </div>
                </header>

                <section className="w-full px-6 py-6">
                    <div>
                        <div className="pb-5">
                            <h2 className="text-[18px] font-bold text-[#1A1220]">
                                Branch details
                            </h2>
                            <p className="mt-1 text-sm text-[#7A6A84]">
                                Set up the branch, assign its manager, and choose the manager&apos;s access.
                            </p>
                        </div>

                        <div className="space-y-5">
                            <section className="rounded-[14px] border border-[#E6DDF0] bg-white p-5 shadow-sm sm:p-6">
                                <SectionHeading
                                    icon={<Building2 size={17} />}
                                    title="Branch information"
                                    description="Add the basic details that identify this branch."
                                />

                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                    <TextInput
                                        label="Branch name"
                                        placeholder="e.g. Makati Branch"
                                        value={branchName}
                                        onChange={setBranchName}
                                    />

                                    <TextInput
                                        label="Contact number"
                                        placeholder="e.g. 0917 000 0000"
                                        value={contactNumber}
                                        onChange={setContactNumber}
                                        icon={<Phone size={16} />}
                                    />

                                    <div className="md:col-span-2">
                                        <TextInput
                                            label="Branch address"
                                            placeholder="Full address of this branch"
                                            value={address}
                                            onChange={setAddress}
                                            icon={<MapPin size={16} />}
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-[14px] border border-[#E6DDF0] bg-white p-5 shadow-sm sm:p-6">
                                <SectionHeading
                                    icon={<UserRound size={17} />}
                                    title="Branch manager"
                                    description="The manager will receive an invitation link to activate their account."
                                />

                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                    <TextInput
                                        label="Manager name"
                                        placeholder="e.g. Ana Cruz"
                                        value={managerName}
                                        onChange={setManagerName}
                                        icon={<UserRound size={16} />}
                                    />

                                    <TextInput
                                        label="Manager email"
                                        placeholder="manager@email.com"
                                        type="email"
                                        value={managerEmail}
                                        onChange={setManagerEmail}
                                        icon={<Mail size={16} />}
                                    />
                                </div>
                            </section>

                            <section className="rounded-[14px] border border-[#E6DDF0] bg-white p-5 shadow-sm sm:p-6">
                                <SectionHeading
                                    icon={<ShieldCheck size={17} />}
                                    title="Manager feature access"
                                    description="Choose the pages and features this manager can access."
                                />

                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <AccessToggle
                                        label="Dashboard"
                                        detail="View branch overview"
                                        checked={permissions.dashboard}
                                        onChange={(checked) =>
                                            updatePermission("dashboard", checked)
                                        }
                                    />
                                    <AccessToggle
                                        label="Bookings"
                                        detail="Manage reservations"
                                        checked={permissions.bookings}
                                        onChange={(checked) =>
                                            updatePermission("bookings", checked)
                                        }
                                    />
                                    <AccessToggle
                                        label="Packages"
                                        detail="View package offerings"
                                        checked={permissions.packages}
                                        onChange={(checked) =>
                                            updatePermission("packages", checked)
                                        }
                                    />
                                    <AccessToggle
                                        label="Inventory"
                                        detail="Track products and stock"
                                        checked={permissions.inventory}
                                        onChange={(checked) =>
                                            updatePermission("inventory", checked)
                                        }
                                    />
                                    <AccessToggle
                                        label="Sales / POS"
                                        detail="Create sales transactions"
                                        checked={permissions.pos}
                                        onChange={(checked) =>
                                            updatePermission("pos", checked)
                                        }
                                    />
                                    <AccessToggle
                                        label="Reports"
                                        detail="View branch reports"
                                        checked={permissions.reports}
                                        onChange={(checked) =>
                                            updatePermission("reports", checked)
                                        }
                                    />
                                    <AccessToggle
                                        label="Staff Management"
                                        detail="Manage assigned staff"
                                        checked={permissions.staff_management}
                                        onChange={(checked) =>
                                            updatePermission(
                                                "staff_management",
                                                checked
                                            )
                                        }
                                    />
                                    <AccessToggle
                                        label="Branch Settings"
                                        detail="Update branch settings"
                                        checked={permissions.branch_settings}
                                        onChange={(checked) =>
                                            updatePermission(
                                                "branch_settings",
                                                checked
                                            )
                                        }
                                    />
                                </div>
                            </section>
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-[#EEE7F2] pt-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => router.push("/branches")}
                                disabled={loading}
                                className="h-[44px] rounded-xl border border-[#E6DDF0] bg-white px-5 text-sm font-semibold text-[#2B174C] transition hover:bg-[#F7F1FF] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={loading}
                                className="h-[44px] rounded-xl bg-[#2B174C] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1B0D31] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? "Creating branch..." : "Add branch"}
                            </button>
                        </div>
                    </div>

                    {inviteLinks.length > 0 && (
                        <section className="mt-5 overflow-hidden rounded-[16px] border border-[#E6DDF0] bg-white shadow-sm">
                            <div className="border-b border-[#EEE7F2] px-6 py-5 sm:px-7">
                                <h2 className="text-[18px] font-bold text-[#1A1220]">
                                    Manager invitation link
                                </h2>
                                <p className="mt-1 text-sm text-[#7A6A84]">
                                    Send this link to the manager so they can activate their account.
                                </p>
                            </div>

                            <div className="space-y-3 px-6 py-5 sm:px-7">
                                {inviteLinks.map((invite, index) => (
                                    <article
                                        key={`${invite.manager_email}-${index}`}
                                        className="rounded-xl border border-[#E6DDF0] bg-[#FFFCF7] p-4"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <h3 className="text-sm font-bold text-[#1A1220]">
                                                    {invite.manager_name || "Manager"}{" "}
                                                    <span className="font-medium text-[#806A8C]">
                                                        · {invite.branch_name}
                                                    </span>
                                                </h3>
                                                <p className="mt-1 text-xs text-[#7A6A84]">
                                                    {invite.manager_email}
                                                </p>
                                            </div>

                                            <span className="rounded-full bg-[#EAF8EF] px-2.5 py-1 text-xs font-semibold text-[#168446]">
                                                Ready to send
                                            </span>
                                        </div>

                                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                            <input
                                                readOnly
                                                value={invite.invite_link}
                                                aria-label="Manager invitation link"
                                                className="h-[40px] min-w-0 flex-1 rounded-xl border border-[#E6DDF0] bg-white px-3 text-xs text-[#7A6A84] outline-none"
                                            />

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    void handleCopy(
                                                        invite.invite_link
                                                    )
                                                }
                                                className="inline-flex h-[40px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2B174C] px-4 text-xs font-semibold text-white transition hover:bg-[#1B0D31]"
                                            >
                                                {copiedLink === invite.invite_link ? (
                                                    <>
                                                        <Check size={14} />
                                                        Copied
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy size={14} />
                                                        Copy link
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>

                            <div className="border-t border-[#EEE7F2] bg-[#FFFCF7] px-6 py-4 sm:px-7">
                                <button
                                    type="button"
                                    onClick={() => router.push("/branches")}
                                    className="h-[44px] w-full rounded-xl bg-[#2B174C] px-5 text-sm font-semibold text-white transition hover:bg-[#1B0D31]"
                                >
                                    Go to branches
                                </button>
                            </div>
                        </section>
                    )}
                </section>
            </main>
        </div>
    );
}

function SectionHeading({
                            icon,
                            title,
                            description,
                        }: {
    icon: ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EFE8F8] text-[#5634BF]">
                {icon}
            </div>

            <div>
                <h2 className="text-[16px] font-bold text-[#1A1220]">{title}</h2>
                <p className="mt-0.5 text-sm text-[#7A6A84]">{description}</p>
            </div>
        </div>
    );
}

function TextInput({
                       label,
                       placeholder,
                       type = "text",
                       value,
                       onChange,
                       icon,
                   }: {
    label: string;
    placeholder: string;
    type?: string;
    value: string;
    onChange: (value: string) => void;
    icon?: ReactNode;
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-[#1A1220]">
                {label}
            </label>

            <div className="relative">
                {icon && (
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#806A8C]">
                        {icon}
                    </span>
                )}

                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className={`h-[44px] w-full rounded-xl border border-[#E6DDF0] bg-white px-3 text-sm text-[#1A1220] outline-none shadow-sm placeholder:text-[#9B8AAA] transition focus:border-[#2B174C] focus:ring-4 focus:ring-[#2B174C]/10 ${
                        icon ? "pl-10" : ""
                    }`}
                />
            </div>
        </div>
    );
}

function AccessToggle({
                          label,
                          detail,
                          checked,
                          onChange,
                      }: {
    label: string;
    detail: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <label
            className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition ${
                checked
                    ? "border-[#D7C7E8] bg-[#F8F4FD]"
                    : "border-[#EEE7F2] bg-white hover:bg-[#FFFCF7]"
            }`}
        >
            <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#1A1220]">
                    {label}
                </span>
                <span className="mt-0.5 block text-xs text-[#7A6A84]">
                    {detail}
                </span>
            </span>

            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="h-4 w-4 shrink-0 cursor-pointer accent-[#2B174C]"
            />
        </label>
    );
}
