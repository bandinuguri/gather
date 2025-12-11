import React from 'react';
import { TableRowData, Report, InspectionStatus } from '../types';

// Helper function to format date range
const formatInspectionDate = (report?: Report) => {
  if (!report || !report.date) return '-';
  
  const dates = [new Date(report.date)];
  if (report.categoryDates) {
    Object.values(report.categoryDates).forEach((d) => dates.push(new Date(d)));
  }
  
  if (dates.length === 0) return '-';

  const minTime = Math.min(...dates.map(d => d.getTime()));
  const maxTime = Math.max(...dates.map(d => d.getTime()));
  
  const minDate = new Date(minTime);
  const maxDate = new Date(maxTime);
  
  const yy = minDate.getFullYear().toString().slice(2);
  const mm = (minDate.getMonth() + 1).toString().padStart(2, '0');
  const dd = minDate.getDate().toString().padStart(2, '0');
  
  if (minTime === maxTime) {
    return `${yy}.${mm}.${dd}`;
  } else {
    // If same month
    if (minDate.getMonth() === maxDate.getMonth() && minDate.getFullYear() === maxDate.getFullYear()) {
        const endDD = maxDate.getDate().toString().padStart(2, '0');
        return `${yy}.${mm}.${dd}~${endDD}`;
    } else {
        // Different month
        const endMM = (maxDate.getMonth() + 1).toString().padStart(2, '0');
        const endDD = maxDate.getDate().toString().padStart(2, '0');
        return `${yy}.${mm}.${dd}~${endMM}.${endDD}`;
    }
  }
};

interface DashboardPrintLayoutProps {
  data: TableRowData[];
  year: number;
  month: number;
}

