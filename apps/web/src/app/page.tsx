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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Store form data and redirect to analyze page
    sessionStorage.setItem('deploymentConfig', JSON.stringify(formData));
    window.location.href = '/analyze';
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
            PitchBox
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Generate AI-powered demo scripts for your GitHub projects
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
                className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-semibold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Generate Script</span>
              </button>
            </div>
          </form>
        </div>

      </div>
    </main>
  );
}

