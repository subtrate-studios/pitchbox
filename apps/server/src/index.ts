import express, { type Express, type Request, type Response } from 'express';

import { DaytonaDeployer, DaytonaDeploymentError } from './DaytonaDeployer';
import { SandboxRecorder } from './SandboxRecorder';
import { Recorder, RecorderError } from './Recorder';
import { RepositoryCloner, RepositoryClonerError } from './RepositoryCloner';
import { CodebaseAnalyzer } from './CodebaseAnalyzer';
import { FlowExtractor } from './FlowExtractor';
import { ScriptGenerator, ScriptGeneratorError } from './ScriptGenerator';

const app: Express = express();
const PORT = process.env.PORT || 3001;
const recorder = new Recorder();
const daytonaDeployer = new DaytonaDeployer(undefined, {
  defaultWorkspaceDir: process.env.DAYTONA_WORKSPACE_DIR,
});
const sandboxRecorder = new SandboxRecorder(daytonaDeployer);
const repositoryCloner = new RepositoryCloner();
const codebaseAnalyzer = new CodebaseAnalyzer();
const flowExtractor = new FlowExtractor();
const scriptGenerator = process.env.ANTHROPIC_API_KEY
  ? new ScriptGenerator(process.env.ANTHROPIC_API_KEY)
  : null;

type DeployRequestBody = {
  githubUrl?: string;
  branch?: string;
  commitId?: string;
  workspaceDir?: string;
  skipSetup?: boolean;
};

type RecordRequestBody = {
  url?: string;
  githubUrl?: string;
  branch?: string;
  commitId?: string;
  workspaceDir?: string;
  skipSetup?: boolean;
  sandboxRecordDurationMs?: number;
  sandboxPort?: number;
  appStartCommand?: string;
  appBuildCommand?: string;
};

type AnalyzeRequestBody = {
  githubUrl?: string;
  branch?: string;
  commitId?: string;
  workspaceDir?: string;
  skipSetup?: boolean;
  style?: 'technical' | 'business' | 'casual';
  targetDuration?: number;
  focusAreas?: string[];
  includeCodeExamples?: boolean;
};

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/api/hello', (_req: Request, res: Response) => {
  res.json({ message: 'Hello from the server!' });
});

app.post('/api/record', async (req: Request, res: Response) => {
  const {
    url,
    githubUrl,
    branch,
    commitId,
    workspaceDir,
    skipSetup,
    sandboxRecordDurationMs,
    sandboxPort,
    appStartCommand,
    appBuildCommand,
  } = req.body as RecordRequestBody;

  if (githubUrl && typeof githubUrl === 'string') {
    try {
      const sandboxResult = await sandboxRecorder.recordRepository({
        githubUrl,
        branch: typeof branch === 'string' && branch.trim().length > 0 ? branch.trim() : undefined,
        commitId: typeof commitId === 'string' && commitId.trim().length > 0 ? commitId.trim() : undefined,
        workspaceDir: typeof workspaceDir === 'string' && workspaceDir.trim().length > 0 ? workspaceDir : undefined,
        skipSetup: typeof skipSetup === 'boolean' ? skipSetup : undefined,
        recordDurationMs:
          typeof sandboxRecordDurationMs === 'number' && Number.isFinite(sandboxRecordDurationMs)
            ? sandboxRecordDurationMs
            : undefined,
        appPort: typeof sandboxPort === 'number' && Number.isInteger(sandboxPort) ? sandboxPort : undefined,
        appStartCommand:
          typeof appStartCommand === 'string' && appStartCommand.trim().length > 0
            ? appStartCommand.trim()
            : undefined,
        appBuildCommand:
          typeof appBuildCommand === 'string' && appBuildCommand.trim().length > 0
            ? appBuildCommand.trim()
            : undefined,
      });

      res.status(202).json({
        status: 'completed',
        recording: sandboxResult.recording,
        deployment: sandboxResult.deployment,
        previewUrl: sandboxResult.previewUrl,
      });
      return;
    } catch (error) {
      if (error instanceof DaytonaDeploymentError) {
        const statusCode = error.code === 'INVALID_GITHUB_URL' ? 400 : 502;
        res.status(statusCode).json({ error: error.message, code: error.code });
        return;
      }

      res.status(500).json({ error: 'Unexpected Daytona recording failure.' });
      return;
    }
  }

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'A `url` field is required in the request body.' });
    return;
  }

  try {
    const recording = await recorder.record(url);
    res.status(202).json({
      status: 'completed',
      recording,
    });
  } catch (error) {
    if (error instanceof RecorderError) {
      const statusCode = error.code === 'INVALID_URL' ? 400 : 500;
      res.status(statusCode).json({ error: error.message, code: error.code });
      return;
    }

    res.status(500).json({ error: 'Unexpected recording failure.' });
  }
});

