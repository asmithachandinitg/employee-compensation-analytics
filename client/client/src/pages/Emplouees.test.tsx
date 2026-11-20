import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Employees from "./Employees";
import { LoadingProvider } from "../context/LoadingContext";
import { ToastProvider } from "../context/ToastContext";
import ToastContainer from "../components/ToastContainer";

const filters = {
  departments: [
    { id: 1, name: "Engineering" },
    { id: 2, name: "Sales" },
  ],
  countries: [
    { id: 10, name: "India" },
    { id: 20, name: "United States" },
  ],
};

const makeEmployee = (overrides = {}) => ({
  id: 1,
  employeeCode: "EMP-001",
  firstName: "Asha",
  lastName: "Rao",
  email: "asha.rao@example.com",
  jobTitle: "Software Engineer",
  status: "ACTIVE",
  hireDate: "2022-03-15T12:00:00.000Z",
  department: { id: 1, name: "Engineering" },
  country: { id: 10, name: "India" },
  compensation: [
    { id: 100, baseSalary: 1500000, currency: "INR", effectiveDate: "2024-01-10T12:00:00.000Z" },
  ],
  ...overrides,
});

const makePagination = (overrides = {}) => ({
  page: 1,
  limit: 10,
  total: 1,
  totalPages: 1,
  ...overrides,
});

const okResponse = (body: unknown) => ({ ok: true, json: async () => body });
const failResponse = () => ({ ok: false, json: async () => ({}) });

type Handler = unknown | ((url: URL) => unknown);

