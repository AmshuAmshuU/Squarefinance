const Todo = require("../models/Todo");
const asyncHandler = require("../utils/asyncHandler");
const sendResponse = require("../utils/response");
const ErrorHandler = require("../utils/ErrorHandler");

// Get all todos (Admin gets all, Employee gets only assigned to them)
const getTodos = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, keyword, status, priority, dueDate } = req.query;
  const skip = (page - 1) * limit;

  let query = {};
  

  // Search by keyword (title or description)
  if (keyword) {
    query.$or = [
      { title: { $regex: keyword, $options: "i" } },
      { description: { $regex: keyword, $options: "i" } },
    ];
  }

  // Filters
  if (status) {
    const statusArray = status.split(",");
    query.status = statusArray.length > 1 ? { $in: statusArray } : statusArray[0];
  }
  if (priority) query.priority = priority;
  if (dueDate) {
    const startOfDay = new Date(dueDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dueDate);
    endOfDay.setHours(23, 59, 59, 999);
    query.dueDate = { $gte: startOfDay, $lte: endOfDay };
  }

  const totalCount = await Todo.countDocuments(query);
  const todos = await Todo.find(query)
    .populate("createdBy", "name")
    .populate("updatedBy", "name")
    .sort({ createdAt: -1 })
    .skip(Number(skip))
    .limit(Number(limit));

  const pagination = {
    totalDocs: totalCount,
    limit: Number(limit),
    totalPages: Math.ceil(totalCount / limit),
    page: Number(page),
    hasPrevPage: page > 1,
    hasNextPage: page < Math.ceil(totalCount / limit),
  };

  const responseData = {
    todos,
    pagination,
  };

  sendResponse(res, 200, "success", "Todos fetched successfully", null, responseData);
});

// Create a new todo
const createTodo = asyncHandler(async (req, res, next) => {
  const { title, description, comment, status, priority, dueDate } = req.body;

  if (!title) {
    return next(new ErrorHandler("Title is required", 400));
  }

  const todo = await Todo.create({
    title,
    description,
    comment,
    status,
    priority,
    dueDate,
    createdBy: req.user._id,
  });

  const populatedTodo = await Todo.findById(todo._id)
    .populate("createdBy", "name");

  sendResponse(res, 201, "success", "Todo created successfully", null, populatedTodo);
});

// Update a todo
const updateTodo = asyncHandler(async (req, res, next) => {
  let todo = await Todo.findById(req.params.id);

  if (!todo) {
    return next(new ErrorHandler("Todo not found", 404));
  }

  const { title, description, comment, status, priority, dueDate } = req.body;
  const updateData = { title, description, comment, status, priority, dueDate, updatedBy: req.user._id };

  todo = await Todo.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  })
    .populate("createdBy", "name")
    .populate("updatedBy", "name");

  sendResponse(res, 200, "success", "Todo updated successfully", null, todo);
});

// Delete a todo
const deleteTodo = asyncHandler(async (req, res, next) => {
  const todo = await Todo.findById(req.params.id);

  if (!todo) {
    return next(new ErrorHandler("Todo not found", 404));
  }

  await todo.deleteOne();

  sendResponse(res, 200, "success", "Todo deleted successfully");
});

module.exports = {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
};
