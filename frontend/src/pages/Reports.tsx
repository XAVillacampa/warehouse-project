import React, { useEffect, useState } from "react";
import { FileSpreadsheet, Download } from "lucide-react";
import { useInventoryStore } from "../store";
import { useAuthStore } from "../store/auth"; // Use the correct auth store
import {
  generateStorageReport,
  generateInventoryReport,
  generateInboundReport,
  generateOutboundReport,
} from "../utils/reports";
import DateRangeSelector from "../components/DateRangeSelector";

function Reports() {
  const {
    inventory,
    inbound,
    outbound,
    fetchProducts,
    fetchInbound,
    fetchOutbound,
  } = useInventoryStore();
  const { user } = useAuthStore(); // Get the authenticated user
  const role = user?.role || "guest"; // Default to "guest" if no user
  const vendorNumber = user?.vendor_number || null; // Get vendor number if available
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    fetchProducts();
    fetchInbound();
    fetchOutbound();
  }, [fetchProducts, fetchInbound, fetchOutbound]);

  // Filter data based on role and vendor number
  const filteredInventory =
    role === "vendor" && vendorNumber
      ? inventory.filter((item) => item.vendor_number === vendorNumber)
      : inventory;

  const filteredInbound =
    role === "vendor" && vendorNumber
      ? inbound.filter((item) => item.vendor_number === vendorNumber)
      : inbound;

  const filteredOutbound =
    role === "vendor" && vendorNumber
      ? outbound.filter((item) => item.vendor_number === vendorNumber)
      : outbound;

  const downloadReport = (
    type: "storage" | "inventory" | "inbound" | "outbound"
  ) => {
    let csvContent = "";
    let filename = "";

    switch (type) {
      case "storage":
        csvContent = generateStorageReport(
          filteredInventory,
          startDate,
          endDate
        );
        filename = `storage-report-${startDate}-to-${endDate}.csv`;
        break;
      case "inventory":
        csvContent = generateInventoryReport(
          filteredInventory,
          startDate,
          endDate
        );
        filename = `inventory-report-${startDate}-to-${endDate}.csv`;
        break;
      case "inbound":
        csvContent = generateInboundReport(
          filteredInbound,
          filteredInventory,
          startDate,
          endDate
        );
        filename = `inbound-report-${startDate}-to-${endDate}.csv`;
        break;
      case "outbound":
        csvContent = generateOutboundReport(
          filteredOutbound,
          filteredInventory,
          startDate,
          endDate
        );
        filename = `outbound-report-${startDate}-to-${endDate}.csv`;
        break;
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Reports
        </h1>
      </div>

      <DateRangeSelector
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Storage Report Card */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg flex flex-col justify-between">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileSpreadsheet className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Daily Storage Report
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">
                      Storage data by SKU
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3 flex items-center justify-center mt-auto">
            <div className="text-sm">
              <button
                onClick={() => downloadReport("storage")}
                className="inline-flex items-center font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </button>
            </div>
          </div>
        </div>

        {/* Inventory Report Card */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg flex flex-col justify-between">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileSpreadsheet className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Inventory Status Report
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">
                      Stock levels and alerts
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3 flex items-center justify-center mt-auto">
            <div className="text-sm">
              <button
                onClick={() => downloadReport("inventory")}
                className="inline-flex items-center font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </button>
            </div>
          </div>
        </div>

        {/* Inbound Report Card */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg flex flex-col justify-between">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileSpreadsheet className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Inbound Shipments Report
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">
                      Details of inbound shipments
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3 flex items-center justify-center mt-auto">
            <div className="text-sm">
              <button
                onClick={() => downloadReport("inbound")}
                className="inline-flex items-center font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </button>
            </div>
          </div>
        </div>

        {/* Outbound Report Card */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg flex flex-col justify-between">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileSpreadsheet className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Outbound Shipments Report
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">
                      Details of outbound shipments
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3 flex items-center justify-center mt-auto">
            <div className="text-sm">
              <button
                onClick={() => downloadReport("outbound")}
                className="inline-flex items-center font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reports;
