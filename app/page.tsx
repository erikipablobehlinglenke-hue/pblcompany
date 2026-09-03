const menuItems = [
  { name: "Dashboard", icon: "⌂" },
  { name: "Vendas", icon: "↗" },
  { name: "Estoque", icon: "▦" },
  { name: "Compras", icon: "↓" },
  { name: "Clientes", icon: "○" },
  { name: "Financeiro", icon: "R$" },
  { name: "Marketing", icon: "◈" },
  { name: "Metas", icon: "◎" },
];

const stats = [
  { label: "Caixa atual", value: "R$ 2.646,00", change: "+12,4%" },
  { label: "Faturamento", value: "R$ 4.940,00", change: "+8,7%" },
  { label: "Lucro", value: "R$ 2.140,00", change: "+15,2%" },
  { label: "Vendas", value: "37", change: "+6,1%" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="flex min-h-screen">

        <aside className="hidden w-64 border-r border-white/10 bg-[#0b0b0b] p-5 md:block">
          <div className="mb-10 px-3">
            <div className="text-xl font-semibold tracking-[0.18em]">
              PBL CO.
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.25em] text-white/40">
              Management
            </div>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item, index) => (
              <div
                key={item.name}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm transition ${
                  index === 0
                    ? "bg-white text-black"
                    : "text-white/55 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center text-xs">
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </div>
            ))}
          </nav>

          <div className="mt-10 border-t border-white/10 pt-5">
            <div className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm text-white/55 hover:bg-white/5 hover:text-white">
              <span>⚙</span>
              <span>Configurações</span>
            </div>
          </div>
        </aside>

        <section className="flex-1">

          <header className="flex h-20 items-center justify-between border-b border-white/10 px-6 md:px-10">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/35">
                Visão geral
              </p>
              <h1 className="mt-1 text-xl font-medium">
                Dashboard
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm">PBL Company</p>
                <p className="text-xs text-white/35">
                  Gestão empresarial
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-xs">
                EP
              </div>
            </div>
          </header>

          <div className="p-6 md:p-10">

            <div className="mb-8">
              <p className="text-sm text-white/40">
                Visão geral da operação
              </p>

              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Dashboard
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-white/10 bg-white/[0.025] p-5"
                >
                  <p className="text-sm text-white/40">
                    {stat.label}
                  </p>

                  <div className="mt-4 flex items-end justify-between">
                    <p className="text-2xl font-semibold">
                      {stat.value}
                    </p>

                    <span className="text-xs text-white/50">
                      {stat.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">

              <div className="rounded-xl border border-white/10 bg-white/[0.025] p-6 xl:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/40">
                      Desempenho
                    </p>

                    <h3 className="mt-1 text-lg font-medium">
                      Faturamento
                    </h3>
                  </div>

                  <span className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/50">
                    Este mês
                  </span>
                </div>

                <div className="mt-8 flex h-52 items-end gap-3">
                  {[35, 52, 42, 68, 55, 73, 62, 82, 70, 91, 78, 100].map(
                    (height, index) => (
                      <div
                        key={index}
                        className="flex h-full flex-1 items-end"
                      >
                        <div
                          className="w-full rounded-t-md bg-white/80"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                    )
                  )}
                </div>

                <div className="mt-4 flex justify-between text-[10px] uppercase tracking-wider text-white/25">
                  {[
                    "Jan",
                    "Fev",
                    "Mar",
                    "Abr",
                    "Mai",
                    "Jun",
                    "Jul",
                    "Ago",
                    "Set",
                    "Out",
                    "Nov",
                    "Dez",
                  ].map((month) => (
                    <span key={month}>{month}</span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.025] p-6">
                <p className="text-sm text-white/40">
                  Meta mensal
                </p>

                <h3 className="mt-1 text-lg font-medium">
                  Faturamento
                </h3>

                <div className="mt-10 text-center">
                  <div className="text-4xl font-semibold">
                    74,5%
                  </div>

                  <p className="mt-2 text-sm text-white/35">
                    R$ 7.450 de R$ 10.000
                  </p>

                  <div className="mt-8 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-white"
                      style={{ width: "74.5%" }}
                    />
                  </div>

                  <p className="mt-4 text-xs text-white/30">
                    R$ 2.550 restantes
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">

              <div className="rounded-xl border border-white/10 bg-white/[0.025] p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">
                    Estoque
                  </h3>

                  <span className="text-xs text-white/30">
                    Visão geral
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-2xl font-semibold">48</p>
                    <p className="mt-1 text-xs text-white/35">
                      Produtos
                    </p>
                  </div>

                  <div>
                    <p className="text-2xl font-semibold">
                      R$ 8,2k
                    </p>
                    <p className="mt-1 text-xs text-white/35">
                      Em estoque
                    </p>
                  </div>

                  <div>
                    <p className="text-2xl font-semibold">4</p>
                    <p className="mt-1 text-xs text-white/35">
                      Estoque baixo
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.025] p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">
                    Atividade recente
                  </h3>

                  <span className="text-xs text-white/30">
                    Últimas movimentações
                  </span>
                </div>

                <div className="mt-5 space-y-4">

                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div>
                      <p className="text-sm">Nova venda</p>
                      <p className="text-xs text-white/30">
                        Pedido #0037
                      </p>
                    </div>

                    <span className="text-sm">
                      + R$ 280
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div>
                      <p className="text-sm">
                        Compra recebida
                      </p>
                      <p className="text-xs text-white/30">
                        Fornecedor #08
                      </p>
                    </div>

                    <span className="text-sm text-white/50">
                      + 30 un.
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">
                        Novo cliente
                      </p>
                      <p className="text-xs text-white/30">
                        Cadastro realizado
                      </p>
                    </div>

                    <span className="text-sm text-white/50">
                      Hoje
                    </span>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </section>
      </div>
    </main>
  );
}