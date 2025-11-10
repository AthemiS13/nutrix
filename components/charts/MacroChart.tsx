'use client';

import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

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

  const COLORS = ['#7ea6d8', '#b39f7a', '#8aa26f'];

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

  const [selected, setSelected] = useState<number | null>(null);

  const handleClick = (data: any, index: number) => {
    // toggle selection on tap/click
    setSelected((prev) => (prev === index ? null : index));
  };

  return (
    <div className="w-full h-full min-h-[250px] flex items-center justify-center relative">
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
            // avoid default active outline by not using activeShape/stroke
            onClick={handleClick}
            isAnimationActive={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} stroke="none" />
            ))}
          </Pie>
          {/* keep tooltip for hover on desktop, but hide legend; primary reveal is on tap */}
          <Tooltip content={<CustomTooltip />} cursor={false} />
        </PieChart>
      </ResponsiveContainer>

      {/* Center overlay to reveal selected slice info on tap */}
      {selected !== null && data[selected] && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-neutral-900/90 border border-neutral-800 rounded-lg p-3 text-center">
          <p className="text-neutral-50 font-semibold">{data[selected].name}</p>
          <p className="text-neutral-400 text-sm">{data[selected].value.toFixed(0)} kcal • {data[selected].percentage}%</p>
        </div>
      )}
    </div>
  );
};
