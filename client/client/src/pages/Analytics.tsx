import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import * as d3 from "d3";
import { useLoading } from "../context/LoadingContext";
import { useToast } from "../context/ToastContext";
import PageLoader from "../components/PageLoader";
import "./Analytics.css";
import {
  FiBriefcase,
  FiMapPin,
  FiDollarSign,
  FiChevronDown,
  FiRefreshCw,
} from "react-icons/fi";

import { API } from "../services/api";

interface Department {
  id: number;
  name: string;
}

interface Country {
  id: number;
  name: string;
}

interface DepartmentAnalytics {
  department: string;
  employeeCount: number;
  payrollByCurrency: {
    currency: string;
    totalPayroll: number;
    averageSalary: number;
  }[];
}

interface CountryAnalytics {
  country: string;
  currency: string;
  employeeCount: number;
  totalPayroll: number;
  averageSalary: number;
}

interface AnalyticsData {
  departmentAnalytics: DepartmentAnalytics[];
  countryAnalytics: CountryAnalytics[];
  salaryBands: {
    currency: string;
    salaryBand: string;
    employeeCount: number;
  }[];
  tenureDistribution: {
    tenureBand: string;
    employeeCount: number;
  }[];
}

interface Filters {
  departments: Department[];
  countries: Country[];
  currencies: string[];
}

interface ChartItem {
  label: string;
  value: number;
}

