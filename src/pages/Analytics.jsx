import React, { useState, useEffect, useMemo, useCallback } from "react"
import axios from "axios"
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from "recharts"
import {
    Activity, HardDrive, FileText, Layers, TrendingUp
} from "lucide-react"
import { API_URL } from "../config"
import "./Analytics.css"
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]

export default function Analytics() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
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
                setError("Failed to load analytics data")
            }
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        const controller = new AbortController()
        fetchAnalytics(controller.signal)
        return () => controller.abort()
    }, [fetchAnalytics])

    const archivedCount = useMemo(
        () => data?.status_distribution.find(d => d.name === "Archived")?.value || 0,
        [data]
    )

    const weeklyActivity = useMemo(
        () => data?.timeline.reduce((acc, curr) => acc + curr.count, 0) || 0,
        [data]
    )

    if (loading) return <div className="p-xl text-center">Loading analytics…</div>
    if (error) return <div className="p-xl text-center text-error">{error}</div>
    if (!data) return null

    return (
        <div className="analytics-page">
            <div className="analytics-header">
                <h1><TrendingUp /> Analytics & Statistics</h1>
                <p>Overview of your digital archive's growth and health.</p>
            </div>

            {/* KPI GRID */}
            <div className="analytics-grid">
                <StatCard icon={<FileText />} title="Total Projects" value={data.total_projects} footer="Across all stages" />
                <StatCard
                    icon={<HardDrive />}
                    title="Storage Used"
                    value={data.storage_usage.formatted}
                    footer={`${data.storage_usage.total_files} files stored`}
                />
                <StatCard
                    icon={<Layers />}
                    title="Archived"
                    value={archivedCount}
                    footer="Completed documents"
                />
                <StatCard
                    icon={<Activity />}
                    title="Activity"
                    value={weeklyActivity}
                    footer="New files this week"
                />
            </div>

            {/* CHARTS */}
            <div className="charts-container">
                {/* Weekly Activity */}
                <ChartCard title="Weekly Activity">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.timeline}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="day" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke="var(--color-primary)"
                                fill="var(--color-primary)"
                                fillOpacity={0.2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Status Distribution */}
                <ChartCard title="Project Status">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data.status_distribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={85}
                                dataKey="value"
                            >
                                {data.status_distribution.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* Subject Distribution */}
                <ChartCard title="Top Subjects" wide>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.subjects} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                            <XAxis type="number" allowDecimals={false} />
                            <YAxis dataKey="name" type="category" width={120} />
                            <Tooltip />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                {data.subjects.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    )
}

/* ----------------- Small Optimized Components ----------------- */

const StatCard = React.memo(({ icon, title, value, footer }) => (
    <div className="stat-card">
        <div className="stat-icon">{icon}</div>
        <div className="stat-content">
            <h3>{title}</h3>
            <p className="stat-value">{value}</p>
            <p className="stat-footer">{footer}</p>
        </div>
    </div>
))

const ChartCard = React.memo(({ title, children, wide }) => (
    <div className="chart-card" style={wide ? { gridColumn: "1 / -1" } : null}>
        <div className="chart-header">
            <h3>{title}</h3>
        </div>
        {children}
    </div>
))
