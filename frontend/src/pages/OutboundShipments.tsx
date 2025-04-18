import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ArrowUpCircle,
  XCircle,
  Search,
  Upload,
  Edit,
  MoreVertical,
  PlusCircle,
} from "lucide-react";
import Modal from "../components/Modal";
import SearchableSelect from "../components/SearchableSelect";
import { useForm, Controller } from "react-hook-form";
import { OutboundShipment, Inventory, Billing, BillingStatus } from "../types";
import { useInventoryStore, useAlertStore } from "../store";
import { useAuthStore } from "../store/auth";
import { useBillingStore } from "../store/billing";
import BulkOutboundShipmentModal from "../components/BulkOutboundShipmentModal";

const SHOW_ACTIONS_FOR_VENDOR = false; // Set to true to show actions for vendors

interface OutboundShipmentFormData {
  order_date: Date;
  order_id: string;
  sku: string;
  item_quantity: number;
  warehouse_code: string;
  stock_check: number;
  customer_name: string;
  country: string;
  address1: string;
  address2?: string;
  zip_code: string;
  city: string;
  state: string;
  tracking_number?: string;
  shipping_fee?: number;
  note?: string;
  image_link?: string;
  vendor_number: string;
}

interface AddTrackingFormData {
  tracking_number: string;
  shipping_fee: number;
}

