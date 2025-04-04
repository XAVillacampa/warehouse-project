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
import axios from "axios";


interface Claim {
  id: string;
  order_id: string;
  customer_name: string;
  sku: string;
  item_quantity: number;
  status: string;
  reason: string;
  tracking_number: string;
  response_action: string;
  created_at: string;
}

interface OutboundShipment {
  order_id: string;
  sku: string;
  customer_name: string;
  item_quantity: number;
  tracking_number: string;
}

interface ClaimFormData {
  order_id: string;
  customer_name: string;
  sku: string;
  item_quantity: number;
  status: string;
  reason: string;
  tracking_number: string;
  response_action: string;
  created_at: string;
}

function Claims() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [orders, setOrders] = useState<OutboundShipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState<Claim | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const menuRef = useRef(null);

  const { setAlert } = useAlertStore();
  const { register, handleSubmit, reset, setValue, watch, control } = useForm<ClaimFormData>();

  // Fetch claims data from the backend
  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/claims");
        setClaims(response.data);
      } catch (error) {
        console.error("Error fetching claims:", error);
        setAlert("Failed to fetch claims", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClaims();
  }, [setAlert]);

  // Fetch orders data for the dropdown
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/outbound-shipments-for-claims");
        if (Array.isArray(response.data)) {
          setOrders(response.data);
        } else {
          setOrders([]);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        setAlert("Failed to fetch orders", "error");
        setOrders([]);
      }
    };

    fetchOrders();
  }, [setAlert]);

  // Automatically update SKU when Order ID changes
  const selectedOrderId = watch("order_id");
  useEffect(() => {
    const selectedOrder = orders.find((order) => order.order_id === selectedOrderId);
    if (selectedOrder) {
      setValue("sku", selectedOrder.sku); // Automatically set SKU
      setValue("customer_name", selectedOrder.customer_name || ""); // Automatically set Customer Name
      setValue("item_quantity", selectedOrder.item_quantity || 0); // Automatically set Quantity
      setValue("tracking_number", selectedOrder.tracking_number || ""); // Automatically set Tracking Number
    }
  }, [selectedOrderId, orders, setValue]);

  // Handle form submission for creating or editing claims
  const onSubmit = async (data: ClaimFormData) => {
    try {
      console.log("Submitting claim data:", data); // Debugging log
      const response = await axios.post("http://localhost:5000/api/claims", data);
      console.log("Response from server:", response.data); // Debugging log
      setClaims((prev) => [...prev, response.data]);
      setAlert("Claim created successfully", "success");
      closeModal();
    } catch (error) {
      console.error("Error saving claim:", error);
      console.error("Error details:", error.response?.data || error.message); // Debugging log
      setAlert("Failed to save claim", "error");
    }
  };

  // Open modal for creating or editing a claim
  const openEditModal = (claim?: Claim) => {
    setEditingClaim(claim || null);
    setIsModalOpen(true);
    reset(
      claim
        ? {
          order_id: claim.order_id,
          customer_name: claim.customer_name,
          sku: claim.sku,
          item_quantity: claim.item_quantity,
          status: claim.status,
          reason: claim.reason,
          tracking_number: claim.tracking_number,
          response_action: claim.response_action,
          created_at: claim.created_at,
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
          created_at: "",
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
        setOpenActionMenu(null);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
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
  }, []);

  // Filter claims based on search term and status
  const filteredClaims = useMemo(() => {
    const claimsArray = Array.isArray(claims) ? claims : []; // Ensure claims is an array
    const filtered = claimsArray
      .filter((claim) => {
        if (selectedStatus !== "all" && claim.status !== selectedStatus) {
          return false;
        }

        const searchString = `${claim.order_id} ${claim.sku} ${claim.customer_name}`.toLowerCase();
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
  const handleDeleteClaim = async (claimId: string) => {
    if (window.confirm("Are you sure you want to delete this claim?")) {
      try {
        await axios.delete(`/api/claims/${claimId}`);
        setClaims((prev) => prev.filter((claim) => claim.id !== claimId));
        setAlert("Claim deleted successfully", "success");
      } catch (error) {
        console.error("Error deleting claim:", error);
        setAlert("Failed to delete claim", "error");
      }
    }
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
                          onClick={() =>
                            setOpenActionMenu(openActionMenu === claim.id ? null : claim.id)
                          }
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>

                        {/* Action menu */}
                        {openActionMenu === claim.id && (
                          <div
                            ref={menuRef}
                            className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 z-10"
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
            <select
              {...register("order_id", { required: true })}
              onChange={(e) => {
                const selectedOrderId = e.target.value;
                setValue("order_id", selectedOrderId);
                const selectedOrder = orders.find(
                  (order) => order.order_id === selectedOrderId
                );
                if (selectedOrder) {
                  setValue("sku", selectedOrder.sku);
                  setValue("customer_name", selectedOrder.customer_name || "");
                  setValue("item_quantity", selectedOrder.item_quantity || 0);
                  setValue("tracking_number", selectedOrder.tracking_number || "");
                }
              }}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            >
              <option value="">Select an Order ID</option>
              {Array.isArray(orders) && orders.length > 0 ? (
                orders.map((order) => (
                  <option key={order.order_id} value={order.order_id}>
                    {order.order_id}
                  </option>
                ))
              ) : (
                <option disabled>No orders available</option>
              )}
            </select>
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
              {...register("tracking_number", { required: true })}
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