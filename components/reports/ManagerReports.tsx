"use client";

import { ReportsWorkspace } from "./_shared";

export default function ManagerReports({
                                           assignedBranch,
                                       }: {
    assignedBranch: string;
}) {
    return (
        <ReportsWorkspace
            initialRole="manager"
            assignedBranch={assignedBranch}
        />
    );
}
