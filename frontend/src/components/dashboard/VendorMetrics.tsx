import React from "react";
import { Package, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { useInventoryStore } from "../../store";
import { useAuthStore } from "../../store/auth";
import { DashboardCard } from "./DashboardCard";

function VendorMetrics() {
  const { inventory, inbound, outbound } = useInventoryStore();
  const { user } = useAuthStore();

  // Filter inventory by vendor number
  const vendorInventory = inventory.filter(
    (item) => item.vendor_number === user?.vendorNumber
  );

  const totalProducts = vendorInventory.length;
  const lowStockItems = vendorInventory.filter((item) => item.stock_check <= 50);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Filter inbound and outbound transactions for the vendor
  const vendorInbound = inbound.filter(
    (t) =>
      t.vendor_number === user?.vendorNumber &&
      new Date(t.created_at) >= thirtyDaysAgo
  );
  const vendorOutbound = outbound.filter(
    (t) =>
      t.vendor_number === user?.vendorNumber &&
      new Date(t.created_at) >= thirtyDaysAgo
  );

  const inboundCount = vendorInbound.length;
  const outboundCount = vendorOutbound.length;

  // Helper function to calculate trends
  const calculateTrend = (transactions: any[], type: "inbound" | "outbound") => {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const recent = transactions.filter(
      (t) => new Date(t.created_at) >= fifteenDaysAgo
    ).length;

    const previous = transactions.filter(
      (t) =>
        new Date(t.created_at) >= thirtyDaysAgo &&
        new Date(t.created_at) < fifteenDaysAgo
    ).length;

    if (previous === 0) {
      return {
        trend: recent > 0 ? "up" : "neutral",
        value: recent > 0 ? "New activity" : "No previous data",
      };
    }

    const change = ((recent - previous) / previous) * 100;
    return {
      trend: change > 0 ? "up" : change < 0 ? "down" : "neutral",
      value: `${Math.abs(change).toFixed(1)}% from last period`,
    };
  };

  const inboundTrend = calculateTrend(vendorInbound, "inbound");
  const outboundTrend = calculateTrend(vendorOutbound, "outbound");

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