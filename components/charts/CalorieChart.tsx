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
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { getColorFromPct, MET_GOAL_COLOR } from '@/lib/color-utils';

interface CalorieChartProps {
  data: Array<{
    date: string;
    calories: number;
    goal: number;
    protein?: number;
  }>;
  /** metric can be 'calories' or 'protein' */
  metric?: 'calories' | 'protein';
  /** optional numeric goal to draw as a reference line */
  goal?: number;
}

export const CalorieChart: React.FC<CalorieChartProps> = ({ data, metric = 'calories', goal }) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-neutral-800 border border-neutral-700 px-3 py-2 rounded shadow-lg">
          <p className="text-neutral-50 text-sm font-semibold">{payload[0].payload.date}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.dataKey === 'protein' ? `${entry.value.toFixed(1)} g` : `${entry.value.toFixed(0)} kcal`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const legendPayload = [
    { value: metric === 'calories' ? 'Calories' : 'Protein (g)', type: 'line', color: metric === 'calories' ? '#00798c' : '#d1495b', id: metric },
  ];

  const renderLegend = (props: any) => {
    const { payload } = props || {};
    if (!payload || !payload.length) return null;
    // filter out 'Goal' series if present
    const items = payload.filter((p: any) => p && p.value && p.value !== 'Goal');
    return (
      <div style={{ display: 'flex', gap: 12, paddingTop: 12, paddingBottom: 12 }}>
        {items.map((item: any, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f5f5f5', fontSize: 12 }}>
            <span style={{ width: 10, height: 10, background: item.color, borderRadius: 4, display: 'inline-block' }} />
            <span>{item.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full h-full min-h-[250px] flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
  {/* minimize left margin and set explicit Y-axis width */}
  <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
            width={50}
            // Keep the left axis non-negative so curves don't render below 0
            domain={[0, 'dataMax']}
            tickFormatter={(v: any) => {
              // Ensure numeric ticks render without weird padding or scientific notation
              const n = Number(v) || 0;
              // For protein (usually small) show integer; for calories show integer with thousands separator
              return metric === 'protein' ? n.toFixed(0) : n.toLocaleString();
            }}
          />
          {/* single-metric chart uses only the primary left axis */}
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#525252' }} />
          <Legend content={renderLegend} />

          <Line
            // monotone interpolation avoids overshoot/undershoot which can make lines dip below axis
            type="monotone"
            dataKey={metric}
            stroke={metric === 'calories' ? '#00798c' : '#d1495b'}
            strokeWidth={2}
            dot={false}
            name={metric === 'calories' ? 'Calories' : 'Protein (g)'}
            isAnimationActive={false}
          />

          {typeof goal === 'number' && (
            <ReferenceLine
              y={goal}
              stroke="#f87171"
              strokeDasharray="4 4"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
