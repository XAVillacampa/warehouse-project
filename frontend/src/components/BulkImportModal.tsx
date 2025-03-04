import React, { useState, useRef } from "react";
import { Upload, AlertCircle, Download } from "lucide-react";
import { parseCSV, validateProducts } from "../utils/csv";
import { Product } from "../types";

interface BulkImportModalProps {
  onClose: () => void;
  onImport: (products: Product[], isUpdate: boolean) => void;
  existingProducts: Product[];
  allowedVendorNumbers: string[]; 
}

function BulkImportModal({
  onClose,
  onImport,
  existingProducts,
  allowedVendorNumbers,
}: BulkImportModalProps) {
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const products = parseCSV(text);

      // Validate products
      const validationErrors = validateProducts(
        products,
        existingProducts,
        isUpdate
      );

      // Validate vendor number
      if (!allowedVendorNumbers.includes("ALL")) {
        products.forEach((product, index) => {
          if (!allowedVendorNumbers.includes(product.vendor_number)) {
            validationErrors.push(
              `Line ${index + 2}: vendor_umber ${product.vendor_number} is not allowed for your account`
            );
          }
        });
      }

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }

      // If updating, merge with existing products
      if (isUpdate) {
        products.forEach((product) => {
          const existingProduct = existingProducts.find(
            (p) => p.sku === product.sku
          );
          if (existingProduct) {
            product.sku = existingProduct.sku;
            product.created_at = existingProduct.createdAt;
          }
        });
      }
      console.log("Imported products:", products);
      console.log(isUpdate);
      onImport(products, isUpdate);
      

      onClose();
    } catch (error) {
      setErrors([
        "Failed to parse CSV file. Please check the format and try again.",
      ]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type === "text/csv") {
      handleFile(file);
    } else {
      setErrors(["Please upload a valid CSV file"]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const downloadTemplate = () => {
    const headers = ["sku", "name", "quantity", "minStockLevel", "warehouse_code", "vendor_number", "weight", "height", "length", "width", "unit_cbm"].join(",");

    let exampleData = "";
    if (isUpdate && existingProducts.length > 0) {
      // Use existing products as template
      exampleData = existingProducts
        .slice(0, 2)
        .map((product) =>
          [
            product.sku,
            product.name,
            product.quantity,
            product.minStockLevel,
            product.warehouse_code,
            product.vendor_number,
            product.weight,
            product.height,
            product.length,
            product.width,
            product.unit_cbm,
          ].join(",")
        )
        .join("\n");
    } else {
      // Use example data
      exampleData = [
        "F123,Product F,100,20,WC2,V001,15,20,30,40,.045",
        "G123,Product G,100,20,WC3,V001,15,20,30,40,.24",
      ].join("\n");
    }

    const content = `${headers}\n${exampleData}`;
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = isUpdate ? "update_products.csv" : "new_products.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Bulk {isUpdate ? "Update" : "Import"} Products
        </h3>
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
        >
          <Download className="h-4 w-4 mr-1" />
          Download Template
        </button>
      </div>

      <div className="flex justify-center mb-4">
        <label className="inline-flex items-center">
          <input
            type="radio"
            className="form-radio text-indigo-600 dark:text-indigo-400"
            name="importType"
            checked={!isUpdate}
            onChange={() => setIsUpdate(false)}
          />
          <span className="ml-2 text-gray-700 dark:text-gray-300">
            Add New Products
          </span>
        </label>
        <label className="inline-flex items-center ml-6">
          <input
            type="radio"
            className="form-radio text-indigo-600 dark:text-indigo-400"
            name="importType"
            checked={isUpdate}
            onChange={() => setIsUpdate(true)}
          />
          <span className="ml-2 text-gray-700 dark:text-gray-300">
            Update Existing Products
          </span>
        </label>
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
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {isUpdate
            ? "SKUs must match existing products"
            : "SKUs must be unique"}
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

export default BulkImportModal;
