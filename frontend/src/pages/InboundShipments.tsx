import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle,
  XCircle,
  Search,
  Upload,
  Edit,
  MoreVertical,
  Warehouse,
} from "lucide-react";
import Modal from "../components/Modal";
import SearchableSelect from "../components/SearchableSelect";
import { useForm, Controller } from "react-hook-form";
import { InboundShipment, Inventory } from "../types";
import { useInventoryStore, useAlertStore } from "../store";
import { useAuthStore } from "../store/auth";
import BulkInboundShipmentModal from "../components/BulkInboundShipmentModal";
import { generateWorkflowNumber } from "../utils/workflow";

interface InboundShipmentFormData {
  shipping_date: string;
  box_label: string;
  sku: string;
  warehouse_code: string;
  item_quantity: number;
  arriving_date: string;
  tracking_number: string;
  vendor_number?: string;
  note?: string;
  created_at: Date;
  updated_at: Date;
}

function InboundShipments() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"inbound" | "outbound">("inbound");
  const [editingShipment, setEditingShipment] =
    useState<InboundShipment | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  // const [allProducts, setAllProducts] = useState([]);
  // const [allTransactions, setAllTransactions] = useState([]);
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<InboundShipmentFormData>();
  const {
    inventory,
    inbound,
    fetchProducts,
    fetchInbound,
    addInbound,
    updateInbound,
    deleteInbound,
    bulkUploadInbound,
  } = useInventoryStore();
  const { setAlert } = useAlertStore();
  const { user } = useAuthStore();

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
    fetchInbound();
    // console.log("Fetched indbound: ", inbound);
  }, []);

  const productOptions = useMemo(
    () =>
      inventory.map((product) => ({
        value: product.sku,
        label: `[${product.sku}] ${product.product_name}`,
        description: `Stock: ${product.stock_check} | Warehouse Code: ${product.warehouse_code}`,
        vendor_number: product.vendor_number,
        warehouse_code: product.warehouse_code,
      })),
    [inventory]
  );

  const filteredShipments = useMemo(() => {
    // console.log("All Products:", allProducts);
    // console.log("Transactions:", allTransactions);
    // console.log("Is Array?", Array.isArray(allTransactions));
    return inbound
      .filter((shipment) => {
        const product = inventory.find((p) => p.sku === shipment.sku);
        const searchString =
          `${product?.sku} ${product?.product_name} ${shipment.tracking_number} ${product?.vendor_number}`.toLowerCase();

        return searchString.includes(searchTerm.toLowerCase());
      })
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [inbound, inventory, searchTerm]);

  // Format the date for MySQL
  const formatDateForMySQL = (date) => {
    return date.toISOString().replace("T", " ").slice(0, 19); // '2025-01-30 07:53:42'
  };

  const onSubmit = async (data: InboundShipmentFormData) => {
    // Convert shipment_date from string to Date
    const shippingDate = new Date(data.shipping_date);

    // Format the shipment_date to 'YYYY-MM-DD'
    const formattedShippingDate = formatDateForMySQL(shippingDate);

    // Create a shipment object with necessary details.
    const shipment: InboundShipment = {
      id: editingShipment?.id || 0,
      ...data,
      shipping_date: formattedShippingDate, // Assign the formatted Date string
      created_at: editingShipment?.created_at || formatDateForMySQL(new Date()), // Preserve original creation date if editing
      updated_at: formatDateForMySQL(new Date()), // Set the updated date to now
      note: data.note || "",
    };

    // Log the shipment data to debug
    console.log("Submitting shipment:", shipment);

    // If editing an existing shipment
    if (editingShipment) {
      const updatedShipment = {
        ...editingShipment, // Copy existing data
        ...data, // Apply new data
        shipment_date: formattedShippingDate, // Ensure shipment_date is a formatted Date string
        updated_at: formatDateForMySQL(new Date()), // Ensure updated_at is modified
      };

      // Update the existing shipment instead of adding a new one
      updateInbound(updatedShipment); // Update the shipment in the store
      setAlert("Inbound shipment updated successfully", "success"); // Show success alert
    } else {
      // For a new shipment, first find the related product by SKU
      const product = inventory.find((p) => p.sku === data.sku);

      // Check if the product quantity is sufficient for the inbound shipment
      if (product && product.stock_check < data.item_quantity) {
        setAlert(
          `Insufficient quantity for SKU ${data.sku} (available: ${product.stock_check})`,
          "error"
        );
        return;
      }

      // Add the new shipment to the store
      try {
        await addInbound(shipment);
        // Show success alert
        setAlert("Inbound Shipment created successfully", "success");
        setEditingShipment(null);
      } catch (error) {
        console.error("Error adding inbound shipment:", error);
        setAlert("Error adding inbound shipment", "error");
      }
    }

    closeModal(); // Close the modal after processing
  };

  const handleBulkImport = async (newTransactions: InboundShipment[]) => {
    try {
      // Call the API endpoint with the whole array of transactions
      await bulkUploadInbound(newTransactions);
      // console.log("Bulk uploaded transactions:", newTransactions);

      setAlert(
        `Successfully sent ${newTransactions.length} requests`,
        "success"
      );
      setIsBulkImportModalOpen(false);
    } catch (error) {
      console.error("Bulk upload failed:", error);
      setAlert("Bulk upload failed. Please try again.", "error");
    }
  };

  const openEditModal = (shipment: InboundShipment) => {
    setEditingShipment(shipment);
    setValue("shipping_date", shipment.shipping_date);
    setValue("box_label", shipment.box_label);
    setValue("sku", shipment.sku);
    setValue("warehouse_code", shipment.warehouse_code);
    setValue("item_quantity", shipment.item_quantity);
    setValue("arriving_date", shipment.arriving_date);
    setValue("tracking_number", shipment.tracking_number);
    setValue("vendor_number", shipment.vendor_number);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingShipment(null);
    reset();
  };

  // Handle delete shipment
  const handleDelete = async (shipment: InboundShipment) => {
    try {
      console.log("Deleting shipment:", shipment);
      if (!shipment.id) throw new Error("Shipment ID not found");
      await deleteInbound(shipment.id);
      setAlert("Inbound shipment deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting inbound shipment:", error);
      setAlert("Error deleting inbound shipment", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Inbound Shipment
        </h1>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              setModalType("inbound");
              setIsModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <ArrowUpCircle className="h-5 w-5 mr-2" />
            New Inbound
          </button>
          <button
            onClick={() => setIsBulkImportModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            <Upload className="h-5 w-5 mr-2" />
            Bulk Import
          </button>
        </div>
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
        title={`${editingShipment ? "Edit" : "New"} Inbound Shipment`}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Shipping Date
            </label>
            <input
              type="date"
              {...register("shipping_date", {
                required: "Shipping date is required",
              })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
            {errors.shipping_date && (
              <p className="text-red-500">{errors.shipping_date.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Box Label
            </label>
            <input
              type="text"
              {...register("box_label")} // No need for validation
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
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
              Arriving Date
            </label>
            <input
              type="date"
              {...register("arriving_date", { required: true, min: 1 })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tracking Number
            </label>
            <input
              type="text"
              {...register("tracking_number")} // No need for validation
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
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        title="Bulk Import Inbound Shipments"
      >
        <BulkInboundShipmentModal
          onClose={() => setIsBulkImportModalOpen(false)}
          onImport={handleBulkImport}
          products={inventory}
        />
      </Modal>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Shipping Date
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Box Label
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Arriving Date
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tracking number
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredShipments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      No workflows found. Create a new inbound workflow to get
                      started.
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
                          {new Date(
                            shipments.shipping_date
                          ).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                          {shipments.box_label}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                          {shipments.sku}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                          {shipments.item_quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                          {new Date(
                            shipments.arriving_date
                          ).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                          {shipments.tracking_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="relative inline-block text-left">
                            <button
                              onClick={() =>
                                setOpenActionMenu(
                                  openActionMenu ===
                                    shipments.id?.toString()
                                    ? null
                                    : shipments.id?.toString()
                                )
                              }
                              className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 text-center"
                            >
                              <MoreVertical className="h-5 w-5" />
                            </button>
                          </div>

                          {/* Action menu */}
                          {openActionMenu ===
                            shipments.id?.toString() && (
                            <div
                              ref={menuRef}
                              className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-10"
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

export default InboundShipments;
