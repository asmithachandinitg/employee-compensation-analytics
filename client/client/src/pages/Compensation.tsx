import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useLoading } from "../context/LoadingContext";
import { useToast } from "../context/ToastContext";
import PageLoader from "../components/PageLoader";
import "./Compensation.css";
import {
  FiBriefcase,
  FiChevronDown,
  FiDollarSign,
  FiEdit2,
  FiMapPin,
  FiRefreshCw,
  FiSearch,
  FiX,
} from "react-icons/fi";
const API = "http://localhost:5000/api";

interface CompensationRecord {
  id: number;
  employeeId: number;
  baseSalary: string | number;
  currency: string;
  effectiveDate: string;
  reason: string | null;
  employee: {
    id: number;
    employeeCode: string;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string;
    department: { id: number; name: string };
    country: { id: number; name: string };
  };
}

interface FilterOptions {
  departments: { id: number; name: string }[];
  countries: { id: number; name: string; currency: string }[];
  currencies: string[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}


interface DropdownOption {
  value: string;
  label: string;
}

function FilterDropdown({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const selectedOption = options[selectedIndex];

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const choose = (option: DropdownOption) => {
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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
      choose(options[activeIndex]);
    }
  };

  return (
    <div className="comp-dropdown" ref={rootRef} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className={`comp-dropdown-trigger${open ? " is-open" : ""}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setActiveIndex(selectedIndex);
          setOpen((current) => !current);
        }}
      >
        <span className="comp-dropdown-value">{selectedOption?.label}</span>
        <span className="comp-dropdown-chevron">
          <FiChevronDown />
        </span>
      </button>

      {open && (
        <div className="comp-dropdown-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => {
            const selected = option.value === value;
            const active = index === activeIndex;

            return (
              <button
                key={option.value || "all"}
                type="button"
                role="option"
                aria-selected={selected}
                className={`comp-dropdown-option${selected ? " is-selected" : ""}${active ? " is-active" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
              >
                <span>{option.label}</span>
                {selected && <span className="comp-dropdown-check">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Compensation() {
  const { apiFetch } = useLoading();
  const { showToast } = useToast();
  const [records, setRecords] = useState<CompensationRecord[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    departments: [],
    countries: [],
    currencies: [],
  });

  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [countryId, setCountryId] = useState("");
  const [currency, setCurrency] = useState("");
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");

  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEmployee, setSelectedEmployee] =
    useState<CompensationRecord["employee"] | null>(null);
  const [history, setHistory] = useState<CompensationRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateSalary, setUpdateSalary] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const fetchFilters = useCallback(async () => {
    try {
      const response = await apiFetch(`${API}/compensation/filters`);
      if (!response.ok) throw new Error("Unable to load filter options");

      const result = await response.json();
      setFilters(result.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Filter loading failed";

      showToast(message, "error");
    }
  }, [apiFetch, showToast]);

  const fetchRecords = useCallback(async () => {
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
      if (currency) params.set("currency", currency);

      const response = await apiFetch(
        `${API}/compensation?${params.toString()}`
      );

      if (!response.ok) throw new Error("Unable to load compensation records");

      const result = await response.json();
      setRecords(result.data);
      setPagination(result.pagination);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";

      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, departmentId, countryId, currency, apiFetch, showToast]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    setPage(1);
  }, [search, departmentId, countryId, currency]);

  const handlePageJump = () => {
    const targetPage = Number(pageInput);
    const maxPage = Math.max(pagination.totalPages, 1);

    if (!Number.isInteger(targetPage) || targetPage < 1 || targetPage > maxPage) {
      setPageInput(String(page));
      showToast(`Enter a page number between 1 and ${maxPage}`, "error");
      return;
    }

    setPage(targetPage);
  };

  const formatMoney = (amount: number | string, code: string) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(Number(amount));

  const viewHistory = async (employee: CompensationRecord["employee"]) => {
    setSelectedEmployee(employee);
    setHistory([]);
    setHistoryLoading(true);
    setFormError("");
    setFormSuccess("");

    try {
      const response = await apiFetch(
        `${API}/compensation/${employee.id}/history`
      );
      if (!response.ok) throw new Error("Unable to load salary history");

      const result = await response.json();
      setHistory(result.data.compensation);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load history";

      setFormError(message);
      showToast(message, "error");
    } finally {
      setHistoryLoading(false);
    }
  };

  const submitSalaryUpdate = async () => {
    if (!selectedEmployee) return;

    const amount = Number(updateSalary);

    if (!updateSalary || !Number.isFinite(amount) || amount <= 0) {
      setFormError("Enter a valid salary amount.");
      return;
    }

    if (!effectiveDate) {
      setFormError("Select an effective date.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    setFormSuccess("");

    try {
      const response = await apiFetch(
        `${API}/compensation/${selectedEmployee.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            baseSalary: amount,
            effectiveDate,
            reason: reason.trim() || "Salary adjustment",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to update salary");
      }

      setFormSuccess("New compensation record created successfully.");
      showToast("Salary updated successfully", "success");
      setUpdateSalary("");
      setReason("");

      await viewHistory(selectedEmployee);
      await fetchRecords();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Salary update failed";

      setFormError(message);
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const hasActiveFilters = Boolean(search || departmentId || countryId || currency);

  const clearFilters = () => {
    setSearch("");
    setDepartmentId("");
    setCountryId("");
    setCurrency("");
    setPage(1);
  };

  const closeModal = () => {
    setSelectedEmployee(null);
    setHistory([]);
    setShowUpdateForm(false);
    setFormError("");
    setFormSuccess("");
  };

  return (
    <main className="main compensation-page">
      <header className="compensation-header">
        <div>
          <span className="eyebrow">PAYROLL MANAGEMENT</span>
          <h1>Compensation</h1>
          <p>Manage employee salaries and compensation history</p>
        </div>

        <div className="compensation-total">
          <strong>{pagination.total.toLocaleString()}</strong>
          <span>Compensation records</span>
        </div>
      </header>

      <section className="comp-toolbar">
        <div className="comp-search">
          <FiSearch />
          <input
            type="search"
            placeholder="Search employee name, ID or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search compensation records"
          />
        </div>

        <div className="comp-filter">
          <FiBriefcase />
          <FilterDropdown
            value={departmentId}
            onChange={setDepartmentId}
            ariaLabel="Filter by department"
            options={[
              { value: "", label: "All departments" },
              ...filters.departments.map((item) => ({
                value: String(item.id),
                label: item.name,
              })),
            ]}
          />
        </div>

        <div className="comp-filter">
          <FiMapPin />
          <FilterDropdown
            value={countryId}
            onChange={setCountryId}
            ariaLabel="Filter by country"
            options={[
              { value: "", label: "All countries" },
              ...filters.countries.map((item) => ({
                value: String(item.id),
                label: item.name,
              })),
            ]}
          />
        </div>

        <div className="comp-filter">
          <FiDollarSign />
          <FilterDropdown
            value={currency}
            onChange={setCurrency}
            ariaLabel="Filter by currency"
            options={[
              { value: "", label: "All currencies" },
              ...filters.currencies.map((item) => ({ value: item, label: item })),
            ]}
          />
        </div>

        <button
          type="button"
          className="comp-clear"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
        >
          <FiRefreshCw />
          Clear
        </button>
      </section>

      {error && <div className="comp-error">{error}</div>}

      <section className="compensation-table-container">
        {loading ? (
          <div className="comp-loader-area">
            <PageLoader message="Loading compensation records..." />
          </div>
        ) : (
        <table className="compensation-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Employee ID</th>
              <th>Department</th>
              <th>Country</th>
              <th>Base Salary</th>
              <th>Currency</th>
              <th>Effective Date</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={8} className="comp-table-message">
                  No compensation records found.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id}>
                  <td>
                    <div className="comp-employee-cell">
                      <span className="comp-employee-avatar">
                        {record.employee.firstName.charAt(0)}
                        {record.employee.lastName.charAt(0)}
                      </span>
                      <span className="comp-employee-info">
                        <strong>
                          {record.employee.firstName} {record.employee.lastName}
                        </strong>
                        <small>{record.employee.email}</small>
                      </span>
                    </div>
                  </td>
                  <td>{record.employee.employeeCode}</td>
                  <td>{record.employee.department.name}</td>
                  <td>{record.employee.country.name}</td>
                  <td>
                    {formatMoney(record.baseSalary, record.currency)}
                  </td>
                  <td>{record.currency}</td>
                  <td>
                    {new Date(record.effectiveDate).toLocaleDateString()}
                  </td>
                  <td>
                    <button
                      className="comp-view-button"
                      onClick={() => viewHistory(record.employee)}
                    >
                      <FiEdit2 aria-hidden="true" />
                      <span>Edit</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        )}
      </section>

      <div className="compensation-pagination">
        <span>
          Showing {records.length ? (page - 1) * 10 + 1 : 0}–
          {(page - 1) * 10 + records.length} of{" "}
          {pagination.total.toLocaleString()} records
        </span>

        <div>
          <button
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </button>

          <div className="comp-page-jump">
            <span>Page</span>
            <input
              type="number"
              min="1"
              max={Math.max(pagination.totalPages, 1)}
              value={pageInput}
              aria-label="Page number"
              onChange={(event) => setPageInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handlePageJump();
              }}
            />
            <span>of {Math.max(pagination.totalPages, 1)}</span>
            <button
              type="button"
              disabled={loading || pagination.totalPages === 0}
              onClick={handlePageJump}
            >
              Go
            </button>
          </div>

          <button
            disabled={page >= pagination.totalPages || loading}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {selectedEmployee && (
        <div className="comp-modal-backdrop" onClick={closeModal}>
          <section
            className="comp-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="comp-modal-header">
              <div className="comp-modal-identity">
                <span className="comp-modal-avatar">
                  {selectedEmployee.firstName.charAt(0)}
                  {selectedEmployee.lastName.charAt(0)}
                </span>
                <div>
                  <span className="eyebrow">EMPLOYEE COMPENSATION</span>
                  <h2>
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </h2>
                  <p>{selectedEmployee.employeeCode} · {selectedEmployee.jobTitle}</p>
                </div>
              </div>
              <button className="comp-modal-close" onClick={closeModal} aria-label="Close dialog">
                <FiX />
              </button>
            </header>

            <div className="comp-modal-body">

              <div className="comp-modal-heading">
                <h3>Salary History</h3>
                <button
                  className="comp-update-button"
                  onClick={() => {
                    setShowUpdateForm(!showUpdateForm);
                    setFormError("");
                    setFormSuccess("");
                  }}
                >
                  {showUpdateForm ? "Cancel Update" : "Update Salary"}
                </button>
              </div>

              {formError && <div className="comp-error">{formError}</div>}
              {formSuccess && <div className="comp-success">{formSuccess}</div>}

              {showUpdateForm && (
                <div className="salary-update-form">
                  <h3>New Compensation Record</h3>

                  <label>New Base Salary</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter salary"
                    value={updateSalary}
                    onChange={(e) => setUpdateSalary(e.target.value)}
                  />

                  <label>Currency</label>
                  <input
                    value={selectedEmployee.country.name}
                    disabled
                  />

                  <label>Effective Date</label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                  />

                  <label>Reason for Change</label>
                  <textarea
                    placeholder="Annual increment, promotion, salary revision..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />

                  <button
                    className="comp-save-button"
                    disabled={submitting}
                    onClick={submitSalaryUpdate}
                  >
                    {submitting ? "Saving..." : "Save Compensation"}
                  </button>
                </div>
              )}

              <div className="comp-history-list">
                {historyLoading ? (
                  <p>Loading salary history...</p>
                ) : history.length === 0 ? (
                  <p>No compensation history available.</p>
                ) : (
                  history.map((item) => (
                    <div className="comp-history-item" key={item.id}>
                      <div>
                        <strong>
                          {formatMoney(item.baseSalary, item.currency)}
                        </strong>
                        <small>
                          Effective {new Date(item.effectiveDate).toLocaleDateString()}
                        </small>
                      </div>
                      <span>{item.reason || "Salary record"}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}