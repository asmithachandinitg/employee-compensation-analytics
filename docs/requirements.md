# Employee Compensation & Analytics Platform

**Product Requirements Document**

**Version:** 1.0  
**Status:** Initial Draft

## 1. Objective

Build a centralized web-based application that enables an organization's HR Manager to manage employee compensation records for 10,000 employees across multiple countries.

The platform will replace spreadsheet-based salary management with an organized system for maintaining employee records, managing salary information and generating meaningful compensation insights.

## 2. Target User

**Primary User: HR Manager**

The HR Manager needs to:
- View and manage employee information.
- Add and update employee salary records.
- Search and filter employees efficiently.
- Understand salary distribution across countries and departments.
- Answer business questions using compensation analytics.

## 3. Functional Requirements

### 3.1 Dashboard
- Display total employee count.
- Display average salary grouped by currency.
- Display total payroll grouped by currency.
- Show employee distribution by country and department.
- Visualize salary distribution.

### 3.2 Employee Management
- Display employee records in a paginated table.
- Search employees by name or employee ID.
- Filter by country, department and employment status.
- View individual employee details.
- Add and edit employee records.

### 3.3 Compensation Management
- Maintain employee base salary and currency.
- Update salary information.
- Record salary changes with effective dates.
- Validate salary inputs.
- Maintain salary history.

### 3.4 Compensation Analytics
Enable HR managers to answer questions such as:
- Which country has the highest average salary?
- What is the average salary by department?
- How many employees earn above a specified salary threshold?
- Which department has the highest payroll expenditure?
- How is compensation distributed across salary ranges?

Analytics must use actual database records rather than hardcoded values. Calculations must respect currency differences.

## 4. Technical Scope

- React and TypeScript frontend.
- Node.js and Express backend.
- PostgreSQL relational database.
- REST APIs for employee, compensation and analytics operations.
- Database seeded with 10,000 synthetic employee records.
- Server-side search, filtering and pagination.
- Automated unit and integration tests.
- Responsive user interface.
- Deployed application with a demonstration video.

## 5. Non-Functional Requirements

- Efficiently handle 10,000 employee records.
- Maintain consistent and accurate compensation data.
- Provide meaningful validation and error messages.
- Protect sensitive salary information.
- Ensure maintainable and reusable code.
- Provide automated test coverage for core functionality.

## 6. Out of Scope

The initial release will not include:

- Actual salary disbursement or payroll processing.
- Tax calculations and statutory compliance.
- Attendance and leave management.
- Employee self-service portals.
- Third-party HR and banking integrations.
- Automated salary recommendations.

These features are excluded to keep the initial implementation focused on employee compensation management and analytics within the assessment timeframe.

## 7. Success Criteria

The application will be considered successful when:

1. HR managers can manage employee records through the application.
2. The database contains 10,000 seeded employees.
3. Employee search, filters and pagination work correctly.
4. Salary updates are persisted and salary history is maintained.
5. Dashboard metrics and analytics reflect actual database data.
6. Core features have automated test coverage.
7. The application is deployed and demonstrated through a video.