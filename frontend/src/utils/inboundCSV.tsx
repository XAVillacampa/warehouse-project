import { Inventory, InboundShipment } from "../types";

export const parseInboundShipmentCSV = (
  csvText: string,
  products: Inventory[]
): InboundShipment[] => {
  const lines = csvText.split("\n");
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  return lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const shipment: Partial<InboundShipment> = {};

      headers.forEach((header, index) => {
        switch (header) {
          case "shipping date(dd-mm-yyyy)":
            shipment.shipping_date = parseDate(values[index]);
            break;
          case "box":
            shipment.box_label = values[index];
            break;
          case "sku":
            shipment.sku = values[index];
            break;
          case "warehouse code":
            shipment.warehouse_code = values[index];
            break;
          case "quantity":
            shipment.item_quantity = Number(values[index]);
            break;
          case "arriving date":
            shipment.arriving_date = parseDate(values[index]);
            break;
          case "tracking number":
            shipment.tracking_number = values[index];
            break;
          case "vendor number":
            shipment.vendor_number = values[index];
            break;
          default:
            break;
        }
      });

      return shipment as InboundShipment;
    });
};

const parseDate = (dateString: string): string => {
  const [day, month, year] = dateString.includes("/")
    ? dateString.split("/").map(Number)
    : dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
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
    if (!shipment.sku || !products.some((product) => product.sku === shipment.sku))
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