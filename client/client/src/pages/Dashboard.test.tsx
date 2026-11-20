import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import Dashboard from "./Dashboard";
import { LoadingProvider } from "../context/LoadingContext";
import { ToastProvider } from "../context/ToastContext";
import ToastContainer from "../components/ToastContainer";

const summary = {
    totalEmployees: 1200,
    activeEmployees: 1100,
    departmentCount: 8,
    countryCount: 5,
    payrollByCurrency: [
        { currency: "USD", totalPayroll: 5000000, averageSalary: 85000 },
        { currency: "INR", totalPayroll: 90000000, averageSalary: 1200000 },
    ],
};

const analytics = {
    departmentAnalytics: [
        { department: "Engineering", employeeCount: 300, payrollByCurrency: [] },
        { department: "Sales", employeeCount: 120, payrollByCurrency: [] },
    ],
    countryAnalytics: [
        { country: "India", currency: "INR", employeeCount: 700, totalPayroll: 1, averageSalary: 1 },
        { country: "United States", currency: "USD", employeeCount: 500, totalPayroll: 1, averageSalary: 1 },
    ],
};

const okResponse = (data: unknown) => ({ ok: true, json: async () => ({ data }) });
const failResponse = () => ({ ok: false, json: async () => ({}) });

function mockApi(summaryRes: unknown, analyticsRes: unknown) {
    const fetchMock = vi.fn((url: string) =>
        Promise.resolve(url.includes("/dashboard/summary") ? summaryRes : analyticsRes)
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

function renderDashboard() {
    return render(
        <LoadingProvider>
            <ToastProvider>
                <ToastContainer />
                <Dashboard />
            </ToastProvider>
        </LoadingProvider>
    );
}

describe("Dashboard", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("shows the loader while data is loading", () => {
        vi.stubGlobal("fetch", vi.fn(() => new Promise(() => { })));

        renderDashboard();

        expect(screen.getByText("Loading your dashboard...")).toBeInTheDocument();
    });

    it("fetches summary and analytics data", async () => {
        const fetchMock = mockApi(okResponse(summary), okResponse(analytics));

        renderDashboard();

        await screen.findByRole("heading", { name: "Dashboard" });

        const urls = fetchMock.mock.calls.map((call) => call[0]);
        expect(urls).toContain("http://localhost:5000/api/dashboard/summary");
        expect(urls).toContain("http://localhost:5000/api/dashboard/analytics");
    });

    it("renders the dashboard header", async () => {
        mockApi(okResponse(summary), okResponse(analytics));

        renderDashboard();

        expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
        expect(screen.getByText("HR Manager")).toBeInTheDocument();
        expect(screen.getByText("Administrator")).toBeInTheDocument();
    });

    it("renders the stat cards with formatted values", async () => {
        mockApi(okResponse(summary), okResponse(analytics));

        renderDashboard();

        await screen.findByText("Total Employees");

        const statCard = (title: string) =>
            screen.getByText(title).closest(".stat-card") as HTMLElement;

        expect(within(statCard("Total Employees")).getByText("1,200")).toBeInTheDocument();
        expect(within(statCard("Active Employees")).getByText("1,100")).toBeInTheDocument();
        expect(within(statCard("Departments")).getByText("8")).toBeInTheDocument();
        expect(within(statCard("Countries")).getByText("5")).toBeInTheDocument();
    });

    it("renders payroll totals and averages for each currency", async () => {
        mockApi(okResponse(summary), okResponse(analytics));

        renderDashboard();

        await screen.findByText("Payroll Overview");

        expect(screen.getByText("$5,000,000")).toBeInTheDocument();
        expect(screen.getByText("Average: $85,000")).toBeInTheDocument();
        expect(screen.getByText("₹90,000,000")).toBeInTheDocument();
        expect(screen.getByText("Average: ₹1,200,000")).toBeInTheDocument();
    });

    it("renders department overview with bar widths based on total employees", async () => {
        mockApi(okResponse(summary), okResponse(analytics));

        renderDashboard();

        await screen.findByText("Department Overview");

        const rows = document.querySelectorAll(".bar-row");
        expect(rows).toHaveLength(2);

        expect(within(rows[0] as HTMLElement).getByText("Engineering")).toBeInTheDocument();
        expect(within(rows[0] as HTMLElement).getByText("300")).toBeInTheDocument();
        expect((rows[0].querySelector(".bar-fill") as HTMLElement).style.width).toBe("25%");
        expect((rows[1].querySelector(".bar-fill") as HTMLElement).style.width).toBe("10%");
    });

    it("does not divide by zero when there are no employees", async () => {
        mockApi(
            okResponse({ ...summary, totalEmployees: 0 }),
            okResponse({
                ...analytics,
                departmentAnalytics: [{ department: "Ops", employeeCount: 0, payrollByCurrency: [] }],
            })
        );

        renderDashboard();

        await screen.findByText("Department Overview");

        expect((document.querySelector(".bar-fill") as HTMLElement).style.width).toBe("0%");
    });

    it("renders country overview with currency and employee count", async () => {
        mockApi(okResponse(summary), okResponse(analytics));

        renderDashboard();

        await screen.findByText("Country Overview");

        const rows = document.querySelectorAll(".country-row");
        expect(rows).toHaveLength(2);

        expect(within(rows[0] as HTMLElement).getByText("India")).toBeInTheDocument();
        expect(within(rows[0] as HTMLElement).getByText("INR")).toBeInTheDocument();
        expect(within(rows[0] as HTMLElement).getByText("700 employees")).toBeInTheDocument();

        expect(within(rows[1] as HTMLElement).getByText("United States")).toBeInTheDocument();
        expect(within(rows[1] as HTMLElement).getByText("USD")).toBeInTheDocument();
        expect(within(rows[1] as HTMLElement).getByText("500 employees")).toBeInTheDocument();
    });

    it("shows an error message and toast when an API call fails", async () => {
        mockApi(failResponse(), okResponse(analytics));

        renderDashboard();

        await waitFor(() =>
            expect(document.querySelector(".error")).toHaveTextContent("Unable to load dashboard data")
        );
        expect(screen.getByRole("alert")).toHaveTextContent("Unable to load dashboard data");
        expect(screen.queryByText("Total Employees")).not.toBeInTheDocument();
    });

    it("shows the error when the network request fails", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Failed to fetch")));

        renderDashboard();

        await waitFor(() =>
            expect(document.querySelector(".error")).toHaveTextContent("Failed to fetch")
        );
    });

    it("shows a fallback message when the API returns no data", async () => {
        mockApi(okResponse(null), okResponse(null));

        renderDashboard();

        await waitFor(() =>
            expect(document.querySelector(".error")).toHaveTextContent("Dashboard data unavailable")
        );
    });
});