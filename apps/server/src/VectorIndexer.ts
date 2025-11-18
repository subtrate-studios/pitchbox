import type { Collection } from 'chromadb';
import type { ChromaDBClientManager } from './ChromaDBClient';
import type { AnalysisResult, FileInfo } from './CodebaseAnalyzer';
import type { FlowExtractionResult } from './FlowExtractor';
import crypto from 'node:crypto';

export interface IndexedDocument {
  id: string;
  content: string;
  metadata: {
    type: 'file' | 'feature' | 'flow' | 'api' | 'component' | 'model' | 'readme';
    source: string;
    category?: string;
    path?: string;
    language?: string;
  };
}

export interface VectorSearchResult {
  id: string;
  content: string;
  metadata: IndexedDocument['metadata'];
  distance: number;
  relevance: number;
}

export class VectorIndexer {
  private chromaClient: ChromaDBClientManager;

  constructor(chromaClient: ChromaDBClientManager) {
    this.chromaClient = chromaClient;
  }

  /**
   * Index an entire repository analysis
   */
  async indexRepository(
    repoUrl: string,
    analysis: AnalysisResult,
    flowResult: FlowExtractionResult
  ): Promise<string> {
    const collectionName = this.getCollectionName(repoUrl);
    const collection = await this.chromaClient.getOrCreateCollection(collectionName);

    const documents = this.prepareDocuments(analysis, flowResult);

    if (documents.length === 0) {
      throw new Error('No documents to index');
    }

    // Split into batches to avoid rate limits
    const batchSize = 100;
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);

      await collection.add({
        ids: batch.map(d => d.id),
        documents: batch.map(d => d.content),
        metadatas: batch.map(d => d.metadata),
      });
    }

    console.log(`✅ Indexed ${documents.length} documents for ${repoUrl}`);
    return collectionName;
  }

  /**
   * Search for relevant code snippets and documentation
   */
  async search(
    collectionName: string,
    query: string,
    options: {
      limit?: number;
      filter?: Record<string, any>;
    } = {}
  ): Promise<VectorSearchResult[]> {
    const collection = await this.chromaClient.getOrCreateCollection(collectionName);
    const limit = options.limit || 10;

    const results = await collection.query({
      queryTexts: [query],
      nResults: limit,
      where: options.filter,
    });

    if (!results.ids[0] || results.ids[0].length === 0) {
      return [];
    }

    return results.ids[0].map((id, idx) => ({
      id,
      content: results.documents[0][idx] as string,
      metadata: results.metadatas[0][idx] as IndexedDocument['metadata'],
      distance: results.distances?.[0]?.[idx] || 0,
      relevance: 1 - (results.distances?.[0]?.[idx] || 0),
    }));
  }

  /**
   * Delete a collection
   */
  async deleteCollection(repoUrl: string): Promise<void> {
    const collectionName = this.getCollectionName(repoUrl);
    await this.chromaClient.deleteCollection(collectionName);
  }

  /**
   * Prepare documents from analysis results
   */
  private prepareDocuments(
    analysis: AnalysisResult,
    flowResult: FlowExtractionResult
  ): IndexedDocument[] {
    const documents: IndexedDocument[] = [];

    // 1. Index README and key documentation files
    const readme = analysis.keyFiles.find(f =>
      f.relativePath.toLowerCase().includes('readme')
    );

    if (readme && readme.content) {
      documents.push({
        id: this.generateId('readme', readme.relativePath),
        content: this.cleanContent(readme.content),
        metadata: {
          type: 'readme',
          source: readme.relativePath,
          path: readme.relativePath,
        },
      });
    }

    // 2. Index source files (chunked if large)
    for (const file of analysis.keyFiles) {
      if (file.content && file.category === 'source') {
        const chunks = this.chunkContent(file.content, 1000);

        chunks.forEach((chunk, index) => {
          documents.push({
            id: this.generateId('file', `${file.relativePath}:${index}`),
            content: chunk,
            metadata: {
              type: 'file',
              source: file.relativePath,
              path: file.relativePath,
              language: this.detectLanguage(file.extension),
              category: file.category,
            },
          });
        });
      }
    }

    // 3. Index features
    for (const feature of flowResult.features) {
      const content = `Feature: ${feature.name}\n\nDescription: ${feature.description}\n\nCategory: ${feature.category}\n\nFiles: ${feature.files.join(', ')}`;

      documents.push({
        id: this.generateId('feature', feature.name),
        content,
        metadata: {
          type: 'feature',
          source: feature.name,
          category: feature.category,
        },
      });
    }

    // 4. Index user flows
    for (const flow of flowResult.userFlows) {
      const content = `User Flow: ${flow.name}\n\nDescription: ${flow.description}\n\nType: ${flow.type}\n\nSteps:\n${flow.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nRelated Files: ${flow.files.join(', ')}`;

      documents.push({
        id: this.generateId('flow', flow.id),
        content,
        metadata: {
          type: 'flow',
          source: flow.name,
          category: flow.type,
        },
      });
    }

    // 5. Index API endpoints
    for (const endpoint of flowResult.apiEndpoints) {
      const content = `API Endpoint: ${endpoint.method} ${endpoint.path}\n\nFile: ${endpoint.file}${endpoint.description ? `\n\nDescription: ${endpoint.description}` : ''}`;

      documents.push({
        id: this.generateId('api', `${endpoint.method}-${endpoint.path}`),
        content,
        metadata: {
          type: 'api',
          source: `${endpoint.method} ${endpoint.path}`,
          path: endpoint.file,
        },
      });
    }

    // 6. Index UI components
    for (const component of flowResult.uiComponents.slice(0, 50)) {
      documents.push({
        id: this.generateId('component', component),
        content: `UI Component: ${component}`,
        metadata: {
          type: 'component',
          source: component,
        },
      });
    }

    // 7. Index data models
    for (const model of flowResult.dataModels.slice(0, 30)) {
      documents.push({
        id: this.generateId('model', model),
        content: `Data Model: ${model}`,
        metadata: {
          type: 'model',
          source: model,
        },
      });
    }

    return documents;
  }

  /**
   * Generate a deterministic ID for a document
   */
  private generateId(type: string, identifier: string): string {
    const hash = crypto.createHash('md5').update(`${type}:${identifier}`).digest('hex');
    return `${type}_${hash.substring(0, 16)}`;
  }

  /**
   * Get collection name from repo URL
   */
  private getCollectionName(repoUrl: string): string {
    // Extract owner/repo from URL and sanitize
    const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/i);
    if (match) {
      const [, owner, repo] = match;
      return `repo_${owner}_${repo}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    }

    // Fallback to hash
    const hash = crypto.createHash('md5').update(repoUrl).digest('hex');
    return `repo_${hash.substring(0, 16)}`;
  }

  /**
   * Clean content for indexing
   */
  private cleanContent(content: string): string {
    return content
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, '  ')
      .trim();
  }

  /**
   * Chunk large content into smaller pieces
   */
  private chunkContent(content: string, maxLength: number): string[] {
    const chunks: string[] = [];
    const lines = content.split('\n');
    let currentChunk = '';

    for (const line of lines) {
      if (currentChunk.length + line.length > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = line;
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(c => c.length > 0);
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(extension: string): string {
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust',
      '.java': 'java',
      '.rb': 'ruby',
      '.php': 'php',
      '.c': 'c',
      '.cpp': 'cpp',
      '.cs': 'csharp',
    };

    return languageMap[extension.toLowerCase()] || 'unknown';
  }
}
