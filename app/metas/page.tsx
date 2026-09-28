"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Goal = {
  id: string;
  name: string;
  goal_type: string;
  target_value: number;
  current_value: number;
  start_date: string;
  end_date: string;
  active: boolean;
  created_at: string;
};

type Sale = {
  id: string;
  sale_date: string;
  total: number;
  status: string;
};

type SaleItem = {
  sale_id: string;
  quantity: number;
  cost_total: number;
};

const goalTypes = [
  "Faturamento",
  "Vendas",
  "Lucro",
  "Produtos vendidos",
];

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function calculateGoalValue(
  goal: Goal,
  sales: Sale[],
  saleItems: SaleItem[]
) {
  const periodSales = sales.filter((sale) => {
    return (
      sale.sale_date >= goal.start_date &&
      sale.sale_date <= goal.end_date
    );
  });

  if (goal.goal_type === "Faturamento") {
    return periodSales.reduce(
      (total, sale) => total + Number(sale.total || 0),
      0
    );
  }

  if (goal.goal_type === "Vendas") {
    return periodSales.length;
  }

  if (goal.goal_type === "Produtos vendidos") {
    const saleIds = new Set(
      periodSales.map((sale) => sale.id)
    );

    return saleItems
      .filter((item) => saleIds.has(item.sale_id))
      .reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
      );
  }

  if (goal.goal_type === "Lucro") {
    const saleIds = new Set(
      periodSales.map((sale) => sale.id)
    );

    const totalRevenue = periodSales.reduce(
      (total, sale) => total + Number(sale.total || 0),
      0
    );

    const totalCost = saleItems
      .filter((item) => saleIds.has(item.sale_id))
      .reduce(
        (total, item) =>
          total + Number(item.cost_total || 0),
        0
      );

    return totalRevenue - totalCost;
  }

  return 0;
}

