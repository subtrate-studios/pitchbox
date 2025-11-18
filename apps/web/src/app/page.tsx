'use client';

import { useState } from 'react';

export default function Home() {
  const [formData, setFormData] = useState({
    githubUrl: '',
    branch: '',
    commitId: '',
    workspaceDir: '',
    skipSetup: false,
    sandboxPort: '',
    sandboxRecordDurationMs: '',
    appStartCommand: '',
    appBuildCommand: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const payload: any = { githubUrl: formData.githubUrl };

      if (formData.branch) payload.branch = formData.branch;
      if (formData.commitId) payload.commitId = formData.commitId;
      if (formData.workspaceDir) payload.workspaceDir = formData.workspaceDir;
      if (formData.skipSetup) payload.skipSetup = formData.skipSetup;
      if (formData.sandboxPort) payload.sandboxPort = parseInt(formData.sandboxPort);
      if (formData.sandboxRecordDurationMs) payload.sandboxRecordDurationMs = parseInt(formData.sandboxRecordDurationMs);
      if (formData.appStartCommand) payload.appStartCommand = formData.appStartCommand;
      if (formData.appBuildCommand) payload.appBuildCommand = formData.appBuildCommand;

      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Deployment failed');
      }

      setResponse(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-400 mb-4">
            Daytona Deployer
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Deploy your GitHub repository to Daytona with ease
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Required Section */}
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
                Required
              </h2>

              <div>
                <label htmlFor="githubUrl" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  GitHub URL *
                </label>
                <input
                  type="url"
                  id="githubUrl"
                  name="githubUrl"
                  required
                  value={formData.githubUrl}
                  onChange={handleChange}
                  placeholder="https://github.com/username/repository"
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Optional Section */}
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
                Optional Configuration
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Branch */}
                <div>
                  <label htmlFor="branch" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Branch
                  </label>
                  <input
                    type="text"
                    id="branch"
                    name="branch"
                    value={formData.branch}
                    onChange={handleChange}
                    placeholder="main"
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Commit ID */}
                <div>
                  <label htmlFor="commitId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Commit ID
                  </label>
                  <input
                    type="text"
                    id="commitId"
                    name="commitId"
                    value={formData.commitId}
                    onChange={handleChange}
                    placeholder="abc123def456..."
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Workspace Directory */}
                <div>
                  <label htmlFor="workspaceDir" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Workspace Directory
                  </label>
                  <input
                    type="text"
                    id="workspaceDir"
                    name="workspaceDir"
                    value={formData.workspaceDir}
                    onChange={handleChange}
                    placeholder="/workspace"
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Sandbox Port */}
                <div>
                  <label htmlFor="sandboxPort" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Sandbox Port
                  </label>
                  <input
                    type="number"
                    id="sandboxPort"
                    name="sandboxPort"
                    value={formData.sandboxPort}
                    onChange={handleChange}
                    placeholder="3000"
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Record Duration */}
                <div>
                  <label htmlFor="sandboxRecordDurationMs" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Record Duration (ms)
                  </label>
                  <input
                    type="number"
                    id="sandboxRecordDurationMs"
                    name="sandboxRecordDurationMs"
                    value={formData.sandboxRecordDurationMs}
                    onChange={handleChange}
                    placeholder="30000"
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* App Start Command */}
                <div>
                  <label htmlFor="appStartCommand" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    App Start Command
                  </label>
                  <input
                    type="text"
                    id="appStartCommand"
                    name="appStartCommand"
                    value={formData.appStartCommand}
                    onChange={handleChange}
                    placeholder="npm start"
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* App Build Command */}
                <div>
                  <label htmlFor="appBuildCommand" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    App Build Command
                  </label>
                  <input
                    type="text"
                    id="appBuildCommand"
                    name="appBuildCommand"
                    value={formData.appBuildCommand}
                    onChange={handleChange}
                    placeholder="npm run build"
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Skip Setup Checkbox */}
              <div className="mt-6">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id="skipSetup"
                    name="skipSetup"
                    checked={formData.skipSetup}
                    onChange={handleChange}
                    className="w-5 h-5 text-primary-600 border-slate-300 rounded focus:ring-primary-500 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Skip Setup
                  </span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-semibold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Deploying...</span>
                  </>
                ) : (
                  <span>Deploy to Daytona</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
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

        {/* Success Response */}
        {response && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <div className="flex items-start">
              <svg className="h-6 w-6 text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-green-800 dark:text-green-200">Deployment Successful!</h3>
                <div className="mt-3 text-sm text-green-700 dark:text-green-300">
                  <pre className="bg-green-100 dark:bg-green-900/40 p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

