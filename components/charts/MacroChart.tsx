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

  // Neutral grayscale palette with good contrast: light gray, medium gray, dark gray
  const COLORS = ['#e5e5e5', '#a3a3a3', '#525252'];

  // static, no tooltip or interaction per new UX

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
            isAnimationActive={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} stroke="none" />
            ))}
          </Pie>
          {/* Static pie: no tooltip or interactive legend per request */}
        </PieChart>
      </ResponsiveContainer>
      {/* No overlay — figures are shown below the chart in matching colors */}
    </div>
  );
};
