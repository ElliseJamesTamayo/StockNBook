"use client";

import {
    Fragment,
    type ComponentType,
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    ChevronDown,
    ChevronUp,
    DollarSign,
    FileSpreadsheet,
    FileText,
    MapPin,
    Package,
    RefreshCw,
    RotateCcw,
    TrendingUp,
    Users,
} from "lucide-react";

export type UserRole = "owner" | "manager" | "staff";
type ReportKey =
    | "inventory"
    | "restock"
    | "bookings"
    | "sales"
    | "forecasting"
    | "staff";

type InventoryStatus = "In Stock" | "Low Stock" | "Out of Stock";
type InventoryFilter = "all" | "low" | "out";
type BookingFilter = "all" | BookingStatus;
type BookingStatus =
    | "pending"
    | "confirmed"
    | "preparing"
    | "cancelled"
    | "completed";

type InventoryVariant = {
    id: string;
    name: string;
    sku?: string;
    stock: number;
    reorderLevel?: number;
    status?: InventoryStatus;
    costPrice?: number;
    salesPrice?: number;
};

type InventoryItem = {
    id: string;
    product: string;
    category: string;
    branch: string;
    stock: number;
    reorderLevel: number;
    status: InventoryStatus;
    costPrice?: number;
    salesPrice?: number;
    variants?: InventoryVariant[];
};

type RestockRecord = {
    id: string;
    date: string;
    product: string;
    variantName?: string;
    branch: string;
    quantityAdded: number;
    currentStock: number;
    stockBefore?: number;
    receivedBy?: string;
    reference?: string;
    notes?: string;
};

type BookingRecord = {
    id: string;
    reference: string;
    date: string;
    eventDate: string;
    scheduleTime?: string;
    branch: string;
    customer: string;
    phone?: string;
    venue?: string;
    packageName: string;
    status: BookingStatus;
    statusLabel?: string;
    amount: number;
    amountPaid?: number;
    requiredDownPayment?: number;
    balance?: number;
    paymentStatus?: string;
    notes?: string;
};

type SaleRecord = {
    id: string;
    reference: string;
    date: string;
    branch: string;
    customer: string;
    product: string;
    category: string;
    quantity: number;
    amount: number;
};

type ForecastRecord = {
    id: string;
    item: string;
    type: "Product" | "Package";
    currentValue: string;
    forecastedDemand: string;
    suggestedRestock: string;
    riskLevel: "Low" | "Medium" | "High";
};

type SeasonalInsight = {
    period: string;
    trend: string;
    recommendation: string;
};

type SystemModule = "Bookings" | "Inventory" | "Packages" | "Sales / POS";
type StaffModuleFilter = "all" | SystemModule;

type StaffActivity = {
    id: string;
    date: string;
    time?: string;
    staffName: string;
    role: string;
    action: string;
    module: SystemModule;
    reference?: string;
    details?: string;
    branch: string;
};

type BookingSummary = {
    totalBookings: number;
    pending: number;
    confirmed?: number;
    preparing?: number;
    cancelled: number;
    completed: number;
};

type ReportData = {
    branch?: string;
    monthLabel?: string;
    dateRange?: {
        startDate: string;
        endDate: string;
    };
    summary?: {
        grossSales: number;
        bookingRevenue: number;
        totalTransactions: number;
        averageOrderValue: number;
    };
    bookingSummary?: BookingSummary;
    branchOptions?: string[];
    access?: {
        role?: UserRole;
        assignedBranch?: string;
        branchLocked?: boolean;
    };
    inventoryList?: InventoryItem[];
    lowStockItems?: InventoryItem[];
    outOfStockItems?: InventoryItem[];
    restockHistory?: RestockRecord[];
    bookingList?: BookingRecord[];
    salesList?: SaleRecord[];
    forecasting?: ForecastRecord[];
    seasonalInsights?: SeasonalInsight[];
    staffActivities?: StaffActivity[];
};

type ReportCard = {
    key: ReportKey;
    title: string;
    subtitle: string;
    icon: ComponentType<{ size?: number; strokeWidth?: number }>;
};

type ExportTable = {
    title: string;
    headers: string[];
    rows: string[][];
};

const DEFAULT_BRANCH = "Makati Branch";
const ALL_BRANCHES = "All branches";

const REPORT_CARDS: ReportCard[] = [
    {
        key: "inventory",
        title: "Inventory Report",
        subtitle: "Stock levels & movement",
        icon: Package,
    },
    {
        key: "restock",
        title: "Restock History",
        subtitle: "Past restock records",
        icon: RotateCcw,
    },
    {
        key: "bookings",
        title: "Booking History",
        subtitle: "All booking records",
        icon: CalendarDays,
    },
    {
        key: "sales",
        title: "Sales Report",
        subtitle: "Revenue & transactions",
        icon: DollarSign,
    },
    {
        key: "forecasting",
        title: "Forecasting Report",
        subtitle: "Predictions & trends",
        icon: TrendingUp,
    },
    {
        key: "staff",
        title: "Staff Report",
        subtitle: "Current staff actions",
        icon: Users,
    },
];

function getToday() {
    return new Date().toISOString().slice(0, 10);
}

function getMonthStart(date: string) {
    return `${date.slice(0, 7)}-01`;
}


function formatPeso(value: number) {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
    }).format(Number(value || 0));
}

function formatNumber(value: number) {
    return new Intl.NumberFormat("en-PH").format(Number(value || 0));
}

function formatDate(value: string) {
    if (!value) return "—";

    return new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(`${value}T12:00:00`));
}

function formatDateRange(startDate: string, endDate: string) {
    if (!startDate || !endDate) return "Selected period";
    if (startDate === endDate) return formatDate(startDate);

    return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

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


function sumBy<T>(items: T[], callback: (item: T) => number) {
    return items.reduce((total, item) => total + callback(item), 0);
}

function statusClass(status: string) {
    const value = status.toLowerCase();

    if (value.includes("out") || value === "cancelled") {
        return "bg-[#FCE9E7] text-[#B54235]";
    }

    if (
        value.includes("low") ||
        value === "pending" ||
        value === "preparing"
    ) {
        return "bg-[#FFF5D9] text-[#9A650B]";
    }

    if (value === "confirmed") {
        return "bg-[#F0EAFE] text-[#66429A]";
    }

    return "bg-[#E8F6EC] text-[#176C27]";
}

function riskClass(risk: ForecastRecord["riskLevel"]) {
    if (risk === "High") return "bg-[#FCE9E7] text-[#B54235]";
    if (risk === "Medium") return "bg-[#FFF5D9] text-[#9A650B]";
    return "bg-[#E8F6EC] text-[#176C27]";
}

function escapeHtml(value: string) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function normalizePdfText(value: string) {
    return String(value)
        .replace(/₱/g, "PHP ")
        .replace(/[–—]/g, "-")
        .replace(/•/g, "-")
        .replace(/↳/g, "-")
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[^\x20-\x7E]/g, "");
}

function escapePdf(value: string) {
    return normalizePdfText(value)
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");
}

