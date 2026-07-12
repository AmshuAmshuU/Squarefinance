"use client";
import React, { useState, useEffect, useCallback } from "react";
import Modal from "./Modal";
import { getUserFromToken } from "../utils/auth";

const AddTodoModal = ({ isOpen, onClose, onSubmit, submitting, todoToEdit = null }) => {
  const user = getUserFromToken();
  const isEmployee = user?.role === "EMPLOYEE";

  const [formData, setFormData] = useState({
    title: todoToEdit?.title || "",
    description: todoToEdit?.description || "",
    status: todoToEdit?.status || "Todo",
    priority: todoToEdit?.priority || "Medium",
    dueDate: todoToEdit?.dueDate ? new Date(todoToEdit.dueDate).toISOString().split("T")[0] : "",
    comment: todoToEdit?.comment || "",
  });


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };





  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={todoToEdit ? "Edit To-Do" : "Add New To-Do"} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block mb-2">
            Title *
          </label>
          <input
            type="text"
            name="title"
            required
            className="w-full bg-slate-50 border border-transparent rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-300"
            placeholder="ENTER TASK TITLE..."
            value={formData.title}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block mb-2">
            Description
          </label>
          <textarea
            name="description"
            rows="3"
            className={`w-full bg-slate-50 border border-transparent rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-300`}
            placeholder="ENTER TASK DESCRIPTION..."
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block mb-2">
              Status
            </label>
            <select
              name="status"
              className="w-full bg-slate-50 border border-transparent rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="Todo">TODO</option>
              <option value="In Progress">IN PROGRESS</option>
              <option value="Done">DONE</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block mb-2">
              Priority
            </label>
            <select
              name="priority"
              className={`w-full bg-slate-50 border border-transparent rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer`}
              value={formData.priority}
              onChange={handleChange}
            >
              <option value="Low">LOW</option>
              <option value="Medium">MEDIUM</option>
              <option value="High">HIGH</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block mb-2">
            Due Date
          </label>
          <div className="relative">
            <input
              type="date"
              name="dueDate"
               className={`w-full bg-slate-50 border border-transparent rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer`}
              value={formData.dueDate}
              onChange={handleChange}
            />
          </div>
        </div>
 
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block mb-2">
            Task Update / Comment
          </label>
          <textarea
            name="comment"
            rows="2"
            className="w-full bg-slate-50 border border-transparent rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-300"
            placeholder="ADD A COMMENT OR STATUS UPDATE..."
            value={formData.comment}
            onChange={handleChange}
          />
        </div>


        <div className="pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-white font-black py-4 rounded-3xl shadow-lg shadow-primary/30 hover:bg-blue-700 transition-all uppercase tracking-widest text-sm disabled:opacity-50"
          >
            {submitting ? "SUBMITTING..." : todoToEdit ? "UPDATE TASK" : "SUBMIT"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddTodoModal;
