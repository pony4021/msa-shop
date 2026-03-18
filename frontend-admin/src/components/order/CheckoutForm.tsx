// frontend/src/components/order/CheckoutForm.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle } from "lucide-react";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useOrderMutations } from "@/hooks/useOrders";
import { useCartStore } from "@/store/cartStore";
import { formatCurrency } from "@/lib/utils";

type Stage = "idle" | "creating" | "paying";

export default function CheckoutForm(): JSX.Element {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const { createOrderMutation, createPaymentMutation } = useOrderMutations();

  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<{ success: boolean; message: string; orderId?: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const isEmpty = items.length === 0;

  const onCheckout = async (): Promise<void> => {
    if (isEmpty) return;
    try {
      setStage("creating");
      const order = await createOrderMutation.mutateAsync({
        items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
      });

      setStage("paying");
      const payment = await createPaymentMutation.mutateAsync({
        orderId: order.id,
        amount: order.total_price,
      });

      if (payment.status === "success") {
        clearCart();
        setResult({ success: true, message: "결제가 완료되었습니다!", orderId: order.id });
      } else {
        setResult({ success: false, message: "결제에 실패했습니다. 다시 시도해주세요.", orderId: order.id });
      }
      setModalOpen(true);
    } catch (error) {
      setResult({ success: false, message: error instanceof Error ? error.message : "주문 처리 중 오류가 발생했습니다." });
      setModalOpen(true);
    } finally {
      setStage("idle");
    }
  };

  const handleModalClose = (): void => {
    setModalOpen(false);
    if (result?.success && result.orderId) {
      router.push(`/orders/${result.orderId}`);
    }
  };

  const isLoading = stage !== "idle";
  const loadingLabel = stage === "creating" ? "주문 생성 중..." : "결제 처리 중...";

  return (
    <div className="space-y-4">
      {isEmpty ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          <p>장바구니가 비어 있습니다.</p>
          <p className="mt-1 text-sm">상품을 먼저 담아주세요.</p>
        </div>
      ) : (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
          {items.map((item) => (
            <div className="flex items-center justify-between text-sm" key={item.id}>
              <span className="text-slate-700">
                {item.name} <span className="text-slate-400">× {item.quantity}</span>
              </span>
              <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
          <hr className="my-2 border-slate-100" />
          <div className="flex items-center justify-between font-semibold">
            <span>합계</span>
            <span className="text-lg text-slate-900">{formatCurrency(total)}</span>
          </div>
        </div>
      )}

      <Button
        className="w-full"
        loading={isLoading}
        onClick={onCheckout}
        disabled={isEmpty || isLoading}
      >
        {isLoading ? loadingLabel : "주문 및 결제"}
      </Button>

      <Modal isOpen={modalOpen} onClose={handleModalClose} title="결제 결과" size="sm">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          {result?.success ? (
            <CheckCircle className="h-12 w-12 text-emerald-500" />
          ) : (
            <XCircle className="h-12 w-12 text-rose-500" />
          )}
          <p className="text-sm text-slate-700">{result?.message}</p>
          <Button className="mt-2 w-full" onClick={handleModalClose}>
            {result?.success ? "주문 상세 보기" : "닫기"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
