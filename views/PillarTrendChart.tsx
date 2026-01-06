import React, { useMemo } from 'react';
import { ChartDataPoint } from '../services/stats';

interface PillarTrendChartProps {
  data: ChartDataPoint[];
}

const PillarTrendChart: React.FC<PillarTrendChartProps> = ({ data }) => {
  // SVG coordinates: 0 to 100 for both X and Y
  const width = 100;
  const height = 40; // Shorter aspect ratio for a sparkline look

  const { pathData, areaData, points, minWeight, maxWeight } = useMemo(() => {
    if (data.length < 2) return { pathData: '', areaData: '', points: [], minWeight: 0, maxWeight: 0 };

    const minDate = Math.min(...data.map(d => d.date));
    const maxDate = Math.max(...data.map(d => d.date));
    const minWeight = Math.min(...data.map(d => d.weight));
    const maxWeight = Math.max(...data.map(d => d.weight));

    const dateRange = maxDate - minDate || 1;
    const weightRange = maxWeight - minWeight || 1;

    // Add some padding to weight range so line doesn't hit top/bottom
    const yPadding = weightRange * 0.2;
    const paddedMinWeight = minWeight - yPadding;
    const paddedMaxWeight = maxWeight + yPadding;
    const paddedWeightRange = paddedMaxWeight - paddedMinWeight;

    const scaledPoints = data.map(d => ({
      x: ((d.date - minDate) / dateRange) * width,
      y: height - ((d.weight - paddedMinWeight) / paddedWeightRange) * height,
      isPR: d.isPR,
      weight: d.weight
    }));

    // Create SVG Path Data (L commands)
    const path = scaledPoints.reduce((acc, p, i) => 
      i === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`, ''
    );

    // Create Area Data (closes the path at the bottom)
    const area = `${path} L ${width},${height} L 0,${height} Z`;

    return { pathData: path, areaData: area, points: scaledPoints, minWeight, maxWeight };
  }, [data]);

  if (data.length < 2) {
    return (
      <div className="h-24 flex items-center justify-center border border-dashed border-gray-800 rounded-2xl bg-gray-950/20">
        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
          Needs more history to chart
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[2.5/1] mt-2 mb-6">
      {/* Max Weight Label */}
      <div className="absolute -top-4 right-0 flex items-center gap-1.5">
        <span className="text-[10px] font-black text-white bg-gray-800 px-2 py-0.5 rounded border border-gray-700 shadow-sm">
          {maxWeight} <span className="text-[8px] text-gray-500 uppercase">lb</span>
        </span>
      </div>

      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(37, 99, 235)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="rgb(37, 99, 235)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area Fill */}
        <path d={areaData} fill="url(#chartGradient)" />

        {/* Trend Line */}
        <path 
          d={pathData} 
          fill="none" 
          stroke="rgb(37, 99, 235)" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />

        {/* Data Points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p.isPR ? 1.5 : 0.8}
            className={p.isPR ? "fill-yellow-500" : "fill-blue-500"}
          />
        ))}
      </svg>

      {/* Min Weight Label */}
      <div className="absolute -bottom-4 left-0 flex items-center gap-1.5">
        <span className="text-[10px] font-black text-gray-400 bg-gray-950/50 px-2 py-0.5 rounded border border-gray-800">
          {minWeight} <span className="text-[8px] text-gray-600 uppercase">lb</span>
        </span>
      </div>
    </div>
  );
};

export default PillarTrendChart;
