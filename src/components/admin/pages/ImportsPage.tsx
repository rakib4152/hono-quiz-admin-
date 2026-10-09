import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Download,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../ui/button.js';
import { Badge } from '../../ui/badge.js';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card.js';
import { toast } from 'sonner';

export const ImportsPage: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [importPreview, setImportPreview] = useState<any[] | null>(null);

  const sampleParsedQuestions = [
    {
      row: 2,
      code: 'BCS-46-GEO-01',
      titleEn: 'Which is the largest mangrove forest in the world?',
      titleBn: 'বিশ্বের বৃহত্তম ম্যানগ্রোভ বন কোনটি?',
      optionsCount: 4,
      correctOption: 'Sundarbans (সুন্দরবন)',
      banglaStatus: 'VALID_UTF8',
    },
    {
      row: 3,
      code: 'BCS-46-GEO-02',
      titleEn: 'What is the capital of Bhutan?',
      titleBn: 'ভুটানের রাজধানীর নাম কি?',
      optionsCount: 4,
      correctOption: 'Thimphu (থিম্পু)',
      banglaStatus: 'VALID_UTF8',
    },
    {
      row: 4,
      code: 'BCS-46-MATH-02',
      titleEn: 'What is the sum of angles in a triangle?',
      titleBn: 'একটি ত্রিভুজের তিন কোণের সমষ্টি কত?',
      optionsCount: 4,
      correctOption: '180 Degrees (১৮০ ডিগ্রি)',
      banglaStatus: 'VALID_UTF8',
    },
  ];

  const handleSimulateUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setImportPreview(sampleParsedQuestions);
      toast.success('CSV parsed successfully. 3 valid questions detected.');
    }, 600);
  };

  const handleCommitImport = () => {
    toast.success('Successfully committed 3 questions into Hostinger MySQL Question Bank.');
    setImportPreview(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            CSV Question Bank Bulk Import & Validation Engine
          </h2>
          <p className="text-xs text-slate-400">
            Validated against Hostinger MySQL utf8mb4 schema. Supports dual English and Bangla text, options, and explanations.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.info('Downloaded template: bcs_bangla_questions_template.csv')}
          className="h-8 gap-1.5 text-xs text-slate-300"
        >
          <Download className="h-3.5 w-3.5" /> Download Sample CSV Template
        </Button>
      </div>

      {/* Drag & Drop Upload Zone */}
      <Card className="border-dashed border-2 border-slate-700 bg-slate-950/40">
        <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-orange-600/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Upload Question Bank CSV File</div>
            <p className="text-xs text-slate-400 max-w-sm mt-0.5">
              Drag & drop your formatted CSV here or click to browse. Max size 25MB (up to 5,000 questions per batch).
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleSimulateUpload}
            disabled={isUploading}
            className="h-8 gap-1.5 text-xs bg-orange-600 hover:bg-orange-700"
          >
            {isUploading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {isUploading ? 'Parsing & Validating CSV...' : 'Select & Validate questions.csv'}
          </Button>
        </CardContent>
      </Card>

      {/* Import Preview Table */}
      {importPreview && (
        <Card className="border-emerald-500/40 bg-slate-900 animate-in fade-in-50">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm text-emerald-400 flex items-center gap-2">
                <FileCheck className="h-4 w-4" /> CSV Validation Preview (Zero Errors Detected)
              </CardTitle>
              <p className="text-xs text-slate-400">
                All 3 questions passed Zod schema validation and Bangla UTF-8 compatibility checks.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleCommitImport}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Commit 3 Questions to Database
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Row</th>
                    <th className="p-2.5">Code</th>
                    <th className="p-2.5">English Statement</th>
                    <th className="p-2.5">বাংলা বিবরণ</th>
                    <th className="p-2.5">Correct Answer</th>
                    <th className="p-2.5">Encoding Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {importPreview.map((item) => (
                    <tr key={item.row} className="hover:bg-slate-800/40">
                      <td className="p-2.5 font-mono text-slate-500">#{item.row}</td>
                      <td className="p-2.5 font-mono text-orange-400 font-semibold">{item.code}</td>
                      <td className="p-2.5 text-white">{item.titleEn}</td>
                      <td className="p-2.5 text-slate-300">{item.titleBn}</td>
                      <td className="p-2.5 text-emerald-400 font-medium">{item.correctOption}</td>
                      <td className="p-2.5">
                        <Badge variant="success" className="text-[10px]">
                          utf8mb4 OK
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Import Jobs History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent CSV Import Batches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs">
            {[
              {
                id: 'imp-884',
                filename: 'bcs_46_bangla_literature_200q.csv',
                total: 200,
                success: 200,
                errors: 0,
                date: '2026-03-18 14:22',
                status: 'COMPLETED',
              },
              {
                id: 'imp-883',
                filename: 'medical_biology_cell_division_150q.csv',
                total: 150,
                success: 148,
                errors: 2,
                date: '2026-03-15 09:10',
                status: 'COMPLETED_WITH_ERRORS',
              },
            ].map((job) => (
              <div
                key={job.id}
                className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-white">{job.filename}</div>
                  <div className="text-[11px] text-slate-400">
                    Uploaded: {job.date} • {job.success}/{job.total} imported
                  </div>
                </div>
                <Badge
                  variant={job.errors === 0 ? 'success' : 'warning'}
                  className="text-[10px]"
                >
                  {job.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
