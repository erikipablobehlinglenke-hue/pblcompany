"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
};

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  document: "",
  address: "",
  city: "",
  state: "",
  notes: "",
};

export default function ClientesPage() {
  const supabase = createClient();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState(emptyForm);

  async function loadCustomers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("Erro ao carregar clientes.");
    } else {
      setCustomers(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  function updateField(
    field: keyof typeof emptyForm,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function startEdit(customer: Customer) {
    setEditingId(customer.id);

    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      document: customer.document || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      notes: customer.notes || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveCustomer() {
    if (!form.name.trim()) {
      alert("Informe o nome do cliente.");
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      document: form.document.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim().toUpperCase() || null,
      notes: form.notes.trim() || null,
      active: true,
    };

    if (editingId) {
      const { error } = await supabase
        .from("customers")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        console.error(error);
        alert("Erro ao atualizar cliente.");
      } else {
        alert("Cliente atualizado com sucesso.");
        cancelEdit();
        await loadCustomers();
      }
    } else {
      const { error } = await supabase
        .from("customers")
        .insert(payload);

      if (error) {
        console.error(error);
        alert("Erro ao cadastrar cliente.");
      } else {
        alert("Cliente cadastrado com sucesso.");
        setForm(emptyForm);
        await loadCustomers();
      }
    }

    setSaving(false);
  }

  async function toggleCustomer(customer: Customer) {
    const action = customer.active ? "desativar" : "ativar";

    const confirmed = window.confirm(
      `Deseja ${action} o cliente "${customer.name}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("customers")
      .update({
        active: !customer.active,
      })
      .eq("id", customer.id);

    if (error) {
      console.error(error);
      alert(`Erro ao ${action} cliente.`);
      return;
    }

    await loadCustomers();
  }

  const filteredCustomers = customers.filter((customer) => {
    const term = search.toLowerCase();

    return (
      customer.name?.toLowerCase().includes(term) ||
      customer.phone?.toLowerCase().includes(term) ||
      customer.email?.toLowerCase().includes(term) ||
      customer.document?.toLowerCase().includes(term)
    );
  });

  const activeCustomers = customers.filter(
    (customer) => customer.active
  ).length;

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">
              Relacionamento
            </p>

            <h1 className="mt-2 text-3xl font-semibold">
              Clientes
            </h1>

            <p className="mt-2 text-sm text-white/40">
              Cadastre e gerencie os clientes da empresa.
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
              Total de clientes
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {customers.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-sm text-white/40">
              Clientes ativos
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {activeCustomers}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="text-sm text-white/40">
              Inativos
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {customers.length - activeCustomers}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">
                {editingId
                  ? "Editar cliente"
                  : "Novo cliente"}
              </h2>

              <p className="mt-1 text-sm text-white/40">
                {editingId
                  ? "Atualize os dados do cliente."
                  : "Cadastre um novo cliente."}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs text-white/50">
                  Nome *
                </label>

                <input
                  value={form.name}
                  onChange={(e) =>
                    updateField("name", e.target.value)
                  }
                  placeholder="Nome completo"
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-white/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs text-white/50">
                  Telefone
                </label>

                <input
                  value={form.phone}
                  onChange={(e) =>
                    updateField("phone", e.target.value)
                  }
                  placeholder="(00) 00000-0000"
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-white/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs text-white/50">
                  E-mail
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    updateField("email", e.target.value)
                  }
                  placeholder="cliente@email.com"
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-white/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs text-white/50">
                  CPF / CNPJ
                </label>

                <input
                  value={form.document}
                  onChange={(e) =>
                    updateField("document", e.target.value)
                  }
                  placeholder="Documento"
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-white/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs text-white/50">
                  Endereço
                </label>

                <input
                  value={form.address}
                  onChange={(e) =>
                    updateField("address", e.target.value)
                  }
                  placeholder="Rua, número, bairro"
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-white/30"
                />
              </div>

              <div className="grid grid-cols-[1fr_90px] gap-3">
                <div>
                  <label className="mb-2 block text-xs text-white/50">
                    Cidade
                  </label>

                  <input
                    value={form.city}
                    onChange={(e) =>
                      updateField("city", e.target.value)
                    }
                    placeholder="Cidade"
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs text-white/50">
                    UF
                  </label>

                  <input
                    maxLength={2}
                    value={form.state}
                    onChange={(e) =>
                      updateField("state", e.target.value)
                    }
                    placeholder="ES"
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm uppercase outline-none transition focus:border-white/30"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs text-white/50">
                  Observações
                </label>

                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    updateField("notes", e.target.value)
                  }
                  placeholder="Observações sobre o cliente..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-white/30"
                />
              </div>

              <div className="flex gap-3 pt-2">
                {editingId && (
                  <button
                    onClick={cancelEdit}
                    className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm text-white/60 transition hover:border-white/20 hover:text-white"
                  >
                    Cancelar
                  </button>
                )}

                <button
                  onClick={saveCustomer}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-50"
                >
                  {saving
                    ? "Salvando..."
                    : editingId
                    ? "Salvar alterações"
                    : "Cadastrar cliente"}
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Clientes cadastrados
                </h2>

                <p className="mt-1 text-sm text-white/40">
                  Consulte e gerencie seus clientes.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm outline-none transition focus:border-white/30 md:w-64"
              />
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm text-white/40">
                Carregando clientes...
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 py-12 text-center">
                <p className="text-sm text-white/40">
                  Nenhum cliente encontrado.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="rounded-xl border border-white/10 bg-black p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="truncate font-medium">
                            {customer.name}
                          </h3>

                          <span
                            className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-wider ${
                              customer.active
                                ? "bg-white/10 text-white/70"
                                : "bg-white/5 text-white/30"
                            }`}
                          >
                            {customer.active
                              ? "Ativo"
                              : "Inativo"}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/40">
                          {customer.phone && (
                            <span>{customer.phone}</span>
                          )}

                          {customer.email && (
                            <span>{customer.email}</span>
                          )}

                          {customer.document && (
                            <span>{customer.document}</span>
                          )}
                        </div>

                        {(customer.city || customer.state) && (
                          <p className="mt-1 text-xs text-white/30">
                            {[customer.city, customer.state]
                              .filter(Boolean)
                              .join(" - ")}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => startEdit(customer)}
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 transition hover:border-white/20 hover:text-white"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() =>
                            toggleCustomer(customer)
                          }
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 transition hover:border-white/20 hover:text-white"
                        >
                          {customer.active
                            ? "Desativar"
                            : "Ativar"}
                        </button>
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