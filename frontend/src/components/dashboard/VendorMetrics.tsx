import React from "react";
import { Package, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { useInventoryStore } from "../../store";
import { useAuthStore } from "../../store/auth";
import { DashboardCard } from "./DashboardCard";

function VendorMetrics() {
  const { inventory, inbound, outbound } = useInventoryStore();
  const { user } = useAuthStore();

  console.log("Logged-in User:", user);
  console.log("Inventory:", inventory);
  console.log("Inbound Transactions:", inbound);
  console.log("Outbound Transactions:", outbound);

  // Filter inventory by vendor number
  const vendorInventory = inventory.filter(
    (item) => item.vendor_number === user?.vendor_number
  );
  console.log("Vendor Inventory:", vendorInventory);

  const totalProducts = vendorInventory.length;
  const lowStockItems = vendorInventory.filter((item) => item.stock_check <= 50);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Filter inbound and outbound transactions for the vendor
  const vendorInbound = inbound.filter(
    (t) =>
      t.vendor_number === user?.vendor_number &&
      new Date(t.created_at) >= thirtyDaysAgo
  );
  console.log("Vendor Inbound Transactions:", vendorInbound);

  const vendorOutbound = outbound.filter(
    (t) =>
      t.vendor_number === user?.vendor_number &&
      new Date(t.created_at) >= thirtyDaysAgo
  );
  console.log("Vendor Outbound Transactions:", vendorOutbound);

  const inboundCount = vendorInbound.length;
  const outboundCount = vendorOutbound.length;

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <DashboardCard
        title="Total Products"
        value={totalProducts}
        icon={Package}
        trend="neutral"
        trendValue="Current inventory count"
      />
      <DashboardCard
        title="Inbound Orders"
        value={inboundCount}
        icon={TrendingUp}
        trend="neutral"
        trendValue="Inbound shipments count"
      />
      <DashboardCard
        title="Outbound Orders"
        value={outboundCount}
        icon={TrendingDown}
        trend="neutral"
        trendValue="Outbound shipments count"
      />
      <DashboardCard
        title="Low Stock Items"
        value={lowStockItems.length}
        icon={AlertTriangle}
        trend={lowStockItems.length > 0 ? "down" : "neutral"}
        trendValue={
          lowStockItems.length > 0
            ? "Requires attention"
            : "Stock levels healthy"
        }
      />
    </div>
  );
}

export default VendorMetrics;