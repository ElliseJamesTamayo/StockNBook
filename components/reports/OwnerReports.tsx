"use client";

import { ReportsWorkspace } from "./_shared";

type OwnerReportsProps = {
    assignedBranch: string;
    storeName: string;
};

export default function OwnerReports({
                                         assignedBranch,
                                         storeName,
                                     }: OwnerReportsProps) {
    return (
        <ReportsWorkspace
            initialRole="owner"
            assignedBranch={assignedBranch}
            storeName={storeName}
        />
    );
}
