import { Inventory, OutboundShipment } from "../types";

export const parseOutboundShipmentCSV = (
  csvText: string,
  products: Inventory[]
): OutboundShipment[] => {
  const lines = csvText.split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());

  return lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const shipment: Partial<OutboundShipment> = {};

      headers.forEach((header, index) => {
        const normalizedHeader = header.toLowerCase().trim();

        switch (normalizedHeader) {
          case "sku (select from dropdown)":
            shipment.sku = values[index];
            break;
          case "quantity":
            shipment.item_quantity = Number(values[index]);
            break;
          case "notes":
            shipment.note = values[index];
            break;
          case "order date":
            shipment.order_date = new Date(values[index]);
            break;
          case "warehouse code":
            shipment.warehouse_code = values[index];
            break;
          case "customer name":
            shipment.customer_name = values[index];
            break;
          case "country":
            shipment.country = values[index];
            break;
          case "address1":
            shipment.address1 = values[index];
            break;
          case "address2":
            shipment.address2 = values[index];
            break;
          case "zip code":
            shipment.zip_code = values[index];
            break;
          case "city":
            shipment.city = values[index];
            break;
          case "state":
            shipment.state = values[index];
            break;
          case "tracking":
            shipment.tracking = values[index];
            break;
          case "shipping fee":
            shipment.shipping_fee = Number(values[index]);
            break;
          case "image link":
            shipment.image_link = values[index];
            break;
          case "vendor":
            shipment.vendor_number = values[index];
            break;
        }
      });

      return shipment as OutboundShipment;
    });
};

export const validateOutboundShipments = (
  shipments: OutboundShipment[],
  products: Inventory[]
): string[] => {
  const errors: string[] = [];

  shipments.forEach((shipment, index) => {
    const lineNumber = index + 2; // +2 because we skip the header and use 0-based indexing

    // Check if a valid product was found via SKU.
    if (!shipment.sku)
      errors.push(`Line ${lineNumber}: SKU not found in inventory`);

    // Validate quantity
    if (!shipment.item_quantity || shipment.item_quantity <= 0)
      errors.push(`Line ${lineNumber}: Quantity must be greater than 0`);

    // For outbound transactions, check if sufficient stock is available.
    if (shipment.sku) {
      const product = products.find((p) => p.sku === shipment.sku);
      if (product && product.stock_check < shipment.item_quantity) {
        errors.push(
          `Line ${lineNumber}: Insufficient quantity for SKU ${product.sku} (available: ${product.stock_check})`
        );
      }
    }
  });

  return errors;
};
