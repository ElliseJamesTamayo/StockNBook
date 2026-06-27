"use client";

import { ReportsWorkspace } from "./_shared";

export default function OwnerReports({
                                         assignedBranch,
                                     }: {
    assignedBranch: string;
}) {
    return (
        <ReportsWorkspace
            initialRole="owner"
            assignedBranch={assignedBranch}
        />
    );
}
