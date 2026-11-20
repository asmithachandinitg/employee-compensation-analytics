
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Sidebar from "./Sidebar";

describe("Sidebar", () => {
  it("renders all navigation options", () => {
    render(
      <Sidebar activePage="dashboard" onNavigate={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Employees" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compensation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analytics" })).toBeInTheDocument();
  });

  it("highlights the active navigation item", () => {
    render(
      <Sidebar activePage="employees" onNavigate={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: "Employees" }))
      .toHaveClass("active");

    expect(screen.getByRole("button", { name: "Dashboard" }))
      .not.toHaveClass("active");
  });

  it("calls onNavigate when a navigation item is clicked", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(
      <Sidebar activePage="dashboard" onNavigate={onNavigate} />
    );

    await user.click(screen.getByRole("button", { name: "Employees" }));

    expect(onNavigate).toHaveBeenCalledWith("employees");
  });

  it("collapses the sidebar when the toggle is clicked", async () => {
    const user = userEvent.setup();

    render(
      <Sidebar activePage="dashboard" onNavigate={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(screen.getByRole("button", { name: "Expand sidebar" }))
      .toBeInTheDocument();

    expect(screen.queryByText("Peoplewise")).not.toBeInTheDocument();
    expect(screen.queryByText("WORKSPACE")).not.toBeInTheDocument();
  });

  it("expands the sidebar when the expand button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <Sidebar activePage="dashboard" onNavigate={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    await user.click(screen.getByRole("button", { name: "Expand sidebar" }));

    expect(screen.getByText("Peoplewise")).toBeInTheDocument();
    expect(screen.getByText("WORKSPACE")).toBeInTheDocument();
  });
});
