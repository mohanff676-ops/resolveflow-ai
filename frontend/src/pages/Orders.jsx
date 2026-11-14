import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Search,
  Truck,
  AlertTriangle,
  Clock,
  Eye,
  RefreshCw,
  MapPin,
  User,
  Sparkles,
} from 'lucide-react';
import { orderService } from '../services/order.service.js';
import Card from '../components/common/Card.jsx';
import Badge from '../components/common/Badge.jsx';
import Button from '../components/common/Button.jsx';
import Spinner from '../components/common/Spinner.jsx';
import Modal from '../components/common/Modal.jsx';
import EmptyState from '../components/common/EmptyState.jsx';

export const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await orderService.getOrders({
        search: searchTerm,
        status: statusFilter,
      });
      if (res.success) {
        setOrders(res.data);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleOpenDetail = async (order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
    try {
      setLoadingDetail(true);
      const res = await orderService.getOrderById(order.id);
      if (res.success) {
        setSelectedOrder(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch order details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-indigo-600" />
              Orders
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              View customer purchases, fulfillment status, and delivery schedules.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="md"
              icon={RefreshCw}
              onClick={fetchOrders}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by order # (e.g. ORD-1003)..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </form>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-xs text-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:bg-white focus:border-indigo-500"
            >
              <option value="">All Fulfillment Statuses</option>
              <option value="delayed">Delayed (SLA Breached)</option>
              <option value="delivered">Delivered</option>
              <option value="shipped">Shipped (In Transit)</option>
              <option value="processing">Processing</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center">
            <Spinner size="md" />
          </div>
        ) : orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Fulfillment Status</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4">Expected Delivery</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {orders.map((ord) => {
                  const isDelayed = ord.status === 'delayed';
                  return (
                    <tr
                      key={ord.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isDelayed ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                        {ord.order_number}
                        {isDelayed && (
                          <span className="ml-2 inline-flex items-center text-[11px] font-sans font-medium text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                            <AlertTriangle className="w-3 h-3 mr-0.5" /> 3 days late
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{ord.customer?.name || 'Customer'}</div>
                        <div className="text-[11px] text-slate-500">{ord.customer?.email}</div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">
                        ${Number(ord.total_amount).toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge status={ord.status} size="xs" />
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {new Date(ord.order_date).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-[11px] text-slate-600">
                        {ord.expected_delivery
                          ? new Date(ord.expected_delivery).toLocaleDateString()
                          : 'N/A'}
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Eye}
                          onClick={() => handleOpenDetail(ord)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8">
            <EmptyState
              icon={Package}
              title="No orders found"
              description="No orders match your filter criteria."
            />
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Order ${selectedOrder.order_number}`}
          subtitle={`Placed on ${new Date(selectedOrder.order_date).toLocaleString()}`}
        >
          <div className="space-y-5 text-xs">
            {/* Customer & Address Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-1.5 text-slate-700 font-semibold mb-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>Customer Details</span>
                </div>
                <div className="font-bold text-slate-900 text-sm">{selectedOrder.customer?.name}</div>
                <div className="text-slate-500 mt-0.5">{selectedOrder.customer?.email}</div>
                <div className="text-[11px] text-indigo-700 font-medium mt-1">
                  Customer Tier: <strong className="uppercase">{selectedOrder.customer?.tier || 'standard'}</strong>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-1.5 text-slate-700 font-semibold mb-2">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <span>Shipping Address & Delivery</span>
                </div>
                <div className="text-slate-700">
                  {typeof selectedOrder.shipping_address === 'object' && selectedOrder.shipping_address
                    ? `${selectedOrder.shipping_address.street || ''}, ${selectedOrder.shipping_address.city || ''}, ${selectedOrder.shipping_address.state || ''} ${selectedOrder.shipping_address.zip || ''}`
                    : selectedOrder.shipping_address || 'Standard Address on File'}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Carrier Notes: {selectedOrder.notes || 'None logged'}
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">Purchased Items</h4>
              {selectedOrder.items?.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans text-xs">
                      {selectedOrder.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {item.product?.name || 'Product Item'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-indigo-600">
                            {item.product?.sku || 'SKU'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right text-slate-700 font-mono">
                            ${Number(item.unit_price).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                            ${Number(item.quantity * item.unit_price).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-500">No items available.</p>
              )}
            </div>

            {/* Total and Action */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-xs">Total Order Value:</span>
                <span className="text-xl font-bold text-slate-900 ml-2 font-mono">
                  ${Number(selectedOrder.total_amount).toFixed(2)}
                </span>
              </div>

              <Button
                variant="primary"
                size="sm"
                icon={Sparkles}
                onClick={() => {
                  setIsDetailModalOpen(false);
                  navigate(`/create-ticket?orderId=${selectedOrder.order_number}`);
                }}
              >
                Create Ticket for Order
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Orders;
