import React from 'react';
import { usePerformanceData } from '../../hooks/usePerformanceData';
import { SkeletonLoader } from '../SkeletonLoader';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Activity, TrendingUp, TrendingDown, AlertCircle, 
  CheckCircle, Clock, Zap, Database, Brain, GitBranch,
  RefreshCw, Trash2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  status?: 'good' | 'warning' | 'critical';
  icon?: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  description, 
  trend = 'neutral', 
  status = 'good',
  icon 
}) => {
  const trendIcon = trend === 'up' ? <TrendingUp className="w-4 h-4" /> : 
                    trend === 'down' ? <TrendingDown className="w-4 h-4" /> : null;
  
  const statusColors = {
    good: 'text-green-500 border-green-500/30 bg-green-500/10',
    warning: 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10',
    critical: 'text-red-500 border-red-500/30 bg-red-500/10'
  };

  return (
    <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 rounded-xl p-4 border border-white/20 dark:border-white/10">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon && <div className="theme-text-secondary">{icon}</div>}
          <h3 className="text-sm font-medium theme-text-secondary">{title}</h3>
        </div>
        {trendIcon && <div className={`${statusColors[status]}`}>{trendIcon}</div>}
      </div>
      <div className={`text-2xl font-bold ${statusColors[status]}`}>
        {value}
      </div>
      {description && (
        <p className="text-xs theme-text-secondary mt-1">{description}</p>
      )}
    </div>
  );
};