function downloadFile(filename: string, mimeType: string, content: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function getPdfColumnWeight(header: string) {
    const key = header.toLowerCase();

    if (
        key.includes("product") ||
        key.includes("package") ||
        key.includes("customer") ||
        key.includes("details")
    ) {
        return 1.7;
    }

    if (
        key.includes("reference") ||
        key.includes("branch") ||
        key.includes("category") ||
        key.includes("suggested")
    ) {
        return 1.35;
    }

    if (key.includes("date") || key.includes("schedule")) return 1.15;
    if (key.includes("current") || key.includes("forecast")) return 1.1;
    if (key.includes("status") || key.includes("risk")) return 0.95;

    return 1;
}

function isPdfNumericColumn(header: string) {
    const key = header.toLowerCase();

    return [
        "stock",
        "level",
        "quantity",
        "sales",
        "revenue",
        "price",
        "value",
        "count",
        "added",
        "amount",
        "bookings",
    ].some((word) => key.includes(word));
}

function wrapPdfText(value: string, maxCharacters: number, maxLines = 3) {
    const text = normalizePdfText(value) || "-";
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (let word of words) {
        while (word.length > maxCharacters) {
            if (currentLine) {
                lines.push(currentLine);
                currentLine = "";
            }

            lines.push(word.slice(0, maxCharacters));
            word = word.slice(maxCharacters);

            if (lines.length >= maxLines) break;
        }

        if (lines.length >= maxLines) break;

        const candidate = currentLine ? `${currentLine} ${word}` : word;

        if (candidate.length <= maxCharacters) {
            currentLine = candidate;
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        }

        if (lines.length >= maxLines) break;
    }

    if (currentLine && lines.length < maxLines) {
        lines.push(currentLine);
    }

    const result = lines.length ? lines.slice(0, maxLines) : ["-"];

    if (
        lines.length > maxLines ||
        result.join(" ").length < text.length
    ) {
        const finalIndex = result.length - 1;
        result[finalIndex] =
            result[finalIndex].slice(0, Math.max(1, maxCharacters - 3)) + "...";
    }

    return result;
}

function createTablePdf({
                            title,
                            branch,
                            dateRange,
                            headers,
                            rows,
                        }: {
    title: string;
    branch: string;
    dateRange: string;
    headers: string[];
    rows: string[][];
}) {
    const pageWidth = 842;
    const pageHeight = 595;
    const marginX = 28;
    const marginBottom = 28;
    const contentWidth = pageWidth - marginX * 2;
    const regularFont = "F1";
    const boldFont = "F2";
    const fontSize = headers.length >= 8 ? 5.8 : headers.length >= 6 ? 6.5 : 7.2;
    const headerFontSize = Math.max(5.6, fontSize - 0.2);
    const lineHeight = fontSize + 2.2;
    const cellPaddingX = 4.5;
    const cellPaddingY = 4.5;

    const weights = headers.map(getPdfColumnWeight);
    const totalWeight = weights.reduce((total, weight) => total + weight, 0);

    let runningX = marginX;
    const columns = headers.map((header, index) => {
        const width = (contentWidth * weights[index]) / totalWeight;
        const column = {
            header,
            x: runningX,
            width,
            numeric: isPdfNumericColumn(header),
        };

        runningX += width;
        return column;
    });

    const characterLimits = columns.map((column) =>
        Math.max(6, Math.floor((column.width - cellPaddingX * 2) / (fontSize * 0.52)))
    );

    const headerLines = headers.map((header, index) =>
        wrapPdfText(header, characterLimits[index], 2)
    );
    const headerLineCount = Math.max(...headerLines.map((lines) => lines.length));
    const headerHeight = Math.max(
        20,
        headerLineCount * (headerFontSize + 1.8) + cellPaddingY * 2
    );

    const pages: string[] = [];
    let commands: string[] = [];
    let cursorY = 0;

    const point = (value: number) => Number(value.toFixed(2));

    function addText(
        value: string,
        x: number,
        y: number,
        size: number,
        font: string,
        color: [number, number, number]
    ) {
        commands.push(
            `q ${color.join(" ")} rg BT /${font} ${point(size)} Tf 1 0 0 1 ${point(
                x
            )} ${point(y)} Tm (${escapePdf(value)}) Tj ET Q`
        );
    }

    function fillRect(
        x: number,
        y: number,
        width: number,
        height: number,
        color: [number, number, number]
    ) {
        commands.push(
            `q ${color.join(" ")} rg ${point(x)} ${point(y)} ${point(width)} ${point(
                height
            )} re f Q`
        );
    }

    function strokeRect(
        x: number,
        y: number,
        width: number,
        height: number,
        color: [number, number, number]
    ) {
        commands.push(
            `q ${color.join(" ")} RG 0.45 w ${point(x)} ${point(y)} ${point(
                width
            )} ${point(height)} re S Q`
        );
    }

    function drawTableHeader() {
        const bottomY = cursorY - headerHeight;

        fillRect(marginX, bottomY, contentWidth, headerHeight, [0.17, 0.09, 0.3]);
        strokeRect(marginX, bottomY, contentWidth, headerHeight, [0.77, 0.69, 0.84]);

        columns.forEach((column, index) => {
            if (index > 0) {
                commands.push(
                    `q 0.92 0.87 0.96 RG 0.35 w ${point(column.x)} ${point(
                        bottomY
                    )} m ${point(column.x)} ${point(cursorY)} l S Q`
                );
            }

            const lines = headerLines[index];
            lines.forEach((line, lineIndex) => {
                const textWidth = line.length * headerFontSize * 0.52;
                const textX = column.numeric
                    ? column.x + column.width - cellPaddingX - textWidth
                    : column.x + cellPaddingX;

                addText(
                    line,
                    textX,
                    cursorY - cellPaddingY - headerFontSize - lineIndex * (headerFontSize + 1.8),
                    headerFontSize,
                    boldFont,
                    [1, 1, 1]
                );
            });
        });

        cursorY = bottomY;
    }

    function drawPageTitle(continued: boolean) {
        addText(
            `StockNBook - ${title}${continued ? " (continued)" : ""}`,
            marginX,
            pageHeight - 32,
            14,
            boldFont,
            [0.1, 0.07, 0.13]
        );

        addText(
            `Branch: ${branch}`,
            marginX,
            pageHeight - 49,
            8.5,
            regularFont,
            [0.21, 0.15, 0.27]
        );

        addText(
            `Date range: ${dateRange}`,
            marginX,
            pageHeight - 62,
            8.5,
            regularFont,
            [0.21, 0.15, 0.27]
        );

        commands.push(
            `q 0.84 0.79 0.9 RG 0.6 w ${marginX} ${pageHeight - 70} m ${
                pageWidth - marginX
            } ${pageHeight - 70} l S Q`
        );

        cursorY = pageHeight - 84;
        drawTableHeader();
    }

    function finishPage() {
        if (commands.length > 0) {
            pages.push(commands.join("\n"));
            commands = [];
        }
    }

    function startPage(continued: boolean) {
        if (commands.length > 0) finishPage();
        drawPageTitle(continued);
    }

    function drawTableRow(row: string[], rowIndex: number) {
        const cellLines = columns.map((_, index) =>
            wrapPdfText(row[index] ?? "-", characterLimits[index], 3)
        );
        const maxLines = Math.max(...cellLines.map((lines) => lines.length));
        const rowHeight = Math.max(20, maxLines * lineHeight + cellPaddingY * 2);

        if (cursorY - rowHeight < marginBottom + 10) {
            startPage(true);
        }

        const rowBottom = cursorY - rowHeight;
        const rowColor: [number, number, number] =
            rowIndex % 2 === 0 ? [1, 1, 1] : [0.985, 0.977, 0.99];

        fillRect(marginX, rowBottom, contentWidth, rowHeight, rowColor);
        strokeRect(marginX, rowBottom, contentWidth, rowHeight, [0.86, 0.81, 0.9]);

        columns.forEach((column, index) => {
            if (index > 0) {
                commands.push(
                    `q 0.9 0.85 0.94 RG 0.3 w ${point(column.x)} ${point(
                        rowBottom
                    )} m ${point(column.x)} ${point(cursorY)} l S Q`
                );
            }

            cellLines[index].forEach((line, lineIndex) => {
                const textWidth = line.length * fontSize * 0.52;
                const textX = column.numeric
                    ? column.x + column.width - cellPaddingX - textWidth
                    : column.x + cellPaddingX;

                addText(
                    line,
                    textX,
                    cursorY - cellPaddingY - fontSize - lineIndex * lineHeight,
                    fontSize,
                    regularFont,
                    [0.1, 0.07, 0.13]
                );
            });
        });

        cursorY = rowBottom;
    }

    startPage(false);

    if (rows.length === 0) {
        addText(
            "No records found for the selected report period.",
            marginX + 8,
            cursorY - 24,
            9,
            regularFont,
            [0.4, 0.35, 0.46]
        );
    } else {
        rows.forEach((row, index) => drawTableRow(row, index));
    }

    finishPage();

    const pageStreams = pages.map(
        (stream, index) =>
            `${stream}\nq 0.42 0.35 0.48 rg BT /F1 7 Tf 1 0 0 1 ${pageWidth - 100} 16 Tm (Page ${
                index + 1
            } of ${pages.length}) Tj ET Q`
    );

    const pageObjectIds = pageStreams.map((_, index) => 5 + index * 2);
    const contentObjectIds = pageStreams.map((_, index) => 6 + index * 2);

    const objects: Record<number, string> = {
        1: "<< /Type /Catalog /Pages 2 0 R >>",
        2: `<< /Type /Pages /Kids [${pageObjectIds
            .map((id) => `${id} 0 R`)
            .join(" ")}] /Count ${pageObjectIds.length} >>`,
        3: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        4: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    };

    pageStreams.forEach((stream, index) => {
        const pageId = pageObjectIds[index];
        const contentId = contentObjectIds[index];

        objects[pageId] =
            `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
            `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;

        objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    });

    const maxObjectId = Math.max(...Object.keys(objects).map(Number));
    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [0];

    for (let id = 1; id <= maxObjectId; id += 1) {
        offsets[id] = pdf.length;
        pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
    }

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${maxObjectId + 1}\n`;
    pdf += "0000000000 65535 f \n";

    for (let id = 1; id <= maxObjectId; id += 1) {
        pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\n`;
    pdf += `startxref\n${xrefOffset}\n%%EOF`;

    return pdf;
}

function buildSalesRows(sales: SaleRecord[], bookings: BookingRecord[]) {
    const rows = new Map<
        string,
        {
            date: string;
            transactionCount: number;
            posSales: number;
            bookingRevenue: number;
            totalRevenue: number;
        }
    >();

    sales.forEach((sale) => {
        const row = rows.get(sale.date) || {
            date: sale.date,
            transactionCount: 0,
            posSales: 0,
            bookingRevenue: 0,
            totalRevenue: 0,
        };

        row.transactionCount += 1;
        row.posSales += sale.amount;
        row.totalRevenue += sale.amount;
        rows.set(sale.date, row);
    });

    bookings.forEach((booking) => {
        if (booking.status === "cancelled") return;

        const row = rows.get(booking.date) || {
            date: booking.date,
            transactionCount: 0,
            posSales: 0,
            bookingRevenue: 0,
            totalRevenue: 0,
        };

        row.bookingRevenue += booking.amount;
        row.totalRevenue += booking.amount;
        rows.set(booking.date, row);
    });

    return Array.from(rows.values()).sort((a, b) =>
        b.date.localeCompare(a.date)
    );
}

function fallbackInventory(branch: string): InventoryItem[] {
    return [
        {
            id: "inventory-gold-balloon",
            product: "Gold Balloon",
            category: "Balloons",
            branch,
            stock: 102,
            reorderLevel: 55,
            status: "In Stock",
            variants: [
                {
                    id: "gold-balloon-small-piece",
                    name: "small, piece",
                    stock: 50,
                    reorderLevel: 20,
                    costPrice: 10,
                    salesPrice: 120,
                    status: "In Stock",
                },
                {
                    id: "gold-balloon-large-piece",
                    name: "large, piece",
                    stock: 23,
                    reorderLevel: 15,
                    costPrice: 15,
                    salesPrice: 180,
                    status: "In Stock",
                },
                {
                    id: "gold-balloon-small-pack",
                    name: "small, pack",
                    stock: 14,
                    reorderLevel: 10,
                    costPrice: 20,
                    salesPrice: 300,
                    status: "In Stock",
                },
                {
                    id: "gold-balloon-large-pack",
                    name: "large, pack",
                    stock: 15,
                    reorderLevel: 10,
                    costPrice: 25,
                    salesPrice: 350,
                    status: "In Stock",
                },
            ],
        },
        {
            id: "inventory-tae",
            product: "Tae",
            category: "Backdrops",
            branch,
            stock: 90,
            reorderLevel: 60,
            costPrice: 1000,
            status: "In Stock",
            variants: [
                {
                    id: "tae-small",
                    name: "small",
                    stock: 45,
                    reorderLevel: 30,
                    costPrice: 1000,
                    salesPrice: 200,
                    status: "In Stock",
                },
                {
                    id: "tae-large",
                    name: "large",
                    stock: 45,
                    reorderLevel: 30,
                    costPrice: 1000,
                    salesPrice: 300,
                    status: "In Stock",
                },
            ],
        },
        {
            id: "inventory-table-cover",
            product: "Table Cover",
            category: "Linens & Covers",
            branch,
            stock: 193,
            reorderLevel: 40,
            status: "In Stock",
            variants: [
                {
                    id: "table-cover-small",
                    name: "small",
                    stock: 94,
                    reorderLevel: 20,
                    costPrice: 200,
                    salesPrice: 400,
                    status: "In Stock",
                },
                {
                    id: "table-cover-large",
                    name: "large",
                    stock: 99,
                    reorderLevel: 20,
                    costPrice: 300,
                    salesPrice: 500,
                    status: "In Stock",
                },
            ],
        },
        {
            id: "inventory-balloon-pump",
            product: "Balloon Pump",
            category: "Decorations",
            branch,
            stock: 0,
            reorderLevel: 5,
            costPrice: 120,
            salesPrice: 180,
            status: "Out of Stock",
        },
        {
            id: "inventory-cake-topper",
            product: "Cake Topper",
            category: "Cake & Desserts",
            branch,
            stock: 30,
            reorderLevel: 8,
            costPrice: 25,
            salesPrice: 40,
            status: "In Stock",
        },
        {
            id: "inventory-party-hat",
            product: "Party Hat",
            category: "Costumes & Props",
            branch,
            stock: 38,
            reorderLevel: 10,
            costPrice: 10,
            salesPrice: 15,
            status: "In Stock",
        },
        {
            id: "inventory-black-balloon",
            product: "Black Balloon",
            category: "Balloons",
            branch,
            stock: 110,
            reorderLevel: 55,
            status: "In Stock",
            variants: [
                {
                    id: "black-balloon-small-piece",
                    name: "small, piece",
                    stock: 50,
                    reorderLevel: 20,
                    costPrice: 10,
                    salesPrice: 12,
                    status: "In Stock",
                },
                {
                    id: "black-balloon-large-piece",
                    name: "large, piece",
                    stock: 25,
                    reorderLevel: 15,
                    costPrice: 15,
                    salesPrice: 20,
                    status: "In Stock",
                },
                {
                    id: "black-balloon-small-pack",
                    name: "small, pack",
                    stock: 18,
                    reorderLevel: 10,
                    costPrice: 20,
                    salesPrice: 28,
                    status: "In Stock",
                },
                {
                    id: "black-balloon-large-pack",
                    name: "large, pack",
                    stock: 17,
                    reorderLevel: 10,
                    costPrice: 25,
                    salesPrice: 35,
                    status: "In Stock",
                },
            ],
        },
    ];
}

function fallbackRestocks(branch: string): RestockRecord[] {
    return [
        {
            id: "restock-1",
            date: "2026-06-18",
            product: "Gold Balloon",
            variantName: "small, piece",
            branch,
            quantityAdded: 30,
            stockBefore: 20,
            currentStock: 50,
            receivedBy: "Shiela Maningo",
            reference: "RST-MKT-20260618-001",
            notes: "Restocked to meet the reorder level for the small-piece variant.",
        },
        {
            id: "restock-2",
            date: "2026-06-15",
            product: "LED Lights",
            branch,
            quantityAdded: 30,
            stockBefore: 55,
            currentStock: 85,
            receivedBy: "Ash",
            reference: "RST-MKT-20260615-002",
            notes: "Restocked after a low stock alert.",
        },
        {
            id: "restock-3",
            date: "2026-06-10",
            product: "Party Hats",
            branch,
            quantityAdded: 50,
            stockBefore: 90,
            currentStock: 140,
            receivedBy: "Ellise Tamayo",
            reference: "RST-MKT-20260610-003",
            notes: "Added stock for upcoming birthday package reservations.",
        },
        {
            id: "restock-4",
            date: "2026-06-07",
            product: "Table Covers",
            branch,
            quantityAdded: 20,
            stockBefore: 40,
            currentStock: 60,
            receivedBy: "Mark Santos",
            reference: "RST-MKT-20260607-004",
            notes: "Regular branch replenishment.",
        },
    ];
}

function fallbackBookings(branch: string): BookingRecord[] {
    return [
        {
            id: "BK-001",
            reference: "REF-2026-001",
            date: "2026-01-10",
            eventDate: "2026-01-20",
            branch,
            customer: "Maria Santos",
            packageName: "Wedding Package",
            status: "completed",
            amount: 12000,
        },
        {
            id: "BK-002",
            reference: "REF-2026-002",
            date: "2026-01-11",
            eventDate: "2026-01-25",
            branch,
            customer: "Juan Cruz",
            packageName: "Birthday Package",
            status: "confirmed",
            amount: 8000,
        },
        {
            id: "BK-003",
            reference: "REF-2026-003",
            date: "2026-01-12",
            eventDate: "2026-01-30",
            branch,
            customer: "Anna Reyes",
            packageName: "Debut Package",
            status: "completed",
            amount: 9500,
        },
        {
            id: "BK-004",
            reference: "REF-2026-004",
            date: "2026-01-13",
            eventDate: "2026-02-03",
            branch,
            customer: "Carlo Dela Cruz",
            packageName: "Birthday Package",
            status: "pending",
            amount: 6500,
        },
        {
            id: "BK-005",
            reference: "REF-2026-005",
            date: "2026-01-14",
            eventDate: "2026-02-10",
            branch,
            customer: "Jessa Lim",
            packageName: "Wedding Package",
            status: "preparing",
            amount: 14000,
        },
        {
            id: "BK-006",
            reference: "REF-2026-006",
            date: "2026-01-15",
            eventDate: "2026-02-12",
            branch,
            customer: "Miguel Ramos",
            packageName: "Debut Package",
            status: "cancelled",
            amount: 7500,
        },
    ];
}

function fallbackSales(branch: string): SaleRecord[] {
    return [
        {
            id: "sale-1",
            reference: "POS-20260110-001",
            date: "2026-01-10",
            branch,
            customer: "Walk-in Customer",
            product: "Balloon Set",
            category: "Balloons",
            quantity: 15,
            amount: 8500,
        },
        {
            id: "sale-2",
            reference: "POS-20260111-002",
            date: "2026-01-11",
            branch,
            customer: "Walk-in Customer",
            product: "LED Lights",
            category: "Lights & Sounds",
            quantity: 20,
            amount: 10200,
        },
        {
            id: "sale-3",
            reference: "POS-20260112-003",
            date: "2026-01-12",
            branch,
            customer: "Walk-in Customer",
            product: "Plastic Chair",
            category: "Furniture",
            quantity: 18,
            amount: 7800,
        },
    ];
}

function fallbackForecasts(): ForecastRecord[] {
    return [
        {
            id: "forecast-1",
            item: "Balloon Set",
            type: "Product",
            currentValue: "120 units",
            forecastedDemand: "180 units",
            suggestedRestock: "+60 units",
            riskLevel: "Medium",
        },
        {
            id: "forecast-2",
            item: "LED Lights",
            type: "Product",
            currentValue: "20 units",
            forecastedDemand: "45 units",
            suggestedRestock: "+25 units",
            riskLevel: "High",
        },
        {
            id: "forecast-3",
            item: "Birthday Package",
            type: "Package",
            currentValue: "35 bookings",
            forecastedDemand: "42 bookings",
            suggestedRestock: "Prepare additional inventory",
            riskLevel: "Low",
        },
    ];
}

function fallbackSeasons(): SeasonalInsight[] {
    return [
        {
            period: "Graduation Season",
            trend: "Higher event bookings",
            recommendation: "Prepare balloon sets and backdrops.",
        },
        {
            period: "December Holidays",
            trend: "Increased package demand",
            recommendation: "Increase package inventory.",
        },
        {
            period: "Summer Months",
            trend: "Higher wedding bookings",
            recommendation: "Reserve wedding supplies early.",
        },
    ];
}

function fallbackStaffActivities(branch: string): StaffActivity[] {
    return [
        {
            id: "staff-action-1",
            date: "2026-06-05",
            time: "10:42 AM",
            staffName: "Ash",
            role: "Staff",
            action: "Approved booking",
            module: "Bookings",
            reference: "BKG-MKT-20260620-005",
            details: "Approved booking BKG-MKT-20260620-005.",
            branch,
        },
        {
            id: "staff-action-2",
            date: "2026-06-04",
            time: "3:18 PM",
            staffName: "Ellise Tamayo",
            role: "Staff",
            action: "Created POS transaction #12",
            module: "Sales / POS",
            reference: "POS-MKT-20260604-012",
            details: "Made transaction #12 in Sales / POS.",
            branch,
        },
        {
            id: "staff-action-3",
            date: "2026-06-04",
            time: "1:05 PM",
            staffName: "Shiela Maningo",
            role: "Staff",
            action: "Updated inventory stock",
            module: "Inventory",
            reference: "INV-MKT-20260604-003",
            details: "Updated the stock record for Balloon Set.",
            branch,
        },
        {
            id: "staff-action-4",
            date: "2026-06-03",
            time: "4:20 PM",
            staffName: "Mark Santos",
            role: "Staff",
            action: "Updated package details",
            module: "Packages",
            reference: "PKG-MKT-20260603-001",
            details: "Updated the Birthday Package details and price.",
            branch,
        },
    ];
}

function getInventoryVariants(item: InventoryItem) {
    return Array.isArray(item.variants) ? item.variants : [];
}

function getVariantStatus(variant: InventoryVariant): InventoryStatus {
    if (variant.status) return variant.status;

    const reorderLevel = variant.reorderLevel ?? 0;

    if (variant.stock <= 0) return "Out of Stock";
    if (reorderLevel > 0 && variant.stock <= reorderLevel) return "Low Stock";

    return "In Stock";
}

function getPriceRange(
    item: InventoryItem,
    priceKey: "costPrice" | "salesPrice"
) {
    const directPrice = item[priceKey];

    if (typeof directPrice === "number") {
        return formatPeso(directPrice);
    }

    const values = getInventoryVariants(item)
        .map((variant) => variant[priceKey])
        .filter((price): price is number => typeof price === "number");

    if (!values.length) return "—";

    const min = Math.min(...values);
    const max = Math.max(...values);

    return min === max
        ? formatPeso(min)
        : `${formatPeso(min)} – ${formatPeso(max)}`;
}

function getBookingStatusLabel(booking: BookingRecord) {
    return (
        booking.statusLabel ||
        `${booking.status.charAt(0).toUpperCase()}${booking.status.slice(1)}`
    );
}

function getBookingPaymentDetails(booking: BookingRecord) {
    const packagePrice = Number(booking.amount || 0);
    const requiredDownPayment =
        Number(booking.requiredDownPayment ?? Math.round(packagePrice * 0.1)) || 0;

    const defaultAmountPaid =
        booking.status === "completed"
            ? packagePrice
            : booking.status === "confirmed" || booking.status === "preparing"
                ? requiredDownPayment
                : 0;

    const amountPaid = Math.min(
        Math.max(Number(booking.amountPaid ?? defaultAmountPaid) || 0, 0),
        packagePrice
    );

    const balance = Math.max(
        Number(booking.balance ?? packagePrice - amountPaid) || 0,
        0
    );

    const paymentStatus =
        booking.paymentStatus ||
        (amountPaid >= packagePrice && packagePrice > 0
            ? "Fully Paid"
            : amountPaid >= requiredDownPayment && amountPaid > 0
                ? "Down Payment Paid"
                : amountPaid > 0
                    ? "Partial Payment"
                    : "Payment Pending");

    return {
        packagePrice,
        requiredDownPayment,
        amountPaid,
        balance,
        paymentStatus,
    };
}

function getBookingNextStep(status: BookingStatus) {
    if (status === "pending") return "Confirm Booking";
    if (status === "confirmed") return "Prepare Booking";
    if (status === "preparing") return "Complete Booking";
    if (status === "completed") return "Completed";
    return "Cancelled";
}

function getBookingStatusMessage(status: BookingStatus) {
    if (status === "completed") {
        return "This booking is already completed.";
    }

    if (status === "cancelled") {
        return "This booking has been cancelled.";
    }

    if (status === "preparing") {
        return "Prepare the package and event supplies before the event date.";
    }

    if (status === "confirmed") {
        return "The booking is confirmed and ready for preparation.";
    }

    return "Confirm the booking after verifying the required payment.";
}

function BookingDetailPanel({ booking }: { booking: BookingRecord }) {
    const payment = getBookingPaymentDetails(booking);
    const nextStep = getBookingNextStep(booking.status);

    return (
        <div className="border-t border-[#E6DDF0] bg-[#F9F4FF] p-3">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                    <div className="rounded-[14px] border border-[#E6DDF0] bg-white p-3">
                        <h4 className="text-[16px] font-bold text-[#1A1220]">
                            Payment Summary
                        </h4>

                        <div className="mt-4 space-y-3 text-sm">
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-[#7A6984]">Package Price</span>
                                <span className="font-semibold text-[#1A1220]">
                  {formatPeso(payment.packagePrice)}
                </span>
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <span className="text-[#7A6984]">Required Down Payment</span>
                                <span className="font-semibold text-[#1A1220]">
                  {formatPeso(payment.requiredDownPayment)}
                </span>
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <span className="text-[#7A6984]">Amount Paid</span>
                                <span className="font-semibold text-[#1A1220]">
                  {formatPeso(payment.amountPaid)}
                </span>
                            </div>

                            <div className="border-t border-[#EFE7F4] pt-3">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="font-medium text-[#5E4A68]">Balance</span>
                                    <span className="text-[19px] font-bold text-[#2B174C]">
                    {formatPeso(payment.balance)}
                  </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[14px] border border-[#E6DDF0] bg-white p-3">
                        <h4 className="text-[16px] font-bold text-[#1A1220]">
                            Booking Notes
                        </h4>
                        <p className="mt-3 text-sm text-[#7A6984]">
                            {booking.notes || "No notes provided."}
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="rounded-[14px] border border-[#E6DDF0] bg-white p-3">
                        <h4 className="text-[16px] font-bold text-[#1A1220]">
                            Payment Action
                        </h4>

                        <button
                            type="button"
                            onClick={() => {
                                window.location.href = "/bookings";
                            }}
                            className="mt-4 flex w-full items-center justify-center rounded-xl bg-[#2B174C] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1B0D31]"
                        >
                            Manage Payment in Bookings
                        </button>

                        <div className="mt-3 flex items-center justify-between gap-3">
                            <span className="text-sm text-[#7A6984]">Current Payment</span>
                            <StatusBadge status={payment.paymentStatus} />
                        </div>

                        <div className="mt-3 rounded-lg bg-[#F1EAF8] px-3 py-2.5 text-sm text-[#4E2C66]">
                            Paid {formatPeso(payment.amountPaid)} of{" "}
                            {formatPeso(payment.packagePrice)}
                        </div>
                    </div>

                    <div className="rounded-[14px] border border-[#E6DDF0] bg-white p-3">
                        <h4 className="text-[16px] font-bold text-[#1A1220]">
                            Booking Status
                        </h4>

                        <div className="mt-4 flex items-center justify-between gap-3">
                            <span className="text-sm text-[#7A6984]">Current Status</span>
                            <StatusBadge status={getBookingStatusLabel(booking)} />
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                            <span className="text-sm text-[#7A6984]">Next Step</span>
                            <span className="text-sm font-semibold text-[#1A1220]">
                {nextStep}
              </span>
                        </div>

                        <div className="mt-3 rounded-lg bg-[#E9DFF0] px-3 py-2.5 text-center text-sm font-semibold text-[#6F5A7D]">
                            {nextStep}
                        </div>

                        <p className="mt-3 text-center text-xs text-[#95819C]">
                            {getBookingStatusMessage(booking.status)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass(
                status
            )}`}
        >
      {status}
    </span>
    );
}

function ActivityModuleBadge({ module }: { module: SystemModule }) {
    const className =
        module === "Bookings"
            ? "bg-[#F0EAFE] text-[#66429A]"
            : module === "Inventory"
                ? "bg-[#FFF5D9] text-[#9A650B]"
                : module === "Packages"
                    ? "bg-[#E8F4FF] text-[#25638A]"
                    : "bg-[#E8F6EC] text-[#176C27]";

    return (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${className}`}>
      {module}
    </span>
    );
}

function StatCard({
                      label,
                      value,
                      helper,
                  }: {
    label: string;
    value: string;
    helper: string;
}) {
    return (
        <article className="rounded-[14px] border border-[#E6DDF0] bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold text-[#806A8C]">
                {label}
            </p>
            <p className="mt-1 text-[19px] font-bold text-[#1A1220]">
                {value}
            </p>
            <p className="mt-1 text-xs text-[#7A6A84]">{helper}</p>
        </article>
    );
}

function InventoryFilterCard({
                                 label,
                                 value,
                                 helper,
                                 active,
                                 onClick,
                             }: {
    label: string;
    value: string;
    helper: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`rounded-[14px] border p-3 text-left shadow-sm transition ${
                active
                    ? "border-[#2B174C] bg-[#2B174C] text-white shadow-[0_8px_18px_rgba(43,23,76,0.18)]"
                    : "border-[#E6DDF0] bg-white text-[#1A1220] hover:border-[#CDB7E1] hover:bg-[#FFFEFC]"
            }`}
        >
            <p
                className={`text-[11px] font-medium tracking-[0.08em] ${
                    active ? "text-[#EBDCFF]" : "text-[#9B8AAA]"
                }`}
            >
                {label}
            </p>

            <p className="mt-1 text-[19px] font-bold">{value}</p>

            <p
                className={`mt-1 text-xs ${
                    active ? "text-[#F4E9B8]" : "text-[#8A7A91]"
                }`}
            >
                {helper}
            </p>
        </button>
    );
}

function StaffModuleFilterCard({
                                   label,
                                   value,
                                   active,
                                   onClick,
                               }: {
    label: string;
    value: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`h-[82px] rounded-[14px] border p-3 text-left shadow-sm transition ${
                active
                    ? "border-[#2B174C] bg-[#2B174C] text-white shadow-[0_8px_18px_rgba(43,23,76,0.18)]"
                    : "border-[#E6DDF0] bg-white text-[#1A1220] hover:border-[#CDB7E1] hover:bg-[#FFFEFC]"
            }`}
        >
            <p
                className={`truncate text-[11px] font-medium tracking-[0.08em] ${
                    active ? "text-[#EBDCFF]" : "text-[#9B8AAA]"
                }`}
            >
                {label}
            </p>

            <p className="mt-2 text-[19px] font-bold leading-none">
                {value}
            </p>
        </button>
    );
}

