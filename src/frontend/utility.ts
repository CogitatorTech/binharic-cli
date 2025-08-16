interface ApiResponse {
    status: string;

    // Allows for other properties without defining them
    [key: string]: unknown;
}

export function createStatusMessage(apiResponse: ApiResponse | null | undefined): string {
    if (!apiResponse?.status || typeof apiResponse.status !== "string") {
        return "Invalid data";
    }
    return `Server status is currently: ${apiResponse.status.toUpperCase()}`;
}
