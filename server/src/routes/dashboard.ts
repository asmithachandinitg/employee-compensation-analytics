import { Router } from "express";
import { prisma } from "../lib/prisma";
import { Prisma } from "@prisma/client";

const router = Router();

// Dashboard summary
router.get("/summary", async (_req, res) => {
  try {
    const [
      totalEmployees,
      activeEmployees,
      departmentCount,
      countryCount,
      payrollRows,
    ] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { status: "ACTIVE" } }),
      prisma.department.count(),
      prisma.country.count(),
      // Payroll counts each current employee's latest salary only
      // (ACTIVE and ON_LEAVE), grouped by currency in the database.
      prisma.$queryRaw<
        { currency: string; totalPayroll: number; averageSalary: number }[]
      >`
        WITH latest_compensation AS (
          SELECT DISTINCT ON (ch."employeeId")
            ch."baseSalary",
            ch."currency"
          FROM "CompensationHistory" ch
          INNER JOIN "Employee" e ON e."id" = ch."employeeId"
          WHERE e."status" IN ('ACTIVE', 'ON_LEAVE')
          ORDER BY
            ch."employeeId",
            ch."effectiveDate" DESC,
            ch."createdAt" DESC,
            ch."id" DESC
        )
        SELECT
          "currency",
          SUM("baseSalary")::float8 AS "totalPayroll",
          AVG("baseSalary")::float8 AS "averageSalary"
        FROM latest_compensation
        GROUP BY "currency"
        ORDER BY "currency"
      `,
    ]);

    const payrollByCurrency = payrollRows.map((row) => ({
      currency: row.currency,
      totalPayroll: Number(row.totalPayroll),
      averageSalary: Number(row.averageSalary),
    }));

    res.json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        departmentCount,
        countryCount,
        payrollByCurrency,
      },
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to fetch dashboard summary",
    });
  }
});



