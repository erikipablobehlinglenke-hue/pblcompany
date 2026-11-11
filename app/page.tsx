"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Sale = {
  id: string;
  customer_id: string | null;
  sale_date: string;
  total: number;
  status: string;
  payment_method: string | null;
  customers?: {
    name: string;
  } | null;
};

type Purchase = {
  id: string;
  purchase_date: string;
  total: number;
  status: string;
  suppliers?: {
    name: string;
  } | null;
};

type Product = {
  id: string;
  name: string;
  stock_quantity: number;
  minimum_stock: number;
  cost_price: number;
  sale_price: number;
  active: boolean;
};

type SaleItem = {
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total: number;
  cost_total: number;
};

type ProductPerformance = {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
};

type DailyPerformance = {
  date: string;
  revenue: number;
  profit: number;
};

type FinancialTransaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  transaction_date: string;
  description: string;
  status: string;
};

type Campaign = {
  id: string;
  name: string;
  budget: number;
  revenue: number;
  leads: number;
  sales: number;
  status: string;
};

type Goal = {
  id: string;
  name: string;
  goal_type: string;
  target_value: number;
  current_value: number;
  start_date: string;
  end_date: string;
  active: boolean;
};

type CustomerLead = {
  id: string;
  name: string;
  lead_source: string | null;
};

const supabase = createClient();

function getBrazilDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
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

function getToday() {
  return getBrazilDate();
}

function getMonthStart() {
  const today = getBrazilDate();
  const [year, month] = today.split("-");

  return `${year}-${month}-01`;
}

function getDateDaysAgo(days: number) {
  const today = getBrazilDate();
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - days);

  return date.toISOString().slice(0, 10);
}

function normalizeDate(value: string | null | undefined) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function formatMoney(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
}

function formatDate(date: string | null | undefined) {
  const value = normalizeDate(date);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "—";
  }

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function calculateGoalValue(
  goal: Goal,
  sales: Sale[],
  saleItems: SaleItem[]
) {
  const periodSales = sales.filter(
    (sale) =>
      sale.sale_date >= goal.start_date &&
      sale.sale_date <= goal.end_date
  );

  if (goal.goal_type === "Faturamento") {
    return periodSales.reduce(
      (sum, sale) =>
        sum + Number(sale.total || 0),
      0
    );
  }

  if (goal.goal_type === "Vendas") {
    return periodSales.length;
  }

  const saleIds = new Set(
    periodSales.map((sale) => sale.id)
  );

  if (goal.goal_type === "Produtos vendidos") {
    return saleItems
      .filter((item) =>
        saleIds.has(item.sale_id)
      )
      .reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0),
        0
      );
  }

  if (goal.goal_type === "Lucro") {
    const revenue = periodSales.reduce(
      (sum, sale) =>
        sum + Number(sale.total || 0),
      0
    );

    const cost = saleItems
      .filter((item) =>
        saleIds.has(item.sale_id)
      )
      .reduce(
        (sum, item) =>
          sum + Number(item.cost_total || 0),
        0
      );

    return revenue - cost;
  }

  return 0;
}

