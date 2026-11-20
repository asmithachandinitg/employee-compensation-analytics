
import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  FiSearch,
  FiFilter,
  FiEye,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiMail,
  FiBriefcase,
  FiMapPin,
  FiHash,
  FiUsers,
  FiDollarSign,
  FiCalendar,
  FiRefreshCw,
} from "react-icons/fi";

import { useLoading } from "../context/LoadingContext";
import { useToast } from "../context/ToastContext";
import PageLoader from "../components/PageLoader";
import "./Employees.css";

const API = "http://localhost:5000/api";

interface Department {
  id: number;
  name: string;
}

interface Country {
  id: number;
  name: string;
}

interface Compensation {
  id: number;
  baseSalary: number;
  currency: string;
  effectiveDate: string;
}

interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  status: "ACTIVE" | "ON_LEAVE" | "INACTIVE";
  hireDate?: string;
  department: Department;
  country: Country;
  compensation: Compensation[];
}

interface EmployeeFilters {
  departments: Department[];
  countries: Country[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}


interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
}

function FilterDropdown({
  value,
  options,
  onChange,
  ariaLabel,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const selectedOption = options[selectedIndex];

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const chooseOption = (option: FilterOption) => {
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();

      if (!open) {
        setOpen(true);
        setActiveIndex(selectedIndex);
        return;
      }

      setActiveIndex((current) =>
        event.key === "ArrowDown"
          ? (current + 1) % options.length
          : (current - 1 + options.length) % options.length
      );
      return;
    }

    if (event.key === "Home" && open) {
      event.preventDefault();
      setActiveIndex(0);
    }

    if (event.key === "End" && open) {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    }

    if (event.key === "Enter" && open) {
      event.preventDefault();
      chooseOption(options[activeIndex]);
    }
  };

  return (
    <div
      className="employee-filter-dropdown"
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`employee-filter-trigger${open ? " is-open" : ""}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setActiveIndex(selectedIndex);
          setOpen((current) => !current);
        }}
      >
        <span className="employee-filter-value">{selectedOption?.label}</span>
        <FiChevronDown />
      </button>

      {open && (
        <div className="employee-filter-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => {
            const selected = option.value === value;
            const active = index === activeIndex;

            return (
              <button
                key={option.value || "all"}
                type="button"
                role="option"
                aria-selected={selected}
                className={`employee-filter-option${selected ? " is-selected" : ""}${active ? " is-active" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => chooseOption(option)}
              >
                <span>{option.label}</span>
                {selected && <span className="employee-filter-check">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Employees() {
  const { apiFetch } = useLoading();
  const { showToast } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filters, setFilters] = useState<EmployeeFilters>({
    departments: [],
    countries: [],
  });

  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [countryId, setCountryId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [selectedEmployee, setSelectedEmployee] =
    useState<Employee | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFilters = useCallback(async () => {
    try {
      const response = await apiFetch(`${API}/employees/filters`);

      if (!response.ok) {
        throw new Error("Failed to load employee filters");
      }

      const result = await response.json();
      setFilters(result.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load filters";

      showToast(message, "error");
    }
  }, [apiFetch, showToast]);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });

      if (search.trim()) params.set("search", search.trim());
      if (departmentId) params.set("departmentId", departmentId);
      if (countryId) params.set("countryId", countryId);
      if (status) params.set("status", status);

      const response = await apiFetch(
        `${API}/employees?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to load employees");
      }

      const result = await response.json();

      setEmployees(result.data);
      setPagination(result.pagination);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load employees";

      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [
    page,
    search,
    departmentId,
    countryId,
    status,
    apiFetch,
    showToast,
  ]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    setPage(1);
  }, [search, departmentId, countryId, status]);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedEmployee(null);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const viewEmployee = async (id: number) => {
    try {
      const response = await apiFetch(`${API}/employees/${id}`);

      if (!response.ok) {
        throw new Error("Unable to load employee details");
      }

      const result = await response.json();
      setSelectedEmployee(result.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load employee";

      showToast(message, "error");
    }
  };

  const formatSalary = (salary: number, currency: string) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(salary);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const closeDetails = () => setSelectedEmployee(null);

  const clearFilters = () => {
    setSearch("");
    setDepartmentId("");
    setCountryId("");
    setStatus("");
    setPage(1);
  };

  const handlePageJump = () => {
    const targetPage = Number(pageInput);
    const lastPage = pagination.totalPages;

    if (
      !Number.isInteger(targetPage) ||
      targetPage < 1 ||
      targetPage > lastPage
    ) {
      showToast(
        `Enter a page number between 1 and ${Math.max(lastPage, 1)}`,
        "error"
      );
      return;
    }

    setPage(targetPage);
  };

  const hasActiveFilters =
    Boolean(search || departmentId || countryId || status);

  const initials = selectedEmployee
    ? `${selectedEmployee.firstName.charAt(0)}${selectedEmployee.lastName.charAt(0)}`.toUpperCase()
    : "";

  return (
    <main className="main employees-page">
      {/* Page header */}
      <header className="employees-header">
        <div className="employees-heading">
          <span className="eyebrow">WORKFORCE MANAGEMENT</span>
          <h1>Employees</h1>
          <p>Manage and view your employee directory</p>
        </div>

        <div className="employee-count">
          <div className="employee-count-icon">
            <FiUsers />
          </div>
          <div>
            <strong>{pagination.total.toLocaleString()}</strong>
            <span>Total employees</span>
          </div>
        </div>
      </header>

      {/* Filters */}
      <section className="employee-toolbar">
        <div className="employee-search">
          <FiSearch />
          <input
            type="search"
            placeholder="Search name, email, employee ID or job title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search employees"
          />
        </div>

        <div className="employee-filter">
          <FiBriefcase />
          <FilterDropdown
            value={departmentId}
            onChange={setDepartmentId}
            ariaLabel="Filter by department"
            options={[
              { value: "", label: "All departments" },
              ...filters.departments.map((department) => ({
                value: String(department.id),
                label: department.name,
              })),
            ]}
          />
        </div>

        <div className="employee-filter">
          <FiMapPin />
          <FilterDropdown
            value={countryId}
            onChange={setCountryId}
            ariaLabel="Filter by country"
            options={[
              { value: "", label: "All countries" },
              ...filters.countries.map((country) => ({
                value: String(country.id),
                label: country.name,
              })),
            ]}
          />
        </div>

        <div className="employee-filter">
          <FiFilter />
          <FilterDropdown
            value={status}
            onChange={setStatus}
            ariaLabel="Filter by status"
            options={[
              { value: "", label: "All statuses" },
              { value: "ACTIVE", label: "Active" },
              { value: "ON_LEAVE", label: "On leave" },
              { value: "INACTIVE", label: "Inactive" },
            ]}
          />
        </div>

        <button
          type="button"
          className="clear-filters"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
        >
          <FiRefreshCw />
          Clear
        </button>
      </section>

      {/* Active filter indicator */}
      {hasActiveFilters && (
        <div className="employee-filter-summary">
          <span>Filtered results</span>
          <button type="button" onClick={clearFilters}>
            Clear all <FiX />
          </button>
        </div>
      )}

      {error && (
        <div className="employee-error" role="alert">
          {error}
          <button type="button" onClick={fetchEmployees}>
            Try again
          </button>
        </div>
      )}

      {/* Employee table */}
      <section className="employee-table-container">
        <div className="employee-table-heading">
          <div>
            <h2>Employee Directory</h2>
            <p>Employee information and current compensation</p>
          </div>

          <span className="employee-record-count">
            {pagination.total.toLocaleString()} records
          </span>
        </div>

        {loading ? (
          <div className="employee-loader-area">
            <PageLoader message="Loading employees..." />
          </div>
        ) : (
          <div className="employee-table-scroll">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Employee ID</th>
                  <th>Job Title</th>
                  <th>Department</th>
                  <th>Country</th>
                  <th>Status</th>
                  <th>Salary</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="employee-empty-state">
                      <div className="employee-empty-icon">
                        <FiUsers />
                      </div>
                      <strong>No employees found</strong>
                      <span>
                        Try changing your search or filter criteria.
                      </span>
                      {hasActiveFilters && (
                        <button type="button" onClick={clearFilters}>
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => {
                    const compensation = employee.compensation?.[0];

                    return (
                      <tr key={employee.id}>
                        <td>
                          <div className="employee-name-cell">
                            <div className="employee-avatar">
                              {employee.firstName.charAt(0)}
                              {employee.lastName.charAt(0)}
                            </div>
                            <div className="employee-name-info">
                              <strong>
                                {employee.firstName} {employee.lastName}
                              </strong>
                              <small>{employee.email}</small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="employee-code">
                            {employee.employeeCode}
                          </span>
                        </td>

                        <td>{employee.jobTitle}</td>
                        <td>{employee.department?.name ?? "—"}</td>
                        <td>{employee.country?.name ?? "—"}</td>

                        <td>
                          <span
                            className={`status-badge ${employee.status.toLowerCase()}`}
                          >
                            <span className="status-dot" />
                            {employee.status.replace("_", " ")}
                          </span>
                        </td>

                        <td className="employee-salary">
                          {compensation
                            ? formatSalary(
                                compensation.baseSalary,
                                compensation.currency
                              )
                            : "—"}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="view-employee"
                            onClick={() => viewEmployee(employee.id)}
                            aria-label={`View ${employee.firstName} ${employee.lastName}`}
                          >
                            <FiEye />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Pagination */}
      <div className="employee-pagination">
        <span>
          Showing{" "}
          {employees.length ? (page - 1) * 10 + 1 : 0}–
          {(page - 1) * 10 + employees.length} of{" "}
          {pagination.total.toLocaleString()} employees
        </span>

        <div className="employee-pagination-controls">
          <button
            type="button"
            aria-label="Previous page"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => current - 1)}
          >
            <FiChevronLeft />
            Previous
          </button>

          <div className="employee-page-jump">
            <span>Page</span>
            <input
              type="number"
              min={1}
              max={pagination.totalPages}
              value={pageInput}
              onChange={(event) => setPageInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handlePageJump();
                }
              }}
              aria-label="Enter page number"
            />
            <span>of {Math.max(pagination.totalPages, 1)}</span>
            <button
              type="button"
              onClick={handlePageJump}
              disabled={loading || pagination.totalPages === 0}
            >
              Go
            </button>
          </div>

          <button
            type="button"
            aria-label="Next page"
            disabled={page >= pagination.totalPages || loading}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
            <FiChevronRight />
          </button>
        </div>
      </div>

      {/* Employee profile dialog */}
      {selectedEmployee && (
        <div
          className="employee-modal-backdrop"
          onClick={closeDetails}
        >
          <section
            className="employee-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="employee-modal-header">
              <div className="employee-profile-heading">
                <div className="employee-profile-avatar">
                  {initials}
                </div>

                <div>
                  <span className="eyebrow">EMPLOYEE PROFILE</span>
                  <h2 id="employee-modal-title">
                    {selectedEmployee.firstName}{" "}
                    {selectedEmployee.lastName}
                  </h2>
                  <p>{selectedEmployee.employeeCode}</p>
                </div>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeDetails}
                aria-label="Close employee details"
              >
                <FiX />
              </button>
            </div>

            <div className="employee-modal-body">
              <div className="employee-profile-status">
                <span
                  className={`status-badge ${selectedEmployee.status.toLowerCase()}`}
                >
                  <span className="status-dot" />
                  {selectedEmployee.status.replace("_", " ")}
                </span>
                <span className="employee-profile-label">
                  Employee information
                </span>
              </div>

              <div className="employee-details-grid">
                <div className="employee-detail-card">
                  <span className="employee-detail-icon">
                    <FiMail />
                  </span>
                  <div>
                    <span>Email address</span>
                    <strong>{selectedEmployee.email}</strong>
                  </div>
                </div>

                <div className="employee-detail-card">
                  <span className="employee-detail-icon">
                    <FiBriefcase />
                  </span>
                  <div>
                    <span>Job title</span>
                    <strong>{selectedEmployee.jobTitle}</strong>
                  </div>
                </div>

                <div className="employee-detail-card">
                  <span className="employee-detail-icon">
                    <FiUsers />
                  </span>
                  <div>
                    <span>Department</span>
                    <strong>
                      {selectedEmployee.department?.name ?? "—"}
                    </strong>
                  </div>
                </div>

                <div className="employee-detail-card">
                  <span className="employee-detail-icon">
                    <FiMapPin />
                  </span>
                  <div>
                    <span>Country</span>
                    <strong>
                      {selectedEmployee.country?.name ?? "—"}
                    </strong>
                  </div>
                </div>

                <div className="employee-detail-card">
                  <span className="employee-detail-icon">
                    <FiHash />
                  </span>
                  <div>
                    <span>Employee ID</span>
                    <strong>{selectedEmployee.employeeCode}</strong>
                  </div>
                </div>

                {selectedEmployee.hireDate && (
                  <div className="employee-detail-card">
                    <span className="employee-detail-icon">
                      <FiCalendar />
                    </span>
                    <div>
                      <span>Hire date</span>
                      <strong>{formatDate(selectedEmployee.hireDate)}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="employee-modal-section-heading">
                <div>
                  <h3>Compensation History</h3>
                  <p>Recorded salary changes for this employee</p>
                </div>
                <span className="history-count">
                  {selectedEmployee.compensation?.length ?? 0} records
                </span>
              </div>

              {selectedEmployee.compensation?.length ? (
                <div className="compensation-history">
                  {selectedEmployee.compensation.map((record, index) => (
                    <div
                      className="compensation-history-item"
                      key={record.id}
                    >
                      <div className="history-timeline">
                        <span className="history-timeline-dot" />
                        {index !==
                          selectedEmployee.compensation.length - 1 && (
                          <span className="history-timeline-line" />
                        )}
                      </div>

                      <div className="history-record">
                        <div>
                          <strong>
                            {formatSalary(
                              record.baseSalary,
                              record.currency
                            )}
                          </strong>
                          <span>
                            <FiDollarSign />
                            {record.currency}
                          </span>
                        </div>

                        <small>
                          Effective {formatDate(record.effectiveDate)}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-compensation-history">
                  <FiDollarSign />
                  <span>No compensation history available.</span>
                </div>
              )}
            </div>

            <div className="employee-modal-footer">
              <span>Peoplewise Employee Directory</span>
              <button type="button" onClick={closeDetails}>
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
