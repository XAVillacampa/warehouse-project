import { Transaction, Product } from "../types";

export const parseTransactionCSV = (
  csvText: string,
  type: "inbound" | "outbound",
  products: Product[]
): Transaction[] => {
  const lines = csvText.split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());

  return lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const transaction: Partial<Transaction> = {
        type,
        status: "pending",
      };
      // console.log("Products available for lookup:", products);

      headers.forEach((header, index) => {
        const normalizedHeader = header.toLowerCase().trim();

        switch (normalizedHeader) {
          case "sku":
          case "sku (select from dropdown)": // Handle dropdown variant
            const value = values[index]?.trim();
            const product = products.find(
              (p) => p.sku.toLowerCase() === value.toLowerCase()
            );
            if (product) {
              transaction.sku = product.sku;
            }
            break;
          case "quantity":
            transaction.quantity = Number(values[index]?.trim()) || 0;
            break;
          case "notes":
            transaction.notes = values[index]?.trim();
            break;
        }
      });

      // console.log("CSV Headers:", headers);
      // console.log("CSV Values:", values);

      return {
        // id: crypto.randomUUID(),
        created_at: new Date(),
        updated_at: new Date(),
        ...transaction,
      } as Transaction;
    });
};

export const validateTransactions = (
  transactions: Transaction[],
  products: Product[],
  type: "inbound" | "outbound"
): string[] => {
  const errors: string[] = [];

  transactions.forEach((transaction, index) => {
    const lineNumber = index + 2; // +2 because we skip the header and use 0-based indexing

    // Check if a valid product was found via SKU.
    if (!transaction.sku)
      errors.push(`Line ${lineNumber}: SKU not found in inventory`);

    // Validate quantity
    if (!transaction.quantity || transaction.quantity <= 0)
      errors.push(`Line ${lineNumber}: Quantity must be greater than 0`);

    // For outbound transactions, check if sufficient stock is available.
    if (transaction.sku) {
      const product = products.find((p) => p.id === transaction.sku);
      if (
        type === "outbound" &&
        product &&
        product.quantity < transaction.quantity
      ) {
        errors.push(
          `Line ${lineNumber}: Insufficient quantity for SKU ${product.sku} (available: ${product.quantity})`
        );
      }
    }
  });

  return errors;
};
