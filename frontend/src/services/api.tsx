import axios from "axios";
import { InboundShipment, OutboundShipment } from "../types";

const API_BASE_URL = "http://localhost:5000/api";

// Function to handle errors consistently
const handleApiError = (error: any, message: string) => {
  console.error(`${message}:`, error.response?.data || error.message);
  throw new Error(message);
};

/* ========================= Products APIs ========================= */
export const fetchProductsAPI = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/inventory`);
    // console.log("Fetched products:", response.data);
    return response.data;
  } catch (error) {
    handleApiError(error, "Error fetching products");
  }
};

export const addProductAPI = async (product) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/inventory`, product);
    console.log("Added product:", response.data);
    return response.data;
  } catch (error) {
    handleApiError(error, "Error adding product");
  }
};

export const updateProductAPI = async (sku, product) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/inventory/${sku}`,
      product
    );
    console.log(`Updated product (SKU: ${sku}):`, response.data);
    return response.data;
  } catch (error) {
    handleApiError(error, "Error updating product");
  }
};

export const deleteProductAPI = async (sku) => {
  try {
    await axios.delete(`${API_BASE_URL}/inventory/${sku}`);
    console.log(`Deleted product (SKU: ${sku})`); // Debugging
    return { success: true };
  } catch (error) {
    handleApiError(error, "Error deleting product");
  }
};

/* ========================= Inbound Shipments APIs ========================= */
export const fetchInboundShipmentsAPI = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/inbound-shipments`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    handleApiError(error, "Error fetching inbound shipments");
  }
};

export const addInboundShipmentAPI = async (shipment) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/inbound-shipments`,
      shipment
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Error adding inbound shipment");
  }
};

export const bulkImportInboundShipmentsAPI = async (
  shipments: InboundShipment[]
) => {
  try {
    console.log("Shipments: ", shipments);
    const response = await axios.post(
      `${API_BASE_URL}/inbound-shipments/bulk`, // Corrected URL
      shipments
    );
    console.log("Bulk import response:", response);
    return response.data;
  } catch (error) {
    handleApiError(error, "Error bulk importing inbound shipments");
  }
};

export const updateInboundShipmentAPI = async (shipmentId, shipment) => {
  console.log(
    "Making API Request to:",
    `${API_BASE_URL}/inbound-shipments/${shipmentId}`
  );

  if (!shipmentId) {
    console.error(" Error: shipmentId is undefined!");
    return;
  }

  try {
    const response = await axios.put(
      `${API_BASE_URL}/inbound-shipments/${shipmentId}`,
      shipment
    );
    return response.data;
  } catch (error) {
    console.error("API Error Response:", error.response?.data || error.message);
    handleApiError(error, "Error updating inbound shipment");
  }
};

export const deleteInboundShipmentAPI = async (shipmentId) => {
  try {
    await axios.delete(`${API_BASE_URL}/inbound-shipments/${shipmentId}`);
    return { success: true };
  } catch (error) {
    handleApiError(error, "Error deleting inbound shipment");
  }
};

/* ========================= Outbound Shipments APIs ========================= */
export const fetchOutboundShipmentsAPI = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/outbound-shipments`);
    // console.log("Fetched outbound shipments:", response.data);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    handleApiError(error, "Error fetching outbound shipments");
  }
};

export const addOutboundShipmentAPI = async (shipment) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/outbound-shipments`,
      shipment
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Error adding outbound shipment");
  }
};

// Bulk import outbound shipments
export const bulkImportOutboundShipmentsAPI = async (
  shipments: OutboundShipment[]
) => {
  try {
    console.log("Shipments: ", shipments);
    const response = await axios.post(
      `${API_BASE_URL}/outbound-shipments/bulk`,
      shipments
    );
    console.log("Bulk import response:", response);
    return response.data;
  } catch (error) {
    handleApiError(error, "Error bulk importing outbound shipments");
  }
};

export const updateOutboundShipmentAPI = async (shipmentId, shipment) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/outbound-shipments/${shipmentId}`,
      shipment
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "Error updating outbound shipment");
  }
};

export const deleteOutboundShipmentAPI = async (shipmentId) => {
  try {
    await axios.delete(`${API_BASE_URL}/outbound-shipments/${shipmentId}`);
    return { success: true };
  } catch (error) {
    handleApiError(error, "Error deleting outbound shipment");
  }
};

/* ========================= User APIs ========================= */
export const loginAPI = async (email: string, password: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/login`, {
      email,
      password,
    });

    console.log("Login API response:", response.data);

    if (!response.data || !response.data.token || !response.data.user) {
      throw new Error("Invalid login response");
    }

    // Store the token in localStorage
    localStorage.setItem("token", response.data.token);
    return response.data;
  } catch (error) {
    handleApiError(error, "Login failed");
  }
};

export const fetchUsersAPI = async () => {
  try {
    const token = localStorage.getItem("token");

    if (!token) {
      console.error("No authentication token found. Redirecting to login...");
      return []; // Return empty array to prevent crashes
    }

    const response = await axios.get(`${API_BASE_URL}/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!Array.isArray(response.data)) {
      console.error("Invalid response format from /users API:", response.data);
      return [];
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching users:", error);
    return []; // Prevents undefined errors
  }
};