// Routes are matched by URL pathname. A value can be a body or a function returning a response.
function mockApi(overrides: Record<string, Handler> = {}) {
  const routes: Record<string, Handler> = {
    "/api/employees/filters": okResponse({ data: filters }),
    "/api/employees": okResponse({ data: [makeEmployee()], pagination: makePagination() }),
    "/api/employees/1": okResponse({ data: makeEmployee() }),
    ...overrides,
  };

  const fetchMock = vi.fn((input: string) => {
    const url = new URL(input);
    const handler = routes[url.pathname];

    if (handler === undefined) return Promise.resolve(failResponse());
    return typeof handler === "function" ? handler(url) : Promise.resolve(handler);
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// Last request made to the employee list endpoint
const lastListUrl = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls
    .map((call) => new URL(call[0]))
    .filter((url) => url.pathname === "/api/employees")
    .at(-1)!;

function renderEmployees() {
  return render(
    <LoadingProvider>
      <ToastProvider>
        <ToastContainer />
        <Employees />
      </ToastProvider>
    </LoadingProvider>
  );
}

describe("Employees", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("listing", () => {
    it("shows the loader, then the employee table", async () => {
      mockApi();

      renderEmployees();

      expect(screen.getByText("Loading employees...")).toBeInTheDocument();
      expect(await screen.findByText("Asha Rao")).toBeInTheDocument();
      expect(screen.queryByText("Loading employees...")).not.toBeInTheDocument();
    });

    it("requests page 1 with a limit of 10 and no filters", async () => {
      const fetchMock = mockApi();

      renderEmployees();

      await screen.findByText("Asha Rao");

      const params = lastListUrl(fetchMock).searchParams;
      expect(params.get("page")).toBe("1");
      expect(params.get("limit")).toBe("10");
      expect(params.has("search")).toBe(false);
      expect(params.has("departmentId")).toBe(false);
      expect(params.has("countryId")).toBe(false);
      expect(params.has("status")).toBe(false);
    });

    it("renders an employee row", async () => {
      mockApi();

      renderEmployees();

      const row = (await screen.findByText("Asha Rao")).closest("tr") as HTMLElement;

      expect(within(row).getByText("AR")).toBeInTheDocument();
      expect(within(row).getByText("asha.rao@example.com")).toBeInTheDocument();
      expect(within(row).getByText("EMP-001")).toBeInTheDocument();
      expect(within(row).getByText("Software Engineer")).toBeInTheDocument();
      expect(within(row).getByText("Engineering")).toBeInTheDocument();
      expect(within(row).getByText("India")).toBeInTheDocument();
      expect(within(row).getByText("₹1,500,000")).toBeInTheDocument();
    });

    it("formats the ON_LEAVE status", async () => {
      mockApi({
        "/api/employees": okResponse({
          data: [makeEmployee({ status: "ON_LEAVE" })],
          pagination: makePagination(),
        }),
      });

      renderEmployees();

      const badge = await screen.findByText("ON LEAVE");
      expect(badge).toHaveClass("status-badge", "on_leave");
    });

    it("shows a dash when salary, department and country are missing", async () => {
      mockApi({
        "/api/employees": okResponse({
          data: [makeEmployee({ compensation: [], department: null, country: null })],
          pagination: makePagination(),
        }),
      });

      renderEmployees();

      const row = (await screen.findByText("Asha Rao")).closest("tr") as HTMLElement;
      expect(within(row).getAllByText("—")).toHaveLength(3);
    });

    it("shows the total employee count", async () => {
      mockApi({
        "/api/employees": okResponse({
          data: [makeEmployee()],
          pagination: makePagination({ total: 1234, totalPages: 124 }),
        }),
      });

      renderEmployees();

      await screen.findByText("Asha Rao");

      expect(screen.getByText("1,234 records")).toBeInTheDocument();
      expect(screen.getByText("Total employees").previousSibling).toHaveTextContent("1,234");
    });

    it("shows the empty state when there are no employees", async () => {
      mockApi({
        "/api/employees": okResponse({
          data: [],
          pagination: makePagination({ total: 0, totalPages: 0 }),
        }),
      });

      renderEmployees();

      expect(await screen.findByText("No employees found")).toBeInTheDocument();
      expect(screen.getByText(/Showing 0–0 of 0 employees/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
    });
  });

  describe("search and filters", () => {
    it("searches with a trimmed term", async () => {
      const user = userEvent.setup();
      const fetchMock = mockApi();

      renderEmployees();

      await screen.findByText("Asha Rao");
      await user.type(screen.getByLabelText("Search employees"), "  asha ");

      await waitFor(() => expect(lastListUrl(fetchMock).searchParams.get("search")).toBe("asha"));
    });

    it("loads dropdown options from the filters endpoint", async () => {
      const user = userEvent.setup();
      mockApi();

      renderEmployees();

      await screen.findByText("Asha Rao");
      await user.click(screen.getByRole("button", { name: "Filter by department" }));

      const options = within(screen.getByRole("listbox")).getAllByRole("option");
      expect(options.map((option) => option.textContent)).toEqual([
        "All departments✓",
        "Engineering",
        "Sales",
      ]);
    });

    it("filters by department", async () => {
      const user = userEvent.setup();
      const fetchMock = mockApi();

      renderEmployees();

      await screen.findByText("Asha Rao");
      await user.click(screen.getByRole("button", { name: "Filter by department" }));
      await user.click(screen.getByRole("option", { name: "Sales" }));

      await waitFor(() =>
        expect(lastListUrl(fetchMock).searchParams.get("departmentId")).toBe("2")
      );
      expect(screen.getByRole("button", { name: "Filter by department" })).toHaveTextContent("Sales");
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("filters by country and status", async () => {
      const user = userEvent.setup();
      const fetchMock = mockApi();

      renderEmployees();

      await screen.findByText("Asha Rao");
      await user.click(screen.getByRole("button", { name: "Filter by country" }));
      await user.click(screen.getByRole("option", { name: "United States" }));
      await user.click(screen.getByRole("button", { name: "Filter by status" }));
      await user.click(screen.getByRole("option", { name: "On leave" }));

      await waitFor(() => {
        const params = lastListUrl(fetchMock).searchParams;
        expect(params.get("countryId")).toBe("20");
        expect(params.get("status")).toBe("ON_LEAVE");
      });
    });

    it("clears all filters", async () => {
      const user = userEvent.setup();
      const fetchMock = mockApi();

      renderEmployees();

      await screen.findByText("Asha Rao");

      const clearButton = screen.getByRole("button", { name: /^Clear$/ });
      expect(clearButton).toBeDisabled();

      await user.type(screen.getByLabelText("Search employees"), "asha");
      expect(clearButton).toBeEnabled();
      expect(screen.getByText("Filtered results")).toBeInTheDocument();

      await user.click(clearButton);

      expect(screen.getByLabelText("Search employees")).toHaveValue("");
      expect(clearButton).toBeDisabled();
      await waitFor(() => expect(lastListUrl(fetchMock).searchParams.has("search")).toBe(false));
    });

    it("offers to clear filters from the empty state", async () => {
      const user = userEvent.setup();
      mockApi({
        "/api/employees": okResponse({
          data: [],
          pagination: makePagination({ total: 0, totalPages: 0 }),
        }),
      });

      renderEmployees();

      await screen.findByText("No employees found");
      await user.type(screen.getByLabelText("Search employees"), "zzz");
      await user.click(await screen.findByRole("button", { name: "Clear filters" }));

      expect(screen.getByLabelText("Search employees")).toHaveValue("");
    });

    it("shows a toast when the filter options fail to load", async () => {
      mockApi({ "/api/employees/filters": failResponse() });

      renderEmployees();

      expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load employee filters");
    });
  });

  describe("filter dropdown", () => {
    it("selects an option with the keyboard", async () => {
      const user = userEvent.setup();
      const fetchMock = mockApi();

      renderEmployees();

      await screen.findByText("Asha Rao");

      const trigger = screen.getByRole("button", { name: "Filter by department" });
      trigger.focus();

      await user.keyboard("{ArrowDown}");
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

      await waitFor(() =>
        expect(lastListUrl(fetchMock).searchParams.get("departmentId")).toBe("2")
      );
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it("wraps with ArrowUp and supports Home and End", async () => {
      const user = userEvent.setup();
      mockApi();

      renderEmployees();

      await screen.findByText("Asha Rao");

      screen.getByRole("button", { name: "Filter by department" }).focus();
      await user.keyboard("{ArrowDown}{ArrowUp}");
      expect(screen.getByRole("option", { name: "Sales" })).toHaveClass("is-active");

      await user.keyboard("{Home}");
      expect(screen.getByRole("option", { name: /All departments/ })).toHaveClass("is-active");

      await user.keyboard("{End}");
      expect(screen.getByRole("option", { name: "Sales" })).toHaveClass("is-active");
    });

    it("closes on Escape and returns focus to the trigger", async () => {
      const user = userEvent.setup();
      mockApi();

      renderEmployees();

      await screen.findByText("Asha Rao");

      const trigger = screen.getByRole("button", { name: "Filter by status" });
      await user.click(trigger);
      await user.keyboard("{Escape}");

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it("closes when clicking outside", async () => {
      const user = userEvent.setup();
      mockApi();

      renderEmployees();

      await screen.findByText("Asha Rao");
      await user.click(screen.getByRole("button", { name: "Filter by status" }));
      await user.click(screen.getByRole("heading", { name: "Employees" }));

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  describe("pagination", () => {
    // Returns one employee per page so we can see which page was loaded
    const pagedList = (url: URL) => {
      const page = Number(url.searchParams.get("page") ?? 1);

      return Promise.resolve(
        okResponse({
          data: [makeEmployee({ id: page, firstName: `Page${page}`, lastName: "User" })],
          pagination: makePagination({ page, total: 25, totalPages: 3 }),
        })
      );
    };

    it("shows the range and disables Previous on the first page", async () => {
      mockApi({ "/api/employees": pagedList });

      renderEmployees();

      await screen.findByText("Page1 User");

      expect(screen.getByText(/Showing 1–1 of 25 employees/)).toBeInTheDocument();
      expect(screen.getByText("of 3")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
    });

    it("goes to the next and previous page", async () => {
      const user = userEvent.setup();
      const fetchMock = mockApi({ "/api/employees": pagedList });

      renderEmployees();

      await screen.findByText("Page1 User");

      await user.click(screen.getByRole("button", { name: "Next page" }));
      expect(await screen.findByText("Page2 User")).toBeInTheDocument();
      expect(lastListUrl(fetchMock).searchParams.get("page")).toBe("2");

      await user.click(screen.getByRole("button", { name: "Previous page" }));
      expect(await screen.findByText("Page1 User")).toBeInTheDocument();
    });

    it("disables Next on the last page", async () => {
      const user = userEvent.setup();
      mockApi({ "/api/employees": pagedList });

      renderEmployees();

      await screen.findByText("Page1 User");
      await user.click(screen.getByRole("button", { name: "Next page" }));
      await screen.findByText("Page2 User");
      await user.click(screen.getByRole("button", { name: "Next page" }));
      await screen.findByText("Page3 User");

      expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    });

    it("jumps to a page with the Go button", async () => {
      const user = userEvent.setup();
      mockApi({ "/api/employees": pagedList });

      renderEmployees();

      await screen.findByText("Page1 User");

      const input = screen.getByLabelText("Enter page number");
      await user.clear(input);
      await user.type(input, "3");
      await user.click(screen.getByRole("button", { name: "Go" }));

      expect(await screen.findByText("Page3 User")).toBeInTheDocument();
    });

    it("jumps to a page by pressing Enter", async () => {
      const user = userEvent.setup();
      mockApi({ "/api/employees": pagedList });

      renderEmployees();

      await screen.findByText("Page1 User");

      const input = screen.getByLabelText("Enter page number");
      await user.clear(input);
      await user.type(input, "2{Enter}");

      expect(await screen.findByText("Page2 User")).toBeInTheDocument();
    });

    it.each(["0", "4", "1.5", ""])("rejects the invalid page %j", async (value) => {
      const user = userEvent.setup();
      const fetchMock = mockApi({ "/api/employees": pagedList });

      renderEmployees();

      await screen.findByText("Page1 User");
      const callsBefore = fetchMock.mock.calls.length;

      const input = screen.getByLabelText("Enter page number");
      await user.clear(input);
      if (value) await user.type(input, value);
      await user.click(screen.getByRole("button", { name: "Go" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Enter a page number between 1 and 3"
      );
      expect(fetchMock.mock.calls.length).toBe(callsBefore);
    });

    it("goes back to page 1 when a filter changes", async () => {
      const user = userEvent.setup();
      const fetchMock = mockApi({ "/api/employees": pagedList });

      renderEmployees();

      await screen.findByText("Page1 User");
      await user.click(screen.getByRole("button", { name: "Next page" }));
      await screen.findByText("Page2 User");

      await user.click(screen.getByRole("button", { name: "Filter by status" }));
      await user.click(screen.getByRole("option", { name: "Active" }));

      await waitFor(() => {
        const params = lastListUrl(fetchMock).searchParams;
        expect(params.get("status")).toBe("ACTIVE");
        expect(params.get("page")).toBe("1");
      });
    });
  });

  describe("errors", () => {
    it("shows an error with a Try again button that reloads the list", async () => {
      const user = userEvent.setup();
      let shouldFail = true;

      mockApi({
        "/api/employees": () =>
          Promise.resolve(
            shouldFail
              ? failResponse()
              : okResponse({ data: [makeEmployee()], pagination: makePagination() })
          ),
      });

      renderEmployees();

      const alerts = await screen.findAllByRole("alert");
      expect(alerts.some((alert) => alert.textContent?.includes("Failed to load employees"))).toBe(true);

      shouldFail = false;
      await user.click(screen.getByRole("button", { name: "Try again" }));

      expect(await screen.findByText("Asha Rao")).toBeInTheDocument();
      expect(document.querySelector(".employee-error")).not.toBeInTheDocument();
    });

    it("shows network errors", async () => {
      mockApi({ "/api/employees": () => Promise.reject(new Error("Network down")) });

      renderEmployees();

      await waitFor(() =>
        expect(document.querySelector(".employee-error")).toHaveTextContent("Network down")
      );
    });
  });

  describe("employee profile dialog", () => {
    async function openProfile(overrides: Record<string, Handler> = {}) {
      const user = userEvent.setup();
      const fetchMock = mockApi(overrides);

      renderEmployees();

      await user.click(await screen.findByRole("button", { name: "View Asha Rao" }));
      const dialog = await screen.findByRole("dialog");

      return { user, dialog, fetchMock };
    }

    it("loads and shows the employee profile", async () => {
      const { dialog, fetchMock } = await openProfile();

      const urls = fetchMock.mock.calls.map((call) => call[0]);
      expect(urls).toContain("http://localhost:5000/api/employees/1");

      expect(dialog).toHaveAccessibleName("Asha Rao");
      expect(within(dialog).getByText("AR")).toBeInTheDocument();
      expect(within(dialog).getByText("asha.rao@example.com")).toBeInTheDocument();
      expect(within(dialog).getByText("Software Engineer")).toBeInTheDocument();
      expect(within(dialog).getByText("Engineering")).toBeInTheDocument();
      expect(within(dialog).getByText("India")).toBeInTheDocument();
    });

    it("shows the formatted hire date", async () => {
      const { dialog } = await openProfile();

      expect(within(dialog).getByText("Hire date")).toBeInTheDocument();
      expect(within(dialog).getByText(/Mar 15, 2022/)).toBeInTheDocument();
    });

    it("hides the hire date when there is none", async () => {
      const { dialog } = await openProfile({
        "/api/employees/1": okResponse({ data: makeEmployee({ hireDate: undefined }) }),
      });

      expect(within(dialog).queryByText("Hire date")).not.toBeInTheDocument();
    });

    it("lists the compensation history", async () => {
      const { dialog } = await openProfile({
        "/api/employees/1": okResponse({
          data: makeEmployee({
            compensation: [
              { id: 1, baseSalary: 2000000, currency: "INR", effectiveDate: "2024-06-01T12:00:00.000Z" },
              { id: 2, baseSalary: 1500000, currency: "INR", effectiveDate: "2023-01-01T12:00:00.000Z" },
            ],
          }),
        }),
      });

      expect(within(dialog).getByText("2 records")).toBeInTheDocument();
      expect(within(dialog).getByText("₹2,000,000")).toBeInTheDocument();
      expect(within(dialog).getByText("₹1,500,000")).toBeInTheDocument();
      expect(within(dialog).getByText(/Effective Jun 1, 2024/)).toBeInTheDocument();
    });

    it("shows a message when there is no compensation history", async () => {
      const { dialog } = await openProfile({
        "/api/employees/1": okResponse({ data: makeEmployee({ compensation: [] }) }),
      });

      expect(within(dialog).getByText("No compensation history available.")).toBeInTheDocument();
      expect(within(dialog).getByText("0 records")).toBeInTheDocument();
    });

    it("closes with the X button", async () => {
      const { user } = await openProfile();

      await user.click(screen.getByRole("button", { name: "Close employee details" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes with the footer Close button", async () => {
      const { user, dialog } = await openProfile();

      await user.click(within(dialog).getByRole("button", { name: "Close" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes with Escape", async () => {
      const { user } = await openProfile();

      await user.keyboard("{Escape}");

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes when the backdrop is clicked but not when the dialog is clicked", async () => {
      const { user, dialog } = await openProfile();

      await user.click(within(dialog).getByText("EMPLOYEE PROFILE"));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      fireEvent.click(document.querySelector(".employee-modal-backdrop") as HTMLElement);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("shows a toast and no dialog when the profile fails to load", async () => {
      const user = userEvent.setup();
      mockApi({ "/api/employees/1": failResponse() });

      renderEmployees();

      await user.click(await screen.findByRole("button", { name: "View Asha Rao" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load employee details");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});