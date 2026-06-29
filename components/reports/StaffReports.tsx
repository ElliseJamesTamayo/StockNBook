"use client";

import { ReportsWorkspace } from "./_shared";

type StaffReportsProps = {
    assignedBranch: string;
    storeName: string;
};

export default function StaffReports({
                                         assignedBranch,
                                         storeName,
                                     }: StaffReportsProps) {
    return (
        <ReportsWorkspace
            initialRole="staff"
            assignedBranch={assignedBranch}
            storeName={storeName}
        />
    );
}