app.post('/api/deploy', async (req: Request, res: Response) => {
  const { githubUrl, branch, commitId, workspaceDir, skipSetup } = req.body as DeployRequestBody;

  if (!githubUrl || typeof githubUrl !== 'string') {
    res
      .status(400)
      .json({ error: 'A `githubUrl` field is required in the request body.', code: 'INVALID_GITHUB_URL' });
    return;
  }

  try {
    const deployment = await daytonaDeployer.deployFromGithub({
      githubUrl,
      branch: typeof branch === 'string' && branch.trim().length > 0 ? branch.trim() : undefined,
      commitId: typeof commitId === 'string' && commitId.trim().length > 0 ? commitId.trim() : undefined,
      workspaceDir: typeof workspaceDir === 'string' && workspaceDir.trim().length > 0 ? workspaceDir : undefined,
      skipSetup: typeof skipSetup === 'boolean' ? skipSetup : undefined,
    });

    res.status(202).json({
      status: 'started',
      deployment,
    });
  } catch (error) {
    if (error instanceof DaytonaDeploymentError) {
      const statusCode = error.code === 'INVALID_GITHUB_URL' ? 400 : 502;
      res.status(statusCode).json({ error: error.message, code: error.code });
      return;
    }

    res.status(500).json({ error: 'Unexpected Daytona deployment failure.' });
  }
});

app.post('/api/analyze', async (req: Request, res: Response) => {
  const {
    githubUrl,
    branch,
    commitId,
    workspaceDir,
    skipSetup,
    style,
    targetDuration,
    focusAreas,
    includeCodeExamples,
  } = req.body as AnalyzeRequestBody;

  // Validate required field
  if (!githubUrl || typeof githubUrl !== 'string') {
    res.status(400).json({
      error: 'A `githubUrl` field is required in the request body.',
      code: 'INVALID_GITHUB_URL',
    });
    return;
  }

  // Check if script generator is available
  if (!scriptGenerator) {
    res.status(503).json({
      error: 'Script generation service is not available. Please configure ANTHROPIC_API_KEY.',
      code: 'SERVICE_UNAVAILABLE',
    });
    return;
  }

  let cloneResult;

  try {
    console.log(`📥 Cloning repository: ${githubUrl}`);

    // Step 1: Clone repository
    cloneResult = await repositoryCloner.clone({
      githubUrl,
      branch: typeof branch === 'string' && branch.trim().length > 0 ? branch.trim() : undefined,
      commitId: typeof commitId === 'string' && commitId.trim().length > 0 ? commitId.trim() : undefined,
      depth: 1,
    });

    console.log(`✅ Repository cloned to: ${cloneResult.localPath}`);

    // Step 2: Analyze codebase
    console.log(`🔍 Analyzing codebase...`);
    const analysis = await codebaseAnalyzer.analyze(cloneResult.localPath);

    console.log(`✅ Analysis complete. Found ${analysis.totalFiles} files`);

    // Step 3: Extract flows and features
    console.log(`🔄 Extracting user flows and features...`);
    const flowResult = flowExtractor.extract(analysis);

    console.log(`✅ Extracted ${flowResult.features.length} features and ${flowResult.userFlows.length} flows`);

    // Step 4: Generate demo script
    console.log(`✨ Generating demo script...`);
    const demoScript = await scriptGenerator.generate(
      analysis,
      flowResult,
      githubUrl,
      {
        style: style || 'business',
        targetDuration: targetDuration || 180,
        focusAreas: focusAreas || [],
        includeCodeExamples: includeCodeExamples || false,
      }
    );

    console.log(`✅ Demo script generated successfully`);

    // Step 5: Cleanup
    await cloneResult.cleanup();
    console.log(`🧹 Cleanup complete`);

    // Return response
    res.status(200).json({
      status: 'success',
      repository: {
        url: githubUrl,
        name: cloneResult.repoName,
        owner: cloneResult.repoOwner,
        branch: cloneResult.branch,
        commitId: cloneResult.commitId,
      },
      analysis: {
        techStack: analysis.techStack,
        features: flowResult.features,
        userFlows: flowResult.userFlows,
        apiEndpoints: flowResult.apiEndpoints.slice(0, 20),
        uiComponents: flowResult.uiComponents.slice(0, 20),
        dataModels: flowResult.dataModels.slice(0, 20),
        totalFiles: analysis.totalFiles,
        totalSize: analysis.totalSize,
        entryPoints: analysis.entryPoints,
        dependencies: {
          production: analysis.dependencies.production.slice(0, 20),
          development: analysis.dependencies.development.slice(0, 10),
          total: analysis.dependencies.total,
        },
      },
      demoScript,
    });

    // Cleanup old repositories in background
    repositoryCloner.cleanupOldRepositories().catch(err => {
      console.warn('Background cleanup failed:', err);
    });
  } catch (error) {
    // Ensure cleanup happens even on error
    if (cloneResult) {
      await cloneResult.cleanup().catch(err => {
        console.warn('Cleanup failed:', err);
      });
    }

    // Handle specific errors
    if (error instanceof RepositoryClonerError) {
      res.status(400).json({
        error: error.message,
        code: 'CLONE_FAILED',
      });
      return;
    }

    if (error instanceof ScriptGeneratorError) {
      res.status(500).json({
        error: error.message,
        code: 'SCRIPT_GENERATION_FAILED',
      });
      return;
    }

    console.error('Unexpected error during analysis:', error);
    res.status(500).json({
      error: 'An unexpected error occurred during repository analysis.',
      code: 'INTERNAL_ERROR',
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  if (!scriptGenerator) {
    console.warn('⚠️  ANTHROPIC_API_KEY not configured. Script generation will be unavailable.');
  }
});

