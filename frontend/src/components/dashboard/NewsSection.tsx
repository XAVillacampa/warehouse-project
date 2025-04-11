import React, { useState, useEffect } from "react";
import { Edit2, Trash2, Plus, AlertCircle } from "lucide-react";
import Modal from "../Modal";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import {
  fetchNews,
  addNews,
  updateNews,
  deleteNews,
} from "../../services/api";
import { useAuthStore } from "../../store/auth";

interface NewsNotification {
  id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

interface NewsFormData {
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
}

function NewsSection() {
  const [notifications, setNotifications] = useState<NewsNotification[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsNotification | null>(null);
  const { user } = useAuthStore();
  const { register, handleSubmit, reset } = useForm<NewsFormData>();

  const isAdmin = user?.role === "admin";

  const priorityColors = {
    low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  // Fetch news notifications on component mount
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await fetchNews();
        console.log("Fetched notifications:", data); // Debugging
        setNotifications(data);
      } catch (error) {
        console.error("Error fetching news:", error);
      }
    };

    fetchNotifications();
  }, []);

  const onSubmit = async (data: NewsFormData) => {
    try {
      if (editingNews) {
        // Update existing news
        const updatedNews: NewsNotification = {
          ...editingNews,
          ...data,
          updatedAt: new Date(),
        };
        await updateNews(editingNews.id, updatedNews);
        setNotifications((prev) =>
          prev.map((n) => (n.id === editingNews.id ? updatedNews : n))
        );
      } else {
        // Add new news
        const newNotification: NewsNotification = {
          id: crypto.randomUUID(),
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user?.username || "Unknown", // Add created_by field
        };
        await addNews(newNotification);
        setNotifications((prev) => [newNotification, ...prev]);
      }
      closeModal();
    } catch (error) {
      console.error("Error saving news:", error);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingNews(null);
    reset();
  };

  const handleEdit = (notification: NewsNotification) => {
    setEditingNews(notification);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this notification?")) {
      try {
        await deleteNews(id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      } catch (error) {
        console.error("Error deleting news:", error);
      }
    }
  };

  const sortedNotifications = [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Announcements
          </h2>
          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Announcement
            </button>
          )}
        </div>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-4">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No notifications
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {isAdmin
                  ? "Get started by adding a new notification."
                  : "Check back later for updates."}
              </p>
            </div>
          ) : (
            sortedNotifications.map((notification) => (
              <div
                key={notification.id}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {notification.title}
                      </h3>
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${priorityColors[notification.priority]
                          }`}
                      >
                        {notification.priority}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {notification.content}
                    </p>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Posted by {notification.createdBy} on{" "}
                      {notification.createdAt && !isNaN(new Date(notification.createdAt).getTime())
                        ? format(new Date(notification.createdAt), "MMM d, yyyy HH:mm")
                        : "Invalid date"}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="ml-4 flex-shrink-0 flex space-x-2">
                      <button
                        onClick={() => handleEdit(notification)}
                        className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="text-red-400 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingNews ? "Edit News" : "Add News"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Title
            </label>
            <input
              type="text"
              {...register("title", { required: true })}
              defaultValue={editingNews?.title}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Content
            </label>
            <textarea
              {...register("content", { required: true })}
              defaultValue={editingNews?.content}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Priority
            </label>
            <select
              {...register("priority", { required: true })}
              defaultValue={editingNews?.priority || "low"}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-md"
            >
              {editingNews ? "Update" : "Add"} News
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default NewsSection;