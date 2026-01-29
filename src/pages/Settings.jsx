import React, { useState, useEffect, useCallback } from "react"
import axios from "axios"
import {
    Save, Folder, RefreshCw, Settings as SettingsIcon, Calendar,
    FileArchive, Building2, Languages, Sliders, FileText
} from "lucide-react"
import { useToast } from "../context/ToastContext"
import { API_URL } from "../config"
import "./Settings.css"

const DEFAULT_SETTINGS = {
    archive_storage_path: "",
    export_as_zip: false,
    date_format: "YYYY-MM-DD",
    institution_name: "",
    file_naming_convention: "{title}_{year}",
    default_ocr_language: "eng",
    pdf_quality: "high"
}

export default function Settings() {
    const { addToast } = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [settings, setSettings] = useState(DEFAULT_SETTINGS)

    /* ------------------ Fetch Settings ------------------ */
    const fetchSettings = useCallback(async (signal) => {
        try {
            setLoading(true)
            const { data } = await axios.get(`${API_URL}/settings`, { signal })
            setSettings({ ...DEFAULT_SETTINGS, ...data }) // normalize shape
        } catch (err) {
            if (err.name !== "CanceledError") {
                console.error(err)
                addToast("Failed to load settings from server.", "error")
            }
        } finally {
            setLoading(false)
        }
    }, [addToast])

    useEffect(() => {
        const controller = new AbortController()
        fetchSettings(controller.signal)
        return () => controller.abort()
    }, [fetchSettings])

    /* ------------------ Handlers ------------------ */
    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target
        setSettings(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }))
    }, [])

    const handleSave = useCallback(async () => {
        try {
            setSaving(true)
            await axios.post(`${API_URL}/settings`, settings)
            addToast("Settings saved successfully!", "success")
        } catch (error) {
            const msg = error.response?.data?.error || "Failed to save settings."
            addToast(msg, "error")
        } finally {
            setSaving(false)
        }
    }, [settings, addToast])

    /* ------------------ Loading ------------------ */
    if (loading) {
        return (
            <div className="settings-page loading">
                <RefreshCw className="spinner" size={32} />
                <p>Loading configuration...</p>
            </div>
        )
    }

    return (
        <div className="settings-page">
            <div className="settings-header">
                <h2><SettingsIcon size={26} /> System Configuration</h2>
                <p>Control storage, formats, OCR, and archival standards.</p>
            </div>

            <div className="settings-layout">

                {/* LEFT COLUMN */}
                <div className="settings-column">

                    <SettingsCard icon={<Folder />} title="Archive Storage">
                        <FormGroup
                            label="Storage Path"
                            hint="Absolute folder or network path. App must have write access."
                        >
                            <input
                                type="text"
                                name="archive_storage_path"
                                value={settings.archive_storage_path}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="C:\Archive or /mnt/archive"
                            />
                        </FormGroup>
                    </SettingsCard>

                    <SettingsCard icon={<Calendar />} title="Date Formatting">
                        <select
                            name="date_format"
                            value={settings.date_format}
                            onChange={handleChange}
                            className="form-select"
                        >
                            <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                            <option value="DD/MM/YYYY">DD/MM/YYYY (EU)</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                            <option value="YYYY.MM.DD">YYYY.MM.DD</option>
                        </select>
                    </SettingsCard>

                    <SettingsCard icon={<Building2 />} title="Institution Identity">
                        <input
                            type="text"
                            name="institution_name"
                            value={settings.institution_name}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="National Digital Archive"
                        />
                    </SettingsCard>

                </div>

                {/* RIGHT COLUMN */}
                <div className="settings-column">

                    <SettingsCard icon={<FileArchive />} title="Export Behavior">
                        <label className="switch">
                            <input
                                type="checkbox"
                                name="export_as_zip"
                                checked={settings.export_as_zip}
                                onChange={handleChange}
                            />
                            <span className="slider"></span>
                            <span className="switch-label">Auto-create ZIP archive</span>
                        </label>
                    </SettingsCard>

                    <SettingsCard icon={<Languages />} title="OCR Language">
                        <select
                            name="default_ocr_language"
                            value={settings.default_ocr_language}
                            onChange={handleChange}
                            className="form-select"
                        >
                            <option value="eng">English</option>
                            <option value="spa">Spanish</option>
                            <option value="fra">French</option>
                            <option value="deu">German</option>
                        </select>
                    </SettingsCard>

                    <SettingsCard icon={<Sliders />} title="PDF Quality">
                        <select
                            name="pdf_quality"
                            value={settings.pdf_quality}
                            onChange={handleChange}
                            className="form-select"
                        >
                            <option value="max">Maximum (Preservation)</option>
                            <option value="high">High</option>
                            <option value="balanced">Balanced</option>
                            <option value="web">Web Optimized</option>
                        </select>
                    </SettingsCard>

                </div>

            </div>

            {/* FILE NAMING – FULL WIDTH */}
            <div className="settings-wide">
                <SettingsCard icon={<FileText />} title="File Naming Convention">
                    <input
                        type="text"
                        name="file_naming_convention"
                        value={settings.file_naming_convention}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="{title}_{year}_{author}"
                    />
                    <p className="form-hint">
                        Available: {`{title}`}, {`{year}`}, {`{author}`}, {`{subject}`}
                    </p>
                </SettingsCard>
            </div>

            {/* STICKY SAVE BAR */}
            <div className="settings-save-bar">
                <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? <RefreshCw className="spinner" size={18} /> : <Save size={18} />}
                    {saving ? "Saving…" : "Save Changes"}
                </button>
            </div>
        </div>
    )

}

/* ----------------- Reusable UI Blocks ----------------- */

const SettingsCard = React.memo(({ icon, title, children }) => (
    <div className="settings-card">
        <div className="settings-card-header">
            {icon}
            <h3>{title}</h3>
        </div>
        <div className="settings-card-body">
            {children}
        </div>
    </div>
))
SettingsCard.displayName = 'SettingsCard'

const Section = React.memo(({ icon, title, children }) => (
    <div className="settings-section">
        <div className="section-header">
            {icon}
            <h3>{title}</h3>
        </div>
        <div className="section-content">{children}</div>
    </div>
))
Section.displayName = 'Section'

const FormGroup = React.memo(({ label, hint, children }) => (
    <div className="form-group">
        <label className="form-label">{label}</label>
        {children}
        {hint && <p className="form-hint">{hint}</p>}
    </div>
))
FormGroup.displayName = 'FormGroup'
