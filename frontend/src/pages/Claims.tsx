import React, { useState, useEffect, useMemo, useRef } from "react";
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
import { useAlertStore } from "../store";
import { useClaimsStore } from "../store/claims"; // Import the claims store
import { ClaimsList } from "../types"; // Import ClaimsList from index.ts

interface OutboundShipment {
  order_id: string;
  sku: string;
  customer_name: string;
  item_quantity: number;
  tracking_number: string;
}

function Claims() {
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState<ClaimsList | null>(null); // Use ClaimsList type
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { setAlert } = useAlertStore();
  const { register, handleSubmit, reset, setValue, watch, control } =
    useForm<ClaimsList>(); // Use ClaimsList type

  const {
    claims,
    fetchClaims,
    fetchOutboundShipmentsForClaims,
    outboundShipmentsForClaims,
    updateClaim, // Import updateClaim from the store
    addClaim, // Import addClaim from the store
  } = useClaimsStore(); // Use Zustand store

  // Fetch claims data from the backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchClaims(); // Use the store's fetchClaims method
      } catch (error) {
        console.error("Error fetching claims:", error);
        setAlert("Failed to fetch claims", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [fetchClaims, setAlert]);

  // Fetch orders data for the dropdown
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        await fetchOutboundShipmentsForClaims(); // Use the store's fetchOutboundShipmentsForClaims method
      } catch (error) {
        console.error("Error fetching orders:", error);
        setAlert("Failed to fetch orders", "error");
      }
    };

    fetchOrders();
  }, [fetchOutboundShipmentsForClaims, setAlert]);

  // Automatically update SKU when Order ID changes
  const selectedOrderId = watch("order_id");
  useEffect(() => {
    const selectedOrder = outboundShipmentsForClaims.find(
      (order) => order.order_id === selectedOrderId
    );
    if (selectedOrder) {
      setValue("sku", selectedOrder.sku); // Automatically set SKU
      setValue("customer_name", selectedOrder.customer_name || ""); // Automatically set Customer Name
      setValue("item_quantity", selectedOrder.item_quantity || 0); // Automatically set Quantity
      setValue("tracking_number", selectedOrder.tracking_number || ""); // Automatically set Tracking Number
    }
  }, [selectedOrderId, outboundShipmentsForClaims, setValue]);

  // Handle form submission for creating or editing claims
  const onSubmit = async (data: ClaimsList) => {
    try {
      const { id, created_at, updated_at, ...formData } = data; // Exclude backend-managed fields

      if (editingClaim) {
        // Update existing claim using the store
        await updateClaim({
          id: Number(editingClaim.id), // Ensure the ID is a number
          created_at: editingClaim.created_at, // Include created_at
          updated_at: new Date(), // Set updated_at to current timestamp
          ...formData, // Use filtered form data
        });
        await fetchClaims(); // Refresh claims list
        setAlert("Claim updated successfully", "success");
      } else {
        // Create new claim using the store
        await addClaim({
          ...formData, // Use filtered form data
        });
        await fetchClaims(); // Refresh claims list
        setAlert("Claim created successfully", "success");
      }

      closeModal();
    } catch (error) {
      console.error("Error saving claim:", error);
      setAlert("Failed to save claim", "error");
    }
  };

  // Open modal for creating or editing a claim
  const openEditModal = (claim?: ClaimsList) => {
    setEditingClaim(claim || null);
    setIsModalOpen(true);
    reset(
      claim
        ? {
            ...claim, // Spread the claim object to include all fields
            created_at: claim.created_at || new Date(), // Ensure created_at is set
          }
        : {
            order_id: "",
            customer_name: "",
            sku: "",
            item_quantity: 0,
            status: "New",
            reason: "",
            tracking_number: "",
            response_action: "",
            created_at: new Date(), // Set default created_at
          }
    );
  };

  // Close modal and reset form
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClaim(null);
    reset();
  };

  // Close action menu on outside click or Escape key
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

  // Filter claims based on search term and status
  const filteredClaims = useMemo(() => {
    const claimsArray = Array.isArray(claims) ? claims : []; // Ensure claims is an array
    const filtered = claimsArray
      .filter((claim) => {
        if (selectedStatus !== "all" && claim.status !== selectedStatus) {
          return false;
        }

        const searchString =
          `${claim.order_id} ${claim.sku} ${claim.customer_name}`.toLowerCase();
        return searchString.includes(searchTerm.toLowerCase());
      })
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    console.log("Filtered claims:", filtered); // Debugging log
    return filtered;
  }, [claims, searchTerm, selectedStatus]);

  // Handle deleting a claim
  const handleDeleteClaim = async (claimId: number) => {
    if (window.confirm("Are you sure you want to delete this claim?")) {
      try {
        await useClaimsStore.getState().deleteClaim(claimId); // Use the store's deleteClaim method
        setAlert("Claim deleted successfully", "success");
      } catch (error) {
        console.error("Error deleting claim:", error);
        setAlert("Failed to delete claim", "error");
      }
    }
  };

  const handleActionMenuClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    claimId: string
  ) => {
    const buttonRect = (
      event.currentTarget as HTMLElement
    ).getBoundingClientRect();
    setDropdownPosition({
      top: buttonRect.bottom, // Position the dropdown directly below the button
      left: buttonRect.left + buttonRect.width / 2, // Center horizontally relative to the button
    });
    setOpenActionMenu(openActionMenu === claimId ? null : claimId);
  };

  // Skeleton loader for table rows
  const renderSkeletonRows = () => {
    return Array.from({ length: 5 }).map((_, index) => (
      <tr key={index} className="animate-pulse">
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </td>
      </tr>
    ));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Claims
        </h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Claim
        </button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by order ID, SKU, or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="block w-40 pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="New">New</option>
          <option value="Claimed">Claimed</option>
          <option value="Solved">Solved</option>
          <option value="Denied">Denied</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Customer Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tracking Number
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredClaims.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      No claims found
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((claim) => (
                    <tr key={claim.id}>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {claim.order_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {claim.customer_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {claim.sku}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {claim.item_quantity}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {claim.status}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {claim.reason || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {claim.tracking_number || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium relative">
                        <button
                          onClick={(event) =>
                            handleActionMenuClick(event, String(claim.id))
                          }
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>

                        {/* Action menu */}
                        {openActionMenu === String(claim.id) &&
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
                                {/* Edit Action */}
                                <li
                                  onClick={() => {
                                    openEditModal(claim);
                                    setOpenActionMenu(null);
                                  }}
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left cursor-pointer"
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </li>

                                {/* Delete Action */}
                                <li
                                  onClick={() => {
                                    handleDeleteClaim(claim.id);
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

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingClaim ? "Edit Claim" : "New Claim"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Order ID Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Order ID
            </label>
            <Controller
              name="order_id"
              control={control}
              rules={{ required: "Please select an Order ID" }}
              render={({ field, fieldState }) => (
                <>
                  <SearchableSelect
                    options={outboundShipmentsForClaims.map((order) => ({
                      value: order.order_id,
                      label: `[${order.order_id}] ${order.customer_name}`,
                      description: `SKU: ${order.sku} | Quantity: ${order.item_quantity} | Tracking: ${order.tracking_number}`,
                      vendor_number: order.vendor_number || "", // Add vendor_number
                      warehouse_code: order.warehouse_code || "", // Add warehouse_code
                    }))}
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value); // Update the selected Order ID
                      const selectedOrder = outboundShipmentsForClaims.find(
                        (order) => order.order_id === value
                      );
                      if (selectedOrder) {
                        setValue("sku", selectedOrder.sku);
                        setValue(
                          "customer_name",
                          selectedOrder.customer_name || ""
                        );
                        setValue(
                          "item_quantity",
                          selectedOrder.item_quantity || 0
                        );
                        setValue(
                          "tracking_number",
                          selectedOrder.tracking_number || ""
                        );
                      }
                    }}
                    placeholder="Search and select an Order ID..."
                    className="mt-1"
                  />
                  {fieldState.error && (
                    <p className="text-red-500">{fieldState.error.message}</p>
                  )}
                </>
              )}
            />
          </div>

          {/* Customer Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Customer Name
            </label>
            <input
              type="text"
              {...register("customer_name", { required: true })}
              readOnly
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* SKU Field (Read-Only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              SKU
            </label>
            <input
              type="text"
              {...register("sku", { required: true })}
              readOnly
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* Quantity Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Quantity
            </label>
            <input
              type="number"
              {...register("item_quantity", { required: true })}
              readOnly
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* Tracking Number Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tracking Number
            </label>
            <input
              type="text"
              {...register("tracking_number")}
              readOnly
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {/* Status Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </label>
            <select
              {...register("status", { required: true })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            >
              <option value="New">New</option>
              <option value="Claimed">Claimed</option>
              <option value="Solved">Solved</option>
              <option value="Denied">Denied</option>
            </select>
          </div>

          {/* Reason Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Reason
            </label>
            <textarea
              {...register("reason")}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>

          {/* Response Action Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Response Action
            </label>
            <textarea
              {...register("response_action")}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>

          {/* Modal Actions */}
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
              {editingClaim ? "Update" : "Create"} Claim
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Claims;
