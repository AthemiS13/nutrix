'use client';

import React from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

interface MacroChartProps {
  protein: number;
  fats: number;
  carbs: number;
}

export const MacroChart: React.FC<MacroChartProps> = ({ protein, fats, carbs }) => {
  // Calculate calories from macros (protein: 4 cal/g, fat: 9 cal/g, carbs: 4 cal/g)
  const proteinCals = protein * 4;
  const fatsCals = fats * 9;
  const carbsCals = carbs * 4;
  const totalCals = proteinCals + fatsCals + carbsCals;

  const data = [
    { name: 'Protein', value: proteinCals, percentage: totalCals > 0 ? ((proteinCals / totalCals) * 100).toFixed(1) : 0 },
    { name: 'Fats', value: fatsCals, percentage: totalCals > 0 ? ((fatsCals / totalCals) * 100).toFixed(1) : 0 },
    { name: 'Carbs', value: carbsCals, percentage: totalCals > 0 ? ((carbsCals / totalCals) * 100).toFixed(1) : 0 },
  ];

  const COLORS = ['#d4d4d8', '#a1a1a1', '#737373'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-neutral-800 border border-neutral-700 px-3 py-2 rounded shadow-lg">
          <p className="text-neutral-50 text-sm font-semibold">{payload[0].name}</p>
          <p className="text-neutral-400 text-sm">
            {payload[0].value.toFixed(0)} kcal ({payload[0].payload.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full min-h-[250px] flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            label={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value: string, entry: any) => {
              return `${value} (${entry.payload.percentage}%)`;
            }}
            wrapperStyle={{ color: '#f5f5f5', fontSize: '12px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
