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
  minimum_stock: number;
  active: boolean;
};

type Movement = {
  id: string;
  product_id: string;
  movement_type: string;
  quantity: number;
  reference_type: string | null;
  notes: string | null;
  created_at: string;
  products?: {
    name: string;
    sku: string;
  } | null;
};

const movementLabels: Record<string, string> = {
  purchase: "Compra",
  sale: "Venda",
  adjustment: "Ajuste",
  return: "Devolução",
  loss: "Perda",
};

export default function EstoquePage() {
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [adjustProductId, setAdjustProductId] = useState("");
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [savingAdjustment, setSavingAdjustment] = useState(false);

  async function loadData() {
    setLoading(true);

    const [productsResult, movementsResult] =
      await Promise.all([
        supabase
          .from("products")
          .select(
            "id,name,sku,cost_price,sale_price,stock_quantity,minimum_stock,active"
          )
          .eq("active", true)
          .order("name"),

        supabase
          .from("stock_movements")
          .select(
            "id,product_id,movement_type,quantity,reference_type,notes,created_at,products(name,sku)"
          )
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

    if (productsResult.error) {
      console.error(productsResult.error);
      alert("Erro ao carregar estoque.");
    } else {
      setProducts(productsResult.data || []);
    }

    if (movementsResult.error) {
      console.error(movementsResult.error);
      alert("Erro ao carregar movimentações.");
    } else {
      setMovements(
        (movementsResult.data || []) as Movement[]
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase();

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term)
    );
  }, [products, search]);

  const totalUnits = useMemo(() => {
    return products.reduce(
      (total, product) =>
        total + Number(product.stock_quantity),
      0
    );
  }, [products]);

  const inventoryCost = useMemo(() => {
    return products.reduce(
      (total, product) =>
        total +
        Number(product.stock_quantity) *
          Number(product.cost_price),
      0
    );
  }, [products]);

  const inventorySaleValue = useMemo(() => {
    return products.reduce(
      (total, product) =>
        total +
        Number(product.stock_quantity) *
          Number(product.sale_price),
      0
    );
  }, [products]);

  const lowStockProducts = useMemo(() => {
    return products.filter(
      (product) =>
        Number(product.stock_quantity) <=
        Number(product.minimum_stock)
    );
  }, [products]);

  function formatCurrency(value: number) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatDate(date: string) {
    if (!date) return "—";

    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function movementLabel(type: string) {
    return movementLabels[type] || type;
  }

  async function saveAdjustment() {
    if (!adjustProductId) {
      alert("Selecione um produto.");
      return;
    }

    const quantity = Number(adjustQuantity);

    if (!Number.isInteger(quantity) || quantity === 0) {
      alert(
        "Informe uma quantidade inteira diferente de zero."
      );
      return;
    }

    const product = products.find(
      (item) => item.id === adjustProductId
    );

    if (!product) {
      alert("Produto não encontrado.");
      return;
    }

    const newStock =
      Number(product.stock_quantity) + quantity;

    if (newStock < 0) {
      alert(
        `O estoque não pode ficar negativo.\n\nEstoque atual: ${product.stock_quantity}`
      );
      return;
    }

    setSavingAdjustment(true);

    try {
      const { error: productError } = await supabase
        .from("products")
        .update({
          stock_quantity: newStock,
        })
        .eq("id", product.id);

      if (productError) {
        console.error(productError);
        throw new Error(
          "Não foi possível atualizar o estoque."
        );
      }

      const { error: movementError } = await supabase
        .from("stock_movements")
        .insert({
          product_id: product.id,
          movement_type: "adjustment",
          quantity,
          reference_type: "manual",
          notes:
            adjustNotes.trim() ||
            "Ajuste manual de estoque",
        });

      if (movementError) {
        console.error(movementError);
        throw new Error(
          "Estoque atualizado, mas houve erro ao registrar a movimentação."
        );
      }

      alert("Estoque ajustado com sucesso.");

      setAdjustProductId("");
      setAdjustQuantity("");
      setAdjustNotes("");

      await loadData();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Erro ao ajustar estoque."
      );

      await loadData();
    } finally {
      setSavingAdjustment(false);
    }
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
              Estoque
            </h1>

            <p className="mt-2 text-sm text-white/40">
              Controle de produtos, quantidades e movimentações.
            </p>
          </div>

          <a
            href="/"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:text-white"
          >
            Dashboard
          </a>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-sm text-white/40">
              Produtos ativos
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {products.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-sm text-white/40">
              Unidades em estoque
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {totalUnits}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-sm text-white/40">
              Valor investido
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(inventoryCost)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-sm text-white/40">
              Valor potencial de venda
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(inventorySaleValue)}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Produtos em estoque
                </h2>

                <p className="mt-1 text-sm text-white/40">
                  Situação atual de cada produto.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Buscar produto ou SKU..."
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30 md:w-64"
              />
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm text-white/30">
                Carregando estoque...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 py-12 text-center">
                <p className="text-sm text-white/30">
                  Nenhum produto encontrado.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProducts.map((product) => {
                  const lowStock =
                    Number(product.stock_quantity) <=
                    Number(product.minimum_stock);

                  return (
                    <div
                      key={product.id}
                      className="rounded-xl border border-white/10 bg-black p-4"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="font-medium">
                              {product.name}
                            </h3>

                            {lowStock && (
                              <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase tracking-wider text-white/60">
                                Estoque baixo
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-xs text-white/30">
                            SKU: {product.sku}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/40">
                            <span>
                              Custo:{" "}
                              {formatCurrency(
                                Number(product.cost_price)
                              )}
                            </span>

                            <span>
                              Venda:{" "}
                              {formatCurrency(
                                Number(product.sale_price)
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="text-left md:text-right">
                          <p className="text-2xl font-semibold">
                            {product.stock_quantity}
                          </p>

                          <p className="text-xs text-white/30">
                            mínimo: {product.minimum_stock}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h2 className="text-lg font-semibold">
                Ajuste de estoque
              </h2>

              <p className="mt-1 text-sm text-white/40">
                Use para corrigir diferenças físicas de estoque.
              </p>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-xs text-white/50">
                    Produto
                  </label>

                  <select
                    value={adjustProductId}
                    onChange={(e) =>
                      setAdjustProductId(e.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                  >
                    <option value="">
                      Selecione um produto
                    </option>

                    {products.map((product) => (
                      <option
                        key={product.id}
                        value={product.id}
                      >
                        {product.name} — atual:{" "}
                        {product.stock_quantity}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs text-white/50">
                    Quantidade
                  </label>

                  <input
                    type="number"
                    value={adjustQuantity}
                    onChange={(e) =>
                      setAdjustQuantity(e.target.value)
                    }
                    placeholder="Ex.: +5 ou -2"
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                  />

                  <p className="mt-2 text-xs text-white/30">
                    Use número positivo para entrada e negativo
                    para saída.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-xs text-white/50">
                    Motivo
                  </label>

                  <input
                    value={adjustNotes}
                    onChange={(e) =>
                      setAdjustNotes(e.target.value)
                    }
                    placeholder="Ex.: conferência física"
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                  />
                </div>

                <button
                  onClick={saveAdjustment}
                  disabled={savingAdjustment}
                  className="w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-50"
                >
                  {savingAdjustment
                    ? "Salvando..."
                    : "Registrar ajuste"}
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">
                  Estoque baixo
                </h2>

                <p className="mt-1 text-sm text-white/40">
                  Produtos que atingiram o estoque mínimo.
                </p>
              </div>

              {lowStockProducts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-5 text-center">
                  <p className="text-sm text-white/30">
                    Nenhum produto em estoque baixo.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lowStockProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-black p-3"
                    >
                      <div>
                        <p className="text-sm">
                          {product.name}
                        </p>

                        <p className="mt-1 text-xs text-white/30">
                          mínimo: {product.minimum_stock}
                        </p>
                      </div>

                      <p className="text-lg font-semibold">
                        {product.stock_quantity}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">
              Movimentações recentes
            </h2>

            <p className="mt-1 text-sm text-white/40">
              Histórico das últimas entradas e saídas.
            </p>
          </div>

          {movements.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 py-10 text-center">
              <p className="text-sm text-white/30">
                Nenhuma movimentação registrada.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {movements.map((movement) => {
                const positive = Number(movement.quantity) > 0;

                return (
                  <div
                    key={movement.id}
                    className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-medium">
                          {movement.products?.name ||
                            "Produto"}
                        </p>

                        <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-white/50">
                          {movementLabel(
                            movement.movement_type
                          )}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-white/30">
                        {movement.products?.sku || "—"}
                      </p>

                      <p className="mt-1 text-xs text-white/30">
                        {formatDate(movement.created_at)}
                      </p>

                      {movement.notes && (
                        <p className="mt-2 text-xs text-white/40">
                          {movement.notes}
                        </p>
                      )}
                    </div>

                    <div
                      className={`text-lg font-semibold ${
                        positive
                          ? "text-white"
                          : "text-white/60"
                      }`}
                    >
                      {positive ? "+" : ""}
                      {movement.quantity}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}