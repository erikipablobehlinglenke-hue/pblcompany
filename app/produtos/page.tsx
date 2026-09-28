"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Category = {
  id: string;
  name: string;
};

type Supplier = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  category_id: string | null;
  supplier_id: string | null;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  minimum_stock: number;
  active: boolean;
  category?: Category | null;
  supplier?: Supplier | null;
};

export default function ProdutosPage() {
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [minimumStock, setMinimumStock] = useState("");

  async function loadData() {
    setLoading(true);

    const [
      productsResult,
      categoriesResult,
      suppliersResult,
    ] = await Promise.all([
      supabase
        .from("products")
        .select(`
          *,
          category:categories(id, name),
          supplier:suppliers(id, name)
        `)
        .order("created_at", { ascending: false }),

      supabase
        .from("categories")
        .select("id, name")
        .order("name"),

      supabase
        .from("suppliers")
        .select("id, name")
        .order("name"),
    ]);

    if (productsResult.error) {
      alert(productsResult.error.message);
    }

    if (categoriesResult.error) {
      alert(categoriesResult.error.message);
    }

    if (suppliersResult.error) {
      alert(suppliersResult.error.message);
    }

    setProducts(productsResult.data || []);
    setCategories(categoriesResult.data || []);
    setSuppliers(suppliersResult.data || []);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function clearForm() {
    setEditingId(null);
    setName("");
    setSku("");
    setDescription("");
    setCategoryId("");
    setSupplierId("");
    setCostPrice("");
    setSalePrice("");
    setStockQuantity("");
    setMinimumStock("");
  }

  function startEditing(product: Product) {
    setEditingId(product.id);
    setName(product.name);
    setSku(product.sku);
    setDescription(product.description || "");
    setCategoryId(product.category_id || "");
    setSupplierId(product.supplier_id || "");
    setCostPrice(String(product.cost_price));
    setSalePrice(String(product.sale_price));
    setStockQuantity(String(product.stock_quantity));
    setMinimumStock(String(product.minimum_stock));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveProduct() {
    if (!name || !sku || !costPrice || !salePrice) {
      alert("Preencha nome, SKU, custo e preço de venda.");
      return;
    }

    setSaving(true);

    const productData = {
      name,
      sku,
      description: description || null,
      category_id: categoryId || null,
      supplier_id: supplierId || null,
      cost_price: Number(costPrice),
      sale_price: Number(salePrice),
      stock_quantity: Number(stockQuantity || 0),
      minimum_stock: Number(minimumStock || 0),
    };

    if (editingId) {
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingId);

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from("products")
        .insert({
          ...productData,
          active: true,
        });

      if (error) {
        alert(error.message);
        setSaving(false);
        return;
      }
    }

    clearForm();
    await loadData();

    setSaving(false);
  }

  async function toggleProduct(product: Product) {
    const action = product.active ? "desativar" : "reativar";

    const confirmed = window.confirm(
      `Deseja ${action} o produto "${product.name}"?`
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("products")
      .update({
        active: !product.active,
      })
      .eq("id", product.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadData();
  }

  function calculateMargin(cost: number, sale: number) {
    if (!sale) return 0;

    return ((sale - cost) / sale) * 100;
  }

  const filteredProducts = products.filter((product) => {
    const term = search.toLowerCase().trim();

    if (!term) {
      return true;
    }

    return (
      product.name.toLowerCase().includes(term) ||
      product.sku.toLowerCase().includes(term)
    );
  });

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="p-6 md:p-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">
              Gestão
            </p>

            <h1 className="mt-2 text-3xl font-semibold">
              Produtos
            </h1>

            <p className="mt-2 text-sm text-white/40">
              Cadastro e controle dos produtos da PBL Company.
            </p>
          </div>

          <a
            href="/"
            className="w-fit rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:border-white/20 hover:text-white"
          >
            Dashboard
          </a>
        </div>

        <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
          {/* FORMULÁRIO */}

          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium">
                  {editingId ? "Editar produto" : "Novo produto"}
                </h2>

                <p className="mt-1 text-xs text-white/30">
                  {editingId
                    ? "Alterando produto existente"
                    : "Cadastre um novo produto"}
                </p>
              </div>

              {editingId && (
                <button
                  onClick={clearForm}
                  className="text-xs text-white/40 transition hover:text-white"
                >
                  Cancelar
                </button>
              )}
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-white/50">
                  Nome
                </label>

                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: GH23"
                  className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-white/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/50">
                  SKU
                </label>

                <input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Ex: GH23-001"
                  className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-white/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/50">
                  Categoria
                </label>

                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                >
                  <option value="">Sem categoria</option>

                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/50">
                  Fornecedor
                </label>

                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                >
                  <option value="">Sem fornecedor</option>

                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/50">
                  Descrição
                </label>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Informações do produto..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm text-white/50">
                    Custo
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="0,00"
                    className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/50">
                    Venda
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="0,00"
                    className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-2 block text-sm text-white/50">
                    Estoque
                  </label>

                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/50">
                    Estoque mínimo
                  </label>

                  <input
                    type="number"
                    value={minimumStock}
                    onChange={(e) => setMinimumStock(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                  />
                </div>
              </div>

              {costPrice && salePrice && (
                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs text-white/40">
                    Margem estimada
                  </p>

                  <p className="mt-1 text-2xl font-semibold">
                    {calculateMargin(
                      Number(costPrice),
                      Number(salePrice)
                    ).toFixed(1)}
                    %
                  </p>

                  <p className="mt-1 text-xs text-white/30">
                    Lucro por unidade: R${" "}
                    {(Number(salePrice) - Number(costPrice)).toFixed(2)}
                  </p>
                </div>
              )}

              <button
                onClick={saveProduct}
                disabled={saving}
                className="w-full rounded-lg bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-50"
              >
                {saving
                  ? "Salvando..."
                  : editingId
                    ? "Salvar alterações"
                    : "Cadastrar produto"}
              </button>
            </div>
          </div>

          {/* LISTAGEM */}

          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-medium">
                  Produtos cadastrados
                </h2>

                <p className="mt-1 text-sm text-white/35">
                  {products.length} produto(s)
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto ou SKU..."
                className="w-full rounded-lg border border-white/10 bg-black px-4 py-2.5 text-sm outline-none focus:border-white/30 md:w-64"
              />
            </div>

            <div className="mt-6 overflow-x-auto">
              {loading ? (
                <p className="py-10 text-center text-sm text-white/35">
                  Carregando produtos...
                </p>
              ) : filteredProducts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 py-16 text-center">
                  <p className="text-sm text-white/40">
                    Nenhum produto encontrado.
                  </p>
                </div>
              ) : (
                <table className="w-full min-w-[1000px] text-left">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/30">
                      <th className="pb-4 font-normal">Produto</th>
                      <th className="pb-4 font-normal">Categoria</th>
                      <th className="pb-4 font-normal">Fornecedor</th>
                      <th className="pb-4 font-normal">Custo</th>
                      <th className="pb-4 font-normal">Venda</th>
                      <th className="pb-4 font-normal">Margem</th>
                      <th className="pb-4 font-normal">Estoque</th>
                      <th className="pb-4 font-normal">Status</th>
                      <th className="pb-4 text-right font-normal">
                        Ações
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProducts.map((product) => {
                      const margin = calculateMargin(
                        Number(product.cost_price),
                        Number(product.sale_price)
                      );

                      const lowStock =
                        Number(product.stock_quantity) <=
                        Number(product.minimum_stock);

                      return (
                        <tr
                          key={product.id}
                          className="border-b border-white/5"
                        >
                          <td className="py-4">
                            <p className="text-sm font-medium">
                              {product.name}
                            </p>

                            <p className="mt-1 text-xs text-white/30">
                              {product.sku}
                            </p>
                          </td>

                          <td className="py-4 text-sm text-white/50">
                            {product.category?.name || "—"}
                          </td>

                          <td className="py-4 text-sm text-white/50">
                            {product.supplier?.name || "—"}
                          </td>

                          <td className="py-4 text-sm">
                            R$ {Number(product.cost_price).toFixed(2)}
                          </td>

                          <td className="py-4 text-sm">
                            R$ {Number(product.sale_price).toFixed(2)}
                          </td>

                          <td className="py-4 text-sm">
                            {margin.toFixed(1)}%
                          </td>

                          <td className="py-4">
                            <span className="text-sm">
                              {product.stock_quantity}
                            </span>

                            {lowStock && (
                              <span className="ml-2 text-xs text-white/30">
                                baixo
                              </span>
                            )}
                          </td>

                          <td className="py-4">
                            <span className="text-xs text-white/50">
                              {product.active
                                ? "Ativo"
                                : "Inativo"}
                            </span>
                          </td>

                          <td className="py-4">
                            <div className="flex justify-end gap-3">
                              <button
                                onClick={() =>
                                  startEditing(product)
                                }
                                className="text-xs text-white/40 transition hover:text-white"
                              >
                                Editar
                              </button>

                              <button
                                onClick={() =>
                                  toggleProduct(product)
                                }
                                className="text-xs text-white/30 transition hover:text-white"
                              >
                                {product.active
                                  ? "Desativar"
                                  : "Reativar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}