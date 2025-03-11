import { Product } from "../types";

export const parseCSV = (csvText: string): Product[] => {
  const lines = csvText.split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());

  return lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const product: Partial<Product> = {};

      headers.forEach((header, index) => {
        const value = values[index];
        switch (header.toLowerCase()) {
          case "product_name":
            product.product_name = value;
            break;
          case "sku":
            product.sku = value;
            break;
          case "warehouse_code":
            product.warehouse_code = value;
            break;
          case "inventory":
            product.stock_check = Number(value);
            break;
          case "outbound":
            product.outbound = Number(value);
            break;
          case "weight":
            product.weight = Number(value);
            break;
          case "height":
            product.height = Number(value);
            break;
          case "length":
            product.length = Number(value);
            break;
          case "width":
            product.width = Number(value);
            break;
          case "cbm":
            product.cbm = Number(value);
            break;
          case "vendor_number":
            product.vendor_number = value;
            break;
        }
      });

      return {
        //id: crypto.randomUUID(), // This will be replaced if updating existing product
        unitOfMeasurement: "units",
        createdAt: new Date(),
        updatedAt: new Date(),
        cbm: (product.cbm || 0) * (product.stock_check || 0),
        ...product,
      } as Product;
    });
};

export const validateProducts = (
  products: Product[],
  existingProducts: Product[],
  isUpdate: boolean
): string[] => {
  const errors: string[] = [];
  const seenSkus = new Set<string>();

  products.forEach((product, index) => {
    const lineNumber = index + 2; // +2 because we skip header and 0-based index

    if (!product.sku) {
      errors.push(`Line ${lineNumber}: SKU is required`);
    } else {
      // Check for duplicates within the CSV
      if (seenSkus.has(product.sku)) {
        errors.push(
          `Line ${lineNumber}: Duplicate SKU "${product.sku}" found in CSV`
        );
      } else {
        seenSkus.add(product.sku);

        // For updates, SKU must exist
        const existingProduct = existingProducts.find(
          (p) => p.sku === product.sku
        );
        if (isUpdate && !existingProduct) {
          errors.push(
            `Line ${lineNumber}: SKU "${product.sku}" not found in inventory`
          );
        }
      }
    }

    if (!product.product_name)
      errors.push(`Line ${lineNumber}: Name is required`);
    if (!product.sku) 
      errors.push(`Line ${lineNumber}: SKU is required`);
    if (!product.warehouse_code)
      errors.push(`Line ${lineNumber}: Warehouse code is required`);
    if (!product.weight)
      errors.push(`Line ${lineNumber}: Weight is required`);
    if (!product.height)
      errors.push(`Line ${lineNumber}: Height is required`);
    if (!product.length)
      errors.push(`Line ${lineNumber}: Length is required`);
    if (!product.width)
      errors.push(`Line ${lineNumber}: Width is required`);
    if (!product.cbm)
      errors.push(`Line ${lineNumber}: Unit CBM is required`);
    if (!product.vendor_number)
      errors.push(`Line ${lineNumber}: Vendor number is required`);
  });

  return errors;
};