type DashboardPeriod = "today" | "7days" | "30days" | "month";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboardPeriod, setDashboardPeriod] =
    useState<DashboardPeriod>("today");

  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [transactions, setTransactions] = useState<
    FinancialTransaction[]
  >([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [customers, setCustomers] = useState<CustomerLead[]>([]);

  async function loadDashboard() {
    setLoading(true);

    const [
      salesResult,
      purchasesResult,
      productsResult,
      saleItemsResult,
      transactionsResult,
      campaignsResult,
      goalsResult,
      customersResult,
    ] = await Promise.all([
      supabase
        .from("sales")
        .select(`
          id,
          customer_id,
          sale_date,
          total,
          status,
          payment_method,
          customers (
            name
          )
        `)
        .eq("status", "completed")
        .order("sale_date", {
          ascending: false,
        }),

      supabase
        .from("purchases")
        .select(`
          id,
          purchase_date,
          total,
          status,
          suppliers (
            name
          )
        `)
        .eq("status", "completed")
        .order("purchase_date", {
          ascending: false,
        })
        .limit(20),

      supabase
        .from("products")
        .select(
          "id, name, stock_quantity, minimum_stock, cost_price, sale_price, active"
        )
        .eq("active", true),

      supabase
        .from("sale_items")
        .select(
          "sale_id, product_id, quantity, unit_price, total, cost_total"
        ),

      supabase
        .from("financial_transactions")
        .select(
          "id, type, amount, transaction_date, description, status"
        )
        .eq("status", "completed")
        .order("transaction_date", {
          ascending: false,
        })
        .limit(100),

      supabase
        .from("marketing_campaigns")
        .select(
          "id, name, budget, revenue, leads, sales, status"
        ),

      supabase
        .from("goals")
        .select(
          "id, name, goal_type, target_value, current_value, start_date, end_date, active"
        ),

      supabase
        .from("customers")
        .select("id, name, lead_source")
        .eq("active", true),
    ]);

    if (salesResult.error) {
      console.error(
        "Erro ao carregar vendas:",
        salesResult.error
      );
    }

    if (purchasesResult.error) {
      console.error(
        "Erro ao carregar compras:",
        purchasesResult.error
      );
    }

    if (productsResult.error) {
      console.error(
        "Erro ao carregar produtos:",
        productsResult.error
      );
    }

    if (saleItemsResult.error) {
      console.error(
        "Erro ao carregar itens das vendas:",
        saleItemsResult.error
      );
    }

    if (transactionsResult.error) {
      console.error(
        "Erro ao carregar financeiro:",
        transactionsResult.error
      );
    }

    if (campaignsResult.error) {
      console.error(
        "Erro ao carregar marketing:",
        campaignsResult.error
      );
    }

    if (goalsResult.error) {
      console.error(
        "Erro ao carregar metas:",
        goalsResult.error
      );
    }

    if (customersResult.error) {
      console.error(
        "Erro ao carregar clientes:",
        customersResult.error
      );
    }

    setSales(
      (salesResult.data || []) as Sale[]
    );

    setPurchases(
      (purchasesResult.data || []) as Purchase[]
    );

    setProducts(
      (productsResult.data || []) as Product[]
    );

    setSaleItems(
      (saleItemsResult.data || []) as SaleItem[]
    );

    setTransactions(
      (transactionsResult.data ||
        []) as FinancialTransaction[]
    );

    setCampaigns(
      (campaignsResult.data ||
        []) as Campaign[]
    );

    setGoals(
      (goalsResult.data || []) as Goal[]
    );

    setCustomers(
      (customersResult.data || []) as CustomerLead[]
    );

    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const todayString = getToday();
  const monthStart = getMonthStart();
  const sevenDaysStart = getDateDaysAgo(6);
  const thirtyDaysStart = getDateDaysAgo(29);

  /*
   * VENDAS / PERÍODOS
   */

  const normalizedSales = sales.map((sale) => ({
    ...sale,
    normalizedDate: normalizeDate(sale.sale_date),
  }));

  const salesToday = normalizedSales.filter(
    (sale) => sale.normalizedDate === todayString
  );

  const salesThisMonth = normalizedSales.filter(
    (sale) =>
      sale.normalizedDate >= monthStart &&
      sale.normalizedDate <= todayString
  );

  const salesLast7Days = normalizedSales.filter(
    (sale) =>
      sale.normalizedDate >= sevenDaysStart &&
      sale.normalizedDate <= todayString
  );

  const salesLast30Days = normalizedSales.filter(
    (sale) =>
      sale.normalizedDate >= thirtyDaysStart &&
      sale.normalizedDate <= todayString
  );

  /*
   * CUSTO POR VENDA
   */

  const saleCostMap = new Map<string, number>();

  saleItems.forEach((item) => {
    const current = saleCostMap.get(item.sale_id) || 0;

    saleCostMap.set(
      item.sale_id,
      current + Number(item.cost_total || 0)
    );
  });

  const revenueToday = salesToday.reduce(
    (sum, sale) =>
      sum + Number(sale.total || 0),
    0
  );

  const revenue7Days = salesLast7Days.reduce(
    (sum, sale) =>
      sum + Number(sale.total || 0),
    0
  );

  const revenue30Days = salesLast30Days.reduce(
    (sum, sale) =>
      sum + Number(sale.total || 0),
    0
  );

  const revenueMonth = salesThisMonth.reduce(
    (sum, sale) =>
      sum + Number(sale.total || 0),
    0
  );

  const profitToday = salesToday.reduce(
    (sum, sale) =>
      sum +
      Number(sale.total || 0) -
      (saleCostMap.get(sale.id) || 0),
    0
  );

  const profit7Days = salesLast7Days.reduce(
    (sum, sale) =>
      sum +
      Number(sale.total || 0) -
      (saleCostMap.get(sale.id) || 0),
    0
  );

  const profit30Days = salesLast30Days.reduce(
    (sum, sale) =>
      sum +
      Number(sale.total || 0) -
      (saleCostMap.get(sale.id) || 0),
    0
  );

  const grossProfitMonth = salesThisMonth.reduce(
    (sum, sale) =>
      sum +
      Number(sale.total || 0) -
      (saleCostMap.get(sale.id) || 0),
    0
  );

  const selectedSales =
    dashboardPeriod === "today"
      ? salesToday
      : dashboardPeriod === "7days"
        ? salesLast7Days
        : dashboardPeriod === "30days"
          ? salesLast30Days
          : salesThisMonth;

  const selectedRevenue =
    dashboardPeriod === "today"
      ? revenueToday
      : dashboardPeriod === "7days"
        ? revenue7Days
        : dashboardPeriod === "30days"
          ? revenue30Days
          : revenueMonth;

  const selectedProfit =
    dashboardPeriod === "today"
      ? profitToday
      : dashboardPeriod === "7days"
        ? profit7Days
        : dashboardPeriod === "30days"
          ? profit30Days
          : grossProfitMonth;

  const selectedPeriodLabel =
    dashboardPeriod === "today"
      ? "Hoje"
      : dashboardPeriod === "7days"
        ? "Últimos 7 dias"
        : dashboardPeriod === "30days"
          ? "Últimos 30 dias"
          : "Este mês";

  const selectedPeriodStart =
    dashboardPeriod === "today"
      ? todayString
      : dashboardPeriod === "7days"
        ? sevenDaysStart
        : dashboardPeriod === "30days"
          ? thirtyDaysStart
          : monthStart;

  const selectedPeriodSales = selectedSales;

  const selectedSaleIds = new Set(
    selectedPeriodSales.map((sale) => sale.id)
  );

  const productMap = new Map(
    products.map((product) => [product.id, product])
  );

  const productPerformance: ProductPerformance[] = (() => {
    const map = new Map<string, ProductPerformance>();

    saleItems.forEach((item) => {
      if (!selectedSaleIds.has(item.sale_id)) return;

      const product = productMap.get(item.product_id);
      if (!product) return;

      const current = map.get(item.product_id) || {
        productId: item.product_id,
        name: product.name,
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        margin: 0,
      };

      current.quantity += Number(item.quantity || 0);
      current.revenue += Number(
        item.total ||
          Number(item.unit_price || 0) * Number(item.quantity || 0)
      );
      current.cost += Number(item.cost_total || 0);
      current.profit = current.revenue - current.cost;
      current.margin =
        current.revenue > 0
          ? (current.profit / current.revenue) * 100
          : 0;

      map.set(item.product_id, current);
    });

    return Array.from(map.values()).sort(
      (a, b) => b.revenue - a.revenue
    );
  })();

  const topProducts = productPerformance.slice(0, 5);

  const selectedMargin =
    selectedRevenue > 0
      ? (selectedProfit / selectedRevenue) * 100
      : 0;

  const dailyPerformance: DailyPerformance[] = (() => {
    const start = new Date(`${selectedPeriodStart}T00:00:00Z`);
    const end = new Date(`${todayString}T00:00:00Z`);
    const result: DailyPerformance[] = [];

    for (
      const cursor = new Date(start);
      cursor <= end;
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    ) {
      const date = cursor.toISOString().slice(0, 10);
      const daySales = selectedPeriodSales.filter(
        (sale) => sale.normalizedDate === date
      );

      const revenue = daySales.reduce(
        (sum, sale) => sum + Number(sale.total || 0),
        0
      );

      const profit = daySales.reduce(
        (sum, sale) =>
          sum +
          Number(sale.total || 0) -
          (saleCostMap.get(sale.id) || 0),
        0
      );

      result.push({ date, revenue, profit });
    }

    return result;
  })();

  // Escala do gráfico: inclui zero e também lucros negativos, sem deixar
  // a linha "grudada" no topo/rodapé quando os valores forem pequenos.
  const chartValues = dailyPerformance.flatMap((day) => [
    Number(day.revenue || 0),
    Number(day.profit || 0),
    0,
  ]);

  const chartMin = Math.min(...chartValues, 0);
  const chartMax = Math.max(...chartValues, 1);
  const chartRange = Math.max(chartMax - chartMin, 1);

  const getChartX = (index: number) => {
    if (dailyPerformance.length <= 1) return 500;
    return (index / (dailyPerformance.length - 1)) * 1000;
  };

  const getChartY = (value: number) => {
    const normalized = (Number(value || 0) - chartMin) / chartRange;
    return 280 - normalized * 250;
  };

  const paymentPerformance = (() => {
    const map = new Map<string, { label: string; sales: number; revenue: number }>();

    selectedSales.forEach((sale) => {
      const key = sale.payment_method || "Não informado";
      const current = map.get(key) || {
        label: key,
        sales: 0,
        revenue: 0,
      };

      current.sales += 1;
      current.revenue += Number(sale.total || 0);
      map.set(key, current);
    });

    return Array.from(map.values()).sort(
      (a, b) => b.revenue - a.revenue
    );
  })();

  const customerPerformance = (() => {
    const map = new Map<string, { name: string; sales: number; revenue: number }>();

    selectedSales.forEach((sale) => {
      const key = sale.customer_id || "consumer-final";
      const name = sale.customers?.name || "Consumidor final";
      const current = map.get(key) || {
        name,
        sales: 0,
        revenue: 0,
      };

      current.sales += 1;
      current.revenue += Number(sale.total || 0);
      map.set(key, current);
    });

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  })();

  const selectedProductsSold = saleItems
    .filter((item) => selectedSaleIds.has(item.sale_id))
    .reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );


  const leadSourcePerformance = (() => {
    const map = new Map<string, number>();

    customers.forEach((customer) => {
      const source = customer.lead_source || "Não informado";
      map.set(source, (map.get(source) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  })();

  /*
   * FINANCEIRO
   */

  const financialIncome =
    transactions
      .filter(
        (transaction) =>
          transaction.type === "income"
      )
      .reduce(
        (sum, transaction) =>
          sum +
          Number(transaction.amount || 0),
        0
      );

  const financialExpenses =
    transactions
      .filter(
        (transaction) =>
          transaction.type === "expense"
      )
      .reduce(
        (sum, transaction) =>
          sum +
          Number(transaction.amount || 0),
        0
      );

  const financialBalance =
    financialIncome - financialExpenses;

  /*
   * ESTOQUE
   */

  const inventoryCost =
    products.reduce(
      (sum, product) =>
        sum +
        Number(
          product.stock_quantity || 0
        ) *
          Number(
            product.cost_price || 0
          ),
      0
    );

  const inventorySaleValue =
    products.reduce(
      (sum, product) =>
        sum +
        Number(
          product.stock_quantity || 0
        ) *
          Number(
            product.sale_price || 0
          ),
      0
    );

  const lowStockProducts =
    products.filter(
      (product) =>
        Number(
          product.stock_quantity || 0
        ) <=
        Number(
          product.minimum_stock || 0
        )
    );

  const totalUnits =
    products.reduce(
      (sum, product) =>
        sum +
        Number(
          product.stock_quantity || 0
        ),
      0
    );

  /*
   * MARKETING
   */

  const marketingBudget =
    campaigns.reduce(
      (sum, campaign) =>
        sum +
        Number(campaign.budget || 0),
      0
    );

  const marketingRevenue =
    campaigns.reduce(
      (sum, campaign) =>
        sum +
        Number(campaign.revenue || 0),
      0
    );

  const marketingLeads =
    campaigns.reduce(
      (sum, campaign) =>
        sum +
        Number(campaign.leads || 0),
      0
    );

  const marketingSales =
    campaigns.reduce(
      (sum, campaign) =>
        sum +
        Number(campaign.sales || 0),
      0
    );

  const marketingRoas =
    marketingBudget > 0
      ? marketingRevenue /
        marketingBudget
      : 0;

  /*
   * METAS REAIS
   */

  const calculatedGoals =
    useMemo(() => {
      return goals.map((goal) => ({
        ...goal,
        calculatedValue:
          calculateGoalValue(
            goal,
            sales,
            saleItems
          ),
      }));
    }, [goals, sales, saleItems]);

  const activeGoals =
    calculatedGoals.filter(
      (goal) => goal.active
    );

  const averageGoalProgress =
    activeGoals.length > 0
      ? activeGoals.reduce(
          (sum, goal) => {
            if (
              Number(
                goal.target_value
              ) <= 0
            ) {
              return sum;
            }

            return (
              sum +
              Math.min(
                (Number(
                  goal.calculatedValue
                ) /
                  Number(
                    goal.target_value
                  )) *
                  100,
                100
              )
            );
          },
          0
        ) / activeGoals.length
      : 0;

  /*
   * ÚLTIMAS ATIVIDADES
   */

  const recentSales =
    sales.slice(0, 6);

  const recentPurchases =
    purchases.slice(0, 5);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050505] text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <p className="text-sm text-white/40">
            Carregando dashboard...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">

        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

          <div>
            <p className="text-sm text-white/40">
              Visão geral
            </p>

            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Dashboard
            </h1>

            <p className="mt-2 text-sm text-white/40">
              Visão consolidada da operação.
            </p>
          </div>

          <button
            onClick={loadDashboard}
            className="w-fit rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
          >
            Atualizar dados
          </button>

        </div>

        {/* ACESSO RÁPIDO */}
        <section className="mb-8">
          <div className="mb-3">
            <p className="text-xs text-white/40">Acesso rápido</p>
            <p className="mt-1 text-sm text-white/60">
              Navegue diretamente pelos módulos do PBL Management.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-9">
            {[
              ["Vendas", "/vendas"],
              ["Estoque", "/estoque"],
              ["Compras", "/compras"],
              ["Produtos", "/produtos"],
              ["Clientes", "/clientes"],
              ["Financeiro", "/financeiro"],
              ["Marketing", "/marketing"],
              ["Metas", "/metas"],
              ["Configurações", "/configuracoes"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-center text-xs text-white/55 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
              >
                {label}
              </a>
            ))}
          </div>
        </section>

        {/* PRINCIPAIS KPIs */}

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-white/40">
              Desempenho de vendas
            </p>
            <p className="mt-1 text-sm text-white/60">
              Receita e lucro por período. “30 dias” considera os últimos 30 dias corridos, mesmo atravessando a virada do mês.
            </p>
          </div>

          <div className="flex w-fit rounded-xl border border-white/10 bg-white/[0.03] p-1">
            {[
              ["today", "Hoje"],
              ["7days", "7 dias"],
              ["30days", "30 dias"],
              ["month", "Mês atual"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() =>
                  setDashboardPeriod(value as DashboardPeriod)
                }
                className={`rounded-lg px-4 py-2 text-xs transition ${
                  dashboardPeriod === value
                    ? "bg-white text-black"
                    : "text-white/45 hover:bg-white/5 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs text-white/40">
              Receita
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {formatMoney(selectedRevenue)}
            </p>

            <p className="mt-2 text-xs text-white/30">
              {selectedSales.length} venda(s) · {selectedPeriodLabel.toLowerCase()}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs text-white/40">
              Lucro bruto
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {formatMoney(selectedProfit)}
            </p>

            <p className="mt-2 text-xs text-white/30">
              Receita − custo dos produtos · {selectedPeriodLabel.toLowerCase()}
            </p>
          </div>

        </div>

        {/* SEGUNDA LINHA */}

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

            <p className="text-xs text-white/40">
              Valor do estoque
            </p>

            <p className="mt-2 text-xl font-semibold">
              {formatMoney(
                inventoryCost
              )}
            </p>

            <p className="mt-2 text-xs text-white/30">
              {formatNumber(totalUnits)} unidades
            </p>

          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

            <p className="text-xs text-white/40">
              Potencial de venda do estoque
            </p>

            <p className="mt-2 text-xl font-semibold">
              {formatMoney(
                inventorySaleValue
              )}
            </p>

          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

            <p className="text-xs text-white/40">
              Produtos vendidos no período
            </p>

            <p className="mt-2 text-xl font-semibold">
              {formatNumber(
                selectedProductsSold
              )}
            </p>

            <p className="mt-2 text-xs text-white/30">
              unidades · {selectedPeriodLabel.toLowerCase()}
            </p>

          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

            <p className="text-xs text-white/40">
              Estoque baixo
            </p>

            <p className="mt-2 text-xl font-semibold">
              {lowStockProducts.length}
            </p>

            <p className="mt-2 text-xs text-white/30">
              produto(s) precisam de atenção
            </p>

          </div>

        </div>

        {/* TERCEIRA LINHA */}

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-2">

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

            <p className="text-xs text-white/40">
              ROAS de marketing
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {marketingRoas.toFixed(2)}x
            </p>

            <p className="mt-2 text-xs text-white/30">
              {formatMoney(
                marketingBudget
              )} investidos
            </p>

          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

            <p className="text-xs text-white/40">
              Progresso das metas
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {averageGoalProgress.toFixed(0)}%
            </p>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">

              <div
                className="h-full rounded-full bg-white"
                style={{
                  width: `${averageGoalProgress}%`,
                }}
              />

            </div>

          </div>

        </div>

        {/* CONTEÚDO PRINCIPAL */}

        <div className="mt-8 grid gap-6 xl:grid-cols-3">

          {/* VENDAS */}

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] xl:col-span-2">

            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">

              <div>
                <h2 className="font-semibold">
                  Vendas recentes
                </h2>

                <p className="mt-1 text-xs text-white/35">
                  Últimas vendas registradas
                </p>
              </div>

              <a
                href="/vendas"
                className="text-xs text-white/40 transition hover:text-white"
              >
                Ver todas →
              </a>

            </div>

            {recentSales.length === 0 ? (
              <div className="p-8 text-center text-sm text-white/35">
                Nenhuma venda registrada.
              </div>
            ) : (
              <div className="divide-y divide-white/10">

                {recentSales.map(
                  (sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between gap-4 px-6 py-4"
                    >

                      <div className="min-w-0">

                        <p className="truncate text-sm font-medium">
                          {sale.customers?.name ||
                            "Consumidor final"}
                        </p>

                        <p className="mt-1 text-xs text-white/35">
                          {formatDate(sale.sale_date)}
                          {" · "}
                          {sale.payment_method ||
                            "Pagamento não informado"}
                        </p>

                      </div>

                      <p className="whitespace-nowrap text-sm font-medium">
                        {formatMoney(
                          Number(
                            sale.total || 0
                          )
                        )}
                      </p>

                    </div>
                  )
                )}

              </div>
            )}

          </section>

          {/* ESTOQUE BAIXO */}

          <section className="rounded-2xl border border-white/10 bg-white/[0.03]">

            <div className="border-b border-white/10 px-6 py-5">

              <h2 className="font-semibold">
                Estoque baixo
              </h2>

              <p className="mt-1 text-xs text-white/35">
                Produtos que precisam de reposição
              </p>

            </div>

            {lowStockProducts.length === 0 ? (
              <div className="p-8 text-center text-sm text-white/35">
                Nenhum produto em estoque baixo.
              </div>
            ) : (
              <div className="divide-y divide-white/10">

                {lowStockProducts
                  .slice(0, 6)
                  .map(
                    (product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between gap-4 px-6 py-4"
                      >

                        <div className="min-w-0">

                          <p className="truncate text-sm">
                            {product.name}
                          </p>

                          <p className="mt-1 text-xs text-white/35">
                            Mínimo:{" "}
                            {formatNumber(
                              product.minimum_stock
                            )}
                          </p>

                        </div>

                        <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs text-red-400">
                          {formatNumber(
                            product.stock_quantity
                          )}
                        </span>

                      </div>
                    )
                  )}

              </div>
            )}

          </section>

        </div>

        {/* ANÁLISE V2 */}

        <div className="mt-8 grid gap-6 xl:grid-cols-3">

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] xl:col-span-2">
            <div className="border-b border-white/10 px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold">Desempenho</h2>
                  <p className="mt-1 text-xs text-white/35">
                    Receita e lucro · {selectedPeriodLabel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/35">Margem bruta</p>
                  <p className="mt-1 text-sm font-semibold">
                    {selectedMargin.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="relative h-64 overflow-hidden rounded-xl border border-white/10 bg-black/20 p-4">
                {dailyPerformance.length > 0 ? (
                  <svg
                    viewBox="0 0 1000 300"
                    preserveAspectRatio="none"
                    className="h-full w-full overflow-visible"
                    role="img"
                    aria-label={`Gráfico de receita e lucro de ${selectedPeriodLabel.toLowerCase()}`}
                  >
                    {[25, 50, 75].map((y) => (
                      <line
                        key={y}
                        x1="0"
                        x2="1000"
                        y1={y * 3}
                        y2={y * 3}
                        stroke="currentColor"
                        strokeOpacity="0.08"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Linha de zero para deixar lucros negativos legíveis. */}
                    <line
                      x1="0"
                      x2="1000"
                      y1={getChartY(0)}
                      y2={getChartY(0)}
                      stroke="currentColor"
                      strokeOpacity="0.12"
                      strokeDasharray="5 6"
                    />

                    {/* RECEITA */}
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity="0.45"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={dailyPerformance
                        .map((day, index) =>
                          `${getChartX(index)},${getChartY(day.revenue)}`
                        )
                        .join(" ")}
                    />

                    {/* LUCRO */}
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity="1"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={dailyPerformance
                        .map((day, index) =>
                          `${getChartX(index)},${getChartY(day.profit)}`
                        )
                        .join(" ")}
                    />

                    {dailyPerformance.map((day, index) => {
                      const x = getChartX(index);
                      const revenueY = getChartY(day.revenue);
                      const profitY = getChartY(day.profit);

                      return (
                        <g key={day.date}>
                          <circle
                            cx={x}
                            cy={revenueY}
                            r="4"
                            fill="currentColor"
                            fillOpacity="0.45"
                          >
                            <title>
                              {formatDate(day.date)} · Receita {formatMoney(day.revenue)}
                            </title>
                          </circle>

                          <circle
                            cx={x}
                            cy={profitY}
                            r="4"
                            fill="currentColor"
                          >
                            <title>
                              {formatDate(day.date)} · Lucro {formatMoney(day.profit)}
                            </title>
                          </circle>
                        </g>
                      );
                    })}
                  </svg>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-white/30">
                    Sem vendas no período selecionado.
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-white/25">
                <span>{formatDate(dailyPerformance[0]?.date)}</span>
                <span>Receita · Lucro</span>
                <span>{formatDate(dailyPerformance[dailyPerformance.length - 1]?.date)}</span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="border-b border-white/10 px-6 py-5">
              <h2 className="font-semibold">Resumo do período</h2>
              <p className="mt-1 text-xs text-white/35">
                Indicadores · {selectedPeriodLabel}
              </p>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <p className="text-xs text-white/35">Vendas</p>
                <p className="mt-1 text-xl font-semibold">
                  {formatNumber(selectedSales.length)}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/35">Ticket médio</p>
                <p className="mt-1 text-xl font-semibold">
                  {formatMoney(
                    selectedSales.length > 0
                      ? selectedRevenue / selectedSales.length
                      : 0
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/35">Margem bruta</p>
                <p className="mt-1 text-xl font-semibold">
                  {selectedMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </section>

        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <div>
              <h2 className="font-semibold">Produtos em destaque</h2>
              <p className="mt-1 text-xs text-white/35">
                Ranking por faturamento · {selectedPeriodLabel}
              </p>
            </div>
            <a
              href="/produtos"
              className="text-xs text-white/40 transition hover:text-white"
            >
              Ver produtos →
            </a>
          </div>

          {topProducts.length === 0 ? (
            <div className="p-8 text-center text-sm text-white/35">
              Nenhuma venda no período selecionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-white/10 text-xs text-white/30">
                  <tr>
                    <th className="px-6 py-4 text-left font-normal">Produto</th>
                    <th className="px-6 py-4 text-right font-normal">Vendidos</th>
                    <th className="px-6 py-4 text-right font-normal">Receita</th>
                    <th className="px-6 py-4 text-right font-normal">Lucro</th>
                    <th className="px-6 py-4 text-right font-normal">Margem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {topProducts.map((product) => (
                    <tr key={product.productId} className="transition hover:bg-white/[0.02]">
                      <td className="px-6 py-4 font-medium">{product.name}</td>
                      <td className="px-6 py-4 text-right text-white/60">{formatNumber(product.quantity)}</td>
                      <td className="px-6 py-4 text-right">{formatMoney(product.revenue)}</td>
                      <td className="px-6 py-4 text-right">{formatMoney(product.profit)}</td>
                      <td className="px-6 py-4 text-right text-white/60">{product.margin.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">

          <section className="rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="border-b border-white/10 px-6 py-5">
              <h2 className="font-semibold">Formas de pagamento</h2>
              <p className="mt-1 text-xs text-white/35">
                Receita por forma de pagamento · {selectedPeriodLabel}
              </p>
            </div>

            {paymentPerformance.length === 0 ? (
              <div className="p-8 text-center text-sm text-white/35">
                Nenhuma venda no período selecionado.
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {paymentPerformance.map((payment) => {
                  const share =
                    selectedRevenue > 0
                      ? (payment.revenue / selectedRevenue) * 100
                      : 0;

                  return (
                    <div key={payment.label} className="px-6 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium">{payment.label}</p>
                          <p className="mt-1 text-xs text-white/35">
                            {formatNumber(payment.sales)} venda(s) · {share.toFixed(1)}% da receita
                          </p>
                        </div>
                        <p className="text-sm font-semibold">{formatMoney(payment.revenue)}</p>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-white/70"
                          style={{ width: `${Math.min(share, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="border-b border-white/10 px-6 py-5">
              <h2 className="font-semibold">Clientes que mais compram</h2>
              <p className="mt-1 text-xs text-white/35">
                Ranking por faturamento · {selectedPeriodLabel}
              </p>
            </div>

            {customerPerformance.length === 0 ? (
              <div className="p-8 text-center text-sm text-white/35">
                Nenhuma venda no período selecionado.
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {customerPerformance.map((customer, index) => (
                  <div
                    key={`${customer.name}-${index}`}
                    className="flex items-center justify-between gap-4 px-6 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-xs text-white/45">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{customer.name}</p>
                        <p className="mt-1 text-xs text-white/35">
                          {formatNumber(customer.sales)} compra(s)
                        </p>
                      </div>
                    </div>
                    <p className="whitespace-nowrap text-sm font-semibold">
                      {formatMoney(customer.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

        {/* SEGUNDA ÁREA */}

        <div className="mt-6 grid gap-6 xl:grid-cols-2">

          {/* COMPRAS */}

          <section className="rounded-2xl border border-white/10 bg-white/[0.03]">

            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">

              <div>

                <h2 className="font-semibold">
                  Compras recentes
                </h2>

                <p className="mt-1 text-xs text-white/35">
                  Últimas entradas de mercadoria
                </p>

              </div>

              <a
                href="/compras"
                className="text-xs text-white/40 transition hover:text-white"
              >
                Ver todas →
              </a>

            </div>

            {recentPurchases.length === 0 ? (
              <div className="p-8 text-center text-sm text-white/35">
                Nenhuma compra registrada.
              </div>
            ) : (
              <div className="divide-y divide-white/10">

                {recentPurchases.map(
                  (purchase) => (
                    <div
                      key={purchase.id}
                      className="flex items-center justify-between gap-4 px-6 py-4"
                    >

                      <div>

                        <p className="text-sm font-medium">
                          {purchase.suppliers?.name ||
                            "Fornecedor"}
                        </p>

                        <p className="mt-1 text-xs text-white/35">
                          {formatDate(
                            purchase.purchase_date
                          )}
                        </p>

                      </div>

                      <p className="text-sm font-medium">
                        {formatMoney(
                          Number(
                            purchase.total || 0
                          )
                        )}
                      </p>

                    </div>
                  )
                )}

              </div>
            )}

          </section>

          {/* FINANCEIRO */}

          <section className="rounded-2xl border border-white/10 bg-white/[0.03]">

            <div className="border-b border-white/10 px-6 py-5">

              <h2 className="font-semibold">
                Financeiro
              </h2>

              <p className="mt-1 text-xs text-white/35">
                Resumo das movimentações registradas
              </p>

            </div>

            <div className="grid grid-cols-2 gap-4 p-6">

              <div className="rounded-xl border border-white/10 bg-black/20 p-5">

                <p className="text-xs text-white/35">
                  Entradas
                </p>

                <p className="mt-2 text-xl font-semibold">
                  {formatMoney(
                    financialIncome
                  )}
                </p>

              </div>

              <div className="rounded-xl border border-white/10 bg-black/20 p-5">

                <p className="text-xs text-white/35">
                  Saídas
                </p>

                <p className="mt-2 text-xl font-semibold">
                  {formatMoney(
                    financialExpenses
                  )}
                </p>

              </div>

              <div className="col-span-2 rounded-xl border border-white/10 bg-black/20 p-5">

                <p className="text-xs text-white/35">
                  Saldo
                </p>

                <p className="mt-2 text-2xl font-semibold">
                  {formatMoney(
                    financialBalance
                  )}
                </p>

              </div>

            </div>

          </section>

        </div>

        {/* ORIGEM DOS LEADS */}

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <div>
              <h2 className="font-semibold">Origem dos leads</h2>
              <p className="mt-1 text-xs text-white/35">
                De onde vieram os clientes cadastrados
              </p>
            </div>
            <a
              href="/clientes"
              className="text-xs text-white/40 transition hover:text-white"
            >
              Gerenciar clientes →
            </a>
          </div>

          {leadSourcePerformance.length === 0 ? (
            <div className="p-8 text-center text-sm text-white/35">
              Nenhuma origem cadastrada ainda.
            </div>
          ) : (
            <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {leadSourcePerformance.map((item) => (
                <div
                  key={item.source}
                  className="rounded-xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="truncate text-sm font-medium">{item.source}</p>
                  <p className="mt-2 text-2xl font-semibold">{formatNumber(item.count)}</p>
                  <p className="mt-1 text-xs text-white/30">cliente(s)</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* MARKETING + METAS */}

        <div className="mt-6 grid gap-6 xl:grid-cols-2">

          {/* MARKETING */}

          <section className="rounded-2xl border border-white/10 bg-white/[0.03]">

            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">

              <div>

                <h2 className="font-semibold">
                  Marketing
                </h2>

                <p className="mt-1 text-xs text-white/35">
                  Desempenho das campanhas
                </p>

              </div>

              <a
                href="/marketing"
                className="text-xs text-white/40 transition hover:text-white"
              >
                Abrir →
              </a>

            </div>

            <div className="grid grid-cols-2 gap-4 p-6">

              <div>

                <p className="text-xs text-white/35">
                  Investimento
                </p>

                <p className="mt-1 text-lg font-semibold">
                  {formatMoney(
                    marketingBudget
                  )}
                </p>

              </div>

              <div>

                <p className="text-xs text-white/35">
                  Receita
                </p>

                <p className="mt-1 text-lg font-semibold">
                  {formatMoney(
                    marketingRevenue
                  )}
                </p>

              </div>

              <div>

                <p className="text-xs text-white/35">
                  Leads
                </p>

                <p className="mt-1 text-lg font-semibold">
                  {formatNumber(
                    marketingLeads
                  )}
                </p>

              </div>

              <div>

                <p className="text-xs text-white/35">
                  Vendas
                </p>

                <p className="mt-1 text-lg font-semibold">
                  {formatNumber(
                    marketingSales
                  )}
                </p>

              </div>

            </div>

          </section>

          {/* METAS */}

          <section className="rounded-2xl border border-white/10 bg-white/[0.03]">

            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">

              <div>

                <h2 className="font-semibold">
                  Metas
                </h2>

                <p className="mt-1 text-xs text-white/35">
                  Acompanhamento das metas ativas
                </p>

              </div>

              <a
                href="/metas"
                className="text-xs text-white/40 transition hover:text-white"
              >
                Abrir →
              </a>

            </div>

            {activeGoals.length === 0 ? (
              <div className="p-8 text-center text-sm text-white/35">
                Nenhuma meta ativa.
              </div>
            ) : (
              <div className="divide-y divide-white/10">

                {activeGoals
                  .slice(0, 4)
                  .map((goal) => {

                    const progress =
                      Number(
                        goal.target_value
                      ) > 0
                        ? Math.min(
                            (Number(
                              goal.calculatedValue
                            ) /
                              Number(
                                goal.target_value
                              )) *
                              100,
                            100
                          )
                        : 0;

                    return (
                      <div
                        key={goal.id}
                        className="px-6 py-4"
                      >

                        <div className="flex items-center justify-between">

                          <p className="text-sm">
                            {goal.name}
                          </p>

                          <p className="text-xs text-white/40">
                            {progress.toFixed(0)}%
                          </p>

                        </div>

                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">

                          <div
                            className="h-full rounded-full bg-white"
                            style={{
                              width: `${progress}%`,
                            }}
                          />

                        </div>

                        <div className="mt-2 flex justify-between text-xs text-white/30">

                          <span>
                            {formatMoney(
                              Number(
                                goal.calculatedValue
                              )
                            )}
                          </span>

                          <span>
                            {formatMoney(
                              Number(
                                goal.target_value
                              )
                            )}
                          </span>

                        </div>

                      </div>
                    );
                  })}

              </div>
            )}

          </section>

        </div>

      </div>
    </main>
  );
}
