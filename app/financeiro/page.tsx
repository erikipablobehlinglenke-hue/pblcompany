"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type FinancialCategory = {
  id: string;
  name: string;
  type: "income" | "expense";
  description: string | null;
};

type Transaction = {
  id: string;
  type: "income" | "expense";
  category_id: string | null;
  description: string;
  amount: number;
  transaction_date: string;
  status: string;
  notes: string | null;
  financial_categories?: {
    name: string;
    type: "income" | "expense";
  } | null;
};

const emptyForm = {
  type: "income" as "income" | "expense",
  category_id: "",
  description: "",
  amount: "",
  transaction_date: new Date()
    .toISOString()
    .slice(0, 10),
  notes: "",
};

export default function FinanceiroPage() {
  const supabase = createClient();

  const [categories, setCategories] = useState<
    FinancialCategory[]
  >([]);

  const [transactions, setTransactions] = useState<
    Transaction[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [filterType, setFilterType] = useState<
    "all" | "income" | "expense"
  >("all");

  const [search, setSearch] = useState("");

  const [form, setForm] = useState(emptyForm);

  async function loadData() {
    setLoading(true);

    const [categoriesResult, transactionsResult] =
      await Promise.all([
        supabase
          .from("financial_categories")
          .select("*")
          .order("type")
          .order("name"),

        supabase
          .from("financial_transactions")
          .select(
            "id,type,category_id,description,amount,transaction_date,status,notes,financial_categories(name,type)"
          )
          .order("transaction_date", {
            ascending: false,
          })
          .order("created_at", {
            ascending: false,
          })
          .limit(100),
      ]);

    if (categoriesResult.error) {
      console.error(categoriesResult.error);
      alert("Erro ao carregar categorias financeiras.");
    } else {
      setCategories(categoriesResult.data || []);
    }

    if (transactionsResult.error) {
      console.error(transactionsResult.error);
      alert("Erro ao carregar lançamentos financeiros.");
    } else {
      setTransactions(
        (transactionsResult.data || []) as Transaction[]
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredCategories = useMemo(() => {
    return categories.filter(
      (category) => category.type === form.type
    );
  }, [categories, form.type]);

  const filteredTransactions = useMemo(() => {
    const term = search.toLowerCase();

    return transactions.filter((transaction) => {
      const matchesType =
        filterType === "all" ||
        transaction.type === filterType;

      const matchesSearch =
        !term ||
        transaction.description
          ?.toLowerCase()
          .includes(term) ||
        transaction.financial_categories?.name
          ?.toLowerCase()
          .includes(term);

      return matchesType && matchesSearch;
    });
  }, [transactions, filterType, search]);

  const totalIncome = useMemo(() => {
    return transactions
      .filter(
        (transaction) =>
          transaction.type === "income" &&
          transaction.status === "completed"
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0
      );
  }, [transactions]);

  const totalExpense = useMemo(() => {
    return transactions
      .filter(
        (transaction) =>
          transaction.type === "expense" &&
          transaction.status === "completed"
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0
      );
  }, [transactions]);

  const balance = totalIncome - totalExpense;

  function formatCurrency(value: number) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatDate(date: string) {
    return date
      ? date.slice(0, 10).split("-").reverse().join("/")
      : "—";
  }

  function updateForm(
    field: keyof typeof emptyForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function changeType(
    type: "income" | "expense"
  ) {
    setForm((current) => ({
      ...current,
      type,
      category_id: "",
    }));
  }

  async function saveTransaction() {
    if (!form.description.trim()) {
      alert("Informe uma descrição.");
      return;
    }

    const amount = Number(
      form.amount.replace(",", ".")
    );

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Informe um valor válido.");
      return;
    }

    if (!form.transaction_date) {
      alert("Informe a data.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("financial_transactions")
      .insert({
        type: form.type,
        category_id: form.category_id || null,
        description: form.description.trim(),
        amount,
        transaction_date: form.transaction_date,
        status: "completed",
        notes: form.notes.trim() || null,
      });

    if (error) {
      console.error(error);
      alert("Erro ao salvar lançamento financeiro.");
    } else {
      alert(
        form.type === "income"
          ? "Receita registrada com sucesso."
          : "Despesa registrada com sucesso."
      );

      setForm({
        ...emptyForm,
        type: form.type,
        transaction_date: new Date()
          .toISOString()
          .slice(0, 10),
      });

      await loadData();
    }

    setSaving(false);
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">
              Gestão
            </p>

            <h1 className="mt-2 text-3xl font-semibold">
              Financeiro
            </h1>

            <p className="mt-2 text-sm text-white/40">
              Controle de receitas, despesas e resultado financeiro.
            </p>
          </div>

          <a
            href="/"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:text-white"
          >
            Dashboard
          </a>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-sm text-white/40">
              Receitas
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(totalIncome)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-sm text-white/40">
              Despesas
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(totalExpense)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-sm text-white/40">
              Saldo
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(balance)}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">
                Novo lançamento
              </h2>

              <p className="mt-1 text-sm text-white/40">
                Registre uma entrada ou saída.
              </p>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => changeType("income")}
                className={`rounded-xl border px-4 py-3 text-sm transition ${
                  form.type === "income"
                    ? "border-white bg-white text-black"
                    : "border-white/10 text-white/50 hover:text-white"
                }`}
              >
                Receita
              </button>

              <button
                onClick={() => changeType("expense")}
                className={`rounded-xl border px-4 py-3 text-sm transition ${
                  form.type === "expense"
                    ? "border-white bg-white text-black"
                    : "border-white/10 text-white/50 hover:text-white"
                }`}
              >
                Despesa
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs text-white/50">
                  Descrição *
                </label>

                <input
                  value={form.description}
                  onChange={(e) =>
                    updateForm(
                      "description",
                      e.target.value
                    )
                  }
                  placeholder={
                    form.type === "income"
                      ? "Ex.: Venda GH23"
                      : "Ex.: Frete da compra"
                  }
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs text-white/50">
                  Categoria
                </label>

                <select
                  value={form.category_id}
                  onChange={(e) =>
                    updateForm(
                      "category_id",
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                >
                  <option value="">
                    Sem categoria
                  </option>

                  {filteredCategories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs text-white/50">
                  Valor *
                </label>

                <input
                  type="text"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) =>
                    updateForm(
                      "amount",
                      e.target.value
                    )
                  }
                  placeholder="0,00"
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs text-white/50">
                  Data *
                </label>

                <input
                  type="date"
                  value={form.transaction_date}
                  onChange={(e) =>
                    updateForm(
                      "transaction_date",
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs text-white/50">
                  Observações
                </label>

                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    updateForm(
                      "notes",
                      e.target.value
                    )
                  }
                  rows={3}
                  placeholder="Observações..."
                  className="w-full resize-none rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                />
              </div>

              <button
                onClick={saveTransaction}
                disabled={saving}
                className="w-full rounded-xl bg-white px-4 py-3 font-medium text-black transition hover:bg-white/90 disabled:opacity-50"
              >
                {saving
                  ? "Salvando..."
                  : "Registrar lançamento"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Lançamentos
                </h2>

                <p className="mt-1 text-sm text-white/40">
                  Histórico financeiro.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={filterType}
                  onChange={(e) =>
                    setFilterType(
                      e.target.value as
                        | "all"
                        | "income"
                        | "expense"
                    )
                  }
                  className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none"
                >
                  <option value="all">
                    Todos
                  </option>

                  <option value="income">
                    Receitas
                  </option>

                  <option value="expense">
                    Despesas
                  </option>
                </select>

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Buscar..."
                  className="rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm text-white/30">
                Carregando financeiro...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 py-12 text-center">
                <p className="text-sm text-white/30">
                  Nenhum lançamento encontrado.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map(
                  (transaction) => {
                    const income =
                      transaction.type === "income";

                    return (
                      <div
                        key={transaction.id}
                        className="rounded-xl border border-white/10 bg-black p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="font-medium">
                                {transaction.description}
                              </h3>

                              <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-white/50">
                                {income
                                  ? "Receita"
                                  : "Despesa"}
                              </span>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/30">
                              <span>
                                {formatDate(
                                  transaction.transaction_date
                                )}
                              </span>

                              {transaction
                                .financial_categories
                                ?.name && (
                                <span>
                                  {
                                    transaction
                                      .financial_categories
                                      .name
                                  }
                                </span>
                              )}
                            </div>

                            {transaction.notes && (
                              <p className="mt-2 text-xs text-white/30">
                                {transaction.notes}
                              </p>
                            )}
                          </div>

                          <div
                            className={`text-lg font-semibold ${
                              income
                                ? "text-white"
                                : "text-white/60"
                            }`}
                          >
                            {income ? "+" : "-"}
                            {formatCurrency(
                              Number(
                                transaction.amount
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}