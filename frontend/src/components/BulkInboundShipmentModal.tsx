import React, { useState, useRef } from "react";
import { Upload, AlertCircle, Download } from "lucide-react";
import {
  parseInboundShipmentCSV,
  validateInboundShipments,
} from "../utils/inboundCSV";
import { InboundShipment, Inventory } from "../types";

interface BulkInboundShipmentModalProps {
  onClose: () => void;
  onImport: (shipments: InboundShipment[]) => Promise<void> | void;
  products: Inventory[];
}

function BulkInboundShipmentModal({
  onClose,
  onImport,
  products,
}: BulkInboundShipmentModalProps) {
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    // Clear previous errors
    setErrors([]);
    try {
      const text = await file.text();

      // Parse CSV with the product list
      let shipments = parseInboundShipmentCSV(text, products);

      // Validate shipments
      const validationErrors = validateInboundShipments(shipments, products);

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }

      const formatDateForMySQL = (date: Date) => {
        return date.toISOString().replace("T", " ").slice(0, 19); // '2025-01-30 07:53:42'
      };

      // Call the onImport handler (which should call your bulk API endpoint)
      await onImport(
        shipments.map((shipment) => ({
          ...shipment,
          created_at: new Date(),
          updated_at: new Date(),
        }))
      );
      console.log("Shipments imported successfully", shipments);
      onClose();
    } catch (error) {
      setErrors([
        "Failed to parse CSV file. Please check the format and try again.",
      ]);
    }
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Clear previous errors
    const file = e.dataTransfer.files[0];
    if (file && file.type === "text/csv") {
      handleFile(file);
    } else {
      setErrors(["Please upload a CSV file"]);
    }
  };

  // Handle file input
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  // Download CSV template
  const downloadTemplate = () => {
    // Adjusted headers: remove the Order ID column because it is auto-generated
    const headers = [
      "shipping_date",
      "box_label",
      "sku (select from dropdown)",
      "item_quantity",
      "arriving_date",
      "tracking_number",
      "vendor_number",
      "warehouse_code",
    ].join(",");

    // List of SKUs from the product list (displayed as a placeholder)
    const skuOptions = products.map((product) => product.sku).join("|");

    // Example data for CSV
    const exampleData = products
      .slice(0, 2) // limit to first two products for the template
      .map((product) =>
        [
          "2025-03-01", // Example shipping date
          "BOX 1", // Example box label
          skuOptions, // Placeholder dropdown for SKU
          "100", // Example quantity
          "2025-03-03", // Example arriving date
          "123456", // Example tracking number
          product.vendor_number, // Example vendor
          "WH1", // Example warehouse code
        ].join(",")
      )
      .join("\n");

    const content = `${headers}\n${exampleData}`;
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inbound_shipment_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-medium text-gray-900 dark:text-white">
          Bulk Import Inbound Shipments
        </h3>
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
        >
          <Download className="h-4 w-4 mr-1" />
          Download Template
        </button>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          isDragging
            ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-900/50"
            : "border-gray-300 dark:border-gray-600"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInput}
          accept=".csv"
          className="hidden"
        />
        <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Drag and drop your CSV file here, or click to select a file
        </p>
      </div>

      {errors.length > 0 && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-300" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Import failed with the following errors:
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <ul className="list-disc pl-5 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default BulkInboundShipmentModal;