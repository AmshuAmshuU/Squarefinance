import apiHandler from "./api";

export const getTodos = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return await apiHandler(`/api/todos?${queryString}`, {
    method: "GET",
  });
};

export const createTodo = async (todoData) => {
  return await apiHandler("/api/todos", {
    method: "POST",
    body: JSON.stringify(todoData),
  });
};

export const updateTodo = async (id, todoData) => {
  return await apiHandler(`/api/todos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(todoData),
  });
};

export const deleteTodo = async (id) => {
  return await apiHandler(`/api/todos/${id}`, {
    method: "DELETE",
  });
};
