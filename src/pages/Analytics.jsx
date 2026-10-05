import { useState, useEffect, useMemo, useCallback } from "react"
import axios from "axios"
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from "recharts"
import {
    Activity, HardDrive, FileText, TrendingUp, RefreshCw,
    ShieldCheck, CheckCircle2, PieChart as PieIcon, BarChart2
} from "lucide-react"
import { API_URL } from "../config"

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#38bdf8", "#8b5cf6", "#ec4899"]

// Custom dark tooltip component for Recharts
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-analytics-tooltip">
                <span className="tooltip-label">{label || payload[0].name}</span>
                <span className="tooltip-value">{payload[0].value} {payload[0].unit || 'items'}</span>
            </div>
        )
    }
    return null
}

export default function Analytics() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(null)

    const fetchAnalytics = useCallback(async (signal) => {
        try {
            const { data } = await axios.get(`${API_URL}/analytics`, { signal })
            setData({
                total_projects: data.total_projects || 0,
                storage_usage: data.storage_usage || { formatted: "0 MB", total_files: 0 },
                status_distribution: data.status_distribution || [],
                timeline: data.timeline || [],
                subjects: data.subjects || []
            })
            setError(null)
        } catch (err) {
            if (err.name !== "CanceledError") {
                setError("Unable to retrieve repository telemetry")
            }
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        const controller = new AbortController()
        fetchAnalytics(controller.signal)
        return () => controller.abort()
    }, [fetchAnalytics])

    const handleManualRefresh = () => {
        setRefreshing(true)
        fetchAnalytics()
    }

    const archivedCount = useMemo(
        () => data?.status_distribution.find(d => d.name === "Archived" || d.name === "archived")?.value || 0,
        [data]
    )

    const weeklyActivity = useMemo(
        () => data?.timeline.reduce((acc, curr) => acc + curr.count, 0) || 0,
        [data]
    )

    if (loading) {
        return (
            <div className="analytics-loading-screen">
                <div className="spinner"></div>
                <p>Aggregating repository telemetry & storage metrics...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="analytics-error-banner">
                <p>{error}</p>
                <button className="btn-dash-primary btn-sm" onClick={handleManualRefresh}>
                    Retry Connection
                </button>
            </div>
        )
    }

    if (!data) return null

    return (
        <div className="analytics-container">
            {/* Top Telemetry Header */}
            <div className="analytics-hero-banner">
                <div className="hero-banner-left">
                    <div className="hero-status-pill">
                        <ShieldCheck size={14} className="icon-emerald" />
                        <span>Real-Time Local Repository Telemetry</span>
                    </div>
                    <h1>Archival Intelligence & Metrics</h1>
                    <p>Live health metrics, storage footprints, ingestion throughput, and metadata subject analytics.</p>
                </div>

                <div className="hero-banner-right">
                    <button
                        type="button"
                        className={`btn-dash-secondary ${refreshing ? 'disabled' : ''}`}
                        onClick={handleManualRefresh}
                        disabled={refreshing}
                        title="Refresh live telemetry data"
                    >
                        <RefreshCw size={15} className={refreshing ? 'spin-anim' : ''} />
                        <span>{refreshing ? 'Updating...' : 'Refresh Metrics'}</span>
                    </button>
                </div>
            </div>

            {/* 4-Card Executive KPI Deck */}
            <div className="analytics-kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Total Repository Items</span>
                        <div className="kpi-icon-box primary"><FileText size={18} /></div>
                    </div>
                    <div className="kpi-number">{data.total_projects}</div>
                    <div className="kpi-footer">Across all pipeline stages</div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Sovereign Storage Footprint</span>
                        <div className="kpi-icon-box info"><HardDrive size={18} /></div>
                    </div>
                    <div className="kpi-number">{data.storage_usage.formatted}</div>
                    <div className="kpi-footer text-info">{data.storage_usage.total_files} active files stored</div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Archived & Published</span>
                        <div className="kpi-icon-box success"><CheckCircle2 size={18} /></div>
                    </div>
                    <div className="kpi-number">{archivedCount}</div>
                    <div className="kpi-footer text-success">BagIt & Dublin Core verified</div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-header">
                        <span className="kpi-title">Weekly Ingest Velocity</span>
                        <div className="kpi-icon-box warning"><Activity size={18} /></div>
                    </div>
                    <div className="kpi-number">{weeklyActivity}</div>
                    <div className="kpi-footer text-warning">New documents processed</div>
                </div>
            </div>

            {/* Visual Charts Deck */}
            <div className="analytics-charts-deck">
                {/* 1. Ingest Velocity Timeline */}
                <div className="analytics-chart-panel span-2">
                    <div className="chart-panel-header">
                        <div className="chart-title-wrap">
                            <TrendingUp size={18} className="text-primary" />
                            <div>
                                <h3>Weekly Ingest & OCR Velocity</h3>
                                <p>Daily document throughput over the active 7-day cycle</p>
                            </div>
                        </div>
                    </div>

                    <div className="chart-body-box">
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={data.timeline} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} />
                                <YAxis allowDecimals={false} stroke="#64748b" fontSize={12} tickLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#3b82f6"
                                    strokeWidth={2.5}
                                    fill="url(#areaGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Pipeline Status Distribution */}
                <div className="analytics-chart-panel">
                    <div className="chart-panel-header">
                        <div className="chart-title-wrap">
                            <PieIcon size={18} className="text-accent" />
                            <div>
                                <h3>Pipeline Stage Breakdown</h3>
                                <p>Current document distribution</p>
                            </div>
                        </div>
                    </div>

                    <div className="chart-body-box pie-box">
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={data.status_distribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={78}
                                    paddingAngle={4}
                                    dataKey="value"
                                >
                                    {data.status_distribution.map((_, i) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="rgba(0,0,0,0.4)" />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Custom Legend */}
                        <div className="custom-pie-legend">
                            {data.status_distribution.map((entry, idx) => (
                                <div key={idx} className="legend-row">
                                    <span className="legend-dot" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></span>
                                    <span className="legend-name">{entry.name}</span>
                                    <span className="legend-val">{entry.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. Top Subject Classifications */}
                {data.subjects && data.subjects.length > 0 && (
                    <div className="analytics-chart-panel span-full">
                        <div className="chart-panel-header">
                            <div className="chart-title-wrap">
                                <BarChart2 size={18} className="text-emerald" />
                                <div>
                                    <h3>Dublin Core Subject Classifications</h3>
                                    <p>Most frequent thematic tags across preserved archival records</p>
                                </div>
                            </div>
                        </div>

                        <div className="chart-body-box">
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={data.subjects} layout="vertical" margin={{ left: 30, right: 30, top: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.06)" />
                                    <XAxis type="number" allowDecimals={false} stroke="#64748b" fontSize={12} tickLine={false} />
                                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} width={130} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                                        {data.subjects.map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
