import Anthropic from '@anthropic-ai/sdk';
import type { VectorIndexer, VectorSearchResult } from './VectorIndexer';
import type { AnalysisResult } from './CodebaseAnalyzer';
import type { FlowExtractionResult } from './FlowExtractor';

export interface RAGGenerationOptions {
  style?: 'technical' | 'business' | 'casual';
  targetDuration?: number;
  focusAreas?: string[];
  includeCodeExamples?: boolean;
  retrievalCount?: number;
}

export interface DemoScript {
  fullScript: string;
  sections: ScriptSection[];
  estimatedDuration: number;
  keywords: string[];
  metadata: {
    style: string;
    generatedAt: string;
    repository: string;
    retrievedDocuments: number;
  };
}

export interface ScriptSection {
  title: string;
  content: string;
  duration: number;
  type: 'introduction' | 'feature' | 'flow' | 'technical' | 'conclusion';
}

export class RAGGeneratorError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'RAGGeneratorError';
  }
}

export class RAGGenerator {
  private anthropic: Anthropic;
  private vectorIndexer: VectorIndexer;

  constructor(anthropicApiKey: string, vectorIndexer: VectorIndexer) {
    if (!anthropicApiKey) {
      throw new RAGGeneratorError('Anthropic API key is required');
    }

    this.anthropic = new Anthropic({ apiKey: anthropicApiKey });
    this.vectorIndexer = vectorIndexer;
  }

