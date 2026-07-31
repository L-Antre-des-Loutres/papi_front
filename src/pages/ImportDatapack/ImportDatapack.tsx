import { useState, useRef } from 'react';
import PageTitle from '../../components/ui/PageTitle/PageTitle';
import { useToastStore } from '../../context/store/toastStore';
import { useSettings } from '../../context/useSettings';
import { useAuthStore } from '../../context/store/authStore';
import styles from './ImportDatapack.module.css';

interface ProgressData {
    step: string;
    message: string;
    current: number;
    total: number;
}

export default function ImportDatapack() {
    const [file, setFile] = useState<File | null>(null);
    const [tag, setTag] = useState('');
    const [loading, setLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [progress, setProgress] = useState<ProgressData | null>(null);
    
    const inputRef = useRef<HTMLInputElement>(null);
    const addToast = useToastStore((s) => s.addToast);
    const { settings } = useSettings();
    const token = useAuthStore((s) => s.token);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!file) {
            addToast('Please select a zip file', 'error');
            return;
        }
        if (!tag.trim()) {
            addToast('Please enter a generation tag', 'error');
            return;
        }

        setLoading(true);
        setProgress(null);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tag', tag.trim());

        try {
            const baseUrl = settings.baseUrl || '';
            const headers: HeadersInit = {};
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const res = await fetch(`${baseUrl}/api/datapack/upload`, {
                method: 'POST',
                headers,
                body: formData,
            });

            if (!res.ok) {
                throw new Error('Upload failed');
            }
            
            // Read SSE stream from the POST response
            if (res.body) {
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
                    
                    for (const line of lines) {
                        if (line.startsWith('data:')) {
                            try {
                                const dataStr = line.substring(5).trim();
                                if (dataStr) {
                                    const parsed = JSON.parse(dataStr);
                                    setProgress(parsed);
                                }
                            } catch (e) {
                                console.error('Failed to parse SSE data', e);
                            }
                        }
                    }
                }
            }

            addToast('Datapack imported successfully!', 'success');
            setFile(null);
            setTag('');
        } catch (err) {
            addToast('Failed to import datapack', 'error');
            console.error(err);
        } finally {
            setLoading(false);
            setProgress(null);
        }
    };

    const percent = progress?.total ? Math.round((progress.current / progress.total) * 100) : 0;

    return (
        <div className="container">
            <PageTitle title="Import Datapack" />

            <div className={styles.card}>
                <form className={styles.form} onSubmit={handleSubmit}>
                    
                    {/* Drag and Drop Zone */}
                    <div className={styles.field}>
                        <label className={styles.label}>Zip File</label>
                        <div
                            className={`${styles.dropzone} ${dragActive ? styles.dragActive : ''}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => inputRef.current?.click()}
                        >
                            <input
                                ref={inputRef}
                                type="file"
                                accept=".zip"
                                style={{ display: 'none' }}
                                onChange={handleChange}
                            />
                            {!file ? (
                                <>
                                    <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <p className={styles.dropText}>Click or drag a .zip file here</p>
                                    <p className={styles.dropSubtext}>Contains your Cobblemon data</p>
                                </>
                            ) : (
                                <div className={styles.fileInfo}>
                                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>{file.name}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label} htmlFor="datapack-tag">
                            Generation Tag
                        </label>
                        <input
                            id="datapack-tag"
                            type="text"
                            placeholder="e.g. gen-rlm"
                            className={styles.input}
                            value={tag}
                            onChange={(e) => setTag(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className={`btn btn-primary ${styles.submitBtn}`}
                        disabled={loading || !file || !tag.trim()}
                    >
                        {loading ? 'Importing...' : 'Start Import'}
                    </button>
                </form>

                {/* Progress Bar */}
                {loading && progress && (
                    <div className={styles.progressSection}>
                        <div className={styles.progressHeader}>
                            <span className={styles.progressTitle}>
                                {progress.step === 'entities' ? 'Parsing Entities' : 
                                 progress.step === 'translations' ? 'Importing Translations' : 'Finalizing Forms'}
                            </span>
                            <span className={styles.progressCount}>{percent}%</span>
                        </div>
                        <div className={styles.progressBarContainer}>
                            <div 
                                className={styles.progressBarFill} 
                                style={{ width: `${Math.max(5, percent)}%` }}
                            ></div>
                        </div>
                        <div className={styles.progressMessage}>
                            {progress.message}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
