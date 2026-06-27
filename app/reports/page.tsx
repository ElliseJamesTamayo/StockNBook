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
};

const DEFAULT_BRANCH = "Makati Branch";

function subscribeToSession() {
    return () => {};
}

function getServerSessionSnapshot() {
    return "manager\u0000Makati Branch";
}

function getClientSessionSnapshot() {
    const storedRole = (sessionStorage.getItem("role") || "manager")
        .trim()
        .toLowerCase();

    const role: UserRole =
        storedRole === "owner"
            ? "owner"
            : storedRole === "staff"
                ? "staff"
                : "manager";

    const branch =
        sessionStorage.getItem("branch_name") ||
        sessionStorage.getItem("stocknbook_branch_name") ||
        sessionStorage.getItem("branchName") ||
        sessionStorage.getItem("branch") ||
        sessionStorage.getItem("assignedBranch") ||
        DEFAULT_BRANCH;

    return `${role}\u0000${branch}`;
}

function parseSession(snapshot: string): ReportSession {
    const [savedRole, savedBranch] = snapshot.split("\u0000");

    return {
        role:
            savedRole === "owner"
                ? "owner"
                : savedRole === "staff"
                    ? "staff"
                    : "manager",
        branch: savedBranch || DEFAULT_BRANCH,
    };
}

export default function ReportsPage() {
    const sessionSnapshot = useSyncExternalStore(
        subscribeToSession,
        getClientSessionSnapshot,
        getServerSessionSnapshot
    );

    const { role, branch } = parseSession(sessionSnapshot);
    const workspaceKey = `${role}-${branch}`;

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
                    />
                )}

                {role === "manager" && (
                    <ManagerReports
                        key={workspaceKey}
                        assignedBranch={branch}
                    />
                )}

                {role === "staff" && (
                    <StaffReports
                        key={workspaceKey}
                        assignedBranch={branch}
                    />
                )}
            </main>
        </div>
    );
}
