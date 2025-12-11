export type InspectionStatus = '양호' | '경미' | '미흡' | '심각' | '해당없음';

export interface ReportItem {
  category: string;
  label: string;
  status: InspectionStatus;
  opinion?: string;
  photos?: string[];
  // Legacy support for older JSON formats
  photo?: string; 
}

export interface Report {
  id: number;
  airport: string;
  date: string; // ISO Date string
  inspector: string;
  items: ReportItem[];
  categoryDates?: Record<string, string>;
}

export interface AirportStats {
  good: number;
  minor: number;
  poor: number;
  critical: number;
  na: number;
  total: number;
}

export interface TableRowData {
  airport: string;
  hasData: boolean;
  report?: Report;
  stats?: AirportStats;
}