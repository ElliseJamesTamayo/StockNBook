"use client";

import { ReportsWorkspace } from "./_shared";

export default function StaffReports({
                                         assignedBranch,
                                     }: {
    assignedBranch: string;
}) {
    return (
        <ReportsWorkspace
            initialRole="staff"
            assignedBranch={assignedBranch}
        />
    );
}