router.get("/analytics", async (req, res) => {
  try {
    const departmentId = req.query.departmentId
      ? Number(req.query.departmentId)
      : null;

    const countryId = req.query.countryId
      ? Number(req.query.countryId)
      : null;

    const currency =
      typeof req.query.currency === "string" &&
      req.query.currency.trim()
        ? req.query.currency.trim().toUpperCase()
        : null;

    if (
      (departmentId !== null &&
        (!Number.isInteger(departmentId) || departmentId <= 0)) ||
      (countryId !== null &&
        (!Number.isInteger(countryId) || countryId <= 0)) ||
      (currency !== null && !/^[A-Z]{3}$/.test(currency))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid analytics filter parameters",
      });
    }

    const employeeFilters = Prisma.sql`
      WHERE (${departmentId}::int IS NULL
        OR e."departmentId" = ${departmentId})
      AND (${countryId}::int IS NULL
        OR e."countryId" = ${countryId})
    `;

    // Latest compensation record for each employee.
    const latestCompensation = Prisma.sql`
      WITH filtered_employees AS (
        SELECT
          e."id",
          e."departmentId",
          e."countryId",
          e."hireDate"
        FROM "Employee" e
        ${employeeFilters}
      ),
      latest_compensation AS (
        SELECT
          ch."employeeId",
          ch."baseSalary",
          ch."currency",
          ROW_NUMBER() OVER (
            PARTITION BY ch."employeeId"
            ORDER BY
              ch."effectiveDate" DESC,
              ch."createdAt" DESC,
              ch."id" DESC
          ) AS row_number
        FROM "CompensationHistory" ch
        INNER JOIN filtered_employees fe
          ON fe."id" = ch."employeeId"
      )
    `;

    // Department headcount and payroll by currency.
    const departmentRows = await prisma.$queryRaw<
      {
        department: string;
        employeeCount: bigint;
        currency: string | null;
        totalPayroll: number;
        averageSalary: number;
      }[]
    >(Prisma.sql`
      ${latestCompensation}
      SELECT
        d."name" AS department,
        COUNT(DISTINCT fe."id") AS "employeeCount",
        lc."currency" AS currency,
        COALESCE(SUM(lc."baseSalary"), 0)::float8 AS "totalPayroll",
        COALESCE(AVG(lc."baseSalary"), 0)::float8 AS "averageSalary"
      FROM filtered_employees fe
      INNER JOIN "Department" d
        ON d."id" = fe."departmentId"
      LEFT JOIN latest_compensation lc
        ON lc."employeeId" = fe."id"
        AND lc.row_number = 1
        AND (${currency}::varchar IS NULL
          OR lc."currency" = ${currency})
      GROUP BY d."name", lc."currency"
      ORDER BY d."name", lc."currency"
    `);

    // Country headcount and payroll in each country's currency.
    const countryRows = await prisma.$queryRaw<
      {
        country: string;
        currency: string;
        employeeCount: bigint;
        totalPayroll: number;
        averageSalary: number;
      }[]
    >(Prisma.sql`
      ${latestCompensation}
      SELECT
        c."name" AS country,
        c."currency" AS currency,
        COUNT(DISTINCT fe."id") AS "employeeCount",
        COALESCE(
          SUM(
            CASE
              WHEN lc."currency" = c."currency"
              THEN lc."baseSalary"
              ELSE NULL
            END
          ), 0
        )::float8 AS "totalPayroll",
        COALESCE(
          AVG(
            CASE
              WHEN lc."currency" = c."currency"
              THEN lc."baseSalary"
              ELSE NULL
            END
          ), 0
        )::float8 AS "averageSalary"
      FROM filtered_employees fe
      INNER JOIN "Country" c
        ON c."id" = fe."countryId"
      LEFT JOIN latest_compensation lc
        ON lc."employeeId" = fe."id"
        AND lc.row_number = 1
      GROUP BY c."name", c."currency"
      ORDER BY c."name"
    `);

    // Salary bands, calculated independently within each currency.
    const salaryBandRows = await prisma.$queryRaw<
      {
        currency: string;
        salaryBand: string;
        employeeCount: bigint;
      }[]
    >(Prisma.sql`
      ${latestCompensation}
      SELECT
        lc."currency" AS currency,
        CASE
          WHEN lc."baseSalary" < 25000 THEN 'Under 25K'
          WHEN lc."baseSalary" < 50000 THEN '25K–50K'
          WHEN lc."baseSalary" < 75000 THEN '50K–75K'
          WHEN lc."baseSalary" < 100000 THEN '75K–100K'
          WHEN lc."baseSalary" < 150000 THEN '100K–150K'
          ELSE '150K+'
        END AS "salaryBand",
        COUNT(*) AS "employeeCount"
      FROM latest_compensation lc
      WHERE lc.row_number = 1
        AND (${currency}::varchar IS NULL
          OR lc."currency" = ${currency})
      GROUP BY lc."currency", "salaryBand"
      ORDER BY lc."currency", "salaryBand"
    `);

    // Employee tenure distribution.
    const tenureRows = await prisma.$queryRaw<
      {
        tenureBand: string;
        employeeCount: bigint;
      }[]
    >(Prisma.sql`
      ${latestCompensation}
      SELECT
        CASE
          WHEN AGE(CURRENT_DATE, fe."hireDate") < INTERVAL '1 year'
            THEN 'Under 1 year'
          WHEN AGE(CURRENT_DATE, fe."hireDate") < INTERVAL '3 years'
            THEN '1–3 years'
          WHEN AGE(CURRENT_DATE, fe."hireDate") < INTERVAL '5 years'
            THEN '3–5 years'
          WHEN AGE(CURRENT_DATE, fe."hireDate") < INTERVAL '10 years'
            THEN '5–10 years'
          ELSE '10+ years'
        END AS "tenureBand",
        COUNT(*) AS "employeeCount"
      FROM filtered_employees fe
      GROUP BY "tenureBand"
      ORDER BY MIN(fe."hireDate") DESC
    `);

    // Convert database results into the existing frontend response shape.
    const departmentMap = new Map<
      string,
      {
        department: string;
        employeeCount: number;
        payrollByCurrency: {
          currency: string;
          totalPayroll: number;
          averageSalary: number;
        }[];
      }
    >();

    for (const row of departmentRows) {
      let department = departmentMap.get(row.department);

      if (!department) {
        department = {
          department: row.department,
          employeeCount: Number(row.employeeCount),
          payrollByCurrency: [],
        };

        departmentMap.set(row.department, department);
      }

      if (row.currency) {
        department.payrollByCurrency.push({
          currency: row.currency,
          totalPayroll: row.totalPayroll,
          averageSalary: row.averageSalary,
        });
      }
    }

    const departmentAnalytics = Array.from(
      departmentMap.values()
    );

    const countryAnalytics = countryRows.map((row) => ({
      country: row.country,
      currency: row.currency,
      employeeCount: Number(row.employeeCount),
      totalPayroll: row.totalPayroll,
      averageSalary: row.averageSalary,
    }));

    const salaryBands = salaryBandRows.map((row) => ({
      currency: row.currency,
      salaryBand: row.salaryBand,
      employeeCount: Number(row.employeeCount),
    }));

    const tenureDistribution = tenureRows.map((row) => ({
      tenureBand: row.tenureBand,
      employeeCount: Number(row.employeeCount),
    }));

    return res.json({
      success: true,
      data: {
        departmentAnalytics,
        countryAnalytics,
        salaryBands,
        tenureDistribution,
      },
    });
  } catch (error) {
    console.error("Dashboard analytics error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch dashboard analytics",
    });
  }
});


export default router;