function BookingFilterCard({
                               label,
                               value,
                               active,
                               onClick,
                           }: {
    label: string;
    value: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`h-[66px] rounded-[14px] border p-3 text-left shadow-sm transition ${
                active
                    ? "border-[#2B174C] bg-[#2B174C] text-white"
                    : "border-[#E6DDF0] bg-white text-[#1A1220] hover:border-[#CDB7E1] hover:bg-[#FFFEFC]"
            }`}
        >
            <p
                className={`truncate text-[10px] font-medium tracking-[0.08em] ${
                    active ? "text-[#EBDCFF]" : "text-[#9B8AAA]"
                }`}
            >
                {label}
            </p>

            <p
                className={`mt-1 text-[19px] font-bold leading-none ${
                    active ? "text-white" : "text-[#1A1220]"
                }`}
            >
                {value}
            </p>
        </button>
    );
}

function ReportModuleCard({
                              title,
                              subtitle,
                              icon: Icon,
                              metricLabel,
                              metricValue,
                              detail,
                              onClick,
                          }: {
    title: string;
    subtitle: string;
    icon: ComponentType<{ size?: number; strokeWidth?: number }>;
    metricLabel: string;
    metricValue: string;
    detail: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group relative flex min-h-[166px] flex-col rounded-[14px] border border-[#E6DDF0] bg-white p-3 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#CDB7E1] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#2B174C]/30"
            aria-label={`Open ${title}`}
        >
            <div className="flex items-start justify-between gap-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7F1FF] text-[#8B4DFF] transition group-hover:bg-[#EEE2FF]">
          <Icon size={22} strokeWidth={1.9} />
        </span>

                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#735184] transition group-hover:text-[#2B174C]">
          View report
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </span>
            </div>

            <div className="mt-3">
                <h3 className="text-[16px] font-bold text-[#1A1220]">
                    {title}
                </h3>
                <p className="mt-1 text-xs text-[#7A6A84]">{subtitle}</p>
            </div>

            <div className="mt-auto flex items-end justify-between gap-3 border-t border-[#F0E9F4] pt-3">
                <div>
                    <p className="text-xs font-semibold text-[#806A8C]">
                        {metricLabel}
                    </p>
                    <p className="mt-1 text-[19px] font-bold text-[#1A1220]">
                        {metricValue}
                    </p>
                </div>

                <p className="max-w-[155px] text-right text-xs leading-5 text-[#7A6A84]">
                    {detail}
                </p>
            </div>
        </button>
    );
}

function SectionCard({
                         title,
                         subtitle,
                         children,
                     }: {
    title: string;
    subtitle: string;
    children: ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-[14px] border border-[#E6DDF0] bg-white shadow-sm">
            <div className="border-b border-[#E6DDF0] bg-white px-3 py-3">
                <h3 className="text-[16px] font-bold text-[#1A1220]">
                    {title}
                </h3>
                <p className="mt-0.5 text-xs text-[#8A7A91]">{subtitle}</p>
            </div>
            <div className="p-3">{children}</div>
        </section>
    );
}

export function ReportsWorkspace({
                                     initialRole,
                                     assignedBranch,
                                 }: {
    initialRole: UserRole;
    assignedBranch: string;
}) {
    const role = initialRole;
    const [branch, setBranch] = useState(assignedBranch || DEFAULT_BRANCH);
    const [startDate, setStartDate] = useState(getMonthStart(getToday()));
    const [endDate, setEndDate] = useState(getToday());
    const [selectedReport, setSelectedReport] = useState<ReportKey | null>(null);
    const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>("all");
    const [expandedInventoryId, setExpandedInventoryId] = useState<string | null>(null);
    const [bookingFilter, setBookingFilter] = useState<BookingFilter>("all");
    const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
    const [staffModuleFilter, setStaffModuleFilter] =
        useState<StaffModuleFilter>("all");
    const [report, setReport] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);

    const loadReport = useCallback(async () => {
        const query = new URLSearchParams({
            branch,
            month: startDate.slice(0, 7),
            startDate,
            endDate,
            role,
            assignedBranch,
        });

        try {
            setLoading(true);

            const response = await fetch(`/api/reports?${query.toString()}`, {
                cache: "no-store",
            });
            const payload = await response.json();

            setReport(response.ok && payload?.success ? payload.data : null);
        } catch {
            setReport(null);
        } finally {
            setLoading(false);
        }
    }, [assignedBranch, branch, endDate, role, startDate]);

    useEffect(() => {
        void loadReport();
    }, [loadReport]);

    useEffect(() => {
        const updateDateTime = () => setCurrentDateTime(new Date());

        updateDateTime();
        const timer = window.setInterval(updateDateTime, 30_000);

        return () => {
            window.clearInterval(timer);
        };
    }, []);

    const actualRole = report?.access?.role || role;
    const isOwner = actualRole === "owner";

    const activeBranch = isOwner
        ? branch
        : report?.access?.assignedBranch || assignedBranch;

    const branchOptions = useMemo(() => {
        if (report?.branchOptions?.length) return report.branchOptions;
        return [ALL_BRANCHES, DEFAULT_BRANCH, "Pasay Branch", "Parañaque Branch"];
    }, [report?.branchOptions]);

    const inventory = useMemo(
        () =>
            report?.inventoryList?.length
                ? report.inventoryList
                : fallbackInventory(activeBranch),
        [activeBranch, report?.inventoryList]
    );

    const restocks = useMemo(
        () =>
            report?.restockHistory?.length
                ? report.restockHistory
                : fallbackRestocks(activeBranch),
        [activeBranch, report?.restockHistory]
    );

    const bookings = useMemo(
        () =>
            report?.bookingList?.length
                ? report.bookingList
                : fallbackBookings(activeBranch),
        [activeBranch, report?.bookingList]
    );

    const sales = useMemo(
        () =>
            report?.salesList?.length
                ? report.salesList
                : fallbackSales(activeBranch),
        [activeBranch, report?.salesList]
    );

    const forecasts = useMemo(
        () =>
            report?.forecasting?.length ? report.forecasting : fallbackForecasts(),
        [report?.forecasting]
    );

    const seasons = useMemo(
        () =>
            report?.seasonalInsights?.length
                ? report.seasonalInsights
                : fallbackSeasons(),
        [report?.seasonalInsights]
    );

    const staffActivities = useMemo(
        () =>
            report?.staffActivities?.length
                ? report.staffActivities
                : fallbackStaffActivities(activeBranch),
        [activeBranch, report?.staffActivities]
    );

    const bookingStaffActions = useMemo(
        () => staffActivities.filter((item) => item.module === "Bookings").length,
        [staffActivities]
    );

    const packageStaffActions = useMemo(
        () => staffActivities.filter((item) => item.module === "Packages").length,
        [staffActivities]
    );

    const inventoryStaffActions = useMemo(
        () => staffActivities.filter((item) => item.module === "Inventory").length,
        [staffActivities]
    );

    const salesPosStaffActions = useMemo(
        () =>
            staffActivities.filter((item) => item.module === "Sales / POS").length,
        [staffActivities]
    );

    const latestStaffAction = staffActivities[0];

    const displayedStaffActivities = useMemo(() => {
        if (staffModuleFilter === "all") return staffActivities;

        return staffActivities.filter(
            (activity) => activity.module === staffModuleFilter
        );
    }, [staffActivities, staffModuleFilter]);

    const staffActionListTitle =
        staffModuleFilter === "all"
            ? "Current Staff Actions"
            : `${staffModuleFilter} Staff Actions`;

    const staffActionListSubtitle =
        staffModuleFilter === "all"
            ? "Track staff actions from Bookings, Inventory, Packages, and Sales / POS."
            : `Showing only staff actions from the ${staffModuleFilter} module.`;

    const lowStock = useMemo(
        () =>
            report?.lowStockItems?.length
                ? report.lowStockItems
                : inventory.filter((item) => item.status === "Low Stock"),
        [inventory, report?.lowStockItems]
    );

    const outOfStock = useMemo(
        () =>
            report?.outOfStockItems?.length
                ? report.outOfStockItems
                : inventory.filter((item) => item.status === "Out of Stock"),
        [inventory, report?.outOfStockItems]
    );

    const displayedInventory = useMemo(() => {
        if (inventoryFilter === "low") return lowStock;
        if (inventoryFilter === "out") return outOfStock;
        return inventory;
    }, [inventory, inventoryFilter, lowStock, outOfStock]);

    const inventoryListTitle =
        inventoryFilter === "low"
            ? "Low Stock Items"
            : inventoryFilter === "out"
                ? "Out of Stock Items"
                : "All Inventory Items";

    const inventoryListSubtitle =
        inventoryFilter === "low"
            ? "Items that have reached or fallen below the reorder level."
            : inventoryFilter === "out"
                ? "Items with zero available stock that need immediate restocking."
                : "Current stock monitoring, low-stock alerts, and status per product.";

    const displayedBookings = useMemo(() => {
        if (bookingFilter === "all") return bookings;
        return bookings.filter((booking) => booking.status === bookingFilter);
    }, [bookingFilter, bookings]);

    const bookingListTitle =
        bookingFilter === "all"
            ? "All Booking Records"
            : `${bookingFilter.charAt(0).toUpperCase()}${bookingFilter.slice(1)} Booking Records`;

    const bookingListSubtitle =
        bookingFilter === "all"
            ? "Booking ID, reference number, customer, package, event date, and status."
            : `Showing only ${bookingFilter} booking records for the selected period.`;

    const bookingFilters: Array<{
        key: BookingFilter;
        label: string;
        count: number;
        helper: string;
    }> = [
        {
            key: "all",
            label: "ALL BOOKINGS",
            count: bookings.length,
            helper: "Show all booking records",
        },
        {
            key: "pending",
            label: "PENDING",
            count: bookings.filter((booking) => booking.status === "pending").length,
            helper: "Show pending bookings",
        },
        {
            key: "confirmed",
            label: "CONFIRMED",
            count: bookings.filter((booking) => booking.status === "confirmed").length,
            helper: "Show confirmed bookings",
        },
        {
            key: "preparing",
            label: "PREPARING",
            count: bookings.filter((booking) => booking.status === "preparing").length,
            helper: "Show bookings in preparation",
        },
        {
            key: "completed",
            label: "COMPLETED",
            count: bookings.filter((booking) => booking.status === "completed").length,
            helper: "Show completed bookings",
        },
        {
            key: "cancelled",
            label: "CANCELLED",
            count: bookings.filter((booking) => booking.status === "cancelled").length,
            helper: "Show cancelled bookings",
        },
    ];

    const salesRows = useMemo(() => buildSalesRows(sales, bookings), [bookings, sales]);

    const totalStock = useMemo(() => sumBy(inventory, (item) => item.stock), [inventory]);
    const totalSales = useMemo(() => sumBy(sales, (item) => item.amount), [sales]);
    const totalBookingRevenue = useMemo(
        () =>
            sumBy(
                bookings.filter((item) => item.status !== "cancelled"),
                (item) => item.amount
            ),
        [bookings]
    );

    const completedBookings = useMemo(
        () => bookings.filter((item) => item.status === "completed").length,
        [bookings]
    );

    const highRiskForecasts = useMemo(
        () => forecasts.filter((item) => item.riskLevel === "High").length,
        [forecasts]
    );

    const reportModuleMeta: Record<
        ReportKey,
        { metricLabel: string; metricValue: string; detail: string }
    > = {
        inventory: {
            metricLabel: "CURRENT STOCK",
            metricValue: formatNumber(totalStock),
            detail: `${lowStock.length} low stock · ${outOfStock.length} out`,
        },
        restock: {
            metricLabel: "RESTOCK RECORDS",
            metricValue: formatNumber(restocks.length),
            detail: restocks.length
                ? `Latest: ${formatDate(restocks[0].date)}`
                : "No restock records",
        },
        bookings: {
            metricLabel: "TOTAL BOOKINGS",
            metricValue: formatNumber(bookings.length),
            detail: `${completedBookings} completed bookings`,
        },
        sales: {
            metricLabel: "TOTAL REVENUE",
            metricValue: formatPeso(totalSales + totalBookingRevenue),
            detail: `${sales.length} POS transaction(s)`,
        },
        forecasting: {
            metricLabel: "FORECAST ITEMS",
            metricValue: formatNumber(forecasts.length),
            detail:
                highRiskForecasts > 0
                    ? `${highRiskForecasts} high-risk item(s)`
                    : "Forecasts ready to review",
        },
        staff: {
            metricLabel: "RECENT ACTIONS",
            metricValue: formatNumber(staffActivities.length),
            detail: latestStaffAction
                ? `${latestStaffAction.staffName}: ${latestStaffAction.action}`
                : "No staff actions recorded",
        },
    };

    const currentRange =
        report?.dateRange?.startDate && report?.dateRange?.endDate
            ? formatDateRange(report.dateRange.startDate, report.dateRange.endDate)
            : formatDateRange(startDate, endDate);

    const allowedCards = REPORT_CARDS.filter((card) => {
        if (card.key === "staff") return actualRole !== "staff";
        return true;
    });

    const selectedTitle =
        REPORT_CARDS.find((card) => card.key === selectedReport)?.title || "Reports";

    function getExportTable(): ExportTable {
        if (selectedReport === "restock") {
            return {
                title: "Inventory Restock History",
                headers: [
                    "Date",
                    "Product",
                    "Variant",
                    "Branch",
                    "Quantity Added",
                    "Current Stock",
                    "Reference",
                ],
                rows: restocks.map((item) => [
                    formatDate(item.date),
                    item.product,
                    item.variantName || "—",
                    item.branch,
                    `+${item.quantityAdded}`,
                    String(item.currentStock),
                    item.reference || item.id,
                ]),
            };
        }

        if (selectedReport === "bookings") {
            return {
                title:
                    bookingFilter === "all"
                        ? "Booking History"
                        : `${bookingFilter.charAt(0).toUpperCase()}${bookingFilter.slice(1)} Booking History`,
                headers: [
                    "Booking ID",
                    "Reference No.",
                    "Customer",
                    "Package",
                    "Event Date",
                    "Status",
                ],
                rows: displayedBookings.map((item) => [
                    item.id,
                    item.reference,
                    item.customer,
                    item.packageName,
                    formatDate(item.eventDate),
                    item.statusLabel ||
                    `${item.status.charAt(0).toUpperCase()}${item.status.slice(1)}`,
                ]),
            };
        }

        if (selectedReport === "sales") {
            return {
                title: "Sales Report",
                headers: [
                    "Date",
                    "Transaction Count",
                    "POS Sales",
                    "Booking Revenue",
                    "Total Revenue",
                ],
                rows: salesRows.map((item) => [
                    formatDate(item.date),
                    String(item.transactionCount),
                    formatPeso(item.posSales),
                    formatPeso(item.bookingRevenue),
                    formatPeso(item.totalRevenue),
                ]),
            };
        }

        if (selectedReport === "forecasting") {
            return {
                title: "Forecasting Report",
                headers: [
                    "Product / Package",
                    "Current Stock / Bookings",
                    "Forecasted Demand",
                    "Suggested Restock",
                    "Risk Level",
                ],
                rows: forecasts.map((item) => [
                    item.item,
                    item.currentValue,
                    item.forecastedDemand,
                    item.suggestedRestock,
                    item.riskLevel,
                ]),
            };
        }

        if (selectedReport === "staff") {
            return {
                title: "Staff Current Actions Report",
                headers: [
                    "Date",
                    "Time",
                    "Staff Name",
                    "Role",
                    "Action",
                    "Module",
                    "Reference",
                    "Details",
                    "Branch",
                ],
                rows: displayedStaffActivities.map((item) => [
                    formatDate(item.date),
                    item.time || "—",
                    item.staffName,
                    item.role,
                    item.action,
                    item.module,
                    item.reference || "—",
                    item.details || "—",
                    item.branch,
                ]),
            };
        }

        return {
            title:
                inventoryFilter === "low"
                    ? "Low Stock Inventory Report"
                    : inventoryFilter === "out"
                        ? "Out of Stock Inventory Report"
                        : "Inventory Report",
            headers: [
                "Product Name",
                "Category",
                "Branch",
                "Variants",
                "Current Stock",
                "Reorder Level",
                "Status",
            ],
            rows: displayedInventory.flatMap((item) => {
                const variants = getInventoryVariants(item);

                const parentRow = [
                    item.product,
                    item.category,
                    item.branch,
                    variants.length ? `${variants.length} variants` : "Regular",
                    String(item.stock),
                    String(item.reorderLevel),
                    item.status,
                ];

                const variantRows = variants.map((variant) => [
                    `  ↳ ${variant.name}`,
                    "Variant",
                    item.branch,
                    variant.sku || "—",
                    String(variant.stock),
                    String(variant.reorderLevel ?? "—"),
                    getVariantStatus(variant),
                ]);

                return [parentRow, ...variantRows];
            }),
        };
    }

    function exportDoc() {
        const table = getExportTable();
        const rows = table.rows
            .map(
                (row) =>
                    `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
            )
            .join("");

        const documentHtml = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Arial, sans-serif; color: #1A1220; }
            h1 { color: #2B174C; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th { background: #2B174C; color: white; }
            th, td { border: 1px solid #DED3E8; padding: 8px; text-align: left; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(table.title)}</h1>
          <p>Branch: ${escapeHtml(activeBranch)} | Date range: ${escapeHtml(currentRange)}</p>
          <table>
            <thead><tr>${table.headers
            .map((header) => `<th>${escapeHtml(header)}</th>`)
            .join("")}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

        downloadFile(
            `stocknbook-${selectedReport || "report"}-${startDate}.doc`,
            "application/msword;charset=utf-8",
            documentHtml
        );
    }

    function exportExcel() {
        const table = getExportTable();
        const rows = table.rows
            .map(
                (row) =>
                    `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
            )
            .join("");

        const excelHtml = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            table { border-collapse: collapse; font-family: Arial, sans-serif; }
            th { background: #2B174C; color: white; }
            th, td { border: 1px solid #DED3E8; padding: 8px; text-align: left; }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr><th colspan="${table.headers.length}">${escapeHtml(table.title)}</th></tr>
              <tr>${table.headers
            .map((header) => `<th>${escapeHtml(header)}</th>`)
            .join("")}</tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

        downloadFile(
            `stocknbook-${selectedReport || "report"}-${startDate}.xls`,
            "application/vnd.ms-excel;charset=utf-8",
            excelHtml
        );
    }

    function exportPdf() {
        const table = getExportTable();
        const pdf = createTablePdf({
            title: table.title,
            branch: activeBranch,
            dateRange: currentRange,
            headers: table.headers,
            rows: table.rows,
        });

        downloadFile(
            `stocknbook-${selectedReport || "report"}-${startDate}.pdf`,
            "application/pdf",
            pdf
        );
    }

    return (
        <div className="min-w-0 overflow-x-hidden font-sans">
            <div className="sticky top-0 z-20 border-b border-[#E9E0EF] bg-[#FFFDF8]/95 backdrop-blur">
                <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 px-6 py-3">
                    <h1 className="text-[25px] font-bold text-[#1A1220]">
                        Reports
                    </h1>

                    <div className="flex items-center gap-2.5">
                            <span className="inline-flex h-[42px] items-center rounded-xl border border-[#E6DDF0] bg-white px-3.5 text-sm font-semibold text-[#2B174C] shadow-sm">
                                {currentDateTime
                                    ? formatCurrentDateTime(currentDateTime)
                                    : "Loading date..."}
                            </span>

                        <button
                            type="button"
                            onClick={() => void loadReport()}
                            disabled={loading}
                            aria-label="Refresh reports"
                            title="Refresh reports"
                            className="inline-flex h-[42px] items-center gap-2 rounded-xl bg-[#2B174C] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1B0D31] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <RefreshCw
                                size={16}
                                className={loading ? "animate-spin" : ""}
                            />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-5 py-5">
                {!selectedReport ? (
                    <>
                        {loading ? (
                            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {[1, 2, 3, 4, 5, 6].map((item) => (
                                    <div
                                        key={item}
                                        className="h-[166px] animate-pulse rounded-2xl border border-[#E6DDF0] bg-white"
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {allowedCards.map((card) => {
                                    const moduleMeta = reportModuleMeta[card.key];

                                    return (
                                        <ReportModuleCard
                                            key={card.key}
                                            title={card.title}
                                            subtitle={card.subtitle}
                                            icon={card.icon}
                                            metricLabel={moduleMeta.metricLabel}
                                            metricValue={moduleMeta.metricValue}
                                            detail={moduleMeta.detail}
                                            onClick={() => {
                                                setSelectedReport(card.key);

                                                if (card.key === "inventory") {
                                                    setInventoryFilter("all");
                                                    setExpandedInventoryId(null);
                                                }

                                                if (card.key === "bookings") {
                                                    setBookingFilter("all");
                                                    setExpandedBookingId(null);
                                                }

                                                if (card.key === "staff") {
                                                    setStaffModuleFilter("all");
                                                }
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </>
                ) : (
                    <section>
                        <div className="rounded-[14px] border border-[#E6DDF0] bg-white p-3 shadow-sm">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedReport(null)}
                                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E6DDF0] bg-white text-[#5F4E75] transition hover:bg-[#F7F1FF]"
                                        title="Back to reports"
                                    >
                                        <ArrowLeft size={17} />
                                    </button>

                                    <div>
                                        <h2 className="text-[19px] font-bold text-[#1A1220]">
                                            {selectedTitle}
                                        </h2>
                                        <p className="mt-0.5 text-xs text-[#8A7A91]">
                                            {activeBranch} · {currentRange}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-end gap-2">
                                    {isOwner ? (
                                        <label className="flex flex-col gap-1 text-[10px] font-medium tracking-[0.08em] text-[#806A8C]">
                                            BRANCH
                                            <select
                                                value={branch}
                                                onChange={(event) => setBranch(event.target.value)}
                                                className="h-9 min-w-[170px] rounded-lg border border-[#E6DDF0] bg-white px-3 text-sm font-normal text-[#1A1220] outline-none focus:border-[#8D63C8]"
                                            >
                                                {branchOptions.map((item) => (
                                                    <option key={item} value={item}>
                                                        {item}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    ) : (
                                        <div className="rounded-lg border border-[#E6DDF0] bg-[#FFFCF7] px-3 py-2">
                                            <p className="text-xs font-semibold text-[#806A8C]">
                                                ACCOUNT BRANCH
                                            </p>
                                            <p className="mt-0.5 text-sm font-semibold text-[#1A1220]">
                                                {activeBranch}
                                            </p>
                                        </div>
                                    )}

                                    <label className="flex flex-col gap-1 text-[10px] font-medium tracking-[0.08em] text-[#806A8C]">
                                        START
                                        <input
                                            type="date"
                                            value={startDate}
                                            max={endDate}
                                            onChange={(event) => setStartDate(event.target.value)}
                                            className="h-9 rounded-lg border border-[#E6DDF0] bg-white px-3 text-sm font-normal text-[#1A1220] outline-none focus:border-[#8D63C8]"
                                        />
                                    </label>

                                    <label className="flex flex-col gap-1 text-[10px] font-medium tracking-[0.08em] text-[#806A8C]">
                                        END
                                        <input
                                            type="date"
                                            value={endDate}
                                            min={startDate}
                                            onChange={(event) => setEndDate(event.target.value)}
                                            className="h-9 rounded-lg border border-[#E6DDF0] bg-white px-3 text-sm font-normal text-[#1A1220] outline-none focus:border-[#8D63C8]"
                                        />
                                    </label>

                                    <button
                                        type="button"
                                        onClick={() => void loadReport()}
                                        className="h-9 rounded-lg bg-[#2B174C] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3A205F]"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>

                            <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-[#EFE7F4] pt-3">
                                <button
                                    type="button"
                                    onClick={exportDoc}
                                    className="flex h-9 items-center gap-2 rounded-lg border border-[#E6DDF0] bg-white px-3 text-sm font-semibold text-[#4E2C66] hover:bg-[#F7F1FF]"
                                >
                                    <FileText size={15} />
                                    Export DOC
                                </button>
                                <button
                                    type="button"
                                    onClick={exportPdf}
                                    className="flex h-9 items-center gap-2 rounded-lg border border-[#E6DDF0] bg-white px-3 text-sm font-semibold text-[#4E2C66] hover:bg-[#F7F1FF]"
                                >
                                    <FileText size={15} />
                                    Export PDF
                                </button>
                                <button
                                    type="button"
                                    onClick={exportExcel}
                                    className="flex h-9 items-center gap-2 rounded-lg bg-[#2B174C] px-3 text-sm font-semibold text-white hover:bg-[#3A205F]"
                                >
                                    <FileSpreadsheet size={15} />
                                    Export Excel
                                </button>
                            </div>
                        </div>

                        {selectedReport === "inventory" && (
                            <div className="mt-4 space-y-4">
                                <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                    <InventoryFilterCard
                                        label="CURRENT STOCK"
                                        value={formatNumber(totalStock)}
                                        helper={`${inventory.length} inventory record(s)`}
                                        active={inventoryFilter === "all"}
                                        onClick={() => setInventoryFilter("all")}
                                    />
                                    <InventoryFilterCard
                                        label="LOW STOCK"
                                        value={formatNumber(lowStock.length)}
                                        helper="Show items at reorder level"
                                        active={inventoryFilter === "low"}
                                        onClick={() => setInventoryFilter("low")}
                                    />
                                    <InventoryFilterCard
                                        label="OUT OF STOCK"
                                        value={formatNumber(outOfStock.length)}
                                        helper="Show items needing restock"
                                        active={inventoryFilter === "out"}
                                        onClick={() => setInventoryFilter("out")}
                                    />
                                </section>

                                <SectionCard
                                    title={inventoryListTitle}
                                    subtitle={inventoryListSubtitle}
                                >
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[1080px] border-collapse text-sm">
                                            <thead>
                                            <tr className="border-b border-[#E6DDF0] bg-[#FFFCF7]">
                                                <th className="px-3 py-3 text-left text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    Product
                                                </th>
                                                <th className="px-3 py-3 text-left text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    Category
                                                </th>
                                                <th className="px-3 py-3 text-left text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    Type
                                                </th>
                                                <th className="px-3 py-3 text-right text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    Stock
                                                </th>
                                                <th className="px-3 py-3 text-right text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    Alert
                                                </th>
                                                <th className="px-3 py-3 text-right text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    Cost Price
                                                </th>
                                                <th className="px-3 py-3 text-right text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    Sales Price
                                                </th>
                                                <th className="px-3 py-3 text-right text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    Status
                                                </th>
                                            </tr>
                                            </thead>

                                            <tbody>
                                            {displayedInventory.length > 0 ? (
                                                displayedInventory.map((item) => {
                                                    const variants = getInventoryVariants(item);
                                                    const hasVariants = variants.length > 0;
                                                    const isExpanded = expandedInventoryId === item.id;

                                                    return (
                                                        <Fragment key={item.id}>
                                                            <tr
                                                                className={`border-b border-[#EFE7F4] transition ${
                                                                    isExpanded
                                                                        ? "bg-[#F4ECFA]"
                                                                        : "bg-white hover:bg-[#FCFAFD]"
                                                                }`}
                                                            >
                                                                <td className="px-3 py-3 align-top">
                                                                    <div className="flex items-start gap-2.5">
                                                                        {hasVariants ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    setExpandedInventoryId((current) =>
                                                                                        current === item.id ? null : item.id
                                                                                    )
                                                                                }
                                                                                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                                                                                    isExpanded
                                                                                        ? "border-[#8D63C8] bg-[#8D63C8] text-white"
                                                                                        : "border-[#DDD1E8] bg-white text-[#5D4774] hover:bg-[#F1E9F8]"
                                                                                }`}
                                                                                aria-label={
                                                                                    isExpanded
                                                                                        ? "Hide variants"
                                                                                        : "Show variants"
                                                                                }
                                                                            >
                                                                                {isExpanded ? (
                                                                                    <ChevronUp size={14} />
                                                                                ) : (
                                                                                    <ChevronDown size={14} />
                                                                                )}
                                                                            </button>
                                                                        ) : (
                                                                            <span className="mt-0.5 block h-6 w-6 shrink-0" />
                                                                        )}

                                                                        <div className="min-w-0">
                                                                            <p className="truncate font-semibold text-[#1A1220]">
                                                                                {item.product}
                                                                            </p>
                                                                            {hasVariants && (
                                                                                <p className="mt-0.5 text-xs text-[#7E6B8A]">
                                                                                    Click to view {variants.length} variants
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </td>

                                                                <td className="px-3 py-3 text-[#6A5D6F]">
                                                                    {item.category}
                                                                </td>

                                                                <td className="px-3 py-3 text-[#6A5D6F]">
                                                                    {hasVariants
                                                                        ? `${variants.length} variants`
                                                                        : "Single product"}
                                                                </td>

                                                                <td className="px-3 py-3 text-right font-semibold text-[#1A1220]">
                                                                    {formatNumber(item.stock)}
                                                                </td>

                                                                <td className="px-3 py-3 text-right text-[#6A5D6F]">
                                                                    {formatNumber(item.reorderLevel)}
                                                                </td>

                                                                <td className="px-3 py-3 text-right text-[#6A5D6F]">
                                                                    {getPriceRange(item, "costPrice")}
                                                                </td>

                                                                <td className="px-3 py-3 text-right font-semibold text-[#1A1220]">
                                                                    {getPriceRange(item, "salesPrice")}
                                                                </td>

                                                                <td className="px-3 py-3 text-right">
                                                                    <StatusBadge status={item.status} />
                                                                </td>
                                                            </tr>

                                                            {hasVariants && isExpanded && (
                                                                <tr className="border-b border-[#E1D5EB] bg-[#F4ECFA]">
                                                                    <td colSpan={8} className="p-0">
                                                                        <div className="bg-[#F4ECFA] px-4 py-2">
                                                                            {variants.map((variant, index) => (
                                                                                <div
                                                                                    key={variant.id}
                                                                                    className="grid grid-cols-[minmax(230px,2fr)_minmax(140px,1fr)_minmax(110px,0.8fr)_minmax(90px,0.65fr)_minmax(90px,0.65fr)_minmax(120px,0.85fr)_minmax(120px,0.85fr)_minmax(110px,0.8fr)] items-center gap-3 border-b border-[#E2D6EC] py-3 last:border-b-0"
                                                                                >
                                                                                    <div className="relative pl-8">
                                                                                        {index < variants.length - 1 && (
                                                                                            <span className="absolute bottom-[-15px] left-[9px] top-[16px] border-l border-dashed border-[#C9AEE5]" />
                                                                                        )}
                                                                                        <span className="absolute left-[4px] top-[7px] h-3 w-3 rounded-full bg-[#9B65D6]" />
                                                                                        <p className="truncate text-sm font-semibold text-[#2B174C]">
                                                                                            {variant.name}
                                                                                        </p>
                                                                                    </div>

                                                                                    <p className="text-sm text-[#8A7A91]">—</p>

                                                                                    <p className="text-sm text-[#6A5D6F]">Variant</p>

                                                                                    <p className="text-right text-sm font-semibold text-[#1A1220]">
                                                                                        {formatNumber(variant.stock)}
                                                                                    </p>

                                                                                    <p className="text-right text-sm text-[#6A5D6F]">
                                                                                        {formatNumber(
                                                                                            variant.reorderLevel ?? 0
                                                                                        )}
                                                                                    </p>

                                                                                    <p className="text-right text-sm text-[#6A5D6F]">
                                                                                        {typeof variant.costPrice === "number"
                                                                                            ? formatPeso(variant.costPrice)
                                                                                            : "—"}
                                                                                    </p>

                                                                                    <p className="text-right text-sm font-semibold text-[#1A1220]">
                                                                                        {typeof variant.salesPrice === "number"
                                                                                            ? formatPeso(variant.salesPrice)
                                                                                            : "—"}
                                                                                    </p>

                                                                                    <div className="text-right">
                                                                                        <StatusBadge
                                                                                            status={getVariantStatus(variant)}
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </Fragment>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td
                                                        colSpan={8}
                                                        className="px-3 py-10 text-center text-sm text-[#8A7A91]"
                                                    >
                                                        No matching inventory items found.
                                                    </td>
                                                </tr>
                                            )}
                                            </tbody>
                                        </table>
                                    </div>
                                </SectionCard>
                            </div>
                        )}

                        {selectedReport === "restock" && (
                            <div className="mt-4 space-y-4">
                                <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                    <StatCard
                                        label="RESTOCK RECORDS"
                                        value={formatNumber(restocks.length)}
                                        helper="Recorded restock entries"
                                    />
                                    <StatCard
                                        label="UNITS ADDED"
                                        value={formatNumber(
                                            sumBy(restocks, (item) => item.quantityAdded)
                                        )}
                                        helper="Total quantity added"
                                    />
                                    <StatCard
                                        label="PRODUCTS RESTOCKED"
                                        value={formatNumber(
                                            new Set(restocks.map((item) => item.product)).size
                                        )}
                                        helper="Unique products replenished"
                                    />
                                </section>

                                <SectionCard
                                    title="Inventory Restock History"
                                    subtitle="Review restock references, products, quantities added, and current stock."
                                >
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[860px] border-collapse text-sm">
                                            <thead>
                                            <tr className="border-b border-[#E6DDF0] bg-[#FFFCF7]">
                                                <th className="px-3 py-3 text-left text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    Date
                                                </th>
                                                <th className="px-3 py-3 text-left text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    Product
                                                </th>
                                                <th className="px-3 py-3 text-left text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    Branch
                                                </th>
                                                <th className="px-3 py-3 text-center text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    Quantity Added
                                                </th>
                                                <th className="px-3 py-3 text-center text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    Current Stock
                                                </th>
                                            </tr>
                                            </thead>

                                            <tbody>
                                            {restocks.length > 0 ? (
                                                restocks.map((item) => (
                                                    <tr
                                                        key={item.id}
                                                        className="border-b border-[#EFE7F4] bg-white hover:bg-[#FCFAFD]"
                                                    >
                                                        <td className="px-3 py-3 align-top">
                                                            <p className="font-semibold text-[#1A1220]">
                                                                {formatDate(item.date)}
                                                            </p>
                                                            <p className="mt-0.5 text-xs text-[#7E6B8A]">
                                                                {item.reference || item.id}
                                                            </p>
                                                        </td>

                                                        <td className="px-3 py-3 align-top">
                                                            <p className="font-semibold text-[#1A1220]">
                                                                {item.product}
                                                            </p>
                                                            <p className="mt-0.5 text-xs text-[#7E6B8A]">
                                                                {item.variantName || "Product restock"}
                                                            </p>
                                                        </td>

                                                        <td className="px-3 py-3 align-top text-[#6A5D6F]">
                                                            {item.branch}
                                                        </td>

                                                        <td className="px-3 py-3 text-center align-top font-semibold text-[#176C27]">
                                                            +{formatNumber(item.quantityAdded)}
                                                        </td>

                                                        <td className="px-3 py-3 text-center align-top font-semibold text-[#1A1220]">
                                                            {formatNumber(item.currentStock)}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td
                                                        colSpan={5}
                                                        className="px-3 py-10 text-center text-sm text-[#8A7A91]"
                                                    >
                                                        No restock records found for the selected period.
                                                    </td>
                                                </tr>
                                            )}
                                            </tbody>
                                        </table>
                                    </div>
                                </SectionCard>
                            </div>
                        )}

                        {selectedReport === "bookings" && (
                            <div className="mt-4 space-y-4">
                                <div className="overflow-x-auto pb-1">
                                    <section className="grid min-w-[690px] grid-cols-6 gap-2">
                                        {bookingFilters.map((filter) => (
                                            <BookingFilterCard
                                                key={filter.key}
                                                label={filter.label}
                                                value={formatNumber(filter.count)}
                                                active={bookingFilter === filter.key}
                                                onClick={() => setBookingFilter(filter.key)}
                                            />
                                        ))}
                                    </section>
                                </div>

                                <SectionCard
                                    title={bookingListTitle}
                                    subtitle={bookingListSubtitle}
                                >
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[1080px] border-collapse text-sm">
                                            <thead>
                                            <tr className="border-b border-[#E6DDF0] bg-[#FFFCF7]">
                                                <th className="px-3 py-3 text-left text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    Client
                                                </th>
                                                <th className="px-3 py-3 text-left text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    Schedule
                                                </th>
                                                <th className="px-3 py-3 text-left text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    Package
                                                </th>
                                                <th className="px-3 py-3 text-left text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    Payment
                                                </th>
                                                <th className="px-3 py-3 text-left text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    Status
                                                </th>
                                                <th className="px-3 py-3 text-right text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    Details
                                                </th>
                                            </tr>
                                            </thead>

                                            <tbody>
                                            {displayedBookings.length > 0 ? (
                                                displayedBookings.map((item) => {
                                                    const isExpanded = expandedBookingId === item.id;
                                                    const payment = getBookingPaymentDetails(item);

                                                    return (
                                                        <Fragment key={item.id}>
                                                            <tr
                                                                className={`border-b border-[#EFE7F4] transition ${
                                                                    isExpanded ? "bg-[#F7F1FC]" : "bg-white hover:bg-[#FCFAFD]"
                                                                }`}
                                                            >
                                                                <td className="px-3 py-3 align-top">
                                                                    <div className="flex items-start gap-2.5">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setExpandedBookingId((current) =>
                                                                                    current === item.id ? null : item.id
                                                                                )
                                                                            }
                                                                            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#DDD1E8] bg-white text-[#5D4774] transition hover:bg-[#F1E9F8]"
                                                                            aria-label={
                                                                                isExpanded
                                                                                    ? "Hide booking details"
                                                                                    : "Show booking details"
                                                                            }
                                                                        >
                                                                            {isExpanded ? (
                                                                                <ChevronUp size={14} />
                                                                            ) : (
                                                                                <ChevronDown size={14} />
                                                                            )}
                                                                        </button>

                                                                        <div className="min-w-0">
                                                                            <p className="truncate font-semibold text-[#1A1220]">
                                                                                {item.customer}
                                                                            </p>
                                                                            <p className="mt-0.5 text-xs text-[#7E6B8A]">
                                                                                {item.phone || "Contact not recorded"}
                                                                            </p>
                                                                            <p className="mt-0.5 font-mono text-[10px] font-semibold text-[#887494]">
                                                                                {item.reference}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </td>

                                                                <td className="px-3 py-3 align-top">
                                                                    <p className="font-semibold text-[#1A1220]">
                                                                        {formatDate(item.eventDate)}
                                                                    </p>
                                                                    <p className="mt-0.5 text-xs text-[#7E6B8A]">
                                                                        {item.scheduleTime || `Booked ${formatDate(item.date)}`}
                                                                    </p>
                                                                </td>

                                                                <td className="px-3 py-3 align-top">
                                                                    <p className="font-semibold text-[#1A1220]">
                                                                        {item.packageName}
                                                                    </p>
                                                                    <p className="mt-0.5 text-xs text-[#7E6B8A]">
                                                                        {formatPeso(payment.packagePrice)}
                                                                    </p>
                                                                </td>

                                                                <td className="px-3 py-3 align-top">
                                                                    <StatusBadge status={payment.paymentStatus} />
                                                                    <p className="mt-1 text-xs text-[#7E6B8A]">
                                                                        Paid {formatPeso(payment.amountPaid)}
                                                                    </p>
                                                                </td>

                                                                <td className="px-3 py-3 align-top">
                                                                    <StatusBadge status={getBookingStatusLabel(item)} />
                                                                </td>

                                                                <td className="px-3 py-3 align-top text-right">
                                                                    <div className="inline-flex max-w-[180px] items-center gap-1.5 text-left text-xs text-[#6D5980]">
                                                                        <MapPin size={13} className="shrink-0" />
                                                                        <span className="truncate">
                                          {item.venue || "Venue not recorded"}
                                        </span>
                                                                    </div>
                                                                </td>
                                                            </tr>

                                                            {isExpanded && (
                                                                <tr className="border-b border-[#E6DDF0]">
                                                                    <td colSpan={6} className="p-0">
                                                                        <BookingDetailPanel booking={item} />
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </Fragment>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td
                                                        colSpan={6}
                                                        className="px-3 py-10 text-center text-sm text-[#8A7A91]"
                                                    >
                                                        No {bookingFilter} booking records found.
                                                    </td>
                                                </tr>
                                            )}
                                            </tbody>
                                        </table>
                                    </div>
                                </SectionCard>

                            </div>
                        )}

                        {selectedReport === "sales" && (
                            <div className="mt-4 space-y-4">
                                <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                    <StatCard
                                        label="POS SALES"
                                        value={formatPeso(totalSales)}
                                        helper={`${sales.length} transaction(s)`}
                                    />
                                    <StatCard
                                        label="BOOKING REVENUE"
                                        value={formatPeso(totalBookingRevenue)}
                                        helper="Excludes cancelled bookings"
                                    />
                                    <StatCard
                                        label="TOTAL REVENUE"
                                        value={formatPeso(totalSales + totalBookingRevenue)}
                                        helper="Sales plus active bookings"
                                    />
                                </section>

                                <SectionCard
                                    title="Sales Summary"
                                    subtitle="Daily transaction count, POS sales, booking revenue, and overall revenue."
                                >
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[760px] table-fixed text-sm">
                                            <thead>
                                            <tr className="border-b border-[#E6DDF0]">
                                                <th className="w-[22%] px-3 py-2 text-left text-[11px] font-medium tracking-widest text-[#806A8C]">Date</th>
                                                <th className="w-[18%] px-3 py-2 text-right text-[11px] font-medium tracking-widest text-[#806A8C]">Transactions</th>
                                                <th className="w-[20%] px-3 py-2 text-right text-[11px] font-medium tracking-widest text-[#806A8C]">POS Sales</th>
                                                <th className="w-[20%] px-3 py-2 text-right text-[11px] font-medium tracking-widest text-[#806A8C]">Booking Revenue</th>
                                                <th className="w-[20%] px-3 py-2 text-right text-[11px] font-medium tracking-widest text-[#806A8C]">Total Revenue</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {salesRows.map((item) => (
                                                <tr key={item.date} className="border-b border-[#EFE7F4] last:border-0">
                                                    <td className="px-3 py-3 font-semibold text-[#1A1220]">{formatDate(item.date)}</td>
                                                    <td className="px-3 py-3 text-right text-[#6A5D6F]">{formatNumber(item.transactionCount)}</td>
                                                    <td className="px-3 py-3 text-right font-semibold text-[#1A1220]">{formatPeso(item.posSales)}</td>
                                                    <td className="px-3 py-3 text-right font-semibold text-[#176C27]">{formatPeso(item.bookingRevenue)}</td>
                                                    <td className="px-3 py-3 text-right font-semibold text-[#2B174C]">{formatPeso(item.totalRevenue)}</td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </SectionCard>
                            </div>
                        )}

                        {selectedReport === "forecasting" && (
                            <div className="mt-4 space-y-4">
                                <SectionCard
                                    title="Forecasting Summary"
                                    subtitle="Predicted demand monitoring, recommended restocks, and risk level."
                                >
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[850px] table-fixed text-sm">
                                            <thead>
                                            <tr className="border-b border-[#E6DDF0]">
                                                <th className="w-[22%] px-3 py-2 text-left text-[11px] font-medium tracking-widest text-[#806A8C]">Product / Package</th>
                                                <th className="w-[21%] px-3 py-2 text-left text-[11px] font-medium tracking-widest text-[#806A8C]">Current</th>
                                                <th className="w-[20%] px-3 py-2 text-left text-[11px] font-medium tracking-widest text-[#806A8C]">Forecasted</th>
                                                <th className="w-[24%] px-3 py-2 text-left text-[11px] font-medium tracking-widest text-[#806A8C]">Suggested Restock</th>
                                                <th className="w-[13%] px-3 py-2 text-right text-[11px] font-medium tracking-widest text-[#806A8C]">Risk</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {forecasts.map((item) => (
                                                <tr key={item.id} className="border-b border-[#EFE7F4] last:border-0">
                                                    <td className="px-3 py-3 font-semibold text-[#1A1220]">{item.item}</td>
                                                    <td className="px-3 py-3 text-[#6A5D6F]">{item.currentValue}</td>
                                                    <td className="px-3 py-3 font-semibold text-[#1A1220]">{item.forecastedDemand}</td>
                                                    <td className="px-3 py-3 text-[#6A5D6F]">{item.suggestedRestock}</td>
                                                    <td className="px-3 py-3 text-right">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${riskClass(item.riskLevel)}`}>
                                  {item.riskLevel}
                                </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </SectionCard>

                                <SectionCard
                                    title="Seasonal Demand Analysis"
                                    subtitle="Expected trends and recommended preparation by season."
                                >
                                    <div className="space-y-2">
                                        {seasons.map((item) => (
                                            <div key={item.period} className="rounded-lg border border-[#EFE7F4] px-3 py-3">
                                                <p className="text-sm font-semibold text-[#1A1220]">{item.period}</p>
                                                <p className="mt-1 text-sm text-[#4E2C66]">{item.trend}</p>
                                                <p className="mt-1 text-xs text-[#7A6A84]">{item.recommendation}</p>
                                            </div>
                                        ))}
                                    </div>
                                </SectionCard>
                            </div>
                        )}

                        {selectedReport === "staff" && (
                            <div className="mt-4 space-y-4">
                                <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                                    <StaffModuleFilterCard
                                        label="ALL"
                                        value={formatNumber(staffActivities.length)}
                                        active={staffModuleFilter === "all"}
                                        onClick={() => setStaffModuleFilter("all")}
                                    />
                                    <StaffModuleFilterCard
                                        label="BOOKINGS"
                                        value={formatNumber(bookingStaffActions)}
                                        active={staffModuleFilter === "Bookings"}
                                        onClick={() => setStaffModuleFilter("Bookings")}
                                    />
                                    <StaffModuleFilterCard
                                        label="PACKAGES"
                                        value={formatNumber(packageStaffActions)}
                                        active={staffModuleFilter === "Packages"}
                                        onClick={() => setStaffModuleFilter("Packages")}
                                    />
                                    <StaffModuleFilterCard
                                        label="INVENTORY"
                                        value={formatNumber(inventoryStaffActions)}
                                        active={staffModuleFilter === "Inventory"}
                                        onClick={() => setStaffModuleFilter("Inventory")}
                                    />
                                    <StaffModuleFilterCard
                                        label="SALES / POS"
                                        value={formatNumber(salesPosStaffActions)}
                                        active={staffModuleFilter === "Sales / POS"}
                                        onClick={() => setStaffModuleFilter("Sales / POS")}
                                    />
                                </section>

                                <SectionCard
                                    title={staffActionListTitle}
                                    subtitle={staffActionListSubtitle}
                                >
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[980px] table-fixed text-sm">
                                            <thead>
                                            <tr className="border-b border-[#E6DDF0]">
                                                <th className="w-[16%] px-3 py-2 text-left text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    Date / Time
                                                </th>
                                                <th className="w-[17%] px-3 py-2 text-left text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    Staff
                                                </th>
                                                <th className="w-[25%] px-3 py-2 text-left text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    Current Action
                                                </th>
                                                <th className="w-[15%] px-3 py-2 text-left text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    System Module
                                                </th>
                                                <th className="w-[17%] px-3 py-2 text-left text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    Reference
                                                </th>
                                                <th className="w-[10%] px-3 py-2 text-right text-[11px] font-medium tracking-widest text-[#806A8C]">
                                                    Details
                                                </th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {displayedStaffActivities.length > 0 ? (
                                                displayedStaffActivities.map((item) => (
                                                    <tr
                                                        key={item.id}
                                                        className="border-b border-[#EFE7F4] last:border-0"
                                                    >
                                                        <td className="px-3 py-3 align-top">
                                                            <p className="font-semibold text-[#1A1220]">
                                                                {formatDate(item.date)}
                                                            </p>
                                                            <p className="mt-0.5 text-xs text-[#7E6B8A]">
                                                                {item.time || "Time not recorded"}
                                                            </p>
                                                        </td>
                                                        <td className="px-3 py-3 align-top">
                                                            <p className="font-semibold text-[#1A1220]">
                                                                {item.staffName}
                                                            </p>
                                                            <p className="mt-0.5 text-xs text-[#7E6B8A]">
                                                                {item.role}
                                                            </p>
                                                        </td>
                                                        <td className="px-3 py-3 align-top">
                                                            <p className="font-semibold text-[#1A1220]">
                                                                {item.action}
                                                            </p>
                                                            <p className="mt-0.5 text-xs text-[#7E6B8A]">
                                                                {item.details || "No additional details recorded."}
                                                            </p>
                                                        </td>
                                                        <td className="px-3 py-3 align-top">
                                                            <ActivityModuleBadge module={item.module} />
                                                        </td>
                                                        <td className="px-3 py-3 align-top font-mono text-[11px] font-semibold text-[#5F4E75]">
                                                            {item.reference || "—"}
                                                        </td>
                                                        <td className="px-3 py-3 text-right align-top text-xs text-[#6D5980]">
                                                            {item.branch}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td
                                                        colSpan={6}
                                                        className="px-3 py-10 text-center text-sm text-[#8A7A91]"
                                                    >
                                                        No staff actions were recorded for this module in the selected period.
                                                    </td>
                                                </tr>
                                            )}
                                            </tbody>
                                        </table>
                                    </div>
                                </SectionCard>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}
