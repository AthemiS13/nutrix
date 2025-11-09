'use client';

import React from 'react';
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface CalorieChartProps {
  data: Array<{
    date: string;
    calories: number;
    goal: number;
  }>;
}

export const CalorieChart: React.FC<CalorieChartProps> = ({ data }) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-neutral-800 border border-neutral-700 px-3 py-2 rounded shadow-lg">
          <p className="text-neutral-50 text-sm font-semibold">{payload[0].payload.date}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(0)} kcal
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full min-h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#404040" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#a3a3a3"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#a3a3a3' }}
          />
          <YAxis
            stroke="#a3a3a3"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#a3a3a3' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#525252' }} />
          <Legend
            wrapperStyle={{ color: '#f5f5f5', fontSize: '12px', paddingTop: '16px' }}
          />
          <Line
            type="natural"
            dataKey="calories"
            stroke="#a3a3a3"
            strokeWidth={2}
            dot={false}
            name="Consumed"
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="goal"
            stroke="#737373"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="Goal"
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
