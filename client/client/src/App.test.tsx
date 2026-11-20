
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

// Mock page components so these tests focus on App navigation.
vi.mock("./pages/Dashboard", () => ({
  default: () => <div>Dashboard Page</div>,
}));

vi.mock("./pages/Employees", () => ({
  default: () => <div>Employees Page</div>,
}));

vi.mock("./pages/Compensation", () => ({
  default: () => <div>Compensation Page</div>,
}));

vi.mock("./pages/Analytics", () => ({
  default: () => <div>Analytics Page</div>,
}));

vi.mock("./components/Sidebar", () => ({
  default: ({ onNavigate }: { onNavigate: (page: string) => void }) => (
    <nav>
      <button onClick={() => onNavigate("dashboard")}>Dashboard</button>
      <button onClick={() => onNavigate("employees")}>Employees</button>
      <button onClick={() => onNavigate("compensation")}>Compensation</button>
      <button onClick={() => onNavigate("analytics")}>Analytics</button>
    </nav>
  ),
}));

vi.mock("./components/GlobalLoadingBar", () => ({
  default: () => null,
}));

vi.mock("./components/ToastContainer", () => ({
  default: () => null,
}));

describe("App", () => {
  it("renders Dashboard by default", () => {
    render(<App />);

    expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
  });

  it("navigates to Employees page", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Employees" }));

    expect(screen.getByText("Employees Page")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard Page")).not.toBeInTheDocument();
  });

  it("navigates to Compensation page", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Compensation" }));

    expect(screen.getByText("Compensation Page")).toBeInTheDocument();
  });

  it("navigates to Analytics page", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Analytics" }));

    expect(screen.getByText("Analytics Page")).toBeInTheDocument();
  });
});
