import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  Upload,
  Download,
  Edit,
  Trash2,
  CheckCircle,
  MoreVertical,
  XCircle,
} from "lucide-react";
import Modal from "../components/Modal";
import SearchableSelect from "../components/SearchableSelect";
import { useForm, Controller } from "react-hook-form";
import { Billing, BillingStatus, NewBilling } from "../types";
import { useBillingStore } from "../store/billing";
import { useInventoryStore, useAlertStore } from "../store";
import { useAuthStore } from "../store/auth";
import BulkBillingModal from "../components/BulkBillingModal";
import { set } from "date-fns";

interface BillingFormData {
  order_id: string;
  vendor_number: string;
  shipping_fee: number;
  billing_date: Date;
  notes?: string;
  status: BillingStatus;
  paid_on?: Date | null;
}

function Billings() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [editingBilling, setEditingBilling] = useState<Billing | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<BillingStatus | "All">(
    "All"
  );
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const { register, handleSubmit, reset, control, setValue } =
    useForm<BillingFormData>();
  const {
    billings,
    addBilling,
    updateBilling,
    deleteBilling,
    markAsPaid,
    cancelBilling,
    fetchBillings,
  } = useBillingStore();
  const { outbound, fetchOutbound } = useInventoryStore();
  const { user, getAllowedVendorNumbers } = useAuthStore();
  const { setAlert } = useAlertStore();

  const allowedVendorNumbers = getAllowedVendorNumbers(user);
  const canEdit = user?.role !== "vendor";
  const menuRef = useRef<HTMLDivElement>(null);

  interface OutboundOption {
    value: string;
    label: string;
    vendor_number: string;
    warehouse_code: string;
  }

  const [outboundOptions, setOutboundOptions] = useState<OutboundOption[]>([]);

  const statusClasses: Record<string, string> = {
    Pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    Paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    Cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  useEffect(() => {
    const fetchOutboundData = () => {
      fetchOutbound();

      setOutboundOptions(
        outbound.map((order) => ({
          value: order.order_id,
          label: order.order_id,
          vendor_number: order.vendor_number || "", // Ensure it's never null
          warehouse_code: order.warehouse_code || "", // Add warehouse_code here
        }))
      );
    };
    fetchOutboundData();
    // console.log("Fetched outbound data:", outbound); // Debug log commented out
  }, [fetchOutbound, outbound]);

  // Fetch billings data using useEffect
  useEffect(() => {
    fetchBillings();
  }, [fetchBillings]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenActionMenu(null); // Close the dropdown on Escape key press
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenActionMenu(null); // Close the dropdown if clicked outside
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  // Format the date for MySQL
  const formatDateForMySQL = (date) => {
    return date.toISOString().replace("T", " ").slice(0, 19); // '2025-01-30 07:53:42'
  };

  const formatDateForInput = (date: string | Date | undefined): string => {
    if (!date) return "";
    if (typeof date === "string") return date.split("T")[0]; // Handle already formatted strings
    return date.toISOString().split("T")[0]; // Convert Date objects
  };

  const filteredBillings = useMemo(() => {
    return billings
      .filter((billing) => {
        // Filter by vendor access
        if (user?.role === "vendor" && !allowedVendorNumbers.includes("ALL")) {
          if (!allowedVendorNumbers.includes(billing.vendor_number)) {
            return false;
          }
        }

        // Filter by status
        if (selectedStatus !== "All" && billing.status !== selectedStatus) {
          return false;
        }

        // Filter by search term
        const searchString =
          `${billing.order_id} ${billing.vendor_number}`.toLowerCase();
        return searchString.includes(searchTerm.toLowerCase());
      })
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [billings, searchTerm, selectedStatus, user, allowedVendorNumbers]);

  const onSubmit = async (data: BillingFormData) => {
    if (editingBilling) {
      const updatedBilling: Billing = {
        ...editingBilling,
        ...data,
        shipping_fee: Number(data.shipping_fee),
        billing_date: formatDateForMySQL(new Date(data.billing_date)),
        updated_at: formatDateForMySQL(new Date()),
      };
      // console.log("Updated Billing: ", updatedBilling); // Debug log commented out
      await updateBilling(updatedBilling);
      setAlert("Billing updated successfully", "success");
    } else {
      const newBilling: NewBilling = {
        ...data,
        shipping_fee: Number(data.shipping_fee),
        status: "Pending",
        billing_date: formatDateForMySQL(new Date(data.billing_date)),
        notes: data.notes || "",
        vendor_number: data.vendor_number,
        order_id: data.order_id,
        paid_on: null,
      };
      // console.log("New Billing: ", newBilling); // Debug log commented out
      await addBilling({
        ...newBilling,
        id: Date.now(), // Generate a temporary ID
        created_at: formatDateForMySQL(new Date()),
        updated_at: formatDateForMySQL(new Date()),
      }); // Pass the Billing object
      setAlert("Billing created successfully", "success");
    }
    closeModal();
  };

  const handleBulkImport = (billings: Billing[]) => {
    billings.forEach((billing) => addBilling(billing));
    setAlert(`Successfully imported ${billings.length} billings`, "success");
    setIsBulkImportModalOpen(false);
  };

  const handleDeleteBilling = async (billingId: number) => {
    if (
      window.confirm(
        "Are you sure you want to delete this billing? This action cannot be undone."
      )
    ) {
      try {
        await deleteBilling(billingId); // Trigger backend deletion
        setAlert("Billing deleted successfully", "success");
      } catch (error) {
        console.error("Error deleting billing: ", error);
        setAlert("Failed to delete billing", "error");
      }
    }
  };

  const handleMarkAsPaid = async (billingId: number) => {
    try {
      await markAsPaid(billingId); // Trigger the backend API
      setAlert("Billing marked as paid", "success");
    } catch (error) {
      console.error("Error marking billing as paid: ", error);
      setAlert("Failed to mark billing as paid", "error");
    }
  };

  const handleCancelBilling = async (billingId: number) => {
    try {
      await cancelBilling(billingId); // Trigger the backend API
      setAlert("Billing cancelled successfully", "success");
    } catch (error) {
      console.error("Error cancelling billing: ", error);
      setAlert("Failed to cancel billing", "error");
    }
  };

  const openEditModal = (billing: Billing) => {
    setEditingBilling(billing);
    // console.log(billing); // Debug log commented out
    setIsModalOpen(true);
    reset({
      order_id: billing.order_id,
      vendor_number: billing.vendor_number,
      shipping_fee: billing.shipping_fee,
      billing_date: billing.billing_date,
      notes: billing.notes,
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBilling(null);
    reset();
  };

  const handleActionMenuClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    billingId: string
  ) => {
    const buttonRect = (
      event.currentTarget as HTMLElement
    ).getBoundingClientRect();
    setDropdownPosition({
      top: buttonRect.bottom, // Position the dropdown directly below the button
      left: buttonRect.left + buttonRect.width / 2, // Center horizontally relative to the button
    });
    setOpenActionMenu(openActionMenu === billingId ? null : billingId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Billing
        </h1>
        {canEdit && (
          <div className="flex space-x-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Billing
            </button>
            <button
              onClick={() => setIsBulkImportModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              <Upload className="h-5 w-5 mr-2" />
              Bulk Import
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by invoice number or vendor number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
        <select
          value={selectedStatus}
          onChange={(e) =>
            setSelectedStatus(e.target.value as BillingStatus | "All")
          }
          className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white"
        >
          <option value="All">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Paid">Paid</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingBilling ? "Edit Billing" : "New Billing"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!editingBilling && <></>}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Billing Date
            </label>
            <input
              type="date"
              {...register("billing_date", { required: true })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Order ID
            </label>
            <Controller
              name="order_id"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <SearchableSelect
                  options={outboundOptions}
                  value={field.value}
                  onChange={(value, vendor_number) => {
                    field.onChange(value);
                    setValue("vendor_number", vendor_number || "N/A"); // Default to "N/A" if empty
                  }}
                  placeholder="Select an order..."
                  className="mt-1"
                />
              )}
            />
          </div>

          <div className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Vendor Number
            </label>
            <Controller
              name="vendor_number"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  {...register("vendor_number")}
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-200 disabled:shadow-none"
                  readOnly
                />
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Shipping Fee
            </label>
            <input
              type="number"
              step="0.01"
              {...register("shipping_fee", { required: true, min: 0 })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Notes
            </label>
            <textarea
              {...register("notes")}
              rows={3}
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
              {editingBilling ? "Update" : "Create"} Billing
            </button>
          </div>
        </form>
      </Modal>

      <BulkBillingModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        onImport={handleBulkImport}
        allowedVendorNumbers={allowedVendorNumbers}
      />

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Vendor Number
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Billing Date
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Shipping Fee
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Paid On
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredBillings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      No billings found
                    </td>
                  </tr>
                ) : (
                  filteredBillings.map((billing) => (
                    <tr key={billing.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900 dark:text-white">
                        {billing.order_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                        {billing.vendor_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                        {new Date(billing.billing_date).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                        ${billing.shipping_fee}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap content-center text-center text-sm font-medium">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            statusClasses[billing.status] ||
                            "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                          }`}
                        >
                          {billing.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                        {!billing.paid_on
                          ? "N/A"
                          : new Date(billing.paid_on).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative inline-block text-left">
                          <button
                            onClick={(event) =>
                              handleActionMenuClick(event, String(billing.id))
                            }
                            className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </button>
                        </div>
                        {openActionMenu === String(billing.id) &&
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
                                    openEditModal(billing);
                                    setOpenActionMenu(null);
                                  }}
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left cursor-pointer"
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </li>
                                <li
                                  onClick={() => {
                                    handleDeleteBilling(billing.id);
                                    setOpenActionMenu(null);
                                  }}
                                  className="flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </li>
                              </ul>
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

export default Billings;
