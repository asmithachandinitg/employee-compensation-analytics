
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

const mocks = vi.hoisted(() => ({
  employeeFindMany: vi.fn(),
  employeeCount: vi.fn(),
  employeeFindUnique: vi.fn(),
  departmentFindMany: vi.fn(),
  countryFindMany: vi.fn(),
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    employee: {
      findMany: mocks.employeeFindMany,
      count: mocks.employeeCount,
      findUnique: mocks.employeeFindUnique,
    },
    department: {
      findMany: mocks.departmentFindMany,
    },
    country: {
      findMany: mocks.countryFindMany,
    },
  },
}));

import employeeRoutes from "./employees";

const app = express();
app.use("/api/employees", employeeRoutes);

describe("Employees API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /", () => {
    it("returns paginated employees successfully", async () => {
      mocks.employeeFindMany.mockResolvedValue([
        { id: 1, firstName: "John", lastName: "Doe" },
      ]);
      mocks.employeeCount.mockResolvedValue(10000);

      const response = await request(app).get("/api/employees");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination.total).toBe(10000);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.totalPages).toBe(1000);
    });

    it("applies search and employee filters", async () => {
      mocks.employeeFindMany.mockResolvedValue([]);
      mocks.employeeCount.mockResolvedValue(0);

      const response = await request(app).get(
        "/api/employees?search=John&departmentId=1&countryId=2&status=ACTIVE"
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const query = mocks.employeeFindMany.mock.calls[0][0];
      expect(query.where.departmentId).toBe(1);
      expect(query.where.countryId).toBe(2);
      expect(query.where.status).toBe("ACTIVE");
      expect(query.where.OR).toHaveLength(5);
    });

    it("rejects invalid pagination parameters", async () => {
      const response = await request(app).get(
        "/api/employees?page=0&limit=200"
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(mocks.employeeFindMany).not.toHaveBeenCalled();
    });

    it("returns 500 when employee listing fails", async () => {
      mocks.employeeFindMany.mockRejectedValue(
        new Error("Database error")
      );

      const response = await request(app).get("/api/employees");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /filters", () => {
    it("returns department and country filter options", async () => {
      mocks.departmentFindMany.mockResolvedValue([
        { id: 1, name: "Engineering" },
      ]);
      mocks.countryFindMany.mockResolvedValue([
        { id: 1, name: "India" },
      ]);

      const response = await request(app).get("/api/employees/filters");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.departments).toHaveLength(1);
      expect(response.body.data.countries).toHaveLength(1);
    });

    it("returns 500 when filter loading fails", async () => {
      mocks.departmentFindMany.mockRejectedValue(
        new Error("Database error")
      );

      const response = await request(app).get("/api/employees/filters");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /:id", () => {
    it("returns employee details successfully", async () => {
      mocks.employeeFindUnique.mockResolvedValue({
        id: 1,
        firstName: "John",
        lastName: "Doe",
        department: { id: 1, name: "Engineering" },
        country: { id: 1, name: "India" },
        compensation: [],
      });

      const response = await request(app).get("/api/employees/1");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
      expect(response.body.data.firstName).toBe("John");
    });

    it("rejects an invalid employee ID", async () => {
      const response = await request(app).get("/api/employees/abc");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(mocks.employeeFindUnique).not.toHaveBeenCalled();
    });

    it("returns 404 when employee does not exist", async () => {
      mocks.employeeFindUnique.mockResolvedValue(null);

      const response = await request(app).get("/api/employees/99999");

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});