  /**
   * Generate demo script using RAG (Retrieval Augmented Generation)
   */
  async generate(
    collectionName: string,
    repoUrl: string,
    analysis: AnalysisResult,
    flowResult: FlowExtractionResult,
    options: RAGGenerationOptions = {}
  ): Promise<DemoScript> {
    const style = options.style || 'business';
    const targetDuration = options.targetDuration || 180;
    const retrievalCount = options.retrievalCount || 20;

    try {
      // Step 1: Build search queries based on focus areas
      console.log('🔍 Building search queries...');
      const queries = this.buildSearchQueries(analysis, flowResult, options.focusAreas);
      console.log(`📋 Generated ${queries.length} search queries`);

      // Step 2: Retrieve relevant documents from vector DB
      console.log('🔎 Retrieving relevant documents from ChromaDB...');
      const retrievedDocs = await this.retrieveRelevantContext(
        collectionName,
        queries,
        retrievalCount
      );

      console.log(`📚 Retrieved ${retrievedDocs.length} relevant documents from vector DB`);

      // Step 3: Build enriched context with retrieved documents
      console.log('📝 Building enriched context...');
      const context = this.buildEnrichedContext(analysis, flowResult, retrievedDocs);

      // Step 4: Generate script using Claude with RAG context
      console.log('🤖 Generating script with Claude AI...');
      const prompt = this.buildRAGPrompt(repoUrl, analysis, context, options);

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new RAGGeneratorError('Unexpected response format from Claude');
      }

      const scriptText = content.text;
      const sections = this.parseScriptSections(scriptText, targetDuration);
      const keywords = this.extractKeywords(analysis, flowResult);

      return {
        fullScript: scriptText,
        sections,
        estimatedDuration: sections.reduce((sum, s) => sum + s.duration, 0),
        keywords,
        metadata: {
          style,
          generatedAt: new Date().toISOString(),
          repository: repoUrl,
          retrievedDocuments: retrievedDocs.length,
        },
      };
    } catch (error) {
      console.error('❌ RAG generation error:', error);
      if (error instanceof RAGGeneratorError) {
        throw error;
      }
      // Log the full error for debugging
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }
      throw new RAGGeneratorError('Failed to generate demo script with RAG', error);
    }
  }

  /**
   * Build search queries based on analysis and focus areas
   */
  private buildSearchQueries(
    analysis: AnalysisResult,
    flowResult: FlowExtractionResult,
    focusAreas?: string[]
  ): string[] {
    const queries: string[] = [];

    // Add general repository understanding query
    queries.push('What is the main purpose and functionality of this application?');

    // Add focus area queries
    if (focusAreas && focusAreas.length > 0) {
      for (const area of focusAreas) {
        queries.push(`How does ${area} work in this application?`);
      }
    } else {
      // Default queries based on detected features
      if (flowResult.userFlows.length > 0) {
        for (const flow of flowResult.userFlows.slice(0, 3)) {
          queries.push(`Explain the ${flow.name} user flow`);
        }
      }

      if (flowResult.features.length > 0) {
        for (const feature of flowResult.features.slice(0, 3)) {
          queries.push(`How does ${feature.name} feature work?`);
        }
      }
    }

    // Add tech stack specific queries
    if (analysis.techStack.frameworks.length > 0) {
      queries.push(
        `How is ${analysis.techStack.frameworks[0]} used in this application?`
      );
    }

    // Add API query if APIs exist
    if (flowResult.apiEndpoints.length > 0) {
      queries.push('What are the main API endpoints and their purposes?');
    }

    return queries;
  }

  /**
   * Retrieve relevant context from vector database
   */
  private async retrieveRelevantContext(
    collectionName: string,
    queries: string[],
    retrievalCount: number
  ): Promise<VectorSearchResult[]> {
    const allResults: VectorSearchResult[] = [];
    const resultsPerQuery = Math.ceil(retrievalCount / queries.length);

    for (const query of queries) {
      try {
        const results = await this.vectorIndexer.search(collectionName, query, {
          limit: resultsPerQuery,
        });
        allResults.push(...results);
      } catch (error) {
        console.warn(`Failed to search for query: "${query}"`, error);
      }
    }

    // Deduplicate by ID and sort by relevance
    const uniqueResults = Array.from(
      new Map(allResults.map(r => [r.id, r])).values()
    ).sort((a, b) => b.relevance - a.relevance);

    return uniqueResults.slice(0, retrievalCount);
  }

  /**
   * Build enriched context with retrieved documents
   */
  private buildEnrichedContext(
    analysis: AnalysisResult,
    flowResult: FlowExtractionResult,
    retrievedDocs: VectorSearchResult[]
  ): string {
    const parts: string[] = [];

    // Add overview
    parts.push(`# Repository Overview`);
    parts.push(`Tech Stack: ${analysis.techStack.languages.join(', ')}`);
    parts.push(`Frameworks: ${analysis.techStack.frameworks.join(', ') || 'None'}`);
    parts.push(`Total Files: ${analysis.totalFiles}`);
    parts.push('');

    // Add retrieved documentation with relevance scores
    parts.push('# Retrieved Context (Ranked by Relevance)');
    parts.push('');

    // Group by type
    const byType = new Map<string, VectorSearchResult[]>();
    for (const doc of retrievedDocs) {
      const type = doc.metadata.type;
      if (!byType.has(type)) {
        byType.set(type, []);
      }
      byType.get(type)!.push(doc);
    }

    // Add README first if available
    if (byType.has('readme')) {
      parts.push('## Documentation');
      for (const doc of byType.get('readme')!) {
        parts.push(`\n### ${doc.metadata.source} (Relevance: ${(doc.relevance * 100).toFixed(1)}%)`);
        parts.push(doc.content.substring(0, 2000)); // Limit length
      }
      parts.push('');
    }

    // Add features
    if (byType.has('feature')) {
      parts.push('## Key Features');
      for (const doc of byType.get('feature')!) {
        parts.push(`\n${doc.content}`);
      }
      parts.push('');
    }

    // Add flows
    if (byType.has('flow')) {
      parts.push('## User Flows');
      for (const doc of byType.get('flow')!) {
        parts.push(`\n${doc.content}`);
      }
      parts.push('');
    }

    // Add relevant code snippets
    if (byType.has('file')) {
      parts.push('## Relevant Code Snippets');
      const codeFiles = byType.get('file')!.slice(0, 5); // Top 5 most relevant
      for (const doc of codeFiles) {
        parts.push(`\n### ${doc.metadata.path} (Relevance: ${(doc.relevance * 100).toFixed(1)}%)`);
        parts.push('```' + (doc.metadata.language || ''));
        parts.push(doc.content.substring(0, 800)); // Limit code snippet length
        parts.push('```');
      }
      parts.push('');
    }

    // Add API endpoints
    if (byType.has('api')) {
      parts.push('## API Endpoints');
      for (const doc of byType.get('api')!.slice(0, 10)) {
        parts.push(`- ${doc.content}`);
      }
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Build RAG-enhanced prompt
   */
  private buildRAGPrompt(
    repoUrl: string,
    analysis: AnalysisResult,
    enrichedContext: string,
    options: RAGGenerationOptions
  ): string {
    const { style = 'business', targetDuration = 180, focusAreas = [] } = options;

    return `You are a professional product demo voiceover script writer. Create a concise, punchy script for a ${targetDuration}-second product demo video.

CRITICAL: This script will be read aloud by text-to-speech (ElevenLabs) WHILE a screen recording plays. The visuals will show what you're describing, so you DON'T need to explain every detail.

# Product Context
- Repository: ${repoUrl}
- Tech Stack: ${analysis.techStack.languages.join(', ')}
- Frameworks: ${analysis.techStack.frameworks.join(', ') || 'None'}
${focusAreas.length > 0 ? `- Focus On: ${focusAreas.join(', ')}` : ''}

# Retrieved Context
${enrichedContext}

# VOICEOVER SCRIPT RULES (CRITICAL)

1. **BE CONCISE**: Maximum ${targetDuration} seconds. Aim for ~${Math.floor(targetDuration * 2.5)} words total (150 words/minute pace).

2. **NARRATE, DON'T EXPLAIN**:
   - BAD: "First, you'll click on the login button, then enter your credentials, and the system will authenticate you"
   - GOOD: "Login is simple and secure"

3. **COMPLEMENT THE VISUALS**: The screen recording shows the UI. You provide the "why" and "what", not the "how".

4. **SHORT, PUNCHY SENTENCES**: 5-10 words max per sentence. Easy to speak naturally.

5. **NO FILLER**: Cut "you can see", "as you can notice", "let me show you". Just state the value.

6. **FOCUS ON BENEFITS**: What problem does it solve? Why does it matter?

# Structure (Keep sections SHORT)

## INTRODUCTION (15-20 seconds)
- Hook: One sentence problem statement
- Solution: What this product is in ONE sentence
- Promise: What we'll show today

## FEATURE: [Name] (20-30 seconds)
- What it does (1 sentence)
- Why it matters (1 sentence)
- Key benefit (1 sentence)

## FEATURE: [Name] (20-30 seconds)
[Same structure - pick only 2-3 TOP features, not all of them]

## CONCLUSION (15-20 seconds)
- Recap value in ONE sentence
- Call-to-action

# Style: ${this.getStyleDescription(style)}

# Example Length (for ${targetDuration}s):
- Introduction: ~40 words
- Feature 1: ~50 words
- Feature 2: ~50 words
- Conclusion: ~30 words
- Total: ~170 words MAX

OUTPUT FORMAT:

## INTRODUCTION
[Hook + solution + promise in 2-3 sentences max]

## FEATURE: [Name]
[3-4 sentences max, focus on value not process]

## FEATURE: [Name]
[3-4 sentences max]

## CONCLUSION
[2-3 sentences: recap + CTA]

WRITE NOW. Keep it under ${Math.floor(targetDuration * 2.5)} words total.`;
  }

  private getStyleDescription(style: string): string {
    switch (style) {
      case 'technical':
        return 'Focus on technical implementation, architecture, and developer-facing details';
      case 'business':
        return 'Focus on business value, ROI, and how it solves real problems';
      case 'casual':
        return 'Friendly, approachable tone that feels like a conversation with a colleague';
      default:
        return 'Balanced approach covering both features and benefits';
    }
  }

  private parseScriptSections(scriptText: string, targetDuration: number): ScriptSection[] {
    const sections: ScriptSection[] = [];
    const lines = scriptText.split('\n');

    let currentSection: Partial<ScriptSection> | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('## ')) {
        if (currentSection && currentContent.length > 0) {
          currentSection.content = currentContent.join('\n').trim();
          sections.push(currentSection as ScriptSection);
        }

        const title = trimmed.replace('## ', '');
        const type = this.determineSectionType(title);

        currentSection = { title, type, duration: 0 };
        currentContent = [];
      } else if (currentSection && trimmed) {
        currentContent.push(line);
      }
    }

    if (currentSection && currentContent.length > 0) {
      currentSection.content = currentContent.join('\n').trim();
      sections.push(currentSection as ScriptSection);
    }

    // Calculate durations
    const totalWords = sections.reduce((sum, s) => sum + this.countWords(s.content || ''), 0);
    const wordsPerSecond = totalWords / targetDuration;

    for (const section of sections) {
      const words = this.countWords(section.content);
      section.duration = Math.round(words / wordsPerSecond);
    }

    return sections;
  }

  private determineSectionType(title: string): ScriptSection['type'] {
    const lower = title.toLowerCase();
    if (lower.includes('introduction') || lower.includes('intro')) return 'introduction';
    if (lower.includes('conclusion') || lower.includes('wrap') || lower.includes('closing'))
      return 'conclusion';
    if (lower.includes('feature')) return 'feature';
    if (lower.includes('flow') || lower.includes('journey')) return 'flow';
    if (lower.includes('technical') || lower.includes('architecture')) return 'technical';
    return 'feature';
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private extractKeywords(
    analysis: AnalysisResult,
    flowResult: FlowExtractionResult
  ): string[] {
    const keywords = new Set<string>();

    analysis.techStack.languages.forEach(lang => keywords.add(lang));
    analysis.techStack.frameworks.forEach(fw => keywords.add(fw));
    flowResult.features.forEach(f => keywords.add(f.name));
    flowResult.userFlows.forEach(f => keywords.add(f.name));

    return Array.from(keywords).slice(0, 20);
  }
}
