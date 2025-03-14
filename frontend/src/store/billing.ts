import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Billing, BillingStatus } from "../types";
import {
  addBillingAPI,
  updateBillingAPI,
  deleteBillingAPI,
  markBillingAsPaidAPI,
  cancelBillingAPI,
  fetchBillingsAPI,
} from "../services/api"; // Import API functions

interface BillingState {
  billings: Billing[];
  addBilling: (billing: Billing) => Promise<void>;
  updateBilling: (billing: Billing) => Promise<void>;
  deleteBilling: (billingId: string) => Promise<void>;
  markAsPaid: (billingId: string) => Promise<void>;
  cancelBilling: (billingId: string) => Promise<void>;
  fetchBillings: () => Promise<void>;
}

export const useBillingStore = create<BillingState>()(
  persist(
    (set, get) => ({
      billings: [],

      // Fetch Billings
      fetchBillings: async () => {
        try {
          const response = await fetchBillingsAPI();
          set({ billings: response });
        } catch (error) {
          console.error("Error fetching billings:", error);
        }
      },

      addBilling: async (billing) => {
        try {
          const response = await addBillingAPI(billing); // Send request to backend
          set((state) => ({
            billings: [
              ...state.billings,
              { ...response, shipping_fee: Number(response.shipping_fee) },
            ],
          }));
        } catch (error) {
          console.error("Error adding billing:", error);
        }
      },

      updateBilling: async (billing) => {
        try {
          await updateBillingAPI(billing.id, billing); // Update backend
          set((state) => ({
            billings: state.billings.map((b) =>
              b.id === billing.id
                ? {
                    ...billing,
                    shipping_fee: Number(billing.shipping_fee),
                    updated_at: new Date(),
                  }
                : b
            ),
          }));
        } catch (error) {
          console.error("Error updating billing:", error);
        }
      },

      deleteBilling: async (billingId) => {
        try {
          await deleteBillingAPI(billingId); // Delete from backend
          set((state) => ({
            billings: state.billings.filter((b) => b.id !== billingId),
          }));
        } catch (error) {
          console.error("Error deleting billing:", error);
        }
      },

      markAsPaid: async (billingId) => {
        try {
          await markBillingAsPaidAPI(billingId); // Mark as paid in backend
          set((state) => ({
            billings: state.billings.map((b) =>
              b.id === billingId
                ? {
                    ...b,
                    status: "Paid" as BillingStatus,
                    paid_on: new Date(),
                    updated_at: new Date(),
                  }
                : b
            ),
          }));
        } catch (error) {
          console.error("Error marking billing as paid:", error);
        }
      },

      cancelBilling: async (billingId) => {
        try {
          await cancelBillingAPI(billingId); // Cancel in backend
          set((state) => ({
            billings: state.billings.map((b) =>
              b.id === billingId
                ? {
                    ...b,
                    status: "Cancelled" as BillingStatus,
                    updated_at: new Date(),
                  }
                : b
            ),
          }));
        } catch (error) {
          console.error("Error cancelling billing:", error);
        }
      },
    }),
    {
      name: "billing-storage",
      onRehydrateStorage: () => (state) => {
        if (state?.billings) {
          state.billings = state.billings.map((billing) => ({
            ...billing,
            shipping_fee: Number(billing.shipping_fee),
            created_at: new Date(billing.created_at),
            updated_at: new Date(billing.updated_at),
            billing_date: new Date(billing.billing_date),
            paid_on: billing.paid_on ? new Date(billing.paid_on) : undefined,
          }));
        }
      },
    }
  )
);
