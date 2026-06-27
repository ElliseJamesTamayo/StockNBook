import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FORECASTING_LAMBDA_URL =
    process.env.FORECASTING_LAMBDA_URL ||
    "https://your-lambda-function-url.lambda-url.region.on.aws";

/**
 * Proxy handler for the forecasting Lambda function.
 * The UI uses get_seasonal_analysis; the deployed Lambda uses
 * get_seasonal_forecast, so this route translates only that action.
 */
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get("Authorization");

        if (!authHeader) {
            return NextResponse.json(
                { error: "Missing Authorization header" },
                { status: 401 }
            );
        }

        let body: { action?: string; [key: string]: unknown };
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Invalid JSON in request body" },
                { status: 400 }
            );
        }

        const validActions = [
            "get_inventory_forecast",
            "get_booking_forecast",
            "get_seasonal_analysis",
            "get_forecast_report",
        ];

        if (!body.action || !validActions.includes(body.action)) {
            return NextResponse.json(
                { error: "Invalid or missing action", validActions },
                { status: 400 }
            );
        }

        if (
            !process.env.FORECASTING_LAMBDA_URL ||
            FORECASTING_LAMBDA_URL.includes("your-lambda-function-url")
        ) {
            return NextResponse.json(
                { error: "FORECASTING_LAMBDA_URL is not configured." },
                { status: 500 }
            );
        }

        const lambdaAction =
            body.action === "get_seasonal_analysis"
                ? "get_seasonal_forecast"
                : body.action;

        const lambdaResponse = await fetch(FORECASTING_LAMBDA_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
            },
            body: JSON.stringify({ ...body, action: lambdaAction }),
            cache: "no-store",
        });

        const rawResponse = await lambdaResponse.text();
        let lambdaData: unknown;
        try {
            lambdaData = rawResponse ? JSON.parse(rawResponse) : {};
        } catch {
            lambdaData = { error: rawResponse || "Invalid response from forecasting Lambda." };
        }

        return NextResponse.json(lambdaData, {
            status: lambdaResponse.status,
        });
    } catch (error) {
        console.error("Forecasting API error:", error);

        return NextResponse.json(
            {
                error: "Internal server error",
                details:
                    error instanceof Error ? error.message : "Unknown error occurred",
            },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
}
