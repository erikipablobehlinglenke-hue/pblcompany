"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string;
  name: string;
  sku: string;
  cost_price: number;
  stock_quantity: number;
  active: boolean;
};

type Supplier = {
  id: string;
  name: string;
};

type PurchaseItem = {
  productId: string;
  quantity: number;
  unitCost: number;
};

type Purchase = {
  id: string;
  purchase_date: string;
  status: string;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
  supplier?: Supplier | null;
};

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

export default function ComprasPage() {
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    getBrazilDate()
  );

  const [shippingCost, setShippingCost] = useState("");
  const [discount, setDiscount] = useState("");

  const [items, setItems] = useState<PurchaseItem[]>([
    {
      productId: "",
      quantity: 1,
      unitCost: 0,
    },
  ]);

  async function loadData() {
    setLoading(true);

    const [
      productsResult,
      suppliersResult,
      purchasesResult,
    ] = await Promise.all([
      supabase
        .from("products")
        .select(
          "id, name, sku, cost_price, stock_quantity, active"
        )
        .eq("active", true)
        .order("name"),

      supabase
        .from("suppliers")
        .select("id, name")
        .order("name"),

      supabase
        .from("purchases")
        .select(`
          id,
          purchase_date,
          status,
          subtotal,
          shipping_cost,
          discount,
          total,
          supplier:suppliers(id, name)
        `)
        .order("purchase_date", { ascending: false })
        .limit(20),
    ]);

    if (productsResult.error) {
      console.error(productsResult.error);
      alert(productsResult.error.message);
    }

    if (suppliersResult.error) {
      console.error(suppliersResult.error);
      alert(suppliersResult.error.message);
    }

    if (purchasesResult.error) {
      console.error(purchasesResult.error);
      alert(purchasesResult.error.message);
    }

    setProducts(productsResult.data || []);
    setSuppliers(suppliersResult.data || []);
    setPurchases(
      (purchasesResult.data || []) as Purchase[]
    );

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function addItem() {
    setItems((currentItems) => [
      ...currentItems,
      {
        productId: "",
        quantity: 1,
        unitCost: 0,
      },
    ]);
  }

  function removeItem(index: number) {
    if (items.length === 1) {
      return;
    }

    setItems((currentItems) =>
      currentItems.filter(
        (_, itemIndex) => itemIndex !== index
      )
    );
  }

  function updateItem(
    index: number,
    field: keyof PurchaseItem,
    value: string | number
  ) {
    setItems((currentItems) => {
      const updatedItems = [...currentItems];

      if (field === "productId") {
        const product = products.find(
          (item) => item.id === String(value)
        );

        updatedItems[index] = {
          ...updatedItems[index],
          productId: String(value),
          unitCost: product
            ? Number(product.cost_price)
            : 0,
        };
      } else {
        updatedItems[index] = {
          ...updatedItems[index],
          [field]: Number(value),
        };
      }

      return updatedItems;
    });
  }

  const subtotal = useMemo(() => {
    return items.reduce((total, item) => {
      return (
        total +
        Number(item.quantity || 0) *
          Number(item.unitCost || 0)
      );
    }, 0);
  }, [items]);

  const total = useMemo(() => {
    const shipping = Math.max(
      0,
      Number(shippingCost || 0)
    );

    const discountValue = Math.max(
      0,
      Number(discount || 0)
    );

    return Math.max(
      0,
      subtotal + shipping - discountValue
    );
  }, [subtotal, shippingCost, discount]);

  function resetForm() {
    setSupplierId("");
    setPurchaseDate(getBrazilDate());
    setShippingCost("");
    setDiscount("");

    setItems([
      {
        productId: "",
        quantity: 1,
        unitCost: 0,
      },
    ]);
  }

  async function createPurchase() {
    if (saving) {
      return;
    }

    if (!supplierId) {
      alert("Selecione um fornecedor.");
      return;
    }

    if (!purchaseDate) {
      alert("Informe a data da compra.");
      return;
    }

    const validItems = items.filter(
      (item) =>
        item.productId &&
        Number(item.quantity) > 0 &&
        Number(item.unitCost) >= 0
    );

    if (validItems.length === 0) {
      alert("Adicione pelo menos um produto à compra.");
      return;
    }

    if (validItems.length !== items.length) {
      alert(
        "Verifique os produtos, quantidades e custos informados."
      );
      return;
    }

    const shipping = Math.max(
      0,
      Number(shippingCost || 0)
    );

    const discountValue = Math.max(
      0,
      Number(discount || 0)
    );

    if (discountValue > subtotal) {
      alert(
        "O desconto não pode ser maior que o subtotal da compra."
      );
      return;
    }

    if (total <= 0) {
      alert(
        "O total da compra precisa ser maior que zero."
      );
      return;
    }

    setSaving(true);

    try {
      const { data: purchaseId, error } =
        await supabase.rpc("create_purchase", {
          p_supplier_id: supplierId,
          p_purchase_date: purchaseDate,
          p_discount: discountValue,
          p_shipping_cost: shipping,
          p_notes: null,
          p_items: validItems.map((item) => ({
            product_id: item.productId,
            quantity: Number(item.quantity),
            unit_cost: Number(item.unitCost),
          })),
        });

      if (error || !purchaseId) {
        console.error(error);

        throw new Error(
          error?.message ||
            "Não foi possível registrar a compra."
        );
      }

      alert(
        "Compra registrada com sucesso, estoque atualizado e financeiro lançado."
      );

      resetForm();

      await loadData();
    } catch (error) {
      console.error(
        "Erro ao registrar compra:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Ocorreu um erro ao registrar a compra."
      );

      await loadData();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="p-6 md:p-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">
              Operação
            </p>

            <h1 className="mt-2 text-3xl font-semibold">
              Compras
            </h1>

            <p className="mt-2 text-sm text-white/40">
              Registre compras e atualize o estoque automaticamente.
            </p>
          </div>

          <a
            href="/"
            className="w-fit rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:border-white/20 hover:text-white"
          >
            Dashboard
          </a>
        </div>

        {loading ? (
          <p className="py-10 text-sm text-white/35">
            Carregando...
          </p>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
            {/* NOVA COMPRA */}

            <section className="rounded-xl border border-white/10 bg-white/[0.025] p-6">
              <div>
                <h2 className="text-lg font-medium">
                  Nova compra
                </h2>

                <p className="mt-1 text-sm text-white/35">
                  Adicione os produtos recebidos.
                </p>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-white/50">
                    Fornecedor
                  </label>

                  <select
                    value={supplierId}
                    onChange={(e) =>
                      setSupplierId(e.target.value)
                    }
                    className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                  >
                    <option value="">
                      Selecione um fornecedor
                    </option>

                    {suppliers.map((supplier) => (
                      <option
                        key={supplier.id}
                        value={supplier.id}
                      >
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/50">
                    Data da compra
                  </label>

                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) =>
                      setPurchaseDate(e.target.value)
                    }
                    className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                  />
                </div>
              </div>

              <div className="mt-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">
                    Produtos
                  </h3>

                  <button
                    onClick={addItem}
                    type="button"
                    className="text-xs text-white/50 transition hover:text-white"
                  >
                    + Adicionar produto
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-white/10 bg-black/30 p-4"
                    >
                      <div className="grid gap-3 md:grid-cols-[1fr_120px_140px_40px] md:items-end">
                        <div>
                          <label className="mb-2 block text-xs text-white/40">
                            Produto
                          </label>

                          <select
                            value={item.productId}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "productId",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-white/10 bg-black px-3 py-2.5 text-sm outline-none focus:border-white/30"
                          >
                            <option value="">
                              Selecione
                            </option>

                            {products.map((product) => (
                              <option
                                key={product.id}
                                value={product.id}
                              >
                                {product.name} — {product.sku}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-xs text-white/40">
                            Quantidade
                          </label>

                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "quantity",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-white/10 bg-black px-3 py-2.5 text-sm outline-none focus:border-white/30"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs text-white/40">
                            Custo unitário
                          </label>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitCost}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "unitCost",
                                e.target.value
                              )
                            }
                            className="w-full rounded-lg border border-white/10 bg-black px-3 py-2.5 text-sm outline-none focus:border-white/30"
                          />
                        </div>

                        <button
                          onClick={() => removeItem(index)}
                          type="button"
                          disabled={items.length === 1}
                          className="h-10 text-sm text-white/30 transition hover:text-white disabled:opacity-20"
                        >
                          ×
                        </button>
                      </div>

                      {item.productId && (
                        <div className="mt-3 text-right text-xs text-white/30">
                          Total: R${" "}
                          {(
                            Number(item.quantity) *
                            Number(item.unitCost)
                          ).toFixed(2)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-white/50">
                    Frete
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shippingCost}
                    onChange={(e) =>
                      setShippingCost(e.target.value)
                    }
                    placeholder="0,00"
                    className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/50">
                    Desconto
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) =>
                      setDiscount(e.target.value)
                    }
                    placeholder="0,00"
                    className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                  />
                </div>
              </div>

              <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/40">
                    Subtotal
                  </span>

                  <span>
                    R$ {subtotal.toFixed(2)}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-white/40">
                    Frete
                  </span>

                  <span>
                    R${" "}
                    {Number(
                      shippingCost || 0
                    ).toFixed(2)}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-white/40">
                    Desconto
                  </span>

                  <span>
                    - R${" "}
                    {Number(
                      discount || 0
                    ).toFixed(2)}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="font-medium">
                    Total
                  </span>

                  <span className="text-2xl font-semibold">
                    R$ {total.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={createPurchase}
                type="button"
                disabled={saving}
                className="mt-5 w-full rounded-lg bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-50"
              >
                {saving
                  ? "Registrando compra..."
                  : "Registrar compra"}
              </button>
            </section>

            {/* RESUMO */}

            <section className="rounded-xl border border-white/10 bg-white/[0.025] p-6">
              <h2 className="text-lg font-medium">
                Compras recentes
              </h2>

              <p className="mt-1 text-sm text-white/35">
                Últimas compras registradas.
              </p>

              <div className="mt-6 space-y-3">
                {purchases.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/10 py-12 text-center">
                    <p className="text-sm text-white/40">
                      Nenhuma compra registrada.
                    </p>
                  </div>
                ) : (
                  purchases.map((purchase) => (
                    <div
                      key={purchase.id}
                      className="rounded-lg border border-white/10 bg-black/30 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium">
                            {purchase.supplier?.name ||
                              "Sem fornecedor"}
                          </p>

                          <p className="mt-1 text-xs text-white/30">
                            {purchase.purchase_date
                              ? purchase.purchase_date
                                  .slice(0, 10)
                                  .split("-")
                                  .reverse()
                                  .join("/")
                              : "—"}
                          </p>
                        </div>

                        <span className="text-sm font-medium">
                          R${" "}
                          {Number(
                            purchase.total
                          ).toFixed(2)}
                        </span>
                      </div>

                      <div className="mt-3">
                        <span className="text-xs text-white/30">
                          {purchase.status === "completed"
                            ? "Concluída"
                            : purchase.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}