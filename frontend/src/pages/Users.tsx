import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  UserPlus,
  MoreVertical,
  Key,
  Edit,
  Ban,
  CheckCircle,
  Trash2,
  Search,
  Download,
} from "lucide-react";
import Modal from "../components/Modal";
import { useForm } from "react-hook-form";
import { User, UserRole } from "../types";
import { useAuthStore } from "../store/auth";
import { useAlertStore } from "../store";
import bcrypt from "bcryptjs";

interface UserData {
  id: string;
  email?: string;
  username?: string;
  role: UserRole;
  vendor_number?: string;
  password?: string;
  isSuspended?: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

interface PasswordResetData {
  newPassword?: string;
  confirmPassword?: string;
}


function Users() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordResetModalOpen, setIsPasswordResetModalOpen] =
    useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "active" | "suspended"
  >("all");
  const menuRef = useRef(null);

  const { register, handleSubmit, reset, watch } = useForm<UserData>();
  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    watch: watchReset,
    reset: resetReset,
  } = useForm<Partial<PasswordResetData>>();
  // Function to clear the password fields
const resetPasswordForm = () => {
  resetReset({ newPassword: "", confirmPassword: "" }); // Ensure you're using the right reset function
};

  const {
    users,
    addUser,
    updateUser,
    deleteUser,
    suspendUser,
    activateUserAccount,
    resetUserPassword,
    fetchUsers,
  } = useAuthStore();
  const { setAlert } = useAlertStore();

  const password = watch("password");
  const newPassword = watchReset("newPassword");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      fetchUsers()
        .then((users) => {
          console.log("Fetched Users:", users);
        })
        .catch((error) => console.error("Error in fetchUsers:", error));
    } else {
      console.warn("No token found, not fetching users.");
    }
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchString = user.username?.toLowerCase() || "";
      const emailSearch = user.email?.toLowerCase() || "";
      const roleSearch = user.role?.toLowerCase() || "";
      const vendorSearch = user.vendor_number?.toLowerCase() || "";

      const statusMatch =
        selectedStatus === "all" ||
        (selectedStatus === "active" && !user.isSuspended) ||
        (selectedStatus === "suspended" && user.isSuspended);

      return (
        (searchString || emailSearch || roleSearch || vendorSearch).includes(
          searchTerm.toLowerCase()
        ) && statusMatch
      );
    });
  }, [users, searchTerm, selectedStatus]);

  const exportUserData = () => {
    const csvContent = [
      ["Userame", "Email", "Role", "Vendor Number", "Status", "Last Login"],
      ...filteredUsers.map((user) => [
        user.username,
        user.email,
        user.role,
        user.vendor_number || "",
        user.isSuspended ? "Suspended" : "Active",
        user.last_login ? new Date(user.last_login).toLocaleString() : "Never",
      ]),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `users_export_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  // Format date for MySQL
  const formatDateForMySQL = (date) => {
    return date.toISOString().replace("T", " ").slice(0, 19); // '2025-01-30 07:53:42'
  };
  // Handle form submission
  const onSubmit = async (data: Partial<UserData>) => {
    try {
      console.log("Form Data:", data); // Log the form data
      if (editingUser) {
        // Update existing user
        const updatedUser: UserData = { ...editingUser, ...data };
        await updateUser(updatedUser);
        setAlert("User updated successfully", "success");
      } else {
        // Add new user
        const newUser: UserData = {
          id: crypto.randomUUID(),
          email: data.email,
          username: data.username,
          role: data.role,
          vendor_number:
            data.role === "vendor" ? data.vendor_number : undefined,
          password: data.password,
          isSuspended: false,
          created_at: formatDateForMySQL(new Date()),
          updated_at: formatDateForMySQL(new Date()),
        };
        console.log("New User", newUser);
        await addUser(newUser);
        setAlert("User added successfully", "success");
      }
      closeModal();
    } catch (error) {
      console.error("Error saving user:", error); // Log error for debugging
      setAlert("Failed to save user", "error");
    }
  };

  const onPasswordReset = async (data: Partial<PasswordResetData>) => {
  if (!selectedUserId) {
    setAlert("No user selected for password reset", "error");
    return;
  }

  if (!data.newPassword || data.newPassword.trim() === "") {
    setAlert("New password is required", "error");
    return;
  }

  if (data.newPassword !== data.confirmPassword) {
    setAlert("New password and confirm password do not match", "error");
    return;
  }

  try {
    const response: any = await resetUserPassword(selectedUserId, data.newPassword);

    // Check if response has a message (ensure backend returns a consistent message)
    if (response && response.message === "Password reset successfully") {
      setAlert("Password reset successfully", "success");
    } else {
      setAlert("Password reset may not have completed successfully", "warning");
    }

    setIsPasswordResetModalOpen(false);
    resetPasswordForm(); // Clear the form fields
  } catch (error) {
    console.error("Error resetting password:", error); // Log error for debugging
    setAlert("Failed to reset password", "error");
  }
};


  const handleSuspendUser = async (userId: string) => {
    try {
      await suspendUser(userId);
      setAlert("User suspended successfully", "success");
      await fetchUsers();
      setOpenActionMenu(null);
    } catch (error) {
      setAlert("Failed to suspend user", "error");
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      await activateUserAccount(userId);
      setAlert("User activated successfully", "success");
      setOpenActionMenu(null);
    } catch (error) {
      setAlert("Failed to activate user", "error");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser(userId);
      setAlert("User deleted successfully", "success");
      setOpenActionMenu(null);
    } catch (error) {
      if (error instanceof Error) {
        setAlert(error.message, "error");
      } else {
        setAlert("Failed to delete user", "error");
      }
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    reset();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Users
        </h1>
        <div className="flex space-x-3">
          <button
            onClick={exportUserData}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
          >
            <Download className="h-5 w-5 mr-2" />
            Export Users
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Add User
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search users by username, email, role, or vendor number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
        <select
          value={selectedStatus}
          onChange={(e) =>
            setSelectedStatus(e.target.value as typeof selectedStatus)
          }
          className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingUser ? "Edit User" : "Add New User"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              {...register("email")}
              disabled={!!editingUser}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm disabled:bg-gray-100 dark:disabled:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Username
            </label>
            <input
              type="text"
              {...register("username")}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Role
            </label>
            <select
              {...register("role")}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
              <option value="vendor">Vendor</option>
            </select>
          </div>
          {watch("role") === "vendor" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Vendor Number
              </label>
              <input
                type="text"
                {...register("vendor_number")}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              />
            </div>
          )}
          {!editingUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <input
                type="password"
                {...register("password")}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              />
            </div>
          )}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-md"
            >
              {editingUser ? "Update" : "Add"} User
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isPasswordResetModalOpen}
        onClose={() => setIsPasswordResetModalOpen(false)}
        title="Reset Password"
      >
        <form
          onSubmit={handleSubmitReset(onPasswordReset)}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              New Password
            </label>
            <input
              type="password"
              {...registerReset("newPassword")}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Confirm Password
            </label>
            <input
              type="password"
              {...registerReset("confirmPassword")}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsPasswordResetModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-md"
            >
              Reset Password
            </button>
          </div>
        </form>
      </Modal>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {user.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === "admin"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                              : user.role === "staff"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          }`}
                        >
                          {user.role}
                        </span>
                        {user.role === "vendor" && user.vendor_number && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            ({user.vendor_number})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.isSuspended
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          }`}
                        >
                          {user.isSuspended ? "Suspended" : "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {user.last_login
                          ? new Date(user.last_login).toLocaleString()
                          : "Never"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative inline-block text-left">
                          <button
                            onClick={() =>
                              setOpenActionMenu(
                                openActionMenu === user.id ? null : user.id
                              )
                            }
                            className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </button>
                        </div>
                        {openActionMenu === user.id && (
                          <div
                            ref={menuRef}
                            className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-10"
                          >
                            <div className="py-1" role="menu">
                              <button
                                onClick={() => {
                                  setSelectedUserId(user.id);
                                  setIsPasswordResetModalOpen(true);
                                  setOpenActionMenu(null);
                                }}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left"
                              >
                                <Key className="h-4 w-4 mr-2" />
                                Reset Password
                              </button>
                              <button
                                onClick={() => {
                                  setEditingUser(user);
                                  setIsModalOpen(true);
                                  setOpenActionMenu(null);
                                }}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  user.isSuspended
                                    ? handleActivateUser(user.id)
                                    : handleSuspendUser(user.id)
                                }
                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left"
                              >
                                {user.isSuspended ? (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                    Activate
                                  </>
                                ) : (
                                  <>
                                    <Ban className="h-4 w-4 mr-2 text-red-500" />
                                    Suspend
                                  </>
                                )}
                              </button>
                              {(user.role !== "admin" ||
                                (user.role === "admin" &&
                                  users.filter((u) => u.role === "admin")
                                    .length > 1)) && (
                                <button
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        "Are you sure you want to delete this user? This action cannot be undone."
                                      )
                                    ) {
                                      handleDeleteUser(user.id);
                                    }
                                  }}
                                  className="flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Account
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Users;
