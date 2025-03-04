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
} from "lucide-react";
import Modal from "../components/Modal";
import SearchableSelect from "../components/SearchableSelect";
import { useForm, Controller } from "react-hook-form";
import { Transaction, Product } from "../types";
import { useInventoryStore, useAlertStore } from "../store";
import { useAuthStore } from "../store/auth";
import BulkTransactionModal from "../components/BulkTransactionModal";
import { generateWorkflowNumber } from "../utils/workflow";

interface TransactionFormData {
  sku: string;
  quantity: number;
  notes?: string;
  vendor_number: string;
}

function Transactions() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"inbound" | "outbound">("inbound");
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "pending" | "completed" | "cancelled"
  >("all");
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  // const [allProducts, setAllProducts] = useState([]);
  // const [allTransactions, setAllTransactions] = useState([]);
  const menuRef = useRef(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<TransactionFormData>();
  const {
    products,
    transactions,
    addTransaction,
    completeTransaction,
    updateTransaction,
    cancelTransaction,
    fetchProducts,
    fetchTransactions,
  } = useInventoryStore();
  const bulkUploadTransactions = useInventoryStore(
    (state) => state.bulkUploadTransactions
  );
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
    fetchTransactions();
  }, []);

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        value: product.sku,
        label: `[${product.sku}] ${product.name}`,
        description: `Stock: ${product.quantity} | Warehouse Code: ${product.warehouse_code}`,
        vendor_number: product.vendor_number,
      })),
    [products]
  );

  const filteredTransactions = useMemo(() => {
    // console.log("All Products:", allProducts);
    // console.log("Transactions:", allTransactions);
    // console.log("Is Array?", Array.isArray(allTransactions));
    return transactions
      .filter((transaction) => {
        const product = products.find((p) => p.sku === transaction.sku);
        const searchString =
          `${product?.sku} ${product?.name} ${transaction.workflow_number} ${product?.vendor_number}`.toLowerCase();

        return (
          searchString.includes(searchTerm.toLowerCase()) &&
          (selectedStatus === "all" || transaction.status === selectedStatus)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [transactions, products, searchTerm, selectedStatus]);

  useEffect(() => {
    // console.log("Filtered Transactions:", filteredTransactions);
  }, [filteredTransactions]);

  const onSubmit = async (data: TransactionFormData) => {
    // Format the date for MySQL
    const formatDateForMySQL = (date) => {
      return date.toISOString().replace("T", " ").slice(0, 19); // '2025-01-30 07:53:42'
    };

    // Create a transaction object with necessary details.
    const transaction: Transaction = {
      type: modalType, // Use the current modal type (inbound or outbound)
      status: "pending", // Set initial status to pending
      workflow_number: "", // Assign the determined workflow number
      created_at:
        editingTransaction?.created_at || formatDateForMySQL(new Date()), // Preserve original creation date if editing
      updated_at: formatDateForMySQL(new Date()), // Set the updated date to now
      notes: data.notes || "",
      handler: user.name,
      ...data, // Spread any additional data from the form
    };

    // If editing an existing transaction
    if (editingTransaction) {
      const updatedTransaction = {
        ...editingTransaction, // Copy existing data
        ...data, // Apply new data
        updated_at: formatDateForMySQL(new Date()), // Ensure updated_at is modified
      };

      // Update the existing transaction instead of adding a new one
      updateTransaction(updatedTransaction); // Update the transaction in the store
      setAlert("Workflow updated successfully", "success"); // Show success alert
    } else {
      // For a new transaction, first find the related product by SKU
      const product = products.find((p) => p.sku === data.sku);

      // Check if the transaction type is outbound and ensure sufficient inventory
      if (
        modalType === "outbound" &&
        product &&
        product.quantity < data.quantity
      ) {
        // Show error if inventory is insufficient
        setAlert("Insufficient inventory quantity", "error");
        return;
      }

      // Add the new transaction to the store
      addTransaction(transaction);
      // Show success alert based on transaction type
      setAlert(
        `${
          modalType === "inbound" ? "Inbound" : "Outbound"
        } workflow created successfully`,
        "success"
      );
      setEditingTransaction(null);
    }

    closeModal(); // Close the modal after processing
  };

  const handleBulkImport = async (newTransactions: Transaction[]) => {
    try {
      // Call the API endpoint with the whole array of transactions
      await bulkUploadTransactions(newTransactions);
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

  const handleCompleteTransaction = (transaction: Transaction) => {
    completeTransaction(transaction);
    setAlert(
      `${
        transaction.type === "inbound" ? "Inbound" : "Outbound"
      } workflow completed`,
      "success"
    );
  };

  const handleCancelTransaction = (transaction: Transaction) => {
    cancelTransaction({
      ...transaction,
      status: "cancelled",
      updated_at: new Date(),
    });
    setAlert(
      `${
        transaction.type === "inbound" ? "Inbound" : "Outbound"
      } workflow cancelled`,
      "warning"
    );
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setModalType(transaction.type);
    setValue("sku", transaction.sku);
    setValue("quantity", transaction.quantity);
    setValue("notes", transaction.notes || "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
    reset();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Workflow
        </h1>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              setModalType("inbound");
              setIsModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
          >
            <ArrowDownCircle className="h-5 w-5 mr-2" />
            New Inbound
          </button>
          <button
            onClick={() => {
              setModalType("outbound");
              setIsModalOpen(true);
            }}
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
        <select
          value={selectedStatus}
          onChange={(e) =>
            setSelectedStatus(e.target.value as typeof selectedStatus)
          }
          className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={`${editingTransaction ? "Edit" : "New"} ${
          modalType === "inbound" ? "Inbound" : "Outbound"
        } Workflow`}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Product
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
                    onChange={(value, vendor_number) => {
                      // console.log(
                      //   "Received value:",
                      //   value,
                      //   "Received vendor_number:",
                      //   vendor_number
                      // );
                      // console.log("Full productOptions:", productOptions);

                      field.onChange(value); // Only pass the value, not vendor_number

                      setValue("vendor_number", vendor_number); // Use setValue to update form state
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
              {...register("quantity", { required: true, min: 1 })}
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
              {editingTransaction ? "Update" : "Create"} Workflow
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        title="Bulk Import Workflows"
      >
        <BulkTransactionModal
          onClose={() => setIsBulkImportModalOpen(false)}
          onImport={handleBulkImport}
          products={products}
        />
      </Modal>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Workflow Number
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Vendor Number
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      No workflows found. Create a new inbound or outbound
                      workflow to get started.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => {
                    const product = products.find(
                      (p) => p.sku === transaction.sku
                    );
                    return (
                      <tr key={transaction.workflow_number}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                          {new Date(transaction.created_at).toLocaleDateString(
                            "en-US"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full text-center ${
                              transaction.type === "inbound"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            }`}
                          >
                            {transaction.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                          {transaction.workflow_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                          {product?.sku || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                          {product?.vendor_number || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {transaction.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full text-center ${
                              transaction.status === "pending"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                : transaction.status === "completed"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            }`}
                          >
                            {transaction.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="relative inline-block text-left">
                            <button
                              onClick={() =>
                                setOpenActionMenu(
                                  openActionMenu === transaction.workflow_number
                                    ? null
                                    : transaction.workflow_number
                                )
                              }
                              className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 text-center"
                            >
                              <MoreVertical className="h-5 w-5" />
                            </button>
                          </div>

                          {/* Action menu */}
                          {openActionMenu === transaction.workflow_number &&
                            transaction.status === "pending" && (
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
                                      openEditModal(transaction);
                                      setOpenActionMenu(null);
                                    }}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left cursor-pointer"
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </li>
                                  <li
                                    onClick={() => {
                                      handleCompleteTransaction(transaction);
                                      setOpenActionMenu(null);
                                    }}
                                    className="flex items-center px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left cursor-pointer"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Complete
                                  </li>
                                  <li
                                    onClick={() => {
                                      handleCancelTransaction(transaction);
                                      setOpenActionMenu(null);
                                    }}
                                    className="flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left cursor-pointer"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancel
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

export default Transactions;
