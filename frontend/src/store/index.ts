import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import {
  AlertType,
  InboundShipment,
  OutboundShipment,
  Inventory,
} from "../types";
import {
  fetchProductsAPI,
  addProductAPI,
  updateProductAPI,
  deleteProductAPI,
  fetchInboundShipmentsAPI,
  addInboundShipmentAPI,
  updateInboundShipmentAPI,
  deleteInboundShipmentAPI,
  bulkImportInboundShipmentsAPI,
  fetchOutboundShipmentsAPI,
  addOutboundShipmentAPI,
  updateOutboundShipmentAPI,
  deleteOutboundShipmentAPI,
  bulkImportOutboundShipmentsAPI,
} from "../services/api";
import { useBillingStore } from "./billing";

interface AlertState {
  message: string | null;
  type: AlertType;
  showAlert: boolean;
  setAlert: (message: string, type: AlertType) => void;
  clearAlert: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  message: null,
  type: "info",
  showAlert: false,
  setAlert: (message, type) => set({ message, type, showAlert: true }),
  clearAlert: () => set({ message: null, showAlert: false }),
}));

interface InventoryState {
  inventory: Inventory[];
  outbound: OutboundShipment[];
  inbound: InboundShipment[];
  addProduct: (product: Inventory) => void;
  updateProduct: (product: Inventory) => void;
  deleteProduct: (sku: string) => void;
  fetchProducts: () => void;
  fetchInbound: () => void;
  addInbound: (inbound: InboundShipment) => void;
  bulkUploadInbound: (inbound: InboundShipment[]) => void;
  updateInbound: (inbound: InboundShipment) => void;
  deleteInbound: (id: number) => void;
  fetchOutbound: () => void;
  addOutbound: (outbound: OutboundShipment) => void;
  bulkUploadOutbound: (outbound: OutboundShipment[]) => void;
  updateOutbound: (outbound: OutboundShipment) => void;
  deleteOutbound: (id: string) => void;
  updateOutboundShippingFee: (
    orderId: string,
    newShippingFee: number
  ) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      inventory: [],
      transactions: [],
      inbound: [],
      outbound: [],

      // Fetch products from backend
      fetchProducts: async () => {
        try {
          const products = await fetchProductsAPI();
          // console.log(products);
          set({ inventory: products });
        } catch (error) {
          console.error("Error fetching products:", error);
        }
      },

      // Add a new product
      addProduct: async (product) => {
        try {
          const newProduct = await addProductAPI(product);
          set((state) => ({
            inventory: [...state.inventory, newProduct],
          }));
        } catch (error) {
          console.error("Error adding product:", error);
        }
      },

      // Update a product
      updateProduct: async (product) => {
        try {
          const updatedProduct = await updateProductAPI(product.sku, product);
          set((state) => ({
            inventory: state.inventory.map((p) =>
              p.sku === updatedProduct.sku ? updatedProduct : p
            ),
          }));
        } catch (error) {
          // If API fails, revert the change in state
          set((state) => ({
            inventory: state.inventory.map((p) =>
              p.sku === product.sku
                ? (state.inventory.find(
                    (prod) => prod.sku === product.sku
                  ) as Inventory)
                : p
            ),
          }));
          console.error("Error updating product:", error);
        }
      },

      // Delete a product
      deleteProduct: async (sku) => {
        try {
          await deleteProductAPI(sku);
          set((state) => ({
            inventory: state.inventory.filter((p) => p.sku !== sku),
          }));
        } catch (error) {
          console.error("Error deleting product:", error);
        }
      },

      // Fetch inbound shipments
      fetchInbound: async () => {
        try {
          const inbound = await fetchInboundShipmentsAPI();
          set({ inbound });
        } catch (error) {
          console.error("Error fetching inbound shipments:", error);
        }
      },

      // Add a new inbound shipment
      addInbound: async (inbound) => {
        try {
          const newInbound = await addInboundShipmentAPI(inbound);
          set((state) => ({ inbound: [...state.inbound, newInbound] }));
        } catch (error) {
          console.error("Error adding inbound shipment:", error);
        }
      },

