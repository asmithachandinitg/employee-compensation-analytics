
import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seeding...");

  // Clear existing data in dependency order
  await prisma.compensationHistory.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();
  await prisma.country.deleteMany();

  // Create departments
  const departmentNames = [
    "Engineering",
    "Human Resources",
    "Finance",
    "Marketing",
    "Sales",
    "Operations",
    "Product",
    "Customer Support",
  ];

  await prisma.department.createMany({
    data: departmentNames.map((name) => ({ name })),
  });

  console.log("Departments created.");

  // Create countries
  const countries = [
    { name: "India", code: "IN", currency: "INR" },
    { name: "United States", code: "US", currency: "USD" },
    { name: "United Kingdom", code: "GB", currency: "GBP" },
    { name: "Germany", code: "DE", currency: "EUR" },
    { name: "Canada", code: "CA", currency: "CAD" },
    { name: "Australia", code: "AU", currency: "AUD" },
    { name: "Singapore", code: "SG", currency: "SGD" },
    { name: "Japan", code: "JP", currency: "JPY" },
  ];

  await prisma.country.createMany({
    data: countries,
  });

  console.log("Countries created.");


  // Fetch the departments and countries we created
  const departments = await prisma.department.findMany();
  const createdCountries = await prisma.country.findMany();

  const employees = [];

  const employmentTypes = ["FULL_TIME", "PART_TIME", "CONTRACT"];
  const statuses = ["ACTIVE", "ACTIVE", "ACTIVE", "ON_LEAVE", "INACTIVE"];

  for (let i = 1; i <= 10000; i++) {
    const country = createdCountries[Math.floor(Math.random() * createdCountries.length)];
    const department = departments[Math.floor(Math.random() * departments.length)];

    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    employees.push({
      employeeCode: `EMP${String(i).padStart(5, "0")}`,
      firstName,
      lastName,
      email: `employee${i}@example.com`,
      jobTitle: faker.person.jobTitle(),
      employmentType:
        employmentTypes[Math.floor(Math.random() * employmentTypes.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      hireDate: faker.date.between({
        from: "2018-01-01T00:00:00.000Z",
        to: "2026-10-31T00:00:00.000Z",
      }),
      departmentId: department.id,
      countryId: country.id,
    });
  }

  // Insert employees in batches of 1,000
  for (let i = 0; i < employees.length; i += 1000) {
    await prisma.employee.createMany({
      data: employees.slice(i, i + 1000),
    });

    console.log(`Inserted ${Math.min(i + 1000, employees.length)} employees.`);
  }

  console.log("10,000 employees created.");


  // Fetch employees with their countries
  const createdEmployees = await prisma.employee.findMany({
    include: {
      country: true,
    },
  });

  const compensationRecords = createdEmployees.map((employee) => {
    let minSalary = 30000;
    let maxSalary = 150000;

    // Salary ranges are illustrative, in each country's currency
    switch (employee.country.currency) {
      case "USD":
        minSalary = 40000;
        maxSalary = 180000;
        break;
      case "GBP":
        minSalary = 30000;
        maxSalary = 120000;
        break;
      case "EUR":
        minSalary = 35000;
        maxSalary = 130000;
        break;
      case "CAD":
        minSalary = 45000;
        maxSalary = 160000;
        break;
      case "AUD":
        minSalary = 50000;
        maxSalary = 170000;
        break;
      case "SGD":
        minSalary = 40000;
        maxSalary = 150000;
        break;
      case "JPY":
        minSalary = 4000000;
        maxSalary = 12000000;
        break;
    }

    const salary = faker.number.int({
      min: minSalary,
      max: maxSalary,
    });

    return {
      employeeId: employee.id,
      baseSalary: salary,
      currency: employee.country.currency,
      effectiveDate: new Date("2026-01-01"),
      reason: "Initial compensation record",
    };
  });

  // Insert compensation records in batches
  for (let i = 0; i < compensationRecords.length; i += 1000) {
    await prisma.compensationHistory.createMany({
      data: compensationRecords.slice(i, i + 1000),
    });
  }

  console.log("Compensation records created.");

}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
