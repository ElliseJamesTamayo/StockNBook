"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, RefreshCw, Search } from "lucide-react";
import {
    Booking,
    BookingAccess,
    CalendarDropdown,
    FilterType,
    TABS,
    BookingRow,
    PriceModal,
    dateKey,
    formatDate,
    getAmountPaid,
    getBalance,
    getBranchGroupName,
    getRequiredDownPayment,
    getSavedBookingAccess,
    getTotalPrice,
    normalizeBooking,
    peso,
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


export default function StaffBookings() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [branchName, setBranchName] = useState("Assigned Branch");
    const [loading, setLoading] = useState(true);
    const [access, setAccess] = useState<BookingAccess>("none");

    const [filter, setFilter] = useState<FilterType>("All");
    const [search, setSearch] = useState("");
    const [selectedDate, setSelectedDate] = useState("");
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [priceModal, setPriceModal] = useState<Booking | null>(null);
    const [calendarMonth, setCalendarMonth] = useState(() => new Date());
    const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);

    const canView = access === "view" || access === "full";
    const canManage = access === "full";

    function getToken() {
        return sessionStorage.getItem("token");
    }

    function getBranchId() {
        return (
            sessionStorage.getItem("branch_id") ||
            sessionStorage.getItem("stocknbook_branch_id") ||
            sessionStorage.getItem("staff_branch_id") ||
            sessionStorage.getItem("manager_branch_id")
        );
    }

    function getStoreId() {
        return (
            sessionStorage.getItem("store_id") ||
            sessionStorage.getItem("stocknbook_store_id")
        );
    }

    function getSavedBranchName() {
        return (
            sessionStorage.getItem("branch_name") ||
            sessionStorage.getItem("stocknbook_branch_name") ||
            sessionStorage.getItem("staff_branch_name") ||
            "Assigned Branch"
        );
    }

    async function loadBookings() {
        setLoading(true);

        const savedAccess = getSavedBookingAccess("staff");
        setAccess(savedAccess);

        const token = getToken();
        const storeId = getStoreId();
        const branchId = getBranchId();
        const savedBranchName = getSavedBranchName();

        setBranchName(savedBranchName);

        if (savedAccess === "none") {
            setBookings([]);
            setLoading(false);
            return;
        }

        if (!token || !storeId || !branchId) {
            setBookings([]);
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/bookings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: "get_bookings",
                    store_id: Number(storeId),
                    branch_id: Number(branchId),
                    role: "staff",
                }),
            });

            const data = await res.json();

            if (!res.ok || data.success === false) {
                console.error("Bookings load failed:", data);
                setBookings([]);
                return;
            }

            const normalizedBookings = (data.bookings || []).map((b: any) =>
                normalizeBooking(b, savedBranchName)
            );

            setBookings(normalizedBookings);

            const firstBookingDate = normalizedBookings.find((b: Booking) =>
                dateKey(b.date)
            );

            if (firstBookingDate) {
                const key = dateKey(firstBookingDate.date);
                setCalendarMonth(new Date(`${key}T00:00:00`));
            }
        } catch (err) {
            console.error("Bookings load failed:", err);
            setBookings([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadBookings();
    }, []);


    useEffect(() => {
        const updateDateTime = () => setCurrentDateTime(new Date());

        updateDateTime();
        const timer = window.setInterval(updateDateTime, 30_000);

        return () => {
            window.clearInterval(timer);
        };
    }, []);

    async function updateStatus(id: number, newStatus: string, price?: number) {
        if (!canManage) return;

        const token = getToken();
        const branchId = getBranchId();

        try {
            const body: Record<string, unknown> = {
                action: "update_status",
                booking_id: id,
                status: newStatus,
            };

            if (branchId) body.branch_id = Number(branchId);
            if (price !== undefined) body.agreed_price = price;

            const res = await fetch("/api/bookings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok || data.success === false) {
                throw new Error(data.message || "Failed to update booking status.");
            }

            setBookings((prev) =>
                prev.map((b) =>
                    b.id === id
                        ? {
                            ...b,
                            status: newStatus,
                            ...(price !== undefined
                                ? {
                                    agreed_price: price,
                                    agreedPrice: price,
                                }
                                : {}),
                        }
                        : b
                )
            );
        } catch (err) {
            console.error("Failed to update booking status:", err);
        }
    }

    async function updateCustomPaymentTerms(
        booking: Booking,
        agreedPrice: number,
        requiredDownPayment: number
    ) {
        if (!canManage) return;

        const token = getToken();
        const branchId = getBranchId();

        try {
            const body: Record<string, unknown> = {
                action: "update_price",
                booking_id: booking.id,
                agreed_price: agreedPrice,
                required_down_payment: requiredDownPayment,
            };

            if (branchId) body.branch_id = Number(branchId);

            const res = await fetch("/api/bookings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok || data.success === false) {
                throw new Error(data.message || "Failed to update custom payment terms.");
            }

            const currentPaid = getAmountPaid(booking);
            const newBalance = Math.max(agreedPrice - currentPaid, 0);

            setBookings((prev) =>
                prev.map((b) =>
                    b.id === booking.id
                        ? {
                            ...b,
                            agreed_price: agreedPrice,
                            agreedPrice: agreedPrice,
                            required_down_payment: requiredDownPayment,
                            requiredDownPayment: requiredDownPayment,
                            balance: newBalance,
                            payment_status:
                                currentPaid >= agreedPrice
                                    ? "Fully Paid"
                                    : currentPaid >= requiredDownPayment
                                        ? "Down Payment Paid"
                                        : currentPaid > 0
                                            ? "Partial"
                                            : "Down Payment Required",
                        }
                        : b
                )
            );
        } catch (err) {
            console.error("Failed to update custom payment terms:", err);
        }
    }

    async function handlePriceConfirm(
        agreedPrice: number,
        requiredDownPayment: number
    ) {
        if (!priceModal) return;

        await updateCustomPaymentTerms(
            priceModal,
            agreedPrice,
            requiredDownPayment
        );

        setPriceModal(null);
    }

    async function recordDownPayment(booking: Booking) {
        if (!canManage) return;

        const token = getToken();
        const branchId = getBranchId();

        const total = getTotalPrice(booking);
        const requiredDp = getRequiredDownPayment(booking);

        if (total <= 0 || requiredDp <= 0) {
            console.error(
                "Cannot record down payment. Missing total price or required down payment."
            );
            return;
        }

        const currentPaid = getAmountPaid(booking);
        const newAmountPaid = Math.max(currentPaid, requiredDp);
        const newBalance = Math.max(total - newAmountPaid, 0);

        try {
            const body: Record<string, unknown> = {
                action: "update_payment",
                booking_id: booking.id,
                amount_paid: newAmountPaid,
                balance: newBalance,
                payment_status: "Down Payment Paid",
            };

            if (branchId) body.branch_id = Number(branchId);

            const res = await fetch("/api/bookings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok || data.success === false) {
                throw new Error(data.message || "Failed to record down payment.");
            }

            setBookings((prev) =>
                prev.map((b) =>
                    b.id === booking.id
                        ? {
                            ...b,
                            amount_paid: newAmountPaid,
                            amountPaid: newAmountPaid,
                            balance: newBalance,
                            payment_status: "Down Payment Paid",
                            paymentStatus: "Down Payment Paid",
                            status:
                                b.status === "Pending Review" ||
                                b.status === "Awaiting Down Payment"
                                    ? "Confirmed"
                                    : b.status,
                        }
                        : b
                )
            );
        } catch (err) {
            console.error("Failed to record down payment:", err);
        }
    }

    async function markFullyPaid(booking: Booking) {
        if (!canManage) return;

        const token = getToken();
        const branchId = getBranchId();

        const total = getTotalPrice(booking);

        if (total <= 0) {
            console.error("Cannot mark fully paid. Missing total price.");
            return;
        }

        try {
            const body: Record<string, unknown> = {
                action: "update_payment",
                booking_id: booking.id,
                amount_paid: total,
                balance: 0,
                payment_status: "Fully Paid",
            };

            if (branchId) body.branch_id = Number(branchId);

            const res = await fetch("/api/bookings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok || data.success === false) {
                throw new Error(data.message || "Failed to mark booking as fully paid.");
            }

            setBookings((prev) =>
                prev.map((b) =>
                    b.id === booking.id
                        ? {
                            ...b,
                            amount_paid: total,
                            amountPaid: total,
                            balance: 0,
                            payment_status: "Fully Paid",
                            paymentStatus: "Fully Paid",
                        }
                        : b
                )
            );
        } catch (err) {
            console.error("Failed to mark fully paid:", err);
        }
    }

    const bookingDateCounts = useMemo(() => {
        const map: Record<string, number> = {};

        bookings.forEach((booking) => {
            const key = dateKey(booking.date);
            if (!key) return;

            map[key] = (map[key] || 0) + 1;
        });

        return map;
    }, [bookings]);

    const filtered = useMemo(() => {
        return bookings
            .filter((b) => filter === "All" || b.status === filter)
            .filter((b) => !selectedDate || dateKey(b.date) === selectedDate)
            .filter((b) => {
                if (!search) return true;

                const q = search.toLowerCase();

                return (
                    b.name.toLowerCase().includes(q) ||
                    b.bookingReference?.toLowerCase().includes(q) ||
                    b.phone?.includes(q) ||
                    b.facebookName?.toLowerCase().includes(q) ||
                    getBranchGroupName(b).toLowerCase().includes(q) ||
                    b.customOrder?.toLowerCase().includes(q) ||
                    b.custom_order?.toLowerCase().includes(q) ||
                    b.package?.toLowerCase().includes(q) ||
                    b.packageName?.toLowerCase().includes(q) ||
                    b.package_name?.toLowerCase().includes(q) ||
                    b.eventType?.toLowerCase().includes(q) ||
                    b.event_type?.toLowerCase().includes(q) ||
                    b.theme?.toLowerCase().includes(q) ||
                    b.venue?.toLowerCase().includes(q)
                );
            });
    }, [bookings, filter, selectedDate, search]);

    const counts = TABS.reduce((acc, tab) => {
        acc[tab] =
            tab === "All"
                ? bookings.length
                : bookings.filter((b) => b.status === tab).length;

        return acc;
    }, {} as Record<string, number>);

    const bookingSales = bookings
        .filter((b) => b.status !== "Cancelled")
        .reduce((sum, b) => sum + getTotalPrice(b), 0);

    const bookingRevenue = bookings
        .filter((b) => b.status !== "Cancelled")
        .reduce((sum, b) => sum + getAmountPaid(b), 0);

    const outstandingBalance = bookings
        .filter((b) => b.status !== "Cancelled")
        .reduce((sum, b) => sum + getBalance(b), 0);

    const completedBookings = bookings.filter(
        (b) => b.status === "Completed"
    ).length;

    const selectedDateCount = selectedDate
        ? bookingDateCounts[selectedDate] || 0
        : 0;

    return (
        <>
            <header className="sticky top-0 z-20 border-b border-[#E9E0EF] bg-[#FFFDF8]/95 font-sans backdrop-blur">
                <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 px-6 py-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-3">
                        <h1 className="text-[25px] font-bold text-[#1A1220]">
                            Bookings
                        </h1>

                        <span
                            title={branchName}
                            className="max-w-[220px] truncate rounded-lg bg-[#EFE8F8] px-3.5 py-1.5 text-sm font-medium text-[#4E2C66]"
                        >
                            {branchName}
                        </span>

                        {access === "view" && (
                            <span className="rounded-lg border border-[#E6DDF0] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#5F4E75]">
                                View only
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-[42px] items-center rounded-xl border border-[#E6DDF0] bg-white px-3.5 text-sm font-semibold text-[#2B174C] shadow-sm">
                            {currentDateTime
                                ? formatCurrentDateTime(currentDateTime)
                                : "Loading date..."}
                        </span>

                        <button
                            onClick={() => void loadBookings()}
                            disabled={loading}
                            aria-label="Refresh bookings"
                            title="Refresh bookings"
                            className="inline-flex h-[42px] items-center gap-2 rounded-xl bg-[#2B174C] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1B0D31] disabled:cursor-not-allowed disabled:opacity-60"
                            type="button"
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

            <section className="px-6 py-4">
                {loading ? (
                    <div className="rounded-[14px] border border-[#E6DDF0] bg-white px-4 py-10 text-center text-sm text-[#9B8AAA] shadow-sm">
                        Loading bookings...
                    </div>
                ) : !canView ? (
                    <div className="rounded-[14px] border border-[#E6DDF0] bg-white px-4 py-10 text-center shadow-sm">
                        <p className="text-sm font-bold text-[#1A1220]">
                            No booking access
                        </p>
                        <p className="mt-1 text-sm text-[#7A6A84]">
                            Your staff account does not have permission to view bookings.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="mb-3 grid gap-3 lg:grid-cols-3">
                            <CompactMetricCard
                                title="Booking Sales"
                                value={peso(bookingSales)}
                                subLabel="Revenue"
                                subValue={peso(bookingRevenue)}
                            />

                            <CompactMetricCard
                                title="Outstanding Balance"
                                value={peso(outstandingBalance)}
                            />

                            <CompactMetricCard
                                title="Completed Bookings"
                                value={String(completedBookings)}
                            />
                        </div>

                        <div className="mb-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                            <div className="relative">
                                <Search
                                    size={15}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9B8AAA]"
                                />

                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search bookings, package, client..."
                                    className="h-[42px] w-full rounded-xl border border-[#E3D8EA] bg-white px-4 pl-10 text-sm text-[#1A1220] outline-none shadow-sm placeholder:text-[#9B8AAA] transition focus:border-[#2B174C] focus:ring-4 focus:ring-[#2B174C]/10"
                                />
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => setCalendarOpen((value) => !value)}
                                    disabled={!canView}
                                    className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-[#E6DDF0] bg-white px-3.5 text-sm font-semibold text-[#2B174C] shadow-sm transition hover:bg-[#F7F1FF] disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
                                    type="button"
                                >
                                    <CalendarDays size={15} />
                                    {selectedDate
                                        ? formatDate(selectedDate)
                                        : "Filter by date"}
                                </button>

                                {calendarOpen && canView && (
                                    <CalendarDropdown
                                        month={calendarMonth}
                                        bookingDateCounts={bookingDateCounts}
                                        selectedDate={selectedDate}
                                        onChangeMonth={setCalendarMonth}
                                        onSelectDate={(key) => {
                                            setSelectedDate(key);
                                            setCalendarOpen(false);
                                        }}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="mb-3 flex flex-wrap gap-2.5">
                            {TABS.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setFilter(tab)}
                                    className={`rounded-xl px-3.5 py-2.5 text-[11px] font-semibold transition ${
                                        filter === tab
                                            ? "bg-[#2B174C] text-white shadow-sm"
                                            : "border border-[#E6DDF0] bg-white text-[#2B174C] hover:bg-[#F7F1FF]"
                                    }`}
                                    type="button"
                                >
                                    {tab}

                                    {counts[tab] > 0 && (
                                        <span
                                            className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] ${
                                                filter === tab
                                                    ? "bg-white/20 text-white"
                                                    : "bg-[#EFE8F8] text-[#5F4E75]"
                                            }`}
                                        >
                                            {counts[tab]}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {selectedDate && (
                            <div className="mb-3 flex flex-wrap items-center gap-2.5">
                                <div className="inline-flex items-center gap-2 rounded-xl bg-[#EFE8F8] px-3.5 py-2 text-xs font-semibold text-[#2B174C]">
                                    <CalendarDays size={14} />
                                    {formatDate(selectedDate)} — {selectedDateCount}{" "}
                                    {selectedDateCount === 1 ? "booking" : "bookings"}
                                </div>

                                <button
                                    onClick={() => setSelectedDate("")}
                                    className="rounded-xl border border-[#E6DDF0] bg-white px-3.5 py-2 text-xs font-semibold text-[#2B174C] hover:bg-[#F7F1FF]"
                                    type="button"
                                >
                                    Clear filter
                                </button>
                            </div>
                        )}

                        {filtered.length === 0 ? (
                            <div className="rounded-[14px] border border-[#E6DDF0] bg-white px-4 py-10 text-center text-sm text-[#9B8AAA] shadow-sm">
                                No bookings found.
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-[14px] border border-[#E6DDF0] bg-white shadow-sm">
                                <div className="max-h-[600px] overflow-y-auto overflow-x-auto">
                                    <table className="w-full min-w-[930px] border-collapse">
                                        <thead className="sticky top-0 z-10">
                                        <tr className="border-b border-[#E6DDF0] bg-white">
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-[#806A8C]">
                                                Client
                                            </th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-[#806A8C]">
                                                Schedule
                                            </th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-[#806A8C]">
                                                Package
                                            </th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-[#806A8C]">
                                                Payment
                                            </th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-[#806A8C]">
                                                Status
                                            </th>
                                            <th className="px-3 py-3 text-right text-xs font-semibold text-[#806A8C]">
                                                Details
                                            </th>
                                        </tr>
                                        </thead>

                                        <tbody>
                                        {filtered.map((b) => (
                                            <BookingRow
                                                key={b.id}
                                                b={b}
                                                canManage={canManage}
                                                onUpdateStatus={canManage ? updateStatus : undefined}
                                                onSetPrice={canManage ? setPriceModal : undefined}
                                                onRecordDownPayment={
                                                    canManage ? recordDownPayment : undefined
                                                }
                                                onMarkFullyPaid={
                                                    canManage ? markFullyPaid : undefined
                                                }
                                            />
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </section>

            {priceModal && canManage && (
                <PriceModal
                    booking={priceModal}
                    onConfirm={handlePriceConfirm}
                    onClose={() => setPriceModal(null)}
                />
            )}
        </>
    );
}

function CompactMetricCard({
                               title,
                               value,
                               subLabel,
                               subValue,
                           }: {
    title: string;
    value: string;
    subLabel?: string;
    subValue?: string;
}) {
    return (
        <div className="rounded-[14px] border border-[#E6DDF0] bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold text-[#2B174C]">{title}</p>

            <p className="mt-1 truncate text-[19px] font-bold leading-tight text-[#1A1220]">
                {value}
            </p>

            {subLabel && subValue && (
                <div className="mt-2 flex items-center justify-between gap-3 border-t border-[#EFE7F4] pt-2 text-xs">
                    <span className="text-[#5F4E75]">{subLabel}</span>
                    <span className="font-semibold text-[#1A1220]">
                        {subValue}
                    </span>
                </div>
            )}
        </div>
    );
}