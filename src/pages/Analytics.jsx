import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import {
    Activity, HardDrive, FileText, Layers, TrendingUp, PieChart as PieIcon
} from 'lucide-react'
import './Analytics.css'

const API_URL = 'http://localhost:5000/api'
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

const Analytics = () => {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchAnalytics()
    }, [])

    const fetchAnalytics = async () => {
        try {
            const response = await axios.get(`${API_URL}/analytics`)
            setData(response.data)
            setLoading(false)
        } catch (err) {
            setError("Failed to load analytics data")
            setLoading(false)
        }
    }

    if (loading) return <div className="p-xl text-center">Loading analytics...</div>
    if (error) return <div className="p-xl text-center text-error">{error}</div>
    if (!data) return null

    return (
        <div className="analytics-page">
            <div className="analytics-header">
                <h1><TrendingUp /> Analytics & Statistics</h1>
                <p>Overview of your digital archive's growth and health.</p>
            </div>

            {/* Key Metrics Grid */}
            <div className="analytics-grid">
                <div className="stat-card">
                    <div className="stat-icon"><FileText size={24} /></div>
                    <div className="stat-content">
                        <h3>Total Projects</h3>
                        <p className="stat-value">{data.total_projects}</p>
                        <p className="stat-footer">Across all stages</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon"><HardDrive size={24} /></div>
                    <div className="stat-content">
                        <h3>Storage Used</h3>
                        <p className="stat-value">{data.storage_usage.formatted}</p>
                        <p className="stat-footer">{data.storage_usage.total_files} files stored</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon"><Layers size={24} /></div>
                    <div className="stat-content">
                        <h3>Archived</h3>
                        <p className="stat-value">
                            {data.status_distribution.find(d => d.name === 'Archived')?.value || 0}
                        </p>
                        <p className="stat-footer">Completed documents</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon"><Activity size={24} /></div>
                    <div className="stat-content">
                        <h3>Activity</h3>
                        <p className="stat-value">
                            {data.timeline.reduce((acc, curr) => acc + curr.count, 0)}
                        </p>
                        <p className="stat-footer">New files this week</p>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="charts-container">
                {/* Activity Trend */}
                <div className="chart-card">
                    <div className="chart-header">
                        <h3>Weekly Activity</h3>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.timeline}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="day" />
                            <YAxis allowDecimals={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', borderRadius: '8px', border: 'none' }}
                                itemStyle={{ color: 'var(--color-text)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke="var(--color-primary)"
                                fill="var(--color-primary)"
                                fillOpacity={0.2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Status Distribution */}
                <div className="chart-card">
                    <div className="chart-header">
                        <h3>Project Status</h3>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data.status_distribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.status_distribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Subject Distribution Bar Chart */}
                <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
                    <div className="chart-header">
                        <h3>Top Subjects</h3>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.subjects} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" allowDecimals={false} />
                            <YAxis dataKey="name" type="category" width={100} />
                            <Tooltip cursor={{ fill: 'transparent' }} />
                            <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} barSize={20}>
                                {data.subjects.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}

export default Analytics
