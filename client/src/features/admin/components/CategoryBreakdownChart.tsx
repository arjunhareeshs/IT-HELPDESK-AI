import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { useCategoryBreakdown } from '../../../hooks/useDashboardStats';
import { Spinner } from '../../../components/ui/Spinner';
import { ChevronRight, ArrowLeft, Layers, HelpCircle } from 'lucide-react';
import { CategoryBreakdownItem } from '../../../types/api';

interface CategoryBreakdownChartProps {
  onSelectCategory?: (category: string, subcategory?: string) => void;
  selectedCategory?: string;
  selectedSubcategory?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Network: '#EB4D28',
  Hardware: '#A34E59',
  Software: '#774C60',
  'IT General Support': '#1B2228',
};

export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  onSelectCategory,
  selectedCategory: _selectedCategory,
  selectedSubcategory: _selectedSubcategory,
}) => {
  const { data: categories, isLoading } = useCategoryBreakdown();
  const [activeCategory, setActiveCategory] = useState<CategoryBreakdownItem | null>(null);

  const handleBarClick = (entry: any) => {
    if (!activeCategory) {
      // Find category object
      const cat = categories?.find((c) => c.category === entry.category);
      if (cat) {
        setActiveCategory(cat);
        if (onSelectCategory) {
          onSelectCategory(cat.category);
        }
      }
    } else {
      // In subcategory view, click subcategory
      if (onSelectCategory) {
        onSelectCategory(activeCategory.category, entry.name);
      }
    }
  };

  const currentData: Array<{
    name: string;
    category: string;
    count: number;
    parent?: string;
    percentage?: number;
  }> = activeCategory
    ? activeCategory.subcategories.map((s) => ({
        name: s.name,
        category: s.name,
        count: s.count,
        parent: activeCategory.category,
      }))
    : (categories || []).map((c) => ({
        name: c.category,
        category: c.category,
        count: c.count,
        percentage: c.percentage,
      }));

  return (
    <div className="panel" style={{ padding: '20px 24px', height: '100%' }}>
      {/* Title & Drill-down Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)', margin: 0 }}>
              Graph 2 · Category & Subcategory Volume
            </h2>
            <div
              title="Issue Analysis: Sort by ticket count. Click a category to drill down into subcategories."
              style={{ cursor: 'help', color: 'var(--text-muted)', display: 'flex' }}
            >
              <HelpCircle size={15} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            <span
              onClick={() => setActiveCategory(null)}
              style={{
                cursor: activeCategory ? 'pointer' : 'default',
                color: activeCategory ? 'var(--color-rose)' : 'inherit',
                fontWeight: activeCategory ? 600 : 400,
              }}
            >
              All Categories
            </span>
            {activeCategory && (
              <>
                <ChevronRight size={14} />
                <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{activeCategory.category} Subcategories</span>
              </>
            )}
          </div>
        </div>

        {activeCategory && (
          <button
            onClick={() => {
              setActiveCategory(null);
              if (onSelectCategory) onSelectCategory('all');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              fontSize: '12px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface-muted)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={13} /> Back to Categories
          </button>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '220px' }}>
          <Spinner size={28} />
        </div>
      ) : (
        <div style={{ width: '100%', height: '220px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={currentData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
            >
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey={activeCategory ? 'name' : 'category'}
                tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={110}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div
                        style={{
                          background: '#FFFFFF',
                          padding: '8px 12px',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--color-ink)', marginBottom: '4px' }}>
                          {activeCategory ? d.name : d.category}
                        </div>
                        <div style={{ color: 'var(--color-rose)' }}>
                          Ticket Count: <strong>{d.count}</strong>
                        </div>
                        {!activeCategory && d.percentage && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                            {d.percentage}% of all incoming issues
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', borderTop: '1px solid #E2E8F0', paddingTop: '4px' }}>
                          {activeCategory ? 'Click to filter table' : 'Click bar to drill down'}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="count"
                radius={[0, 4, 4, 0]}
                onClick={handleBarClick}
                cursor="pointer"
              >
                {currentData.map((entry: any, index: number) => {
                  const color = activeCategory
                    ? CATEGORY_COLORS[activeCategory.category] || 'var(--color-rose)'
                    : CATEGORY_COLORS[entry.category] || 'var(--color-rose)';
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Layers size={13} />
        <span>{activeCategory ? 'Showing specific subcategories. Click any row to filter table.' : 'Click any category bar to inspect root cause subcategories.'}</span>
      </div>
    </div>
  );
};