export const PerformanceDashboard: React.FC = () => {
  const { data, loading, error, refresh, clearStats } = usePerformanceData();

  if (loading) {
    return (
      <div className="h-full p-6">
        <SkeletonLoader count={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold theme-text-primary mb-2">Error Loading Performance Data</h3>
          <p className="theme-text-secondary mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 rounded-lg bg-accent-primary/20 hover:bg-accent-primary/30 theme-text-accent transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data || !data.enabled) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center backdrop-blur-xl bg-white/10 dark:bg-black/10 rounded-2xl p-8 border border-white/20 dark:border-white/10">
          <Activity className="w-16 h-16 theme-text-secondary mx-auto mb-4" />
          <h2 className="text-xl font-semibold theme-text-primary mb-2">Performance Monitoring Disabled</h2>
          <p className="theme-text-secondary">
            {data?.message || 'Enable performance monitoring to see metrics'}
          </p>
        </div>
      </div>
    );
  }

  // Calculate performance score
  const getPerformanceScore = () => {
    if (!data.summary) return { score: 0, status: 'unknown' as const };
    const p90Value = parseFloat(data.summary.percentiles.p90);
    if (p90Value < 500) return { score: 95, status: 'excellent' as const };
    if (p90Value < 1000) return { score: 75, status: 'good' as const };
    if (p90Value < 2000) return { score: 50, status: 'warning' as const };
    return { score: 25, status: 'critical' as const };
  };

  const performanceScore = getPerformanceScore();

  // Helper function to get friendly names
  const getCategoryName = (category: string) => {
    const names: Record<string, string> = {
      memory: 'Memory System',
      llm: 'LLM Processing',
      database: 'Database Queries',
      routing: 'Agent Routing'
    };
    return names[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getOperationName = (category: string, operation: string) => {
    const names: Record<string, Record<string, string>> = {
      memory: {
        search: 'Vector Search (Qdrant)',
        contextBuild: 'Context Assembly',
        add: 'Memory Creation (Mem0)'
      },
      llm: {
        streaming: 'Streaming Response',
        nonStreaming: 'Standard Response'
      },
      database: {
        queries: 'PostgreSQL Query'
      },
      routing: {
        selection: 'Agent Selection',
        execution: 'Agent Execution'
      }
    };
    return names[category]?.[operation] || operation.charAt(0).toUpperCase() + operation.slice(1);
  };

  // Prepare chart data
  const recentOpsData = data.recentOperations?.map((op, index) => {
    console.log('[PerformanceDashboard] Operation:', op.category, op.operation, '→', getOperationName(op.category, op.operation));
    return {
      index: index + 1,
      duration: op.duration,
      category: op.category,
      operation: op.operation,
      friendlyName: getOperationName(op.category, op.operation)
    };
  }).reverse() || [];

  const operationsByCategory = Object.entries(data.operations || {}).map(([category, ops]) => ({
    category: getCategoryName(category),
    ...Object.entries(ops).reduce((acc, [op, stats]: [string, any]) => ({
      ...acc,
      [getOperationName(category, op)]: stats.avgTime || 0
    }), {})
  }));

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold theme-text-primary">Performance Dashboard</h1>
          <p className="theme-text-secondary">Real-time system performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="p-2 rounded-lg backdrop-blur-md bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/10 theme-text-secondary hover:theme-text-primary transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={clearStats}
            className="p-2 rounded-lg backdrop-blur-md bg-red-500/20 border border-red-500/30 text-red-500 hover:bg-red-500/30 transition-colors"
            title="Clear statistics"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Performance Score */}
      <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 rounded-xl p-6 border border-white/20 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold theme-text-primary mb-1">Overall Performance</h2>
            <p className="theme-text-secondary">System health score based on response times</p>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold ${
              performanceScore.status === 'excellent' ? 'text-green-500' :
              performanceScore.status === 'good' ? 'text-blue-500' :
              performanceScore.status === 'warning' ? 'text-yellow-500' :
              'text-red-500'
            }`}>
              {performanceScore.score}%
            </div>
            <p className="text-sm theme-text-secondary capitalize">{performanceScore.status}</p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Operations"
          value={data.summary?.totalOperations || 0}
          description="In current session"
          icon={<Activity className="w-4 h-4" />}
          trend="neutral"
          status="good"
        />
        <MetricCard
          title="P50 Response Time"
          value={data.summary?.percentiles.p50 || '0ms'}
          description="Median response time"
          icon={<Clock className="w-4 h-4" />}
          trend={parseFloat(data.summary?.percentiles.p50 || '0') < 500 ? 'down' : 'up'}
          status={parseFloat(data.summary?.percentiles.p50 || '0') < 500 ? 'good' : 'warning'}
        />
        <MetricCard
          title="P90 Response Time"
          value={data.summary?.percentiles.p90 || '0ms'}
          description="90th percentile"
          icon={<Zap className="w-4 h-4" />}
          trend={parseFloat(data.summary?.percentiles.p90 || '0') < 1000 ? 'down' : 'up'}
          status={parseFloat(data.summary?.percentiles.p90 || '0') < 1000 ? 'good' : 'warning'}
        />
        <MetricCard
          title="P99 Response Time"
          value={data.summary?.percentiles.p99 || '0ms'}
          description="99th percentile"
          icon={<AlertCircle className="w-4 h-4" />}
          trend={parseFloat(data.summary?.percentiles.p99 || '0') < 2000 ? 'down' : 'up'}
          status={parseFloat(data.summary?.percentiles.p99 || '0') < 2000 ? 'good' : 'critical'}
        />
      </div>

      {/* Response Time Trend Chart */}
      {recentOpsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Response Time Trend</CardTitle>
            <CardDescription>Recent operation durations</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                duration: {
                  label: "Duration (ms)",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={recentOpsData}>
                  <defs>
                    <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="index" 
                    className="text-muted-foreground"
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis 
                    className="text-muted-foreground"
                    tick={{ fill: 'currentColor' }}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                  />
                  <Area
                    type="monotone"
                    dataKey="duration"
                    stroke="#8b5cf6"
                    fillOpacity={1}
                    fill="url(#colorDuration)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Operations by Category */}
      {operationsByCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Average Response Time by Category</CardTitle>
            <CardDescription>Performance breakdown by operation type</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                "Vector Search (Qdrant)": { label: "Vector Search", color: "hsl(var(--chart-1))" },
                "Context Assembly": { label: "Context Assembly", color: "hsl(var(--chart-2))" },
                "Memory Creation (Mem0)": { label: "Memory Creation", color: "hsl(var(--chart-3))" },
                "Streaming Response": { label: "Streaming", color: "hsl(var(--chart-4))" },
                "Standard Response": { label: "Standard", color: "hsl(var(--chart-5))" },
                "PostgreSQL Query": { label: "DB Query", color: "hsl(var(--chart-1))" },
                "Agent Selection": { label: "Agent Select", color: "hsl(var(--chart-2))" },
                "Agent Execution": { label: "Agent Exec", color: "hsl(var(--chart-3))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={operationsByCategory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="category" 
                    className="text-muted-foreground"
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis 
                    className="text-muted-foreground"
                    tick={{ fill: 'currentColor' }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {Object.keys(operationsByCategory[0] || {}).filter(key => key !== 'category').map((key, index) => (
                    <Bar 
                      key={key} 
                      dataKey={key} 
                      fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Bottlenecks */}
      {data.bottlenecks && data.bottlenecks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold theme-text-primary">Performance Bottlenecks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.bottlenecks.map((bottleneck, index) => (
              <div 
                key={index}
                className={`backdrop-blur-xl rounded-xl p-4 border ${
                  bottleneck.severity === 'high' 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : 'bg-yellow-500/10 border-yellow-500/30'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {bottleneck.type.includes('memory') && <Brain className="w-4 h-4" />}
                    {bottleneck.type.includes('llm') && <Zap className="w-4 h-4" />}
                    {bottleneck.type.includes('database') && <Database className="w-4 h-4" />}
                    {bottleneck.type.includes('routing') && <GitBranch className="w-4 h-4" />}
                    <h3 className="font-medium capitalize">
                      {bottleneck.type.replace(/-/g, ' ')}
                    </h3>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    bottleneck.severity === 'high'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }`}>
                    {bottleneck.severity}
                  </span>
                </div>
                <p className="text-2xl font-bold mb-1">{bottleneck.avgTime}</p>
                <p className="text-sm theme-text-secondary">{bottleneck.impact}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations && data.recommendations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold theme-text-primary">Optimization Recommendations</h2>
          <div className="space-y-3">
            {data.recommendations.map((rec, index) => (
              <div 
                key={index}
                className="backdrop-blur-xl bg-white/10 dark:bg-black/10 rounded-xl p-4 border border-white/20 dark:border-white/10"
              >
                <h3 className="font-medium theme-text-primary mb-2">{rec.issue}</h3>
                <ul className="space-y-1">
                  {rec.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm theme-text-secondary">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Operations Table */}
      {data.recentOperations && data.recentOperations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold theme-text-primary">Recent Operations</h2>
          <div className="backdrop-blur-xl bg-white/10 dark:bg-black/10 rounded-xl border border-white/20 dark:border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-3 text-sm font-medium theme-text-secondary">Timestamp</th>
                    <th className="text-left p-3 text-sm font-medium theme-text-secondary">System</th>
                    <th className="text-left p-3 text-sm font-medium theme-text-secondary">Function</th>
                    <th className="text-right p-3 text-sm font-medium theme-text-secondary">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOperations.slice(0, 10).map((op, index) => (
                    <tr 
                      key={index}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="p-3 text-sm theme-text-secondary">
                        {new Date(op.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-3 text-sm theme-text-primary">
                        {getCategoryName(op.category)} ({op.category})
                      </td>
                      <td className="p-3 text-sm theme-text-primary">
                        {getOperationName(op.category, op.operation)} ({op.operation})
                      </td>
                      <td className={`p-3 text-sm text-right font-mono ${
                        op.duration < 100 ? 'text-green-500' :
                        op.duration < 500 ? 'text-yellow-500' :
                        'text-red-500'
                      }`}>
                        {op.duration.toFixed(0)}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};