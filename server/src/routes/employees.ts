
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();

const employeeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  countryId: z.coerce.number().int().positive().optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "INACTIVE"]).optional(),
});

router.get("/", async (req, res) => {
  try {
    const parsed = employeeQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: parsed.error.flatten(),
      });
    }

    const {
      page,
      limit,
      search,
      departmentId,
      countryId,
      status,
    } = parsed.data;

    const where = {
      ...(departmentId && { departmentId }),
      ...(countryId && { countryId }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { employeeCode: { contains: search, mode: "insensitive" as const } },
          { jobTitle: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { firstName: "asc" },
          { lastName: "asc" },
          { id: "asc" },
        ],
        include: {
          department: true,
          country: true,
          compensation: {
            orderBy: { effectiveDate: "desc" },
            take: 1,
          },
        },
      }),
      prisma.employee.count({ where }),
    ]);

    return res.json({
      success: true,
      data: employees,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Employee list error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch employees",
    });
  }
});


router.get("/filters", async (_req, res) => {
  try {
    const [departments, countries] = await Promise.all([
      prisma.department.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: "asc" },
      }),
      prisma.country.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        departments,
        countries,
      },
    });
  } catch (error) {
    console.error("Employee filters error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch filter options",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        country: true,
        compensation: {
          orderBy: { effectiveDate: "desc" },
        },
      },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    return res.json({ success: true, data: employee });
  } catch (error) {
    console.error("Employee detail error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch employee",
    });
  }
});





export default router;
