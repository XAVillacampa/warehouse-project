import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import bcrypt from "bcryptjs";
import { User, UserRole } from "../types";
import { verifyToken } from "../utils/token";
import {
  loginAPI,
  fetchUsersAPI,
  registerUserAPI,
  updateUserAPI,
  deleteUserAPI,
  suspendUserAPI,
  activateUserAPI,
  resetPasswordAPI,
} from "../services/api";
import { useEffect } from "react";
import { User as UserType, UserRole as UserRoleType } from "../types";

interface AuthState {
  user: UserType | null;
  users: UserType[];
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  addUser: (user: UserType) => void;
  updateUser: (user: UserType) => void;
  deleteUser: (userId: string) => void;
  suspendUser: (userId: string) => void;
  activateUserAccount: (userId: string) => void;
  resetUserPassword: (userId: string, newPassword: string) => Promise<void>;
  activateUser: (token: string, password: string) => Promise<void>;
  getAllowedVendorNumbers: (user: UserType | null) => string[];
  // initializeTestAccounts: () => Promise<void>;
  isEmailUnique: (email: string, excludeId?: string) => boolean;
  fetchUsers: () => Promise<any[]>;
}

export const hasRole = (
  user: UserType | null,
  roles: UserRoleType[]
): boolean => {
  if (!user) return false;
  return roles.includes(user.role);
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      users: [],
      isAuthenticated: false,

      isEmailUnique: (email: string, excludeId?: string): boolean => {
        const { users } = get();
        return !users.some(
          (u) =>
            u.email.toLowerCase() === email.toLowerCase() &&
            (!excludeId || u.id !== excludeId)
        );
      },

      login: async (email: string, password: string) => {
        try {
          const response = await loginAPI(email, password);
          // Ensure the response has both token and user
          if (!response || !response.token || !response.user) {
            throw new Error("Invalid login response");
          }

          // Set the authenticated user
          set({
            user: { ...response.user, lastLogin: new Date() },
            isAuthenticated: true,
          });
        } catch (error) {
          console.error("Login failed:", error);
          set({ user: null, isAuthenticated: false });
          throw new Error("Login failed");
        }
        const response = await loginAPI(email, password);
        // console.log("Login API response:", response); // Debug log commented out
      },

      logout: () => set({ user: null, isAuthenticated: false }),

      fetchUsers: async () => {
        try {
          const fetchedUsers = await fetchUsersAPI();
          const formattedUsers = fetchedUsers.map((user) => ({
            ...user,
            isSuspended: user.activity_status === "suspended",
          }));
          set({ users: formattedUsers || [] });
          return formattedUsers;
        } catch (error) {
          console.error("Error fetching users:", error);
          return [];
        }
      },

      addUser: async (user: User) => {
        try {
          const response = await registerUserAPI(user);
          if (response.error) {
            throw new Error(response.error);
          }
          set((state) => ({
            users: [...state.users, user],
          }));
        } catch (error) {
          console.error("Error adding user:", error);
        }
      },

      updateUser: async (updatedUser: User) => {
        try {
          const response = await updateUserAPI(updatedUser.id, updatedUser);
          if (response.error) {
            throw new Error(response.error);
          }
          set((state) => ({
            users: state.users.map((u) =>
              u.id === updatedUser.id ? updatedUser : u
            ),
          }));
        } catch (error) {
          console.error("Error updating user:", error);
        }
      },

      deleteUser: async (userId: string) => {
        try {
          const response = await deleteUserAPI(userId);
          if (response.error) {
            throw new Error(response.error);
          }
          set((state) => ({
            users: state.users.filter((u) => u.id !== userId),
          }));
        } catch (error) {
          console.error("Error deleting user:", error);
        }
      },

      suspendUser: async (userId: string) => {
        try {
          const response = await suspendUserAPI(userId);
          if (response.error) {
            throw new Error(response.error);
          }
          set((state) => ({
            users: state.users.map((u) =>
              u.id === userId ? { ...u, isSuspended: true } : u
            ),
          }));
        } catch (error) {
          console.error("Error suspending user:", error);
          // Optionally rollback changes if needed
        }
      },

      activateUserAccount: async (userId: string) => {
        try {
          const response = await activateUserAPI(userId);
          if (response.error) {
            throw new Error(response.error);
          }
          set((state) => ({
            users: state.users.map((u) =>
              u.id === userId ? { ...u, isSuspended: false } : u
            ),
          }));
        } catch (error) {
          console.error("Error activating user:", error);
          // Optionally rollback changes if needed
        }
      },

      resetUserPassword: async (userId: string, newPassword: string) => {
        try {
          const response = await resetPasswordAPI(userId, newPassword);

          // Log the response to inspect its structure
          // console.log("API response from resetPasswordAPI:", response); // Debug log commented out

          if (!response || !response.hashedPassword) {
            throw new Error("Invalid response from password reset API");
          }

          // Update the user's password in the local state
          set((state) => ({
            users: state.users.map((u) =>
              u.id === userId ? { ...u, password: response.hashedPassword } : u
            ),
          }));

          // console.log("Password reset successfully for user:", userId); // Debug log commented out
        } catch (error) {
          console.error("Error resetting password:", error);
          throw error;
        }
      },

      activateUser: async (token: string, password: string) => {
        const decoded = verifyToken(token);
        if (!decoded) {
          throw new Error("Invalid or expired token");
        }

        const { users } = get();
        const user = users.find((u) => u.email === decoded.email);

        if (!user) {
          throw new Error("User not found");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const updatedUser = {
          ...user,
          password: hashedPassword,
          isActive: true,
          invitationToken: null,
        };

        set((state) => ({
          users: state.users.map((u) => (u.id === user.id ? updatedUser : u)),
        }));
      },

      getAllowedVendorNumbers: (user: UserType | null) => {
        if (!user) return [];
        if (user.role === "admin" || user.role === "staff") return ["ALL"];
        if (user.role === "vendor") {
          if (user.vendor_number === "ALL") return ["ALL"];
          return user.vendor_number ? [user.vendor_number] : [];
        }
        return [];
      },

      // initializeTestAccounts: async () => {
      // const { users } = get();
      // if (users.length > 0) return;

      // const hashedPassword = await bcrypt.hash("7seacorp.com", 10);
      // const testAccounts: UserType[] = [
      //   {
      //     id: crypto.randomUUID(),
      //     email: "Admin@7seacorp.com",
      //     name: "Admin User",
      //     role: "admin",
      //     vendor_number: "ALL",
      //     isActive: true,
      //     isSuspended: false,
      //     password: hashedPassword,
      //     createdAt: new Date(),
      //     lastLogin: null,
      //   },
      //   {
      //     id: crypto.randomUUID(),
      //     email: "Staff@7seacorp.com",
      //     name: "Staff User",
      //     role: "staff",
      //     vendor_number: "ALL",
      //     isActive: true,
      //     isSuspended: false,
      //     password: hashedPassword,
      //     createdAt: new Date(),
      //     lastLogin: null,
      //   },
      //   {
      //     id: crypto.randomUUID(),
      //     email: "Vendor@7seacorp.com",
      //     name: "Vendor User",
      //     role: "vendor",
      //     vendor_number: "V001",
      //     isActive: true,
      //     isSuspended: false,
      //     password: hashedPassword,
      //     createdAt: new Date(),
      //     lastLogin: null,
      //   },
      // ];

      // set({ users: testAccounts });
      // },
    }),
    {
      name: "auth-storage",
    }
  )
);
