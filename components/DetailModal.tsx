import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Report, InspectionStatus } from '../types';
import { CATEGORIES, STATUS_COLORS, STATUS_BORDER_COLORS } from '../constants';

interface PrintLayoutProps {
  report: Report;
  filterStatus?: InspectionStatus;
}

export const PrintLayout: React.FC<PrintLayoutProps> = ({ report, filterStatus }) => {
  // Normalize items to ensure photos array exists
  const items = report.items.map((i) => ({
    ...i,
    photos: i.photos ? i.photos : (i.photo ? [i.photo] : [])
  })).filter(item => !filterStatus || item.status === filterStatus);

  return (
    <div className="p-8 text-black text-sm font-sans">
      <div className="print-header flex justify-between items-end mb-6 border-b-2 border-black pb-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">{report.airport}공항 안전점검 결과 {filterStatus ? `(${filterStatus} 항목)` : ''}</h1>
          <div className="text-base">점검일: <span className="font-mono font-bold">{new Date(report.date).toLocaleDateString()}</span></div>
        </div>
        <div className="text-right">
          <div className="text-base mb-1">점검자: <span className="font-bold">{report.inspector}</span></div>
          <div className="text-xs text-slate-500">출력일: {new Date().toLocaleDateString()}</div>
        </div>
      </div>

      {CATEGORIES.map(cat => {
        const catItems = items.filter((item) => item.category === cat);
        if (catItems.length === 0) return null;

        const catDate = report.categoryDates?.[cat];

        return (
          <div key={cat} className="mb-6 print-break-inside-avoid">
            <div className="print-section-title bg-slate-100 border border-slate-300 p-2 font-bold text-base mb-3 mt-4 flex justify-between items-center">
              <span>{cat}</span>
              {catDate && <span className="text-xs font-normal">점검일: {catDate}</span>}
            </div>
            <div className="space-y-4">
              {catItems.map((item, idx) => (
                <div key={idx} className="print-item border-b border-slate-200 pb-3 print-break-inside-avoid">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-sm">■ {item.label}</span>
                    <span className={`px-2 py-0.5 rounded border text-xs font-bold ${STATUS_BORDER_COLORS[item.status] || 'border-slate-300 text-slate-600'}`}>
                      {item.status}
                    </span>
                  </div>
                  
                  {item.opinion && (
                    <div className="bg-slate-50 p-2 rounded border border-slate-200 mb-2 text-xs whitespace-pre-wrap">
                      <span className="font-bold mr-1">[의견]</span>{item.opinion}
                    </div>
                  )}

                  {item.photos && item.photos.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {item.photos.map((photo, pIdx) => (
                        <div key={pIdx} className="border border-slate-200 p-1">
                           <img src={photo} alt="" className="w-full h-32 object-contain bg-white" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface DetailModalProps {
  report: Report;
  filterStatus?: InspectionStatus;
  onClose: () => void;
  onDownloadPdf: () => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({ report, filterStatus, onClose, onDownloadPdf }) => {
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Normalize and filter items
  const items = useMemo(() => {
      return report.items.map((i) => ({
        ...i,
        photos: i.photos ? i.photos : (i.photo ? [i.photo] : [])
      })).filter(item => !filterStatus || item.status === filterStatus);
  }, [report, filterStatus]);

  const printPortalTarget = document.getElementById('print-container');

  return (
    <>
      {/* Screen Modal */}
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 print:hidden backdrop-blur-sm animate-fade-in">
        <div className="bg-white w-full max-w-5xl h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
          
          {/* Modal Header */}
          <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center flex-none">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{report.airport}공항 안전점검 결과</h2>
                    {filterStatus && (
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border border-white/20 shadow-sm ${
                            filterStatus === '양호' ? 'bg-green-600' :
                            filterStatus === '경미' ? 'bg-yellow-600' :
                            filterStatus === '미흡' ? 'bg-orange-600' :
                            filterStatus === '심각' ? 'bg-red-600' : 'bg-slate-600'
                        }`}>
                            {filterStatus} 항목만 표시 중
                        </span>
                    )}
                </div>
                <div className="text-slate-300 text-sm mt-1 flex gap-4">
                  <span className="flex items-center gap-1">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                     </svg>
                     {report.inspector}
                  </span>
                  <span className="flex items-center gap-1">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                     </svg>
                     {new Date(report.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={onDownloadPdf}
                title="PDF 다운로드"
                className="flex items-center justify-center bg-white text-slate-800 hover:bg-blue-50 w-10 h-10 rounded-lg font-bold transition-all shadow-sm hover:shadow active:scale-95"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button 
                onClick={onClose} 
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-700 transition-colors text-slate-300 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content Area - Single View Scroll */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-100 space-y-8">
             {CATEGORIES.map((cat) => {
                const catItems = items.filter(item => item.category === cat);
                if (catItems.length === 0) return null;

                return (
                  <div key={cat} className="animate-fade-in-up">
                      {/* Section Header */}
                      <div className="flex items-center gap-3 mb-4 pl-1">
                          <div className="h-6 w-1.5 bg-blue-600 rounded-full"></div>
                          <h3 className="text-xl font-bold text-slate-800">{cat}</h3>
                          <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">{catItems.length}</span>
                          
                          {/* Optional: Show date specific to category if exists */}
                          {report.categoryDates?.[cat] && (
                             <span className="text-xs text-slate-500 ml-auto bg-white px-2 py-1 rounded border border-slate-200">
                                점검일: {report.categoryDates[cat]}
                             </span>
                          )}
                      </div>

                      {/* Items Grid/List */}
                      <div className="space-y-4">
                        {catItems.map((item, idx) => (
                            <div key={idx} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-800 text-lg">{item.label}</h3>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                    {item.status}
                                </span>
                                </div>

                                {item.opinion && (
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-slate-700 text-sm mb-4 whitespace-pre-wrap">
                                    <div className="flex items-center gap-2 mb-2 text-slate-500 font-bold text-xs uppercase tracking-wider">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                    </svg>
                                    점검자 의견
                                    </div>
                                    {item.opinion}
                                </div>
                                )}

                                {item.photos && item.photos.length > 0 && (
                                <div className="mt-4">
                                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">현장 사진 ({item.photos.length})</div>
                                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                                    {item.photos.map((photo, pIdx) => (
                                        <div key={pIdx} className="relative group flex-none w-64 h-48 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                                        <img 
                                            src={photo} 
                                            alt={`Evidence ${pIdx + 1}`} 
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                                            onClick={() => {
                                            const w = window.open("");
                                            w?.document.write(`<img src="${photo}" style="max-width:100%; height:auto;">`);
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                                        </div>
                                    ))}
                                    </div>
                                </div>
                                )}
                            </div>
                        ))}
                      </div>
                  </div>
                );
             })}
             
             {items.length === 0 && (
                 <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <svg className="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg">해당하는 점검 항목이 없습니다.</p>
                 </div>
             )}
          </div>
        </div>
      </div>

      {printPortalTarget && createPortal(<PrintLayout report={report} filterStatus={filterStatus} />, printPortalTarget)}
    </>
  );
};