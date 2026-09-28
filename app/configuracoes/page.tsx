"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Category = {
  id: string;
  name: string;
  description: string | null;
};

type Supplier = {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  document: string | null;
  notes: string | null;
};

export default function ConfiguracoesPage() {
  const supabase = createClient();

  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");

  const [supplierName, setSupplierName] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierDocument, setSupplierDocument] = useState("");
  const [supplierNotes, setSupplierNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);

  async function loadData() {
    setLoading(true);

    const [categoriesResult, suppliersResult] = await Promise.all([
      supabase
        .from("categories")
        .select("*")
        .order("name"),

      supabase
        .from("suppliers")
        .select("*")
        .order("name"),
    ]);

    if (categoriesResult.error) {
      alert(categoriesResult.error.message);
    }

    if (suppliersResult.error) {
      alert(suppliersResult.error.message);
    }

    setCategories(categoriesResult.data || []);
    setSuppliers(suppliersResult.data || []);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createCategory() {
    if (!categoryName.trim()) {
      alert("Informe o nome da categoria.");
      return;
    }

    setSavingCategory(true);

    const { error } = await supabase
      .from("categories")
      .insert({
        name: categoryName.trim(),
        description: categoryDescription.trim() || null,
      });

    if (error) {
      alert(error.message);
      setSavingCategory(false);
      return;
    }

    setCategoryName("");
    setCategoryDescription("");

    await loadData();

    setSavingCategory(false);
  }

  async function createSupplier() {
    if (!supplierName.trim()) {
      alert("Informe o nome do fornecedor.");
      return;
    }

    setSavingSupplier(true);

    const { error } = await supabase
      .from("suppliers")
      .insert({
        name: supplierName.trim(),
        contact_name: supplierContact.trim() || null,
        phone: supplierPhone.trim() || null,
        email: supplierEmail.trim() || null,
        document: supplierDocument.trim() || null,
        notes: supplierNotes.trim() || null,
      });

    if (error) {
      alert(error.message);
      setSavingSupplier(false);
      return;
    }

    setSupplierName("");
    setSupplierContact("");
    setSupplierPhone("");
    setSupplierEmail("");
    setSupplierDocument("");
    setSupplierNotes("");

    await loadData();

    setSavingSupplier(false);
  }

  async function deleteCategory(category: Category) {
    const confirmed = window.confirm(
      `Excluir a categoria "${category.name}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", category.id);

    if (error) {
      alert(
        "Não foi possível excluir. Essa categoria pode estar sendo usada por algum produto."
      );
      return;
    }

    await loadData();
  }

  async function deleteSupplier(supplier: Supplier) {
    const confirmed = window.confirm(
      `Excluir o fornecedor "${supplier.name}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("suppliers")
      .delete()
      .eq("id", supplier.id);

    if (error) {
      alert(
        "Não foi possível excluir. Esse fornecedor pode estar sendo usado por algum produto."
      );
      return;
    }

    await loadData();
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="p-6 md:p-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">
              Sistema
            </p>

            <h1 className="mt-2 text-3xl font-semibold">
              Configurações
            </h1>

            <p className="mt-2 text-sm text-white/40">
              Cadastros básicos utilizados pelo PBL Management.
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
            Carregando configurações...
          </p>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">

            {/* CATEGORIAS */}

            <section className="rounded-xl border border-white/10 bg-white/[0.025] p-6">
              <div>
                <h2 className="text-lg font-medium">
                  Categorias
                </h2>

                <p className="mt-1 text-sm text-white/35">
                  {categories.length} categoria(s) cadastrada(s)
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <input
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Nome da categoria"
                  className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                />

                <input
                  value={categoryDescription}
                  onChange={(e) =>
                    setCategoryDescription(e.target.value)
                  }
                  placeholder="Descrição opcional"
                  className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                />

                <button
                  onClick={createCategory}
                  disabled={savingCategory}
                  className="w-full rounded-lg bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-50"
                >
                  {savingCategory
                    ? "Salvando..."
                    : "Adicionar categoria"}
                </button>
              </div>

              <div className="mt-6 space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-black/40 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm">
                        {category.name}
                      </p>

                      {category.description && (
                        <p className="mt-1 text-xs text-white/30">
                          {category.description}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => deleteCategory(category)}
                      className="text-xs text-white/30 transition hover:text-white"
                    >
                      Excluir
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* FORNECEDORES */}

            <section className="rounded-xl border border-white/10 bg-white/[0.025] p-6">
              <div>
                <h2 className="text-lg font-medium">
                  Fornecedores
                </h2>

                <p className="mt-1 text-sm text-white/35">
                  {suppliers.length} fornecedor(es) cadastrado(s)
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <input
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="Nome do fornecedor"
                  className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                />

                <input
                  value={supplierContact}
                  onChange={(e) => setSupplierContact(e.target.value)}
                  placeholder="Nome do contato"
                  className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    placeholder="Telefone"
                    className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                  />

                  <input
                    value={supplierEmail}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                    placeholder="E-mail"
                    className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                  />
                </div>

                <input
                  value={supplierDocument}
                  onChange={(e) =>
                    setSupplierDocument(e.target.value)
                  }
                  placeholder="CPF/CNPJ"
                  className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                />

                <textarea
                  value={supplierNotes}
                  onChange={(e) => setSupplierNotes(e.target.value)}
                  placeholder="Observações"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                />

                <button
                  onClick={createSupplier}
                  disabled={savingSupplier}
                  className="w-full rounded-lg bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-50"
                >
                  {savingSupplier
                    ? "Salvando..."
                    : "Adicionar fornecedor"}
                </button>
              </div>

              <div className="mt-6 space-y-2">
                {suppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-black/40 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm">
                        {supplier.name}
                      </p>

                      <p className="mt-1 text-xs text-white/30">
                        {supplier.contact_name ||
                          supplier.phone ||
                          "Sem informações adicionais"}
                      </p>
                    </div>

                    <button
                      onClick={() => deleteSupplier(supplier)}
                      className="text-xs text-white/30 transition hover:text-white"
                    >
                      Excluir
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}