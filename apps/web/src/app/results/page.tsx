'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ScriptSection {
  title: string;
  content: string;
  duration: number;
  type: 'introduction' | 'feature' | 'flow' | 'technical' | 'conclusion';
}

interface DemoScript {
  fullScript: string;
  sections: ScriptSection[];
  estimatedDuration: number;
  keywords: string[];
  metadata: {
    style: string;
    generatedAt: string;
    repository: string;
    retrievedDocuments?: number;
  };
}

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<DemoScript | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const storedResult = sessionStorage.getItem('analysisResult');
    if (!storedResult) {
      router.push('/analyze');
      return;
    }

    try {
      const parsed = JSON.parse(storedResult);
      console.log('Parsed result:', parsed); // Debug log

      // Ensure metadata exists
      if (!parsed.metadata) {
        console.error('Missing metadata in result');
        setError('Invalid result format');
        return;
      }

      setResult(parsed);
    } catch (error) {
      console.error('Failed to parse result:', error);
      router.push('/analyze');
    }
  }, [router]);

  const [localError, setError] = useState<string | null>(null);

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.fullScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!result) return;

    const content = `# Demo Script - ${result?.metadata?.repository || 'Unknown'}\n\n${result.fullScript}\n\n---\nGenerated at: ${result?.metadata?.generatedAt ? new Date(result.metadata.generatedAt).toLocaleString() : 'Unknown'}\nStyle: ${result?.metadata?.style || 'business'}\nEstimated Duration: ${result?.estimatedDuration || 0} seconds\n`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `demo-script-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleNewAnalysis = () => {
    sessionStorage.removeItem('analysisResult');
    router.push('/analyze');
  };

  if (localError) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
              Error Loading Result
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {localError}
            </p>
            <button
              onClick={() => router.push('/analyze')}
              className="bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400 mb-2">
            Your Demo Script is Ready
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Generated from: <span className="font-mono text-sm">{result?.metadata?.repository || 'Unknown'}</span>
          </p>
        </div>

        {/* Metadata Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <MetadataCard
            label="Duration"
            value={`${result?.estimatedDuration || 0}s`}
            icon="⏱️"
          />
          <MetadataCard
            label="Style"
            value={result?.metadata?.style || 'business'}
            icon="🎨"
          />
          <MetadataCard
            label="Sections"
            value={(result?.sections?.length || 0).toString()}
            icon="📑"
          />
          <MetadataCard
            label="Keywords"
            value={(result?.keywords?.length || 0).toString()}
            icon="🏷️"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:border-primary-500 transition-all shadow-sm"
          >
            {copied ? (
              <>
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-green-500 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">Copy Script</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:border-primary-500 transition-all shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="font-medium">Download .md</span>
          </button>

          <button
            onClick={handleNewAnalysis}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Analysis</span>
          </button>
        </div>

        {/* Full Script */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-6">
            Full Script
          </h2>
          <div className="prose dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed">
              {result.fullScript}
            </div>
          </div>
        </div>

        {/* Sections Breakdown */}
        {result?.sections && result.sections.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-6">
              Sections Breakdown
            </h2>
            <div className="space-y-6">
              {result.sections.map((section, index) => (
                <SectionCard key={index} section={section} />
              ))}
            </div>
          </div>
        )}

        {/* Keywords */}
        {result?.keywords && result.keywords.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-6">
              Keywords
            </h2>
            <div className="flex flex-wrap gap-2">
              {result.keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function MetadataCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-800 dark:text-slate-200 capitalize">
        {value}
      </div>
    </div>
  );
}

function SectionCard({ section }: { section: ScriptSection }) {
  const typeColors = {
    introduction: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
    feature: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
    flow: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
    technical: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
    conclusion: 'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300',
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
            {section.title}
          </h3>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${typeColors[section.type]}`}>
              {section.type}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {section.duration}s
            </span>
          </div>
        </div>
      </div>
      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
        {section.content}
      </p>
    </div>
  );
}
