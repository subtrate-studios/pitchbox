'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AnalyzePage() {
  const router = useRouter();
  const [githubUrl, setGithubUrl] = useState('');
  const [style, setStyle] = useState<'business' | 'technical' | 'casual'>('business');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load GitHub URL from deployment config if available
  useEffect(() => {
    const config = sessionStorage.getItem('deploymentConfig');
    if (config) {
      try {
        const parsed = JSON.parse(config);
        if (parsed.githubUrl) {
          setGithubUrl(parsed.githubUrl);
        }
      } catch (e) {
        console.error('Failed to parse deployment config:', e);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setProgress('Starting analysis...');

    try {
      setProgress('Cloning repository...');

      // Call the Express server API (not Next.js API route)
      const res = await fetch('http://localhost:3001/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          githubUrl,
          style,
          targetDuration: 180,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      // Extract the demoScript from the response and store it
      // API returns: { status, repository, analysis, demoScript }
      // We only need demoScript for the results page
      const scriptResult = data.demoScript || data;
      sessionStorage.setItem('analysisResult', JSON.stringify(scriptResult));
      router.push('/results');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
            {/* Animated spinner */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-primary-200 rounded-full"></div>
                <div className="w-20 h-20 border-4 border-primary-600 rounded-full absolute top-0 left-0 animate-spin border-t-transparent"></div>
              </div>
            </div>

            {/* Progress text */}
            <h2 className="text-2xl font-bold text-center text-slate-800 dark:text-slate-200 mb-4">
              Analyzing Repository
            </h2>
            <p className="text-center text-slate-600 dark:text-slate-400 mb-6">
              {progress}
            </p>

            {/* Progress steps */}
            <div className="space-y-3">
              <ProgressStep label="Cloning repository" active />
              <ProgressStep label="Analyzing codebase" />
              <ProgressStep label="Indexing with AI" />
              <ProgressStep label="Generating script" />
            </div>

            <p className="text-sm text-center text-slate-500 dark:text-slate-400 mt-6">
              This may take 2-5 minutes for large repositories
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400 mb-4">
            AI Demo Script Generator
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Generate professional product demo scripts from any GitHub repository
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* GitHub URL */}
            <div>
              <label htmlFor="githubUrl" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                GitHub Repository URL *
              </label>
              <input
                type="url"
                id="githubUrl"
                required
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username/repository"
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>

            {/* Style Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Script Style
              </label>
              <div className="grid grid-cols-3 gap-3">
                <StyleButton
                  label="Business"
                  description="Focus on value & ROI"
                  selected={style === 'business'}
                  onClick={() => setStyle('business')}
                />
                <StyleButton
                  label="Technical"
                  description="Architecture & code"
                  selected={style === 'technical'}
                  onClick={() => setStyle('technical')}
                />
                <StyleButton
                  label="Casual"
                  description="Friendly & conversational"
                  selected={style === 'casual'}
                  onClick={() => setStyle('casual')}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!githubUrl}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-semibold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate Demo Script
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">How it works</h3>
              <div className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                <p>• We analyze your repository using AI</p>
                <p>• Extract features, flows, and key functionality</p>
                <p>• Generate a 3-minute voiceover script optimized for demos</p>
                <p>• Perfect for use with screen recordings and ElevenLabs TTS</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function StyleButton({ label, description, selected, onClick }: {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-4 rounded-lg border-2 transition-all ${
        selected
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-slate-300 dark:border-slate-600 hover:border-primary-300'
      }`}
    >
      <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
        {label}
      </div>
      <div className="text-xs text-slate-600 dark:text-slate-400">
        {description}
      </div>
    </button>
  );
}

function ProgressStep({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <div className="flex items-center space-x-3">
      <div className={`w-2 h-2 rounded-full ${active ? 'bg-primary-600 animate-pulse' : 'bg-slate-300'}`}></div>
      <span className={`text-sm ${active ? 'text-slate-800 dark:text-slate-200 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
        {label}
      </span>
    </div>
  );
}
