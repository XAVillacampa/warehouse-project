import { Inventory, InboundShipment, OutboundShipment } from "../types";

export const generateStorageReport = (
  inventory: Inventory[],
  startDate: string,
  endDate: string
): string => {
  const headers = [
    "Date",
    "SKU",
    "Product Name",
    "Stock Check",
    "Warehouse Code",
    "Vendor Number",
    "CBM",
  ];
  const rows = inventory.map((item) => [
    new Date().toISOString().split("T")[0],
    item.sku,
    item.product_name,
    item.stock_check,
    item.warehouse_code,
    item.vendor_number || "N/A",
    Number(item.cbm).toFixed(5), // Ensure cbm is a number before calling toFixed
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
};

export const generateInventoryReport = (
  inventory: Inventory[],
  startDate: string,
  endDate: string
): string => {
  const headers = [
    "SKU",
    "Product Name",
    "Stock Check",
    "Outbound",
    "Warehouse Code",
    "Vendor Number",
    "CBM",
    "Status",
  ];
  const rows = inventory.map((item) => [
    item.sku,
    item.product_name,
    item.stock_check,
    item.outbound,
    item.warehouse_code,
    item.vendor_number || "N/A",
    Number(item.cbm).toFixed(5), // Ensure cbm is a number before calling toFixed
    item.stock_check <= 0 ? "Out of Stock" : "In Stock",
  ]);

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
};

export const generateInboundReport = (
  inboundShipments: InboundShipment[],
  inventory: Inventory[],
  startDate: string,
  endDate: string
): string => {
  const startDateTime = new Date(startDate);
  const endDateTime = new Date(endDate);
  endDateTime.setHours(23, 59, 59, 999);

  const filteredShipments = inboundShipments.filter((shipment) => {
    const shippingDate = new Date(shipment.shipping_date);
    return shippingDate >= startDateTime && shippingDate <= endDateTime;
  });

  const headers = [
    "Shipping Date",
    "Box Label",
    "SKU",
    "Product Name",
    "Quantity",
    "Warehouse Code",
    "Vendor Number",
    "Tracking Number",
  ];
  const rows = filteredShipments.map((shipment) => {
    const item = inventory.find((i) => i.sku === shipment.sku);
    return [
      new Date(shipment.shipping_date).toISOString().split("T")[0], // Format date to YYYY-MM-DD
      shipment.box_label,
      item?.sku || "N/A",
      item?.product_name || "Unknown Product",
      shipment.item_quantity,
      shipment.warehouse_code,
      shipment.vendor_number || "N/A",
      shipment.tracking_number,
    ];
  });

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
};

export const generateOutboundReport = (
  outboundShipments: OutboundShipment[],
  inventory: Inventory[],
  startDate: string,
  endDate: string
): string => {
  const startDateTime = new Date(startDate);
  const endDateTime = new Date(endDate);
  endDateTime.setHours(23, 59, 59, 999);

  const filteredShipments = outboundShipments.filter((shipment) => {
    const orderDate = new Date(shipment.order_date);
    return orderDate >= startDateTime && orderDate <= endDateTime;
  });

  const headers = [
    "Order Date",
    "Order ID",
    "SKU",
    "Product Name",
    "Quantity",
    "Warehouse Code",
    "Customer Name",
    "Country",
    "Shipping Fee",
    "Tracking Number",
    "Notes",
  ];
  const rows = filteredShipments.map((shipment) => {
    const item = inventory.find((i) => i.sku === shipment.sku);
    return [
      new Date(shipment.order_date).toISOString().split("T")[0], // Format date to YYYY-MM-DD
      shipment.order_id,
      item?.sku || "N/A",
      item?.product_name || "Unknown Product",
      shipment.item_quantity,
      shipment.warehouse_code,
      shipment.customer_name,
      shipment.country,
      Number(shipment.shipping_fee || 0).toFixed(2),
      shipment.tracking_number || "N/A",
      shipment.note || "N/A",
    ];
  });

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
};
