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
} from "lucide-react";
import Modal from "../components/Modal";
import SearchableSelect from "../components/SearchableSelect";
import { useForm, Controller } from "react-hook-form";
import { Billing, BillingStatus } from "../types";
import { useBillingStore } from "../store/billing";
import { useInventoryStore, useAlertStore } from "../store";
import { useAuthStore } from "../store/auth";
import BulkBillingModal from "../components/BulkBillingModal";
import { fetchWorkflowsAPI } from "../services/api";
import { set } from "date-fns";

interface BillingFormData {
  invoice_number: string;
  workflow_number: string;
  vendor_number: string;
  amount: number;
  due_date: string;
  notes?: string;
}

function Billings() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [editingBilling, setEditingBilling] = useState<Billing | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<BillingStatus | "all">(
    "all"
  );

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
  const { transactions } = useInventoryStore();
  const { user, getAllowedVendorNumbers } = useAuthStore();
  const { setAlert } = useAlertStore();

  const allowedVendorNumbers = getAllowedVendorNumbers(user);
  const canEdit = user?.role !== "vendor";
  const menuRef = useRef(null);

  const [workflowOptions, setWorkflowOptions] = useState([]);

  const statusClasses: Record<string, string> = {
    pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  useEffect(() => {
    const fetchWorkflows = async () => {
      const workflows = await fetchWorkflowsAPI();
      // console.log("Fetched workflows:", workflows); // Debugging log

      setWorkflowOptions(
        workflows.map((workflow) => ({
          value: workflow.workflow_number,
          label: workflow.workflow_number,
          vendor_number: workflow.vendor_number || "", // Ensure it's never null
        }))
      );
    };
    fetchWorkflows();
  }, []);

  // Fetch billings data using useEffect
  useEffect(() => {
    fetchBillings();
  }, [fetchBillings]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpenActionMenu(null);
      }
    };

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenActionMenu(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setOpenActionMenu]);

  // Format the date for MySQL
  const formatDateForMySQL = (date) => {
    return date.toISOString().replace("T", " ").slice(0, 19); // '2025-01-30 07:53:42'
  };

  const formatDateForInput = (date: string | Date | undefined): string => {
    if (!date) return "";
    if (typeof date === "string") return date.split("T")[0]; // Handle already formatted strings
    return date.toISOString().split("T")[0]; // Convert Date objects
  };

  // // Get unique vendor numbers from products
  // const workflowOptions = transactions.map((transaction, index) => ({
  //   value: transaction.workflow_number || `vendor-${index}`, // Ensure value is defined
  //   label: transaction.workflow_number || "Unknown Vendor", // Default label if undefined
  //   vendor_number: transaction.vendor_number || "",
  // }));

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
        if (selectedStatus !== "all" && billing.status !== selectedStatus) {
          return false;
        }

        // Filter by search term
        const searchString =
          `${billing.invoice_number} ${billing.vendor_number}`.toLowerCase();
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
        amount: Number(data.amount),
        due_date: formatDateForMySQL(new Date(data.due_date)),
        updated_at: formatDateForMySQL(new Date()),
      };
      console.log("Updated Billing: ", updatedBilling);
      await updateBilling(updatedBilling);
      setAlert("Billing updated successfully", "success");
    } else {
      const newBilling: Billing = {
        id: crypto.randomUUID(),
        ...data,
        amount: Number(data.amount),
        status: "pending",
        due_date: formatDateForMySQL(new Date(data.due_date)),
        created_at: formatDateForMySQL(new Date()),
        updated_at: formatDateForMySQL(new Date()),
      };
      console.log("New Billing: ", newBilling);
      await addBilling(newBilling);
      setAlert("Billing created successfully", "success");
    }
    closeModal();
  };

  const handleBulkImport = (billings: Billing[]) => {
    billings.forEach((billing) => addBilling(billing));
    setAlert(`Successfully imported ${billings.length} billings`, "success");
    setIsBulkImportModalOpen(false);
  };

  const handleDeleteBilling = async (billingId: string) => {
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

  const handleMarkAsPaid = async (billingId: string) => {
    try {
      await markAsPaid(billingId); // Trigger the backend API
      setAlert("Billing marked as paid", "success");
    } catch (error) {
      console.error("Error marking billing as paid: ", error);
      setAlert("Failed to mark billing as paid", "error");
    }
  };

  const handleCancelBilling = async (billingId: string) => {
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
    console.log(billing);
    setIsModalOpen(true);
    reset({
      invoice_number: billing.invoice_number,
      workflow_number: billing.workflow_number,
      vendor_number: billing.vendor_number,
      amount: billing.amount,
      due_date: formatDateForInput(billing.due_date),
      notes: billing.notes,
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBilling(null);
    reset();
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
            setSelectedStatus(e.target.value as BillingStatus | "all")
          }
          className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
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
              Invoice Number
            </label>
            <input
              type="text"
              {...register("invoice_number", { required: true })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Workflow Number
            </label>
            <Controller
              name="workflow_number"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <SearchableSelect
                  options={workflowOptions}
                  value={field.value}
                  onChange={(value, vendor_number) => {
                    field.onChange(value);
                    setValue("vendor_number", vendor_number || "N/A"); // Default to "N/A" if empty
                  }}
                  placeholder="Select a workflow number..."
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
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              {...register("amount", { required: true, min: 0 })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Due Date
            </label>
            <input
              type="date"
              {...register("due_date", { required: true })}
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
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Invoice Number
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Workflow Number
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Vendor Number
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Amount
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
                    <tr key={billing.invoice_number}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {billing.invoice_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {billing.workflow_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {billing.vendor_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            statusClasses[billing.status] ||
                            "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                          }`}
                        >
                          {billing.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(billing.due_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        ${billing.amount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative inline-block text-left">
                          <button
                            onClick={() =>
                              setOpenActionMenu(
                                openActionMenu === billing.id
                                  ? null
                                  : billing.id
                              )
                            }
                            className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </button>
                        </div>
                        {openActionMenu === billing.id && (
                          <div
                            ref={menuRef}
                            className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-10"
                          >
                            <div className="py-1" role="menu">
                              <button
                                onClick={() => {
                                  window.open(
                                    `/api/billings/${billing.id}/download`,
                                    "_blank"
                                  );
                                  setOpenActionMenu(null);
                                }}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download PDF
                              </button>
                              {canEdit &&
                                billing.status !== "paid" &&
                                billing.status !== "cancelled" && (
                                  <>
                                    <button
                                      onClick={() => {
                                        openEditModal(billing);
                                        setOpenActionMenu(null);
                                      }}
                                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left"
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleMarkAsPaid(billing.id);
                                        setOpenActionMenu(null);
                                      }}
                                      className="flex items-center px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Mark as Paid
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleDeleteBilling(billing.id);
                                        setOpenActionMenu(null);
                                      }}
                                      className="flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleCancelBilling(billing.id);
                                        setOpenActionMenu(null);
                                      }}
                                      className="flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Cancel
                                    </button>
                                  </>
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

export default Billings;
