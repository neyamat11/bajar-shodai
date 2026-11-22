import React from "react";
import { render, act } from "@testing-library/react";
import { CartProvider } from "@/lib/context/CartContext";
import { useCart } from "@/lib/hooks/use-cart";

let currentPath = "/products";
jest.mock("@/i18n/navigation", () => ({
  usePathname: () => currentPath,
}));

jest.mock("next-intl", () => ({
  useLocale: () => "bn",
  useTranslations: () => (key: string) => key,
}));

jest.mock("@/lib/hooks/use-auth", () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));

jest.mock("@/lib/services/cart.service", () => ({
  fetchCart: jest.fn().mockResolvedValue({ items: [], updatedAt: "" }),
  addCartItem: jest.fn(),
  updateCartItem: jest.fn(),
  removeCartItem: jest.fn(),
  clearCartApi: jest.fn(),
}));

function TestCartConsumer({
  onReady,
}: {
  onReady: (ctx: ReturnType<typeof useCart>) => void;
}) {
  const ctx = useCart();
  React.useEffect(() => {
    onReady(ctx);
  }, [ctx, onReady]);
  return <div data-testid="status">{ctx.isOpen ? "open" : "closed"}</div>;
}

describe("Cart Drawer History & Back Button Interception (Web)", () => {
  let pushStateSpy: jest.SpyInstance;
  let replaceStateSpy: jest.SpyInstance;
  let backSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    currentPath = "/products";
    pushStateSpy = jest.spyOn(window.history, "pushState").mockImplementation(() => {});
    replaceStateSpy = jest.spyOn(window.history, "replaceState").mockImplementation(() => {});
    backSpy = jest.spyOn(window.history, "back").mockImplementation(() => {});
  });

  afterEach(() => {
    pushStateSpy.mockRestore();
    replaceStateSpy.mockRestore();
    backSpy.mockRestore();
  });

  it("pushes history state when cart drawer is opened", () => {
    let ctxRef: ReturnType<typeof useCart> | null = null;
    render(
      <CartProvider>
        <TestCartConsumer onReady={(ctx) => (ctxRef = ctx)} />
      </CartProvider>
    );

    act(() => {
      ctxRef!.openCart();
    });

    expect(pushStateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ drawer: "cart" }),
      "",
      expect.any(String)
    );
    expect(ctxRef!.isOpen).toBe(true);
  });

  it("closes cart drawer on browser popstate without calling history.back() again", () => {
    let ctxRef: ReturnType<typeof useCart> | null = null;
    render(
      <CartProvider>
        <TestCartConsumer onReady={(ctx) => (ctxRef = ctx)} />
      </CartProvider>
    );

    act(() => {
      ctxRef!.openCart();
    });
    expect(ctxRef!.isOpen).toBe(true);

    // User taps browser/phone back button -> triggers popstate
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(ctxRef!.isOpen).toBe(false);
    // Should NOT call history.back() again because the browser already handled the pop
    expect(backSpy).not.toHaveBeenCalled();
  });

  it("calls history.back() when drawer is closed via close button / backdrop", () => {
    let ctxRef: ReturnType<typeof useCart> | null = null;
    render(
      <CartProvider>
        <TestCartConsumer onReady={(ctx) => (ctxRef = ctx)} />
      </CartProvider>
    );

    act(() => {
      ctxRef!.openCart();
    });
    expect(ctxRef!.isOpen).toBe(true);

    act(() => {
      ctxRef!.closeCart();
    });

    expect(backSpy).toHaveBeenCalledTimes(1);
    expect(ctxRef!.isOpen).toBe(false);
  });

  it("replaces state instead of calling back() when navigating to checkout/cart", () => {
    let ctxRef: ReturnType<typeof useCart> | null = null;
    render(
      <CartProvider>
        <TestCartConsumer onReady={(ctx) => (ctxRef = ctx)} />
      </CartProvider>
    );

    act(() => {
      ctxRef!.openCart();
    });
    expect(ctxRef!.isOpen).toBe(true);

    act(() => {
      ctxRef!.closeCart({ navigating: true });
    });

    expect(replaceStateSpy).toHaveBeenCalledWith(null, "", expect.any(String));
    expect(backSpy).not.toHaveBeenCalled();
    expect(ctxRef!.isOpen).toBe(false);
  });
});
