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
  inbound: InboundShipment[];
  outbound: OutboundShipment[];
  fetchProducts: () => void;
  addProduct: (product: Inventory) => void;
  updateProduct: (product: Inventory) => void;
  deleteProduct: (sku: string) => void;
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
      inbound: [],
      outbound: [],

      fetchProducts: async () => {
        try {
          const products = await fetchProductsAPI();
          set({ inventory: products });
        } catch (error) {
          console.error("Error fetching products:", error);
        }
      },

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

      updateProduct: async (product) => {
        try {
          const updatedProduct = await updateProductAPI(product.sku, product);
          set((state) => ({
            inventory: state.inventory.map((p) =>
              p.sku === updatedProduct.sku ? updatedProduct : p
            ),
          }));
        } catch (error) {
          console.error("Error updating product:", error);
        }
      },

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

      fetchInbound: async () => {
        try {
          const inbound = await fetchInboundShipmentsAPI();
          set({ inbound });
        } catch (error) {
          console.error("Error fetching inbound shipments:", error);
        }
      },

      addInbound: async (inbound) => {
        try {
          const newInbound = await addInboundShipmentAPI(inbound);
          set((state) => ({ inbound: [...state.inbound, newInbound] }));
        } catch (error) {
          console.error("Error adding inbound shipment:", error);
        }
      },

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

      fetchOutbound: async () => {
        try {
          const outbound = await fetchOutboundShipmentsAPI();
          set({ outbound });
        } catch (error) {
          console.error("Error fetching outbound shipments:", error);
        }
      },

      addOutbound: async (outbound) => {
        try {
          const newOutbound = await addOutboundShipmentAPI(outbound);
          set((state) => ({ outbound: [...state.outbound, newOutbound] }));
        } catch (error) {
          console.error("Error adding outbound shipment:", error);
        }
      },

      bulkUploadOutbound: async (outbound) => {
        try {
          const result = await bulkImportOutboundShipmentsAPI(outbound);
          if (result.success && result.updatedShipments) {
            set((state) => ({
              outbound: [...state.outbound, ...result.updatedShipments],
            }));
          }
        } catch (error) {
          console.error("Error bulk uploading outbound shipments:", error);
        }
      },

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
          console.error("Error updating outbound shipment:", error);
        }
      },

      deleteOutbound: async (id) => {
        try {
          await deleteOutboundShipmentAPI(id);
          set((state) => ({
            outbound: state.outbound.filter((o) => o.id.toString() !== id),
          }));
        } catch (error) {
          console.error("Error deleting outbound shipment:", error);
        }
      },

      updateOutboundShippingFee: async (orderId, newShippingFee) => {
        try {
          const outboundShipment = get().outbound.find(
            (shipment) => shipment.order_id === orderId
          );

          const outboundId = outboundShipment?.id;

          const updatedOutbound = await updateOutboundShipmentAPI(outboundId, {
            ...outboundShipment,
            shipping_fee: newShippingFee,
          });

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