export const DashboardPrintLayout: React.FC<DashboardPrintLayoutProps> = ({ data, year, month }) => {
  return (
    <div className="p-12 font-sans text-black max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2 text-left">{year}년 {month}월 공항 안전점검 결과(총괄)</h1>
      </div>
      
      <div className="text-right text-sm mb-1">(단위 : 건)</div>
      <table className="w-full border-collapse border border-black text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className="border border-black py-2 px-2 text-center w-24 text-black font-semibold">공항명</th>
            <th className="border border-black py-2 px-2 text-center w-16 text-black font-semibold">양호</th>
            <th className="border border-black py-2 px-2 text-center w-16 text-black font-semibold">경미</th>
            <th className="border border-black py-2 px-2 text-center w-16 text-black font-semibold">미흡</th>
            <th className="border border-black py-2 px-2 text-center w-16 text-black font-semibold">심각</th>
            <th className="border border-black py-2 px-2 text-center w-16 text-black font-semibold">해당없음</th>
            <th className="border border-black py-2 px-2 text-center w-16 font-bold bg-slate-100">계</th>
            <th className="border border-black py-2 px-2 text-center w-24 font-semibold">점검일</th>
          </tr>
        </thead>
        <tbody>
          {data.map(({ airport, hasData, report, stats }) => (
            <tr key={airport}>
              <td className="border border-black py-2 px-3 text-center font-bold bg-slate-50 text-base">{airport}</td>
              {hasData && stats ? (
                <>
                  <td className="border border-black py-2 text-center text-base">{stats.good || '-'}</td>
                  <td className="border border-black py-2 text-center text-base">{stats.minor || '-'}</td>
                  <td className="border border-black py-2 text-center text-base">{stats.poor || '-'}</td>
                  <td className="border border-black py-2 text-center text-base font-bold text-red-600">{stats.critical || '-'}</td>
                  <td className="border border-black py-2 text-center text-slate-500 text-base">{stats.na || '-'}</td>
                  <td className="border border-black py-2 text-center font-bold bg-slate-50 text-base">{stats.total}</td>
                  <td className="border border-black py-2 text-center text-base font-mono">{formatInspectionDate(report)}</td>
                </>
              ) : (
                <>
                   <td className="border border-black py-2 text-center text-slate-300">-</td>
                   <td className="border border-black py-2 text-center text-slate-300">-</td>
                   <td className="border border-black py-2 text-center text-slate-300">-</td>
                   <td className="border border-black py-2 text-center text-slate-300">-</td>
                   <td className="border border-black py-2 text-center text-slate-300">-</td>
                   <td className="border border-black py-2 text-center bg-slate-50 text-slate-300">-</td>
                   <td className="border border-black py-2 text-center text-slate-300">-</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface DashboardTableProps {
  data: TableRowData[];
  year: number;
  month: number;
  onViewReport: (report: any) => void;
  onViewStatusReport: (report: any, status: InspectionStatus) => void;
  onFileUpload: (airport: string) => void;
  onPrintReport: (report: any) => void;
  onDeleteReport: (report: any) => void;
}

export const DashboardTable: React.FC<DashboardTableProps> = ({ data, year, month, onViewReport, onViewStatusReport, onFileUpload, onPrintReport, onDeleteReport }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          {year}년 {month}월 점검 현황
        </h3>
        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
          총 {data.length}개 공항
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full admin-table text-sm table-fixed">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="w-[10%] py-3 px-4 text-center font-bold text-slate-600 border-r border-slate-200">공항명</th>
              <th className="w-[8%] py-2 px-2 text-center text-green-700 bg-green-50 font-bold">양호</th>
              <th className="w-[8%] py-2 px-2 text-center text-yellow-700 bg-yellow-50 font-bold">경미</th>
              <th className="w-[8%] py-2 px-2 text-center text-orange-700 bg-orange-50 font-bold">미흡</th>
              <th className="w-[8%] py-2 px-2 text-center text-red-700 bg-red-50 font-bold">심각</th>
              <th className="w-[8%] py-2 px-2 text-center text-slate-500 bg-slate-50 font-bold">해당없음</th>
              <th className="w-[8%] py-2 px-2 text-center text-slate-800 bg-slate-100 font-bold border-r border-slate-200">계</th>
              <th className="w-[12%] py-2 px-2 text-center text-slate-700 font-bold border-r border-slate-200">점검일</th>
              <th className="w-[30%] py-3 px-4 text-center font-bold text-slate-600">비고</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map(({ airport, hasData, report, stats }) => (
              <tr key={airport} className="hover:bg-slate-50 transition-colors group">
                <td className="py-3 px-4 font-bold text-slate-700 border-r border-slate-100 bg-white group-hover:bg-slate-50 text-center">{airport}</td>
                
                {hasData && stats ? (
                  <>
                    <td className="text-center py-3 border-r border-slate-50">
                        {stats.good > 0 ? (
                            <button 
                                onClick={() => onViewStatusReport(report, '양호')}
                                className="font-bold text-green-600 hover:underline hover:scale-110 transition-transform cursor-pointer px-2"
                            >
                                {stats.good}
                            </button>
                        ) : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="text-center py-3 border-r border-slate-50">
                        {stats.minor > 0 ? (
                            <button 
                                onClick={() => onViewStatusReport(report, '경미')}
                                className="font-bold text-yellow-600 hover:underline hover:scale-110 transition-transform cursor-pointer px-2"
                            >
                                {stats.minor}
                            </button>
                        ) : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="text-center py-3 border-r border-slate-50">
                        {stats.poor > 0 ? (
                            <button 
                                onClick={() => onViewStatusReport(report, '미흡')}
                                className="font-bold text-orange-600 hover:underline hover:scale-110 transition-transform cursor-pointer px-2"
                            >
                                {stats.poor}
                            </button>
                        ) : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="text-center py-3 border-r border-slate-50">
                        {stats.critical > 0 ? (
                            <button 
                                onClick={() => onViewStatusReport(report, '심각')}
                                className="font-bold text-red-600 hover:underline hover:scale-110 transition-transform cursor-pointer px-2"
                            >
                                {stats.critical}
                            </button>
                        ) : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="text-center py-3 text-slate-400 border-r border-slate-50">
                         {stats.na > 0 ? (
                            <button 
                                onClick={() => onViewStatusReport(report, '해당없음')}
                                className="text-slate-500 hover:underline hover:text-slate-700 cursor-pointer px-2"
                            >
                                {stats.na}
                            </button>
                        ) : '-'}
                    </td>
                    <td className="text-center py-3 font-bold bg-slate-50 text-slate-700 border-r border-slate-100">{stats.total}</td>
                    <td className="text-center py-3 text-slate-600 font-mono text-xs border-r border-slate-100">
                        {formatInspectionDate(report)}
                    </td>
                    <td className="text-center py-2 px-3">
                      <div className={`flex items-center gap-2 ${hasData ? 'justify-start' : 'justify-center'}`}>
                        <button 
                          onClick={() => onViewReport(report)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded border border-blue-200 transition-colors"
                        >
                          상세
                        </button>
                        <button 
                          onClick={() => onPrintReport(report)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded border border-slate-300 transition-colors flex items-center gap-1"
                          title="PDF 저장"
                        >
                           <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                           </svg>
                           PDF
                        </button>
                        <button 
                          onClick={() => onFileUpload(airport)}
                          className="px-3 py-1.5 bg-white hover:bg-orange-50 text-orange-600 hover:text-orange-700 text-xs font-bold rounded border border-slate-200 hover:border-orange-200 transition-colors"
                        >
                          수정
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteReport(report);
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 text-xs font-bold rounded border border-slate-200 hover:border-red-200 transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td colSpan={6} className="text-center py-3 bg-slate-50/30 border-r border-slate-100">
                       <span className="text-xs text-slate-400">데이터 없음</span>
                    </td>
                    <td className="text-center py-3 bg-slate-50/30 border-r border-slate-100">
                       <span className="text-xs text-slate-300">-</span>
                    </td>
                    <td className="text-center py-2 px-3">
                      <div className="flex items-center justify-center gap-2">
                          <button 
                              onClick={() => onFileUpload(airport)}
                              className="w-full max-w-[120px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 text-xs font-bold rounded border border-slate-200 border-dashed transition-all"
                          >
                            + 미등록
                          </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};