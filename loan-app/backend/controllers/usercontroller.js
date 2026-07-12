const User = require("../models/User");
const ErrorHandler = require("../utils/ErrorHandler");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");

// Create Employee
const createEmployee = asyncHandler(async (req, res, next) => {
  const { name, email, password, role, accessKey, permissions } = req.body;

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return next(new ErrorHandler("User with this email already exists", 400));
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role || "EMPLOYEE",
    accessKey,
    permissions: permissions || {
      loans: { view: false, create: false, edit: false, delete: false },
      weeklyLoans: { view: false, create: false, edit: false, delete: false },
      dailyLoans: { view: false, create: false, edit: false, delete: false },
      emis: { view: false, create: false, edit: false, delete: false },
      vehicles: { view: false, create: false, edit: false, delete: false },
      payments: { view: false, create: false, edit: false, delete: false },
      documents: { view: false, create: false, edit: false, delete: false },
      analytics: { view: false, create: false, edit: false, delete: false },
      dashboard: { view: false, create: false, edit: false, delete: false },
      expenses: { view: false, create: false, edit: false, delete: false },
    },
  });

  return sendResponse(
    res,
    201,
    "success",
    "Employee created successfully",
    null,
    {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accessKey: user.accessKey,
    },
  );
});

// Get All Employees
const getEmployees = asyncHandler(async (req, res, next) => {
  const totalUsers = await User.countDocuments();
  const employees = await User.find({}).sort({
    createdAt: -1,
  });

  return sendResponse(
    res,
    200,
    "success",
    "Employees fetched successfully",
    null,
    {
      employees,
      meta: {
        totalUsers,
        employeeCount: employees.length,
      },
    },
  );
});

// Get Single Employee
const getEmployeeById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorHandler("Employee not found", 404));
  }

  return sendResponse(
    res,
    200,
    "success",
    "Employee details fetched",
    null,
    user,
  );
});

// Update Employee
const updateEmployee = asyncHandler(async (req, res, next) => {
  const { name, email, role, accessKey, password, permissions } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new ErrorHandler("Employee not found", 404));
  }

  user.name = name || user.name;
  user.email = email || user.email;
  user.role = role || user.role;
  user.accessKey = accessKey || user.accessKey;
  user.permissions = permissions || user.permissions;

  if (password) {
    user.password = password;
  }

  await user.save();

  return sendResponse(
    res,
    200,
    "success",
    "Employee updated successfully",
    null,
    user,
  );
});

// Delete Employee
const deleteEmployee = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorHandler("Employee not found", 404));
  }

  await user.deleteOne();

  return sendResponse(res, 200, "success", "Employee deleted successfully");
});

// Toggle Employee Status
const toggleEmployeeStatus = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorHandler("Employee not found", 404));
  }

  user.isActive = !user.isActive;
  await user.save();

  return sendResponse(
    res,
    200,
    "success",
    `Employee ${user.isActive ? "activated" : "deactivated"}`,
    null,
    user,
  );
});

module.exports = {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  toggleEmployeeStatus,
};
