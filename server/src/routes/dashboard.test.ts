
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

const mocks = vi.hoisted(() => ({
  employeeCount: vi.fn(),
  departmentCount: vi.fn(),
  countryCount: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    employee: { count: mocks.employeeCount },
    department: { count: mocks.departmentCount },
    country: { count: mocks.countryCount },
    $queryRaw: mocks.queryRaw,
  },
}));

import dashboardRoutes from "./dashboard";

const app = express();
app.use("/api/dashboard", dashboardRoutes);

describe("Dashboard API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /summary", () => {
    it("returns dashboard summary successfully", async () => {
      mocks.employeeCount
        .mockResolvedValueOnce(10000)
        .mockResolvedValueOnce(8500);

      mocks.departmentCount.mockResolvedValue(12);
      mocks.countryCount.mockResolvedValue(5);

      mocks.queryRaw.mockResolvedValue([
        {
          currency: "INR",
          totalPayroll: 50000000,
          averageSalary: 50000,
        },
      ]);

      const response = await request(app).get("/api/dashboard/summary");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalEmployees).toBe(10000);
      expect(response.body.data.activeEmployees).toBe(8500);
      expect(response.body.data.departmentCount).toBe(12);
      expect(response.body.data.countryCount).toBe(5);
      expect(response.body.data.payrollByCurrency[0].currency).toBe("INR");
    });

    it("returns 500 when database query fails", async () => {
      mocks.employeeCount.mockRejectedValue(new Error("Database error"));

      const response = await request(app).get("/api/dashboard/summary");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /analytics", () => {
    it("returns analytics successfully", async () => {
      mocks.queryRaw
        .mockResolvedValueOnce([
          {
            department: "Engineering",
            employeeCount: BigInt(100),
            currency: "INR",
            totalPayroll: 5000000,
            averageSalary: 50000,
          },
        ])
        .mockResolvedValueOnce([
          {
            country: "India",
            currency: "INR",
            employeeCount: BigInt(100),
            totalPayroll: 5000000,
            averageSalary: 50000,
          },
        ])
        .mockResolvedValueOnce([
          {
            currency: "INR",
            salaryBand: "25K–50K",
            employeeCount: BigInt(40),
          },
        ])
        .mockResolvedValueOnce([
          {
            tenureBand: "1–3 years",
            employeeCount: BigInt(60),
          },
        ]);

      const response = await request(app).get("/api/dashboard/analytics");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.departmentAnalytics).toHaveLength(1);
      expect(response.body.data.countryAnalytics).toHaveLength(1);
      expect(response.body.data.salaryBands).toHaveLength(1);
      expect(response.body.data.tenureDistribution).toHaveLength(1);

      expect(
        response.body.data.departmentAnalytics[0].employeeCount
      ).toBe(100);
    });

    it("accepts valid analytics filters", async () => {
      mocks.queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const response = await request(app).get(
        "/api/dashboard/analytics?departmentId=1&countryId=2&currency=inr"
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mocks.queryRaw).toHaveBeenCalledTimes(4);
    });

    it("rejects invalid department ID", async () => {
      const response = await request(app).get(
        "/api/dashboard/analytics?departmentId=-1"
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(mocks.queryRaw).not.toHaveBeenCalled();
    });

    it("rejects invalid country ID", async () => {
      const response = await request(app).get(
        "/api/dashboard/analytics?countryId=abc"
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(mocks.queryRaw).not.toHaveBeenCalled();
    });

    it("rejects invalid currency", async () => {
      const response = await request(app).get(
        "/api/dashboard/analytics?currency=US"
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(mocks.queryRaw).not.toHaveBeenCalled();
    });

    it("returns 500 when analytics database query fails", async () => {
      mocks.queryRaw.mockRejectedValue(new Error("Database error"));

      const response = await request(app).get("/api/dashboard/analytics");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});
