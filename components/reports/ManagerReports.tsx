"use client";

import { ReportsWorkspace } from "./_shared";

type ManagerReportsProps = {
    assignedBranch: string;
    storeName: string;
};

export default function ManagerReports({
                                           assignedBranch,
                                           storeName,
                                       }: ManagerReportsProps) {
    return (
        <ReportsWorkspace
            initialRole="manager"
            assignedBranch={assignedBranch}
            storeName={storeName}
        />
    );
}
