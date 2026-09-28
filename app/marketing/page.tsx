"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Campaign = {
  id: string;
  name: string;
  platform: string | null;
  objective: string | null;
  budget: number;
  revenue: number;
  leads: number;
  sales: number;
  start_date: string | null;
  end_date: string | null;
  status: "planned" | "active" | "paused" | "completed";
  notes: string | null;
};

const supabase = createClient();

const emptyForm = {
  name: "",
  platform: "",
  objective: "",
  budget: "",
  revenue: "",
  leads: "",
  sales: "",
  start_date: "",
  end_date: "",
  status: "planned" as Campaign["status"],
  notes: "",
};

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadCampaigns() {
    setLoading(true);

    const { data, error } = await supabase
      .from("marketing_campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setCampaigns((data || []) as Campaign[]);
    setLoading(false);
  }

  useEffect(() => {
    loadCampaigns();
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

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function saveCampaign() {
    if (!form.name.trim()) {
      alert("Informe o nome da campanha.");
      return;
    }

    const budget = Number(form.budget || 0);
    const revenue = Number(form.revenue || 0);
    const leads = Number(form.leads || 0);
    const sales = Number(form.sales || 0);

    if (
      budget < 0 ||
      revenue < 0 ||
      leads < 0 ||
      sales < 0
    ) {
      alert("Os valores não podem ser negativos.");
      return;
    }

    if (
      form.start_date &&
      form.end_date &&
      form.end_date < form.start_date
    ) {
      alert("A data final não pode ser anterior à data inicial.");
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      platform: form.platform.trim() || null,
      objective: form.objective.trim() || null,
      budget,
      revenue,
      leads: Math.floor(leads),
      sales: Math.floor(sales),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status,
      notes: form.notes.trim() || null,
    };

    let error;

    if (editingId) {
      const result = await supabase
        .from("marketing_campaigns")
        .update(payload)
        .eq("id", editingId);

      error = result.error;
    } else {
      const result = await supabase
        .from("marketing_campaigns")
        .insert(payload);

      error = result.error;
    }

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    resetForm();
    await loadCampaigns();
    setSaving(false);
  }

  function editCampaign(campaign: Campaign) {
    setEditingId(campaign.id);

    setForm({
      name: campaign.name,
      platform: campaign.platform || "",
      objective: campaign.objective || "",
      budget: String(campaign.budget ?? 0),
      revenue: String(campaign.revenue ?? 0),
      leads: String(campaign.leads ?? 0),
      sales: String(campaign.sales ?? 0),
      start_date: campaign.start_date || "",
      end_date: campaign.end_date || "",
      status: campaign.status,
      notes: campaign.notes || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function changeStatus(
    id: string,
    status: Campaign["status"]
  ) {
    const { error } = await supabase
      .from("marketing_campaigns")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadCampaigns();
  }

  async function deleteCampaign(id: string) {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir esta campanha?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("marketing_campaigns")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadCampaigns();
  }

  const totalBudget = campaigns.reduce(
    (sum, campaign) => sum + Number(campaign.budget || 0),
    0
  );

  const totalRevenue = campaigns.reduce(
    (sum, campaign) => sum + Number(campaign.revenue || 0),
    0
  );

  const totalLeads = campaigns.reduce(
    (sum, campaign) => sum + Number(campaign.leads || 0),
    0
  );

  const totalSales = campaigns.reduce(
    (sum, campaign) => sum + Number(campaign.sales || 0),
    0
  );

  const overallRoas =
    totalBudget > 0 ? totalRevenue / totalBudget : 0;

  const activeCampaigns = campaigns.filter(
    (campaign) => campaign.status === "active"
  ).length;

  function formatMoney(value: number) {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatNumber(value: number) {
    return value.toLocaleString("pt-BR");
  }

  function getStatusLabel(status: Campaign["status"]) {
    const labels = {
      planned: "Planejada",
      active: "Ativa",
      paused: "Pausada",
      completed: "Concluída",
    };

    return labels[status];
  }

  function getStatusClass(status: Campaign["status"]) {
    const classes = {
      planned: "bg-white/5 text-white/60 border-white/10",
      active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      paused: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
      completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    };

    return classes[status];
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">

        <div className="mb-8">
          <p className="text-sm text-white/40">
            Gestão
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Marketing
          </h1>

          <p className="mt-2 text-sm text-white/45">
            Controle campanhas, investimentos e resultados.
          </p>
        </div>

        {/* KPIs */}

        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs text-white/40">
              Investimento
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatMoney(totalBudget)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs text-white/40">
              Receita gerada
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatMoney(totalRevenue)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs text-white/40">
              Leads
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatNumber(totalLeads)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs text-white/40">
              Vendas
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatNumber(totalSales)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs text-white/40">
              ROAS geral
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {overallRoas.toFixed(2)}x
            </p>
          </div>

        </div>

        {/* Formulário */}

        <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">

          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                {editingId
                  ? "Editar campanha"
                  : "Nova campanha"}
              </h2>

              <p className="mt-1 text-sm text-white/40">
                Registre investimento e resultados da campanha.
              </p>
            </div>

            {editingId && (
              <button
                onClick={resetForm}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
              >
                Cancelar edição
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

            <div className="xl:col-span-2">
              <label className="mb-2 block text-xs text-white/45">
                Nome da campanha
              </label>

              <input
                value={form.name}
                onChange={(e) =>
                  updateField("name", e.target.value)
                }
                placeholder="Ex.: Campanha BlackSheep"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none transition focus:border-white/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs text-white/45">
                Plataforma
              </label>

              <input
                value={form.platform}
                onChange={(e) =>
                  updateField("platform", e.target.value)
                }
                placeholder="Instagram"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none transition focus:border-white/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs text-white/45">
                Objetivo
              </label>

              <input
                value={form.objective}
                onChange={(e) =>
                  updateField("objective", e.target.value)
                }
                placeholder="Vendas"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none transition focus:border-white/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs text-white/45">
                Orçamento
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.budget}
                onChange={(e) =>
                  updateField("budget", e.target.value)
                }
                placeholder="0,00"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs text-white/45">
                Receita
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={form.revenue}
                onChange={(e) =>
                  updateField("revenue", e.target.value)
                }
                placeholder="0,00"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs text-white/45">
                Leads
              </label>

              <input
                type="number"
                min="0"
                step="1"
                value={form.leads}
                onChange={(e) =>
                  updateField("leads", e.target.value)
                }
                placeholder="0"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs text-white/45">
                Vendas
              </label>

              <input
                type="number"
                min="0"
                step="1"
                value={form.sales}
                onChange={(e) =>
                  updateField("sales", e.target.value)
                }
                placeholder="0"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs text-white/45">
                Data inicial
              </label>

              <input
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  updateField("start_date", e.target.value)
                }
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs text-white/45">
                Data final
              </label>

              <input
                type="date"
                value={form.end_date}
                onChange={(e) =>
                  updateField("end_date", e.target.value)
                }
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs text-white/45">
                Status
              </label>

              <select
                value={form.status}
                onChange={(e) =>
                  updateField(
                    "status",
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/30"
              >
                <option value="planned">
                  Planejada
                </option>
                <option value="active">
                  Ativa
                </option>
                <option value="paused">
                  Pausada
                </option>
                <option value="completed">
                  Concluída
                </option>
              </select>
            </div>

            <div className="xl:col-span-2">
              <label className="mb-2 block text-xs text-white/45">
                Observações
              </label>

              <input
                value={form.notes}
                onChange={(e) =>
                  updateField("notes", e.target.value)
                }
                placeholder="Observações da campanha..."
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-white/30"
              />
            </div>

          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={saveCampaign}
              disabled={saving}
              className="rounded-xl bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Salvando..."
                : editingId
                ? "Salvar alterações"
                : "Criar campanha"}
            </button>
          </div>

        </section>

        {/* Campanhas */}

        <section className="rounded-2xl border border-white/10 bg-white/[0.03]">

          <div className="border-b border-white/10 px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Campanhas
                </h2>

                <p className="mt-1 text-sm text-white/40">
                  {activeCampaigns} campanha(s) ativa(s)
                </p>
              </div>

              <span className="text-sm text-white/40">
                {campaigns.length} total
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-white/40">
              Carregando campanhas...
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-white/50">
                Nenhuma campanha cadastrada.
              </p>

              <p className="mt-2 text-sm text-white/30">
                Crie sua primeira campanha acima.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">

              {campaigns.map((campaign) => {
                const budget = Number(campaign.budget || 0);
                const revenue = Number(campaign.revenue || 0);
                const leads = Number(campaign.leads || 0);
                const sales = Number(campaign.sales || 0);

                const roas =
                  budget > 0 ? revenue / budget : 0;

                const cpl =
                  leads > 0 ? budget / leads : 0;

                const costPerSale =
                  sales > 0 ? budget / sales : 0;

                return (
                  <div
                    key={campaign.id}
                    className="p-6"
                  >

                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center gap-3">

                          <h3 className="text-lg font-medium">
                            {campaign.name}
                          </h3>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs ${getStatusClass(
                              campaign.status
                            )}`}
                          >
                            {getStatusLabel(
                              campaign.status
                            )}
                          </span>

                        </div>

                        <div className="mt-2 flex flex-wrap gap-4 text-sm text-white/40">

                          {campaign.platform && (
                            <span>
                              {campaign.platform}
                            </span>
                          )}

                          {campaign.objective && (
                            <span>
                              {campaign.objective}
                            </span>
                          )}

                          {campaign.start_date && (
                            <span>
                              {new Date(
                                `${campaign.start_date}T00:00:00`
                              ).toLocaleDateString(
                                "pt-BR"
                              )}
                              {campaign.end_date
                                ? ` → ${new Date(
                                    `${campaign.end_date}T00:00:00`
                                  ).toLocaleDateString(
                                    "pt-BR"
                                  )}`
                                : ""}
                            </span>
                          )}

                        </div>

                        {campaign.notes && (
                          <p className="mt-3 text-sm text-white/45">
                            {campaign.notes}
                          </p>
                        )}

                      </div>

                      <div className="flex flex-wrap gap-2">

                        <button
                          onClick={() =>
                            editCampaign(campaign)
                          }
                          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
                        >
                          Editar
                        </button>

                        <select
                          value={campaign.status}
                          onChange={(e) =>
                            changeStatus(
                              campaign.id,
                              e.target.value as Campaign["status"]
                            )
                          }
                          className="rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white/70 outline-none"
                        >
                          <option value="planned">
                            Planejada
                          </option>
                          <option value="active">
                            Ativa
                          </option>
                          <option value="paused">
                            Pausada
                          </option>
                          <option value="completed">
                            Concluída
                          </option>
                        </select>

                        <button
                          onClick={() =>
                            deleteCampaign(campaign.id)
                          }
                          className="rounded-xl border border-red-500/20 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
                        >
                          Excluir
                        </button>

                      </div>

                    </div>

                    <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">

                      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs text-white/35">
                          Investimento
                        </p>
                        <p className="mt-1 font-medium">
                          {formatMoney(budget)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs text-white/35">
                          Receita
                        </p>
                        <p className="mt-1 font-medium">
                          {formatMoney(revenue)}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs text-white/35">
                          ROAS
                        </p>
                        <p className="mt-1 font-medium">
                          {roas.toFixed(2)}x
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs text-white/35">
                          CPL
                        </p>
                        <p className="mt-1 font-medium">
                          {leads > 0
                            ? formatMoney(cpl)
                            : "—"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                        <p className="text-xs text-white/35">
                          Custo por venda
                        </p>
                        <p className="mt-1 font-medium">
                          {sales > 0
                            ? formatMoney(costPerSale)
                            : "—"}
                        </p>
                      </div>

                    </div>

                    <div className="mt-3 flex gap-3 text-sm text-white/40">
                      <span>
                        {formatNumber(leads)} leads
                      </span>

                      <span>•</span>

                      <span>
                        {formatNumber(sales)} vendas
                      </span>
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