function OutboundShipments() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [editingShipment, setEditingShipment] =
    useState<OutboundShipment | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isAddTrackingModalOpen, setIsAddTrackingModalOpen] = useState(false);
  const [currentShipment, setCurrentShipment] =
    useState<OutboundShipment | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<OutboundShipmentFormData>();
  const {
    register: registerTracking,
    handleSubmit: handleSubmitTracking,
    reset: resetTracking,
    setValue: setValueTracking,
    formState: { errors: errorsTracking },
  } = useForm<AddTrackingFormData>();
  const {
    inventory,
    outbound,
    fetchProducts,
    fetchOutbound,
    addOutbound,
    updateOutbound,
    deleteOutbound,
    bulkUploadOutbound,
  } = useInventoryStore();
  const { updateShippingFee, addBilling, bulkUploadBillings } =
    useBillingStore();
  const { setAlert } = useAlertStore();
  const { user } = useAuthStore();
  const isVendor = user?.role === "vendor";

  useEffect(() => {
    // Function to handle escape key
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpenActionMenu(null);
      }
    };

    // Function to handle outside click
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenActionMenu(null);
      }
    };

    // Add event listeners
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setOpenActionMenu]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchOutbound();
    // console.log("Fetched outbound: ", outbound); // Debug log commented out
  }, []);

  // Filter products based on user role (vendor or admin)
  const filteredProducts = useMemo(() => {
    const allowedVendorNumbers = user
      ? useAuthStore.getState().getAllowedVendorNumbers(user)
      : [];

    return inventory.filter((product) => {
      if (allowedVendorNumbers.includes("ALL")) {
        return true; // Admin and Staff can view all products
      }
      return allowedVendorNumbers.includes(product.vendor_number || "");
    });
  }, [inventory, user]);

  const productOptions = useMemo(
    () =>
      filteredProducts.map((product) => ({
        value: product.sku,
        label: `[${product.sku}] ${product.product_name}`,
        description: `Stock: ${product.stock_check} | Warehouse Code: ${product.warehouse_code}`,
        vendor_number: product.vendor_number,
        warehouse_code: product.warehouse_code,
      })),
    [filteredProducts]
  );

  const filteredShipments = useMemo(() => {
    const allowedVendorNumbers = user
      ? useAuthStore.getState().getAllowedVendorNumbers(user)
      : [];

    return outbound
      .filter((shipment) => {
        if (allowedVendorNumbers.includes("ALL")) {
          return true; // Admin and Staff can view all shipments
        }
        return allowedVendorNumbers.includes(shipment.vendor_number || "");
      })
      .filter((shipment) => {
        const product = inventory.find((p) => p.sku === shipment.sku);
        const searchString =
          `${product?.sku} ${product?.product_name} ${shipment.order_id} ${product?.vendor_number}`.toLowerCase();

        return searchString.includes(searchTerm.toLowerCase());
      })
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [outbound, inventory, searchTerm, user]);

  // Format the date for MySQL
  const formatDateForMySQL = (date) => {
    return date.toISOString().replace("T", " ").slice(0, 19); // '2025-01-30 07:53:42'
  };

  const onSubmit = async (data: OutboundShipmentFormData) => {
    // Convert order_date from string to Date
    const orderDate = new Date(data.order_date);

    // Format the order_date to 'YYYY-MM-DD'
    const formattedOrderDate = formatDateForMySQL(orderDate);

    // Create a shipment object with necessary details.
    const shipment: OutboundShipment = {
      id: editingShipment?.id || 0,
      ...data,
      order_date: formattedOrderDate, // Assign the formatted Date string
      created_at: editingShipment?.created_at || formatDateForMySQL(new Date()), // Preserve original creation date if editing
      updated_at: formatDateForMySQL(new Date()), // Set the updated date to now
      note: data.note || "",
      tracking_number: data.tracking_number ?? "", // Ensure tracking_number can be null
      shipping_fee: data.shipping_fee ?? 0, // Ensure shipping_fee is always a number
    };

    // console.log("Submitting shipment:", shipment); // Debug log commented out

    // If editing an existing shipment
    if (editingShipment) {
      const updatedShipment = {
        ...editingShipment, // Copy existing data
        ...data, // Apply new data
        order_date: formattedOrderDate, // Ensure order_date is a formatted Date string
        updated_at: formatDateForMySQL(new Date()), // Ensure updated_at is modified
      };

      // Update the existing shipment in the store
      updateOutbound(updatedShipment);

      await fetchOutbound(); // Refresh the outbound shipments

      // Check if the shipping fee has changed
      if (editingShipment.shipping_fee !== data.shipping_fee) {
        await updateShippingFee(data.order_id, data.shipping_fee || 0); // Update the shipping fee in Billings
      }

      setAlert("Outbound shipment updated successfully", "success"); // Show success alert
    } else {
      // For a new shipment, first find the related product by SKU
      const product = inventory.find((p) => p.sku === data.sku);

      // Check if the product quantity is sufficient for the outbound shipment
      if (product && product.stock_check < data.item_quantity) {
        setAlert(
          `Insufficient quantity for SKU ${data.sku} (available: ${product.stock_check})`,
          "error"
        );
        return;
      }

      // Add the new shipment to the store
      try {
        await addOutbound(shipment);
        await fetchOutbound(); // Refresh the outbound shipments
        setAlert("Outbound Shipment created successfully", "success");
        setEditingShipment(null);
      } catch (error) {
        console.error("Error adding outbound shipment:", error);
        setAlert("Error adding outbound shipment", "error");
      }
    }

    closeModal(); // Close the modal after processing
  };

  const onAddTrackingSubmit = async (data: AddTrackingFormData) => {
    if (currentShipment) {
      const updatedShipment = {
        ...currentShipment,
        tracking_number: data.tracking_number,
        shipping_fee: data.shipping_fee,
        updated_at: formatDateForMySQL(new Date()),
      };

      try {
        updateOutbound(updatedShipment);
        setAlert(
          "Tracking number and shipping fee added successfully",
          "success"
        );

        // Add a new billing entry
        const newBilling: Billing = {
          id: 0, // Assuming 0 or a placeholder value, adjust as necessary
          order_id: currentShipment.order_id,
          vendor_number: currentShipment.vendor_number,
          shipping_fee: data.shipping_fee,
          billing_date: formatDateForMySQL(new Date()),
          notes: currentShipment.note || "",
          status: "Pending",
          paid_on: null,
          created_at: formatDateForMySQL(new Date()),
          updated_at: formatDateForMySQL(new Date()),
        };

        addBilling(newBilling); // Add the billing using the store
        setAlert("Billing added successfully", "success");

        closeAddTrackingModal();
      } catch (error) {
        console.error("Error adding tracking number and shipping fee:", error);
        setAlert("Error adding tracking number and shipping fee", "error");
      }
    }
  };

  const handleBulkImport = async (newShipments: OutboundShipment[]) => {
    try {
      // console.log("Bulk uploaded shipments:", newShipments); // Debug log commented out

      // Bulk upload outbound shipments
      await bulkUploadOutbound(newShipments);

      // Filter shipments with tracking numbers
      const shipmentsWithTracking = newShipments.filter(
        (shipment) => shipment.tracking_number
      );

      if (shipmentsWithTracking.length > 0) {
        // Map shipments to billing format
        const billings = shipmentsWithTracking.map((shipment) => ({
          order_id: shipment.order_id,
          vendor_number: shipment.vendor_number,
          shipping_fee: shipment.shipping_fee || 0,
          billing_date: new Date(), // Use a Date object
          notes: shipment.note || "",
          status: "Pending" as BillingStatus, // Explicitly cast to BillingStatus
          paid_on: null,
        }));

        // Bulk upload billings
        await bulkUploadBillings(billings);
      }

      await fetchOutbound(); // Refresh the outbound shipments

      setAlert(
        `Successfully uploaded ${newShipments.length} shipments. ${shipmentsWithTracking.length} added to billings.`,
        "success"
      );
      setIsBulkImportModalOpen(false);
    } catch (error) {
      console.error("Bulk upload failed:", error);
      setAlert("Bulk upload failed", "error");
    }
  };

  const openEditModal = (shipment: OutboundShipment) => {
    setEditingShipment(shipment);
    setValue("order_date", shipment.order_date);
    setValue("order_id", shipment.order_id);
    setValue("sku", shipment.sku);
    setValue("item_quantity", shipment.item_quantity);
    setValue("warehouse_code", shipment.warehouse_code);
    setValue("stock_check", shipment.stock_check);
    setValue("customer_name", shipment.customer_name);
    setValue("country", shipment.country);
    setValue("address1", shipment.address1);
    setValue("address2", shipment.address2 || "");
    setValue("zip_code", shipment.zip_code);
    setValue("city", shipment.city);
    setValue("state", shipment.state);
    setValue("tracking_number", shipment.tracking_number || "");
    resetTracking();
    setValue("shipping_fee", shipment.shipping_fee || 0.0);
    setValue("note", shipment.note || "");
    setValue("image_link", shipment.image_link || "");
    setValue("vendor_number", shipment.vendor_number);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingShipment(null);
    reset();
  };

  // Handle delete shipment
  const handleDelete = async (shipment: OutboundShipment) => {
    try {
      // console.log("Deleting shipment:", shipment); // Debug log commented out
      if (!shipment.id) throw new Error("Shipment ID not found");
      await deleteOutbound(shipment.id.toString());
      setAlert("Outbound shipment deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting outbound shipment:", error);
      setAlert("Error deleting outbound shipment", "error");
    }
  };

  const openNewOutboundModal = () => {
    reset();
    setValue("shipping_fee", 0.0);
    setIsModalOpen(true);
  };

  const openAddTrackingModal = (shipment: OutboundShipment) => {
    setCurrentShipment(shipment);
    setValueTracking("tracking_number", shipment.tracking_number || "");
    setValueTracking("shipping_fee", shipment.shipping_fee || 0);
    setIsAddTrackingModalOpen(true);
  };

  const closeAddTrackingModal = () => {
    setIsAddTrackingModalOpen(false);
    setCurrentShipment(null);
    reset();
  };

  const handleActionMenuClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    shipmentId: string
  ) => {
    const buttonRect = (
      event.currentTarget as HTMLElement
    ).getBoundingClientRect();
    setDropdownPosition({
      top: buttonRect.bottom, // Position the dropdown directly below the button
      left: buttonRect.left + buttonRect.width / 2, // Center horizontally relative to the button
    });
    setOpenActionMenu(openActionMenu === shipmentId ? null : shipmentId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Outbound Shipment
        </h1>
        {!isVendor && (
          <div className="flex space-x-3">
            <button
              onClick={openNewOutboundModal}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <ArrowUpCircle className="h-5 w-5 mr-2" />
              New Outbound
            </button>
            <button
              onClick={() => setIsBulkImportModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              <Upload className="h-5 w-5 mr-2" />
              Bulk Import
            </button>

            {isBulkImportModalOpen && (
              <Modal
                isOpen={isBulkImportModalOpen}
                onClose={() => setIsBulkImportModalOpen(false)}
                title="Bulk Import Outbound Shipments"
              >
                <BulkOutboundShipmentModal
                  onClose={() => setIsBulkImportModalOpen(false)}
                  onImport={handleBulkImport}
                  products={filteredProducts}
                />
              </Modal>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search workflows by SKU, workflow number, or vendor number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={`${editingShipment ? "Edit" : "New"} Outbound Shipment`}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Order Date
            </label>
            <input
              type="date"
              {...register("order_date", {
                required: "Order date is required",
              })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
            {errors.order_date && (
              <p className="text-red-500">{errors.order_date.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              SKU
            </label>
            <Controller
              name="sku"
              control={control}
              rules={{ required: "Please select an SKU" }}
              render={({ field, fieldState }) => (
                <>
                  <SearchableSelect
                    options={productOptions}
                    value={field.value}
                    onChange={(value, vendor_number, warehouse_code) => {
                      field.onChange(value); // Only pass the value, not vendor_number
                      setValue("vendor_number", vendor_number); // Use setValue to update form state
                      setValue("warehouse_code", warehouse_code);
                    }}
                    placeholder="Search and select a product..."
                    className="mt-1"
                  />
                  {fieldState.error && (
                    <p className="text-red-500">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Quantity
            </label>
            <input
              type="number"
              {...register("item_quantity", { required: true, min: 1 })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Customer Name
            </label>
            <input
              type="text"
              {...register("customer_name")} // No need for validation
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Country
              </label>
              <input
                type="text"
                {...register("country")} // No need for validation
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                City
              </label>
              <input
                type="text"
                {...register("city")} // No need for validation
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                State
              </label>
              <input
                type="text"
                {...register("state")} // No need for validation
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Address 1
            </label>
            <input
              type="text"
              {...register("address1")} // No need for validation
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Address 2
            </label>
            <input
              type="text"
              {...register("address2")} // No need for validation
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Zip Code
            </label>
            <input
              type="text"
              {...register("zip_code")} // No need for validation
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tracking Number
            </label>
            <input
              type="text"
              {...register("tracking_number")} // No validation required
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Shipping Fee
            </label>
            <input
              type="number"
              step="0.01"
              {...register("shipping_fee", { min: 0.0 })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Notes
            </label>
            <textarea
              {...register("note")}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Image Link
            </label>
            <input
              type="text"
              {...register("image_link")}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
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
              {editingShipment ? "Update" : "Create"} Shipment
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isAddTrackingModalOpen}
        onClose={closeAddTrackingModal}
        title="Add Tracking Number and Shipping Fee"
      >
        <form
          onSubmit={handleSubmitTracking(onAddTrackingSubmit)}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tracking Number
            </label>
            <input
              type="text"
              {...registerTracking("tracking_number", { required: true })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
            {errors.tracking_number && (
              <p className="text-red-500">{errors.tracking_number.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Shipping Fee
            </label>
            <input
              type="number"
              step="0.01"
              {...registerTracking("shipping_fee", { required: true, min: 0 })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
            {errors.shipping_fee && (
              <p className="text-red-500">{errors.shipping_fee.message}</p>
            )}
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={closeAddTrackingModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-md"
            >
              Add
            </button>
          </div>
        </form>
      </Modal>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 overflow-auto no-scrollbar">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Order Date
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Customer Name
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tracking Number
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Shipping Fee
                  </th>
                  {(!isVendor || SHOW_ACTIONS_FOR_VENDOR) && (
                    <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredShipments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={!isVendor || SHOW_ACTIONS_FOR_VENDOR ? 8 : 7}
                      className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      No workflows found. Create a new inbound or outbound
                      workflow to get started.
                    </td>
                  </tr>
                ) : (
                  filteredShipments.map((shipments) => {
                    const product = inventory.find(
                      (p) => p.sku === shipments.sku
                    );
                    return (
                      <tr key={shipments.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                          {shipments.order_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                          {new Date(shipments.order_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                          {shipments.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                          {shipments.item_quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                          {shipments.customer_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                          {shipments.tracking_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                          ${shipments.shipping_fee}
                        </td>
                        {(!isVendor || SHOW_ACTIONS_FOR_VENDOR) && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="relative inline-block text-left">
                              <button
                                onClick={(event) =>
                                  handleActionMenuClick(
                                    event,
                                    shipments.id?.toString()
                                  )
                                }
                                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 text-center"
                              >
                                <MoreVertical className="h-5 w-5" />
                              </button>
                            </div>
                            {/* Action menu */}
                            {openActionMenu === shipments.id?.toString() &&
                              dropdownPosition && (
                                <div
                                  ref={menuRef}
                                  className="w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-50"
                                  style={{
                                    position: "fixed", // Ensure the dropdown is positioned relative to the viewport
                                    top: dropdownPosition.top,
                                    left: dropdownPosition.left,
                                    transform: "translateX(-50%)", // Center the dropdown horizontally
                                  }}
                                >
                                  <ul
                                    className="py-1"
                                    role="menu"
                                    aria-orientation="vertical"
                                  >
                                    <li
                                      onClick={() => {
                                        openEditModal(shipments);
                                        setOpenActionMenu(null);
                                      }}
                                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left cursor-pointer"
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </li>

                                    {!shipments.tracking_number &&
                                      (Number(shipments.shipping_fee) === 0 ||
                                        shipments.shipping_fee === null) && (
                                        <li
                                          onClick={() => {
                                            openAddTrackingModal(shipments);
                                            setOpenActionMenu(null);
                                          }}
                                          className="flex items-center px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left cursor-pointer"
                                        >
                                          <PlusCircle className="h-4 w-4 mr-2" />
                                          Add Tracking Number
                                        </li>
                                      )}

                                    <li
                                      onClick={() => {
                                        handleDelete(shipments);
                                        setOpenActionMenu(null);
                                      }}
                                      className="flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left cursor-pointer"
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Delete
                                    </li>
                                  </ul>
                                </div>
                              )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OutboundShipments;
