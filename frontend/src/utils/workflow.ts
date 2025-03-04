import axios from "axios";
import { Transaction } from "../types";

export const generateWorkflowNumber = async (
  transactions: Transaction[]
): Promise<string> => {
  const date = new Date();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear().toString().slice(-2);
  const prefix = `WF${month}${year}-`;

  try {
    const response = await axios.get(
      `http://localhost:5000/api/transactions/latest`
    );

    // Get the latest workflow number
    const latestWorkflow = response.data?.workflow_number || `${prefix}000`;
    const latestNumber = parseInt(latestWorkflow.split("-")[1]) || 0;
    const nextNumber = (latestNumber + 1).toString().padStart(3, "0");

    return `${prefix}${nextNumber}`;
  } catch (error) {
    console.error("Error fetching latest workflow number:", error);
    return `${prefix}001`; // Default if error occurs
  }
};

// // Get all workflow numbers for the current month
// const currentMonthWorkflows = transactions
//   .filter((t) => t.workflowNumber?.startsWith(prefix))
//   .map((t) => parseInt(t.workflowNumber?.split("-")[1] || "0"));

// // Find the highest number and increment
// const highestNumber = Math.max(0, ...currentMonthWorkflows);
// const nextNumber = (highestNumber + 1).toString().padStart(3, "0");

// return `${prefix}${nextNumber}`;
