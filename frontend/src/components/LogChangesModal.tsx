import React, { useMemo } from "react";
import { useInventoryStore } from "../store";
import { useAuthStore } from "../store/auth";
import { Inventory, InboundShipment, OutboundShipment } from "../types";
import Modal from "./Modal";
import { format } from "date-fns";

interface LogChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Inventory | null;
}

function LogChangesModal({ isOpen, onClose, product }: LogChangesModalProps) {
  const { inbound, outbound } = useInventoryStore();
  const { user } = useAuthStore();

  const filteredInboundShipments = useMemo(() => {
    if (!product) return [];

    return inbound
      .filter(
        (shipment) =>
          shipment.sku === product.sku &&
          (user?.role === "vendor"
            ? product.vendor_number === user.vendor_number
            : true)
      )
      .map((shipment) => ({ ...shipment, type: "inbound" }))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [product, inbound, user]);

  const filteredOutboundShipments = useMemo(() => {
    if (!product) return [];

    return outbound
      .filter(
        (shipment) =>
          shipment.sku === product.sku &&
          (user?.role === "vendor"
            ? product.vendor_number === user.vendor_number
            : true)
      )
      .map((shipment) => ({ ...shipment, type: "outbound" }))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [product, outbound, user]);

  if (!product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Log Changes - ${product.sku}`}
    >
      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Product Details
          </h3>
          <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Name
              </dt>
              <dd className="text-sm text-gray-900 dark:text-white">
                {product.product_name}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Current Quantity
              </dt>
              <dd className="text-sm text-gray-900 dark:text-white">
                {product.stock_check}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Warehouse Code
              </dt>
              <dd className="text-sm text-gray-900 dark:text-white">
                {product.warehouse_code}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Vendor Number
              </dt>
              <dd className="text-sm text-gray-900 dark:text-white">
                {product.vendor_number}
              </dd>
            </div>
          </dl>
        </div>

        <div className="relative">
          <div
            className="absolute inset-0 flex items-center"
            aria-hidden="true"
          >
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white dark:bg-gray-800 px-2 text-sm text-gray-500 dark:text-gray-400">
              Transaction History
            </span>
          </div>
        </div>

        <div className="flow-root">
          <ul className="-mb-8">
            {filteredInboundShipments.length === 0 &&
            filteredOutboundShipments.length === 0 ? (
              <li className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                No transaction history available
              </li>
            ) : (
              [...filteredInboundShipments, ...filteredOutboundShipments]
                .sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                )
                .map((shipment, idx) => (
                  <li key={shipment.id}>
                    <div className="relative pb-8">
                      {idx !==
                        filteredInboundShipments.length +
                          filteredOutboundShipments.length -
                          1 && (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                          aria-hidden="true"
                        />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span
                            className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-gray-800 ${
                              shipment.type === "inbound"
                                ? "bg-green-500"
                                : "bg-blue-500"
                            }`}
                          >
                            <span className="text-white text-sm font-medium">
                              {shipment.type === "inbound" ? "+" : "-"}
                            </span>
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-sm text-gray-900 dark:text-white">
                              {shipment.type === "inbound"
                                ? "Received"
                                : "Shipped"}{" "}
                              <span className="font-medium">
                                {shipment.item_quantity}
                              </span>{" "}
                              units
                            </p>
                            {shipment.note && (
                              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                                Note: {shipment.note}
                              </p>
                            )}
                            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                              Ref: {shipment.tracking_number}
                            </p>
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                            {format(
                              new Date(shipment.created_at),
                              "MMM d, yyyy HH:mm"
                            )}
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">
                            {shipment.type === "inbound"
                              ? "Inbound"
                              : "Outbound"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))
            )}
          </ul>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default LogChangesModal;
