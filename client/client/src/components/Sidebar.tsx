
import { useState } from "react";
import type { Page } from "../App";
import {
    FiGrid,
    FiUsers,
    FiDollarSign,
    FiBarChart2,
    FiChevronLeft,
    FiChevronRight,
} from "react-icons/fi";
import "./Sidebar.css";

interface SidebarProps {
    activePage: Page;
    onNavigate: (page: Page) => void;
}

const navigation = [
    { label: "Dashboard", page: "dashboard" as Page, icon: FiGrid },
    { label: "Employees", page: "employees" as Page, icon: FiUsers },
    { label: "Compensation", page: "compensation" as Page, icon: FiDollarSign },
    { label: "Analytics", page: "analytics" as Page, icon: FiBarChart2 },
];

export default function Sidebar({
    activePage,
    onNavigate,
}: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
            <div className="sidebar-header">
                {!isCollapsed && (
                    <h2 className="sidebar-brand">Peoplewise</h2>
                )}

                <button
                    type="button"
                    className="sidebar-toggle"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
                </button>
            </div>

            {!isCollapsed && (
                <p className="sidebar-label">WORKSPACE</p>
            )}

            <nav className="sidebar-nav">
                {navigation.map((item) => {
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.page}
                            type="button"
                            className={`nav-item ${activePage === item.page ? "active" : ""
                                }`}
                            onClick={() => onNavigate(item.page)}
                            title={isCollapsed ? item.label : undefined}
                            aria-label={item.label}
                            aria-current={activePage === item.page ? "page" : undefined}
                        >
                            <span className="nav-icon" aria-hidden="true">
                                <Icon />
                            </span>
                            {!isCollapsed && (
                                <span className="nav-label">{item.label}</span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {!isCollapsed && (
                <div className="sidebar-footer">
                    HR Management Platform
                </div>
            )}
        </aside>
    );
}
