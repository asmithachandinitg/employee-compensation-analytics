
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();

const compensationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().optional(),
    departmentId: z.coerce.number().int().positive().optional(),
    countryId: z.coerce.number().int().positive().optional(),
    currency: z.string().length(3).optional(),
});

const salaryUpdateSchema = z.object({
    baseSalary: z.coerce.number().positive(),
    effectiveDate: z.coerce.date(),
    reason: z.string().trim().max(500).optional(),
});


// GET compensation records with search and filters
router.get("/", async (req, res) => {
    try {
        const parsed = compensationQuerySchema.safeParse(req.query);

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
            currency,
        } = parsed.data;

        const where = {
            ...(currency ? { currency: currency.toUpperCase() } : {}),
            employee: {
                ...(departmentId ? { departmentId } : {}),
                ...(countryId ? { countryId } : {}),
                ...(search
                    ? {
                        OR: [
                            {
                                firstName: {
                                    contains: search,
                                    mode: "insensitive" as const,
                                },
                            },
                            {
                                lastName: {
                                    contains: search,
                                    mode: "insensitive" as const,
                                },
                            },
                            {
                                employeeCode: {
                                    contains: search,
                                    mode: "insensitive" as const,
                                },
                            },
                            {
                                email: {
                                    contains: search,
                                    mode: "insensitive" as const,
                                },
                            },
                        ],
                    }
                    : {}),
            },
        };

        const [records, total] = await Promise.all([
            prisma.compensationHistory.findMany({
                where,
                include: {
                    employee: {
                        include: {
                            department: true,
                            country: true,
                        },
                    },
                },
                orderBy: [
                    { effectiveDate: "desc" },
                    { createdAt: "desc" },
                ],
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.compensationHistory.count({ where }),
        ]);

        return res.json({
            success: true,
            data: records,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Compensation list error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch compensation records",
        });
    }
});


// GET filter options
router.get("/filters", async (_req, res) => {
    try {
        const [departments, countries, currencies] = await Promise.all([
            prisma.department.findMany({
                select: { id: true, name: true },
                orderBy: { name: "asc" },
            }),
            prisma.country.findMany({
                select: { id: true, name: true, currency: true },
                orderBy: { name: "asc" },
            }),
            prisma.compensationHistory.findMany({
                distinct: ["currency"],
                select: { currency: true },
                orderBy: { currency: "asc" },
            }),
        ]);

        return res.json({
            success: true,
            data: {
                departments,
                countries,
                currencies: currencies.map((item) => item.currency),
            },
        });
    } catch (error) {
        console.error("Compensation filters error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch compensation filters",
        });
    }
});


// GET compensation history for one employee
router.get("/:employeeId/history", async (req, res) => {
    try {
        const employeeId = Number(req.params.employeeId);

        if (!Number.isInteger(employeeId) || employeeId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid employee ID",
            });
        }

        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
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

        return res.json({
            success: true,
            data: employee,
        });
    } catch (error) {
        console.error("Compensation history error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch compensation history",
        });
    }
});


// POST create a new salary record
router.post("/:employeeId", async (req, res) => {
    try {
        const employeeId = Number(req.params.employeeId);
        const parsed = salaryUpdateSchema.safeParse(req.body);

        if (!Number.isInteger(employeeId) || employeeId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid employee ID",
            });
        }

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid salary details",
                errors: parsed.error.flatten(),
            });
        }

        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            include: {
                country: true,
            },
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found",
            });
        }

        const { baseSalary, effectiveDate, reason } = parsed.data;

        const latestRecord = await prisma.compensationHistory.findFirst({
            where: { employeeId },
            orderBy: [
                { effectiveDate: "desc" },
                { createdAt: "desc" },
            ],
        });

        if (latestRecord && effectiveDate < latestRecord.effectiveDate) {
            return res.status(400).json({
                success: false,
                message: "Effective date cannot be earlier than the latest salary record",
            });
        }

        const newRecord = await prisma.compensationHistory.create({
            data: {
                employeeId,
                baseSalary,
                currency: employee.country.currency,
                effectiveDate,
                reason: reason || "Salary adjustment",
            },
        });

        return res.status(201).json({
            success: true,
            message: "Compensation record created successfully",
            data: newRecord,
        });
    } catch (error) {
        console.error("Salary update error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create compensation record",
        });
    }
});

export default router;
