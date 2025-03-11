import { Inventory, InboundShipment } from "../types";

export const parseInboundShipmentCSV = (
  csvText: string,
  products: Inventory[]
): InboundShipment[] => {
  const lines = csvText.split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());

  return lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const shipment: Partial<InboundShipment> = {};

      headers.forEach((header, index) => {
        const normalizedHeader = header.toLowerCase().trim();

        switch (normalizedHeader) {
          case "shipping_date":
            shipment.shipping_date = formatDateForMySQL(new Date(values[index]));
            break;
          case "box_label":
            shipment.box_label = values[index];
            break;
          case "sku (select from dropdown)":
            shipment.sku = values[index];
            break;
          case "item_quantity":
            shipment.item_quantity = Number(values[index]);
            break;
          case "arriving_date":
            shipment.arriving_date = formatDateForMySQL(new Date(values[index]));
            break;
          case "tracking_number":
            shipment.tracking_number = values[index];
            break;
          case "vendor_number":
            shipment.vendor_number = values[index];
            break;
          case "warehouse_code":
            shipment.warehouse_code = values[index];
            break;
          default:
            break;
        }
      });

      return shipment as InboundShipment;
    });
};

const formatDateForMySQL = (date: Date): string => {
  return date.toISOString().split("T")[0]; // 'YYYY-MM-DD'
};

export const validateInboundShipments = (
  shipments: InboundShipment[],
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
      errors.push(`Line ${lineNumber}: Invalid quantity`);

    // Validate required fields
    if (!shipment.shipping_date)
      errors.push(`Line ${lineNumber}: Missing shipping date`);
    if (!shipment.warehouse_code)
      errors.push(`Line ${lineNumber}: Missing warehouse code`);
  });

  return errors;
};