      // Bulk import inbound shipments
      bulkUploadInbound: async (inbound) => {
        try {
          const result = await bulkImportInboundShipmentsAPI(inbound);
          if (result.success && result.inbound) {
            set((state) => ({
              inbound: [...state.inbound, ...result.inbound],
            }));
          }
        } catch (error) {
          console.error("Error bulk uploading inbound shipments:", error);
        }
      },

      // Update an inbound shipment
      updateInbound: async (inbound) => {
        try {
          const updatedInbound = await updateInboundShipmentAPI(
            inbound.id,
            inbound
          );
          set((state) => ({
            inbound: state.inbound.map((i) =>
              i.id === updatedInbound.id ? updatedInbound : i
            ),
          }));
        } catch (error) {
          console.error("Error updating inbound shipment:", error);
        }
      },

      // Delete an inbound shipment
      deleteInbound: async (id) => {
        try {
          await deleteInboundShipmentAPI(id);
          set((state) => ({
            inbound: state.inbound.filter((i) => i.id !== id),
          }));
        } catch (error) {
          console.error("Error deleting inbound shipment:", error);
        }
      },

      // Fetch outbound shipments
      fetchOutbound: async () => {
        try {
          const outbound = await fetchOutboundShipmentsAPI();
          // console.log("Fetched outbound: ",outbound);
          set({ outbound });
        } catch (error) {
          console.error("Error fetching outbound:", error);
        }
      },

      // Add a new outbound shipment
      addOutbound: async (outbound) => {
        try {
          const newOutbound = await addOutboundShipmentAPI(outbound);
          set((state) => ({ outbound: [...state.outbound, newOutbound] }));
        } catch (error) {
          console.error("Error adding outbound:", error);
        }
      },

      // Bulk import outbound shipments
      bulkUploadOutbound: async (outbound) => {
        try {
          // Call the backend API to bulk upload outbound shipments
          const result = await bulkImportOutboundShipmentsAPI(outbound);

          // Check if the API call was successful and contains updated shipments
          if (result.success && result.updatedShipments) {
            // Store the updated shipments in a variable
            const updatedShipments = result.updatedShipments;

            // Update the state with the new shipments
            set((state) => ({
              outbound: [...state.outbound, ...updatedShipments],
            }));

            // Return the updated shipments for further use
            return updatedShipments;
          }

          return [];
        } catch (error) {
          console.error("Error bulk uploading outbound shipments:", error);
          return [];
        }
      },

      // Update an outbound shipment
      updateOutbound: async (outbound) => {
        try {
          const updatedOutbound = await updateOutboundShipmentAPI(
            outbound.id,
            outbound
          );
          set((state) => ({
            outbound: state.outbound.map((o) =>
              o.id === updatedOutbound.id ? updatedOutbound : o
            ),
          }));
        } catch (error) {
          console.error("Error updating outbound:", error);
        }
      },

      // Delete an outbound shipment
      deleteOutbound: async (id) => {
        try {
          await deleteOutboundShipmentAPI(id);
          set((state) => ({
            outbound: state.outbound.filter((o) => o.id.toString() !== id),
          }));
        } catch (error) {
          console.error("Error deleting outbound:", error);
        }
      },

      updateOutboundShippingFee: async (
        orderId: string,
        newShippingFee: number
      ) => {
        try {
          const outboundShipment = get().outbound.find(
            (shipment) => shipment.order_id === orderId
          );

          const outboundId = outboundShipment?.id;

          // Update the shipping fee in the backend
          const updatedOutbound = await updateOutboundShipmentAPI(outboundId, {
            ...outboundShipment,
            shipping_fee: newShippingFee,
          });

          // Update the state
          set((state) => ({
            outbound: state.outbound.map((shipment) =>
              shipment.order_id === orderId
                ? {
                    ...shipment,
                    shipping_fee: newShippingFee,
                    updated_at: new Date(),
                  }
                : shipment
            ),
          }));
        } catch (error) {
          console.error(
            "Error updating shipping fee in outbound shipment:",
            error
          );
        }
      },
    }),
    {
      name: "inventory-storage",
    }
  )
);
