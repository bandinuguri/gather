import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Header } from './components/Header';
import { DashboardTable, DashboardPrintLayout } from './components/DashboardTable';
import { DetailModal, PrintLayout } from './components/DetailModal';
import { AIRPORTS } from './constants';
import { Report, TableRowData, AirportStats, ReportItem, InspectionStatus } from './types';
import { saveReportToDB, loadReportsMetadata, deleteReportFromDB, clearAllDB, loadReportFull } from './db';

// Electron API safe access
const electronAPI = (window as any).require;

type ExportJobType = {
    type: 'DASHBOARD' | 'REPORT';
    format: 'pdf' | 'html';
    data?: Report;
};

export default function App() {
  // --- State ---
  // "reports" state now holds LIGHTWEIGHT data (no photos) to prevent OOM
  const [reports, setReports] = useState<Report[]>([]);
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // Default to current date
  const [selectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [statusFilter, setStatusFilter] = useState<InspectionStatus | undefined>(undefined);
  
  // Export (PDF/HTML) Generation States
  const [exportJob, setExportJob] = useState<ExportJobType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [targetAirportForUpload, setTargetAirportForUpload] = useState<string | null>(null);

  // --- Effects ---

  // Load from IndexedDB on Mount
  useEffect(() => {
    // We treat Electron FS loading similar to DB now for consistency in state structure, 
    // but focusing on Web performance for now as per request.
    const init = async () => {
        if (electronAPI) {
            // Electron Mode: Load from FS (Assuming file isn't massive, or we'd need streaming)
            // For massive files in Electron, we'd need a similar strategy, but let's keep legacy FS for Electron for now
            // unless we want to unify. Let's unify to use internal state as lightweight.
            try {
                const fs = electronAPI('fs');
                const path = electronAPI('path');
                const os = electronAPI('os');
                const dir = path.join(os.homedir(), 'Documents', 'AirportSafetyManager');
                const file = path.join(dir, 'reports.json');
                
                if (fs.existsSync(file)) {
                  const fileData = fs.readFileSync(file, 'utf-8');
                  const fullData: Report[] = JSON.parse(fileData);
                  // Strip photos for state
                  const lightweight = fullData.map(r => ({
                      ...r,
                      items: r.items.map(i => ({...i, photos: [], photo: undefined}))
                  }));
                  // We actually need full data in memory for Electron if we don't use DB.
                  // But to support 500MB, Electron should also use DB or file-per-report.
                  // For now, let's just set fullData for Electron to avoid breaking it,
                  // assuming Electron has more RAM.
                  setReports(fullData); 
                }
            } catch (e) {
                console.error("FS Load Error", e);
            }
        } else {
            // Web Mode: Load Metadata from IDB
            try {
                const meta = await loadReportsMetadata();
                setReports(meta);
            } catch (e) {
                console.error("DB Load Error", e);
            }
        }
        setIsDbLoaded(true);
    };
    init();
  }, []);


  // Save Data Effect (File System Only)
  // Web Mode now saves strictly during "Upload" actions directly to DB, 
  // so we don't need a 'useEffect' that listens to 'reports' state for Web DB saving.
  // This prevents saving the "stripped" state over the "full" state.
  useEffect(() => {
    if (!electronAPI || !isDbLoaded) return;

    const timer = setTimeout(() => {
        try {
          const fs = electronAPI('fs');
          const path = electronAPI('path');
          const os = electronAPI('os');
          const dir = path.join(os.homedir(), 'Documents', 'AirportSafetyManager');
          
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          const file = path.join(dir, 'reports.json');
          // For Electron, we are currently keeping full state.
          fs.writeFileSync(file, JSON.stringify(reports));
        } catch (e) {
          console.error("Failed to save to file system:", e);
        }
    }, 1000);

    return () => clearTimeout(timer);
  }, [reports, isDbLoaded]);

  // Handle Export Generation
  useEffect(() => {
    const processExport = async () => {
        if (exportJob && pdfContainerRef.current && !isGenerating) {
            setIsGenerating(true);
            await new Promise(resolve => setTimeout(resolve, 1000));

            try {
                const element = pdfContainerRef.current;
                let filenameBase = 'document';
                if (exportJob.type === 'DASHBOARD') {
                    filenameBase = `${selectedYear}년_${selectedMonth}월_공항별_안전점검_결과(총괄)`;
                } else if (exportJob.type === 'REPORT' && exportJob.data) {
                    const cleanDate = new Date(exportJob.data.date).toLocaleDateString().replace(/\./g, '').replace(/\s/g, '');
                    filenameBase = `${exportJob.data.airport}공항_안전점검_결과_${cleanDate}`;
                }

                if (exportJob.format === 'html') {
                    const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${filenameBase}</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap" rel="stylesheet">
<style>
body { font-family: 'Noto Sans KR', sans-serif; background-color: white; padding: 40px; }
table { border-collapse: collapse; }
</style>
</head>
<body>
${element.innerHTML}
</body>
</html>`;
                    
                    const blob = new Blob([htmlContent], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${filenameBase}.html`;
                    link.click();
                    URL.revokeObjectURL(url);
                } else {
                    const canvas = await html2canvas(element, {
                        scale: 2, 
                        useCORS: true, 
                        logging: false,
                        backgroundColor: '#ffffff'
                    });

                    const imgData = canvas.toDataURL('image/jpeg', 0.75);
                    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                    const imgWidth = 210;
                    const pageHeight = 297;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;
                    let heightLeft = imgHeight;
                    let position = 0;

                    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;

                    while (heightLeft > 0) {
                        position -= pageHeight;
                        pdf.addPage();
                        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
                        heightLeft -= pageHeight;
                    }
                    pdf.save(`${filenameBase}.pdf`);
                }
            } catch (error) {
                console.error('Export Failed:', error);
                alert('파일 저장 중 오류가 발생했습니다.');
            } finally {
                setIsGenerating(false);
                setExportJob(null);
            }
        }
    };

    if (exportJob) processExport();
  }, [exportJob, selectedYear, selectedMonth]);

  // --- Actions ---

  // Helper: Fetch full report before viewing details or printing
  const fetchFullReport = async (reportSummary: Report): Promise<Report | null> => {
     if (electronAPI) return reportSummary; // Electron has full data already
     
     setIsLoadingDetails(true);
     try {
         const full = await loadReportFull(reportSummary.id);
         return full || reportSummary;
     } catch(e) {
         console.error("Failed to load details", e);
         alert("상세 데이터를 불러오는데 실패했습니다.");
         return null;
     } finally {
         setIsLoadingDetails(false);
     }
  };

  const handleViewReport = async (report: Report) => {
      const full = await fetchFullReport(report);
      if (full) setSelectedReport(full);
  };
  
  const handleViewStatusReport = async (report: Report, status: InspectionStatus) => {
    const full = await fetchFullReport(report);
    if (full) {
        setStatusFilter(status);
        setSelectedReport(full);
    }
  };

  const handleRequestPdfReport = async (report: Report) => {
    if (isGenerating) return;
    const full = await fetchFullReport(report);
    if (full) {
        setExportJob({ type: 'REPORT', data: full, format: 'pdf' });
    }
  };

  const handleDeleteReport = async (report: Report) => {
    if (!confirm(`[${report.airport}] 데이터를 삭제하시겠습니까?`)) return;

    // UI Update
    setReports(prev => prev.filter(r => r.id !== report.id));
    
    // DB Update
    if (!electronAPI) {
        await deleteReportFromDB(report.id);
    }
    setUploadStatus('삭제되었습니다.');
  };

  const handleReset = async () => {
    if (!confirm('모든 데이터를 초기화하시겠습니까? (복구 불가)')) return;
    
    setReports([]);
    if (!electronAPI) {
        await clearAllDB();
        try { localStorage.removeItem('admin_reports'); } catch(e){}
    } else {
        // Electron: Delete file physically
        try {
            const fs = electronAPI('fs');
            const path = electronAPI('path');
            const os = electronAPI('os');
            const file = path.join(os.homedir(), 'Documents', 'AirportSafetyManager', 'reports.json');
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        } catch (e) {
            console.error("File delete failed", e);
        }
    }
    setUploadStatus('초기화 완료');
  };

  const handleCloseModal = () => {
    setSelectedReport(null);
    setStatusFilter(undefined);
  };

  const handleRequestExportDashboard = (format: 'pdf' | 'html') => {
    setExportJob({ type: 'DASHBOARD', format });
  };

  const handleFolderUploadClick = () => {
    folderInputRef.current?.click();
  };

  const handleSingleFileUploadRequest = (airport: string) => {
    setTargetAirportForUpload(airport);
    if (singleFileInputRef.current) {
        singleFileInputRef.current.value = '';
        singleFileInputRef.current.click();
    }
  };

  // --- Upload Logic Optimized for Large Data ---
  const handleFolderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.json'));
    if (fileList.length === 0) {
        alert('JSON 파일이 없습니다.');
        return;
    }

    setUploadStatus('대용량 파일 처리 중...');

    let processedCount = 0;
    const newSummaries: Report[] = [];

    // Process sequentially to save memory
    for (const file of fileList) {
        try {
            const text = await file.text();
            const json = JSON.parse(text);

            if (json.airport && json.items && json.date) {
                const id = Date.now() + Math.random();
                const normalizedItems = (json.items || []).map((i: any) => ({
                    ...i,
                    photos: i.photos ? i.photos : (i.photo ? [i.photo] : [])
                }));
                
                const fullReport: Report = { 
                    ...json, 
                    items: normalizedItems, 
                    id 
                };

                // 1. Save FULL data to DB immediately
                if (!electronAPI) {
                    await saveReportToDB(fullReport);
                }

                // 2. Create SUMMARY data (no photos) for State
                const summary: Report = {
                    ...fullReport,
                    items: normalizedItems.map((i: any) => ({ ...i, photos: [], photo: undefined }))
                };
                newSummaries.push(summary);

                processedCount++;
                // Update status occasionally
                if (processedCount % 5 === 0) setUploadStatus(`${processedCount}개 파일 처리 중...`);
            }
        } catch (err) {
            console.error(`Error parsing ${file.name}`, err);
        }
    }

    // Merge into state
    if (processedCount > 0) {
        setReports(prev => {
            const merged = [...prev];
            newSummaries.forEach(newR => {
                // Remove duplicates based on airport+date logic if needed, 
                // but simpler to just append or replace based on ID logic if we had persistent IDs.
                // Here we simply overwrite based on matching Airport+Month to keep dashboard clean.
                const newDate = new Date(newR.date);
                const idx = merged.findIndex(existing => {
                    const exDate = new Date(existing.date);
                    return existing.airport === newR.airport && 
                           exDate.getFullYear() === newDate.getFullYear() && 
                           exDate.getMonth() === newDate.getMonth();
                });
                if (idx >= 0) merged[idx] = newR;
                else merged.push(newR);
            });
            return merged;
        });
        setUploadStatus(`${processedCount}건 로드 완료 (대용량 최적화)`);
    } else {
        setUploadStatus('유효한 파일이 없습니다.');
    }
  };

  // Single file also follows the pattern
  const handleSingleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetAirportForUpload) return;
    
    try {
        const text = await file.text();
        const json = JSON.parse(text);
        
        if (json.airport !== targetAirportForUpload) {
            alert('공항명이 일치하지 않습니다.');
            return;
        }

        const id = Date.now();
        const normalizedItems = (json.items || []).map((i: any) => ({
            ...i,
            photos: i.photos ? i.photos : (i.photo ? [i.photo] : [])
        }));

        const viewDate = new Date(selectedYear, selectedMonth - 1, 1);
        const isoDate = new Date(viewDate.getTime() - (viewDate.getTimezoneOffset() * 60000)).toISOString();

        const fullReport: Report = {
            ...json,
            airport: targetAirportForUpload,
            date: isoDate,
            items: normalizedItems,
            id
        };

        if (!electronAPI) {
            await saveReportToDB(fullReport);
        }

        const summary: Report = {
            ...fullReport,
            items: normalizedItems.map((i: any) => ({ ...i, photos: [], photo: undefined }))
        };

        setReports(prev => {
            const others = prev.filter(r => {
                const d = new Date(r.date);
                return !(r.airport === targetAirportForUpload && d.getFullYear() === selectedYear && (d.getMonth() + 1) === selectedMonth);
            });
            return [...others, summary];
        });
        
        setUploadStatus('업데이트 완료');
        setTargetAirportForUpload(null);
    } catch (e) {
        alert('업로드 실패');
    }
  };

  const calculateRowStats = (items: ReportItem[]): AirportStats => {
    let good = 0, minor = 0, poor = 0, critical = 0, na = 0;
    items.forEach(i => {
       if (i.status === '양호') good++;
       else if (i.status === '경미') minor++;
       else if (i.status === '미흡') poor++;
       else if (i.status === '심각') critical++;
       else if (i.status === '해당없음') na++;
    });
    return { good, minor, poor, critical, na, total: good + minor + poor + critical + na };
  };

  const tableData: TableRowData[] = useMemo(() => {
    return AIRPORTS.map(airport => {
      const report = reports.find(r => {
        const d = new Date(r.date);
        return r.airport === airport && d.getFullYear() === selectedYear && (d.getMonth() + 1) === selectedMonth;
      });
      if (!report) return { airport, hasData: false };
      return { airport, hasData: true, report, stats: calculateRowStats(report.items) };
    });
  }, [reports, selectedYear, selectedMonth]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col">
      <Header>
        <div className="flex items-center gap-2">
            {isLoadingDetails && <span className="text-xs text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded animate-pulse">상세정보 로딩중...</span>}
            {uploadStatus && !isLoadingDetails && <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded animate-fade-in mr-2">{uploadStatus}</span>}
            
            <button onClick={handleFolderUploadClick} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95 text-sm">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            결과 폴더 불러오기
            </button>

            <button onClick={() => handleRequestExportDashboard('html')} disabled={isGenerating} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 text-sm">
                HTML 저장
            </button>
            <button onClick={() => handleRequestExportDashboard('pdf')} disabled={isGenerating} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-all active:scale-95 disabled:opacity-50 text-sm">
                PDF 저장
            </button>
            <button onClick={handleReset} className="text-xs text-slate-400 hover:text-red-500 underline ml-2">전체 초기화</button>
        </div>
      </Header>

      <main className="max-w-[1400px] mx-auto p-8 space-y-6 w-full animate-fade-in-up flex-1">
         <input type="file" ref={singleFileInputRef} className="hidden" onChange={handleSingleFileChange} accept=".json" />
         <input type="file" ref={folderInputRef} className="hidden" onChange={handleFolderChange} multiple 
            // @ts-ignore
            webkitdirectory="" directory="" 
         />

         <DashboardTable 
            data={tableData} 
            year={selectedYear} 
            month={selectedMonth} 
            onViewReport={handleViewReport}
            onViewStatusReport={handleViewStatusReport}
            onFileUpload={handleSingleFileUploadRequest}
            onPrintReport={handleRequestPdfReport}
            onDeleteReport={handleDeleteReport}
         />
      </main>
      
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-slate-400 text-sm"><p>공항 안전점검 결과 취합 시스템</p></footer>

      {selectedReport && (
        <DetailModal 
            report={selectedReport} 
            filterStatus={statusFilter}
            onClose={handleCloseModal}
            onDownloadPdf={() => handleRequestPdfReport(selectedReport)}
        />
      )}

      {exportJob && (
        <div style={{ position: 'fixed', top: 0, left: '-9999px', width: '210mm', backgroundColor: 'white', zIndex: -50 }}>
            <div ref={pdfContainerRef}>
                {exportJob.type === 'DASHBOARD' && <DashboardPrintLayout data={tableData} year={selectedYear} month={selectedMonth} />}
                {exportJob.type === 'REPORT' && exportJob.data && <PrintLayout report={exportJob.data} filterStatus={statusFilter} />}
            </div>
        </div>
      )}
    </div>
  );
}