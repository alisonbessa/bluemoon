"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { UnreadMessagesBell } from "@/shared/UnreadMessagesBell";
import useSWR from "swr";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DailyStats {
  date: string;
  users: number;
  waitlist: number;
}

interface PlanStats {
  name: string;
  count: number;
}

export default function SuperAdminDashboard() {
  const { data: dailyStats } = useSWR<{ data: DailyStats[] }>(
    "/api/super-admin/stats/daily"
  );
  const { data: planStats } = useSWR<{ data: PlanStats[] }>(
    "/api/super-admin/stats/plans"
  );

  // Calculate total users for percentage
  const totalUsers = planStats?.data.reduce((acc, curr) => acc + curr.count, 0) || 0;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Painel Administrativo</h1>
        <UnreadMessagesBell />
      </div>

      <div className="grid gap-8">
        {/* Daily Stats Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Crescimento de Usuários (Últimos 30 Dias)</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyStats?.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date: string) =>
                    format(parseISO(date), "dd MMM", { locale: ptBR })
                  }
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(date: string) =>
                    format(parseISO(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#8884d8"
                  name="Novos Usuários"
                />
                <Line
                  type="monotone"
                  dataKey="waitlist"
                  stroke="#82ca9d"
                  name="Lista de Espera"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Plan Distribution Cards */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Distribuição de Usuários por Plano</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {planStats?.data.map((plan) => (
              <Card key={plan.name} className={plan.name === "Sem Plano" || plan.name === "No Plan" ? "border-dashed" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    {plan.name === "No Plan" ? "Sem Plano" : plan.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-1">
                    <div className="text-3xl font-bold">{plan.count}</div>
                    <div className="text-sm text-muted-foreground">
                      {((plan.count / totalUsers) * 100).toFixed(1)}% dos usuários
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
