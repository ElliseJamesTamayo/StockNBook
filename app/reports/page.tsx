"use client";

import { useSyncExternalStore } from "react";
import RoleSidebar from "@/components/sidebar/RoleSidebar";
import OwnerReports from "@/components/reports/OwnerReports";
import ManagerReports from "@/components/reports/ManagerReports";
import StaffReports from "@/components/reports/StaffReports";

type UserRole = "owner" | "manager" | "staff";

type ReportSession = {
    role: UserRole;
    branch: string;
    storeName: string;
};

const DEFAULT_BRANCH = "Assigned Branch";
const DEFAULT_STORE_NAME = "Store";

function subscribeToSession() {
    return () => {};
}

function getServerSessionSnapshot() {
    return `manager\u0000${DEFAULT_BRANCH}\u0000${DEFAULT_STORE_NAME}`;
}

function readStoredValue(keys: string[]) {
    for (const key of keys) {
        const value =
            sessionStorage.getItem(key) || localStorage.getItem(key) || "";

        if (value.trim()) {
            return value.trim();
        }
    }

    return "";
}

function getClientSessionSnapshot() {
    const savedRole = readStoredValue(["role"]).toLowerCase();

    const role: UserRole =
        savedRole === "owner"
            ? "owner"
            : savedRole === "staff"
                ? "staff"
                : "manager";

    const branch =
        readStoredValue([
            "branch_name",
            "stocknbook_branch_name",
            "branchName",
            "branch",
            "assignedBranch",
        ]) || DEFAULT_BRANCH;

    const storeName =
        readStoredValue([
            "store_name",
            "stocknbook_store_name",
            "business_name",
            "businessName",
            "store",
        ]) || DEFAULT_STORE_NAME;

    return `${role}\u0000${branch}\u0000${storeName}`;
}

function parseSession(snapshot: string): ReportSession {
    const [savedRole, savedBranch, savedStoreName] = snapshot.split("\u0000");

    return {
        role:
            savedRole === "owner"
                ? "owner"
                : savedRole === "staff"
                    ? "staff"
                    : "manager",
        branch: savedBranch || DEFAULT_BRANCH,
        storeName: savedStoreName || DEFAULT_STORE_NAME,
    };
}

export default function ReportsPage() {
    const sessionSnapshot = useSyncExternalStore(
        subscribeToSession,
        getClientSessionSnapshot,
        getServerSessionSnapshot
    );

    const { role, branch, storeName } = parseSession(sessionSnapshot);
    const workspaceKey = `${role}-${storeName}-${branch}`;

    return (
        <div
            className="flex min-h-screen font-sans text-[#1A1220]"
            style={{ backgroundColor: "#FDFAF4" }}
        >
            <RoleSidebar />

            <main className="min-w-0 flex-1 overflow-x-hidden font-sans">
                {role === "owner" && (
                    <OwnerReports
                        key={workspaceKey}
                        assignedBranch={branch}
                        storeName={storeName}
                    />
                )}

                {role === "manager" && (
                    <ManagerReports
                        key={workspaceKey}
                        assignedBranch={branch}
                        storeName={storeName}
                    />
                )}

                {role === "staff" && (
                    <StaffReports
                        key={workspaceKey}
                        assignedBranch={branch}
                        storeName={storeName}
                    />
                )}
            </main>
        </div>
    );
}
