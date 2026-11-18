import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { CustomerOrderRecord } from '../types';

export function normalizeCustomerOrder(raw: any): CustomerOrderRecord {
  if (!raw || typeof raw !== 'object') return raw;

  const subtotal = Number(raw.subtotal ?? 0);
  const deliveryFee = Number(raw.deliveryFee ?? raw.shippingCost ?? 0);
  const discountAmount = Number(raw.discountAmount ?? 0);
  const totalAmount = Number(
    raw.totalAmount ?? raw.total ?? (subtotal + deliveryFee - discountAmount),
  );

  const items = Array.isArray(raw.items)
    ? raw.items.map((item: any) => {
        const quantity = Number(item.quantity ?? 1);
        const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
        const totalPrice = Number(
          item.totalPrice ?? item.total ?? quantity * unitPrice,
        );
        const unit = item.unit || item.unitLabelBn || item.unitLabel || 'unit';

        return {
          ...item,
          quantity,
          unitPrice,
          totalPrice,
          unit,
        };
      })
    : [];

  return {
    ...raw,
    subtotal,
    deliveryFee,
    discountAmount,
    totalAmount,
    items,
  };
}

export async function fetchCustomerOrdersApi(): Promise<CustomerOrderRecord[]> {
  try {
    const res = await api.get<any[]>('/customer/orders');
    return Array.isArray(res) ? res.map(normalizeCustomerOrder) : [];
  } catch {
    return [];
  }
}

export async function fetchOrderDetailApi(orderId: string): Promise<CustomerOrderRecord> {
  const res = await api.get<any>(`/customer/orders/${encodeURIComponent(orderId)}`);
  return normalizeCustomerOrder(res);
}

export async function cancelOrderApi(
  orderId: string,
): Promise<{ success: boolean; message: string }> {
  return api.post<{ success: boolean; message: string }>(
    `/customer/orders/${encodeURIComponent(orderId)}/cancel`,
  );
}

export async function reorderApi(
  orderId: string,
): Promise<{ success: boolean; itemsAdded: number }> {
  return api.post<{ success: boolean; itemsAdded: number }>(
    `/customer/orders/${encodeURIComponent(orderId)}/reorder`,
  );
}

export function useCustomerOrders() {
  return useQuery({
    queryKey: ['customer-orders'],
    queryFn: fetchCustomerOrdersApi,
    staleTime: 1000 * 60 * 3,
  });
}

export function useOrderDetail(orderId: string) {
  return useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: () => fetchOrderDetailApi(orderId),
    enabled: Boolean(orderId),
    staleTime: 1000 * 30, // 30 sec polling/stale for active order status
  });
}

export function useCancelOrder(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cancelOrderApi(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
    },
  });
}