export const registerUserAPI = async (user) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/users`, user);
    return response.data;
  } catch (error) {
    handleApiError(error, "User registration failed");
  }
};

export const updateUserAPI = async (userId, user) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No authentication token found. Redirecting to login...");
      return []; // Return empty array to prevent crashes
    }
    const response = await axios.put(`${API_BASE_URL}/users/${userId}`, user, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "User update failed");
  }
};

export const deleteUserAPI = async (userId) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No authentication token found. Redirecting to login...");
      return []; // Return empty array to prevent crashes
    }
    const response = await axios.delete(`${API_BASE_URL}/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    handleApiError(error, "User deletion failed");
  }
};

export const suspendUserAPI = async (userId) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No authentication token found. Redirecting to login...");
      return;
    }
    const response = await axios.put(
      `${API_BASE_URL}/users/${userId}/suspend`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "User suspension failed");
  }
};

export const activateUserAPI = async (userId) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No authentication token found. Redirecting to login...");
      return;
    }
    const response = await axios.put(
      `${API_BASE_URL}/users/${userId}/activate`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error, "User activation failed");
  }
};

export const resetPasswordAPI = async (
  userId: string,
  newPassword: string
): Promise<any> => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No authentication token found. Redirecting to login...");
      return;
    }

    const response = await axios.put(
      `${API_BASE_URL}/users/${userId}/reset-password`,
      { newPassword },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Reset password API response:", response.data); // Log response for debugging
    return response.data;
  } catch (error) {
    handleApiError(error, "Password reset failed");
  }
};

/* ========================= Billings APIs ========================= */
// Fetch all billings
export const fetchBillingsAPI = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No authentication token found. Redirecting to login...");
      return;
    }

    const response = await axios.get(`${API_BASE_URL}/billings`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log("Fetched billings response:", response.data); // Log for debugging

    if (!response || !response.data) {
      throw new Error("Invalid response from fetchBillingsAPI");
    }

    return response.data;
  } catch (error) {
    handleApiError(error, "Error fetching billings");
  }
};

// Fetch all workflow numbers
export const fetchWorkflowsAPI = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/workflows`);
    // console.log("Fetched workflow numbers response: ", response.data)
    return response.data;
  } catch (error) {
    console.error("Error fetching workflow numbers:", error);
    return [];
  }
};

// Add a new billing
export const addBillingAPI = async (billing) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No authentication token found. Redirecting to login...");
      return;
    }
    const response = await axios.post(`${API_BASE_URL}/billings`, billing, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    console.log("Add billing response:", response.data); // Log for debugging

    if (!response || !response.data) {
      throw new Error("Invalid response from addBillingAPI");
    }

    return response.data;
  } catch (error) {
    handleApiError(error, "Error adding billing");
  }
};

// Update a billing
export const updateBillingAPI = async (billingId, billing) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No authentication token found. Redirecting to login...");
      return;
    }

    const response = await axios.put(
      `${API_BASE_URL}/billings/${billingId}`,
      billing,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Update billing response:", response.data); // Log for debugging

    if (!response || !response.data) {
      throw new Error("Invalid response from updateBillingAPI");
    }
    return response.data;
  } catch (error) {
    handleApiError(error, "Error updating billing");
  }
};

// Delete a billing
export const deleteBillingAPI = async (billingId) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No authentication token found. Redirecting to login...");
      return;
    }
    const response = await axios.delete(
      `${API_BASE_URL}/billings/${billingId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log("Delete billing response:", response.data); // Log for debugging

    if (!response || !response.data) {
      throw new Error("Invalid response from deleteBillingAPI");
    }
    return response.data;
  } catch (error) {
    handleApiError(error, "Error deleting billing");
  }
};

// Mark a billing as paid
export const markBillingAsPaidAPI = async (billingId) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No authentication token found. Redirecting to login...");
      return;
    }
    const response = await axios.put(
      `${API_BASE_URL}/billings/${billingId}/mark-paid`,
      null,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log("Mark billing as paid response:", response.data); // Log for debugging

    if (!response || !response.data) {
      throw new Error("Invalid response from markBillingAsPaidAPI");
    }

    return response.data;
  } catch (error) {
    handleApiError(error, "Error marking billing as paid");
  }
};

// Cancel a billing
export const cancelBillingAPI = async (billingId) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No authentication token found. Redirecting to login...");
      return;
    }
    const response = await axios.put(
      `${API_BASE_URL}/billings/${billingId}/cancel`,
      null,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log("Mark billing as paid response:", response.data); // Log for debugging

    if (!response || !response.data) {
      throw new Error("Invalid response from markBillingAsPaidAPI");
    }
    return response.data;
  } catch (error) {
    handleApiError(error, "Error cancelling billing");
  }
};
