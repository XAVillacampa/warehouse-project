import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Upload,
  MoreVertical,
  History,
} from "lucide-react";
import Modal from "../components/Modal";
import { useForm } from "react-hook-form";
import { Inventory } from "../types";
import { useInventoryStore, useAlertStore } from "../store";
import { useAuthStore } from "../store/auth";
import BulkImportModal from "../components/BulkImportModal";
import LogChangesModal from "../components/LogChangesModal";
import { validateSku } from "../utils/validation";
import { fetchProductsAPI, updateProductAPI } from "../services/api";

interface ProductFormData {
  sku: string;
  product_name: string;
  warehouse_code: string;
  stock_check: number;
  outbound: number;
  weight: number;
  height: number;
  length: number;
  width: number;
  cbm: number;
  vendor_number: string;
}

function Products() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [isLogChangesModalOpen, setIsLogChangesModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Inventory | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Inventory | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedNames, setExpandedNames] = useState<Set<string>>(new Set());
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  // const [allProducts, setAllProducts] = useState([]);
  const menuRef = useRef(null);

  const { register, handleSubmit, reset, setValue, watch } =
    useForm<ProductFormData>();
  const { inventory, addProduct, updateProduct, deleteProduct, fetchProducts } =
    useInventoryStore();
  const { user, getAllowedVendorNumbers } = useAuthStore();
  const { setAlert } = useAlertStore();

  const allowedVendorNumbers = getAllowedVendorNumbers(user);
  const canEdit = user?.role !== "vendor";

  // Watch quantity and unit CBM for total CBM calculation
  const stock_check = watch("stock_check") || 0;
  const cbm = watch("cbm") || 0;
  const totalCBM = stock_check * cbm;

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

  // Filter products
  const filteredInventory = useMemo(() => {
    // Filter by vendor number for vendor users
    return inventory.filter((product) => {
      // Check if allowedVendorNumbers includes "ALL"
      if (user?.role === "vendor" && !allowedVendorNumbers.includes("ALL")) {
        // Check if product vendor number is in allowedVendorNumbers
        if (!allowedVendorNumbers.includes(product.vendor_number)) {
          // Exclude the product
          return false;
        }
      }
      // Filter by search term
      const searchString =
        `${product.sku} ${product.product_name} ${product.warehouse_code} ${product.vendor_number}`.toLowerCase(); // Lowercase search term
      return searchString.includes(searchTerm.toLowerCase()); // Case-insensitive search
    });
  }, [inventory, searchTerm, user, allowedVendorNumbers]); // Include user and allowedVendorNumbers in the dependency array

  const formatDateForMySQL = (date) => {
    return date.toISOString().replace("T", " ").slice(0, 19); // '2025-01-30 07:53:42'
  };

  const onSubmit = (data: ProductFormData) => {
    // Validate SKU uniqueness only if SKU is being changed (ignore if not changing SKU)
    const skuError =
      !editingProduct || data.sku !== editingProduct.sku
        ? validateSku(data.sku, inventory, editingProduct?.sku)
        : null;

    if (skuError) {
      setAlert(skuError, "error");
      return;
    }

    // Validate vendor number
    if (
      !allowedVendorNumbers.includes("ALL") &&
      !allowedVendorNumbers.includes(data.vendor_number)
    ) {
      setAlert("Invalid vendor number for your account", "error");
      return;
    }

    // Prepare product data without modifying SKU (if not intended to update it)
    const productDataToSave = {
      ...data,
      cbm: Number(data.cbm),
      updatedAt: new Date(),
    };

    // Update product
    if (editingProduct) {
      const updatedProduct: Inventory = {
        ...editingProduct,
        ...productDataToSave,
      };
      updateProduct(updatedProduct);
      setAlert("Product updated successfully", "success");
    } else {
      // Add new product
      const newProduct: Inventory = {
        ...productDataToSave,
        created_at: formatDateForMySQL(new Date()),
        updated_at: formatDateForMySQL(new Date()),
      };
      console.log("New product to add:", newProduct);
      fetchProducts();
      addProduct(newProduct);
      setAlert("Product added successfully", "success");
    }
    closeModal();
  };
  // Bulk import products
  const handleBulkImport = (products: Inventory[], isUpdate: boolean) => {
    if (isUpdate) {
      // Update existing products
      products.forEach((product) => updateProduct(product));
      setAlert(`Successfully updated ${products.length} products`, "success");
    } else {
      // Add new products
      products.forEach((product) => addProduct(product));
      setAlert(
        `Successfully imported ${products.length} new products`,
        "success"
      );
      //console.log("Bulk imported products:", products);
    }
    setIsBulkImportModalOpen(false);
  };

  // Open edit modal
  const openEditModal = (product: Inventory) => {
    // Set editing product
    setEditingProduct(product);
    // Set form values
    Object.keys(product).forEach((key) => {
      if (key in product) {
        setValue(
          key as keyof ProductFormData,
          String(product[key as keyof Inventory])
        );
      }
    });
    setIsModalOpen(true);
  };
  // Open log changes modal
  const openLogChanges = (product: Inventory) => {
    setSelectedProduct(product); // Set selected product
    setIsLogChangesModalOpen(true); // Open log changes modal
  };
  // Delete product
  const handleDeleteProduct = (productId: string) => {
    deleteProduct(productId); // Delete product
    setAlert("Product deleted successfully", "success");
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    reset();
  };
  // Toggle name expansion
  const toggleNameExpansion = (productId: string) => {
    const newExpanded = new Set(expandedNames); // Create a new Set
    if (newExpanded.has(productId)) {
      // Check if product is expanded
      newExpanded.delete(productId); // Remove product
    } else {
      // Product is not expanded
      newExpanded.add(productId); // Add product
    }
    setExpandedNames(newExpanded); // Set expanded names
  };
  // Truncate name
  const truncateName = (product_name: string, productId: string) => {
    if (!product_name) return ""; // Return empty string
    if (expandedNames.has(productId)) return product_name; // Return full name
    return product_name.length > 30
      ? `${product_name.substring(0, 30)}...`
      : product_name; // Return truncated name
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Inventory
        </h1>
        {canEdit && (
          <div className="flex space-x-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Product
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

      <div className="relative">
        <input
          type="text"
          placeholder="Search products by SKU, product name, warehouse code, or vendor number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
        />
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingProduct ? "Edit Product" : "Add New Product"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              SKU
            </label>
            <input
              type="text"
              {...register("sku", { required: true })}
              disabled={!!editingProduct}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm disabled:bg-gray-100 dark:disabled:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>
            <input
              type="text"
              {...register("product_name", { required: true })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Quantity
            </label>
            <input
              type="number"
              {...register("stock_check", { required: true, min: 0 })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Warehouse Code
            </label>
            <input
              type="text"
              {...register("warehouse_code", { required: true })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Vendor Number
            </label>
            <input
              type="text"
              {...register("vendor_number", { required: true })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Weight (lbs)
            </label>
            <input
              type="number"
              step="0.01"
              {...register("weight", { required: true, min: 0 })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Length (in)
              </label>
              <input
                type="number"
                step="0.1"
                {...register("length", { required: true, min: 0 })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Width (in)
              </label>
              <input
                type="number"
                step="0.1"
                {...register("width", { required: true, min: 0 })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Height (in)
              </label>
              <input
                type="number"
                step="0.1"
                {...register("height", { required: true, min: 0 })}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Unit CBM
            </label>
            <input
              type="number"
              step="0.001"
              {...register("cbm", { required: true, min: 0 })}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Total CBM:{" "}
              <span className="font-medium">{totalCBM.toFixed(3)}</span> m³
            </p>
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
              {editingProduct ? "Update" : "Add"} Product
            </button>
          </div>
        </form>
      </Modal>

      {canEdit && (
        <Modal
          isOpen={isBulkImportModalOpen}
          onClose={() => setIsBulkImportModalOpen(false)}
          title="Bulk Import Products"
        >
          <BulkImportModal
            onClose={() => setIsBulkImportModalOpen(false)}
            onImport={handleBulkImport}
            existingProducts={inventory}
            allowedVendorNumbers={allowedVendorNumbers}
          />
        </Modal>
      )}

      <LogChangesModal
        isOpen={isLogChangesModalOpen}
        onClose={() => {
          setIsLogChangesModalOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
      />
      {/*Table */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Outbound
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Warehouse Code
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Vendor Number
                  </th>
                  <th className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      No products found.{" "}
                      {canEdit && 'Click "Add Product" to create one.'}
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((inventory) => (
                    <tr key={inventory.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-gray-500 dark:text-white">
                        {inventory.sku}
                      </td>
                      <td className="px-6 py-4 text-sm text-center text-gray-500 dark:text-gray-400">
                        <button
                          onClick={() => toggleNameExpansion(inventory.sku)}
                          className="hover:text-gray-900 dark:hover:text-white"
                        >
                          {truncateName(inventory.product_name, inventory.sku)}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                        {inventory.stock_check}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                        {inventory.outbound}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                        {inventory.warehouse_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                        {inventory.vendor_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="relative inline-block text-left">
                          <div
                            onClick={() => {
                              setOpenActionMenu(
                                openActionMenu === inventory.sku
                                  ? null
                                  : inventory.sku
                              );
                            }}
                            className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                            role="button"
                          >
                            <MoreVertical className="h-5 w-5" />
                          </div>
                        </div>
                        {openActionMenu === inventory.sku && (
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
                                  openLogChanges(inventory);
                                  setOpenActionMenu(null);
                                }}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left cursor-pointer"
                              >
                                <History className="h-4 w-4 mr-2" />
                                View Log Changes
                              </li>
                              {canEdit && (
                                <>
                                  <li
                                    onClick={() => {
                                      openEditModal(inventory);
                                      setOpenActionMenu(null);
                                    }}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left cursor-pointer"
                                  >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                  </li>
                                  <li
                                    onClick={() => {
                                      handleDeleteProduct(inventory.sku);
                                      setOpenActionMenu(null);
                                    }}
                                    className="flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </li>
                                </>
                              )}
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

export default Products;