export default function MetasPage() {
  const supabase = createClient();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [goalType, setGoalType] = useState("Faturamento");
  const [targetValue, setTargetValue] = useState("");

  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getToday());

  const [active, setActive] = useState(true);

  async function loadData() {
    setLoading(true);

    const [
      goalsResult,
      salesResult,
    ] = await Promise.all([
      supabase
        .from("goals")
        .select("*")
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("sales")
        .select("id, sale_date, total, status")
        .eq("status", "completed"),
    ]);

    if (goalsResult.error) {
      alert(goalsResult.error.message);
      setLoading(false);
      return;
    }

    if (salesResult.error) {
      alert(salesResult.error.message);
      setLoading(false);
      return;
    }

    const loadedGoals = goalsResult.data || [];
    const loadedSales = salesResult.data || [];

    const saleIds = loadedSales.map(
      (sale) => sale.id
    );

    let loadedSaleItems: SaleItem[] = [];

    if (saleIds.length > 0) {
      const { data, error } = await supabase
        .from("sale_items")
        .select(
          "sale_id, quantity, cost_total"
        )
        .in("sale_id", saleIds);

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      loadedSaleItems = data || [];
    }

    setGoals(loadedGoals);
    setSales(loadedSales);
    setSaleItems(loadedSaleItems);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setEditingId(null);
    setName("");
    setGoalType("Faturamento");
    setTargetValue("");
    setStartDate(getToday());
    setEndDate(getToday());
    setActive(true);
  }

  function startEdit(goal: Goal) {
    setEditingId(goal.id);
    setName(goal.name);
    setGoalType(goal.goal_type);
    setTargetValue(String(goal.target_value));
    setStartDate(goal.start_date);
    setEndDate(goal.end_date);
    setActive(goal.active);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveGoal() {
    if (saving) {
      return;
    }

    if (!name.trim()) {
      alert("Digite um nome para a meta.");
      return;
    }

    const target = Number(targetValue || 0);

    if (target <= 0) {
      alert(
        "O valor da meta deve ser maior que zero."
      );
      return;
    }

    if (endDate < startDate) {
      alert(
        "A data final não pode ser anterior à data inicial."
      );
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: name.trim(),
        goal_type: goalType,
        target_value: target,
        current_value: 0,
        start_date: startDate,
        end_date: endDate,
        active,
      };

      if (editingId) {
        const { error } = await supabase
          .from("goals")
          .update(payload)
          .eq("id", editingId);

        if (error) {
          throw new Error(error.message);
        }

        alert("Meta atualizada com sucesso.");
      } else {
        const { error } = await supabase
          .from("goals")
          .insert(payload);

        if (error) {
          throw new Error(error.message);
        }

        alert("Meta criada com sucesso.");
      }

      resetForm();
      await loadData();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a meta."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleGoal(goal: Goal) {
    const { error } = await supabase
      .from("goals")
      .update({
        active: !goal.active,
      })
      .eq("id", goal.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadData();
  }

  async function deleteGoal(goal: Goal) {
    const confirmed = window.confirm(
      `Excluir a meta "${goal.name}"?`
    );

    if (!confirmed) {
      return;
    }

    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("id", goal.id);

    if (error) {
      alert(error.message);
      return;
    }

    if (editingId === goal.id) {
      resetForm();
    }

    await loadData();
  }

  const calculatedGoals = useMemo(() => {
    return goals.map((goal) => ({
      ...goal,
      calculatedValue: calculateGoalValue(
        goal,
        sales,
        saleItems
      ),
    }));
  }, [goals, sales, saleItems]);

  const activeGoals = useMemo(
    () =>
      calculatedGoals.filter(
        (goal) => goal.active
      ),
    [calculatedGoals]
  );

  const completedGoals = useMemo(
    () =>
      calculatedGoals.filter(
        (goal) =>
          Number(goal.calculatedValue) >=
          Number(goal.target_value)
      ),
    [calculatedGoals]
  );

  const totalTarget = useMemo(
    () =>
      activeGoals.reduce(
        (total, goal) =>
          total + Number(goal.target_value),
        0
      ),
    [activeGoals]
  );

  const totalCurrent = useMemo(
    () =>
      activeGoals.reduce(
        (total, goal) =>
          total + Number(goal.calculatedValue),
        0
      ),
    [activeGoals]
  );

  function getProgress(
    currentValue: number,
    targetValue: number
  ) {
    if (targetValue <= 0) {
      return 0;
    }

    return Math.min(
      100,
      (currentValue / targetValue) * 100
    );
  }

  function getStatus(goal: Goal) {
    const today = getToday();

    if (
      Number(goal.calculatedValue) >=
      Number(goal.target_value)
    ) {
      return "Concluída";
    }

    if (today > goal.end_date) {
      return "Encerrada";
    }

    if (!goal.active) {
      return "Inativa";
    }

    return "Em andamento";
  }

  function formatValue(
    value: number,
    type: string
  ) {
    if (
      type === "Faturamento" ||
      type === "Lucro"
    ) {
      return `R$ ${value.toFixed(2)}`;
    }

    return value.toLocaleString("pt-BR");
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="p-6 md:p-10">

        {/* CABEÇALHO */}

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">
              Planejamento
            </p>

            <h1 className="mt-2 text-3xl font-semibold">
              Metas
            </h1>

            <p className="mt-2 text-sm text-white/40">
              Defina objetivos e acompanhe sua evolução automaticamente.
            </p>
          </div>

          <a
            href="/"
            className="w-fit rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:border-white/20 hover:text-white"
          >
            Dashboard
          </a>
        </div>

        {/* INDICADORES */}

        <div className="mb-6 grid gap-4 md:grid-cols-3">

          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
            <p className="text-xs text-white/35">
              Metas ativas
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {activeGoals.length}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
            <p className="text-xs text-white/35">
              Metas concluídas
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {completedGoals.length}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.025] p-5">
            <p className="text-xs text-white/35">
              Progresso geral
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {totalTarget > 0
                ? Math.min(
                    100,
                    (totalCurrent /
                      totalTarget) *
                      100
                  ).toFixed(0)
                : "0"}
              %
            </p>
          </div>

        </div>

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">

          {/* FORMULÁRIO */}

          <section className="rounded-xl border border-white/10 bg-white/[0.025] p-6">

            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium">
                  {editingId
                    ? "Editar meta"
                    : "Nova meta"}
                </h2>

                <p className="mt-1 text-sm text-white/35">
                  {editingId
                    ? "Atualize os dados da meta."
                    : "Crie um novo objetivo."}
                </p>
              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-white/40 hover:text-white"
                >
                  Cancelar
                </button>
              )}
            </div>

            <div className="mt-6 space-y-4">

              <div>
                <label className="mb-2 block text-sm text-white/50">
                  Nome da meta
                </label>

                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  placeholder="Ex.: Faturamento de setembro"
                  className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/50">
                  Tipo
                </label>

                <select
                  value={goalType}
                  onChange={(e) =>
                    setGoalType(e.target.value)
                  }
                  className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                >
                  {goalTypes.map((type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/50">
                  Meta
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={targetValue}
                  onChange={(e) =>
                    setTargetValue(
                      e.target.value
                    )
                  }
                  placeholder="0,00"
                  className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                />
              </div>

              <div className="rounded-lg border border-white/10 bg-black/30 p-4">

                <p className="text-sm">
                  Valor atual
                </p>

                <p className="mt-1 text-xs text-white/35">
                  Calculado automaticamente pelas vendas realizadas no período.
                </p>

                <p className="mt-3 text-lg font-medium">
                  {formatValue(
                    editingId
                      ? Number(
                          calculatedGoals.find(
                            (goal) =>
                              goal.id ===
                              editingId
                          )
                            ?.calculatedValue || 0
                        )
                      : 0,
                    goalType
                  )}
                </p>

              </div>

              <div className="grid gap-4 md:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm text-white/50">
                    Data inicial
                  </label>

                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) =>
                      setStartDate(
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/50">
                    Data final
                  </label>

                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) =>
                      setEndDate(
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm outline-none focus:border-white/30"
                  />
                </div>

              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-black/30 p-4">

                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) =>
                    setActive(
                      e.target.checked
                    )
                  }
                  className="h-4 w-4"
                />

                <div>
                  <p className="text-sm">
                    Meta ativa
                  </p>

                  <p className="mt-1 text-xs text-white/35">
                    Metas inativas não entram no progresso geral.
                  </p>
                </div>

              </label>

              <button
                type="button"
                onClick={saveGoal}
                disabled={saving}
                className="w-full rounded-lg bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-50"
              >
                {saving
                  ? "Salvando..."
                  : editingId
                  ? "Salvar alterações"
                  : "Criar meta"}
              </button>

            </div>
          </section>

          {/* LISTA */}

          <section className="rounded-xl border border-white/10 bg-white/[0.025] p-6">

            <div>
              <h2 className="text-lg font-medium">
                Suas metas
              </h2>

              <p className="mt-1 text-sm text-white/35">
                O progresso é calculado diretamente pelas vendas realizadas.
              </p>
            </div>

            {loading ? (
              <p className="py-10 text-sm text-white/35">
                Carregando...
              </p>
            ) : goals.length === 0 ? (
              <div className="mt-6 rounded-lg border border-dashed border-white/10 py-16 text-center">
                <p className="text-sm text-white/40">
                  Nenhuma meta cadastrada.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">

                {calculatedGoals.map(
                  (goal) => {

                    const currentValue =
                      Number(
                        goal.calculatedValue
                      );

                    const progress =
                      getProgress(
                        currentValue,
                        Number(
                          goal.target_value
                        )
                      );

                    const status =
                      getStatus(goal);

                    const remaining = Math.max(
                      0,
                      Number(
                        goal.target_value
                      ) - currentValue
                    );

                    return (
                      <div
                        key={goal.id}
                        className="rounded-xl border border-white/10 bg-black/30 p-5"
                      >

                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                          <div>

                            <div className="flex flex-wrap items-center gap-2">

                              <h3 className="font-medium">
                                {goal.name}
                              </h3>

                              <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wider text-white/40">
                                {goal.goal_type}
                              </span>

                            </div>

                            <p className="mt-2 text-xs text-white/35">

                              {goal.start_date
                                .split("-")
                                .reverse()
                                .join("/")}

                              {" → "}

                              {goal.end_date
                                .split("-")
                                .reverse()
                                .join("/")}

                            </p>

                          </div>

                          <span
                            className={`text-xs ${
                              status ===
                              "Concluída"
                                ? "text-white"
                                : status ===
                                  "Inativa"
                                ? "text-white/25"
                                : "text-white/50"
                            }`}
                          >
                            {status}
                          </span>

                        </div>

                        <div className="mt-5">

                          <div className="mb-2 flex items-center justify-between text-xs">

                            <span className="text-white/40">
                              {formatValue(
                                currentValue,
                                goal.goal_type
                              )}
                            </span>

                            <span className="text-white/40">
                              {formatValue(
                                Number(
                                  goal.target_value
                                ),
                                goal.goal_type
                              )}
                            </span>

                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-white/10">

                            <div
                              className="h-full rounded-full bg-white transition-all"
                              style={{
                                width: `${progress}%`,
                              }}
                            />

                          </div>

                          <div className="mt-2 flex items-center justify-between text-xs">

                            <span className="text-white/30">
                              {progress.toFixed(
                                0
                              )}
                              % concluído
                            </span>

                            <span className="text-white/30">
                              {formatValue(
                                remaining,
                                goal.goal_type
                              )}{" "}
                              restante
                            </span>

                          </div>

                        </div>

                        <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">

                          <button
                            type="button"
                            onClick={() =>
                              startEdit(goal)
                            }
                            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50 transition hover:border-white/20 hover:text-white"
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              toggleGoal(goal)
                            }
                            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50 transition hover:border-white/20 hover:text-white"
                          >
                            {goal.active
                              ? "Desativar"
                              : "Ativar"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteGoal(goal)
                            }
                            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/30 transition hover:border-white/20 hover:text-white"
                          >
                            Excluir
                          </button>

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
