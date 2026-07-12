"use client";
import React, { useState, useEffect } from "react";
import { getTodos, updateTodo } from "../../services/todoService";
import { useToast } from "../../context/ToastContext";
import { Calendar, Clock, CheckCircle2, Circle, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

const TodoDashboardSection = ({ employeeId = null, title = "Active Tasks" }) => {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchActiveTodos();
  }, [employeeId]);

  const fetchActiveTodos = async () => {
    try {
      setLoading(true);
      // Fetch only "Todo" and "In Progress" tasks
      const params = { limit: 5, status: ["Todo", "In Progress"].join(",") };
      const res = await getTodos(params);
      if (res.data) {
        setTodos(res.data.todos || []);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard todos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === "Todo" ? "In Progress" : "Done";
      await updateTodo(id, { status: newStatus });
      showToast(`Task moved to ${newStatus}`, "success");
      fetchActiveTodos();
    } catch (err) {
      showToast("Failed to update status", "error");
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Loading your tasks...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
        <div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">{title}</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Shared tasks for the whole team
          </p>
        </div>
        <Link 
          href="/admin/todo" 
          className="text-[10px] font-black text-primary uppercase tracking-widest hover:text-blue-700 transition-colors"
        >
          View All Tasks →
        </Link>
      </div>

      <div className="divide-y divide-slate-50">
        {todos.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">No pending tasks found</p>
          </div>
        ) : (
          todos.map((todo) => (
            <Link 
              key={todo._id} 
              href={`/admin/todo?edit=${todo._id}`}
              className="p-5 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-all group block"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                      {todo.title}
                    </h4>
                    <div className="flex items-center gap-2">
                      {todo.priority === "High" && (
                        <span className="flex items-center gap-1 text-[8px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                          <AlertCircle className="w-2 h-2" /> High
                        </span>
                      )}
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                        todo.status === "In Progress" ? "bg-blue-50 text-blue-500" : "bg-slate-100 text-slate-500"
                      }`}>
                        {todo.status}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-[10px] font-bold text-slate-500 line-clamp-1 mb-3">
                    {todo.description || "No description provided"}
                  </p>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-slate-300" />
                      <span className="text-[9px] font-bold text-slate-400 capitalize">
                        {todo.dueDate ? format(new Date(todo.dueDate), "dd MMM") : "No due date"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-300" />
                      <span className="text-[9px] font-bold text-slate-400 capitalize">
                        {format(new Date(todo.createdAt), "dd MMM")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default TodoDashboardSection;
