"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  notes: string | null;
  lead_source: string | null;
  lead_source_detail: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const leadSources = [
  "Instagram",
  "WhatsApp",
  "Indicação",
  "Google",
  "Anúncio",
  "Orgânico",
  "Outro",
];

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  document: "",
  lead_source: "",
  lead_source_detail: "",
  notes: "",
};

export default function ClientesPage() {
  const supabase = createClient();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  async function loadCustomers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("customers")
      .select(
        "id,name,phone,email,document,notes,lead_source,lead_source_detail,active,created_at,updated_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("Erro ao carregar clientes.");
    } else {
      setCustomers((data || []) as Customer[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return customers;

    return customers.filter((customer) =>
      [
        customer.name,
        customer.phone,
        customer.email,
        customer.document,
        customer.lead_source,
        customer.lead_source_detail,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [customers, search]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEdit(customer: Customer) {
    setEditingId(customer.id);
    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      document: customer.document || "",
      lead_source: customer.lead_source || "",
      lead_source_detail: customer.lead_source_detail || "",
      notes: customer.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      lead_source: form.lead_source || null,
      lead_source_detail: form.lead_source_detail.trim() || null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let error;

    if (editingId) {
      ({ error } = await supabase
        .from("customers")
        .update(payload)
        .eq("id", editingId));
    } else {
      ({ error } = await supabase.from("customers").insert({
        ...payload,
        active: true,
      }));
    }

    if (error) {
      console.error(error);
      alert(`Erro ao salvar cliente: ${error.message}`);
    } else {
      alert(editingId ? "Cliente atualizado." : "Cliente cadastrado.");
      resetForm();
      await loadCustomers();
    }

    setSaving(false);
  }

  async function toggleActive(customer: Customer) {
    const nextActive = !customer.active;

    const { error } = await supabase
      .from("customers")
      .update({
        active: nextActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", customer.id);

    if (error) {
      console.error(error);
      alert("Não foi possível alterar o status do cliente.");
      return;
    }

    await loadCustomers();
  }

  function formatDate(value: string) {
    return value ? value.slice(0, 10).split("-").reverse().join("/") : "—";
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">
              Relacionamento
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Clientes</h1>
            <p className="mt-2 text-sm text-white/40">
              Cadastre clientes e registre de onde cada lead veio.
            </p>
          </div>

          <a
            href="/"
            className="w-fit rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:text-white"
          >
            Dashboard
          </a>
        </div>

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">
                  {editingId ? "Editar cliente" : "Novo cliente"}
                </h2>
                <p className="mt-1 text-sm text-white/35">
                  Dados de contato e origem do lead.
                </p>
              </div>
              {editingId && (
                <button
                  onClick={resetForm}
                  className="text-xs text-white/40 hover:text-white"
                >
                  Cancelar
                </button>
              )}
            </div>

            <div className="space-y-4">
              <Field label="Nome *">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nome completo"
                  className="input"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="WhatsApp / telefone">
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="(27) 99999-9999"
                    className="input"
                  />
                </Field>
                <Field label="CPF / documento">
                  <input
                    value={form.document}
                    onChange={(e) => setForm({ ...form, document: e.target.value })}
                    placeholder="Opcional"
                    className="input"
                  />
                </Field>
              </div>

              <Field label="E-mail">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="cliente@email.com"
                  className="input"
                />
              </Field>

              <Field label="Origem do lead">
                <select
                  value={form.lead_source}
                  onChange={(e) => setForm({ ...form, lead_source: e.target.value })}
                  className="input"
                >
                  <option value="">Selecione</option>
                  {leadSources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Detalhe da origem">
                <input
                  value={form.lead_source_detail}
                  onChange={(e) =>
                    setForm({ ...form, lead_source_detail: e.target.value })
                  }
                  placeholder="Ex.: indicação do João, anúncio X, perfil Y..."
                  className="input"
                />
              </Field>

              <Field label="Observações">
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Preferências, informações comerciais etc."
                  rows={4}
                  className="input resize-none"
                />
              </Field>

              <button
                onClick={saveCustomer}
                disabled={saving}
                className="w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-50"
              >
                {saving
                  ? "Salvando..."
                  : editingId
                    ? "Salvar alterações"
                    : "Cadastrar cliente"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-semibold">Base de clientes</h2>
                <p className="mt-1 text-xs text-white/35">
                  {customers.length} cadastro(s)
                </p>
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente, telefone ou origem..."
                className="input md:max-w-xs"
              />
            </div>

            {loading ? (
              <div className="p-8 text-sm text-white/35">Carregando...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-sm text-white/35">
                Nenhum cliente encontrado.
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {filteredCustomers.map((customer) => (
                  <div key={customer.id} className="px-6 py-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{customer.name}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] ${
                              customer.active
                                ? "bg-white/10 text-white/60"
                                : "bg-white/5 text-white/25"
                            }`}
                          >
                            {customer.active ? "Ativo" : "Inativo"}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-white/35">
                          {customer.phone || "Sem telefone"}
                          {customer.email ? ` · ${customer.email}` : ""}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          {customer.lead_source && (
                            <span className="rounded-lg border border-white/10 px-2.5 py-1 text-white/50">
                              Origem: {customer.lead_source}
                            </span>
                          )}
                          {customer.lead_source_detail && (
                            <span className="rounded-lg border border-white/10 px-2.5 py-1 text-white/35">
                              {customer.lead_source_detail}
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-[11px] text-white/25">
                          Cadastro: {formatDate(customer.created_at)}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => startEdit(customer)}
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/55 hover:border-white/20 hover:text-white"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => toggleActive(customer)}
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/55 hover:border-white/20 hover:text-white"
                        >
                          {customer.active ? "Desativar" : "Ativar"}
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

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(255,255,255,0.1);
          background: #000;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          color: white;
          outline: none;
        }
        .input::placeholder { color: rgba(255,255,255,0.22); }
        .input:focus { border-color: rgba(255,255,255,0.3); }
        select.input option { background: #0b0b0b; color: white; }
      `}</style>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs text-white/50">{label}</label>
      {children}
    </div>
  );
}
