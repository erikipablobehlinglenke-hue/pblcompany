"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string;
  name: string;
  sku: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  active: boolean;
};

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  active: boolean;
};

type Sale = {
  id: string;
  sale_date: string;
  status: string;
  payment_method: string | null;
  total: number;
  customers?: {
    name: string;
  } | null;
};

type CartItem = {
  product_id: string;
  name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  stock_available: number;
};

const paymentMethods = [
  "Pix",
  "Dinheiro",
  "Cartão de débito",
  "Cartão de crédito",
  "Outro",
];

function getBrazilDate() {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export default function VendasPage() {
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [discount, setDiscount] = useState("");

  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");

  const [cart, setCart] = useState<CartItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchProduct, setSearchProduct] = useState("");

  async function loadData() {
    setLoading(true);

    const [
      productsResult,
      customersResult,
      salesResult,
    ] = await Promise.all([
      supabase
        .from("products")
        .select(
          "id,name,sku,cost_price,sale_price,stock_quantity,active"
        )
        .eq("active", true)
        .order("name"),

      supabase
        .from("customers")
        .select("id,name,phone,active")
        .eq("active", true)
        .order("name"),

      supabase
        .from("sales")
        .select(
          "id,sale_date,status,payment_method,total,customers(name)"
        )
        .order("sale_date", { ascending: false })
        .limit(10),
    ]);

    if (productsResult.error) {
      console.error(productsResult.error);
      alert("Erro ao carregar produtos.");
    } else {
      setProducts(productsResult.data || []);
    }

    if (customersResult.error) {
      console.error(customersResult.error);
      alert("Erro ao carregar clientes.");
    } else {
      setCustomers(customersResult.data || []);
    }

    if (salesResult.error) {
      console.error(salesResult.error);
      alert("Erro ao carregar vendas.");
    } else {
      setSales((salesResult.data || []) as Sale[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = searchProduct.toLowerCase();

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term)
    );
  }, [products, searchProduct]);

  const subtotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total + item.quantity * item.unit_price,
      0
    );
  }, [cart]);

  const discountValue = Math.max(
    0,
    Number(discount.replace(",", ".")) || 0
  );

  const total = Math.max(0, subtotal - discountValue);

  const estimatedProfit = useMemo(() => {
    const cost = cart.reduce(
      (total, item) =>
        total + item.quantity * item.unit_cost,
      0
    );

    return total - cost;
  }, [cart, total]);

  function addProduct() {
    const product = products.find(
      (item) => item.id === selectedProductId
    );

    if (!product) {
      alert("Selecione um produto.");
      return;
    }

    const qty = Number(quantity);

    if (!Number.isInteger(qty) || qty <= 0) {
      alert("Informe uma quantidade válida.");
      return;
    }

    const existingItem = cart.find(
      (item) => item.product_id === product.id
    );

    const alreadyInCart = existingItem?.quantity || 0;

    if (alreadyInCart + qty > product.stock_quantity) {
      alert(
        `Estoque insuficiente.\n\nDisponível: ${product.stock_quantity}\nNo carrinho: ${alreadyInCart}\nSolicitado: ${qty}`
      );
      return;
    }

    if (existingItem) {
      setCart((current) =>
        current.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + qty,
              }
            : item
        )
      );
    } else {
      setCart((current) => [
        ...current,
        {
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          quantity: qty,
          unit_price: Number(product.sale_price),
          unit_cost: Number(product.cost_price),
          stock_available: product.stock_quantity,
        },
      ]);
    }

    setSelectedProductId("");
    setQuantity("1");
    setSearchProduct("");
  }

  function removeProduct(productId: string) {
    setCart((current) =>
      current.filter(
        (item) => item.product_id !== productId
      )
    );
  }

  function updateQuantity(
    productId: string,
    newQuantity: number
  ) {
    const product = products.find(
      (item) => item.id === productId
    );

    if (!product) return;

    if (!Number.isInteger(newQuantity) || newQuantity <= 0) {
      removeProduct(productId);
      return;
    }

    if (newQuantity > product.stock_quantity) {
      alert(
        `Estoque insuficiente. Disponível: ${product.stock_quantity}`
      );
      return;
    }

    setCart((current) =>
      current.map((item) =>
        item.product_id === productId
          ? {
              ...item,
              quantity: newQuantity,
            }
          : item
      )
    );
  }

  async function saveSale() {
    if (cart.length === 0) {
      alert("Adicione pelo menos um produto à venda.");
      return;
    }

    if (total <= 0) {
      alert("O total da venda precisa ser maior que zero.");
      return;
    }

    if (discountValue > subtotal) {
      alert(
        "O desconto não pode ser maior que o subtotal."
      );
      return;
    }

    if (saving) {
      return;
    }

    setSaving(true);

    try {
      const saleDate = getBrazilDate();

      const { data: saleId, error } =
        await supabase.rpc("create_sale", {
          p_customer_id: customerId || null,
          p_sale_date: saleDate,
          p_payment_method: paymentMethod,
          p_discount: discountValue,
          p_notes: null,
          p_items: cart.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
        });

      if (error || !saleId) {
        console.error(error);

        throw new Error(
          error?.message ||
            "Não foi possível registrar a venda."
        );
      }

      alert("Venda registrada com sucesso.");

      setCart([]);
      setCustomerId("");
      setPaymentMethod("Pix");
      setDiscount("");
      setSelectedProductId("");
      setQuantity("1");
      setSearchProduct("");

      await loadData();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Ocorreu um erro ao registrar a venda."
      );

      await loadData();
    } finally {
      setSaving(false);
    }
  }

  function formatCurrency(value: number) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatDate(
    date: string | null | undefined
  ) {
    if (!date) return "—";

    const value = String(date).slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return "—";
    }

    const [year, month, day] = value.split("-");

    return `${day}/${month}/${year}`;
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">
              Operação
            </p>

            <h1 className="mt-2 text-3xl font-semibold">
              Vendas
            </h1>

            <p className="mt-2 text-sm text-white/40">
              Registre vendas e atualize o estoque automaticamente.
            </p>
          </div>

          <a
            href="/"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:text-white"
          >
            Dashboard
          </a>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">
                Nova venda
              </h2>

              <p className="mt-1 text-sm text-white/40">
                Adicione os produtos vendidos.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs text-white/50">
                  Cliente
                </label>

                <select
                  value={customerId}
                  onChange={(e) =>
                    setCustomerId(e.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                >
                  <option value="">
                    Consumidor final
                  </option>

                  {customers.map((customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs text-white/50">
                  Forma de pagamento
                </label>

                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                >
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">
                    Produtos
                  </h3>

                  <p className="mt-1 text-xs text-white/30">
                    Selecione um produto e a quantidade.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_100px_120px]">
                <select
                  value={selectedProductId}
                  onChange={(e) =>
                    setSelectedProductId(e.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                >
                  <option value="">
                    Selecione um produto
                  </option>

                  {filteredProducts.map((product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.name} — estoque:{" "}
                      {product.stock_quantity}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(e.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                />

                <button
                  onClick={addProduct}
                  className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90"
                >
                  Adicionar
                </button>
              </div>

              <input
                value={searchProduct}
                onChange={(e) =>
                  setSearchProduct(e.target.value)
                }
                placeholder="Filtrar produtos por nome ou SKU..."
                className="mt-3 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
              />
            </div>

            <div className="mt-5 space-y-3">
              {cart.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 py-10 text-center">
                  <p className="text-sm text-white/30">
                    Nenhum produto adicionado.
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product_id}
                    className="rounded-xl border border-white/10 bg-black p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium">
                          {item.name}
                        </p>

                        <p className="mt-1 text-xs text-white/30">
                          SKU: {item.sku}
                        </p>

                        <p className="mt-1 text-xs text-white/40">
                          {formatCurrency(item.unit_price)}{" "}
                          por unidade
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(
                              item.product_id,
                              Number(e.target.value)
                            )
                          }
                          className="w-20 rounded-lg border border-white/10 bg-black px-3 py-2 text-center text-sm outline-none focus:border-white/30"
                        />

                        <span className="w-28 text-right text-sm font-medium">
                          {formatCurrency(
                            item.quantity *
                              item.unit_price
                          )}
                        </span>

                        <button
                          onClick={() =>
                            removeProduct(item.product_id)
                          }
                          className="px-2 text-sm text-white/30 hover:text-white"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs text-white/50">
                  Desconto
                </label>

                <input
                  type="text"
                  inputMode="decimal"
                  value={discount}
                  onChange={(e) =>
                    setDiscount(e.target.value)
                  }
                  placeholder="0,00"
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                />
              </div>
            </div>

            <div className="mt-8 border-t border-white/10 pt-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-white/50">
                  <span>Subtotal</span>
                  <span>
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between text-sm text-white/50">
                  <span>Desconto</span>
                  <span>
                    {formatCurrency(discountValue)}
                  </span>
                </div>

                <div className="flex justify-between pt-2 text-xl font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>

                <div className="flex justify-between text-sm text-white/40">
                  <span>Lucro estimado</span>
                  <span>
                    {formatCurrency(estimatedProfit)}
                  </span>
                </div>
              </div>

              <button
                onClick={saveSale}
                disabled={
                  saving || cart.length === 0
                }
                className="mt-6 w-full rounded-xl bg-white px-5 py-4 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving
                  ? "Registrando venda..."
                  : "Finalizar venda"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">
                Vendas recentes
              </h2>

              <p className="mt-1 text-sm text-white/40">
                Últimas vendas registradas.
              </p>
            </div>

            {loading ? (
              <p className="py-10 text-center text-sm text-white/30">
                Carregando...
              </p>
            ) : sales.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 py-10 text-center">
                <p className="text-sm text-white/30">
                  Nenhuma venda registrada.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="rounded-xl border border-white/10 bg-black p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">
                          {sale.customers?.name ||
                            "Consumidor final"}
                        </p>

                        <p className="mt-1 text-xs text-white/30">
                          {formatDate(sale.sale_date)}
                        </p>

                        <p className="mt-2 text-xs text-white/40">
                          {sale.payment_method ||
                            "Pagamento não informado"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(
                            Number(sale.total)
                          )}
                        </p>

                        <p className="mt-1 text-xs text-white/30">
                          Concluída
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}