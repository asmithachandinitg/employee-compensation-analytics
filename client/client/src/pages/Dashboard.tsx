
import { useEffect, useState } from "react";
import { useLoading } from "../context/LoadingContext";
import { useToast } from "../context/ToastContext";
import PageLoader from "../components/PageLoader";
import "./Dashboard.css";
import {
  FiUsers,
  FiUserCheck,
  FiBriefcase,
  FiGlobe,
} from "react-icons/fi";
import type { IconType } from "react-icons";

const API = "http://localhost:5000/api";

interface Summary {
  totalEmployees: number;
  activeEmployees: number;
  departmentCount: number;
  countryCount: number;
  payrollByCurrency: {
    currency: string;
    totalPayroll: number;
    averageSalary: number;
  }[];
}

interface Analytics {
  departmentAnalytics: {
    department: string;
    employeeCount: number;
    payrollByCurrency: {
      currency: string;
      totalPayroll: number;
      averageSalary: number;
    }[];
  }[];
  countryAnalytics: {
    country: string;
    currency: string;
    employeeCount: number;
    totalPayroll: number;
    averageSalary: number;
  }[];
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: IconType;
}) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        <Icon />
      </div>
      <p>{title}</p>
      <h2>{value}</h2>
    </div>
  );
}

export default function Dashboard() {
  const { apiFetch } = useLoading();
  const { showToast } = useToast();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [summaryResponse, analyticsResponse] = await Promise.all([
          apiFetch(`${API}/dashboard/summary`),
          apiFetch(`${API}/dashboard/analytics`),
        ]);

        if (!summaryResponse.ok || !analyticsResponse.ok) {
          throw new Error("Unable to load dashboard data");
        }

        const summaryResult = await summaryResponse.json();
        const analyticsResult = await analyticsResponse.json();

        setSummary(summaryResult.data);
        setAnalytics(analyticsResult.data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to load dashboard";

        setError(message);
        showToast(message, "error");
      }
      finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [apiFetch, showToast]);

  const formatMoney = (amount: number, currency: string) =>
    new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);

if (loading) return <PageLoader message="Loading your dashboard..." />;

  if (error || !summary || !analytics) {
    return <div className="error">{error || "Dashboard data unavailable"}</div>;
  }

  return (
    <main className="main">
      <header className="topbar">
        <div>
          <span className="eyebrow">OVERVIEW</span>
          <h1>Dashboard</h1>
          <p>Employee compensation and workforce insights</p>
        </div>
        <div className="admin-profile">
          <div className="avatar">HR</div>
          <div>
            <strong>HR Manager</strong>
            <small>Administrator</small>
          </div>
        </div>
      </header>

      <section className="stats-grid">
     <StatCard
  title="Total Employees"
  value={summary.totalEmployees.toLocaleString()}
  icon={FiUsers}
/>

<StatCard
  title="Active Employees"
  value={summary.activeEmployees.toLocaleString()}
  icon={FiUserCheck}
/>

<StatCard
  title="Departments"
  value={String(summary.departmentCount)}
  icon={FiBriefcase}
/>

<StatCard
  title="Countries"
  value={String(summary.countryCount)}
  icon={FiGlobe}
/>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Payroll Overview</h2>
            <p>Compensation totals grouped by currency</p>
          </div>
        </div>

        <div className="payroll-grid">
          {summary.payrollByCurrency.map((item) => (
            <div className="payroll-card" key={item.currency}>
              <span>{item.currency}</span>
              <h3>{formatMoney(item.totalPayroll, item.currency)}</h3>
              <p>Average: {formatMoney(item.averageSalary, item.currency)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="section-heading">
            <div>
              <h2>Department Overview</h2>
              <p>Employee distribution by department</p>
            </div>
          </div>
          {analytics.departmentAnalytics.map((department) => (
            <div className="bar-row" key={department.department}>
              <div className="bar-label">
                <span>{department.department}</span>
                <strong>{department.employeeCount}</strong>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${(department.employeeCount / Math.max(summary.totalEmployees, 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <h2>Country Overview</h2>
              <p>Workforce distribution by country</p>
            </div>
          </div>
          {analytics.countryAnalytics.map((country) => (
            <div className="country-row" key={country.country}>
              <div>
                <strong>{country.country}</strong>
                <small>{country.currency}</small>
              </div>
              <strong>{country.employeeCount.toLocaleString()} employees</strong>
            </div>
          ))}
        </div>
      </section>

      <footer>Employee Compensation & Analytics Platform · Demo data</footer>
    </main>
  );
}
