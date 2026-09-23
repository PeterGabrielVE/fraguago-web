'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  History,
  Minus,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
  TriangleAlert,
  User,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PAYMENT_METHOD_LABELS, formatMoney } from '@/lib/currency';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const LOW_STOCK_THRESHOLD = 5;

type Product = {
  id: string;
  name: string;
  price: number | string;
  currency?: string;
  stock: number;
  sku?: string | null;
};

type CartItem = {
  productId: string;
  name: string;
  price: number;
  currency?: string;
  stock: number;
  quantity: number;
};

function personLabel(entity: any) {
  const firstName = entity?.user?.profile?.firstName ?? '';
  const lastName = entity?.user?.profile?.lastName ?? '';
  return `${firstName} ${lastName}`.trim();
}

function initials(name: string) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productQuery, setProductQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  const [members, setMembers] = useState<any[]>([]);
  const [memberId, setMemberId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [memberQuery, setMemberQuery] = useState('');
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const memberBoxRef = useRef<HTMLDivElement>(null);

  const [sales, setSales] = useState<any[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [detailSale, setDetailSale] = useState<any | null>(null);

  const [confirming, setConfirming] = useState(false);

  async function loadProducts() {
    try {
      setProducts(await api.list('/products?pageSize=100'));
    } catch (err: any) {
      toast.add({ title: 'No se pudieron cargar los productos', description: err.message, type: 'error' });
    }
  }

  async function loadSales() {
    setSalesLoading(true);
    try {
      setSales(await api.list('/sales?pageSize=20'));
    } catch (err: any) {
      toast.add({ title: 'No se pudo cargar el historial', description: err.message, type: 'error' });
    } finally {
      setSalesLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
    api.list('/members').then(setMembers).catch(() => {});
    loadSales();
  }, []);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (memberBoxRef.current && !memberBoxRef.current.contains(event.target as Node)) setMemberDropdownOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) || String(p.sku ?? '').toLowerCase().includes(q));
  }, [products, productQuery]);

  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => personLabel(m).toLowerCase().includes(q));
  }, [members, memberQuery]);

  const selectedMember = members.find((m) => m.id === memberId) ?? null;

  function selectMember(m: any) {
    setMemberId(m.id);
    setMemberQuery(personLabel(m));
    setMemberDropdownOpen(false);
  }

  function clearMember() {
    setMemberId('');
    setMemberQuery('');
  }

  function addToCart(product: Product) {
    if (product.stock <= 0) {
      toast.add({ title: `"${product.name}" no tiene stock disponible`, type: 'error' });
      return;
    }
    setCart((current) => {
      const existing = current.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.add({ title: `Solo hay ${product.stock} unidades de "${product.name}"`, type: 'error' });
          return current;
        }
        return current.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...current, {
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        currency: product.currency,
        stock: product.stock,
        quantity: 1,
      }];
    });
  }

  function setQuantity(productId: string, quantity: number) {
    setCart((current) => current.flatMap((i) => {
      if (i.productId !== productId) return [i];
      const clamped = Math.max(0, Math.min(quantity, i.stock));
      if (clamped === 0) return [];
      return [{ ...i, quantity: clamped }];
    }));
  }

  function removeFromCart(productId: string) {
    setCart((current) => current.filter((i) => i.productId !== productId));
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCurrency = cart[0]?.currency;
  // El API rechaza ventas con monedas mezcladas (el ingreso va en una sola).
  const mixedCurrencies = new Set(cart.map((i) => i.currency)).size > 1;

  async function confirmSale() {
    if (cart.length === 0) return;
    setConfirming(true);
    try {
      await api.post('/sales', {
        memberId: memberId || undefined,
        paymentMethod,
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      toast.add({ title: 'Venta registrada', type: 'success' });
      setCart([]);
      clearMember();
      await Promise.all([loadProducts(), loadSales()]);
    } catch (err: any) {
      toast.add({ title: 'No se pudo registrar la venta', description: err.message, type: 'error' });
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 p-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
            <ShoppingCart className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Punto de venta</h1>
            <p className="mt-1 text-slate-600">Registra ventas de productos a socios o al público.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        {/* Buscador y catálogo de productos */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Buscar producto por nombre o SKU…"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-9 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            />
            {productQuery && (
              <button
                type="button"
                onClick={() => setProductQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Search className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">
                {products.length === 0 ? 'No hay productos cargados en el inventario.' : 'Sin resultados para esa búsqueda.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((p) => {
                const outOfStock = p.stock <= 0;
                const lowStock = !outOfStock && p.stock <= LOW_STOCK_THRESHOLD;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={outOfStock}
                    onClick={() => addToCart(p)}
                    className="flex flex-col items-start gap-1.5 rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-amber-300 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-200 disabled:hover:bg-white"
                  >
                    <p className="font-medium text-slate-900">{p.name}</p>
                    <p className="text-sm font-semibold text-amber-700">{formatMoney(p.price, p.currency)}</p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        outOfStock
                          ? 'bg-slate-100 text-slate-500'
                          : lowStock
                            ? 'bg-red-100 text-red-700'
                            : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {lowStock && !outOfStock && <TriangleAlert className="h-3 w-3" />}
                      {outOfStock ? 'Sin stock' : `Stock: ${p.stock}`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Carrito */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <ShoppingCart className="h-5 w-5 text-amber-600" />
            Carrito
          </h2>

          {/* Socio opcional */}
          <div ref={memberBoxRef} className="relative">
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Socio (opcional)</label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={memberQuery}
                onChange={(e) => { setMemberQuery(e.target.value); setMemberId(''); setMemberDropdownOpen(true); }}
                onFocus={() => setMemberDropdownOpen(true)}
                placeholder="Venta al público, o buscá un socio…"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-9 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
              {memberQuery && (
                <button
                  type="button"
                  onClick={clearMember}
                  aria-label="Quitar socio"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {memberDropdownOpen && (
              <div className="absolute z-20 mt-1.5 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {filteredMembers.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-slate-500">Sin resultados.</p>
                ) : (
                  filteredMembers.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => selectMember(m)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-amber-50"
                    >
                      <Avatar size="sm" className="border border-slate-200 bg-slate-100">
                        <AvatarFallback className="bg-slate-200 text-xs text-slate-600">{initials(personLabel(m))}</AvatarFallback>
                      </Avatar>
                      <span className="text-slate-700">{personLabel(m) || m.id}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Items */}
          {cart.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
              Agregá productos desde el catálogo.
            </p>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500">{formatMoney(item.price, item.currency)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQuantity(item.productId, item.quantity - 1)}
                      className="rounded-md border border-slate-200 p-1 text-slate-600 hover:bg-slate-100"
                      aria-label="Restar"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium text-slate-800">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                      className="rounded-md border border-slate-200 p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Sumar"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.productId)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Quitar del carrito"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Total y confirmar */}
          <div className="space-y-3 border-t border-slate-200 pt-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">Método de pago</span>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            {mixedCurrencies && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                El carrito mezcla productos en distintas monedas: registra una venta por moneda.
              </p>
            )}
            <div className="flex items-center justify-between text-base font-semibold text-slate-900">
              <span>Total</span>
              <span>{mixedCurrencies ? '—' : formatMoney(cartTotal, cartCurrency)}</span>
            </div>
            <button
              type="button"
              onClick={confirmSale}
              disabled={cart.length === 0 || confirming || mixedCurrencies}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Receipt className="h-4 w-4" />
              {confirming ? 'Confirmando…' : 'Confirmar venta'}
            </button>
          </div>
        </div>
      </div>

      {/* Historial de ventas */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <History className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-slate-900">Historial de ventas</h2>
        </div>
        {salesLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Receipt className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">Todavía no se registraron ventas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-700">Fecha</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Socio</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Ítems</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => {
                  const itemCount = (s.items ?? []).reduce((sum: number, it: any) => sum + it.quantity, 0);
                  return (
                    <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(s.soldAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{s.member ? (personLabel(s.member) || s.memberId) : 'Público general'}</td>
                      <td className="px-4 py-3 text-slate-600">{itemCount} unidad{itemCount === 1 ? '' : 'es'}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{formatMoney(s.total)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setDetailSale(s)}
                          className="text-xs font-semibold text-amber-700 hover:text-amber-800"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detalle de venta */}
      <Dialog open={Boolean(detailSale)} onOpenChange={(open) => !open && setDetailSale(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle de venta</DialogTitle>
            <DialogDescription>
              {detailSale && new Date(detailSale.soldAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
              {' · '}
              {detailSale?.member ? (personLabel(detailSale.member) || detailSale.memberId) : 'Público general'}
              {detailSale?.paymentMethod && ` · ${PAYMENT_METHOD_LABELS[detailSale.paymentMethod] ?? detailSale.paymentMethod}`}
              {detailSale?.createdBy && ` · Registró: ${`${detailSale.createdBy.profile?.firstName ?? ''} ${detailSale.createdBy.profile?.lastName ?? ''}`.trim() || detailSale.createdBy.email}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {(detailSale?.items ?? []).map((it: any) => (
              <div key={it.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{it.product?.name ?? it.productId} × {it.quantity}</span>
                <span className="font-medium text-slate-800">{formatMoney(it.subtotal)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-semibold text-slate-900">
              <span>Total</span>
              <span>{formatMoney(detailSale?.total ?? 0, detailSale?.currency)}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
