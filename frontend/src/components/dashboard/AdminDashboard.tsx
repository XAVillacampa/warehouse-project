import React, { useEffect, useState } from "react";
import { Package, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { DashboardCard } from "./DashboardCard";

function AdminDashboard() {
  const [totalProducts, setTotalProducts] = useState(0);
  const [lowStockItems, setLowStockItems] = useState(0);
  const [inboundCount, setInboundCount] = useState(0);
  const [outboundCount, setOutboundCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch data from the backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch total products
        const productsResponse = await fetch("http://192.168.100.12:5000/api/inventory");
        const products = await productsResponse.json();
        setTotalProducts(products.length);

        // Calculate low stock items
        const lowStock = products.filter((p: any) => p.stock_check <= p.min_stock_level);
        setLowStockItems(lowStock.length);

        // Fetch inbound shipments
        const inboundResponse = await fetch("http://192.168.100.12:5000/api/inbound-shipments");
        const inboundShipments = await inboundResponse.json();
        setInboundCount(inboundShipments.length);

        // Fetch outbound shipments
        const outboundResponse = await fetch("http://192.168.100.12:5000/api/outbound-shipments");
        const outboundShipments = await outboundResponse.json();
        setOutboundCount(outboundShipments.length);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

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
        value={lowStockItems}
        icon={AlertTriangle}
        trend={lowStockItems > 0 ? "down" : "neutral"}
        trendValue={
          lowStockItems > 0
            ? "Requires attention"
            : "Stock levels healthy"
        }
      />
    </div>
  );
}

export default AdminDashboard;