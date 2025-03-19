import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Billing, BillingStatus, NewBilling } from "../types";
import {
  addBillingAPI,
  updateBillingAPI,
  deleteBillingAPI,
  markBillingAsPaidAPI,
  cancelBillingAPI,
  fetchBillingsAPI,
} from "../services/api"; // Import API functions
import { useInventoryStore } from ".";

interface BillingState {
  billings: Billing[];
  addBilling: (billing: Billing) => Promise<void>;
  updateBilling: (billing: Billing) => Promise<void>;
  deleteBilling: (billingId: number) => Promise<void>;
  markAsPaid: (billingId: number) => Promise<void>;
  cancelBilling: (billingId: number) => Promise<void>;
  fetchBillings: () => Promise<void>;
  updateShippingFee: (orderId: string, newShippingFee: number) => Promise<void>; // Add this line
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

      addBilling: async (billing: NewBilling) => {
        try {
          // Send the NewBilling object to the backend
          const response = await addBillingAPI(billing);

          // Add the response (which includes id, created_at, updated_at) to the state
          set((state) => ({
            billings: [
              ...state.billings,
              {
                ...response, // Use the response from the backend
                shipping_fee: Number(response.shipping_fee), // Ensure shipping_fee is a number
              },
            ],
          }));
        } catch (error) {
          console.error("Error adding billing:", error);
        }
      },

      updateBilling: async (billing: Billing) => {
        try {
          // Update the billing in the backend
          await updateBillingAPI(billing.id, billing);

          // Update the billing in the state
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

          // Synchronize the shipping fee with OutboundShipments
          const { updateOutboundShippingFee } = useInventoryStore.getState();
          await updateOutboundShippingFee(
            billing.order_id,
            billing.shipping_fee
          );
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

      updateShippingFee: async (orderId: string, newShippingFee: number) => {
        try {
          // Fetch the billing entry by order_id to get the billing id
          const billing = get().billings.find((b) => b.order_id === orderId);

          if (!billing) {
            console.error(`No billing found for order_id: ${orderId}`);
            return;
          }

          const billingId = billing.id; // Get the billing id

          // Update the shipping fee in the backend using the billing id
          const updatedBilling = await updateBillingAPI(billingId, {
            ...billing,
            order_id: billing.order_id, // Ensure order_id is passed
            shipping_fee: newShippingFee,
          });

          // Update the state
          set((state) => ({
            billings: state.billings.map((b) =>
              b.id === billingId
                ? {
                    ...b,
                    shipping_fee: newShippingFee,
                    updated_at: new Date(),
                  }
                : b
            ),
          }));
        } catch (error) {
          console.error("Error updating shipping fee in billing:", error);
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
