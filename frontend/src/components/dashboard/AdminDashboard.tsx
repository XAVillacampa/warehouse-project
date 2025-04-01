import React from "react";
import { Package, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { useInventoryStore } from "../../store";
import { DashboardCard } from "./DashboardCard";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
} from "recharts";

function AdminDashboard() {
  const { inventory, inbound, outbound } = useInventoryStore();

  const totalProducts = inventory.length;
  const lowStockItems = inventory.filter((p) => p.stock_check <= 50);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Filter inbound and outbound transactions from the last 30 days
  const recentInbound = inbound.filter(
    (t) => new Date(t.created_at) >= thirtyDaysAgo
  );
  const recentOutbound = outbound.filter(
    (t) => new Date(t.created_at) >= thirtyDaysAgo
  );

  // Count inbound and outbound transactions
  const inboundCount = recentInbound.length;
  const outboundCount = recentOutbound.length;

  // Updated helper function to calculate trends
  const calculateTrend = (transactions: any[], totalCount: number) => {
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

  const inboundTrend = calculateTrend(recentInbound, inboundCount);
  const outboundTrend = calculateTrend(recentOutbound, outboundCount);

  // Step 1: Aggregate products by vendor_number
  const aggregatedData = inventory.reduce((acc, item) => {
    // If vendor_number already exists in accumulator, aggregate the data
    if (acc[item.vendor_number]) {
      acc[item.vendor_number].stockLevel += item.stock_check;
      acc[item.vendor_number].inbound += inboundCount;
      acc[item.vendor_number].outbound += outboundCount;
      acc[item.vendor_number].lowStock +=
        item.stock_check <= 50 ? item.stock_check : 0;
    } else {
      // If vendor_number is not in accumulator, initialize it
      acc[item.vendor_number] = {
        vendorNumber: item.vendor_number,
        stockLevel: item.stock_check,
        inbound: inboundCount,
        outbound: outboundCount,
        lowStock: item.stock_check <= 50 ? item.stock_check : 0,
      };
    }
    return acc;
  }, {});

  // Step 2: Convert the aggregated data object into an array
  const chartData = Object.values(aggregatedData);

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
        trend={inboundTrend.trend}
        trendValue={inboundTrend.value}
      />
      <DashboardCard
        title="Outbound Orders"
        value={outboundCount}
        icon={TrendingDown}
        trend={outboundTrend.trend}
        trendValue={outboundTrend.value}
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

      {/* Stacked Bar Chart with Stock Level, Inbound, Outbound, and Low Stock Data */}
      {inventory.length > 0 && (
        <div className="col-span-1 sm:col-span-2 lg:col-span-4">
          <h3 className="text-xl font-semibold mb-4 text-black dark:text-white">
            Products Data with Total Stock, Inbound, Outbound, and Low Stock
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="vendorNumber"
                tickFormatter={(value) =>
                  value.length > 10 ? value.slice(0, 10) + "..." : value
                }
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="stockLevel"
                stackId="a"
                fill="#616ec1"
                name="Total Stock"
              />
              <Bar
                dataKey="inbound"
                stackId="a"
                fill="#8884d8"
                name="Inbound"
              />
              <Bar
                dataKey="outbound"
                stackId="a"
                fill="#a0adff"
                name="Outbound"
              />
              <Bar
                dataKey="lowStock"
                stackId="a"
                fill="#c6cdfa"
                name="Low Stock"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