interface FilterOption {
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
  options: FilterOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
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
      className="analytics-filter-dropdown"
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`analytics-filter-trigger${open ? " is-open" : ""}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setActiveIndex(selectedIndex);
          setOpen((current) => !current);
        }}
      >
        <span className="analytics-filter-value">{selectedOption?.label}</span>
        <span className="analytics-filter-chevron">
          <FiChevronDown />
        </span>
      </button>

      {open && (
        <div className="analytics-filter-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => {
            const selected = option.value === value;
            const active = index === activeIndex;

            return (
              <button
                key={option.value || "all"}
                type="button"
                role="option"
                aria-selected={selected}
                className={`analytics-filter-option${selected ? " is-selected" : ""}${active ? " is-active" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => chooseOption(option)}
              >
                <span>{option.label}</span>
                {selected && <span className="analytics-filter-check">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BarChart({
  title,
  subtitle,
  data,
  formatValue,
}: {
  title: string;
  subtitle: string;
  data: ChartItem[];
  formatValue?: (value: number) => string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 720;
    const height = Math.max(230, data.length * 43 + 60);
    const margin = { top: 10, right: 105, bottom: 35, left: 145 };

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    if (!data.length) return;

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const chart = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const maxValue = d3.max(data, (item) => item.value) || 1;

    const x = d3.scaleLinear()
      .domain([0, maxValue * 1.18])
      .range([0, chartWidth]);

    const y = d3.scaleBand()
      .domain(data.map((item) => item.label))
      .range([0, chartHeight])
      .padding(0.35);

    chart.append("g")
      .call(d3.axisLeft(y).tickSize(0))
      .call((g) => g.select(".domain").remove())
      .selectAll("text")
      .attr("fill", "#536174")
      .style("font-size", "11px");

    chart.append("g")
      .attr("transform", `translate(0,${chartHeight})`)
      .call(
        d3.axisBottom(x)
          .ticks(5)
          .tickFormat((value) => {
            const number = Number(value);
            if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
            if (number >= 1000) return `${(number / 1000).toFixed(0)}K`;
            return String(number);
          })
      )
      .call((g) => g.select(".domain").attr("stroke", "#e5eaf1"))
      .call((g) => g.selectAll(".tick line").attr("stroke", "#e5eaf1"))
      .selectAll("text")
      .attr("fill", "#8490a2")
      .style("font-size", "10px");

    chart.selectAll(".bar")
      .data(data)
      .join("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("y", (item) => y(item.label) || 0)
      .attr("width", (item) => x(item.value))
      .attr("height", y.bandwidth())
      .attr("rx", 5)
      .attr("fill", "#5276df")
      .append("title")
      .text((item) =>
        `${item.label}: ${formatValue ? formatValue(item.value) : item.value.toLocaleString()}`
      );

    chart.selectAll(".bar-value")
      .data(data)
      .join("text")
      .attr("class", "bar-value")
      .attr("x", (item) => x(item.value) + 7)
      .attr("y", (item) => (y(item.label) || 0) + y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .text((item) =>
        formatValue ? formatValue(item.value) : item.value.toLocaleString()
      )
      .attr("fill", "#536174")
      .style("font-size", "10px")
      .style("font-weight", "600");
  }, [data, formatValue]);

  return (
    <section className="analytics-card">
      <div className="analytics-card-heading">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {data.length ? (
        <div className="analytics-chart">
          <svg ref={svgRef} />
        </div>
      ) : (
        <div className="analytics-empty">No data for the selected filters</div>
      )}
    </section>
  );
}

function DonutChart({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle: string;
  data: ChartItem[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 340;
    const height = 280;
    const radius = 105;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    if (!data.length) return;

    const total = d3.sum(data, (item) => item.value);
    if (!total) return;

    const chart = svg.append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const pie = d3.pie<ChartItem>()
      .sort(null)
      .value((item) => item.value);

    const arc = d3.arc<d3.PieArcDatum<ChartItem>>()
      .innerRadius(62)
      .outerRadius(radius)
      .padAngle(0.025)
      .cornerRadius(4);

    const colors = d3.scaleOrdinal<string>()
      .domain(data.map((item) => item.label))
      .range(d3.schemeTableau10);

    chart.selectAll("path")
      .data(pie(data))
      .join("path")
      .attr("d", arc)
      .attr("fill", (item) => colors(item.data.label))
      .append("title")
      .text((item) =>
        `${item.data.label}: ${item.data.value.toLocaleString()} employees`
      );

    chart.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.15em")
      .attr("font-size", "23px")
      .attr("font-weight", "700")
      .attr("fill", "#26344a")
      .text(total.toLocaleString());

    chart.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1.5em")
      .attr("font-size", "11px")
      .attr("fill", "#8490a2")
      .text("Employees");
  }, [data]);

  return (
    <section className="analytics-card">
      <div className="analytics-card-heading">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      {data.length ? (
        <>
          <svg ref={svgRef} className="analytics-donut" />
          <div className="analytics-legend">
            {data.map((item, index) => (
              <div className="analytics-legend-item" key={item.label}>
                <span
                  className="analytics-legend-dot"
                  style={{
                    background: d3.schemeTableau10[
                      index % d3.schemeTableau10.length
                    ],
                  }}
                />
                <span>{item.label}</span>
                <strong>{item.value.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="analytics-empty">No data available</div>
      )}
    </section>
  );
}

export default function Analytics() {
  const { apiFetch } = useLoading();
  const { showToast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [filters, setFilters] = useState<Filters>({
    departments: [],
    countries: [],
    currencies: [],
  });

  const [departmentId, setDepartmentId] = useState("");
  const [countryId, setCountryId] = useState("");
  const [currency, setCurrency] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const response = await apiFetch(`${API}/compensation/filters`);
        if (!response.ok) throw new Error("Unable to load analytics filters");

        const result = await response.json();
        setFilters(result.data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Filter loading failed";

        setError(message);
        showToast(message, "error");
      }
    };

    loadFilters();
  }, [apiFetch, showToast]);

  useEffect(() => {
    const controller = new AbortController();

    const loadAnalytics = async () => {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (departmentId) params.set("departmentId", departmentId);
      if (countryId) params.set("countryId", countryId);
      if (currency) params.set("currency", currency);

      try {
        const response = await apiFetch(
          `${API}/dashboard/analytics?${params.toString()}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Unable to load analytics data");
        }

        const result = await response.json();
        setAnalytics(result.data);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;

        const message =
          err instanceof Error ? err.message : "Analytics loading failed";

        setError(message);
        showToast(message, "error");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadAnalytics();

    return () => controller.abort();
  }, [departmentId, countryId, currency, apiFetch, showToast]);

  const departmentHeadcount = useMemo(
    () =>
      analytics?.departmentAnalytics.map((item) => ({
        label: item.department,
        value: item.employeeCount,
      })) ?? [],
    [analytics]
  );

  const countryHeadcount = useMemo(
    () =>
      analytics?.countryAnalytics.map((item) => ({
        label: item.country,
        value: item.employeeCount,
      })) ?? [],
    [analytics]
  );

  const payrollByDepartment = useMemo(
    () =>
      analytics?.departmentAnalytics
        .map((item) => {
          const record = currency
            ? item.payrollByCurrency.find(
              (salary) => salary.currency === currency
            )
            : null;

          return record
            ? { label: item.department, value: record.totalPayroll }
            : null;
        })
        .filter((item): item is ChartItem => item !== null)
        .sort((a, b) => b.value - a.value) ?? [],
    [analytics, currency]
  );

  const averageSalaryByDepartment = useMemo(
    () =>
      analytics?.departmentAnalytics
        .map((item) => {
          const record = currency
            ? item.payrollByCurrency.find(
              (salary) => salary.currency === currency
            )
            : null;
          return record
            ? { label: item.department, value: record.averageSalary }
            : null;
        })
        .filter((item): item is ChartItem => item !== null)
        .sort((a, b) => b.value - a.value) ?? [],
    [analytics, currency]
  );

  const averageSalaryByCountry = useMemo(
    () =>
      analytics?.countryAnalytics
        .filter((item) => !currency || item.currency === currency)
        .map((item) => ({
          label: item.country,
          value: item.averageSalary,
        }))
        .sort((a, b) => b.value - a.value) ?? [],
    [analytics, currency]
  );

  const salaryBands = useMemo(
    () =>
      analytics?.salaryBands
        .filter((item) => !currency || item.currency === currency)
        .map((item) => ({
          label: `${item.currency} · ${item.salaryBand}`,
          value: item.employeeCount,
        })) ?? [],
    [analytics, currency]
  );

  const tenureOrder = [
    "Under 1 year",
    "1–3 years",
    "3–5 years",
    "5–10 years",
    "10+ years",
  ];

  const tenureDistribution = useMemo(
    () =>
      (analytics?.tenureDistribution ?? [])
        .map((item) => ({
          label: item.tenureBand,
          value: item.employeeCount,
        }))
        .sort(
          (a, b) =>
            tenureOrder.indexOf(a.label) - tenureOrder.indexOf(b.label)
        ),
    [analytics]
  );

  const totalEmployees = analytics?.countryAnalytics.reduce(
    (sum, item) => sum + item.employeeCount,
    0
  ) ?? 0;

  const totalDepartments = analytics?.departmentAnalytics.length ?? 0;
  const totalCountries = analytics?.countryAnalytics.length ?? 0;

  const largestDepartment = [...(analytics?.departmentAnalytics ?? [])]
    .sort((a, b) => b.employeeCount - a.employeeCount)[0];

  const largestCountry = [...(analytics?.countryAnalytics ?? [])]
    .sort((a, b) => b.employeeCount - a.employeeCount)[0];

  const highestAverageSalary = [...averageSalaryByDepartment]
    .sort((a, b) => b.value - a.value)[0];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 0,
    }).format(value);

  const hasActiveFilters = Boolean(departmentId || countryId || currency);

  const clearFilters = () => {
    setDepartmentId("");
    setCountryId("");
    setCurrency("");
  };

  return (
    <main className="main analytics-page">
      <header className="analytics-header">
        <div>
          <span className="eyebrow">WORKFORCE INTELLIGENCE</span>
          <h1>Analytics</h1>
          <p>Explore workforce distribution and compensation insights</p>
        </div>
      </header>


      <section className="analytics-filters">
        <div className="analytics-filter-control">
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

        <div className="analytics-filter-control">
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

        <div className="analytics-filter-control">
          <FiDollarSign />
          <FilterDropdown
            value={currency}
            onChange={setCurrency}
            ariaLabel="Filter by currency"
            options={[
              { value: "", label: "All currencies" },
              ...filters.currencies.map((item) => ({
                value: item,
                label: item,
              })),
            ]}
          />
        </div>

        <button
          type="button"
          className="analytics-clear"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
        >
          <FiRefreshCw />
          <span>Clear</span>
        </button>
      </section>

      {error && <div className="analytics-error">{error}</div>}

      {loading ? (
        <div className="analytics-loading">
          <PageLoader message="Loading analytics..." />
        </div>
      ) : analytics ? (
        <>
          <section className="analytics-kpis">
            <div className="analytics-kpi">
              <span>Employees in selection</span>
              <strong>{totalEmployees.toLocaleString()}</strong>
              <small>Based on selected department and country</small>
            </div>

            <div className="analytics-kpi">
              <span>Departments</span>
              <strong>{totalDepartments}</strong>
              <small>Departments in current selection</small>
            </div>

            <div className="analytics-kpi">
              <span>Countries</span>
              <strong>{totalCountries}</strong>
              <small>Countries in current selection</small>
            </div>

            <div className="analytics-kpi">
              <span>Currency view</span>
              <strong>{currency || "All"}</strong>
              <small>Salary charts use this currency filter</small>
            </div>
          </section>

          <section className="analytics-insights">
            <h2>Business insights</h2>
            <div className="analytics-insight-grid">
              <div className="analytics-insight">
                <span>Largest department</span>
                <strong>{largestDepartment?.department ?? "—"}</strong>
                <small>
                  {largestDepartment
                    ? `${largestDepartment.employeeCount.toLocaleString()} employees`
                    : "No data"}
                </small>
              </div>

              <div className="analytics-insight">
                <span>Largest workforce country</span>
                <strong>{largestCountry?.country ?? "—"}</strong>
                <small>
                  {largestCountry
                    ? `${largestCountry.employeeCount.toLocaleString()} employees`
                    : "No data"}
                </small>
              </div>

              <div className="analytics-insight">
                <span>Highest average salary department</span>
                <strong>{highestAverageSalary?.label ?? "—"}</strong>
                <small>
                  {highestAverageSalary && currency
                    ? formatCurrency(highestAverageSalary.value)
                    : currency
                      ? "No salary data"
                      : "Select a currency to compare"}
                </small>
              </div>
            </div>
          </section>

          <div className="analytics-grid">
            <BarChart
              title="Employees by Department"
              subtitle="Workforce size across departments"
              data={departmentHeadcount}
            />

            <DonutChart
              title="Workforce by Country"
              subtitle="Share of employees by country"
              data={countryHeadcount}
            />

            <BarChart
              title={`Payroll by Department ${currency ? `(${currency})` : ""}`}
              subtitle="Total payroll by department, grouped by currency"
              data={payrollByDepartment}
              formatValue={formatCurrency}
            />

            <BarChart
              title={`Average Salary by Department ${currency ? `(${currency})` : ""}`}
              subtitle="Average compensation by department"
              data={averageSalaryByDepartment}
              formatValue={formatCurrency}
            />

            <BarChart
              title="Salary Band Distribution"
              subtitle="Employee counts in nominal salary ranges by currency"
              data={salaryBands}
            />

            <BarChart
              title="Employee Tenure Distribution"
              subtitle="Workforce experience based on hire date"
              data={tenureDistribution}
            />

            <BarChart
              title={`Average Salary by Country ${currency ? `(${currency})` : ""}`}
              subtitle="Average salary for countries matching the selected currency"
              data={averageSalaryByCountry}
              formatValue={formatCurrency}
            />
          </div>
        </>
      ) : (
        <div className="analytics-empty">No analytics data available.</div>
      )}
    </main>
  );
}