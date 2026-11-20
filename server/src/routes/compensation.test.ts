
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  departmentFindMany: vi.fn(),
  countryFindMany: vi.fn(),
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    compensationHistory: {
      findMany: mocks.findMany,
      count: mocks.count,
      findFirst: mocks.findFirst,
      create: mocks.create,
    },
    employee: {
      findUnique: mocks.findUnique,
    },
    department: {
      findMany: mocks.departmentFindMany,
    },
    country: {
      findMany: mocks.countryFindMany,
    },
  },
}));

import app from "../app";

describe("Compensation API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated compensation records", async () => {
    mocks.findMany.mockResolvedValue([{ id: 1, baseSalary: 50000 }]);
    mocks.count.mockResolvedValue(1);

    const response = await request(app).get("/api/compensation");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.pagination.total).toBe(1);
    expect(mocks.findMany).toHaveBeenCalled();
  });

  it("rejects invalid pagination parameters", async () => {
    const response = await request(app)
      .get("/api/compensation?page=0");

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("returns compensation filter options", async () => {
    mocks.departmentFindMany.mockResolvedValue([{ id: 1, name: "Engineering" }]);
    mocks.countryFindMany.mockResolvedValue([{ id: 1, name: "India", currency: "INR" }]);
    mocks.findMany.mockResolvedValue([{ currency: "INR" }]);

    const response = await request(app)
      .get("/api/compensation/filters");

    expect(response.status).toBe(200);
    expect(response.body.data.departments).toHaveLength(1);
    expect(response.body.data.currencies).toContain("INR");
  });

  it("rejects an invalid employee ID for salary history", async () => {
    const response = await request(app)
      .get("/api/compensation/abc/history");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid employee ID");
  });

  it("returns 404 when employee salary history does not exist", async () => {
    mocks.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .get("/api/compensation/999/history");

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Employee not found");
  });

  it("creates a salary record successfully", async () => {
    mocks.findUnique.mockResolvedValue({
      id: 1,
      country: { currency: "INR" },
    });

    mocks.findFirst.mockResolvedValue(null);

    mocks.create.mockResolvedValue({
      id: 10,
      employeeId: 1,
      baseSalary: 60000,
      currency: "INR",
    });

    const response = await request(app)
      .post("/api/compensation/1")
      .send({
        baseSalary: 60000,
        effectiveDate: "2026-11-20",
        reason: "Annual salary adjustment",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.baseSalary).toBe(60000);
    expect(mocks.create).toHaveBeenCalled();
  });

  it("rejects zero or negative salary values", async () => {
    const response = await request(app)
      .post("/api/compensation/1")
      .send({
        baseSalary: -1000,
        effectiveDate: "2026-11-20",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid salary details");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects salary changes with an earlier effective date", async () => {
    mocks.findUnique.mockResolvedValue({
      id: 1,
      country: { currency: "INR" },
    });

    mocks.findFirst.mockResolvedValue({
      effectiveDate: new Date("2026-11-20"),
    });

    const response = await request(app)
      .post("/api/compensation/1")
      .send({
        baseSalary: 70000,
        effectiveDate: "2026-01-01",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Effective date cannot be earlier than the latest salary record"
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
